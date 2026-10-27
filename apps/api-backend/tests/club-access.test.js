// Propuesto, no ejecutado. Proceso aislado: node --test tests/club-access.test.js
const {test}=require('node:test');
const assert=require('node:assert/strict');
delete process.env.DATABASE_URL;
delete process.env.POSTGRES_HOST;
const repo=require('../src/db/repository');
const access=require('../src/services/athleteAccess');
test('el alcance en memoria no comparte fichas por nombres ni campos del JWT',async()=>{
 repo.reset();
 const a=await repo.createUser({name:'Entrenador A',email:'a@scope.test',password:'test-password'});
 const b=await repo.createUser({name:'Entrenador B',email:'b@scope.test',password:'test-password'});
 const own=await repo.createAthlete({name:'Mismo nombre',age:16,trainerId:a.id,consent:true,account:{email:'alumno@scope.test',password:'test-password'}});
 const other=await repo.createAthlete({name:'Mismo nombre',age:16,trainerId:b.id});
 const student=await repo.findUserById(own.userId);
 const rows=await access.list({...a,clubId:1,clubName:'Club de B'});
 assert.equal(rows.length,1);assert.equal(rows[0].id,own.id);assert.equal(rows[0].canEdit,true);
 await assert.rejects(access.readable(a,other.id),e=>e.statusCode===403||e.statusCode===404);
 await assert.rejects(access.detail(a,other.id),e=>e.statusCode===403||e.statusCode===404);
 await assert.rejects(access.list(student),e=>e.statusCode===403);
 assert.equal((await access.detail(a,own.id)).athlete.id,own.id);
});
