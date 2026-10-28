import {useCallback,useEffect,useRef,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {Layout,PageHeader} from '../components/UI.jsx';
import {ClipboardCheck} from 'lucide-react';
import FeatureBanner from '../components/FeatureBanner.jsx';
import {clubRequest} from '../services/roster.js';
const labels={pending:'Pendiente de revisión',reviewed:'Revisada',requires_new_video:'Solicita nueva captura'};
const date=v=>new Date(v).toLocaleString('es-CL');
function ReviewCard({session,tasks,canEdit,onReload}){
 const [status,setStatus]=useState(session.reviewStatus),[notes,setNotes]=useState(session.observations);
 const [title,setTitle]=useState(''),[details,setDetails]=useState(''),[due,setDue]=useState('');
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const [draftVersion,setDraftVersion]=useState(session.reviewVersion);
 const dirty=useRef(false);
 const receipts=useRef(new Map()),working=useRef(false);
 useEffect(()=>{
  if(!dirty.current){setStatus(session.reviewStatus);setNotes(session.observations);setDraftVersion(session.reviewVersion);}
 },[session.id,session.reviewVersion,session.reviewStatus,session.observations]);
 async function save(isTask){
  if(working.current)return false;working.current=true;setBusy(true);setError('');setNotice('');
  try{
   const body=isTask?{title,details,...(due?{dueAt:new Date(due).toISOString()}:{})}:
    {status,observations:notes,version:draftVersion};
   const signature=JSON.stringify({isTask,body});
   if(!receipts.current.has(signature))receipts.current.set(signature,crypto.randomUUID());
   await clubRequest('/reviews/'+session.id+(isTask?'/tasks':''),isTask?'POST':'PUT',{...body,requestId:receipts.current.get(signature)});
   receipts.current.delete(signature);
   if(!isTask)dirty.current=false;
   setNotice(isTask?'Ejercicio vinculado y guardado.':'Revisión guardada y visible para el alumno.');
   if(isTask){setTitle('');setDetails('');setDue('');}
   await onReload();return true;
  }catch(e){setError(e.message);return false;}finally{working.current=false;setBusy(false);}
 }
 const exercises=session.analysis?.prescripcion_completa?.ejercicios||[];
 return <article className="panel-card feature-review-card">
  <h2>Sesión #{session.id} · {date(session.sessionDate)}</h2>
  <div className="feature-session-meta"><span className="feature-pill">IPT: {session.iptScore==null?'Sin análisis':session.iptScore+' puntos'}</span><span className={'feature-pill '+session.reviewStatus}>{labels[session.reviewStatus]}</span></div>
  {session.reviewedAt&&<p>Última revisión: {date(session.reviewedAt)}</p>}
  {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  {canEdit?<form onSubmit={e=>{e.preventDefault();save(false);}}>
   <label className="form-field"><span>Estado de revisión</span><select disabled={busy} value={status} onChange={e=>{dirty.current=true;setStatus(e.target.value);}}>
    {Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}
   </select></label>
   <label className="form-field"><span>Observaciones para el alumno</span><textarea disabled={busy} required={status!=='pending'} maxLength={3000} value={notes} onChange={e=>{dirty.current=true;setNotes(e.target.value);}} style={{minHeight:100}}/></label>
   {draftVersion!==session.reviewVersion && <p role="alert">La revisión cambió en otra ventana. Tus observaciones sin guardar se conservan; carga la revisión actual antes de volver a guardar.</p>}
   <button disabled={busy} className="primary-button">Guardar revisión</button>
   <button type="button" disabled={busy} onClick={()=>{
    dirty.current=false;setStatus(session.reviewStatus);setNotes(session.observations);setDraftVersion(session.reviewVersion);setError('');
   }}>Cargar revisión actual (descarta el borrador)</button>
  </form>:<><h3>Observación del entrenador</h3><p style={{whiteSpace:'pre-wrap'}}>{session.observations||'Sin observaciones publicadas.'}</p></>}
  <h3>Ejercicios vinculados a esta sesión</h3>
  {!tasks.length&&<p>Aún no hay ejercicios vinculados.</p>}
  <p>{tasks.filter(t=>t.done).length} completados de {tasks.length} asignados.</p>
  <ul className="feature-linked-tasks">{tasks.map(t=><li key={t.id}><strong>{t.title}</strong> · {t.done?'Completado':'Pendiente'}
   <p style={{whiteSpace:'pre-wrap'}}>{t.details}</p>{t.dueAt&&<p>Fecha objetivo: {date(t.dueAt)}</p>}</li>)}</ul>
  {canEdit&&<form onSubmit={e=>{e.preventDefault();save(true);}}>
   {Array.isArray(exercises)&&exercises.length>0&&<label className="form-field"><span>Tomar como base una sugerencia del análisis</span>
    <select disabled={busy} defaultValue="" onChange={e=>{
     if(!e.target.value)return;
     const d=exercises[Number(e.target.value)];if(!d)return;
     setTitle(String(d.nombre||'Ejercicio').slice(0,160));
     setDetails([d.protocolo,d.foco].filter(Boolean).join(' · ').slice(0,2000));
    }}><option value="">Seleccionar sugerencia</option>{exercises.map((d,i)=><option key={i} value={i}>{d.nombre||'Ejercicio '+(i+1)}</option>)}</select></label>}
   <p>Revisa y ajusta la dosificación antes de asignar.</p>
   <label className="form-field"><span>Ejercicio</span><input disabled={busy} required maxLength={160} value={title} onChange={e=>setTitle(e.target.value)}/></label>
   <label className="form-field"><span>Indicaciones, series y descansos</span><textarea disabled={busy} required maxLength={2000} value={details} onChange={e=>setDetails(e.target.value)}/></label>
   <label className="form-field"><span>Fecha objetivo (opcional, hora local)</span><input disabled={busy} type="datetime-local" value={due} onChange={e=>setDue(e.target.value)}/></label>
   <button disabled={busy} className="primary-button">Asignar ejercicio vinculado</button>
  </form>}
 </article>;
}
export default function SessionReviews(){
 let coach=false;try{coach=JSON.parse(localStorage.getItem('metahub_user')||'{}').role==='entrenador';}catch{}
 const [query,setQuery]=useSearchParams(),[athletes,setAthletes]=useState([]),[id,setId]=useState(query.get('athleteId')||'');
 const [data,setData]=useState(null),[error,setError]=useState(''),[filter,setFilter]=useState('all');
 const generation=useRef(0);
 const selectedSession=query.get('sessionId');
 useEffect(()=>{
  if(!coach)return;
  const abort=new AbortController();
  clubRequest('/roster','GET',undefined,abort.signal).then(r=>{
   setAthletes(r.athletes);setId(v=>r.athletes.some(a=>String(a.id)===v)?v:r.athletes[0]?String(r.athletes[0].id):'');
  }).catch(e=>{if(e.name!=='AbortError')setError(e.message);});
  return()=>abort.abort();
 },[coach]);
 const reload=useCallback(async()=>{
  if(coach&&!id)return;const current=++generation.current;
  try{
   const result=await clubRequest('/reviews'+(coach?'?athleteId='+encodeURIComponent(id):''));
   if(current===generation.current){setData(result);setError('');}
  }catch(e){if(current===generation.current){setData(null);setError(e.message);}}
 },[coach,id]);
 useEffect(()=>{
  setData(null);reload();const timer=setInterval(()=>{if(!document.hidden)reload();},15000);
  return()=>{clearInterval(timer);generation.current++;};
 },[reload]);
 const visible=data?.sessions.filter(s=>(filter==='all'||s.reviewStatus===filter)&&(!selectedSession||String(s.id)===selectedSession))||[];
 return <Layout><div className="feature-page feature-reviews"><PageHeader eyebrow="CIERRE DEL CICLO" title={coach?'Revisión de sesiones':'Mis revisiones y plan'}
 description="Observaciones del entrenador y ejercicios vinculados a cada evaluación."
 action={<button className="secondary-button" type="button" onClick={reload}>Actualizar</button>}/>
 <FeatureBanner icon={ClipboardCheck} title={coach?'Una revisión que se convierte en progreso':'Tu entrenador acompaña cada sesión'}
  description="Observaciones claras y ejercicios conectados con cada evaluación."
  stats={[{label:'Sesiones',value:data?data.sessions.length:'—'},{label:'Revisadas',value:data?data.sessions.filter(s=>s.reviewStatus==='reviewed').length:'—'},{label:'Ejercicios',value:data?data.tasks.length:'—'}]}/>
 {coach&&<label className="form-field"><span>Atleta</span><select value={id} onChange={e=>{generation.current++;setData(null);setId(e.target.value);setQuery({athleteId:e.target.value});}}>
 <option value="">Seleccionar atleta</option>{athletes.map(a=><option key={a.id} value={a.id}>{a.name}{a.canEdit?' · A mi cargo':' · Club: solo lectura'}</option>)}</select></label>}
 {error&&<p role="alert">{error}</p>}
 {data&&<><section className="panel-card" style={{margin:'20px 0'}}><h2>{data.athlete.name}</h2>
 {coach&&!data.athlete.canEdit&&<p>Solo lectura. El entrenador responsable realiza las revisiones y asignaciones.</p>}
 <p>{data.sessions.filter(s=>s.reviewStatus==='pending').length} pendientes · {data.sessions.filter(s=>s.reviewStatus==='reviewed').length} revisadas · {data.sessions.filter(s=>s.reviewStatus==='requires_new_video').length} con nueva captura solicitada.</p>
 <label className="form-field"><span>Filtrar revisión</span><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Todas</option>{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
 </section><div style={{display:'grid',gap:20}}>
 {!visible.length&&<p>No hay sesiones para este filtro.</p>}
 {visible.map(s=><ReviewCard key={s.id} session={s} tasks={data.tasks.filter(t=>t.sessionId===s.id)} canEdit={data.athlete.canEdit} onReload={reload}/>)}
 </div></>}
 </div></Layout>;
}
