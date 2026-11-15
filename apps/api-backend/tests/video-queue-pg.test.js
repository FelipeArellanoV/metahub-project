// Cola de análisis de video contra PostgreSQL real (SQL de la cola, bloqueo SKIP LOCKED,
// reintentos con espera y verificación de consentimiento al procesar).
// DATABASE_URL=postgres://... node --test tests/video-queue-pg.test.js (sin DATABASE_URL se omite)
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const skip=process.env.DATABASE_URL?false:'DATABASE_URL no definida';
const CV=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/cv-response.json'),'utf8'));
const STORAGE=fs.mkdtempSync(path.join(os.tmpdir(),'metahub-queue-'));
process.env.VIDEO_STORAGE_DIR=STORAGE;
process.env.CV_SERVICE_URL='http://cv.test';
let pool,repo,controller,createVideoQueue;
const realFetch=globalThis.fetch;
let cvMode='ok';

before(()=>{
 if(skip)return;
 repo=require('../src/db/repository');pool=require('../src/db/pgClient').getPool();
 controller=require('../src/controllers/athleteVideoController');
 ({createVideoQueue}=require('../src/services/videoQueue'));
 globalThis.fetch=async()=>{
  if(cvMode==='down')throw new TypeError('fetch failed');
  return {ok:true,status:200,json:async()=>CV};
 };
});
after(async()=>{globalThis.fetch=realFetch;if(pool)await pool.end().catch(()=>{});});

async function seed(n=1,{consent=true}={}){
 await pool.query('TRUNCATE users,clubs RESTART IDENTITY CASCADE');
 const coach=await repo.createUser({name:'Cola',email:'cola'+Date.now()+'@pg.test',password:'test-password'});
 const athlete=await repo.createAthlete({name:'Atleta',age:15,trainerId:coach.id,consent:false,
  consentRecord:consent?{guardianName:'Apoderada Real',recordedBy:coach.id}:null});
 const ids=[];
 for(let i=0;i<n;i++){
  const s=await repo.createSession({athleteId:athlete.id,trainerId:coach.id,notes:'x'});
  const id=randomUUID(),name=id+'.mp4';
  fs.writeFileSync(path.join(STORAGE,name),Buffer.alloc(1024,1));
  await pool.query(`INSERT INTO athlete_video_uploads(id,user_id,athlete_id,session_id,request_id,stored_name,original_name,mime,status,requested_by)
   VALUES($1,$2,$3,$4,$5,$6,'a.mp4','video/mp4','queued',$2)`,[id,coach.id,athlete.id,s.id,randomUUID(),name]);
  ids.push(id);
 }
 return {coach,athlete,ids};
}
const row=async id=>(await pool.query('SELECT * FROM athlete_video_uploads WHERE id=$1',[id])).rows[0];
const quietQueue=opts=>createVideoQueue({pool,processJob:controller.processJob,logger:{log(){},error(){}},...opts});

test('PostgreSQL: el trabajador analiza el video en cola y lo deja listo con su IPT',{skip},async()=>{
 cvMode='ok';
 const {ids}=await seed();
 assert.equal(await quietQueue().runOne(),true);
 const r=await row(ids[0]);
 assert.equal(r.status,'completed');assert.equal(r.attempts,1);assert.equal(r.process_key,null);
 const s=(await pool.query('SELECT ipt_score,analysis FROM sessions WHERE id=$1',[r.session_id])).rows[0];
 assert.equal(s.ipt_score,Math.round(CV.ipt_evaluation.ipt_score*10)/10);
 assert.ok(s.analysis.pose_info,'guarda el resumen de la trayectoria');
});

test('PostgreSQL: un fallo transitorio reprograma el video con espera; al agotar intentos queda en falló',{skip},async()=>{
 cvMode='down';
 const {ids}=await seed();
 const queue=quietQueue({maxAttempts:2,backoffSeconds:60});
 await queue.runOne();
 let r=await row(ids[0]);
 assert.equal(r.status,'queued');assert.equal(r.attempts,1);
 assert.ok(new Date(r.next_attempt_at)>new Date(Date.now()+50*1000),'próximo intento en ~60 s');
 assert.equal(await queue.runOne(),false,'no se toma antes de tiempo');
 await pool.query("UPDATE athlete_video_uploads SET next_attempt_at=now()-interval '1 second'");
 await queue.runOne();
 r=await row(ids[0]);
 assert.equal(r.status,'failed');assert.equal(r.attempts,2);
 assert.match(r.error,/no está disponible/);
});

test('PostgreSQL: dos trabajadores en paralelo nunca toman el mismo video (SKIP LOCKED)',{skip},async()=>{
 cvMode='ok';
 const {ids}=await seed(2);
 const taken=[];
 const slowJob=async(r,key)=>{taken.push(r.id);await new Promise(res=>setTimeout(res,150));return controller.processJob(r,key);};
 const a=createVideoQueue({pool,processJob:slowJob,logger:{log(){},error(){}}});
 const b=createVideoQueue({pool,processJob:slowJob,logger:{log(){},error(){}}});
 await Promise.all([a.runOne(),b.runOne()]);
 assert.equal(new Set(taken).size,2,'cada trabajador tomó un video distinto');
 for(const id of ids)assert.equal((await row(id)).status,'completed');
});

test('PostgreSQL: un análisis abandonado se recupera; si ya agotó sus intentos pasa a falló',{skip},async()=>{
 cvMode='ok';
 const {ids}=await seed(2);
 await pool.query(`UPDATE athlete_video_uploads SET status='processing',started_at=now()-interval '30 minutes',attempts=1 WHERE id=$1`,[ids[0]]);
 await pool.query(`UPDATE athlete_video_uploads SET status='processing',started_at=now()-interval '30 minutes',attempts=3 WHERE id=$1`,[ids[1]]);
 const queue=quietQueue({maxAttempts:3});
 queue.start();
 // El trabajo corre en segundo plano: esperar a que salga de "processing" (máximo 10 s).
 for(let i=0;i<100&&(await row(ids[0])).status==='processing';i++)await new Promise(res=>setTimeout(res,100));
 queue.stop();
 assert.equal((await row(ids[0])).status,'completed','se retomó y completó');
 const exhausted=await row(ids[1]);
 assert.equal(exhausted.status,'failed');assert.match(exhausted.error,/interrumpió/);
});

test('PostgreSQL: con el consentimiento vencido el trabajo falla sin enviar el video al análisis',{skip},async()=>{
 cvMode='ok';
 const {ids,athlete}=await seed();
 await pool.query("UPDATE consents SET expires_at=now()-interval '1 day' WHERE athlete_id=$1",[athlete.id]);
 let calls=0;const prev=globalThis.fetch;globalThis.fetch=async(...a)=>{calls++;return prev(...a);};
 try{await quietQueue().runOne();}finally{globalThis.fetch=prev;}
 const r=await row(ids[0]);
 assert.equal(r.status,'failed');assert.match(r.error,/consentimiento/i);assert.equal(calls,0);
});
