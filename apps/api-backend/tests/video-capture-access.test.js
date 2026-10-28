const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {Readable}=require('node:stream');
function denied(){const e=new Error('Ficha ajena');e.statusCode=403;throw e;}
function setup(){
 let queryCount=0;
 const repo={
  getAthleteByUserId:async()=>({id:10,userId:2,trainerId:1,consent:true}),
  getAthleteByIdForTrainer:async(id,actor)=>{if(Number(id)!==10||Number(actor)!==1)denied();return{id:10,trainerId:1,consent:true};}
 };
 const access={
  positiveId:v=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<1){const e=new Error('Id inválido');e.statusCode=400;throw e;}return n;},
  reject:(code,message)=>{const e=new Error(message);e.statusCode=code;throw e;},
  // El club puede leer. Eso NO debe permitir cargar ni analizar por otro entrenador.
  readable:async()=>({id:10,canEdit:false})
 };
 const pool={query:async(sql)=>{queryCount++;return{rows:sql.includes('WHERE id=$1')?[{id:'11111111-1111-4111-8111-111111111111',athlete_id:11,user_id:3}]:[]};}};
 const sandbox={module:{exports:{}},exports:{},__dirname:path.resolve(__dirname,'../src/controllers'),
  require:name=>name==='../db/repository'?repo:name==='../db/pgClient'?{getPool:()=>pool}:
   name==='../services/athleteAccess'?access:name==='./sessionController'?{buildAnalysisSummary:()=>null}:require(name),
  process:{env:{}},console,URL,AbortSignal,FormData,fetch:()=>{throw Error('No debe invocarse CV en estas pruebas.');}
 };
 vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../src/controllers/athleteVideoController.js'),'utf8'),sandbox);
 return{handle:sandbox.module.exports.handle,queries:()=>queryCount};
}
async function call(handle,user,url,method='GET'){
 const req=Readable.from([]);Object.assign(req,{user,url,method,headers:{'content-type':'video/mp4'}});
 const res={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(data){this.data=data;return this;}};
 await handle(req,res);return res;
}
test('entrenador lista videos solo de una ficha a su cargo',async()=>{
 const s=setup();const res=await call(s.handle,{id:1,role:'entrenador'},'/api/capture/videos?athleteId=10');
 assert.equal(res.statusCode,200);assert.equal(res.data.videos.length,0);assert.equal(s.queries(),1);
});
test('un entrenador del club no puede cargar en una ficha ajena',async()=>{
 const s=setup();const res=await call(s.handle,{id:9,role:'entrenador'},'/api/capture/videos?athleteId=10','POST');
 assert.equal(res.statusCode,403);assert.equal(s.queries(),0);
});
test('alumno no puede falsear athleteId al listar o cargar',async()=>{
 for(const method of ['GET','POST']){
  const s=setup();const res=await call(s.handle,{id:2,role:'atleta'},'/api/capture/videos?athleteId=11',method);
  assert.equal(res.statusCode,403);assert.equal(s.queries(),0);
 }
});
test('alumno no puede analizar un video ajeno por su UUID',async()=>{
 const s=setup();const res=await call(s.handle,{id:2,role:'atleta'},'/api/capture/videos/11111111-1111-4111-8111-111111111111/analyze','POST');
 assert.equal(res.statusCode,403);
});
test('la ruta anterior del portal sigue resolviendo la propia ficha',async()=>{
 const s=setup();const res=await call(s.handle,{id:2,role:'atleta'},'/api/portal/videos');
 assert.equal(res.statusCode,200);
});
