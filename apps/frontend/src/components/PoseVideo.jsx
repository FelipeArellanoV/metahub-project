import {forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react';
import {Video,RefreshCw} from 'lucide-react';
import {BODY_CONNECTIONS,containRect,isVisible,poseAt} from '../services/poseGeometry.js';
import '../pose-video.css';
const BASE=import.meta.env.VITE_API_BASE||'';
const headers=()=>({Authorization:'Bearer '+(localStorage.getItem('metahub_token')||'')});
const PoseVideo=forwardRef(function PoseVideo({sessionId,title='Video con análisis corporal',showSkeleton=true,skeletonOnly=false,canAnalyze=false,controls=true,onTime,onReady,onEnded},ref){
 const video=useRef(null),canvas=useRef(null),stage=useRef(null);
 const [source,setSource]=useState(''),[track,setTrack]=useState(null),[error,setError]=useState(''),[poseError,setPoseError]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState('Esperando video');
 const [ratio,setRatio]=useState(16/9);
 const callbacks=useRef({onTime,onReady,onEnded});callbacks.current={onTime,onReady,onEnded};
 useImperativeHandle(ref,()=>({
  play:()=>video.current?.play(),pause:()=>video.current?.pause(),
  seek:fraction=>{const v=video.current;if(v&&Number.isFinite(v.duration))v.currentTime=Math.max(0,Math.min(v.duration,fraction*v.duration));},
  setRate:rate=>{if(video.current)video.current.playbackRate=Math.max(.0625,Math.min(16,rate));},
  duration:()=>video.current?.duration||0,time:()=>video.current?.currentTime||0,
  fps:()=>track?.fps||30
 }),[track]);
 async function loadPose(signal){
  const response=await fetch(BASE+'/api/videos/'+sessionId+'/pose',{headers:headers(),signal,cache:'no-store'});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.error||'No se pudo obtener el esqueleto de esta sesión.');
  setTrack(result);setPoseError('');
 }
 useEffect(()=>{
  setSource('');setTrack(null);setError('');setPoseError('');setStatus('Cargando video');
  callbacks.current.onReady?.(false);
  if(!sessionId){setError('Selecciona un atleta y una sesión en los controles superiores. Si no hay sesiones, carga y analiza un video primero.');return;}
  const abort=new AbortController();let blobUrl='';
  (async()=>{
   try{
    const response=await fetch(BASE+'/api/videos/'+sessionId,{headers:headers(),signal:abort.signal,cache:'no-store'});
    if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||'Video no disponible para esta sesión.');}
    const blob=await response.blob();if(abort.signal.aborted)return;
    blobUrl=URL.createObjectURL(blob);setSource(blobUrl);
    try{await loadPose(abort.signal);}catch(e){if(e.name!=='AbortError')setPoseError(e.message);}
   }catch(e){if(e.name!=='AbortError')setError(e.message);}
  })();
  return()=>{abort.abort();if(blobUrl)URL.revokeObjectURL(blobUrl);};
 },[sessionId]);
 useEffect(()=>{
  let frameId;
  const redraw=()=>{
   const v=video.current,c=canvas.current,box=stage.current;
   if(v&&c&&box){
    const rect=box.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
    const width=Math.round(rect.width*dpr),height=Math.round(rect.height*dpr);
    if(c.width!==width||c.height!==height){c.width=width;c.height=height;}
    const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);
    const points=showSkeleton?poseAt(track,v.currentTime):null;
    const fit=containRect(rect.width,rect.height,v.videoWidth,v.videoHeight);
    let count=0;
    if(points&&fit){
     const xy=point=>[fit.x+point[0]*fit.width,fit.y+point[1]*fit.height];
     ctx.strokeStyle='#ffffff';ctx.lineWidth=Math.max(2,Math.min(fit.width,fit.height)/145);ctx.lineCap='round';
     for(const [a,b] of BODY_CONNECTIONS){if(isVisible(points[a])&&isVisible(points[b])){const p=xy(points[a]),q=xy(points[b]);ctx.beginPath();ctx.moveTo(...p);ctx.lineTo(...q);ctx.stroke();}}
     if(isVisible(points[0])&&isVisible(points[11])&&isVisible(points[12])){
      const head=xy(points[0]),left=xy(points[11]),right=xy(points[12]);
      ctx.beginPath();ctx.moveTo(...head);ctx.lineTo((left[0]+right[0])/2,(left[1]+right[1])/2);ctx.stroke();
     }
     points.forEach((point,index)=>{
      if(!isVisible(point))return;count++;const p=xy(point);
      ctx.fillStyle=index<11?'#32b6ff':index<17?'#ff4356':index<23?'#ffc857':index<27?'#a3ff3f':'#20e6a1';
      ctx.beginPath();ctx.arc(p[0],p[1],index<11?2.5:4,0,Math.PI*2);ctx.fill();
     });
    }
    const message=!showSkeleton?'Esqueleto oculto':!track?'Sin trayectoria corporal':count>=12?'Cuerpo detectado':count>0?'Detección parcial':'Sin postura fiable en este cuadro';
    setStatus(previous=>previous===message?previous:message);
   }
   frameId=requestAnimationFrame(redraw);
  };
  redraw();return()=>cancelAnimationFrame(frameId);
 },[track,source,showSkeleton]);
 async function generate(){
  setBusy(true);setPoseError('');
  try{
   const response=await fetch(BASE+'/api/videos/'+sessionId+'/analyze-pose',{method:'POST',headers:{...headers(),'Content-Type':'application/json'},body:'{}'});
   const data=await response.json().catch(()=>({}));
   if(!response.ok||data.status==='failed')throw new Error(data.error||'No fue posible generar el esqueleto.');
   await loadPose();
  }catch(e){setPoseError(e.message);}finally{setBusy(false);}
 }
 return <article className="pose-video-card">
  <header><Video size={17}/><strong>{title}</strong><span>Sesión #{sessionId||'—'}</span></header>
  <div className="pose-video-stage" ref={stage} style={{'--pose-ratio':ratio,background:skeletonOnly?'#050a10':undefined}}>
   {source&&<video ref={video} src={source} style={skeletonOnly?{opacity:0,pointerEvents:'none'}:undefined} aria-hidden={skeletonOnly||undefined} controls={controls&&!skeletonOnly} playsInline muted preload="metadata"
    onLoadedMetadata={()=>{const v=video.current;setRatio(v.videoWidth/v.videoHeight||16/9);callbacks.current.onReady?.(true);}}
    onTimeUpdate={()=>callbacks.current.onTime?.(video.current.currentTime,video.current.duration)}
    onEnded={()=>callbacks.current.onEnded?.()}
    onError={()=>{setError('El navegador no puede reproducir este formato. Prueba un MP4 compatible.');callbacks.current.onReady?.(false);}}/>}
   <canvas ref={canvas} aria-hidden="true"/>
   {!source&&<div className="pose-video-empty"><Video size={32}/><p>{error||'Cargando el video original…'}</p></div>}
   {source&&<span className="pose-video-status">{status}</span>}
  </div>
  <footer>
   {error&&source&&<p role="alert">{error}</p>}
   {poseError&&<p>{poseError}</p>}
   {source&&canAnalyze&&<button type="button" className="secondary-button" disabled={busy} onClick={generate}><RefreshCw size={15}/>{busy?'Analizando el clip…':(track?'Reanalizar clip completo':'Generar esqueleto de este video')}</button>}
   {track&&<small>33 puntos corporales · {track.frames.length} cuadros muestreados · {track.full_video?'Muestreo de todo el clip':'Muestreo parcial'}</small>}
   {!track&&!canAnalyze&&source&&<small>El alumno o su entrenador responsable debe generar la trayectoria de esta sesión.</small>}
  </footer>
 </article>;
});
export default PoseVideo;
