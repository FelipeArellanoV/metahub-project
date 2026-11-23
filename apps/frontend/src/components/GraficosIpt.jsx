// Gráficos del IPT v3 (ADR-025): evolución con IC 95 % y perfil por variable.
// Dibujan solo datos guardados; si faltan, lo dicen. Colores tomados de los tokens de sport-theme.css.
import {useEffect,useRef,useState} from 'react';
import {cambioEntre,dominioEvolucion,lecturaIpt,limiteZ,TEXTO_CAMBIO} from '../services/informeIpt.js';

export const f1=v=>v==null?'—':Number(v).toLocaleString('es-CL',{minimumFractionDigits:1,maximumFractionDigits:1});
const fechaCorta=v=>new Date(v).toLocaleDateString('es-CL',{day:'numeric',month:'short'});
/** z con signo; lo que redondea a 0,0 se muestra sin signo. */
const zTexto=z=>(Math.abs(z)<0.05?'':z>0?'+':'−')+f1(Math.abs(z));
const signo=v=>(v>0?'+':v<0?'−':'')+f1(Math.abs(v));

export function useAncho(min=280){
 const ref=useRef(null),[ancho,setAncho]=useState(0);
 useEffect(()=>{
  const el=ref.current;if(!el)return undefined;
  const medir=()=>setAncho(Math.max(min,Math.round(el.getBoundingClientRect().width)));
  medir();
  if(typeof ResizeObserver==='undefined'){window.addEventListener('resize',medir);return()=>window.removeEventListener('resize',medir);}
  const ro=new ResizeObserver(medir);ro.observe(el);return()=>ro.disconnect();
 },[min]);
 return [ref,ancho];
}

/** Evolución del IPT v3 en el tiempo, con el IC 95 % de cada sesión y las bandas de 1 y 2 DE. */
export function EvolucionIpt({puntos,otrasVersiones=0,impresion=false}){
 const [ref,medido]=useAncho();
 const ancho=impresion?680:medido;
 if(!puntos.length)return <div className="ipt-chart-empty">
  <p>Aún no hay sesiones con IPT v3 para graficar.</p>
  {otrasVersiones>0&&<small>{otrasVersiones} {otrasVersiones===1?'sesión usa':'sesiones usan'} una versión anterior del IPT, con otra escala: no se mezclan en el gráfico.</small>}
 </div>;
 const alto=impresion?220:Math.round(Math.min(260,Math.max(200,ancho*0.5)));
 const m={t:14,r:44,b:30,l:34};
 const w=Math.max(0,ancho-m.l-m.r),h=alto-m.t-m.b;
 const [y0,y1]=dominioEvolucion(puntos);
 const y=v=>m.t+h-(v-y0)/(y1-y0)*h;
 const x=i=>m.l+(puntos.length===1?w/2:i*w/(puntos.length-1));
 const ticks=[];for(let v=y0;v<=y1;v+=5)ticks.push(v);
 const cada=Math.max(1,Math.ceil(puntos.length/Math.max(2,Math.floor(w/64))));
 const linea=puntos.map((p,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(p.ipt).toFixed(1)).join(' ');
 const zona=(a,b)=>{const top=y(Math.min(b,y1)),bot=y(Math.max(a,y0));return bot>top?{y:top,height:bot-top}:null;};
 const zonas=[['ok',90,100],['warn',80,90],['bad',0,80]].map(([t,a,b])=>({t,a,b,r:zona(a,b)})).filter(z=>z.r);
 const ultimo=puntos.at(-1),anterior=puntos.at(-2),cambio=cambioEntre(anterior,ultimo);
 return <div className="ipt-chart" ref={ref}>
  {ancho>0&&<svg width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} role="img"
   aria-label={`Evolución del IPT en ${puntos.length} ${puntos.length===1?'sesión':'sesiones'}. Último: ${f1(ultimo.ipt)}.`}>
   {zonas.map(z=><rect key={z.t} className={'ipt-zone '+z.t} x={m.l} width={w} y={z.r.y} height={z.r.height}/>)}
   {ticks.map(v=><g key={v}><line className="ipt-grid" x1={m.l} x2={m.l+w} y1={y(v)} y2={y(v)}/>
    <text className="ipt-axis" x={m.l-6} y={y(v)} dy="0.32em" textAnchor="end">{v}</text></g>)}
   {[90,80].filter(v=>v>y0&&v<y1).map(v=><text key={v} className="ipt-zone-label" x={m.l+w+6} y={y(v)} dy="0.32em">{v===90?'1 DE':'2 DE'}</text>)}
   {puntos.map((p,i)=>p.ic95&&<g key={'ic'+p.id} className="ipt-ci">
    <line x1={x(i)} x2={x(i)} y1={y(p.ic95[1])} y2={y(p.ic95[0])}/>
    <line x1={x(i)-5} x2={x(i)+5} y1={y(p.ic95[1])} y2={y(p.ic95[1])}/>
    <line x1={x(i)-5} x2={x(i)+5} y1={y(p.ic95[0])} y2={y(p.ic95[0])}/>
   </g>)}
   {puntos.length>1&&<path className="ipt-line" d={linea}/>}
   {puntos.map((p,i)=><g key={p.id}>
    <circle className={'ipt-dot'+(p.provisional?' is-provisional':'')} cx={x(i)} cy={y(p.ipt)} r={i===puntos.length-1?5.5:4.5}><title>{`Sesión #${p.id} · ${fechaCorta(p.fecha)} · IPT ${f1(p.ipt)}${p.ic95?` (IC 95 % ${f1(p.ic95[0])}–${f1(p.ic95[1])})`:''}${p.provisional?' · provisional':''}`}</title></circle>
    {(i%cada===0||i===puntos.length-1)&&<text className="ipt-axis" x={x(i)} y={alto-8} textAnchor="middle">{fechaCorta(p.fecha)}</text>}
   </g>)}
   <text className="ipt-last" x={x(puntos.length-1)} y={y(ultimo.ipt)-12} textAnchor={puntos.length===1?'middle':'end'}>{f1(ultimo.ipt)}</text>
  </svg>}
  <table className="mh-visually-hidden"><caption>Evolución del IPT</caption><thead><tr><th>Fecha</th><th>Sesión</th><th>IPT</th><th>IC 95 %</th></tr></thead>
   <tbody>{puntos.map(p=><tr key={p.id}><td>{fechaCorta(p.fecha)}</td><td>#{p.id}</td><td>{f1(p.ipt)}</td><td>{p.ic95?f1(p.ic95[0])+'–'+f1(p.ic95[1]):'sin IC'}</td></tr>)}</tbody></table>
  <ul className="ipt-legend" aria-hidden="true">
   <li><span className="ipt-key dot"/>IPT de la sesión</li>
   <li><span className="ipt-key ci"/>IC 95 %</li>
   {puntos.some(p=>p.provisional)&&<li><span className="ipt-key hollow"/>Provisional (falta una fase)</li>}
  </ul>
  {cambio&&<p className={'ipt-change '+(cambio.criterio==='mejora_real'?'ok':cambio.criterio==='baja_real'?'bad':'')}>
   <strong>{signo(cambio.delta)} puntos</strong> desde la sesión anterior. {TEXTO_CAMBIO[cambio.criterio]}
  </p>}
  <p className="ipt-note">Cambio mínimo detectable: pendiente del estudio test-retest. Mientras tanto, se usa la superposición de los intervalos (ADR-024).
   {otrasVersiones>0&&` ${otrasVersiones} ${otrasVersiones===1?'sesión con una versión anterior del IPT no se muestra':'sesiones con versiones anteriores del IPT no se muestran'}: usan otra escala.`}</p>
 </div>;
}

/** Perfil por variable del IPT v3: valor z de cada variable frente a la referencia (equivalente al MAP). */
export function PerfilIpt({perfil,compacto=false}){
 if(!perfil.length)return <p className="ipt-chart-empty">Este análisis no trae perfil por variable (requiere IPT v3).</p>;
 const L=limiteZ(perfil),pct=z=>Math.min(1,Math.abs(z)/L)*50;
 const marcas=[];for(let k=-L;k<=L;k++)marcas.push(k);
 return <div className={'ipt-profile'+(compacto?' is-compact':'')}>
  <ol className="ipt-profile-list">
   {perfil.map(p=><li key={p.variable} className={'ipt-row '+p.banda}>
    <div className="ipt-row-head">
     <span className="ipt-row-label">{p.etiqueta}</span>
     <span className="ipt-row-z">{zTexto(p.z)} DE</span>
    </div>
    <div className="ipt-track" role="img" aria-label={`${p.etiqueta}: ${f1(Math.abs(p.z))} DE ${p.z>=0?'sobre':'bajo'} la referencia`}>
     <span className="ipt-track-zone two" style={{left:(50-pct(2))+'%',width:2*pct(2)+'%'}}/>
     <span className="ipt-track-zone one" style={{left:(50-pct(1))+'%',width:2*pct(1)+'%'}}/>
     <span className="ipt-track-center"/>
     <span className="ipt-bar" style={p.z>=0?{left:'50%',width:pct(p.z)+'%'}:{left:(50-pct(p.z))+'%',width:pct(p.z)+'%'}}/>
    </div>
    {!compacto&&<div className="ipt-row-foot">
     <span>Medido: <b>{p.valor==null?'—':f1(p.valor)}</b>{p.referencia&&<> · Referencia: {p.referencia}</>}</span>
    </div>}
   </li>)}
  </ol>
  <div className="ipt-scale" aria-hidden="true">
   {marcas.map(k=><span key={k} style={{left:(50+k/L*50)+'%'}}>{k===0?'Ref.':(k>0?'+':'−')+Math.abs(k)}</span>)}
  </div>
  <p className="ipt-note">Barras hacia la derecha: valor mayor que la media de referencia; hacia la izquierda: menor. Zona clara: dentro de 1 DE; intermedia: entre 1 y 2 DE.</p>
 </div>;
}

/** Puntaje grande con su lectura. */
export function LecturaIpt({ipt}){
 const l=lecturaIpt(ipt);
 return l?<span className={'mh-chip '+l.tono}>{l.texto} · {l.detalle}</span>:null;
}
