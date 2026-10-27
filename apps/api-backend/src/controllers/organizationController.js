const repo=require('../db/repository');
const {getPool}=require('../db/pgClient');
async function handle(req,res){
 res.setHeader('Cache-Control','no-store');
 try{
  if(!['entrenador','atleta'].includes(req.user.role))return res.status(403).json({error:'Perfil no autorizado.'});
  if(req.method==='GET'){
   const user=await repo.findUserById(req.user.id);
   if(!user)return res.status(404).json({error:'Cuenta no disponible.'});
   return res.json({organizationName:user.organizationName||''});
  }
  if(req.method==='PUT'){
   const name=req.body?.organizationName;
   if(typeof name!=='string'||!name.trim()||name.length>160)return res.status(400).json({error:'Indica un club o establecimiento de hasta 160 caracteres.'});
   if(req.user.role!=='entrenador')return res.status(403).json({error:'La ficha del atleta la mantiene su entrenador.'});
   const pool=getPool();
   if(pool)await pool.query('UPDATE users SET organization_name=$1 WHERE id=$2',[name.trim(),req.user.id]);
   else {const user=repo.users.find(u=>u.id===Number(req.user.id));if(!user)return res.status(404).json({error:'Cuenta no disponible.'});user.organizationName=name.trim();}
   return res.json({organizationName:name.trim()});
  }
  return res.status(405).json({error:'Método no permitido.'});
 }catch(err){return res.status(500).json({error:'No se pudo guardar el establecimiento. Comprueba la migración 005.'});}
}
module.exports={handle};
