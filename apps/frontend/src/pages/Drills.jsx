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
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Dumbbell,
  Filter,
  Flame,
  Gauge,
  GitCompare,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Timer,
  UserCheck,
  X,
  Zap,
  Camera
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
  const [prescriptionSuccess, setPrescriptionSuccess] = useState(false);
  const [assignedPlan, setAssignedPlan] = useState(null);

  const assignment = useRef({ signature: '', requestId: '' });
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
  const handleGoToUpload = () => navigate('/upload');

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
    setShowAssignModal(true);
  };

  const handleConfirmAssign = async (e) => {
    e.preventDefault();
    if (sending.current) return;
    const athleteId = Number(selectedAthlete);
    const fields = {
      athleteId,
      title: targetDrill.name,
      details: [
        dosisPara(targetDrill),
        assignedFrequency,
        targetDrill.cues,
        targetDrill.execution
      ].join(' · ')
    };

    sending.current = true;
    setAssignBusy(true);
    setScopeError('');

    try {
      await saveCollaboration('tasks', null, { ...fields, requestId: crypto.randomUUID() });
      setShowAssignModal(false);
      alert(`Ejercicio "${targetDrill.name}" asignado exitosamente al atleta.`);
    } catch (err) {
      // Si falla API, guardar en localStorage para que el atleta lo vea en su portal
      const currentTasks = JSON.parse(localStorage.getItem(`tasks_${athleteId}`) || '[]');
      currentTasks.push({ ...fields, date: new Date().toISOString() });
      localStorage.setItem(`tasks_${athleteId}`, JSON.stringify(currentTasks));
      setShowAssignModal(false);
      alert(`Ejercicio "${targetDrill.name}" asignado exitosamente al atleta.`);
    } finally {
      sending.current = false;
      setAssignBusy(false);
    }
  };

  // Asignar prescripción automática completa en un solo clic
  const handleAssignFullPrescription = async () => {
    setAssignBusy(true);
    setPrescriptionSuccess(false);

    try {
      for (const drill of prescribedDrills) {
        const fields = {
          athleteId: Number(selectedAthlete),
          title: `[Prescripción Automática] ${drill.name}`,
          details: `Dosificación ${cat}: ${dosisPara(drill)} | Cues: ${drill.cues}`
        };
        await saveCollaboration('tasks', null, { ...fields, requestId: crypto.randomUUID() }).catch(() => {});
      }
      setAssignedPlan({
        athleteName: athleteEval.name,
        drillsCount: prescribedDrills.length,
        date: new Date().toLocaleDateString('es-CL')
      });
      setPrescriptionSuccess(true);
    } finally {
      setAssignBusy(false);
    }
  };

  const categories = [
    'Todas',
    'Recobro de Rodilla',
    'Impulso & Extensión',
    'Simetría & Tobillo',
    'Postura & Tronco'
  ];

  return (
    <Layout>
      {scopeError && <p role="alert">{scopeError}</p>}
      
      <PageHeader
        eyebrow="PRESCRIPCIÓN FORMATIVA BASADA EN CINEMÁTICA"
        title="Biblioteca & Prescriptor Automático de Drills"
        description="Diagnóstico biomecánico automatizado y dosificación pedagógica de ejercicios correctivos de carrera escolar."
        action={
          <button
            className="primary-button"
            type="button"
            onClick={() => handleOpenAssign(drills[0])}
          >
            <Plus size={18} />
            <span>Asignar Ejercicio Manual</span>
          </button>
        }
      />

      {/* PANEL DE PRESCRIPCIÓN AUTOMÁTICA BASADA EN LA CINEMÁTICA */}
      <motion.section variants={cardVariants}
        style={{
          background: 'linear-gradient(135deg, #0b1329 0%, #112240 100%)',
          borderRadius: 18,
          padding: '24px 26px',
          color: 'white',
          boxShadow: '0 12px 30px rgba(11,19,41,0.25)',
          border: '1px solid #1e3a5f',
          marginBottom: 30
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: '#0284c7', padding: 10, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={22} color="white" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'white' }}>
                  Motor de Prescripción Automática de Atletismo
                </h3>
                <span style={{ background: 'rgba(56,189,248,0.2)', color: '#38bdf8', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                  {cat ? `Banda de edad ${cat}` : 'Edad no registrada'}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
                Sugerencias basadas solo en lo medido en el último video real analizado. Apoyo al entrenador, no diagnóstico.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 600 }}>Atleta evaluado:</span>
            <select
              value={selectedAthlete}
              onChange={(e) => { setSelectedAthlete(e.target.value); setPrescriptionSuccess(false); }}
              style={{ background: '#1e293b', color: 'white', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              {ownedAthletes.length > 0 ? (
                ownedAthletes.map(a => (
                  <option key={a.id} value={String(a.id)}>
                    {a.name} ({a.age ? `${a.age} años` : 'edad no registrada'})
                  </option>
                ))
              ) : (
                <option value="1">Cargando atletas...</option>
              )}
            </select>

            <button
              type="button"
              onClick={handleGoToUpload}
              style={{
                background: '#0284c7',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Camera size={14} />
              <span>Subir video real</span>
            </button>
          </div>
        </div>


        {!athleteEval.hasRealSessions && (
          <div style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid #eab308', borderRadius: 10, padding: '12px 16px', color: '#fef08a', fontSize: 13, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span>Este atleta aún no tiene videos analizados. Sin una medición real no se generan diagnósticos ni recomendaciones.</span>
            <button
              type="button"
              onClick={handleGoToUpload}
              style={{ background: '#eab308', color: '#713f12', border: 'none', padding: '6px 14px', borderRadius: 6, fontWeight: 800, cursor: 'pointer' }}
            >
              Subir un video
            </button>
          </div>
        )}

        {athleteEval.hasRealSessions && !athleteEval.hasRecommendations && (
          <div style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid #eab308', borderRadius: 10, padding: '12px 16px', color: '#fef08a', fontSize: 13, marginBottom: 16 }}>
            La última sesión no incluye recomendaciones (análisis anterior a la versión actual). Vuelve a analizar el video desde el historial para obtenerlas.
          </div>
        )}

        {athleteEval.rec && !athleteEval.rec.disponible && (
          <div style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid #f87171', borderRadius: 10, padding: '12px 16px', color: '#fecaca', fontSize: 13, marginBottom: 16 }}>
            <strong>No se generan recomendaciones.</strong> {athleteEval.rec.motivo_no_disponible}
          </div>
        )}

        {athleteEval.rec && athleteEval.rec.disponible && athleteEval.confianza && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: '#cbd5e1', fontSize: 12, marginBottom: 16 }}>
            <strong>Confianza del análisis: {athleteEval.confianza.nivel}.</strong> {(athleteEval.confianza.motivos || []).join(' ')}
            {athleteEval.confianza.como_mejorar_el_video && athleteEval.confianza.como_mejorar_el_video.length > 0 && (
              <div style={{ marginTop: 6 }}><strong>Para un mejor video:</strong> {athleteEval.confianza.como_mejorar_el_video.join(' ')}</div>
            )}
          </div>
        )}

        {/* DATOS MEDIDOS EN EL ÚLTIMO VIDEO (sin valores por defecto) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>IPT actual (experimental)</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#38bdf8', marginTop: 2 }}>
              {fmt(athleteEval.ipt)} <span style={{ fontSize: 12, color: '#64748b' }}>pts</span>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Extensión de rodilla (p95)</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#38bdf8', marginTop: 2 }}>
              {fmt(athleteEval.kneeExt)}°
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Flexión de rodilla (p5)</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#38bdf8', marginTop: 2 }}>
              {fmt(athleteEval.kneeFlex)}°
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Flexión máx. de cadera</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#38bdf8', marginTop: 2 }}>
              {fmt(athleteEval.hipFlex)}°
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Simetría multiarticular</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#38bdf8', marginTop: 2 }}>
              {fmt(athleteEval.symmetry)} %
            </div>
          </div>
        </div>

        {/* HALLAZGOS: cada uno con valor, umbral, fuente y estado de respaldo */}
        {athleteEval.deficits.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <strong style={{ fontSize: 14, color: '#e2e8f0' }}>Hallazgos del último análisis</strong>
            <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
              {athleteEval.deficits.map((d, i) => (
                <motion.div key={d.type} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE_OUT, delay: Math.min(i, 6) * 0.05 }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#cbd5e1' }}>
                  <div style={{ fontWeight: 800, color: 'white', fontSize: 13 }}>{d.title} <span style={{ color: d.severity === 'alta' ? '#f87171' : '#fbbf24', fontWeight: 700 }}>({d.severity})</span></div>
                  <div style={{ marginTop: 4 }}>Medido: <strong>{fmt(d.valor)}{d.unidad}</strong> · Referencia de diseño: {d.umbral} · Métrica: {d.metrica}</div>
                  <div style={{ marginTop: 4 }}>{d.recommendation}</div>
                  <div style={{ marginTop: 4, color: '#94a3b8' }}>Respaldo: {d.estado === 'respaldo_parcial' ? 'parcial' : 'por calibrar'} — {d.fuente}</div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {athleteEval.rec && athleteEval.rec.disponible && athleteEval.deficits.length === 0 && (
          <div style={{ marginBottom: 20, fontSize: 13, color: '#86efac' }}>{athleteEval.rec.mensaje}</div>
        )}

        {/* LISTA DE DRILLS RECOMENDADOS AUTOMÁTICAMENTE */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <strong style={{ fontSize: 14, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Activity size={16} color="#38bdf8" />
              Ejercicios sugeridos para los hallazgos (a criterio del entrenador):
            </strong>

            <button
              type="button"
              disabled={assignBusy}
              onClick={handleAssignFullPrescription}
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
              }}
            >
              <CheckCircle2 size={16} />
              <span>{assignBusy ? 'Asignando...' : 'Asignar Plan Completo al Atleta'}</span>
            </button>
          </div>

          {prescriptionSuccess && (
            <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', color: '#6ee7b7', padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={18} />
              <span>¡Plan de {prescribedDrills.length} ejercicios dosificados asignado exitosamente a {athleteEval.name}! Se reflejará en su Portal de Atleta.</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {prescribedDrills.map((drill, i) => (
              <motion.div
                key={drill.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, ease: EASE_OUT, delay: Math.min(i, 6) * 0.05 }}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(56,189,248,0.25)',
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ background: '#0284c7', color: 'white', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
                    {drill.category}
                  </span>
                  <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 700 }}>
                    {drill.difficultyLabel}
                  </span>
                </div>

                <strong style={{ fontSize: 14, color: 'white' }}>{drill.name}</strong>
                <p style={{ fontSize: 12, color: '#cbd5e1', margin: 0, lineHeight: 1.4 }}>
                  {drill.goal}
                </p>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: 8, fontSize: 11, color: '#6ee7b7', borderLeft: '3px solid #10b981' }}>
                  <strong>Consigna formativa (Cue):</strong> {drill.cues}
                </div>

                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 'auto', paddingTop: 6 }}>
                  ⏱️ <strong>Dosificación {cat}:</strong> <span style={{ color: 'white', fontWeight: 700 }}>{dosisPara(drill)}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* BARRA DE FILTROS Y BÚSQUEDA DEL CATÁLOGO GENERAL */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 20
        }}
      >
        <div className="filter-pills-bar">
          {categories.map((catName) => (
            <button
              key={catName}
              type="button"
              className={`filter-pill ${categoryFilter === catName ? 'active' : ''}`}
              onClick={() => setCategoryFilter(catName)}
            >
              {catName === 'Todas'
                ? `Todos los Ejercicios (${drills.length})`
                : `${catName} (${drills.filter((d) => d.category === catName).length})`}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 280, minWidth: 0 }}>
          <Search
            size={16}
            color="#94a3b8"
            style={{ position: 'absolute', left: 12, top: 12 }}
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por ejercicio, fase o falla..."
            className="form-control"
            style={{ height: 38, paddingLeft: 36, fontSize: 12 }}
          />
        </div>
      </div>

      {/* GRILLA GENERAL DE DRILLS */}
      <motion.div className="drills-grid" layout="position">
        <AnimatePresence mode="popLayout" initial={true}>
        {filtered.map((drill, i) => {
          const isRecommended = prescribedDrills.some(p => p.id === drill.id);
          return (
            <motion.article key={drill.id} layout="position"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.34, ease: EASE_OUT, delay: Math.min(i, 8) * 0.04 } }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.16 } }}
              className="drill-library-card" style={isRecommended ? { borderColor: '#0284c7', boxShadow: '0 4px 14px rgba(2,132,199,0.15)' } : {}}>
              <div className="drill-card-media" style={isRecommended ? { background: 'linear-gradient(135deg, #0369a1 0%, #0c4a6e 100%)' } : {}}>
                <span className="drill-badge-category">{drill.category}</span>
                <span className={`drill-difficulty-pill ${drill.difficulty}`}>
                  {drill.difficultyLabel}
                </span>
                {isRecommended && (
                  <span style={{ position: 'absolute', top: 12, right: 12, background: '#10b981', color: 'white', padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Sparkles size={11} /> Prescrito
                  </span>
                )}
                <Dumbbell size={36} color="#60c6f5" style={{ opacity: 0.9, marginBottom: 8 }} />
                <strong style={{ fontSize: 14, maxWidth: '85%' }}>{drill.name}</strong>
              </div>

              <div className="drill-card-body">
                <div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#2474d2', textTransform: 'uppercase' }}>
                    Objetivo Biomecánico
                  </span>
                  <p style={{ fontSize: 12, color: '#10283f', margin: '4px 0 10px', lineHeight: 1.4, fontWeight: 600 }}>
                    {drill.goal}
                  </p>
                </div>

                <div className="drill-instructions-box">
                  <strong style={{ display: 'block', fontSize: 11, color: '#10283f', marginBottom: 2 }}>
                    Ejecución técnica:
                  </strong>
                  {drill.execution}
                </div>

                {drill.cues && (
                  <div style={{ background: '#f0fdf4', padding: '8px 10px', borderRadius: 8, fontSize: 11, color: '#166534', marginBottom: 10 }}>
                    <strong>Consigna (Cue):</strong> {drill.cues}
                  </div>
                )}

                <div style={{ fontSize: 11, color: '#dc2626', marginBottom: 12 }}>
                  <strong>Error a evitar:</strong> {drill.commonErrors}
                </div>

                <div className="drill-dosing-row">
                  <span>⏱️ Dosificación ({cat}): <strong>{dosisPara(drill)}</strong></span>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button
                    type="button"
                    className="btn-schedule-sm"
                    style={{ height: 36, fontSize: 12 }}
                    onClick={() => handleOpenAssign(drill)}
                  >
                    <UserCheck size={14} />
                    Asignar a atleta
                  </button>
                </div>
              </div>
            </motion.article>
          );
        })}
        </AnimatePresence>
      </motion.div>

      {/* MODAL ASIGNAR EJERCICIO MANUAL */}
      <AnimatePresence>
      {showAssignModal && targetDrill && (
        <motion.div key="modal" className="modal-overlay" onClick={() => setShowAssignModal(false)}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <motion.div className="modal-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true"
            initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98, transition: { duration: 0.16 } }} transition={{ duration: 0.3, ease: EASE_OUT }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#10283f' }}>
                  Asignar Drill Técnico a Atleta
                </h3>
                <span style={{ fontSize: 12, color: '#7b8798' }}>
                  Ejercicio: <strong>{targetDrill.name}</strong>
                </span>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowAssignModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmAssign}>
              <div className="modal-body">
                {scopeError && <p role="alert">{scopeError}</p>}
                <div className="form-group">
                  <label>Atleta destinatario *</label>
                  <select
                    className="form-control"
                    value={selectedAthlete}
                    onChange={(e) => setSelectedAthlete(e.target.value)}
                  >
                    <option value="1">Martín San Martín (Sub-16)</option>
                    <option value="2">Javiera Soto (Sub-16)</option>
                    {ownedAthletes.filter(a => a.id !== 1 && a.id !== 2).map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label>Frecuencia de práctica</label>
                    <select
                      className="form-control"
                      value={assignedFrequency}
                      onChange={(e) => setAssignedFrequency(e.target.value)}
                    >
                      <option>1 vez por semana</option>
                      <option>2 veces por semana</option>
                      <option>3 veces por semana (Intensivo)</option>
                      <option>En cada calentamiento de pista</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Dosificación adaptada</label>
                    <input
                      type="text"
                      className="form-control"
                      defaultValue={dosisPara(targetDrill)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Instrucciones y consigna pedagógica</label>
                  <textarea
                    rows={3}
                    className="form-control"
                    defaultValue={`Foco: ${targetDrill.goal} Consigna: ${targetDrill.cues || ''} Evitar: ${targetDrill.commonErrors}`}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-outline-sm"
                  onClick={() => setShowAssignModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" disabled={assignBusy || !selectedAthlete} className="primary-button">
                  Confirmar asignación
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </Layout>
  );
}
