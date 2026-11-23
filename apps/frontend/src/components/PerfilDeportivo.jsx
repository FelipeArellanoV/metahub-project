// Perfil deportivo del atleta (ADR-026): prueba principal, pierna dominante, estatura y mejor marca.
// Contexto para el entrenador y el informe; no entra al IPT.
import {useEffect,useState} from 'react';
import {Pencil} from 'lucide-react';
import {clubRequest} from '../services/roster.js';

export const PRUEBAS={'60m':'60 m','80m':'80 m','100m':'100 m','150m':'150 m','200m':'200 m','400m':'400 m',vallas:'Vallas',relevos:'Relevos',otra:'Otra'};
const vacio={mainEvent:'',dominantLeg:'',heightCm:'',bestMark:''};

/** Texto corto del perfil para cabeceras: "100 m · pierna derecha · 172 cm · 12,45 s". */
export function resumenPerfil(p){
 if(!p)return '';
 return [p.mainEvent&&PRUEBAS[p.mainEvent],p.dominantLeg&&'pierna '+p.dominantLeg,p.heightCm&&p.heightCm+' cm',p.bestMark&&'MM '+p.bestMark].filter(Boolean).join(' · ');
}

export default function PerfilDeportivo({athleteId,perfil,canEdit,onSaved}){
 const [editando,setEditando]=useState(false),[form,setForm]=useState(vacio),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{setForm(perfil?{mainEvent:perfil.mainEvent||'',dominantLeg:perfil.dominantLeg||'',heightCm:perfil.heightCm??'',bestMark:perfil.bestMark||''}:vacio);},[perfil,athleteId]);
 const set=k=>e=>setForm(f=>({...f,[k]:e.target.value}));
 async function guardar(e){
  e.preventDefault();setBusy(true);setError('');
  try{const r=await clubRequest('/roster/'+athleteId+'/perfil','PUT',form);setEditando(false);onSaved?.(r.sportProfile);}
  catch(err){setError(err.message);}finally{setBusy(false);}
 }
 if(editando)return <form className="pd-form" onSubmit={guardar}>
  <label className="form-field"><span>Prueba principal</span><select value={form.mainEvent} onChange={set('mainEvent')}>
   <option value="">Sin registrar</option>{Object.entries(PRUEBAS).map(([k,t])=><option key={k} value={k}>{t}</option>)}</select></label>
  <label className="form-field"><span>Pierna dominante</span><select value={form.dominantLeg} onChange={set('dominantLeg')}>
   <option value="">Sin registrar</option><option value="derecha">Derecha</option><option value="izquierda">Izquierda</option></select></label>
  <label className="form-field"><span>Estatura (cm)</span><input type="number" inputMode="numeric" min="100" max="230" step="1" value={form.heightCm} onChange={set('heightCm')}/></label>
  <label className="form-field"><span>Mejor marca</span><input maxLength={60} placeholder="Ej.: 12,45 s en 100 m" value={form.bestMark} onChange={set('bestMark')}/></label>
  {error&&<p role="alert" className="pd-error">{error}</p>}
  <div className="pd-actions"><button className="primary-button" disabled={busy}>{busy?'Guardando…':'Guardar'}</button>
   <button type="button" className="secondary-button" disabled={busy} onClick={()=>{setEditando(false);setError('');}}>Cancelar</button></div>
 </form>;
 const p=perfil||{};
 return <div className="pd-view">
  <dl className="pd-facts">
   <div><dt>Prueba</dt><dd>{p.mainEvent?PRUEBAS[p.mainEvent]:'—'}</dd></div>
   <div><dt>Pierna dominante</dt><dd>{p.dominantLeg?p.dominantLeg[0].toUpperCase()+p.dominantLeg.slice(1):'—'}</dd></div>
   <div><dt>Estatura</dt><dd>{p.heightCm?p.heightCm+' cm':'—'}</dd></div>
   <div><dt>Mejor marca</dt><dd>{p.bestMark||'—'}</dd></div>
  </dl>
  {canEdit&&<button type="button" className="text-button pd-edit" onClick={()=>setEditando(true)}><Pencil size={14} aria-hidden="true"/>{perfil?'Editar datos deportivos':'Agregar datos deportivos'}</button>}
 </div>;
}
