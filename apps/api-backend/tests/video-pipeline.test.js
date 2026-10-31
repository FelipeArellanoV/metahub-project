// T-05: carga de video -> análisis -> sesión guardada.
// Usa un doble en memoria de PostgreSQL y un doble del servicio de visión (respuesta con el contrato real).
// Verifica el flujo del controlador; la inferencia real del servicio de visión se prueba en cv-service.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const {Readable}=require('node:stream');
const CV=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/cv-response.json'),'utf8'));
const REQ_ID='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function setup({consent=true,cvOk=true}={}){
 const storage=fs.mkdtempSync(path.join(os.tmpdir(),'metahub-video-'));
 const db={uploads:[],sessions:[],athlete:{id:10,user_id:2,trainer_id:1,consent}};
 const repo={getAthleteByIdForTrainer:async(id,actor)=>Number(id)===10&&Number(actor)===1?{id:10,trainerId:1,consent}:null,getAthleteByUserId:async()=>null};
 const exec=async(sql,p=[])=>{
  const q=sql.replace(/\s+/g,' ');
  if(/^(BEGIN|COMMIT|ROLLBACK)/.test(q))return{rows:[]};
  if(q.includes('FROM athlete_video_uploads WHERE user_id=$1 AND request_id=$2'))return{rows:db.uploads.filter(u=>u.user_id===p[0]&&u.request_id===p[1])};
  if(q.includes('FROM athletes WHERE id=$1 FOR UPDATE'))return{rows:[db.athlete]};
  if(q.startsWith('INSERT INTO sessions')){const s={id:db.sessions.length+1,athlete_id:p[0],trainer_id:p[1],notes:p[2],ipt_score:null,analysis:null};db.sessions.push(s);return{rows:[{id:s.id}]};}
  if(q.startsWith('UPDATE sessions SET video_url')){db.sessions.find(s=>s.id===p[1]).video_url=p[0];return{rows:[]};}
  if(q.startsWith('INSERT INTO athlete_video_uploads')){const u={id:p[0],user_id:p[1],athlete_id:p[2],session_id:p[3],request_id:p[4],stored_name:p[5],original_name:p[6],mime:p[7],status:'uploaded',error:null,process_key:null};db.uploads.push(u);return{rows:[u]};}
  if(q.includes("SET status='processing'")){const u=db.uploads.find(x=>x.id===p[1]);if(!u||!['uploaded','failed'].includes(u.status))return{rows:[]};Object.assign(u,{status:'processing',process_key:p[0],error:null});return{rows:[u]};}
  if(q.includes('FROM athlete_video_uploads WHERE id=$1 AND process_key=$2'))return{rows:db.uploads.filter(u=>u.id===p[0]&&u.process_key===p[1])};
  if(q.startsWith('UPDATE sessions SET trainer_id')){const s=db.sessions.find(x=>x.id===p[3]);Object.assign(s,{ipt_score:p[1],analysis:JSON.parse(p[2])});return{rows:[]};}
  if(q.includes("SET status='completed'")){const u=db.uploads.find(x=>x.id===p[0]&&x.process_key===p[1]);Object.assign(u,{status:'completed',process_key:null});return{rows:[]};}
  if(q.includes("SET status='failed'")){const u=db.uploads.find(x=>x.id===p[1]&&x.process_key===p[2]);Object.assign(u,{status:'failed',error:p[0],process_key:null});return{rows:[]};}
  if(q.includes('FROM athlete_video_uploads WHERE id=$1'))return{rows:db.uploads.filter(u=>u.id===p[0])};
  throw new Error('SQL no previsto en el doble: '+q.slice(0,80));
 };
 const pool={query:exec,connect:async()=>({query:exec,release(){}})};
 const sandbox={module:{exports:{}},exports:{},__dirname:path.resolve(__dirname,'../src/controllers'),
  require:name=>name==='../db/repository'?repo:name==='../db/pgClient'?{getPool:()=>pool}:
   name==='./sessionController'?require('../src/controllers/sessionController'):
   name==='../services/athleteAccess'?require('../src/services/athleteAccess'):require(name),
  process:{env:{VIDEO_STORAGE_DIR:storage,CV_SERVICE_URL:'http://cv.test'}},console,URL,AbortSignal,FormData,
  fetch:async()=>cvOk?{ok:true,json:async()=>CV}:{ok:false,json:async()=>({})}};
 vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../src/controllers/athleteVideoController.js'),'utf8'),sandbox);
 return{handle:sandbox.module.exports.handle,db,storage};
}
async function call(handle,user,url,method,body){
 const req=Readable.from(body?[body]:[]);
 Object.assign(req,{user,url,method,headers:{'content-type':'video/mp4','content-length':String(body?body.length:0)}});
 const res={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(d){this.data=d;return this;}};
 await handle(req,res);return res;
}
const COACH={id:1,role:'entrenador'};
const UP='/api/capture/videos?athleteId=10&filename=carrera.mp4&requestId='+REQ_ID;
const VIDEO=Buffer.alloc(2048,7);

test('T-05: el entrenador sube un video y queda guardado con su sesión en estado uploaded',async()=>{
 const s=setup();const r=await call(s.handle,COACH,UP,'POST',VIDEO);
 assert.equal(r.statusCode,201);assert.equal(r.data.status,'uploaded');
 assert.equal(s.db.sessions.length,1);assert.equal(s.db.uploads.length,1);
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
test('T-05: formato no permitido se rechaza (400)',async()=>{
 const s=setup();const r=await call(s.handle,COACH,UP.replace('carrera.mp4','carrera.exe'),'POST',VIDEO);
 assert.equal(r.statusCode,400);assert.equal(s.db.uploads.length,0);
});
test('T-05: el análisis completa el video, guarda IPT y análisis en la sesión y escribe la trayectoria de pose',async()=>{
 const s=setup();const up=await call(s.handle,COACH,UP,'POST',VIDEO);
 const r=await call(s.handle,COACH,'/api/capture/videos/'+up.data.uploadId+'/analyze','POST');
 assert.equal(r.statusCode,200);assert.equal(r.data.status,'completed');
 const sess=s.db.sessions[0];
 assert.equal(sess.ipt_score,Math.round(CV.ipt_evaluation.ipt_score*10)/10);
 assert.equal(sess.analysis.summary_metrics.min_knee_flexion,CV.summary_metrics.min_knee_flexion);
 assert.equal(s.db.uploads[0].status,'completed');
 assert.ok(fs.existsSync(path.join(s.storage,s.db.uploads[0].stored_name+'.pose.json')));
});
test('T-05: si el servicio de visión falla, el video queda en failed y puede reintentarse',async()=>{
 const s=setup({cvOk:false});const up=await call(s.handle,COACH,UP,'POST',VIDEO);
 const r=await call(s.handle,COACH,'/api/capture/videos/'+up.data.uploadId+'/analyze','POST');
 assert.equal(r.data.status,'failed');assert.equal(s.db.uploads[0].status,'failed');assert.equal(s.db.sessions[0].ipt_score,null);
});
