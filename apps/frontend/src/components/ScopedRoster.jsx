import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {Layout,PageHeader} from './UI.jsx';
import SessionVideo from './SessionVideo.jsx';
import {clubRequest} from '../services/roster.js';

const titles={home:'Inicio',compare:'Comparación de sesiones',priority:'Prioridad de apoyo',reports:'Ficha de progreso',sessions:'Sesiones',club:'Atletas del club'};
const date=v=>new Date(v).toLocaleString('es-CL');
const score=v=>v==null?'Sin análisis':v+' pts';
function readable(value){return typeof value==='string'?value:JSON.stringify(value,null,2);}
export default function ScopedRoster({mode='home',embedded=false,clubOnly=false}) {
 const [athletes,setAthletes]=useState([]);
 const [id,setId]=useState('');
 const [detail,setDetail]=useState(null);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 const [sessionA,setA]=useState(''),[sessionB,setB]=useState('');
 const [revision,setRevision]=useState(0);
 useEffect(()=>{
  const abort=new AbortController();setError('');setLoading(true);setDetail(null);setAthletes([]);setId('');
  clubRequest('/roster','GET',undefined,abort.signal).then(data=>{
   const rows=clubOnly?data.athletes.filter(a=>!a.canEdit):data.athletes;
   if(mode==='priority')rows.sort((a,b)=>(a.lastIptScore??101)-(b.lastIptScore??101));
   setAthletes(rows);setId(rows[0]?String(rows[0].id):'');
  }).catch(err=>{if(err.name!=='AbortError')setError(err.message);})
   .finally(()=>{if(!abort.signal.aborted)setLoading(false);});
  return ()=>abort.abort();
 },[revision,clubOnly,mode]);
 useEffect(()=>{
  setDetail(null);setA('');setB('');if(!id)return;
  const abort=new AbortController();setError('');
  clubRequest('/roster/'+encodeURIComponent(id),'GET',undefined,abort.signal).then(data=>{
   setDetail(data);
   setA(data.sessions.length?String(data.sessions[data.sessions.length-1].id):'');
   setB(data.sessions.length?String(data.sessions[0].id):'');
  }).catch(err=>{if(err.name!=='AbortError')setError(err.message);});
  return ()=>abort.abort();
 },[id]);
 const current=detail?.athlete.id===Number(id)?detail:null;
 const sessions=current?.sessions||[];
 const first=sessions.find(s=>String(s.id)===sessionA),last=sessions.find(s=>String(s.id)===sessionB);
 const content=<div style={{display:'grid',gap:20}}>
  {!embedded&&<PageHeader eyebrow="DATOS AUTORIZADOS" title={titles[mode]}
   description="Tus atletas y los de entrenadores con membresía compartida en un club. Los del club son de solo lectura."
   action={<button type="button" className="secondary-button" onClick={()=>setRevision(r=>r+1)}>Actualizar</button>}/>}
  {embedded&&<h2>Atletas de otros entrenadores de mis clubes · solo lectura</h2>}
  {error&&<p role="alert">{error}</p>}
  {loading&&<p role="status">Consultando atletas autorizados…</p>}
  {!loading&&!error&&!athletes.length&&<p>No hay atletas disponibles en este ámbito.</p>}
  {!loading&&!error&&athletes.length>0&&<>
   <section className="panel-card">
    {mode==='home'&&<p>{athletes.filter(a=>a.canEdit).length} atletas propios · {athletes.filter(a=>!a.canEdit).length} del club · {athletes.reduce((n,a)=>n+(a.sessionCount||0),0)} sesiones visibles</p>}
    <label className="form-field"><span>Atleta</span><select value={id} onChange={e=>setId(e.target.value)}>
     {athletes.map(a=><option key={a.id} value={a.id}>{a.name} — {a.canEdit?'A mi cargo':'Club · solo lectura'}</option>)}
    </select></label>
    {mode==='priority'&&<><p>Orden por último IPT disponible, de menor a mayor. Sin IPT no se infiere prioridad.</p>
     <ul>{athletes.map(a=><li key={a.id}><button type="button" className="text-button" onClick={()=>setId(String(a.id))}>{a.name}: {score(a.lastIptScore)}</button></li>)}</ul></>}
   </section>
   {!current&&!error&&<p role="status">Cargando ficha…</p>}
   {current&&<>
    <section className="panel-card">
     <h2>{current.athlete.name}</h2>
     <p>Club o establecimiento: {current.athlete.organizationName || 'Sin registrar'}</p>
     <p>Entrenador responsable: {current.athlete.trainerName||'Tu cuenta'} · {current.athlete.canEdit?'A tu cargo':'Compartido por club: solo lectura'}</p>
     <p>Edad: {current.athlete.age??'Sin registrar'} · Consentimiento: {current.athlete.consent?'Registrado':'Pendiente'}</p>
     <p>{sessions.length} sesiones registradas · Último IPT: {score(sessions.find(s=>s.iptScore!=null)?.iptScore)}</p>
     {current.athlete.canEdit&&<Link to="/capture" className="secondary-button">Registrar captura propia</Link>}
     <Link to="/collaboration" className="secondary-button">Ver seguimiento compartido</Link>
    </section>
    {mode==='compare'&&<section className="panel-card">
     <h2>Comparar dos sesiones reales</h2>
     {sessions.length<2?<p>Se requieren al menos dos sesiones para comparar.</p>:<>
      <label className="form-field"><span>Sesión inicial</span><select value={sessionA} onChange={e=>setA(e.target.value)}>{sessions.map(s=><option key={s.id} value={s.id}>{date(s.sessionDate)} · #{s.id}</option>)}</select></label>
      <label className="form-field"><span>Sesión de control</span><select value={sessionB} onChange={e=>setB(e.target.value)}>{sessions.map(s=><option key={s.id} value={s.id}>{date(s.sessionDate)} · #{s.id}</option>)}</select></label>
      <p>IPT inicial: {score(first?.iptScore)} · IPT de control: {score(last?.iptScore)}</p>
      {sessionA===sessionB?<p>Selecciona sesiones distintas.</p>:first?.iptScore!=null&&last?.iptScore!=null&&<p>Diferencia: {(last.iptScore-first.iptScore).toFixed(1)} puntos.</p>}
      <p>Solo se muestran mediciones registradas. No se simulan videos, ángulos ni resultados.</p>
     </>}
    </section>}
    <section className="panel-card">
     <h2>Historial autorizado</h2>
     {!sessions.length&&<p>Sin sesiones registradas.</p>}
     {sessions.map(s=><details key={s.id} style={{padding:12,borderBottom:'1px solid #dce5f0'}}>
      <summary>{date(s.sessionDate)} · #{s.id} · IPT {score(s.iptScore)}</summary>
      {s.videoUrl?.startsWith('/api/videos/') && <SessionVideo sessionId={s.id} />}
      <Link className="secondary-button" to={'/reviews?athleteId='+current.athlete.id+'&sessionId='+s.id}>Ver revisión y ejercicios de esta sesión</Link>
      {s.notes&&<p style={{whiteSpace:'pre-wrap'}}>{s.notes}</p>}
      {s.analysis?.diagnostico&&<p style={{whiteSpace:'pre-wrap'}}>{readable(s.analysis.diagnostico)}</p>}
      {s.analysis?.sector_prioritario&&<p>Sector prioritario: {readable(s.analysis.sector_prioritario)}</p>}
      {s.analysis&&<details><summary>Datos del análisis registrado</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(s.analysis,null,2)}</pre></details>}
     </details>)}
    </section>
   </>}
  </>}
 </div>;
 return embedded?content:<Layout>{content}</Layout>;
}
