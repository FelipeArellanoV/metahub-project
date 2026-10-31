// T-13: datos del panel del entrenador (lista, ficha y progreso). Modo en memoria, sin base externa.
const {test}=require('node:test');
const assert=require('node:assert/strict');
delete process.env.DATABASE_URL;
delete process.env.POSTGRES_HOST;
const repo=require('../src/db/repository');
const access=require('../src/services/athleteAccess');
const {computeProgress}=require('../src/services/progress');

async function setup(){
 repo.reset();
 const a=await repo.createUser({name:'Entrenador A',email:'a@panel.test',password:'test-password'});
 const b=await repo.createUser({name:'Entrenador B',email:'b@panel.test',password:'test-password'});
 const own1=await repo.createAthlete({name:'Beatriz',age:15,trainerId:a.id,consent:true});
 const own2=await repo.createAthlete({name:'Adrián',age:16,trainerId:a.id,consent:true});
 const other=await repo.createAthlete({name:'Ajeno',age:16,trainerId:b.id,consent:true});
 return {a,b,own1,own2,other};
}

test('la lista del panel solo trae los atletas del entrenador, marcados como propios y editables',async()=>{
 const {a,own1,own2,other}=await setup();
 const rows=await access.list(a);
 assert.deepEqual(rows.map(r=>r.id).sort(),[own1.id,own2.id].sort());
 assert.ok(!rows.some(r=>r.id===other.id));
 assert.ok(rows.every(r=>r.canEdit===true&&r.access==='own'));
});

test('solo un entrenador puede usar el panel: alumno o sin sesión reciben 403',async()=>{
 await setup();
 await assert.rejects(access.list(undefined),e=>e.statusCode===403);
 await assert.rejects(access.list({id:1,role:'atleta'}),e=>e.statusCode===403);
});

test('los identificadores inválidos se rechazan con 400 y los válidos se aceptan',()=>{
 for(const bad of ['0','-3','abc','1.5',undefined,null,''])assert.throws(()=>access.positiveId(bad),e=>e.statusCode===400);
 assert.equal(access.positiveId('7'),7);
});

test('la ficha devuelve las sesiones y el progreso calculado con IPT real',async()=>{
 const {a,own1}=await setup();
 await repo.createSession({athleteId:own1.id,trainerId:a.id,notes:'s1',iptScore:60,analysis:{ipt_score:60}});
 await repo.createSession({athleteId:own1.id,trainerId:a.id,notes:'s2',iptScore:72,analysis:{ipt_score:72}});
 const d=await access.detail(a,own1.id);
 assert.equal(d.athlete.id,own1.id);
 assert.equal(d.sessions.length,2);
 assert.equal(d.progress.sessionCount,2);
 assert.equal(d.progress.bestIpt,72);
});

test('una ficha de otro entrenador no se entrega y un id inexistente da 404',async()=>{
 const {a,other}=await setup();
 await assert.rejects(access.detail(a,other.id),e=>e.statusCode===404||e.statusCode===403);
 await assert.rejects(access.detail(a,999999),e=>e.statusCode===404);
});

test('el progreso sin sesiones no inventa valores',()=>{
 const p=computeProgress([],null);
 assert.equal(p.sessionCount,0);
 assert.equal(p.latestIpt,null);
 assert.equal(p.bestIpt,null);
});
