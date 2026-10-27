import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {Layout,PageHeader} from '../components/UI.jsx';
const BASE=import.meta.env.VITE_API_BASE||(location.hostname==='localhost'?'http://localhost:3000':'');
async function request(path,options={}){
 const response=await fetch(BASE+'/api/portal/videos'+path,{
  ...options,headers:{Authorization:'Bearer '+(localStorage.getItem('metahub_token')||''),...options.headers}
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.error||'No se pudo completar la solicitud.');
 return data;
}
const labels={uploaded:'Video guardado; pendiente de análisis',processing:'Analizando',completed:'Análisis completado',failed:'Análisis pendiente de reintento'};
export default function UploadVideo(){
 const [file,setFile]=useState(null),[preview,setPreview]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[videos,setVideos]=useState([]);
 const uploadId=useRef(''),working=useRef(false);
 async function load(){const result=await request('');setVideos(result.videos);}
 useEffect(()=>{load().catch(e=>setError(e.message));},[]);
 useEffect(()=>{
  if(!file){setPreview('');return;}
  const url=URL.createObjectURL(file);setPreview(url);
  return ()=>URL.revokeObjectURL(url);
 },[file]);
 async function analyze(id){
  const result=await request('/'+id+'/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  if(result.status==='failed')setError(result.error||'No fue posible analizar. El video sigue guardado.');
  else setMessage('Sesión analizada y disponible para tu entrenador.');
 }
 async function submit(event){
  event.preventDefault();if(working.current||!file)return;
  if(file.size>50*1024*1024||!file.size){setError('Elige un video no vacío de hasta 50 MB.');return;}
  if(!/\.(mp4|webm|mov)$/i.test(file.name)){setError('Usa MP4, WebM o MOV.');return;}
  working.current=true;setBusy(true);setError('');setMessage('Subiendo y guardando tu video…');
  try{
   if(!uploadId.current)uploadId.current=crypto.randomUUID();
   const saved=await request('?requestId='+uploadId.current+'&filename='+encodeURIComponent(file.name),{
    method:'POST',headers:{'Content-Type':file.type||'application/octet-stream'},body:file
   });
   setMessage('Video guardado. Analizando con el servicio de visión…');
   await load();
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
 return <Layout><PageHeader eyebrow="MI SESIÓN" title="Subir video para analizar"
 description="El video se guarda en tu propia ficha y el análisis queda disponible para tu entrenador."/>
 <section className="panel-card">
 <p>MP4, WebM o MOV · máximo 50 MB. Graba lateralmente y con el cuerpo completo visible.
 El análisis actual muestrea los primeros 240 fotogramas; utiliza un clip corto de la pasada.</p>
 <p>Necesitas consentimiento registrado en tu ficha para cargar y analizar.</p>
 <form onSubmit={submit}>
 <label className="form-field"><span>Video de mi sesión</span><input type="file" required accept="video/mp4,video/webm,video/quicktime,.mov" disabled={busy}
 onChange={e=>{setFile(e.target.files?.[0]||null);uploadId.current='';setError('');setMessage('');}}/></label>
 {preview&&<video src={preview} controls style={{width:'100%',maxHeight:320,marginTop:16}}/>}
 <button className="primary-button" disabled={busy||!file}>{busy?'Procesando…':'Subir y analizar mi sesión'}</button>
 </form>
 {message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}
 </section>
 <section className="panel-card" style={{marginTop:20}}><h2>Mis videos cargados</h2>
 <button type="button" disabled={busy} onClick={()=>load().catch(e=>setError(e.message))}>Actualizar historial</button>
 {!videos.length&&<p>No tienes videos cargados con este flujo.</p>}
 {videos.map(v=><article key={v.id} style={{padding:12,borderBottom:'1px solid #dce5f0'}}>
 <strong>{v.filename}</strong><p>Sesión #{v.sessionId} · {new Date(v.createdAt).toLocaleString('es-CL')}</p>
 <p>{labels[v.status]}{v.iptScore!=null?' · IPT '+v.iptScore:''}</p>
 {v.error&&<p>{v.error}</p>}
 {v.status!=='completed'&&<button disabled={busy} onClick={()=>retry(v.id)}>Reintentar análisis</button>}
 </article>)}
 <Link to="/evolution">Ver mi evolución</Link>
 </section></Layout>;
}
