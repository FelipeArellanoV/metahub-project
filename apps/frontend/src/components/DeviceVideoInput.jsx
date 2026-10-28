import {useEffect,useRef,useState} from 'react';
import {Camera,Video,Upload,Square,Power} from 'lucide-react';
import '../device-video.css';
export default function DeviceVideoInput({disabled,onFile}){
 const video=useRef(null),stream=useRef(null),recorder=useRef(null),chunks=useRef([]),clock=useRef(null),mounted=useRef(true),tooLarge=useRef(false);
 const [active,setActive]=useState(false),[recording,setRecording]=useState(false),[seconds,setSeconds]=useState(0),[error,setError]=useState(''),[opening,setOpening]=useState(false),[devices,setDevices]=useState([]),[deviceId,setDeviceId]=useState('');
 const onFileRef=useRef(onFile);onFileRef.current=onFile;
 function stopRecording(){if(recorder.current&&recorder.current.state!=='inactive')recorder.current.stop();}
 function stopCamera(){stopRecording();stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;if(video.current)video.current.srcObject=null;setActive(false);}
 useEffect(()=>{mounted.current=true;return()=>{
  mounted.current=false;clearInterval(clock.current);if(recorder.current?.state==='recording')recorder.current.stop();
  stream.current?.getTracks().forEach(track=>track.stop());
 };},[]);
 async function openCamera(){
  setError('');
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){
   setError('La cámara en vivo requiere HTTPS o localhost. En el celular usa Grabar con la cámara del celular o Elegir video.');
   return;
  }
  setOpening(true);
  try{
   stream.current?.getTracks().forEach(track=>track.stop());
   const media=await navigator.mediaDevices.getUserMedia({
    video:deviceId?{deviceId:{exact:deviceId},width:{ideal:1280},height:{ideal:720}}:
     {facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30}},audio:false
   });
   if(!mounted.current){media.getTracks().forEach(track=>track.stop());return;}
   stream.current=media;if(video.current){video.current.srcObject=media;await video.current.play();}
   setActive(true);
   const list=await navigator.mediaDevices.enumerateDevices();
   if(mounted.current)setDevices(list.filter(item=>item.kind==='videoinput'));
  }catch(e){
   stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;setActive(false);
   if(mounted.current)setError(e.name==='NotAllowedError'?'Permiso de cámara denegado. Habilítalo para este sitio o elige un video.':
    e.name==='NotFoundError'?'No se encontró una cámara en este dispositivo.':
    'No fue posible abrir la cámara. Puede estar ocupada por otra aplicación.');
  }finally{if(mounted.current)setOpening(false);}
 }
 function startRecording(){
  setError('');
  if(!stream.current){setError('Primero enciende la cámara.');return;}
  if(!window.MediaRecorder){setError('Este navegador no graba desde la vista previa. Usa el botón de cámara nativa.');return;}
  try{
   const options=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/mp4','video/webm'];
   const mime=options.find(type=>MediaRecorder.isTypeSupported(type));
   const media=new MediaRecorder(stream.current,mime?{mimeType:mime}:undefined);
   recorder.current=media;chunks.current=[];tooLarge.current=false;let size=0;
   media.ondataavailable=event=>{
    if(!event.data.size)return;size+=event.data.size;
    if(size>50*1024*1024){tooLarge.current=true;stopRecording();return;}
    chunks.current.push(event.data);
   };
   media.onerror=()=>{if(mounted.current)setError('La grabación falló. Puedes cargar un video desde el dispositivo.');stopRecording();};
   media.onstop=()=>{
    clearInterval(clock.current);if(!mounted.current)return;setRecording(false);
    if(tooLarge.current){setError('La grabación superó 50 MB. Graba un clip más corto.');return;}
    const type=(media.mimeType||chunks.current[0]?.type||'video/webm').split(';')[0];
    const blob=new Blob(chunks.current,{type});
    if(!blob.size){setError('La grabación está vacía. Vuelve a intentarlo.');return;}
    onFileRef.current(new File([blob],'carrera-'+Date.now()+(type.includes('mp4')?'.mp4':'.webm'),{type}));
   };
   media.start(500);onFileRef.current(null);setSeconds(0);setRecording(true);let elapsed=0;
   clock.current=setInterval(()=>{elapsed++;if(mounted.current)setSeconds(elapsed);if(elapsed>=120)stopRecording();},1000);
  }catch(e){setError('Este dispositivo no pudo iniciar la grabación. Usa la cámara nativa o elige un video.');setRecording(false);}
 }
 function picked(event){const file=event.target.files?.[0];if(file)onFileRef.current(file);event.target.value='';}
 return <div className="device-video">
  <div className="device-camera-preview">
   <video ref={video} muted playsInline autoPlay aria-label="Vista previa de la cámara"/>
   {!active&&<div className="device-camera-placeholder"><Camera size={36}/><strong>Cámara del dispositivo</strong><span>Actívala para encuadrar la pasada</span></div>}
   {recording&&<span className="device-recording" role="status">● Grabando · {seconds}s / 120s</span>}
  </div>
  {devices.length>1&&<label className="form-field"><span>Cámara disponible</span><select value={deviceId} disabled={disabled||recording||opening} onChange={e=>setDeviceId(e.target.value)}>
   <option value="">Cámara trasera o predeterminada</option>{devices.map((item,index)=><option key={item.deviceId} value={item.deviceId}>{item.label||'Cámara '+(index+1)}</option>)}
  </select><small>Pulsa Activar cámara para aplicar la selección.</small></label>}
  <div className="device-video-actions">
   <button type="button" className="secondary-button" disabled={disabled||recording||opening} onClick={openCamera}><Camera size={17}/>{opening?'Abriendo…':'Activar cámara'}</button>
   {active&&!recording&&<button type="button" className="primary-button" disabled={disabled} onClick={startRecording}><Video size={17}/>Grabar pasada</button>}
   {recording&&<button type="button" className="secondary-button" onClick={stopRecording}><Square size={17}/>Detener grabación</button>}
   {active&&!recording&&<button type="button" className="secondary-button" onClick={stopCamera}><Power size={17}/>Apagar cámara</button>}
  </div>
  <div className="device-file-options">
   <label className="device-file-button"><Camera size={20}/><strong>Grabar con la cámara del celular</strong><small>Si el navegador lo admite, abre la cámara nativa.</small>
    <input type="file" accept="video/*" capture="environment" disabled={disabled||recording} onClick={stopCamera} onChange={picked}/>
   </label>
   <label className="device-file-button"><Upload size={20}/><strong>Elegir video</strong><small>Selecciona un archivo desde galería o computador.</small>
    <input type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" disabled={disabled||recording} onChange={picked}/>
   </label>
  </div>
  {error&&<p role="alert">{error}</p>}
 </div>;
}
