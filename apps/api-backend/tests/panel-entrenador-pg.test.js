// T-13: consultas SQL del panel del entrenador contra PostgreSQL real (alcance propio y de club).
// Requiere una base con el esquema aplicado: DATABASE_URL=postgres://... node --test tests/panel-entrenador-pg.test.js
// Sin DATABASE_URL la suite se omite (la versión en memoria está en panel-entrenador.test.js).
const {test}=require('node:test');
const assert=require('node:assert/strict');
const URL_DB=process.env.DATABASE_URL;
const skip=URL_DB?false:'DATABASE_URL no definida';
let repo,access,pool;
const uniq=Date.now().toString(36);

async function seed(){
 await pool.query('TRUNCATE users,clubs RESTART IDENTITY CASCADE');
 const mk=(n)=>repo.createUser({name:'Entrenador '+n,email:n.toLowerCase()+uniq+'@pg.test',password:'test-password'});
 const a=await mk('A'),b=await mk('B'),c=await mk('C');
 // A y B comparten club; C está fuera.
 const club=(await pool.query('INSERT INTO clubs(name,owner_id) VALUES($1,$2) RETURNING id',['Club PG',a.id])).rows[0].id;
 await pool.query('INSERT INTO club_memberships(club_id,user_id) VALUES($1,$2),($1,$3)',[club,a.id,b.id]);
 const own=await repo.createAthlete({name:'Propia',age:15,trainerId:a.id,consent:true});
 const mate=await repo.createAthlete({name:'De compañero',age:16,trainerId:b.id,consent:true});
 const out=await repo.createAthlete({name:'Fuera del club',age:16,trainerId:c.id,consent:true});
 await repo.createSession({athleteId:own.id,trainerId:a.id,notes:'s1',iptScore:60,analysis:{ipt_score:60}});
 await repo.createSession({athleteId:own.id,trainerId:a.id,notes:'s2',iptScore:72,analysis:{ipt_score:72}});
 await repo.createSession({athleteId:mate.id,trainerId:b.id,notes:'m1',iptScore:65,analysis:{ipt_score:65}});
 return {a,b,c,own,mate,out};
}

test('PostgreSQL: la lista incluye atletas propios y del club, y excluye los de fuera del club',{skip},async()=>{
 delete require.cache[require.resolve('../src/db/pgClient')];
 repo=require('../src/db/repository');access=require('../src/services/athleteAccess');pool=require('../src/db/pgClient').getPool();
 const {a,own,mate,out}=await seed();
 const rows=await access.list(a);
 const byId=Object.fromEntries(rows.map(r=>[r.id,r]));
 assert.deepEqual(Object.keys(byId).map(Number).sort(),[own.id,mate.id].sort());
 assert.ok(!byId[out.id]);
 assert.equal(byId[own.id].access,'own');assert.equal(byId[own.id].canEdit,true);
 assert.equal(byId[mate.id].access,'club');assert.equal(byId[mate.id].canEdit,false);
 assert.equal(byId[own.id].sessionCount,2);
 assert.equal(byId[own.id].lastIptScore,72);
});

test('PostgreSQL: la ficha de un compañero de club se lee, la de fuera del club se rechaza',{skip},async()=>{
 const {a,mate,out}=await seed();
 const d=await access.detail(a,mate.id);
 assert.equal(d.athlete.id,mate.id);assert.equal(d.sessions.length,1);
 await assert.rejects(access.detail(a,out.id),e=>e.statusCode===404);
 await assert.rejects(access.readable(a,out.id),e=>e.statusCode===404);
});

test('PostgreSQL: el entrenador fuera del club no ve los atletas del club',{skip},async()=>{
 const {c,own,mate}=await seed();
 const rows=await access.list(c);
 assert.equal(rows.length,1);
 assert.ok(!rows.some(r=>r.id===own.id||r.id===mate.id));
 await assert.rejects(access.detail(c,own.id),e=>e.statusCode===404);
});

test('PostgreSQL: la ficha propia trae sesiones ordenadas y progreso con IPT real',{skip},async()=>{
 const {a,own}=await seed();
 const d=await access.detail(a,own.id);
 assert.equal(d.sessions.length,2);
 assert.equal(d.progress.sessionCount,2);
 assert.equal(d.progress.bestIpt,72);
});

test('PostgreSQL: cerrar el pool',{skip},async()=>{ await pool.end(); });
