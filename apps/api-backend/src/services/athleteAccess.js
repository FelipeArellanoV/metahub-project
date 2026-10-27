const repo = require('../db/repository');
const { getPool } = require('../db/pgClient');
const { computeProgress } = require('./progress');

function reject(statusCode, message) {
 const err = new Error(message); err.statusCode = statusCode; throw err;
}
function positiveId(value) {
 const n=Number(value);
 if (!Number.isSafeInteger(n) || n<1) reject(400,'Identificador inválido.');
 return n;
}
function coach(user) {
 if (!user || user.role!=='entrenador') reject(403,'Se requiere perfil de entrenador.');
}
// La relación de club se consulta en BD en cada petición: nunca desde localStorage o el JWT.
const scope = `(a.trainer_id=$1 OR EXISTS (
 SELECT 1 FROM club_memberships viewer
 JOIN club_memberships owner ON owner.club_id=viewer.club_id
 WHERE viewer.user_id=$1 AND owner.user_id=a.trainer_id
))`;
async function list(user) {
 coach(user);
 const pool=getPool();
 if (!pool) return (await repo.getAthletesByTrainer(user.id)).map(a=>({...a,canEdit:true,access:'own'}));
 const result=await pool.query(`
 SELECT a.id,a.name,a.age,a.birth_date AS "birthDate",a.consent,
 a.organization_name AS "organizationName",a.trainer_id AS "trainerId",u.name AS "trainerName",
 (a.trainer_id=$1) AS "canEdit",
 CASE WHEN a.trainer_id=$1 THEN 'own' ELSE 'club' END AS access,
 (SELECT count(*)::int FROM sessions s WHERE s.athlete_id=a.id) AS "sessionCount",
 (SELECT s.ipt_score FROM sessions s WHERE s.athlete_id=a.id AND s.ipt_score IS NOT NULL ORDER BY s.session_date DESC,s.id DESC LIMIT 1) AS "lastIptScore"
 FROM athletes a JOIN users u ON u.id=a.trainer_id
 WHERE `+scope+` ORDER BY a.name,a.id`,[user.id]);
 return result.rows.map(a=>({...a,age:repo.formatAthlete(a).age}));
}
async function readable(user,id) {
 coach(user); id=positiveId(id);
 const pool=getPool();
 if (!pool) {
  const a=await repo.getAthleteByIdForTrainer(id,user.id);
  if(!a) reject(404,'Atleta no encontrado.');
  return {...a,canEdit:true,access:'own'};
 }
 const result=await pool.query(`
 SELECT a.id,a.name,a.age,a.birth_date AS "birthDate",a.consent,
 a.organization_name AS "organizationName",a.trainer_id AS "trainerId",u.name AS "trainerName",
 (a.trainer_id=$1) AS "canEdit",
 CASE WHEN a.trainer_id=$1 THEN 'own' ELSE 'club' END AS access
 FROM athletes a JOIN users u ON u.id=a.trainer_id
 WHERE a.id=$2 AND `+scope,[user.id,id]);
 if(!result.rows[0]) reject(404,'Atleta no disponible para tu perfil.');
 return result.rows[0];
}
async function detail(user,id) {
 const athlete=await readable(user,id);
 const pool=getPool();
 let sessions;
 if(pool) {
  // Revalidar alcance en la propia consulta de sesiones.
  sessions=(await pool.query(`
   SELECT s.id,s.athlete_id AS "athleteId",s.session_date AS "sessionDate",
   s.video_url AS "videoUrl",s.notes,s.ipt_score AS "iptScore",s.analysis
   FROM sessions s JOIN athletes a ON a.id=s.athlete_id
   WHERE a.id=$2 AND `+scope+` ORDER BY s.session_date DESC,s.id DESC`,[user.id,athlete.id])).rows;
 } else sessions=await repo.getSessionsForAthlete(athlete.id);
 return {athlete,sessions,progress:computeProgress(sessions,sessions.find(s=>s.analysis)?.analysis || null)};
}
module.exports={list,readable,detail,positiveId,reject,coach};
