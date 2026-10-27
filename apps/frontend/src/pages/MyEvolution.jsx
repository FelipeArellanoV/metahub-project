import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {Layout,PageHeader} from '../components/UI.jsx';
import api from '../services/api.js';
const date=v=>new Date(v).toLocaleString('es-CL');
const score=v=>v==null?'Sin análisis':v+' pts';
export default function MyEvolution(){
 const [portal,setPortal]=useState(null),[error,setError]=useState(''),[a,setA]=useState(''),[b,setB]=useState('');
 useEffect(()=>{
  let alive=true,timer;
  async function load(){
   try{
    const result=await api.portal.getMe();
    if(alive){setPortal(result);setError('');setA(v=>v||String(result.sessions.at(-1)?.id||''));setB(v=>v||String(result.sessions[0]?.id||''));}
   }catch(e){if(alive){setPortal(null);setError(e.message);}}
   if(alive)timer=setTimeout(load,15000);
  }
  load();return()=>{alive=false;clearTimeout(timer);};
 },[]);
 const sessions=portal?.sessions||[],first=sessions.find(s=>String(s.id)===a),last=sessions.find(s=>String(s.id)===b);
 const valid=first&&last&&a!==b&&first.iptScore!=null&&last.iptScore!=null;
 const delta=valid?last.iptScore-first.iptScore:null;
 return <Layout><PageHeader eyebrow="MI PROGRESO" title="Mi evolución"
 description="Compara únicamente las sesiones vinculadas a tu cuenta. Se actualiza cada 15 segundos."
 action={<Link className="primary-button" to="/upload">Subir video de una nueva sesión</Link>}/>
 {error&&<p role="alert">{error}</p>}
 {!portal&&!error&&<p role="status">Cargando tus sesiones…</p>}
 {portal&&<><section className="panel-card"><h2>{portal.athlete.name}</h2>
 <p>{sessions.length} sesiones registradas · Entrenador: {portal.athlete.trainerName||'Asignado en tu ficha'}</p>
 {sessions.length<2?<p>Necesitas al menos dos sesiones para comparar tu evolución.</p>:<>
 <label className="form-field"><span>Sesión inicial</span><select value={a} onChange={e=>setA(e.target.value)}>
 {sessions.map(s=><option key={s.id} value={s.id}>{date(s.sessionDate)} · #{s.id} · {score(s.iptScore)}</option>)}</select></label>
 <label className="form-field"><span>Sesión de control</span><select value={b} onChange={e=>setB(e.target.value)}>
 {sessions.map(s=><option key={s.id} value={s.id}>{date(s.sessionDate)} · #{s.id} · {score(s.iptScore)}</option>)}</select></label>
 <p>IPT inicial: {score(first?.iptScore)} · IPT de control: {score(last?.iptScore)}</p>
 {a===b?<p>Selecciona sesiones distintas.</p>:delta===null?<p>Ambas sesiones deben tener análisis para calcular la diferencia.</p>:
 <p>Diferencia: {delta>0?'+':''}{delta.toFixed(1)} puntos. {delta>0?'Tu IPT aumentó entre estas sesiones.':delta<0?'Tu IPT disminuyó entre estas sesiones.':'Tu IPT se mantuvo.'}</p>}
 {first&&last&&new Date(last.sessionDate)<new Date(first.sessionDate)&&<p>La sesión de control elegida es anterior a la inicial. Revisa el orden de comparación.</p>}
 </>}</section>
 <section className="panel-card" style={{marginTop:20}}><h2>Mi historial longitudinal</h2>
 {!sessions.length&&<p>Aún no hay sesiones.</p>}
 {sessions.map(s=><article key={s.id} style={{padding:12,borderBottom:'1px solid #dce5f0'}}>
 <strong>{date(s.sessionDate)}</strong><p>Sesión #{s.id} · IPT: {score(s.iptScore)}</p>
 <Link to={'/reviews?sessionId='+s.id}>Ver observación del entrenador y ejercicios</Link>
 {s.sectorPrioritario&&<p>Sector prioritario: {typeof s.sectorPrioritario==='string'?s.sectorPrioritario:JSON.stringify(s.sectorPrioritario)}</p>}
 </article>)}
 <p>Los resultados reflejan los análisis registrados. Revísalos con tu entrenador.</p></section></>}
 </Layout>;
}
