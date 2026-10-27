import {useEffect,useState} from 'react';
import {clubRequest} from '../services/roster.js';
export default function OrganizationProfile(){
 const [name,setName]=useState(''),[error,setError]=useState(''),[saved,setSaved]=useState(false),[busy,setBusy]=useState(false);
 let coach=false;try{coach=JSON.parse(localStorage.getItem('metahub_user')||'{}').role==='entrenador';}catch{}
 useEffect(()=>{clubRequest('/organization').then(r=>setName(r.organizationName)).catch(e=>setError(e.message));},[]);
 if(!coach)return null;
 return <form className="panel-card" style={{marginBottom:20}} onSubmit={async e=>{
  e.preventDefault();setBusy(true);setSaved(false);setError('');
  try{await clubRequest('/organization','PUT',{organizationName:name});setSaved(true);}
  catch(err){setError(err.message);}finally{setBusy(false);}
 }}>
 <h2>Mi club o establecimiento</h2>
 <label className="form-field"><span>Nombre</span><input required maxLength={160} value={name} onChange={e=>{setName(e.target.value);setSaved(false);}}/></label>
 <p>Este dato no concede acceso a otros atletas. La membresía compartida se gestiona en Mis clubes.</p>
 <button className="primary-button" disabled={busy}>Guardar club o establecimiento</button>
 {saved&&<p role="status">Guardado en tu cuenta.</p>}{error&&<p role="alert">{error}</p>}
 </form>;
}
