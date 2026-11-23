// Bloques de detalle de un análisis (ADR-026). Muestran solo lo que el análisis guardó; lo que falta se dice.
import {useMemo,useState} from 'react';
import {AlertTriangle,CheckCircle2,Lightbulb,MessageSquareQuote,Ban,TrendingDown,TrendingUp,Minus} from 'lucide-react';
import {f1,useAncho} from './GraficosIpt.jsx';
import {
 ESTADO_VARIABLE,GLOSARIO,calidadToma,datosSprint,diferenciasEntre,explicacion,focoDelAtleta,motivosConfianza,
 perfilComparado,resumenAtleta,tablaVariables,valoresPorPaso
} from '../services/detalleAnalisis.js';
import {bandaZ,limiteZ} from '../services/informeIpt.js';

const nf=(v,d)=>v==null?'—':Number(v).toLocaleString('es-CL',{minimumFractionDigits:d,maximumFractionDigits:d});
/** Valor con su unidad y los decimales que tienen sentido para cada una. */
export function valorConUnidad(v,unidad){
 if(v==null)return '—';
 if(unidad==='s')return nf(v,3)+' s';
 if(unidad==='Hz')return nf(v,2)+' pasos/s';
 if(unidad==='%')return nf(v,1)+' %';
 return nf(v,1)+(unidad?(unidad==='°'?'°':' '+unidad):'');
}
const zTexto=z=>z==null?'—':(Math.abs(z)<0.05?'':z>0?'+':'−')+f1(Math.abs(z));
const fechaCorta=v=>new Date(v).toLocaleDateString('es-CL',{day:'numeric',month:'short',year:'numeric'});

/** Ritmo del sprint: frecuencia de paso, tiempos de apoyo y vuelo, y pasos medidos. */
export function DatosSprint({analysis}){
 const d=datosSprint(analysis);
 if(!d)return null;
 const tile=(etiqueta,f,extra)=><div className="da-tile" key={etiqueta}>
  <span className="da-tile-label">{etiqueta}</span>
  <strong className="da-tile-value">{f?valorConUnidad(f.media,f.unidad):'—'}</strong>
  <small>{!f?'No medido en este video':f.estado==='no_comparable'?(f.motivo||'Sin comparar con la referencia'):f.refMedia!=null?'Ref. '+valorConUnidad(f.refMedia,f.unidad)+' ± '+nf(f.refDe,f.unidad==='s'?3:2):extra||'Sin referencia publicada'}</small>
 </div>;
 return <div className="da-tiles" aria-label="Datos del sprint">
  {tile('Frecuencia de paso',d.frecuencia)}
  {tile('Tiempo de apoyo',d.apoyo)}
  {tile('Tiempo de vuelo',d.vuelo,'Sin referencia publicada')}
  <div className="da-tile"><span className="da-tile-label">Pasos medidos</span><strong className="da-tile-value">{d.pasos??'—'}</strong><small>Contactos con el suelo detectados</small></div>
 </div>;
}

/** Controles de calidad de la toma, con lo que conviene corregir en la próxima grabación. */
export function CalidadToma({analysis,compacto=false}){
 const c=calidadToma(analysis);
 const motivos=motivosConfianza(analysis);
 if(!c)return <p className="da-empty">Este análisis no guardó los controles de calidad de la toma.</p>;
 return <div className="da-quality">
  {!compacto&&<p className="da-quality-meta">
   {[c.resumen.resolucion,c.resumen.fps!=null&&nf(c.resumen.fps,0)+' c/s en el archivo',c.resumen.duracion!=null&&nf(c.resumen.duracion,1)+' s',
    c.resumen.sentido!=null&&(c.resumen.sentido>0?'carrera hacia la derecha':'carrera hacia la izquierda')].filter(Boolean).join(' · ')}
  </p>}
  <ul className="da-checks">
   {c.items.map(i=><li key={i.clave} className={i.ok?'ok':'warn'}>
    {i.ok?<CheckCircle2 size={17} aria-hidden="true"/>:<AlertTriangle size={17} aria-hidden="true"/>}
    <span><strong>{i.etiqueta}: {i.valor}</strong>{!compacto&&<small>{i.detalle}</small>}</span>
   </li>)}
  </ul>
  {motivos.length>0&&<p className="da-note">Confianza reducida: {motivos.join(' ')}</p>}
 </div>;
}

/** Tabla de variables por fase con la estadística de los pasos. Reemplaza el JSON crudo del análisis. */
export function TablaVariables({analysis}){
 const fases=tablaVariables(analysis);
 if(!fases.length)return <p className="da-empty">Este análisis es anterior a la medición por paso: no tiene variables por fase.</p>;
 return <div className="da-table">
  {fases.map(g=><section key={g.fase} className="da-phase">
   <h4>{g.fase}</h4>
   <ul>
    {g.filas.map(f=>{const est=ESTADO_VARIABLE[f.estado];return <li key={f.variable} className="da-var">
     <div className="da-var-head">
      <span className="da-var-name">{f.etiqueta}{f.enIpt&&<span className="da-badge" title="Entra al cálculo del IPT">IPT</span>}</span>
      <span className="da-var-value">{valorConUnidad(f.media,f.unidad)}</span>
     </div>
     <div className="da-var-meta">
      {f.de!=null&&<span>DE {valorConUnidad(f.de,f.unidad).replace(' pasos/s','')}</span>}
      {f.cv!=null&&<span>CV {nf(f.cv,1)} %</span>}
      {f.n!=null&&<span>n = {f.n} pasos</span>}
      {f.ic95&&<span>IC 95 % {valorConUnidad(f.ic95[0],f.unidad).replace(/ .*/,'')}–{valorConUnidad(f.ic95[1],f.unidad)}</span>}
     </div>
     <div className="da-var-ref">
      {f.refMedia!=null&&<span>Ref. {valorConUnidad(f.refMedia,f.unidad)} ± {nf(f.refDe,f.unidad==='s'?3:f.unidad==='Hz'?2:1)}</span>}
      {f.z!=null&&<span className={'da-z '+(bandaZ(f.z)||'')}>{zTexto(f.z)} DE</span>}
      {est&&<span className={'da-state '+est.tono}>{est.texto}</span>}
     </div>
     {f.bilateral&&f.bilateral.a!=null&&f.bilateral.b!=null&&<div className="da-var-legs">Pierna A {valorConUnidad(f.bilateral.a,f.unidad)} · Pierna B {valorConUnidad(f.bilateral.b,f.unidad)}</div>}
     {(f.motivo||f.definicion)&&<details className="da-var-more"><summary>Qué mide</summary>
      {f.definicion&&<p>{f.definicion}</p>}{f.motivo&&<p>{f.motivo}</p>}
      {GLOSARIO[f.variable]?.simple&&<p><em>{GLOSARIO[f.variable].simple}</em></p>}
     </details>}
    </li>;})}
   </ul>
  </section>)}
  <p className="da-note">DE y CV: variación entre los pasos del mismo video. "IPT": la variable entra al índice. Las variables de ritmo dependen de la velocidad y del largo de pierna, y no entran al IPT.</p>
 </div>;
}

/** Causa probable, indicación verbal y error a evitar de la prescripción. */
export function PorQue({analysis}){
 const e=explicacion(analysis);
 if(!e)return null;
 return <div className="da-why">
  {e.causa&&<div><Lightbulb size={18} aria-hidden="true"/><span><strong>Por qué{e.sector?' · '+e.sector:''}</strong>{e.causa}</span></div>}
  {e.cue&&<div><MessageSquareQuote size={18} aria-hidden="true"/><span><strong>Indicación para el atleta</strong>«{e.cue}»</span></div>}
  {e.evitar&&<div><Ban size={18} aria-hidden="true"/><span><strong>Error a evitar</strong>{e.evitar}</span></div>}
 </div>;
}

/** Valores de una variable en cada paso del video, con la banda de referencia (media ± 1 DE). */
export function GraficoPasos({analysis}){
 const opciones=useMemo(()=>tablaVariables(analysis).flatMap(g=>g.filas).filter(f=>valoresPorPaso(analysis,f.variable).length>=2),[analysis]);
 const [sel,setSel]=useState('');
 const fila=opciones.find(o=>o.variable===sel)||opciones.find(o=>o.variable==='rodilla_min_balanceo')||opciones[0];
 const [ref,ancho]=useAncho();
 if(!fila)return <p className="da-empty">Este análisis no guardó los valores de cada paso.</p>;
 const pasos=valoresPorPaso(analysis,fila.variable);
 const vals=pasos.map(p=>p.valor).concat(fila.refMedia!=null?[fila.refMedia-fila.refDe,fila.refMedia+fila.refDe]:[]);
 let lo=Math.min(...vals),hi=Math.max(...vals);const pad=(hi-lo||1)*0.15;lo-=pad;hi+=pad;
 const alto=190,m={t:12,r:12,b:26,l:44},w=Math.max(0,ancho-m.l-m.r),h=alto-m.t-m.b;
 const x=i=>m.l+(pasos.length===1?w/2:(i/(pasos.length-1))*w),y=v=>m.t+h-(v-lo)/(hi-lo)*h;
 const dec=fila.unidad==='s'?3:fila.unidad==='Hz'?2:1;
 const ticks=[lo+pad,(lo+hi)/2,hi-pad];
 return <div className="da-steps">
  <label className="form-field da-steps-select"><span>Variable</span>
   <select value={fila.variable} onChange={e=>setSel(e.target.value)}>{opciones.map(o=><option key={o.variable} value={o.variable}>{o.etiqueta}</option>)}</select>
  </label>
  <div ref={ref} className="ipt-chart">{ancho>0&&<svg width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label={`${fila.etiqueta} en ${pasos.length} pasos`}>
   {fila.refMedia!=null&&<rect className="da-ref-band" x={m.l} width={w} y={y(fila.refMedia+fila.refDe)} height={Math.max(0,y(fila.refMedia-fila.refDe)-y(fila.refMedia+fila.refDe))}/>}
   {fila.refMedia!=null&&<line className="da-ref-line" x1={m.l} x2={m.l+w} y1={y(fila.refMedia)} y2={y(fila.refMedia)}/>}
   {ticks.map((t,i)=><text key={i} className="ipt-axis" x={m.l-6} y={y(t)} dy="0.32em" textAnchor="end">{nf(t,dec)}</text>)}
   {fila.media!=null&&<line className="da-mean-line" x1={m.l} x2={m.l+w} y1={y(fila.media)} y2={y(fila.media)}/>}
   {pasos.map((p,i)=><circle key={i} className={'da-step '+(p.pierna==='B'?'b':'a')} cx={x(i)} cy={y(p.valor)} r={4.5}><title>{`Paso ${p.i}${p.pierna?' · pierna '+p.pierna:''}: ${valorConUnidad(p.valor,fila.unidad)}`}</title></circle>)}
   {pasos.map((p,i)=>(i===0||i===pasos.length-1||(pasos.length<=12&&i%2===0))&&<text key={'t'+i} className="ipt-axis" x={x(i)} y={alto-8} textAnchor="middle">{p.i}</text>)}
  </svg>}</div>
  <ul className="ipt-legend" aria-hidden="true">
   <li><span className="ipt-key dot da-a"/>Pierna A</li><li><span className="ipt-key dot da-b"/>Pierna B</li>
   <li><span className="da-key-mean"/>Media del atleta</li>{fila.refMedia!=null&&<li><span className="da-key-band"/>Referencia ± 1 DE</li>}
  </ul>
  <p className="da-note">Eje horizontal: número de paso. Las piernas A y B se identifican por la alternancia de los apoyos, no por los rótulos de MediaPipe.</p>
 </div>;
}

/** Perfil de dos sesiones superpuesto: marca hueca = antes, marca llena = después. */
export function PerfilComparado({antes,despues}){
 const filas=perfilComparado(antes,despues);
 if(!filas.length)return <p className="da-empty">Las sesiones elegidas no tienen perfil por variable (requiere IPT v3 en ambas).</p>;
 const L=limiteZ(filas.flatMap(f=>[f.zAntes,f.zDespues].filter(z=>z!=null).map(z=>({z})))),pos=z=>50+Math.max(-1,Math.min(1,z/L))*50;
 return <div className="da-compare-profile">
  <ul>{filas.map(f=><li key={f.variable}>
   <div className="ipt-row-head"><span className="ipt-row-label">{f.etiqueta}</span>
    <span className="da-compare-z">{zTexto(f.zAntes)} → <b className={bandaZ(f.zDespues)||''}>{zTexto(f.zDespues)}</b> DE</span></div>
   <div className="ipt-track">
    <span className="ipt-track-zone two" style={{left:pos(-2)+'%',width:(pos(2)-pos(-2))+'%'}}/>
    <span className="ipt-track-zone one" style={{left:pos(-1)+'%',width:(pos(1)-pos(-1))+'%'}}/>
    <span className="ipt-track-center"/>
    {f.zAntes!=null&&f.zDespues!=null&&<span className="da-compare-link" style={{left:Math.min(pos(f.zAntes),pos(f.zDespues))+'%',width:Math.abs(pos(f.zDespues)-pos(f.zAntes))+'%'}}/>}
    {f.zAntes!=null&&<span className="da-mark antes" style={{left:pos(f.zAntes)+'%'}}/>}
    {f.zDespues!=null&&<span className={'da-mark despues '+(bandaZ(f.zDespues)||'')} style={{left:pos(f.zDespues)+'%'}}/>}
   </div>
  </li>)}</ul>
  <ul className="ipt-legend" aria-hidden="true"><li><span className="ipt-key hollow"/>Sesión inicial</li><li><span className="ipt-key dot"/>Sesión de control</li><li>Centro = referencia</li></ul>
 </div>;
}

/** Diferencias por variable entre dos sesiones, con el criterio de cambio real (IC sin superposición). */
export function TablaDiferencias({antes,despues}){
 // Primero los cambios reales; dentro de cada grupo se mantiene el orden de las fases.
 const filas=diferenciasEntre(antes,despues).map((f,i)=>({...f,i})).sort((x,y)=>(y.real===true)-(x.real===true)||x.i-y.i);
 if(!filas.length)return <p className="da-empty">No hay variables medidas en ambas sesiones para comparar.</p>;
 return <div className="da-diff">
  <ul>{filas.map(f=><li key={f.variable}>
   <span className="da-diff-name">{f.etiqueta}<small>{f.fase}</small></span>
   <span className="da-diff-values">{valorConUnidad(f.antes,f.unidad)} → <b>{valorConUnidad(f.despues,f.unidad)}</b></span>
   <span className={'da-diff-tag '+(f.real==null?'muted':f.real?(f.seAcerca===false?'warn':'ok'):'muted')}>
    {f.real==null?'Sin IC':f.real?(f.seAcerca==null?'Cambio real':f.seAcerca?'Se acerca a la ref.':'Se aleja de la ref.'):'Dentro de la variabilidad'}
   </span>
  </li>)}</ul>
  <p className="da-note">Cambio real: los intervalos de confianza de los pasos de ambas sesiones no se superponen.</p>
 </div>;
}

/** Resumen técnico del atleta en su ficha. */
export function ResumenAtleta({sessions}){
 const r=resumenAtleta(sessions);
 const T={sube:[TrendingUp,'ok','Mejora real'],baja:[TrendingDown,'bad','Baja real'],estable:[Minus,'','Sin cambio real']}[r.tendencia];
 const Icono=T?.[0];
 return <div className="da-summary">
  <div><small>Último IPT v3</small><strong>{r.ultimo?f1(r.ultimo.ipt):'—'}</strong>{r.ultimo&&<em>{fechaCorta(r.ultimo.fecha)}</em>}</div>
  <div><small>Mejor IPT v3</small><strong>{r.mejor?f1(r.mejor.ipt):'—'}</strong>{r.mejor&&<em>{fechaCorta(r.mejor.fecha)}</em>}</div>
  <div><small>Tendencia</small>{T?<strong className={'da-trend '+T[1]}><Icono size={18} aria-hidden="true"/>{T[2]}</strong>:<strong>—</strong>}
   <em>{T?'Últimas dos sesiones':'Necesita dos sesiones v3'}</em></div>
  <div><small>A trabajar con más frecuencia</small><strong className="da-summary-text">{r.recurrente?.etiqueta||'—'}</strong>
   <em>{r.recurrente?`La más alejada en ${r.recurrente.veces} de ${r.recurrente.de} análisis`:'Sin variable repetida'}</em></div>
 </div>;
}

/** Foco del atleta: la variable más alejada de la referencia, explicada en lenguaje simple. */
export function FocoAtleta({analysis}){
 const f=focoDelAtleta(analysis);
 if(!f)return null;
 return <div className={'da-focus '+f.banda}>
  <span className="mh-kicker">Tu foco</span>
  <strong>{f.etiqueta}</strong>
  {f.simple&&<p>{f.simple}</p>}
  <p className="da-focus-z">Hoy está {f1(Math.abs(f.z))} DE {f.sentido==='mayor'?'por encima':'por debajo'} de los velocistas de referencia. Tu entrenador te indicará cómo trabajarlo.</p>
 </div>;
}

const PESTANAS=[['variables','Variables'],['pasos','Paso a paso'],['ritmo','Ritmo'],['calidad','Calidad']];
/** Detalle técnico de una sesión en pestañas: variables por fase, paso a paso, ritmo y calidad. */
export function DetalleSesion({analysis,idBase,porQue=true}){
 const [tab,setTab]=useState('variables');
 if(!analysis)return null;
 return <div className="da-detail">
  {porQue&&<PorQue analysis={analysis}/>}
  <div className="da-tabs" role="tablist" aria-label="Detalle técnico">
   {PESTANAS.map(([k,t])=><button key={k} type="button" role="tab" id={idBase+'-tab-'+k} aria-selected={tab===k} aria-controls={idBase+'-panel'} onClick={()=>setTab(k)}>{t}</button>)}
  </div>
  <div role="tabpanel" id={idBase+'-panel'} aria-labelledby={idBase+'-tab-'+tab}>
   {tab==='variables'&&<TablaVariables analysis={analysis}/>}
   {tab==='pasos'&&<GraficoPasos analysis={analysis}/>}
   {tab==='ritmo'&&<DatosSprint analysis={analysis}/>}
   {tab==='calidad'&&<CalidadToma analysis={analysis}/>}
  </div>
 </div>;
}
