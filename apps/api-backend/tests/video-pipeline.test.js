// T-05: carga de video -> cola de análisis en segundo plano -> sesión guardada.
// Usa un doble en memoria de PostgreSQL y un doble del servicio de visión (respuesta con el contrato real).
// Verifica el flujo del controlador y de la cola; la inferencia real se prueba en cv-service.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const {Readable}=require('node:stream');
const {createVideoQueue,backoffSeconds}=require('../src/services/videoQueue');
const CV=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/cv-response.json'),'utf8'));
const REQ_ID='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DAY=24*3600*1000;

function setup({consent=true,cv='ok',consentRows=[]}={}){
 const storage=fs.mkdtempSync(path.join(os.tmpdir(),'metahub-video-'));
 const db={uploads:[],sessions:[],consents:[...consentRows],
  athlete:{id:10,name:'Atleta',age:15,birthDate:null,user_id:2,trainer_id:1,consent},
  users:[{id:1,role:'entrenador'},{id:2,role:'atleta'}],cvCalls:0};
 const state={cv};
 const now=()=>new Date();
 const consentOk=()=>{
  const latest=[...db.consents].sort((a,b)=>b.id-a.id)[0];
  const formal=latest?latest.status==='granted'&&(!latest.expires_at||latest.expires_at>now()):true;
  return Boolean(db.athlete.consent)&&formal;
 };
 const repo={getAthleteByIdForTrainer:async(id,actor)=>Number(id)===10&&Number(actor)===1?{id:10,trainerId:1,consent:db.athlete.consent}:null,
  getAthleteByUserId:async uid=>Number(uid)===2?{id:10,userId:2,consent:db.athlete.consent}:null,
  formatAthlete:a=>a};
 const exec=async(sql,p=[])=>{
  const q=sql.replace(/\s+/g,' ').trim();
  if(/^(BEGIN|COMMIT|ROLLBACK)/.test(q))return{rows:[]};
  if(q.includes('FROM athletes a WHERE a.id=$1'))return{rows:Number(p[0])===10?[{trainer_id:db.athlete.trainer_id,user_id:db.athlete.user_id,consent:consentOk()}]:[]};
  if(q.startsWith('SELECT id,role FROM users'))return{rows:db.users.filter(u=>u.id===Number(p[0]))};
  if(q.startsWith('SELECT id,name,age,birth_date'))return{rows:Number(p[0])===10?[db.athlete]:[]};
  if(q.includes('FROM athlete_video_uploads WHERE user_id=$1 AND request_id=$2'))return{rows:db.uploads.filter(u=>u.user_id===p[0]&&u.request_id===p[1])};
  if(q.startsWith('INSERT INTO sessions')){const s={id:db.sessions.length+1,athlete_id:p[0],trainer_id:p[1],notes:p[2],ipt_score:null,analysis:null};db.sessions.push(s);return{rows:[{id:s.id}]};}
  if(q.startsWith('UPDATE sessions SET video_url')){db.sessions.find(s=>s.id===p[1]).video_url=p[0];return{rows:[]};}
  if(q.startsWith('INSERT INTO athlete_video_uploads')){
   const u={id:p[0],user_id:p[1],athlete_id:p[2],session_id:p[3],request_id:p[4],stored_name:p[5],original_name:p[6],mime:p[7],
    status:'queued',requested_by:p[1],attempts:0,next_attempt_at:now(),error:null,process_key:null,started_at:null};
   db.uploads.push(u);return{rows:[u]};
  }
  // Cola: fallar trabajos abandonados sin intentos restantes
  if(q.includes("SET status='failed'")&&q.includes("WHERE status='processing' AND started_at"))return{rows:[]};
  // Cola: tomar el siguiente trabajo
  if(q.includes('FOR UPDATE SKIP LOCKED')){
   const u=db.uploads.filter(x=>x.status==='queued'&&x.next_attempt_at<=now()).sort((a,b)=>a.next_attempt_at-b.next_attempt_at)[0];
   if(!u)return{rows:[]};
   Object.assign(u,{status:'processing',process_key:p[0],started_at:now(),attempts:u.attempts+1,error:null});
   return{rows:[{...u}]};
  }
  if(q.includes("SET status='queued', process_key=NULL")){
   const u=db.uploads.find(x=>x.id===p[2]&&x.process_key===p[3]);
   if(u)Object.assign(u,{status:'queued',process_key:null,error:p[0],next_attempt_at:new Date(Date.now()+p[1]*1000)});return{rows:[]};
  }
  if(q.includes("SET status='failed', process_key=NULL")){
   const u=db.uploads.find(x=>x.id===p[1]&&x.process_key===p[2]);if(u)Object.assign(u,{status:'failed',error:p[0],process_key:null});return{rows:[]};
  }
  if(q.includes('FROM athlete_video_uploads WHERE id=$1 AND process_key=$2'))return{rows:db.uploads.filter(u=>u.id===p[0]&&u.process_key===p[1])};
  if(q.startsWith('UPDATE sessions SET trainer_id')){const s=db.sessions.find(x=>x.id===p[3]);Object.assign(s,{ipt_score:p[1],analysis:JSON.parse(p[2])});return{rows:[]};}
  if(q.includes("SET status='completed'")){const u=db.uploads.find(x=>x.id===p[0]&&x.process_key===p[1]);Object.assign(u,{status:'completed',process_key:null});return{rows:[]};}
  if(q.includes("SET status='queued',attempts=0")){
   const u=db.uploads.find(x=>x.id===p[0]&&p[2].includes(x.status));
   if(!u)return{rows:[]};
   Object.assign(u,{status:'queued',attempts:0,error:null,process_key:null,next_attempt_at:now(),requested_by:p[1]});
   return{rows:[{id:u.id,session_id:u.session_id,status:u.status}]};
  }
  if(q.startsWith('SELECT id,session_id,status,error FROM athlete_video_uploads WHERE id=$1'))return{rows:db.uploads.filter(u=>u.id===p[0])};
  if(q.includes('FROM athlete_video_uploads WHERE id=$1'))return{rows:db.uploads.filter(u=>u.id===p[0])};
  if(q.includes('FROM athlete_video_uploads WHERE session_id=$1'))return{rows:db.uploads.filter(u=>u.session_id===Number(p[0]))};
  throw new Error('SQL no previsto en el doble: '+q.slice(0,90));
 };
 const pool={query:exec,connect:async()=>({query:exec,release(){}})};
 const fetchDouble=async()=>{
  db.cvCalls++;
  if(state.cv==='down'){const e=new TypeError('fetch failed');throw e;}
  if(state.cv==='422')return{ok:false,status:422,json:async()=>({detail:'Usa un clip de hasta cinco minutos para analizar el recorrido completo.'})};
  if(state.cv==='garbage')return{ok:true,status:200,json:async()=>{throw new SyntaxError('Unexpected token < in JSON at position 0 /srv/secreto');}};
  return{ok:true,status:200,json:async()=>CV};
 };
 const errors=[];
 const sandbox={module:{exports:{}},exports:{},__dirname:path.resolve(__dirname,'../src/controllers'),
  require:name=>name==='../db/repository'?repo:name==='../db/pgClient'?{getPool:()=>pool}:
   name==='./sessionController'?require('../src/controllers/sessionController'):
   name==='../services/athleteAccess'?require('../src/services/athleteAccess'):require(name),
  process:{env:{VIDEO_STORAGE_DIR:storage,CV_SERVICE_URL:'http://cv.test'}},
  console:{...console,error:(...a)=>errors.push(a.map(String).join(' '))},URL,AbortSignal,FormData,fetch:fetchDouble};
 vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../src/controllers/athleteVideoController.js'),'utf8'),sandbox);
 const controller=sandbox.module.exports;
 let notified=0;controller.setQueueNotifier(()=>notified++);
 const queue=createVideoQueue({pool,processJob:controller.processJob,maxAttempts:3,backoffSeconds:30,logger:{log(){},error(){}}});
 return{handle:controller.handle,controller,queue,db,storage,state,errors,notified:()=>notified};
}
async function call(handle,user,url,method,body){
 const req=Readable.from(body?[body]:[]);
 Object.assign(req,{user,url,method,headers:{'content-type':'video/mp4','content-length':String(body?body.length:0)}});
 const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(d){this.data=d;return this;}};
 await handle(req,res);return res;
}
const COACH={id:1,role:'entrenador'};
const ATHLETE={id:2,role:'atleta'};
const UP='/api/capture/videos?athleteId=10&filename=carrera.mp4&requestId='+REQ_ID;
const VIDEO=Buffer.alloc(2048,7);
const makeDue=db=>db.uploads.forEach(u=>{u.next_attempt_at=new Date(Date.now()-1000);});

test('T-05: la subida responde de inmediato con el video en cola, sin analizarlo todavía',async()=>{
 const s=setup();const r=await call(s.handle,COACH,UP,'POST',VIDEO);
 assert.equal(r.statusCode,201);assert.equal(r.data.status,'queued');
 assert.equal(s.db.sessions.length,1);assert.equal(s.db.uploads.length,1);
 assert.equal(s.db.cvCalls,0,'la subida no debe esperar al servicio de visión');
 assert.equal(s.notified(),1,'la subida despierta a la cola');
 assert.ok(fs.existsSync(path.join(s.storage,s.db.uploads[0].stored_name)),'el archivo debe existir en disco');
});
test('T-05: reintentar la misma carga (mismo requestId) no duplica video ni sesión',async()=>{
 const s=setup();await call(s.handle,COACH,UP,'POST',VIDEO);
 const r=await call(s.handle,COACH,UP,'POST',VIDEO);
 assert.equal(r.statusCode,200);assert.equal(s.db.uploads.length,1);assert.equal(s.db.sessions.length,1);
});
test('T-05: sin consentimiento no se sube el video (403) ni se crea sesión',async()=>{
 const s=setup({consent:false});const r=await call(s.handle,COACH,UP,'POST',VIDEO);
 assert.equal(r.statusCode,403);assert.equal(s.db.sessions.length,0);
});
test('Consentimiento: un consentimiento formal vencido impide subir aunque la ficha diga consentimiento',async()=>{
 const s=setup({consentRows:[{id:1,status:'granted',expires_at:new Date(Date.now()-DAY)}]});
 const r=await call(s.handle,COACH,UP,'POST',VIDEO);
 assert.equal(r.statusCode,403);assert.equal(s.db.uploads.length,0);
});
test('T-05: formato no permitido se rechaza (400)',async()=>{
 const s=setup();const r=await call(s.handle,COACH,UP.replace('carrera.mp4','carrera.exe'),'POST',VIDEO);
 assert.equal(r.statusCode,400);assert.equal(s.db.uploads.length,0);
});
test('Cola: el trabajador analiza el video, guarda IPT y análisis y escribe la trayectoria de pose',async()=>{
 const s=setup();await call(s.handle,COACH,UP,'POST',VIDEO);
 assert.equal(await s.queue.runOne(),true);
 const sess=s.db.sessions[0];
 assert.equal(s.db.uploads[0].status,'completed');
 assert.equal(sess.ipt_score,Math.round(CV.ipt_evaluation.ipt_score*10)/10);
 assert.equal(sess.analysis.summary_metrics.min_knee_flexion,CV.summary_metrics.min_knee_flexion);
 assert.ok(fs.existsSync(path.join(s.storage,s.db.uploads[0].stored_name+'.pose.json')));
 assert.equal(await s.queue.runOne(),false,'no queda nada en cola');
});
test('Cola: si el servicio de visión no responde, el video vuelve a la cola con espera y luego falla al agotar intentos',async()=>{
 const s=setup({cv:'down'});await call(s.handle,COACH,UP,'POST',VIDEO);
 await s.queue.runOne();
 let u=s.db.uploads[0];
 assert.equal(u.status,'queued');assert.equal(u.attempts,1);
 assert.match(u.error,/reintentará automáticamente/);
 assert.ok(u.next_attempt_at>new Date(),'el reintento queda programado más adelante');
 assert.equal(await s.queue.runOne(),false,'no se reintenta antes de tiempo');
 makeDue(s.db);await s.queue.runOne();
 makeDue(s.db);await s.queue.runOne();
 u=s.db.uploads[0];
 assert.equal(u.status,'failed');assert.equal(u.attempts,3);assert.equal(s.db.sessions[0].ipt_score,null);
});
test('Cola: un rechazo del propio video (4xx) falla sin reintentos y muestra el motivo',async()=>{
 const s=setup({cv:'422'});await call(s.handle,COACH,UP,'POST',VIDEO);
 await s.queue.runOne();
 const u=s.db.uploads[0];
 assert.equal(u.status,'failed');assert.equal(u.attempts,1);
 assert.match(u.error,/cinco minutos/);
});
test('Errores: un fallo inesperado no expone detalles internos al usuario',async()=>{
 const s=setup({cv:'garbage'});await call(s.handle,COACH,UP,'POST',VIDEO);
 await s.queue.runOne();
 const u=s.db.uploads[0];
 assert.doesNotMatch(u.error,/Unexpected token|secreto|SyntaxError/);
 assert.match(u.error,/Error interno durante el análisis/);
 assert.ok(s.errors.some(e=>e.includes('secreto')),'el detalle queda en el registro del servidor');
});
test('Consentimiento: si se revoca después de subir, el análisis en cola no se ejecuta',async()=>{
 const s=setup();await call(s.handle,COACH,UP,'POST',VIDEO);
 s.db.consents.push({id:5,status:'revoked',expires_at:null});
 await s.queue.runOne();
 assert.equal(s.db.uploads[0].status,'failed');assert.match(s.db.uploads[0].error,/consentimiento/i);
 assert.equal(s.db.cvCalls,0,'no se envía el video al análisis sin consentimiento');
});
test('Reintento manual: un video fallido vuelve a la cola (202) con los intentos reiniciados',async()=>{
 const s=setup({cv:'422'});const up=await call(s.handle,COACH,UP,'POST',VIDEO);
 await s.queue.runOne();assert.equal(s.db.uploads[0].status,'failed');
 s.state.cv='ok';
 const r=await call(s.handle,COACH,'/api/capture/videos/'+up.data.uploadId+'/analyze','POST');
 assert.equal(r.statusCode,202);assert.equal(r.data.status,'queued');
 assert.equal(s.db.uploads[0].attempts,0);
 await s.queue.runOne();
 assert.equal(s.db.uploads[0].status,'completed');
});
test('Reintento manual: pedir analizar un video que ya está en cola no lo duplica',async()=>{
 const s=setup();const up=await call(s.handle,COACH,UP,'POST',VIDEO);
 const r=await call(s.handle,COACH,'/api/capture/videos/'+up.data.uploadId+'/analyze','POST');
 assert.equal(r.statusCode,202);assert.equal(r.data.status,'queued');assert.equal(s.db.uploads.length,1);
});
test('Estado: el historial y el estado del análisis informan en cola / analizando / listo',async()=>{
 const s=setup();const up=await call(s.handle,COACH,UP,'POST',VIDEO);
 const st=await call(s.handle,ATHLETE,'/api/videos/'+up.data.sessionId+'/analysis-status','GET');
 assert.equal(st.statusCode,200);assert.equal(st.data.status,'queued');
 await s.queue.runOne();
 const done=await call(s.handle,ATHLETE,'/api/videos/'+up.data.sessionId+'/analysis-status','GET');
 assert.equal(done.data.status,'completed');
});
test('Cola: la espera entre reintentos automáticos crece (30 s, 60 s, 120 s)',()=>{
 assert.deepEqual([1,2,3].map(n=>backoffSeconds(n,30)),[30,60,120]);
});
