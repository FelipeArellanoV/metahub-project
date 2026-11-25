import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {Layout,PageHeader} from '../components/UI.jsx';
import api from '../services/api.js';
import {SkeletonList,cardVariants,listItemVariants,motion} from '../components/Motion.jsx';
import {EvolucionIpt} from '../components/GraficosIpt.jsx';
import {serieEvolucion} from '../services/informeIpt.js';
import {compararProgreso,resumenPersonal} from '../services/progresoPersonal.js';
import {Activity,CalendarDays,CheckCircle2,TrendingUp} from 'lucide-react';
const date=v=>new Date(v).toLocaleString('es-CL');
const score=v=>v==null?'Sin análisis':v+' pts';
export default function MyEvolution(){
 const [portal,setPortal]=useState(null),[error,setError]=useState(''),[a,setA]=useState(''),[b,setB]=useState(''),[filtro,setFiltro]=useState('todas');
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
 const resumen=resumenPersonal(sessions),comparacion=compararProgreso(first,last);
 const visibles=sessions.filter(s=>filtro==='todas'||(filtro==='analizadas'?s.analizada:!s.analizada));
 return <Layout><PageHeader eyebrow="MI PROGRESO" title="Evolución"
 description="Compara únicamente las sesiones vinculadas a tu cuenta. Se actualiza cada 15 segundos."
 action={<Link className="primary-button" to="/upload">Subir video de una nueva sesión</Link>}/>
 {error&&<p role="alert">{error}</p>}
 {!portal&&!error&&<div className="panel-card"><SkeletonList rows={3} label="Cargando tus sesiones…"/></div>}
 {portal&&<><section className="progreso-resumen" aria-label="Resumen de tu progreso">
 <div><CalendarDays aria-hidden="true"/><span>Sesiones registradas</span><strong>{resumen.total}</strong><small>En tu historial</small></div>
 <div><CheckCircle2 aria-hidden="true"/><span>Sesiones analizadas</span><strong>{resumen.analizadas}</strong><small>Con análisis disponible</small></div>
 <div><Activity aria-hidden="true"/><span>Último IPT</span><strong>{resumen.ultima?.iptScore??'—'}</strong><small>{resumen.ultima?date(resumen.ultima.sessionDate):'Aún sin puntaje'}</small></div>
 </section><motion.section variants={cardVariants} className="panel-card ipt-panel" style={{marginTop:0,marginBottom:20}} aria-labelledby="mh-evo-chart">
 <div className="ipt-panel-head"><div><span className="eyebrow">TU IPT EN EL TIEMPO</span><h2 id="mh-evo-chart">Evolución</h2>
 <p>Cada punto es una sesión; la línea vertical muestra cuánto varió entre tus pasos (IC 95 %).</p></div>
 {sessions.some(s=>s.analizada)&&<Link className="secondary-button ipt-report-link" to="/informe">Informe PDF</Link>}</div>
 <EvolucionIpt {...serieEvolucion(sessions)}/>
 </motion.section>
 <motion.section variants={cardVariants} className="panel-card progreso-comparacion"><span className="eyebrow">COMPARA TUS SESIONES</span><h2>Tu progreso, paso a paso</h2>
 <p>Elige dos sesiones de {portal.athlete.name} para ver la diferencia entre sus puntajes. Entrenador: {portal.athlete.trainerName||'Asignado en tu ficha'}.</p>
 {sessions.length<2?<p>Necesitas al menos dos sesiones para comparar tu evolución.</p>:<>
 <div className="progreso-selectores">
 <label className="form-field"><span>Sesión inicial</span><select value={a} onChange={e=>setA(e.target.value)}>
 {sessions.map(s=><option key={s.id} value={s.id}>{date(s.sessionDate)} · #{s.id} · {score(s.iptScore)}</option>)}</select></label>
 <label className="form-field"><span>Sesión de control</span><select value={b} onChange={e=>setB(e.target.value)}>
 {sessions.map(s=><option key={s.id} value={s.id}>{date(s.sessionDate)} · #{s.id} · {score(s.iptScore)}</option>)}</select></label></div>
 {comparacion.estado==='comparable'?<div className="progreso-resultado" aria-live="polite">
 <div><span>Sesión inicial</span><strong>{comparacion.inicial}</strong><small>puntos IPT</small></div>
 <div className="progreso-flecha" aria-hidden="true">→</div>
 <div><span>Sesión de control</span><strong>{comparacion.control}</strong><small>puntos IPT</small></div>
 <div className="progreso-diferencia"><TrendingUp aria-hidden="true"/><span>Diferencia</span><strong>{comparacion.delta>0?'+':''}{comparacion.delta.toLocaleString('es-CL')} pts</strong><small>Variación descriptiva, no confirma por sí sola un cambio técnico.</small></div>
 </div>:<p className="progreso-aviso" role="status">{comparacion.estado==='seleccion'?'Selecciona sesiones distintas.':comparacion.estado==='sin_analisis'?'Ambas sesiones necesitan un puntaje IPT.':comparacion.estado==='version_distinta'?'Estas sesiones usan versiones distintas del IPT y sus puntajes no se pueden comparar.':'No se conoce la versión del IPT de ambas sesiones; no es posible compararlas.'}</p>}
 {first&&last&&new Date(last.sessionDate)<new Date(first.sessionDate)&&<p>La sesión de control elegida es anterior a la inicial. Revisa el orden de comparación.</p>}
 </>}</motion.section>
 <motion.section variants={cardVariants} className="panel-card progreso-historial" style={{marginTop:20}}><div className="progreso-historial-head"><div><span className="eyebrow">TU RECORRIDO</span><h2>Mi historial longitudinal</h2><p>Consulta tus sesiones y las observaciones de tu entrenador.</p></div>
 <label className="form-field"><span>Mostrar sesiones</span><select value={filtro} onChange={e=>setFiltro(e.target.value)}><option value="todas">Todas</option><option value="analizadas">Con análisis</option><option value="pendientes">Sin análisis</option></select></label></div>
 {!sessions.length&&<p>Aún no hay sesiones.</p>}
 {sessions.length>0&&!visibles.length&&<p>No hay sesiones para este filtro.</p>}
 {visibles.map((s,i)=><motion.article key={s.id} custom={i} variants={listItemVariants} initial="initial" animate="animate" className="progreso-sesion">
 <div><strong>{date(s.sessionDate)}</strong><p>Sesión #{s.id} · IPT: {score(s.iptScore)}</p></div><span className={'progreso-estado '+(s.analizada?'analizada':'pendiente')}>{s.analizada?'Analizada':'Sin análisis'}</span><div className="progreso-enlaces">
 <Link to={'/reviews?sessionId='+s.id}>Ver observación del entrenador y ejercicios</Link>
 {s.analizada&&<> · <Link to={'/informe?sessionId='+s.id}>Informe PDF</Link></>}
 {s.sectorPrioritario&&<p>Sector prioritario: {typeof s.sectorPrioritario==='string'?s.sectorPrioritario:JSON.stringify(s.sectorPrioritario)}</p>}
 </div></motion.article>)}
 <p>Los resultados reflejan los análisis registrados. Revísalos con tu entrenador.</p></motion.section></>}
 </Layout>;
}
