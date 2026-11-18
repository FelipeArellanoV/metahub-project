/**
 * =========================================================================================
 * PROYECTO METAHUB — SEGUIMIENTO LONGITUDINAL DE LA TÉCNICA DE CARRERA EN ATLETISMO ESCOLAR
 * Escuela de Ingeniería Civil en Informática — Universidad Católica de Temuco
 * 
 * Memoria / Trabajo de Título:
 * Autores: Felipe Arellano Vargas & Sofía Henríquez Soto
 * Profesor Guía: Dr. Marcos Lévano
 * 
 * Módulo: Biblioteca y Prescriptor Automático de Drills Técnicos (Drills.jsx)
 * Descripción: Asignación y prescripción inteligente de ejercicios correctivos de atletismo
 *              basada en déficits cinemáticos (recobro de rodilla, asimetría, cadencia).
 * =========================================================================================
 */

import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Search,
  Sparkles,
  UserCheck,
  X
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout, PageHeader } from '../components/UI.jsx';
import api from '../services/api.js';
import { saveCollaboration } from '../services/collaboration.js';

import { AnimatePresence } from 'framer-motion';
import { EASE_OUT, cardVariants, motion } from '../components/Motion.jsx';
const initialDrills = [
  {
    id: 'D-01',
    name: 'Skipping A sobre Vallas Bajas (40cm)',
    category: 'Recobro de Rodilla',
    targetDeficit: 'knee_flexion',
    difficulty: 'intermedio',
    difficultyLabel: 'Intermedio',
    goal: 'Aumentar el ángulo de flexión de rodilla en fase de vuelo y forzar un ataque activo del pie.',
    execution: 'Colocar 6 vallas a 1.20m de distancia. Pasar con elevación rápida de rodilla a 90°, manteniendo el tobillo en flexión dorsal.',
    commonErrors: 'Echar el tronco hacia atrás para compensar falta de fuerza en el psoas.',
    cues: '«Rodilla al horizonte, tobillo armado a 90°»',
    dosingByCat: {
      'Sub-14': '3 series x 5 vallas (pausa 1:45 min)',
      'Sub-16': '4 series x 6 vallas (pausa 1:30 min)',
      'Sub-18': '5 series x 8 vallas (pausa 2:00 min)'
    },
    dosing: '4 series x 6 vallas con pausa completa (1:30 min).'
  },
  {
    id: 'D-02',
    name: 'Trabajo Propioceptivo en Tobillo Unipodal',
    category: 'Simetría & Tobillo',
    targetDeficit: 'asymmetry',
    difficulty: 'iniciacion',
    difficultyLabel: 'Iniciación',
    goal: 'Corregir asimetrías de apoyo lateral y reforzar los estabilizadores del tobillo.',
    execution: 'Apoyo monopodal sobre superficie inestable (bosu o colchoneta). Mantener equilibrio 20 segundos realizando círculos con brazos.',
    commonErrors: 'Bloquear la rodilla o colapsar el arco plantar medial.',
    cues: '«Presiona con el primer metatarsiano, cadera alta y nivelada»',
    dosingByCat: {
      'Sub-14': '3 series x 20 seg por pierna',
      'Sub-16': '3 series x 25 seg por pierna',
      'Sub-18': '4 series x 30 seg con perturbación externa'
    },
    dosing: '3 series x 25 seg por pierna.'
  },
  {
    id: 'D-03',
    name: 'Salidas Asistidas con Inclinación a 45°',
    category: 'Postura & Tronco',
    targetDeficit: 'trunk_lean',
    difficulty: 'intermedio',
    difficultyLabel: 'Intermedio',
    goal: 'Enseñar la línea de fuerza extendida desde el tobillo hasta la coronilla en los primeros 15 metros.',
    execution: 'El atleta se deja caer hacia adelante manteniendo el cuerpo recto hasta que el compañero libera la resistencia.',
    commonErrors: 'Flexionar la cintura antes del despegue, perdiendo alineación.',
    cues: '«Línea recta talón-nuca, no quiebres la cadera»',
    dosingByCat: {
      'Sub-14': '4 salidas de 10 metros',
      'Sub-16': '5 salidas de 15 metros',
      'Sub-18': '6 salidas de 20 metros'
    },
    dosing: '5 salidas de 15 metros.'
  },
  {
    id: 'D-04',
    name: 'Zancadas Reactivas en Gradas',
    category: 'Impulso & Extensión',
    targetDeficit: 'propulsion',
    difficulty: 'avanzado',
    difficultyLabel: 'Avanzado',
    goal: 'Desarrollar la potencia del glúteo mayor y la triple extensión (tobillo, rodilla y cadera).',
    execution: 'Subir gradas de 2 en 2 con empuje explosivo de la pierna trasera, minimizando el tiempo de contacto.',
    commonErrors: 'Mirar al suelo o apoyar únicamente los dedos del pie.',
    cues: '«Pisa fuerte y despega rápido, el suelo quema»',
    dosingByCat: {
      'Sub-14': '3 repeticiones x 8 gradas',
      'Sub-16': '4 repeticiones x 12 gradas',
      'Sub-18': '5 repeticiones x 16 gradas'
    },
    dosing: '4 repeticiones de 12 gradas.'
  },
  {
    id: 'D-05',
    name: 'Zarpazo Activo en Carrera (Paw-Back Drill)',
    category: 'Recobro de Rodilla',
    targetDeficit: 'knee_flexion',
    difficulty: 'avanzado',
    difficultyLabel: 'Avanzado',
    goal: 'Eliminar el frenado por sobrezancada (overstriding) tirando activamente del suelo hacia atrás.',
    execution: 'Desde skipping alto, extender la pierna al frente y tirar con violencia hacia abajo y atrás antes del contacto.',
    commonErrors: 'Aterrizar con la pierna totalmente estirada por delante del centro de masa.',
    cues: '«Garras al suelo, el pie ataca de arriba hacia abajo»',
    dosingByCat: {
      'Sub-14': '3 pasadas de 20 metros',
      'Sub-16': '4 pasadas de 30 metros',
      'Sub-18': '5 pasadas de 40 metros'
    },
    dosing: '4 pasadas de 30 metros.'
  },
  {
    id: 'D-06',
    name: 'Skipping Rápido en Frecuencia (Overspeed)',
    category: 'Impulso & Extensión',
    targetDeficit: 'cadence',
    difficulty: 'intermedio',
    difficultyLabel: 'Intermedio',
    goal: 'Aumentar la cadencia de zancada (>3.2 Hz) y reducir el tiempo de contacto con el suelo.',
    execution: 'Skipping con máxima velocidad de pies en un espacio de 10 metros, buscando el mayor número de apoyos por segundo.',
    commonErrors: 'Bajar la altura de las rodillas o balancear el tronco.',
    cues: '«Cadencia ametralladora, contacto elástico y breve»',
    dosingByCat: {
      'Sub-14': '4 pasadas de 8 metros al 100%',
      'Sub-16': '5 pasadas de 10 metros al 100%',
      'Sub-18': '6 pasadas de 12 metros con metrónomo'
    },
    dosing: '5 pasadas de 10 metros con pausa completa.'
  },
  {
    id: 'D-07',
    name: 'Bote de Tobillo Continuo (Pogo Jumps)',
    category: 'Simetría & Tobillo',
    targetDeficit: 'asymmetry',
    difficulty: 'iniciacion',
    difficultyLabel: 'Iniciación',
    goal: 'Mejorar la rigidez tendinosa (stiffness) del tendón de Aquiles y la simetría de despegue.',
    execution: 'Saltos verticales cortos usando casi exclusivamente la articulación del tobillo con piernas casi rectas.',
    commonErrors: 'Doblar excesivamente las rodillas disipando la energía elástica.',
    cues: '«Tobillos de resorte, rodillas firmes y despegue simétrico»',
    dosingByCat: {
      'Sub-14': '3 series x 15 botes',
      'Sub-16': '3 series x 20 botes',
      'Sub-18': '4 series x 25 botes con ritmo metronómico'
    },
    dosing: '3 series de 20 botes rápidos.'
  }
];

// Banda de edad de trabajo (misma regla que el servicio de visión, ADR-018). No es una categoría oficial.
function bandaDeEdad(edad) {
  const e = Number(edad);
  if (!Number.isFinite(e) || e < 10 || e > 17) return null;
  return e <= 13 ? 'Sub-14' : e <= 15 ? 'Sub-16' : 'Sub-18';
}

const TIPO_A_DEFICIT = { propulsion: 'propulsion', recobro: 'knee_flexion', simetria: 'asymmetry' };

/** Primera oración del motivo (se muestra) y el resto (plegable). */
const resumenMotivo = (texto = '') => {
  const i = texto.search(/[.:](\s|$)/);
  return i < 0 ? { corto: texto, resto: '' } : { corto: texto.slice(0, i) + '.', resto: texto.slice(i + 1).trim() };
};
const fmt = (v, d = 1) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(d) : '—');

export default function Drills() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const initialAthleteParam = searchParams.get('athlete') || ''; // sin parámetro se usa el primer atleta propio al cargar la lista

  const [drills, setDrills] = useState(initialDrills);
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [search, setSearch] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [targetDrill, setTargetDrill] = useState(null);
  const [selectedAthlete, setSelectedAthlete] = useState(initialAthleteParam);
  const [ownedAthletes, setOwnedAthletes] = useState([]);
  const [athleteSessions, setAthleteSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [scopeError, setScopeError] = useState('');
  const [assignBusy, setAssignBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [assignDose, setAssignDose] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assignError, setAssignError] = useState('');

  const sending = useRef(false);

  // Cargar atletas desde la API
  useEffect(() => {
    let alive = true;
    api.athletes.getAll()
      .then(rows => {
        if (alive && rows?.length > 0) {
          setOwnedAthletes(rows);
          if (!searchParams.get('athlete')) {
            setSelectedAthlete(String(rows[0].id));
          }
        }
      })
      .catch(err => {
        if (alive) {
          setOwnedAthletes([]);
        }
      });
    return () => { alive = false; };
  }, []);

  // Cargar sesiones reales del atleta seleccionado
  const loadSessions = (athleteId) => {
    if (!athleteId) return;
    setLoadingSessions(true);
    api.sessions.getByAthlete(athleteId)
      .then(rows => {
        setAthleteSessions(rows || []);
      })
      .catch(() => {
        setAthleteSessions([]);
      })
      .finally(() => setLoadingSessions(false));
  };

  useEffect(() => {
    if (selectedAthlete) {
      loadSessions(selectedAthlete);
    }
  }, [selectedAthlete]);

  // Un análisis solo existe si se sube un video real del atleta (ADR-018): no hay captura simulada.
  const handleGoToUpload = () => navigate('/capture');

  const [assignedFrequency, setAssignedFrequency] = useState('2 veces por semana');

  // Evaluación generada SOLO con lo medido en el último video real analizado (ADR-018).
  const currentAthleteObj = ownedAthletes.find(a => String(a.id) === String(selectedAthlete)) || { name: 'Atleta' };

  const athleteEval = useMemo(() => {
    const base = {
      name: currentAthleteObj.name || 'Atleta',
      category: bandaDeEdad(currentAthleteObj.age),
      hasRealSessions: false,
      hasRecommendations: false,
      deficits: [],
      rec: null
    };
    if (!athleteSessions || athleteSessions.length === 0) return base;

    const latest = athleteSessions[0]; // La más reciente
    const a = latest.analysis || {};
    const rec = a.recomendaciones && typeof a.recomendaciones === 'object' ? a.recomendaciones : null;
    const robust = a.inputs_robustos || {};
    const art = a.analisis_articular || {};
    const ipt = typeof latest.iptScore === 'number' ? latest.iptScore
      : (typeof a.ipt_score === 'number' ? a.ipt_score : null);

    const deficits = (rec && rec.disponible ? rec.hallazgos || [] : []).map(h => ({
      type: TIPO_A_DEFICIT[h.tipo] || h.tipo,
      title: h.titulo,
      severity: h.severidad,
      recommendation: h.interpretacion,
      valor: h.valor,
      unidad: h.unidad,
      umbral: h.umbral,
      metrica: h.metrica,
      estado: h.estado_respaldo,
      fuente: h.fuente
    }));

    return {
      ...base,
      category: (rec && rec.banda_edad && rec.banda_edad.etiqueta) || base.category,
      hasRealSessions: true,
      hasRecommendations: Boolean(rec),
      rec,
      ipt,
      kneeExt: robust.rodilla_p95,
      kneeFlex: robust.rodilla_p5,
      hipFlex: robust.cadera_flexion_max,
      symmetry: typeof art.simetria_multiarticular === 'number' ? art.simetria_multiarticular : null,
      confianza: rec ? rec.confianza : null,
      deficits,
      sessionDate: latest.sessionDate || latest.createdAt
    };
  }, [selectedAthlete, currentAthleteObj, athleteSessions]);

  const cat = athleteEval.category; // null si la edad no está registrada o está fuera de rango
  const dosisPara = (drill) =>
    (cat && drill.dosingByCat?.[cat]) || 'Dosis a definir por el entrenador (edad no registrada o fuera de rango)';

  // Drills prescritos automáticamente según los déficits detectados de datos reales
  const prescribedDrills = useMemo(() => {
    const types = athleteEval.deficits.map(d => d.type);
    return drills.filter(d => types.includes(d.targetDeficit));
  }, [drills, athleteEval]);

  const filtered = useMemo(() => {
    return drills.filter((d) => {
      const matchCategory = categoryFilter === 'Todas' || d.category === categoryFilter;
      const matchSearch =
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.goal.toLowerCase().includes(search.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [drills, categoryFilter, search]);

  const handleOpenAssign = (drill) => {
    setTargetDrill(drill);
    setAssignDose(dosisPara(drill));
    setAssignNotes([drill.cues && 'Consigna: ' + drill.cues, drill.commonErrors && 'Evitar: ' + drill.commonErrors].filter(Boolean).join(' '));
    setAssignError('');
    setShowAssignModal(true);
  };

  const athleteName = id => ownedAthletes.find(a => String(a.id) === String(id))?.name || 'el atleta';

  // Asignación manual: se envía lo que el entrenador dejó en el formulario. Si la API falla,
  // el modal sigue abierto con el error: no se guarda nada "local" ni se informa un éxito falso.
  const handleConfirmAssign = async (e) => {
    e.preventDefault();
    if (sending.current) return;
    const athleteId = Number(selectedAthlete);
    const fields = {
      athleteId,
      title: targetDrill.name,
      details: [assignDose.trim(), assignedFrequency, assignNotes.trim()].filter(Boolean).join(' · ')
    };
    sending.current = true;
    setAssignBusy(true);
    setAssignError('');
    try {
      await saveCollaboration('tasks', null, { ...fields, requestId: crypto.randomUUID() });
      setShowAssignModal(false);
      setNotice({ tone: 'ok', text: `"${targetDrill.name}" quedó asignado a ${athleteName(athleteId)}. Lo verá en Seguimiento.` });
    } catch (err) {
      setAssignError(err.message || 'No se pudo asignar el ejercicio. Inténtalo de nuevo.');
    } finally {
      sending.current = false;
      setAssignBusy(false);
    }
  };

  // Plan completo: se informa exactamente cuántos ejercicios se guardaron.
  const handleAssignFullPrescription = async () => {
    if (sending.current || !prescribedDrills.length) return;
    sending.current = true;
    setAssignBusy(true);
    setNotice(null);
    let ok = 0;
    let lastError = '';
    for (const drill of prescribedDrills) {
      try {
        await saveCollaboration('tasks', null, {
          athleteId: Number(selectedAthlete),
          title: drill.name,
          details: [dosisPara(drill), drill.cues && 'Consigna: ' + drill.cues].filter(Boolean).join(' · '),
          requestId: crypto.randomUUID()
        });
        ok += 1;
      } catch (err) {
        lastError = err.message || 'Error de conexión';
      }
    }
    const total = prescribedDrills.length;
    setNotice(ok === total
      ? { tone: 'ok', text: `Plan de ${total} ejercicios asignado a ${athleteEval.name}. Lo verá en Seguimiento.` }
      : { tone: 'bad', text: `Se asignaron ${ok} de ${total} ejercicios. ${lastError}` });
    sending.current = false;
    setAssignBusy(false);
  };

  const categories = ['Todas', 'Recobro de Rodilla', 'Impulso & Extensión', 'Simetría & Tobillo', 'Postura & Tronco'];
  const conf = athleteEval.confianza;

  return (
    <Layout>
      <PageHeader
        eyebrow="ENTRENAMIENTO"
        title="Ejercicios"
        description="Plan sugerido por el último análisis y catálogo de ejercicios de técnica."
      />

      {scopeError && <p role="alert">{scopeError}</p>}
      <AnimatePresence>
        {notice && (
          <motion.div key={notice.text} className={'mh-notice ' + notice.tone} role="status"
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {notice.tone === 'ok' ? <CheckCircle2 size={18} aria-hidden="true" /> : <AlertTriangle size={18} aria-hidden="true" />}
            <span>{notice.text}</span>
            <button type="button" className="mh-notice-close" aria-label="Cerrar aviso" onClick={() => setNotice(null)}><X size={16} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PLAN SUGERIDO: solo con lo medido en el último video real (ADR-018) */}
      <motion.section variants={cardVariants} className="mh-block" aria-labelledby="mh-plan-title">
        <div className="mh-block-head">
          <h2 id="mh-plan-title" className="mh-block-title">Plan sugerido</h2>
          <span className="mh-chip warn">{cat ? 'Banda ' + cat : 'Edad no registrada'}</span>
        </div>
        <label className="mh-athlete-picker">
          <span>Atleta</span>
          <select value={selectedAthlete} onChange={(e) => { setSelectedAthlete(e.target.value); setNotice(null); }}>
            {ownedAthletes.length === 0 && <option value="">Sin atletas a tu cargo</option>}
            {ownedAthletes.map(a => (
              <option key={a.id} value={String(a.id)}>{a.name}{a.age ? ` · ${a.age} años` : ''}</option>
            ))}
          </select>
        </label>
        <p className="mh-block-note">Sugerencias a partir del último video analizado. Son un apoyo para el entrenador, no un diagnóstico.</p>

        {loadingSessions && <p className="mh-empty-line">Cargando el último análisis…</p>}

        {!loadingSessions && !athleteEval.hasRealSessions && (
          <div className="mh-hero mh-hero-empty">
            <span className="mh-kicker">Sin análisis</span>
            <h2>{athleteEval.name} aún no tiene videos analizados.</h2>
            <button type="button" className="primary-button" onClick={handleGoToUpload}><Camera size={18} aria-hidden="true" />Grabar pasada</button>
          </div>
        )}

        {athleteEval.hasRealSessions && !athleteEval.hasRecommendations && (
          <p className="mh-empty-line">La última sesión se analizó con una versión anterior y no trae recomendaciones. Vuelve a analizar el video desde el historial.</p>
        )}
        {athleteEval.rec && !athleteEval.rec.disponible && (
          <div className="mh-notice bad">
            <AlertTriangle size={18} aria-hidden="true" />
            <span>
              <strong>No se generan recomendaciones.</strong> {resumenMotivo(athleteEval.rec.motivo_no_disponible).corto}
              {resumenMotivo(athleteEval.rec.motivo_no_disponible).resto && (
                <details className="mh-notice-more"><summary>Ver motivos y cómo mejorar el video</summary>
                  <p>{resumenMotivo(athleteEval.rec.motivo_no_disponible).resto}</p>
                </details>
              )}
            </span>
          </div>
        )}

        {athleteEval.hasRealSessions && (
          <ul className="mh-delta-grid" aria-label="Mediciones del último video">
            <li><span className="mh-delta-name">IPT (experimental)</span><span className="mh-delta-after">{fmt(athleteEval.ipt)}</span></li>
            <li><span className="mh-delta-name">Extensión rodilla (p95)</span><span className="mh-delta-after">{fmt(athleteEval.kneeExt)}°</span></li>
            <li><span className="mh-delta-name">Flexión rodilla (p5)</span><span className="mh-delta-after">{fmt(athleteEval.kneeFlex)}°</span></li>
            <li><span className="mh-delta-name">Flexión máx. cadera</span><span className="mh-delta-after">{fmt(athleteEval.hipFlex)}°</span></li>
            <li><span className="mh-delta-name">Simetría multiarticular</span><span className="mh-delta-after">{fmt(athleteEval.symmetry)}%</span></li>
          </ul>
        )}

        {athleteEval.rec && athleteEval.rec.disponible && conf && (
          <details className="mh-callout">
            <summary><span className={'mh-chip ' + (conf.nivel === 'alta' ? 'ok' : 'warn')}>Confianza {conf.nivel}</span> ¿Por qué?</summary>
            <p>{(conf.motivos || []).join(' ')}</p>
            {conf.como_mejorar_el_video?.length > 0 && <p><strong>Para un mejor video:</strong> {conf.como_mejorar_el_video.join(' ')}</p>}
          </details>
        )}

        {athleteEval.deficits.length > 0 && (
          <ul className="mh-findings" aria-label="Hallazgos del último análisis">
            {athleteEval.deficits.map(d => (
              <li key={d.type}>
                <div className="mh-finding-head">
                  <strong>{d.title}</strong>
                  <span className={'mh-chip ' + (d.severity === 'alta' ? 'bad' : 'warn')}>{d.severity}</span>
                </div>
                <span className="mh-finding-value">{fmt(d.valor)}{d.unidad} <small>referencia {d.umbral}</small></span>
                <p>{d.recommendation}</p>
                <small>Respaldo {d.estado === 'respaldo_parcial' ? 'parcial' : 'por calibrar'} · {d.fuente}</small>
              </li>
            ))}
          </ul>
        )}
        {athleteEval.rec && athleteEval.rec.disponible && athleteEval.deficits.length === 0 && (
          <p className="mh-notice ok"><CheckCircle2 size={18} aria-hidden="true" /><span>{athleteEval.rec.mensaje}</span></p>
        )}

        {prescribedDrills.length > 0 && (
          <>
            <div className="mh-block-head mh-plan-head">
              <h3 className="mh-block-subtitle">Ejercicios para estos hallazgos</h3>
              <button type="button" className="primary-button" disabled={assignBusy} onClick={handleAssignFullPrescription}>
                <UserCheck size={17} aria-hidden="true" />{assignBusy ? 'Asignando…' : `Asignar los ${prescribedDrills.length}`}
              </button>
            </div>
            <ol className="mh-drills">
              {prescribedDrills.map(drill => (
                <li key={drill.id}>
                  <span className="mh-drill-phase">{drill.category} · {drill.difficultyLabel}</span>
                  <strong>{drill.name}</strong>
                  <span className="mh-drill-dose">{dosisPara(drill)}</span>
                  <small>{drill.goal}</small>
                  {drill.cues && <small><b>Consigna:</b> {drill.cues}</small>}
                </li>
              ))}
            </ol>
          </>
        )}
      </motion.section>

      {/* CATÁLOGO */}
      <section className="mh-block mh-catalog" aria-labelledby="mh-catalogo">
        <h2 id="mh-catalogo" className="mh-block-title">Catálogo</h2>
        <div className="athletes-toolbar">
          <label className="mh-search">
            <Search size={17} aria-hidden="true" />
            <span className="mh-visually-hidden">Buscar ejercicio</span>
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por ejercicio u objetivo" />
          </label>
          <div className="filter-pills-bar" role="group" aria-label="Filtrar por tipo">
            {categories.map((catName) => (
              <button key={catName} type="button" className={`filter-pill ${categoryFilter === catName ? 'active' : ''}`}
                onClick={() => setCategoryFilter(catName)}>
                {catName === 'Todas' ? `Todos (${drills.length})` : `${catName} (${drills.filter((d) => d.category === catName).length})`}
              </button>
            ))}
          </div>
        </div>

        <motion.div className="mh-drill-grid" layout="position">
          <AnimatePresence mode="popLayout" initial={true}>
            {filtered.map((drill, i) => {
              const isRecommended = prescribedDrills.some(p => p.id === drill.id);
              return (
                <motion.article key={drill.id} layout="position" className={'mh-drill-card' + (isRecommended ? ' is-suggested' : '')}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.34, ease: EASE_OUT, delay: Math.min(i, 8) * 0.04 } }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.16 } }}>
                  <div className="mh-drill-tags">
                    <span className="mh-kicker">{drill.category}</span>
                    <span className="mh-drill-level">{drill.difficultyLabel}</span>
                    {isRecommended && <span className="mh-chip ok"><Sparkles size={12} aria-hidden="true" />&nbsp;Sugerido</span>}
                  </div>
                  <h3>{drill.name}</h3>
                  <p>{drill.goal}</p>
                  <span className="mh-drill-dose">{dosisPara(drill)}</span>
                  <details>
                    <summary>Cómo hacerlo</summary>
                    <p>{drill.execution}</p>
                    {drill.cues && <p><b>Consigna:</b> {drill.cues}</p>}
                    {drill.commonErrors && <p className="mh-drill-error"><b>Evitar:</b> {drill.commonErrors}</p>}
                  </details>
                  <button type="button" className="secondary-button" onClick={() => handleOpenAssign(drill)}>
                    <UserCheck size={16} aria-hidden="true" />Asignar
                  </button>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </motion.div>
        {filtered.length === 0 && <p className="mh-empty-line">Ningún ejercicio coincide con la búsqueda.</p>}
      </section>

      {/* MODAL: ASIGNAR UN EJERCICIO */}
      <AnimatePresence>
        {showAssignModal && targetDrill && (
          <motion.div key="modal" className="modal-overlay" onClick={() => setShowAssignModal(false)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <motion.div className="modal-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="mh-assign-title"
              initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98, transition: { duration: 0.16 } }} transition={{ duration: 0.3, ease: EASE_OUT }}>
              <div className="modal-header">
                <div>
                  <h3 id="mh-assign-title">Asignar ejercicio</h3>
                  <span>{targetDrill.name}</span>
                </div>
                <button type="button" className="icon-button" aria-label="Cerrar" onClick={() => setShowAssignModal(false)}><X size={18} /></button>
              </div>
              <form onSubmit={handleConfirmAssign}>
                <div className="modal-body">
                  <label className="mh-field">
                    <span>Atleta</span>
                    <select required value={selectedAthlete} onChange={(e) => setSelectedAthlete(e.target.value)}>
                      {ownedAthletes.length === 0 && <option value="">Sin atletas a tu cargo</option>}
                      {ownedAthletes.map(a => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
                    </select>
                  </label>
                  <div className="mh-form-row">
                    <label className="mh-field">
                      <span>Frecuencia</span>
                      <select value={assignedFrequency} onChange={(e) => setAssignedFrequency(e.target.value)}>
                        <option>1 vez por semana</option>
                        <option>2 veces por semana</option>
                        <option>3 veces por semana</option>
                        <option>En cada calentamiento</option>
                      </select>
                    </label>
                    <label className="mh-field">
                      <span>Dosis</span>
                      <input type="text" maxLength={200} value={assignDose} onChange={(e) => setAssignDose(e.target.value)} />
                    </label>
                  </div>
                  <label className="mh-field">
                    <span>Instrucciones para el atleta</span>
                    <textarea rows={3} maxLength={1000} value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)} />
                  </label>
                  {assignError && <p role="alert">{assignError}</p>}
                </div>
                <div className="modal-footer">
                  <button type="button" className="secondary-button" onClick={() => setShowAssignModal(false)}>Cancelar</button>
                  <button type="submit" disabled={assignBusy || !selectedAthlete} className="primary-button">{assignBusy ? 'Asignando…' : 'Asignar'}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
