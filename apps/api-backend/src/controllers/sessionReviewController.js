const crypto=require('node:crypto');
const {getPool}=require('../db/pgClient');
const repo=require('../db/repository');
const access=require('../services/athleteAccess');
const validate=require('../services/reviewValidation');

async function handle(req,res){
 res.setHeader('Cache-Control','no-store');
 try{
  const url=new URL(req.url,'http://localhost'),body=req.body||{};
  if(!['entrenador','atleta'].includes(req.user.role))validate.fail(403,'Perfil no autorizado.');
  if(req.method!=='GET'&&req.user.role!=='entrenador')validate.fail(403,'Solo tu entrenador puede revisar sesiones y asignar ejercicios.');
  const pool=getPool();if(!pool)validate.fail(503,'Las revisiones requieren PostgreSQL y la migración 006.');
  if(req.method==='GET'&&url.pathname==='/api/reviews'){
   let athlete;
   if(req.user.role==='atleta'){
    athlete=await repo.getAthleteByUserId(req.user.id);
    if(!athlete)validate.fail(404,'Cuenta sin ficha vinculada.');
    if(url.searchParams.has('athleteId')&&validate.number(url.searchParams.get('athleteId'),'Atleta')!==athlete.id)validate.fail(403,'Solo puedes consultar tus sesiones.');
    athlete.canEdit=false;
   }else athlete=await access.readable(req.user,url.searchParams.get('athleteId'));
   // No se entrega video, cuenta ni información de otro atleta.
   const sessions=(await pool.query(`
    SELECT s.id,s.session_date AS "sessionDate",s.ipt_score AS "iptScore",s.analysis,
     coalesce(r.status,'pending') AS "reviewStatus",coalesce(r.observations,'') AS observations,
     coalesce(r.version,0) AS "reviewVersion",r.updated_at AS "reviewedAt"
    FROM sessions s LEFT JOIN session_reviews r ON r.session_id=s.id
    WHERE s.athlete_id=$1 ORDER BY s.session_date DESC,s.id DESC`,[athlete.id])).rows;
   const tasks=(await pool.query(`
    SELECT id,title,details,done,source_session_id AS "sessionId",due_at AS "dueAt",version
    FROM collaboration_tasks WHERE athlete_id=$1 AND source_session_id IS NOT NULL ORDER BY updated_at DESC`,[athlete.id])).rows;
   return res.json({athlete:{id:athlete.id,name:athlete.name,canEdit:req.user.role==='entrenador'&&athlete.canEdit===true},sessions,tasks});
  }
  const match=url.pathname.match(/^\/api\/reviews\/(\d+)(?:\/(tasks))?$/);
  if(!match)validate.fail(404,'Ruta no encontrada.');
  const isTask=Boolean(match[2]);
  if((isTask&&req.method!=='POST')||(!isTask&&req.method!=='PUT'))validate.fail(405,'Método no permitido.');
  const sessionId=validate.number(match[1],'Sesión');
  const payload=isTask?validate.task(body):validate.review(body);
  if(typeof body.requestId!=='string'||!/^[a-f0-9-]{36}$/.test(body.requestId))validate.fail(400,'requestId inválido.');
  const fingerprint=crypto.createHash('sha256').update(JSON.stringify({sessionId,isTask,payload})).digest('hex');
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const session=(await client.query(`
    SELECT s.id,s.athlete_id,a.trainer_id FROM sessions s
    JOIN athletes a ON a.id=s.athlete_id WHERE s.id=$1 FOR UPDATE OF a,s`,[sessionId])).rows[0];
   if(!session)validate.fail(404,'Sesión no encontrada.');
   if(session.trainer_id!==Number(req.user.id))validate.fail(403,'Los atletas del club son de solo lectura. Solo el responsable puede modificar esta sesión.');
   const previous=(await client.query('SELECT fingerprint,result FROM collaboration_receipts WHERE actor_id=$1 AND request_id=$2',[req.user.id,body.requestId])).rows[0];
   if(previous){
    if(previous.fingerprint!==fingerprint)validate.fail(409,'El identificador ya pertenece a otra operación.');
    await client.query('COMMIT');return res.json(previous.result);
   }
   let result;
   if(isTask){
    const id=crypto.randomUUID();
    result={task:(await client.query(`
     INSERT INTO collaboration_tasks(id,athlete_id,title,details,source_session_id,due_at)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
     [id,session.athlete_id,payload.title,payload.details,sessionId,payload.due_at])).rows[0]};
   }else{
    const row=(await client.query(`
     SELECT version FROM session_reviews WHERE session_id=$1 FOR UPDATE`,[sessionId])).rows[0];
    if((row?.version||0)!==payload.version)validate.fail(409,'La revisión cambió en otra ventana. Actualiza antes de guardar.');
    if(row){
     result={review:(await client.query(`
      UPDATE session_reviews SET reviewer_id=$1,status=$2,observations=$3,version=version+1,updated_at=CURRENT_TIMESTAMP
      WHERE session_id=$4 RETURNING *`,[req.user.id,payload.status,payload.observations,sessionId])).rows[0]};
    }else{
     result={review:(await client.query(`
      INSERT INTO session_reviews(session_id,athlete_id,reviewer_id,status,observations)
      VALUES($1,$2,$3,$4,$5) RETURNING *`,[sessionId,session.athlete_id,req.user.id,payload.status,payload.observations])).rows[0]};
    }
   }
   await client.query('INSERT INTO collaboration_events(id,athlete_id,actor_id,kind,entity_id) VALUES($1,$2,$3,$4,$5)',
    [crypto.randomUUID(),session.athlete_id,req.user.id,isTask?'task.create':'session.review',isTask?result.task.id:String(sessionId)]);
   await client.query('INSERT INTO collaboration_receipts(actor_id,request_id,athlete_id,fingerprint,result) VALUES($1,$2,$3,$4,$5)',
    [req.user.id,body.requestId,session.athlete_id,fingerprint,JSON.stringify(result)]);
   await client.query('COMMIT');return res.status(isTask?201:200).json(result);
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }catch(error){
  return res.status(error.statusCode||500).json({error:error.statusCode?error.message:'No se pudo completar la revisión. Comprueba la migración 006 y la conexión.'});
 }
}
module.exports={handle};
