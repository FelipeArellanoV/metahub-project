const fs=require('node:fs');
const fsp=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {Transform}=require('node:stream');
const {pipeline}=require('node:stream/promises');
const {Blob}=require('node:buffer');
const repo=require('../db/repository');
const {getPool}=require('../db/pgClient');
const {buildAnalysisSummary}=require('./sessionController');
const access=require('../services/athleteAccess');
const ROOT=path.resolve(process.env.VIDEO_STORAGE_DIR||path.join(__dirname,'../../uploads'));
const LIMIT=50*1024*1024;
function fail(code,message){access.reject(code,message);}
function pool(){const p=getPool();if(!p)fail(503,'La carga de videos requiere PostgreSQL.');return p;}
function disk(name){
 if(!/^[a-f0-9-]{36}\.(mp4|webm|mov)$/.test(name))fail(500,'Referencia de archivo inválida.');
 return path.join(ROOT,name);
}
async function target(req,requestedId){
 if(req.user.role==='atleta'){
  const a=await repo.getAthleteByUserId(req.user.id);
  if(!a)fail(404,'No tienes una ficha vinculada.');
  if(requestedId!==undefined && requestedId!==null && Number(requestedId)!==a.id)fail(403,'Solo puedes cargar videos en tu propia ficha.');
  return a;
 }
 if(req.user.role==='entrenador'){
  const id=access.positiveId(requestedId);
  const a=await repo.getAthleteByIdForTrainer(id,req.user.id);
  if(!a)fail(404,'Atleta no disponible.');
  return a;
 }
 fail(403,'Perfil no autorizado para capturar carreras.');
}
function linkedToActor(req,linked){
 return linked && (req.user.role==='atleta'?linked.user_id===Number(req.user.id):linked.trainer_id===Number(req.user.id));
}
async function canRead(req,athleteId){
 if(req.user.role==='atleta'){
  const a=await target(req);if(a.id!==athleteId)fail(404,'Video no disponible.');
 }else await access.readable(req.user,athleteId);
}
async function analyze(req,row,forcePose=false){
 const p=pool(),a=await target(req,row.athlete_id);
 if(a.id!==row.athlete_id)fail(404,'Video no disponible.');
 if(!a.consent)fail(403,'Falta consentimiento registrado para analizar.');
 const key=crypto.randomUUID();
 const claim=(await p.query(`
 UPDATE athlete_video_uploads SET status='processing',error=NULL,process_key=$1,started_at=CURRENT_TIMESTAMP
 WHERE id=$2 AND (status IN('uploaded','failed') OR (status='completed' AND $3) OR
 (status='processing' AND started_at<CURRENT_TIMESTAMP-INTERVAL '12 minutes')) RETURNING *`,[key,row.id,forcePose])).rows[0];
 if(!claim){
  const current=(await p.query('SELECT * FROM athlete_video_uploads WHERE id=$1',[row.id])).rows[0];
  if(current?.status==='completed')return {uploadId:row.id,sessionId:row.session_id,status:'completed'};
  fail(409,'El análisis sigue en proceso. Consulta el historial en unos momentos.');
 }
 const client=await p.connect();
 try{
  const form=new FormData();
  form.append('file',new Blob([await fsp.readFile(disk(row.stored_name))],{type:row.mime}),row.original_name);
  form.append('use_sample','false');form.append('sample_stride','2');form.append('max_frames','240');
  form.append('scan_full_video','true');form.append('include_pose','true');form.append('max_samples','4500');
  const url=process.env.CV_SERVICE_URL||'http://cv-service:8000';
  const response=await fetch(url+'/api/cv/process-video',{method:'POST',body:form,signal:AbortSignal.timeout(600000)});
  if(!response.ok)throw new Error('El servicio no pudo analizar el video. Comprueba el formato y la visibilidad del cuerpo.');
  const raw=await response.json();
  const summary=buildAnalysisSummary(raw);
  if(!summary||typeof summary.ipt_score!=='number'||!Number.isFinite(summary.ipt_score)||summary.ipt_score<0||summary.ipt_score>100)
   throw new Error('El video no produjo un IPT válido. Prueba una captura con el cuerpo completo visible.');
  const poseTrack=raw.pose_track;
  if(!poseTrack || poseTrack.landmark_count!==33 || !Array.isArray(poseTrack.frames) || !poseTrack.frames.length)
    throw new Error('El analizador no devolvió la trayectoria corporal. Comprueba que el servicio CV esté actualizado.');
  summary.pose_info={version:1,landmark_count:33,sampled_frames:poseTrack.frames.length,full_video:poseTrack.full_video};
  await client.query('BEGIN');
  const valid=(await client.query('SELECT user_id,trainer_id,consent FROM athletes WHERE id=$1 FOR UPDATE',[a.id])).rows[0];
  if(!linkedToActor(req,valid)||!valid.consent)fail(403,'La vinculación o el consentimiento cambió.');
  const active=(await client.query('SELECT id FROM athlete_video_uploads WHERE id=$1 AND process_key=$2 FOR UPDATE',[row.id,key])).rows[0];
  if(!active)fail(409,'Otro intento tomó el análisis de este video.');
  const posePath=disk(row.stored_name)+'.pose.json';
  const poseTemp=posePath+'.'+key+'.tmp';
  try {
    await fsp.writeFile(poseTemp,JSON.stringify(poseTrack),{flag:'wx'});
    await fsp.rename(poseTemp,posePath);
  } finally { await fsp.unlink(poseTemp).catch(()=>{}); }
  await client.query('UPDATE sessions SET trainer_id=$1,ipt_score=$2,analysis=$3 WHERE id=$4 AND athlete_id=$5',
   [valid.trainer_id,Math.round(summary.ipt_score*10)/10,JSON.stringify(summary),row.session_id,a.id]);
  await client.query("UPDATE athlete_video_uploads SET status='completed',error=NULL,process_key=NULL WHERE id=$1 AND process_key=$2",[row.id,key]);
  await client.query('COMMIT');
  return {uploadId:row.id,sessionId:row.session_id,status:'completed',iptScore:summary.ipt_score};
 }catch(err){
  await client.query('ROLLBACK');
  const message=err.statusCode?err.message:(err.name==='TimeoutError'?'Se agotó el tiempo de análisis. Puedes reintentar sin volver a subir el video.':err.message);
  await p.query("UPDATE athlete_video_uploads SET status='failed',error=$1,process_key=NULL WHERE id=$2 AND process_key=$3",
   [message.slice(0,300),row.id,key]);
  return {uploadId:row.id,sessionId:row.session_id,status:'failed',error:message};
 }finally{client.release();}
}
async function upload(req,res){
 let temp=null,finalFile=null,committed=false,targetAthleteId=null;
 try{
  const requested=new URL(req.url,'http://localhost').searchParams.get('athleteId');
  const a=await target(req,requested),p=pool();
  targetAthleteId=a.id;
  if(!a.consent)fail(403,'Tu ficha requiere consentimiento registrado para subir videos.');
  const params=new URL(req.url,'http://localhost').searchParams;
  const requestId=params.get('requestId')||'',original=params.get('filename')||'';
  if(!/^[a-f0-9-]{36}$/.test(requestId))fail(400,'Identificador de carga inválido.');
  const ext=path.extname(original).toLowerCase(),mime=(req.headers['content-type']||'').split(';')[0].toLowerCase();
  if(!['.mp4','.webm','.mov'].includes(ext)||!['video/mp4','video/webm','video/quicktime','application/octet-stream'].includes(mime))fail(400,'Usa un video MP4, WebM o MOV.');
  const previous=(await p.query('SELECT id,athlete_id,session_id,status,error,original_name FROM athlete_video_uploads WHERE user_id=$1 AND request_id=$2',[req.user.id,requestId])).rows[0];
  if(previous){
   req.resume();if(previous.athlete_id!==a.id||previous.original_name!==path.basename(original).slice(0,180))fail(409,'Identificador de carga reutilizado para otro archivo.');
   return res.json({uploadId:previous.id,sessionId:previous.session_id,status:previous.status,error:previous.error});
  }
  if(Number(req.headers['content-length'])>LIMIT)fail(413,'El video no debe superar 50 MB.');
  await fsp.mkdir(ROOT,{recursive:true});
  const id=crypto.randomUUID(),stored=id+ext;
  finalFile=disk(stored);temp=finalFile+'.part';
  let size=0;
  const limit=new Transform({transform(chunk,encoding,callback){size+=chunk.length;if(size>LIMIT){const e=new Error('El video supera 50 MB.');e.statusCode=413;callback(e);}else callback(null,chunk);}});
  await pipeline(req,limit,fs.createWriteStream(temp,{flags:'wx'}));
  if(!size)fail(400,'El archivo está vacío.');
  await fsp.rename(temp,finalFile);temp=null;
  const client=await p.connect();let row;
  try{
   await client.query('BEGIN');
   const linked=(await client.query('SELECT trainer_id,consent,user_id FROM athletes WHERE id=$1 FOR UPDATE',[a.id])).rows[0];
   if(!linkedToActor(req,linked)||!linked.consent)fail(403,'La vinculación o el consentimiento cambió.');
   const session=(await client.query('INSERT INTO sessions(athlete_id,trainer_id,notes) VALUES($1,$2,$3) RETURNING id',
    [a.id,linked.trainer_id,req.user.role==='atleta'?'Video cargado por el alumno.':'Video registrado por su entrenador.'])).rows[0];
   await client.query('UPDATE sessions SET video_url=$1 WHERE id=$2',['/api/videos/'+session.id,session.id]);
   row=(await client.query(`INSERT INTO athlete_video_uploads(id,user_id,athlete_id,session_id,request_id,stored_name,original_name,mime)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[id,req.user.id,a.id,session.id,requestId,stored,path.basename(original).slice(0,180),mime])).rows[0];
   await client.query('COMMIT');committed=true;
  }catch(err){await client.query('ROLLBACK');throw err;}finally{client.release();}
  return res.status(201).json({uploadId:row.id,sessionId:row.session_id,status:'uploaded'});
 }catch(err){
  req.resume();
  if(temp)await fsp.unlink(temp).catch(()=>{});
  if(finalFile&&!committed)await fsp.unlink(finalFile).catch(()=>{});
  if(err.code==='23505'){
   const requestId=new URL(req.url,'http://localhost').searchParams.get('requestId');
   const r=(await pool().query('SELECT id,athlete_id,session_id,status FROM athlete_video_uploads WHERE user_id=$1 AND request_id=$2',[req.user.id,requestId])).rows[0];
   if(r&&r.athlete_id!==targetAthleteId)return res.status(409).json({error:'Identificador de carga reutilizado para otra ficha.'});
   if(r)return res.json({uploadId:r.id,sessionId:r.session_id,status:r.status});
  }
  return res.status(err.statusCode||500).json({error:err.statusCode?err.message:'No se pudo conservar el video. Verifica la migración y el almacenamiento.'});
 }
}
async function handle(req,res){
 res.setHeader('Access-Control-Allow-Origin','*');
 res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
 res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
 res.setHeader('Cache-Control','no-store');
 const url=new URL(req.url,'http://localhost');
 url.pathname=url.pathname.replace('/api/capture/videos','/api/portal/videos');
 if(req.method==='POST'&&url.pathname==='/api/portal/videos')return upload(req,res);
 try{
  const p=pool();
  if(req.method==='GET'&&url.pathname==='/api/videos/sessions'){
   const athleteId=req.user.role==='atleta'?(await target(req)).id:access.positiveId(url.searchParams.get('athleteId'));
   await canRead(req,athleteId);
   const rows=(await p.query('SELECT id,athlete_id AS "athleteId",session_date AS "sessionDate",video_url AS "videoUrl",notes,ipt_score AS "iptScore",analysis FROM sessions WHERE athlete_id=$1 ORDER BY session_date',[athleteId])).rows;
   return res.json({sessions:rows});
  }
  if(req.method==='GET'&&url.pathname==='/api/portal/videos'){
   const a=await target(req,url.searchParams.get('athleteId'));
   const rows=(await p.query(`SELECT v.id,v.session_id AS "sessionId",v.original_name AS filename,v.status,v.error,
    v.created_at AS "createdAt",s.ipt_score AS "iptScore" FROM athlete_video_uploads v JOIN sessions s ON s.id=v.session_id
    WHERE v.athlete_id=$1 ORDER BY v.created_at DESC LIMIT 50`,[a.id])).rows;
   return res.json({videos:rows});
  }
  const retry=url.pathname.match(/^\/api\/portal\/videos\/([a-f0-9-]{36})\/analyze$/);
  if(req.method==='POST'&&retry){
   const row=(await p.query('SELECT * FROM athlete_video_uploads WHERE id=$1',[retry[1]])).rows[0];
   if(!row)fail(404,'Video no disponible.');
   await target(req,row.athlete_id);
   return res.json(await analyze(req,row));
  }

  const poseRoute=url.pathname.match(/^\/api\/videos\/(\d+)\/(pose|analyze-pose)$/);
  if(poseRoute && ((req.method==='GET' && poseRoute[2]==='pose') || (req.method==='POST' && poseRoute[2]==='analyze-pose'))){
   const row=(await p.query('SELECT * FROM athlete_video_uploads WHERE session_id=$1',[poseRoute[1]])).rows[0];
   if(!row)fail(404,'Esta sesión no conserva un video original para superponer el esqueleto.');
   if(poseRoute[2]==='analyze-pose'){
    await target(req,row.athlete_id);
    return res.json(await analyze(req,row,true));
   }
   await canRead(req,row.athlete_id);
   try{return res.json(JSON.parse(await fsp.readFile(disk(row.stored_name)+'.pose.json','utf8')));}
   catch(error){if(error.code==='ENOENT')fail(404,'Este video todavía no tiene esqueleto. Su responsable puede generar el análisis corporal.');throw error;}
  }
  const playback=url.pathname.match(/^\/api\/videos\/(\d+)$/);
  if(req.method==='GET'&&playback){
   const row=(await p.query('SELECT * FROM athlete_video_uploads WHERE session_id=$1',[playback[1]])).rows[0];
   if(!row)fail(404,'Video no disponible.');
   await canRead(req,row.athlete_id);
   const stat=await fsp.stat(disk(row.stored_name));
   res.setHeader('Content-Type',row.mime==='application/octet-stream'?'video/mp4':row.mime);
   res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Length',stat.size);
   await pipeline(fs.createReadStream(disk(row.stored_name)),res);return;
  }
  return res.status(404).json({error:'Ruta de video no encontrada.'});
 }catch(err){
  if(res.headersSent){res.destroy();return;}
  return res.status(err.statusCode||500).json({error:err.statusCode?err.message:'No se pudo consultar o analizar el video. Revisa el servicio CV y la migración.'});
 }
}
module.exports={handle};
