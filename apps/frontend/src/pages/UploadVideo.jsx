import {useCallback,useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {Camera,Video,RefreshCw,ShieldCheck,X,UploadCloud} from 'lucide-react';
import {Layout,PageHeader} from '../components/UI.jsx';
import FeatureBanner from '../components/FeatureBanner.jsx';
import DeviceVideoInput from '../components/DeviceVideoInput.jsx';
import {createRequestId} from '../services/requestId.js';
import {uploadVideo,videoRequest} from '../services/videoUpload.js';
import {validateVideoFile,validateDuration,readVideoDuration,formatBytes,statusInfo,normalizeStatus,needsPolling,canRetry,MAX_VIDEO_BYTES} from '../services/videoValidation.js';
import api from '../services/api.js';
import {AnimatePresence} from 'framer-motion';
import {AnalysisProgress,Skeleton,SkeletonList,cardVariants,listItemVariants,motion,staggerVariants} from '../components/Motion.jsx';
import '../upload-queue.css';

const POLL_MS=4000;

export default function UploadVideo(){
 let coach=false;try{coach=JSON.parse(localStorage.getItem('metahub_user')||'{}').role==='entrenador';}catch{}
 const [file,setFile]=useState(null),[preview,setPreview]=useState(''),[duration,setDuration]=useState(null);
 const [uploading,setUploading]=useState(false),[progress,setProgress]=useState(null);
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[videos,setVideos]=useState([]),[retrying,setRetrying]=useState({});
 const [athletes,setAthletes]=useState([]),[athleteId,setAthleteId]=useState(''),[listError,setListError]=useState('');
 // Solo para mostrar esqueletos mientras llega la primera respuesta (no cambia qué se carga).
 const [athletesLoading,setAthletesLoading]=useState(coach),[videosLoading,setVideosLoading]=useState(true);
 const uploadId=useRef(''),abort=useRef(null),generation=useRef(0),checkToken=useRef(0);
 const query=coach?'athleteId='+encodeURIComponent(athleteId):'';

 const load=useCallback(async()=>{
  if(coach&&!athleteId)return;
  const current=generation.current;
  const result=await videoRequest('/api/capture/videos'+(query?'?'+query:''));
  if(current===generation.current)setVideos(result.videos||[]);
 },[coach,athleteId,query]);

 useEffect(()=>{
  if(!coach)return;let alive=true;
  api.athletes.getAll().then(rows=>{if(alive){setAthletes(rows);setAthleteId(rows[0]?String(rows[0].id):'');}})
   .catch(e=>{if(alive)setListError(e.message);})
   .finally(()=>{if(alive)setAthletesLoading(false);});
  return()=>{alive=false;};
 },[coach]);

 useEffect(()=>{
  generation.current++;setVideos([]);setMessage('');setError('');
  const current=generation.current;setVideosLoading(true);
  load().catch(e=>setError(e.message)).finally(()=>{if(current===generation.current)setVideosLoading(false);});
  return()=>{generation.current++;};
 },[load]);

 // Mientras haya videos en cola o analizándose, el historial se actualiza solo.
 // Se pausa con la pestaña oculta y se reanuda al volver.
 const polling=needsPolling(videos);
 useEffect(()=>{
  if(!polling)return;
  const timer=setInterval(()=>{if(document.visibilityState==='visible')load().catch(()=>{});},POLL_MS);
  const onVisible=()=>{if(document.visibilityState==='visible')load().catch(()=>{});};
  document.addEventListener('visibilitychange',onVisible);
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',onVisible);};
 },[polling,load]);

 useEffect(()=>{
  if(!file){setPreview('');return;}
  const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);
 },[file]);

 // Cancelar una subida en curso si el usuario sale de la página.
 useEffect(()=>()=>abort.current?.abort(),[]);

 async function chooseFile(next){
  setError('');setMessage('');uploadId.current='';setDuration(null);
  const check=++checkToken.current;
  if(!next){setFile(null);return;}
  const basic=validateVideoFile(next);
  if(!basic.ok){setError(basic.error);setFile(null);return;}
  setFile(next);
  const seconds=await readVideoDuration(next);
  if(check!==checkToken.current)return;   // el usuario ya eligió otro archivo
  const timing=validateDuration(seconds);
  if(!timing.ok){setError(timing.error);setFile(null);return;}
  setDuration(seconds);
 }

 async function submit(event){
  event.preventDefault();if(uploading||!file||(coach&&!athleteId))return;
  const basic=validateVideoFile(file);if(!basic.ok){setError(basic.error);return;}
  setUploading(true);setError('');setMessage('');setProgress({sent:0,total:file.size});
  const controller=new AbortController();abort.current=controller;
  try{
   if(!uploadId.current)uploadId.current=createRequestId();
   const saved=await uploadVideo({
    query:'requestId='+uploadId.current+'&filename='+encodeURIComponent(file.name)+(query?'&'+query:''),
    file,signal:controller.signal,
    onProgress:(sent,total)=>setProgress({sent,total})
   });
   const state=normalizeStatus(saved.status);
   setMessage(state==='completed'?'Este video ya estaba analizado; no se duplicó.':
    'Video guardado y en cola. El análisis sigue en segundo plano: puedes subir otro o seguir usando MetaHub.');
   setFile(null);uploadId.current='';setDuration(null);
   await load().catch(()=>{});
  }catch(e){
   if(e.name==='AbortError')setMessage('Subida cancelada. El video no se guardó.');
   else setError(e.message);
  }finally{abort.current=null;setUploading(false);setProgress(null);}
 }

 async function retry(id){
  setRetrying(r=>({...r,[id]:true}));setError('');
  try{
   await videoRequest('/api/capture/videos/'+id+'/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
   setMessage('Video devuelto a la cola de análisis.');
   await load();
  }catch(e){setError(e.message);}
  finally{setRetrying(r=>{const n={...r};delete n[id];return n;});}
 }

 const selected=athletes.find(a=>String(a.id)===athleteId);
 const consentMissing=Boolean(coach&&selected&&!selected.consent);
 const percent=progress&&progress.total?Math.min(100,Math.round(progress.sent/progress.total*100)):0;
 const showVideoSkeleton=videosLoading||(coach&&athletesLoading);
 return <Layout><motion.div className="feature-page" variants={staggerVariants(0.07,0.05)}>
 <PageHeader eyebrow="CAPTURA Y ANÁLISIS" title="Grabar o subir una carrera"
 description={coach?'Selecciona un atleta a tu cargo y registra su pasada.':'Graba o carga tu pasada para analizarla y compartir el resultado con tu entrenador.'}/>
 <FeatureBanner icon={Camera} title="La cámara de tu dispositivo, conectada a tu sesión"
 description="Graba una pasada o selecciona un video. El análisis corre en segundo plano: no necesitas esperar en esta pantalla."
 stats={[{label:'Formatos',value:'MP4 · WebM · MOV'},{label:'Máximo',value:formatBytes(MAX_VIDEO_BYTES)+' · 5 min'}]}/>
 {coach&&<motion.section className="panel-card" variants={cardVariants}>
  {!athletesLoading&&<label className="form-field"><span>Atleta a mi cargo</span><select value={athleteId} disabled={uploading} onChange={e=>{setAthleteId(e.target.value);chooseFile(null);}}>
   <option value="">Seleccionar atleta</option>{athletes.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
  </select></label>}
  {athletesLoading&&<div className="mh-skeleton-field" role="status" aria-busy="true"><span className="mh-visually-hidden">Cargando atletas…</span>
   <Skeleton width="42%" height={12}/><Skeleton height={44} radius={12}/></div>}
  {selected&&<p><ShieldCheck size={14}/> Consentimiento: {selected.consent?'registrado':'pendiente; debes registrarlo antes de cargar'}</p>}
  {listError&&<p role="alert">{listError}</p>}
  {!athletesLoading&&!athletes.length&&!listError&&<p>Registra primero un atleta en Mis atletas.</p>}
 </motion.section>}
 <motion.section className="panel-card" variants={cardVariants}>
  <h2 className="feature-title"><Video size={21}/>Video de la carrera</h2>
  <p className="device-video-info">Graba lateralmente y con el cuerpo completo visible. La grabación en el navegador se detiene a los 120 segundos.
  Antes de enviar se revisa el formato, el peso y la duración del video.</p>
  <DeviceVideoInput disabled={uploading||(coach&&!athleteId)} onFile={chooseFile}/>
  <form onSubmit={submit}>
   {file&&<><h3>Vista previa antes de enviar</h3>
    <p>{file.name} · {formatBytes(file.size)}{duration!=null?' · '+Math.round(duration)+' s':''}</p>
    {preview&&<video src={preview} controls playsInline className="device-selected-preview"/>}
    {!uploading&&<button type="button" className="secondary-button" onClick={()=>chooseFile(null)}>Quitar video seleccionado</button>}
   </>}
   {uploading&&progress&&<div className="upload-progress" role="status" aria-live="polite">
    <div className="upload-progress-head"><span><UploadCloud size={16}/> Subiendo… {percent}%</span>
     <small>{formatBytes(progress.sent)} de {formatBytes(progress.total)}</small></div>
    <div className="mh-upload-bar" role="progressbar" aria-label="Progreso de la subida" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
     <motion.span className="mh-upload-bar-fill" initial={{scaleX:0}} animate={{scaleX:percent/100}} transition={{duration:.25,ease:'easeOut'}}/>
    </div>
    <button type="button" className="secondary-button" onClick={()=>abort.current?.abort()}><X size={15}/>Cancelar subida</button>
   </div>}
   {!uploading&&<button className="primary-button" disabled={!file||(coach&&!athleteId)||consentMissing}>Enviar video al análisis</button>}
  </form>
  <AnimatePresence initial={false}>
   {message&&<motion.p key={'m'+message} role="status" className="device-upload-progress" initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} exit={{opacity:0}}>{message}</motion.p>}
   {error&&<motion.p key={'e'+error} role="alert" className="upload-error" initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} exit={{opacity:0}}>{error}</motion.p>}
  </AnimatePresence>
 </motion.section>
 <motion.section className="panel-card" variants={cardVariants}><h2 className="feature-title"><Video size={21}/>Videos de esta ficha</h2>
  <div className="upload-history-actions">
   <button type="button" className="secondary-button" onClick={()=>load().catch(e=>setError(e.message))}><RefreshCw size={16}/>Actualizar</button>
   {polling&&<small className="upload-live">Actualizando automáticamente mientras haya análisis pendientes</small>}
  </div>
  {showVideoSkeleton&&!videos.length&&<SkeletonList rows={3} label="Cargando videos…"/>}
  {!showVideoSkeleton&&!videos.length&&<motion.p initial={{opacity:0}} animate={{opacity:1}}>No hay videos cargados mediante este flujo.</motion.p>}
  <ul className="collab-list upload-queue-list">
  <AnimatePresence initial={false}>{videos.map((v,i)=>{const info=statusInfo(v.status);return <motion.li key={v.id} layout="position" custom={i} variants={listItemVariants} initial="initial" animate="animate" exit="exit">
   <div className="upload-queue-row">
    <strong>{v.filename}</strong>
    <AnimatePresence mode="wait" initial={false}>
     <motion.span key={info.label} className={'upload-status upload-status-'+info.tone}
      initial={{opacity:0,scale:.85}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:.9}} transition={{duration:.2}}>{info.label}</motion.span>
    </AnimatePresence>
   </div>
   <AnalysisProgress status={v.status} filename={v.filename}/>
   <small>Sesión #{v.sessionId} · {new Date(v.createdAt).toLocaleString('es-CL')}{v.iptScore!=null?' · IPT '+v.iptScore:''}</small>
   <small>{info.description}</small>
   {v.error&&<p className="upload-error">{v.error}</p>}
   {canRetry(v)&&<button type="button" className="secondary-button" disabled={Boolean(retrying[v.id])} onClick={()=>retry(v.id)}>
    <RefreshCw size={15}/>{retrying[v.id]?'Enviando…':'Reintentar análisis'}</button>}
  </motion.li>;})}</AnimatePresence></ul>
  <Link className="secondary-button" to={coach?'/sessions':'/evolution'}>{coach?'Ver sesiones registradas':'Ver mi evolución'}</Link>
  {coach&&<Link className="secondary-button" to="/capture-lab">Abrir laboratorio de captura avanzado</Link>}
 </motion.section></motion.div></Layout>;
}
