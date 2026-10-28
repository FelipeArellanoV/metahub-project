import {useEffect,useRef,useState} from 'react';
import {Pause,Play,RotateCcw,SkipBack,SkipForward} from 'lucide-react';
import PoseVideo from './PoseVideo.jsx';
export default function PoseComparison({sessionA,sessionB,showSkeleton=true,canAnalyze=false}){
 const a=useRef(null),b=useRef(null),restarting=useRef(false);
 const [readyA,setReadyA]=useState(false),[readyB,setReadyB]=useState(false),[playing,setPlaying]=useState(false),[progress,setProgress]=useState(0),[rate,setRate]=useState(1),[error,setError]=useState('');
 function pause(){a.current?.pause();b.current?.pause();setPlaying(false);}
 useEffect(()=>{pause();setReadyA(false);setReadyB(false);setProgress(0);},[sessionA?.id,sessionB?.id]);
 function seek(value){pause();setProgress(value);a.current?.seek(value/100);b.current?.seek(value/100);}
 function applyRate(value){a.current?.setRate(value);const ad=a.current?.duration(),bd=b.current?.duration();if(ad>0&&bd>0)b.current?.setRate(value*bd/ad);}
 async function repeat(){
  if(!playing||restarting.current)return;restarting.current=true;
  a.current?.seek(0);b.current?.seek(0);setProgress(0);applyRate(rate);
  try{await Promise.all([a.current?.play(),b.current?.play()]);}catch(e){pause();setError('No se pudo repetir la reproducción. Pulsa Reproducir ambos.');}finally{restarting.current=false;}
 }
 async function play(){
  if(playing){pause();return;}setError('');applyRate(rate);
  try{await Promise.all([a.current?.play(),b.current?.play()]);setPlaying(true);}catch(e){pause();setError('Pulsa reproducir después de que ambos videos estén disponibles.');}
 }
 return <section className="pose-comparison">
  <div className="pose-comparison-controls">
   <button type="button" className="primary-button" disabled={!readyA||!readyB} onClick={play}>{playing?<Pause size={16}/>:<Play size={16}/>} {playing?'Pausar':'Reproducir ambos'}</button>
   <button type="button" className="secondary-button" disabled={!readyA||!readyB} onClick={()=>seek(0)} aria-label="Volver al inicio"><RotateCcw size={16}/></button>
   <button type="button" className="secondary-button" disabled={!readyA||!readyB} onClick={()=>seek(Math.max(0,progress-100/(a.current.fps()*a.current.duration())))} aria-label="Retroceder un cuadro"><SkipBack size={16}/></button>
   <button type="button" className="secondary-button" disabled={!readyA||!readyB} onClick={()=>seek(Math.min(100,progress+100/(a.current.fps()*a.current.duration())))} aria-label="Avanzar un cuadro"><SkipForward size={16}/></button>
   <label>Velocidad <select value={rate} onChange={e=>{const value=Number(e.target.value);setRate(value);applyRate(value);}}><option value={.25}>0.25×</option><option value={.5}>0.5×</option><option value={1}>1×</option></select></label>
   <label className="pose-scrub">Recorrido del clip · {progress.toFixed(0)}%
    <input aria-label="Posición de ambos videos" type="range" min="0" max="100" step=".1" value={progress} disabled={!readyA||!readyB} onChange={e=>seek(Number(e.target.value))}/>
   </label>
  </div>
  {error&&<p role="alert">{error}</p>}
  <div className="pose-comparison-grid">
   <PoseVideo skeletonOnly ref={a} sessionId={sessionA?.id} title="ANTES · Evaluación inicial" showSkeleton={showSkeleton} canAnalyze={canAnalyze} controls={false} onReady={setReadyA} onEnded={repeat}
    onTime={(time,duration)=>{if(duration>0){const fraction=time/duration;setProgress(fraction*100);const other=b.current;if(playing&&other?.duration()>0&&Math.abs(other.time()-fraction*other.duration())>.15)other.seek(fraction);}}}/>
   <PoseVideo skeletonOnly ref={b} sessionId={sessionB?.id} title="DESPUÉS · Control posterior" showSkeleton={showSkeleton} canAnalyze={canAnalyze} controls={false} onReady={setReadyB} onEnded={repeat}/>
  </div>
  <p className="pose-comparison-note">Repetición continua hasta pulsar Pausar. Solo se muestra el esqueleto vectorial detectado; el video original permanece oculto. La sincronización usa el porcentaje de duración del clip; no identifica ni alinea automáticamente fases de la zancada. Si una articulación no se detecta con confianza, no se dibuja.</p>
 </section>;
}
