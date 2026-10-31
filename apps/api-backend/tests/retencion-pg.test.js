// T-12: purga de videos vencidos contra PostgreSQL real.
// DATABASE_URL=postgres://... node --test tests/retencion-pg.test.js (sin DATABASE_URL se omite)
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const skip=process.env.DATABASE_URL?false:'DATABASE_URL no definida';
let pool,repo,purge;

async function seed(){
 await pool.query('TRUNCATE users,clubs RESTART IDENTITY CASCADE');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'metahub-ret-'));
 const u=await repo.createUser({name:'Ret',email:'ret'+Date.now()+'@pg.test',password:'test-password'});
 const ath=await repo.createAthlete({name:'Atleta',age:15,trainerId:u.id,consent:true});
 const mk=async(daysAgo,status='completed')=>{
  const s=await repo.createSession({athleteId:ath.id,trainerId:u.id,notes:'x',iptScore:70,analysis:{ipt_score:70}});
  const id=randomUUID();const name=id+'.mp4';
  fs.writeFileSync(path.join(root,name),'v');fs.writeFileSync(path.join(root,name+'.pose.json'),'{}');
  await pool.query('UPDATE sessions SET video_url=$1 WHERE id=$2',['/v/'+name,s.id]);
  await pool.query(`INSERT INTO athlete_video_uploads(id,user_id,athlete_id,session_id,request_id,stored_name,original_name,mime,status,created_at)
   VALUES($1,$2,$3,$4,$5,$6,'a.mp4','video/mp4',$7,now()-($8||' days')::interval)`,[id,u.id,ath.id,s.id,randomUUID(),name,status,String(daysAgo)]);
  return {id,name,sessionId:s.id};
 };
 return {root,old:await mk(400),recent:await mk(10),oldProcessing:await mk(400,'processing')};
}

test('PostgreSQL: la simulación informa los vencidos y no borra nada',{skip},async()=>{
 delete require.cache[require.resolve('../src/db/pgClient')];
 repo=require('../src/db/repository');pool=require('../src/db/pgClient').getPool();purge=require('../src/services/retencion').purgarVideosVencidos;
 const {root,old}=await seed();
 const r=await purge({pool,rootDir:root,retentionDays:365});
 assert.equal(r.dryRun,true);assert.equal(r.candidates,1);assert.equal(r.purged,0);
 assert.ok(fs.existsSync(path.join(root,old.name)));
});

test('PostgreSQL: con apply elimina solo el video vencido y conserva las métricas de la sesión',{skip},async()=>{
 const {root,old,recent,oldProcessing}=await seed();
 const r=await purge({pool,rootDir:root,retentionDays:365,dryRun:false});
 assert.equal(r.purged,1);assert.equal(r.filesDeleted,2);assert.deepEqual(r.errors,[]);
 assert.ok(!fs.existsSync(path.join(root,old.name)));assert.ok(!fs.existsSync(path.join(root,old.name+'.pose.json')));
 assert.ok(fs.existsSync(path.join(root,recent.name)));
 assert.ok(fs.existsSync(path.join(root,oldProcessing.name)),'una carga en procesamiento no se purga');
 const s=(await pool.query('SELECT video_url,ipt_score FROM sessions WHERE id=$1',[old.sessionId])).rows[0];
 assert.equal(s.video_url,'');assert.equal(Number(s.ipt_score),70);
 assert.equal((await pool.query('SELECT count(*)::int n FROM athlete_video_uploads')).rows[0].n,2);
});

test('PostgreSQL: es idempotente y tolera archivos ya ausentes',{skip},async()=>{
 const {root,old}=await seed();
 fs.unlinkSync(path.join(root,old.name));
 const a=await purge({pool,rootDir:root,retentionDays:365,dryRun:false});
 assert.equal(a.purged,1);assert.deepEqual(a.errors,[]);
 const b=await purge({pool,rootDir:root,retentionDays:365,dryRun:false});
 assert.equal(b.candidates,0);assert.equal(b.purged,0);
});

test('el plazo debe definirse explícitamente: sin valor o inválido se rechaza',{skip},async()=>{
 for(const bad of [undefined,0,-5,1.5,NaN,'365'])await assert.rejects(purge({pool,rootDir:os.tmpdir(),retentionDays:bad}),/retentionDays/);
});

test('PostgreSQL: cerrar el pool',{skip},async()=>{ await pool.end(); });
