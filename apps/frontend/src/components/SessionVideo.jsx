import {useEffect,useState} from 'react';
const BASE=import.meta.env.VITE_API_BASE||(location.hostname==='localhost'?'http://localhost:3000':'');
export default function SessionVideo({sessionId}){
 const [url,setUrl]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>()=>{if(url)URL.revokeObjectURL(url);},[url]);
 return <div>
 {!url&&<button disabled={busy} type="button" onClick={async()=>{
 setBusy(true);setError('');
 try{const res=await fetch(BASE+'/api/videos/'+sessionId,{headers:{Authorization:'Bearer '+(localStorage.getItem('metahub_token')||'')}});
 if(!res.ok)throw new Error('Video no disponible o sin permisos.');setUrl(URL.createObjectURL(await res.blob()));}
 catch(e){setError(e.message);}finally{setBusy(false);}
 }}>Ver video del alumno</button>}
 {url&&<video controls src={url} style={{width:'100%',maxHeight:360}}/>}
 {error&&<p role="alert">{error}</p>}
 </div>;
}
