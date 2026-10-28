import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {Camera,Video,RefreshCw,ShieldCheck} from 'lucide-react';
import {Layout,PageHeader} from '../components/UI.jsx';
import FeatureBanner from '../components/FeatureBanner.jsx';
import DeviceVideoInput from '../components/DeviceVideoInput.jsx';
import {createRequestId} from '../services/requestId.js';
import api from '../services/api.js';
const BASE=import.meta.env.VITE_API_BASE||'';
async function request(path,options={}){
 const response=await fetch(BASE+'/api/capture/videos'+path,{
  ...options,headers:{Authorization:'Bearer '+(localStorage.getItem('metahub_token')||''),...options.headers}
 });
 const data=await response.json().catch(()=>({}));
 if(response.status===401){localStorage.removeItem('metahub_token');localStorage.removeItem('metahub_user');location.assign('/app.html#/login');}
 if(!response.ok)throw new Error(data.error||'No se pudo completar la solicitud.');
 return data;
}
const labels={uploaded:'Video guardado; pendiente de análisis',processing:'Analizando',completed:'Análisis completado',failed:'Análisis pendiente de reintento'};
export default function UploadVideo(){
 let coach=false;try{coach=JSON.parse(localStorage.getItem('metahub_user')||'{}').role==='entrenador';}catch{}
 const [file,setFile]=useState(null),[preview,setPreview]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[videos,setVideos]=useState([]);
 const [athletes,setAthletes]=useState([]),[athleteId,setAthleteId]=useState(''),[listError,setListError]=useState('');
 const uploadId=useRef(''),working=useRef(false),generation=useRef(0);
 const query=coach?'athleteId='+encodeURIComponent(athleteId):'';
 async function load(){
  if(coach&&!athleteId)return;
  const current=generation.current;
  const result=await request(query?'?'+query:'');
  if(current===generation.current)setVideos(result.videos);
 }
 useEffect(()=>{
  if(!coach)return;let alive=true;
  api.athletes.getAll().then(rows=>{if(alive){setAthletes(rows);setAthleteId(rows[0]?String(rows[0].id):'');}})
   .catch(e=>{if(alive)setListError(e.message);});
  return()=>{alive=false;};
 },[coach]);
 useEffect(()=>{
  generation.current++;setVideos([]);setMessage('');setError('');
  load().catch(e=>setError(e.message));
  return()=>{generation.current++;};
 },[athleteId,coach]);
 useEffect(()=>{
  if(!file){setPreview('');return;}
  const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);
 },[file]);
 function chooseFile(next){
  setError('');setMessage('');uploadId.current='';
  if(next&&(!next.size||next.size>50*1024*1024)){setError('Elige un video no vacío de hasta 50 MB.');setFile(null);return;}
  if(next&&!/\.(mp4|webm|mov)$/i.test(next.name)){setError('Formato no admitido. Usa MP4, WebM o MOV.');setFile(null);return;}
  setFile(next);
 }
 async function analyze(id){
  const result=await request('/'+id+'/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  if(result.status==='failed'){setError(result.error||'No fue posible analizar. El video sigue guardado.');setMessage('Video conservado para reintentar.');}
  else setMessage('Sesión analizada y guardada en la ficha del atleta.');
 }
 async function submit(event){
  event.preventDefault();if(working.current||!file||(coach&&!athleteId))return;
  working.current=true;setBusy(true);setError('');setMessage('Subiendo y guardando el video…');
  try{
   if(!uploadId.current)uploadId.current=createRequestId();
   const saved=await request('?requestId='+uploadId.current+'&filename='+encodeURIComponent(file.name)+(query?'&'+query:''),{
    method:'POST',headers:{'Content-Type':file.type||'application/octet-stream'},body:file
   });
   setMessage('Video guardado. Analizando la carrera…');await load();
   if(saved.status==='completed')setMessage('Esta carga ya estaba analizada; no se duplicó.');
   else await analyze(saved.uploadId);
   await load();
  }catch(e){setError(e.message);setMessage('Si el video aparece en el historial, reintenta su análisis desde allí.');load().catch(()=>{});}
  finally{working.current=false;setBusy(false);}
 }
 async function retry(id){
  if(working.current)return;working.current=true;setBusy(true);setError('');setMessage('Analizando video guardado…');
  try{await analyze(id);await load();}catch(e){setError(e.message);}finally{working.current=false;setBusy(false);}
 }
 const selected=athletes.find(a=>String(a.id)===athleteId);
 return <Layout><div className="feature-page">
 <PageHeader eyebrow="CAPTURA Y ANÁLISIS" title="Grabar o subir una carrera"
 description={coach?'Selecciona un atleta a tu cargo y registra su pasada.':'Graba o carga tu pasada para analizarla y compartir el resultado con tu entrenador.'}/>
 <FeatureBanner icon={Camera} title="La cámara de tu dispositivo, conectada a tu sesión"
 description="Graba una pasada o selecciona un video. Revisa la vista previa antes de enviarlo al análisis."
 stats={[{label:'Formato',value:'Video'},{label:'Máximo',value:'50 MB'}]}/>
 {coach&&<section className="panel-card">
  <label className="form-field"><span>Atleta a mi cargo</span><select value={athleteId} disabled={busy} onChange={e=>{setAthleteId(e.target.value);chooseFile(null);}}>
   <option value="">Seleccionar atleta</option>{athletes.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
  </select></label>
  {selected&&<p><ShieldCheck size={14}/> Consentimiento: {selected.consent?'registrado':'pendiente; debes registrarlo antes de cargar'}</p>}
  {listError&&<p role="alert">{listError}</p>}
  {!athletes.length&&!listError&&<p>Registra primero un atleta en Mis atletas.</p>}
 </section>}
 <section className="panel-card">
  <h2 className="feature-title"><Video size={21}/>Video de la carrera</h2>
  <p className="device-video-info">Graba lateralmente y con el cuerpo completo visible. La grabación en el navegador se detiene a los 120 segundos.
  El análisis admite videos de hasta 5 minutos y muestrea todo el clip y guarda 33 puntos corporales para visualizar el esqueleto sobre tu video. Usa una toma con el cuerpo completo visible.</p>
  <DeviceVideoInput disabled={busy||(coach&&!athleteId)} onFile={chooseFile}/>
  <form onSubmit={submit}>
   {file&&<><h3>Vista previa antes de analizar</h3><p>{file.name} · {(file.size/1024/1024).toFixed(1)} MB</p>
    {preview&&<video src={preview} controls playsInline className="device-selected-preview"/>}
    <button type="button" className="secondary-button" disabled={busy} onClick={()=>chooseFile(null)}>Quitar video seleccionado</button>
   </>}
   <button className="primary-button" disabled={busy||!file||(coach&&!athleteId)}>{busy?'Procesando…':'Guardar video y analizar carrera'}</button>
  </form>
  {message&&<p role="status" className="device-upload-progress">{message}</p>}{error&&<p role="alert">{error}</p>}
 </section>
 <section className="panel-card"><h2 className="feature-title"><Video size={21}/>Videos de esta ficha</h2>
  <button type="button" className="secondary-button" disabled={busy} onClick={()=>load().catch(e=>setError(e.message))}><RefreshCw size={16}/>Actualizar historial</button>
  {!videos.length&&<p>No hay videos cargados mediante este flujo.</p>}
  <ul className="collab-list">{videos.map(v=><li key={v.id}>
   <strong>{v.filename}</strong><small>Sesión #{v.sessionId} · {new Date(v.createdAt).toLocaleString('es-CL')}</small>
   <span>{labels[v.status]}{v.iptScore!=null?' · IPT '+v.iptScore:''}</span>
   {v.error&&<p>{v.error}</p>}
   {v.status!=='completed'&&<button type="button" className="secondary-button" disabled={busy} onClick={()=>retry(v.id)}>Reintentar análisis</button>}
  </li>)}</ul>
  <Link className="secondary-button" to={coach?'/sessions':'/evolution'}>{coach?'Ver sesiones registradas':'Ver mi evolución'}</Link>
  {coach&&<Link className="secondary-button" to="/capture-lab">Abrir laboratorio de captura avanzado</Link>}
 </section></div></Layout>;
}
