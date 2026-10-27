const crypto=require('crypto');
const {getPool}=require('../db/pgClient');
const access=require('../services/athleteAccess');
const hash=token=>crypto.createHash('sha256').update(token).digest('hex');
const requiredPool=()=>{const p=getPool();if(!p)access.reject(503,'Los clubes requieren PostgreSQL.');return p;};
async function handle(req,res) {
 res.setHeader('Cache-Control','no-store');
 try {
  access.coach(req.user);
  const url=new URL(req.url,'http://localhost');
  const body=req.body||{};
  if(req.method==='GET' && url.pathname==='/api/roster')
   return res.json({athletes:await access.list(req.user)});
  const roster=url.pathname.match(/^\/api\/roster\/(\d+)$/);
  if(req.method==='GET' && roster) return res.json(await access.detail(req.user,roster[1]));
  const pool=requiredPool();
  if(req.method==='GET' && url.pathname==='/api/clubs') {
   const clubs=(await pool.query(`
    SELECT c.id,c.name,c.owner_id AS "ownerId"
    FROM clubs c JOIN club_memberships m ON m.club_id=c.id WHERE m.user_id=$1 ORDER BY c.name`,[req.user.id])).rows;
   const members=(await pool.query(`
    SELECT m.club_id AS "clubId",u.id,u.name,u.email
    FROM club_memberships m JOIN users u ON u.id=m.user_id
    JOIN clubs c ON c.id=m.club_id WHERE c.owner_id=$1 ORDER BY u.name`,[req.user.id])).rows;
   return res.json({clubs,members,userId:req.user.id});
  }
  if(req.method==='POST' && url.pathname==='/api/clubs') {
   if(typeof body.name!=='string'||!body.name.trim()||body.name.length>120) access.reject(400,'Nombre de club requerido (máximo 120 caracteres).');
   const client=await pool.connect();
   try {
    await client.query('BEGIN');
    const club=(await client.query('INSERT INTO clubs(name,owner_id) VALUES($1,$2) RETURNING id,name,owner_id AS "ownerId"',[body.name.trim(),req.user.id])).rows[0];
    await client.query('INSERT INTO club_memberships(club_id,user_id) VALUES($1,$2)',[club.id,req.user.id]);
    await client.query('COMMIT');
    return res.status(201).json({club});
   } catch(err) {await client.query('ROLLBACK');throw err;} finally{client.release();}
  }
  const invite=url.pathname.match(/^\/api\/clubs\/(\d+)\/invitations$/);
  if(req.method==='POST' && invite) {
   if(typeof body.email!=='string'||body.email.length>150||!body.email.includes('@')) access.reject(400,'Correo del entrenador requerido.');
   const token=crypto.randomBytes(24).toString('hex');
   const result=await pool.query(`
    INSERT INTO club_invitations(token_hash,club_id,email,expires_at)
    SELECT $1,c.id,$2,CURRENT_TIMESTAMP+INTERVAL '24 hours'
    FROM clubs c WHERE c.id=$3 AND c.owner_id=$4 RETURNING expires_at AS "expiresAt"`,
    [hash(token),body.email.trim().toLowerCase(),access.positiveId(invite[1]),req.user.id]);
   if(!result.rows[0]) access.reject(403,'Solo el responsable del club puede invitar.');
   return res.status(201).json({token,expiresAt:result.rows[0].expiresAt});
  }
  if(req.method==='POST' && url.pathname==='/api/clubs/join') {
   if(typeof body.token!=='string'||!/^[a-f0-9]{48}$/.test(body.token)) access.reject(400,'Invitación inválida.');
   const client=await pool.connect();
   try {
    await client.query('BEGIN');
    const invitation=(await client.query(`
     SELECT i.club_id FROM club_invitations i JOIN users u ON lower(u.email)=i.email
     WHERE i.token_hash=$1 AND u.id=$2 AND u.role='entrenador'
     AND i.consumed_at IS NULL AND i.expires_at>CURRENT_TIMESTAMP FOR UPDATE OF i`,
     [hash(body.token),req.user.id])).rows[0];
    if(!invitation) access.reject(403,'Invitación expirada, utilizada o destinada a otro correo.');
    await client.query('INSERT INTO club_memberships(club_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[invitation.club_id,req.user.id]);
    await client.query('UPDATE club_invitations SET consumed_at=CURRENT_TIMESTAMP WHERE token_hash=$1',[hash(body.token)]);
    await client.query('COMMIT');
    return res.json({joined:true});
   }catch(err){await client.query('ROLLBACK');throw err;}finally{client.release();}
  }
  const revoke=url.pathname.match(/^\/api\/clubs\/(\d+)\/members\/(\d+)$/);
  if(req.method==='DELETE'&&revoke) {
   const clubId=access.positiveId(revoke[1]),memberId=access.positiveId(revoke[2]);
   if(memberId===Number(req.user.id))access.reject(400,'El responsable no puede eliminarse a sí mismo.');
   const client=await pool.connect();
   try{
    await client.query('BEGIN');
    const club=(await client.query('SELECT id FROM clubs WHERE id=$1 AND owner_id=$2 FOR UPDATE',[clubId,req.user.id])).rows[0];
    if(!club)access.reject(403,'Solo el responsable puede retirar miembros.');
    // Invalidar invitaciones pendientes al retirar al miembro.
    await client.query('DELETE FROM club_invitations WHERE club_id=$1 AND email=(SELECT lower(email) FROM users WHERE id=$2)',[clubId,memberId]);
    await client.query('DELETE FROM club_memberships WHERE club_id=$1 AND user_id=$2',[clubId,memberId]);
    await client.query('COMMIT');return res.json({removed:true});
   }catch(err){await client.query('ROLLBACK');throw err;}finally{client.release();}
  }
  return res.status(404).json({error:'Ruta no encontrada.'});
 }catch(err){
  if(!err.statusCode) console.error('club/roster:',err.code||err.message);
  return res.status(err.statusCode||500).json({error:err.statusCode?err.message:'No se pudieron consultar los datos. Revisa la migración 004 y la conexión.'});
 }
}
module.exports={handle};
