import {useEffect,useState} from 'react';
import {Layout,PageHeader} from '../components/UI.jsx';
import {clubRequest} from '../services/roster.js';
export default function Clubs(){
 const [data,setData]=useState({clubs:[],members:[]}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [name,setName]=useState(''),[token,setToken]=useState(''),[email,setEmail]=useState(''),[selected,setSelected]=useState(''),[invitation,setInvitation]=useState('');
 async function load(){const result=await clubRequest('/clubs');setData(result);}
 useEffect(()=>{load().catch(e=>setError(e.message));},[]);
 async function run(path,method,body){
  if(busy)return;setBusy(true);setError('');
  try{const result=await clubRequest(path,method,body);await load();return result;}
  catch(e){setError(e.message);}finally{setBusy(false);}
 }
 const owned=data.clubs.filter(c=>c.ownerId===data.userId);
 return <Layout><PageHeader eyebrow="MEMBRESÍA VERIFICADA" title="Mis clubes"
 description="Compartir club permite consultar atletas del resto de entrenadores. Cada entrenador mantiene la edición exclusiva de sus atletas."/>
 {error&&<p role="alert">{error}</p>}
 <section className="panel-card"><h2>Clubes a los que pertenezco</h2>
 {!data.clubs.length&&<p>No perteneces a ningún club. Solo puedes consultar tus atletas.</p>}
 {data.clubs.map(c=><div key={c.id}><h3>{c.name}{c.ownerId===data.userId?' · Responsable':''}</h3>
 {c.ownerId===data.userId&&<ul>{data.members.filter(m=>m.clubId===c.id).map(m=><li key={m.id}>{m.name} · {m.email}
 {m.id!==data.userId&&<button disabled={busy} type="button" onClick={()=>run('/clubs/'+c.id+'/members/'+m.id,'DELETE')}>Retirar acceso</button>}</li>)}</ul>}</div>)}</section>
 <form className="panel-card" style={{marginTop:20}} onSubmit={async e=>{e.preventDefault();if(await run('/clubs','POST',{name}))setName('');}}>
 <h2>Crear un club</h2><label className="form-field"><span>Nombre</span><input required maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label>
 <p>Crear otro club con el mismo nombre no concede acceso al club original.</p><button className="primary-button" disabled={busy}>Crear club</button></form>
 {owned.length>0&&<form className="panel-card" style={{marginTop:20}} onSubmit={async e=>{e.preventDefault();setInvitation('');const r=await run('/clubs/'+selected+'/invitations','POST',{email});if(r)setInvitation(r.token);}}>
 <h2>Invitar a un entrenador</h2>
 <label className="form-field"><span>Club que administras</span><select required value={selected} onChange={e=>{setSelected(e.target.value);setInvitation('');}}><option value="">Seleccionar club</option>{owned.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
 <label className="form-field"><span>Correo de su cuenta</span><input required type="email" maxLength={150} value={email} onChange={e=>{setEmail(e.target.value);setInvitation('');}}/></label>
 <button className="primary-button" disabled={busy||!selected}>Generar invitación</button>
 {invitation&&<div role="status"><p>Entrega este código al destinatario. Caduca en 24 horas y solo puede usarlo la cuenta con ese correo.</p><code style={{overflowWrap:'anywhere'}}>{invitation}</code></div>}</form>}
 <form className="panel-card" style={{marginTop:20}} onSubmit={async e=>{e.preventDefault();if(await run('/clubs/join','POST',{token:token.trim()}))setToken('');}}>
 <h2>Aceptar invitación</h2><label className="form-field"><span>Código entregado por el responsable</span><input required value={token} onChange={e=>setToken(e.target.value)}/></label>
 <button className="primary-button" disabled={busy}>Unirme al club</button></form>
 </Layout>;
}
