function fail(statusCode,message){const error=new Error(message);error.statusCode=statusCode;throw error;}
function number(value,label,zero=false){
 const n=Number(value);
 if(!Number.isSafeInteger(n)||n<(zero?0:1))fail(400,label+' inválido.');
 return n;
}
function text(value,label,max){
 if(typeof value!=='string'||!value.trim()||value.length>max)fail(400,label+' requerido (máximo '+max+' caracteres).');
 return value.trim();
}
function review(body){
 if(!['pending','reviewed','requires_new_video'].includes(body.status))fail(400,'Estado de revisión inválido.');
 if(typeof body.observations!=='string'||body.observations.length>3000)fail(400,'Observaciones: máximo 3000 caracteres.');
 if(body.status!=='pending'&&!body.observations.trim())fail(400,'Agrega una observación para comunicar la revisión al alumno.');
 return {status:body.status,observations:body.observations.trim(),version:number(body.version,'Versión',true)};
}
function task(body){
 const result={title:text(body.title,'Título',160),details:text(body.details,'Indicaciones',2000),due_at:null};
 if(body.dueAt){
  if(typeof body.dueAt!=='string'||!/(Z|[+-]\d{2}:\d{2})$/.test(body.dueAt)||!Number.isFinite(new Date(body.dueAt).getTime()))fail(400,'Fecha de entrega inválida.');
  result.due_at=new Date(body.dueAt).toISOString();
 }
 return result;
}
module.exports={fail,number,review,task};
