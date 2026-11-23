// Informe de una sesión (ADR-025): IPT v3 con IC, perfil por variable, evolución, hallazgos, observación del
// entrenador y ejercicios. Se descarga como PDF con el diálogo de impresión del navegador ("Guardar como PDF").
// Solo muestra datos guardados; lo que falta se dice.
import {useEffect,useMemo,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {ArrowLeft,Download} from 'lucide-react';
import {Layout,PageHeader} from '../components/UI.jsx';
import {SkeletonList} from '../components/Motion.jsx';
import {EvolucionIpt,LecturaIpt,PerfilIpt,f1} from '../components/GraficosIpt.jsx';
import {clubRequest} from '../services/roster.js';
import api from '../services/api.js';
import {resumenDeAnalisis} from '../services/analisisSesion.js';
import {decimalesCl,fasesDeAnalisis,perfilDeAnalisis,serieEvolucion,versionIpt} from '../services/informeIpt.js';
import {PRUEBAS} from '../components/PerfilDeportivo.jsx';
import {CalidadToma,DatosSprint,GraficoPasos,PorQue,TablaVariables} from '../components/DetalleAnalisis.jsx';
import {bandaDeEdad,dosisPara,ejerciciosParaHallazgos} from '../services/catalogoEjercicios.js';

const fecha=v=>new Date(v).toLocaleDateString('es-CL',{day:'numeric',month:'long',year:'numeric'});
const fechaHora=v=>new Date(v).toLocaleString('es-CL',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
const ESTADO_REVISION={pending:'Pendiente de revisión',reviewed:'Revisada',requires_new_video:'Se solicitó una nueva captura'};
const CONFIANZA={alta:'Alta',media:'Media',baja:'Baja'};

function PorQueSeccion({analysis}){
 return <section className="informe-seccion"><h2>Interpretación y foco</h2><PorQue analysis={analysis}/></section>;
}

export default function InformeSesion(){
 let coach=false;try{coach=JSON.parse(localStorage.getItem('metahub_user')||'{}').role==='entrenador';}catch{}
 const [query,setQuery]=useSearchParams();
 const athleteId=query.get('athleteId')||'',sessionId=query.get('sessionId')||'';
 const [datos,setDatos]=useState(null),[ficha,setFicha]=useState(null),[error,setError]=useState('');
 useEffect(()=>{
  if(coach&&!athleteId){setError('Falta el atleta. Abre el informe desde su ficha o desde Inicio.');return undefined;}
  const abort=new AbortController();setDatos(null);setError('');
  clubRequest('/reviews'+(coach?'?athleteId='+encodeURIComponent(athleteId):''),'GET',undefined,abort.signal)
   .then(setDatos).catch(e=>{if(e.name!=='AbortError')setError(e.message);});
  // Datos de la ficha (edad, club, entrenador). Si fallan, el informe sigue sin ellos.
  (coach?clubRequest('/roster/'+encodeURIComponent(athleteId),'GET',undefined,abort.signal).then(r=>r.athlete)
   :api.portal.getMe().then(r=>r.athlete)).then(setFicha).catch(()=>{});
  return()=>abort.abort();
 },[coach,athleteId]);

 const sesiones=datos?.sessions||[];
 const conAnalisis=sesiones.filter(s=>s.analysis);
 const sesion=sesiones.find(s=>String(s.id)===sessionId)||conAnalisis[0]||null;
 const a=sesion?.analysis||null;
 const r=sesion?resumenDeAnalisis(sesion):null;
 const perfil=useMemo(()=>perfilDeAnalisis(a),[a]);
 const fases=useMemo(()=>fasesDeAnalisis(a),[a]);
 // La evolución llega hasta la sesión del informe: un informe antiguo no muestra sesiones posteriores.
 const serie=useMemo(()=>serieEvolucion(sesion?sesiones.filter(s=>new Date(s.sessionDate)<=new Date(sesion.sessionDate)):[]),[sesiones,sesion]);
 const tareas=(datos?.tasks||[]).filter(t=>t.sessionId===sesion?.id);
 const ejercicios=ejerciciosParaHallazgos(r?.hallazgos);
 const banda=bandaDeEdad(ficha?.age);
 const nombre=datos?.athlete.name||ficha?.name||'';
 const v=versionIpt(a);

 useEffect(()=>{
  if(!sesion||!nombre)return undefined;
  const previo=document.title;
  document.title=`Informe IPT · ${nombre} · ${new Date(sesion.sessionDate).toLocaleDateString('es-CL')}`;
  return()=>{document.title=previo;};
 },[sesion,nombre]);

 const volver=coach?'/':'/portal';
 return <Layout><div className="informe">
  <PageHeader eyebrow="INFORME" title="Informe de la sesión" description="Descárgalo en PDF para compartirlo con el atleta, su familia o el cuerpo técnico."/>
  <div className="informe-actions">
   <Link className="secondary-button" to={volver}><ArrowLeft size={16}/>Volver</Link>
   {conAnalisis.length>1&&<label>Sesión del informe
    <select className="select-control" value={String(sesion?.id||'')} onChange={e=>setQuery(coach?{athleteId,sessionId:e.target.value}:{sessionId:e.target.value})}>
     {conAnalisis.map(s=><option key={s.id} value={s.id}>{fecha(s.sessionDate)} · #{s.id} · {s.iptScore==null?'sin IPT':'IPT '+f1(s.iptScore)}</option>)}
    </select></label>}
   <button className="primary-button" type="button" disabled={!sesion} onClick={()=>window.print()}><Download size={16}/>Descargar PDF</button>
  </div>
  {error&&<div className="roster-message error" role="alert">{error}</div>}
  {!datos&&!error&&<div className="panel-card"><SkeletonList rows={4} label="Preparando el informe…"/></div>}
  {datos&&!sesion&&<div className="empty-card"><p>{nombre||'El atleta'} aún no tiene sesiones analizadas. El informe se genera a partir de un análisis.</p></div>}
  {datos&&sesion&&<article className="informe-hoja" aria-label={'Informe de '+nombre}>
   <header className="informe-cabecera">
    <div>
     <span className="informe-marca">MetaHub · Técnica de sprint</span>
     <h1>{nombre}</h1>
     <p>Sesión #{sesion.id} · {fecha(sesion.sessionDate)}</p>
    </div>
    <dl className="informe-meta">
     {ficha?.age!=null&&<><dt>Edad</dt><dd>{ficha.age} años{banda?' · '+banda:''}</dd></>}
     {ficha?.sportProfile?.mainEvent&&<><dt>Prueba</dt><dd>{PRUEBAS[ficha.sportProfile.mainEvent]}{ficha.sportProfile.bestMark?' · MM '+ficha.sportProfile.bestMark:''}</dd></>}
     {(ficha?.sportProfile?.heightCm||ficha?.sportProfile?.dominantLeg)&&<><dt>Físico</dt><dd>{[ficha.sportProfile.heightCm&&ficha.sportProfile.heightCm+' cm',ficha.sportProfile.dominantLeg&&'pierna '+ficha.sportProfile.dominantLeg].filter(Boolean).join(' · ')}</dd></>}
     {ficha?.organizationName&&<><dt>Club</dt><dd>{ficha.organizationName}</dd></>}
     {ficha?.trainerName&&<><dt>Entrenador</dt><dd>{ficha.trainerName}</dd></>}
     <dt>Revisión</dt><dd>{ESTADO_REVISION[sesion.reviewStatus]||'—'}</dd>
     <dt>Emitido</dt><dd>{fecha(new Date())}</dd>
    </dl>
   </header>

   <section className="informe-resumen" aria-label="Resultado">
    <div className="informe-ipt">{r.ipt==null?'—':f1(r.ipt)}<small>IPT v{v||'—'} · de 100</small></div>
    <div className="informe-resumen-texto">
     <LecturaIpt ipt={v===3?r.ipt:null}/>
     {r.ipt!=null&&r.ic95&&<p>Intervalo de confianza 95 %: <b>{f1(r.ic95[0])}–{f1(r.ic95[1])}</b>, calculado con la variabilidad entre los pasos medidos.</p>}
     {a?.provisional&&<p>Resultado provisional: falta al menos una fase (contacto, despegue o recobro) con variables comparables.</p>}
     {r.ipt==null&&<p>{r.motivoSinIpt||'Este análisis no tuvo IPT.'}</p>}
     {a?.diagnostico&&typeof a.diagnostico==='string'&&<p>{a.diagnostico}</p>}
     {v!=null&&v!==3&&<p>Este análisis usa una versión anterior del IPT, con otra escala: no es comparable con el IPT v3.</p>}
     {r.confianza&&<p>Confianza del análisis: <b>{CONFIANZA[r.confianza]||r.confianza}</b>
      {r.recomendaciones?.confianza?.motivos?.length>0&&<> · {r.recomendaciones.confianza.motivos.join(' ')}</>}</p>}
    </div>
    {fases.length>0&&<ul className="informe-fases" style={{gridColumn:'1 / -1'}}>
     {fases.map(f=><li key={f.nombre}><span>{f.nombre}</span><strong>{f.score==null?'—':f1(f.score)}</strong>{f.aparte&&<em> · no entra al IPT</em>}</li>)}
    </ul>}
   </section>

   <section className="informe-seccion">
    <h2>Perfil por variable</h2>
    <p className="informe-sub">Distancia de cada variable a la media de velocistas de referencia, en desviaciones estándar (DE).</p>
    <PerfilIpt perfil={perfil}/>
   </section>

   {a?.cinematica_eventos&&<section className="informe-seccion">
    <h2>Ritmo del sprint</h2>
    <p className="informe-sub">Frecuencia de paso y tiempos de apoyo y vuelo medidos en el video. No entran al IPT: dependen de la velocidad y del largo de pierna.</p>
    <DatosSprint analysis={a}/>
   </section>}

   <section className="informe-seccion">
    <h2>Evolución del IPT</h2>
    <p className="informe-sub">Sesiones con IPT v3 hasta la fecha de este informe.</p>
    <EvolucionIpt puntos={serie.puntos} otrasVersiones={serie.otrasVersiones}/>
   </section>

   <section className="informe-seccion">
    <h2>Hallazgos</h2>
    {r.hallazgos.length?<ul className="informe-lista">{r.hallazgos.map(h=><li key={h.id}>
     <strong>{h.titulo}</strong>
     {h.valor!=null&&<>Medido: {f1(h.valor)} {h.unidad||''}{h.umbral&&<> · Umbral: {decimalesCl(h.umbral)}</>} · </>}
     {h.interpretacion}
    </li>)}</ul>:<p className="informe-texto">{r.recomendaciones?.mensaje||(r.recomendaciones?.disponible===false?r.recomendaciones.motivo_no_disponible||'Sin hallazgos: el análisis no permitió evaluarlos.':'Ninguna variable se alejó de la referencia más allá del error del método.')}</p>}
   </section>

   {a&&<PorQueSeccion analysis={a}/>}

   {a?.cinematica_eventos&&<section className="informe-seccion">
    <h2>Variables por fase</h2>
    <p className="informe-sub">Media de los pasos medidos con su variación (DE, CV) y su intervalo de confianza, frente a la referencia.</p>
    <TablaVariables analysis={a}/>
   </section>}

   {a?.cinematica_eventos?.pasos&&<section className="informe-seccion informe-solo-pantalla">
    <h2>Paso a paso</h2>
    <p className="informe-sub">Valor de una variable en cada paso del video.</p>
    <GraficoPasos analysis={a}/>
   </section>}

   <section className="informe-seccion">
    <h2>Calidad de la toma</h2>
    <CalidadToma analysis={a}/>
   </section>

   <section className="informe-seccion">
    <h2>Observación del entrenador</h2>
    {sesion.observations?<><p className="informe-texto">{sesion.observations}</p>
     {sesion.reviewedAt&&<p className="informe-pie">Última revisión: {fechaHora(sesion.reviewedAt)}</p>}</>
     :<p className="informe-texto">Aún sin observaciones publicadas.</p>}
   </section>

   <section className="informe-seccion">
    <h2>Plan de trabajo</h2>
    {tareas.length>0&&<><p className="informe-sub">Ejercicios asignados por el entrenador para esta sesión.</p>
     <ul className="informe-lista">{tareas.map(t=><li key={t.id}><strong>{t.title} · {t.done?'Completado':'Pendiente'}</strong>
      <span className="mh-prewrap">{t.details}</span>{t.dueAt&&<> · Fecha objetivo: {fecha(t.dueAt)}</>}</li>)}</ul></>}
    {ejercicios.length>0&&<><p className="informe-sub" style={{marginTop:tareas.length?16:0}}>Sugeridos por los hallazgos (catálogo MetaHub). El entrenador define la dosis final.</p>
     <ul className="informe-lista">{ejercicios.map(d=><li key={d.id}><strong>{d.name}</strong>{d.category} · {dosisPara(d,banda)}{d.cues&&<> · {d.cues}</>}</li>)}</ul></>}
    {!tareas.length&&!ejercicios.length&&<p className="informe-texto">Sin ejercicios asignados ni sugeridos para esta sesión.</p>}
   </section>

   <section className="informe-seccion">
    <h2>Método y referencias</h2>
    <p className="informe-sub">{a?.interpretacion||'IPT = 100 − 10 · RMS(z) sobre las variables cinemáticas comparables con la referencia publicada.'}</p>
    {Array.isArray(a?.referencias)&&a.referencias.length>0&&<ol className="informe-refs">{a.referencias.map(ref=><li key={ref.parametro}><b>{ref.parametro}:</b> {ref.fuente}</li>)}</ol>}
    <p className="informe-pie">Medición 2D con video de celular y MediaPipe. El error sistemático del método frente a Kinovea puede superar la DE de la referencia, por lo que el IPT se recomienda para el seguimiento del mismo atleta con la misma forma de grabar. La referencia es de velocistas adultos; en escolares, considerar la edad antes de corregir. Resultado orientativo: no reemplaza la evaluación del entrenador. Validación del índice en curso (Arellano y Henríquez, 2026).</p>
   </section>
  </article>}
 </div></Layout>;
}
