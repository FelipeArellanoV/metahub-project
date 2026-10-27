const BASE=import.meta.env.VITE_API_BASE || (location.hostname==='localhost'?'http://localhost:3000':'');
export async function clubRequest(path,method='GET',body,signal) {
 const res=await fetch(BASE+'/api'+path,{
  method,signal,cache:'no-store',
  headers:{'Content-Type':'application/json',Authorization:'Bearer '+(localStorage.getItem('metahub_token')||'')},
  ...(body?{body:JSON.stringify(body)}:{})
 });
 const data=await res.json().catch(()=>({}));
 if(!res.ok) {
  const error=new Error(data.error||'No se pudo consultar el servidor.');
  error.status=res.status;
  if(res.status===401){localStorage.removeItem('metahub_token');localStorage.removeItem('metahub_user');location.assign('/app.html#/login');}
  throw error;
 }
 return data;
}
