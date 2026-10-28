import {useEffect,useState} from 'react';
import {Building2,Plus,Send,Ticket,Users,ShieldCheck,RefreshCw} from 'lucide-react';
import {Layout,PageHeader} from '../components/UI.jsx';
import FeatureBanner from '../components/FeatureBanner.jsx';
import {clubRequest} from '../services/roster.js';
export default function Clubs(){
 const [data,setData]=useState({clubs:[],members:[]}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const [name,setName]=useState(''),[token,setToken]=useState(''),[email,setEmail]=useState(''),[selected,setSelected]=useState(''),[invitation,setInvitation]=useState(''),[notice,setNotice]=useState('');
 async function load(){const result=await clubRequest('/clubs');setData(result);}
 useEffect(()=>{let alive=true;clubRequest('/clubs').then(r=>{if(alive)setData(r);}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[]);
 async function run(path,method,body){
  if(busy)return;setBusy(true);setError('');setNotice('');
  try{const result=await clubRequest(path,method,body);await load();return result;}
  catch(e){setError(e.message);}finally{setBusy(false);}
 }
 const owned=data.clubs.filter(c=>c.ownerId===data.userId);
 return <Layout><div className="feature-page feature-clubs">
 <PageHeader eyebrow="EQUIPO Y PERTENENCIA" title="Mis clubes"
 description="Organiza tu equipo y comparte el seguimiento con otros entrenadores."
 action={<button type="button" className="secondary-button" disabled={busy} onClick={()=>load().catch(e=>setError(e.message))}><RefreshCw size={16}/>Actualizar</button>}/>
 <FeatureBanner icon={Building2} title="Un equipo conectado, con roles claros"
 description="Consulta los atletas del club y conserva la edición exclusiva de tus propias fichas."
 stats={[{label:'Mis clubes',value:loading?'—':data.clubs.length},{label:'A mi cargo',value:loading?'—':owned.length},{label:'Miembros administrados',value:loading?'—':data.members.length}]}/>
 {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 <section className="panel-card"><h2 className="feature-title"><Users size={21}/>Clubes a los que pertenezco</h2>
 {loading?<p role="status">Cargando tus clubes…</p>:!data.clubs.length?<div className="feature-empty">Aún no perteneces a un club. Puedes crear uno o aceptar la invitación de su responsable.</div>:
 <div className="feature-club-list">{data.clubs.map(c=><article key={c.id} className="feature-club-card">
  <header><div className="feature-club-avatar">{c.name.slice(0,2).toUpperCase()}</div><div><h3>{c.name}</h3><span className="feature-pill"><ShieldCheck size={12}/>{c.ownerId===data.userId?'Responsable del club':'Entrenador miembro'}</span></div></header>
  {c.ownerId===data.userId&&<ul className="feature-member-list">{data.members.filter(m=>m.clubId===c.id).map(m=><li key={m.id}>
   <div><strong>{m.name}</strong><small>{m.email}</small></div>
   {m.id!==data.userId&&<button className="feature-remove" disabled={busy} type="button" onClick={async()=>{if(await run('/clubs/'+c.id+'/members/'+m.id,'DELETE'))setNotice('Membresía retirada.');}}>Retirar acceso</button>}
  </li>)}</ul>}
 </article>)}</div>}
 </section>
 <div className="feature-club-layout">
 <form className="panel-card" onSubmit={async e=>{e.preventDefault();if(await run('/clubs','POST',{name})){setName('');setNotice('Club creado. Ya puedes invitar a sus entrenadores.');}}}>
  <h2 className="feature-title"><Plus size={21}/>Crear un club</h2>
  <p>Registra un espacio compartido para tu equipo.</p>
  <label className="form-field"><span>Nombre del club</span><input required maxLength={120} disabled={busy} placeholder="Ej. Club Atlético Temuco" value={name} onChange={e=>setName(e.target.value)}/></label>
  <button className="primary-button" disabled={busy}>Crear club</button>
  <p>Crear otro club con el mismo nombre no concede acceso al original.</p>
 </form>
 <form className="panel-card" onSubmit={async e=>{e.preventDefault();if(await run('/clubs/join','POST',{token:token.trim()})){setToken('');setNotice('Invitación aceptada.');}}}>
  <h2 className="feature-title"><Ticket size={21}/>Aceptar invitación</h2>
  <p>El responsable debe generar la invitación para el correo de tu cuenta.</p>
  <label className="form-field"><span>Código de invitación</span><input required disabled={busy} placeholder="Pega el código recibido" value={token} onChange={e=>setToken(e.target.value)}/></label>
  <button className="primary-button" disabled={busy}>Unirme al club</button>
 </form>
 {owned.length>0&&<form className="panel-card" onSubmit={async e=>{e.preventDefault();setInvitation('');const r=await run('/clubs/'+selected+'/invitations','POST',{email});if(r)setInvitation(r.token);}}>
  <h2 className="feature-title"><Send size={21}/>Invitar a un entrenador</h2>
  <p>Las invitaciones duran 24 horas y solo sirven para su destinatario.</p>
  <label className="form-field"><span>Club que administras</span><select required disabled={busy} value={selected} onChange={e=>{setSelected(e.target.value);setInvitation('');}}>
   <option value="">Seleccionar club</option>{owned.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
  </select></label>
  <label className="form-field"><span>Correo de la cuenta del entrenador</span><input required disabled={busy} type="email" maxLength={150} placeholder="entrenador@ejemplo.cl" value={email} onChange={e=>{setEmail(e.target.value);setInvitation('');}}/></label>
  <button className="primary-button" disabled={busy||!selected}>Generar invitación</button>
  {invitation&&<div role="status" className="feature-invite-code"><p>Entrega este código al destinatario:</p><code>{invitation}</code></div>}
 </form>}
 </div>
 </div></Layout>;
}
