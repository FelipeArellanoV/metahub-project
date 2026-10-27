// Pruebas propuestas, no ejecutadas durante la preparación del paquete.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const v=require('../src/services/reviewValidation');
test('una revisión publicada necesita observación y versión válida',()=>{
 assert.throws(()=>v.review({status:'reviewed',observations:' ',version:0}),e=>e.statusCode===400);
 assert.throws(()=>v.review({status:'requires_new_video',observations:'Repetir',version:-1}),e=>e.statusCode===400);
 assert.throws(()=>v.review({status:'otro',observations:'Detalle',version:1}),e=>e.statusCode===400);
 assert.deepEqual(v.review({status:'pending',observations:'',version:0}),{status:'pending',observations:'',version:0});
 assert.equal(v.review({status:'reviewed',observations:' Buena pasada ',version:2}).observations,'Buena pasada');
});
test('ejercicio con dosificación y fecha con zona horaria',()=>{
 assert.throws(()=>v.task({title:'Skipping',details:'',dueAt:null}),e=>e.statusCode===400);
 assert.throws(()=>v.task({title:'Skipping',details:'3 series',dueAt:'2026-11-01T12:00:00'}),e=>e.statusCode===400);
 assert.equal(v.task({title:'Skipping',details:'3 series',dueAt:'2026-11-01T12:00:00-03:00'}).due_at,'2026-11-01T15:00:00.000Z');
});
