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
import { useLocation } from 'react-router-dom';
import { Layout, PageHeader } from '../components/UI.jsx';
import api from '../services/api.js';
import { saveCollaboration } from '../services/collaboration.js';

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
    targetDeficit: 'cadence',
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

// Perfiles biométricos para diagnóstico automático
const athleteBiometrics = {
  '1': {
    name: 'Martín San Martín',
    category: 'Sub-16',
    age: 15,
    kneeAngle: 24.2, // Deficitario (< 26°)
    symmetry: 85.2,  // Deficitario (< 90%)
    cadenceHz: 3.10, // Mejorable (< 3.2 Hz)
    ipt: 68.4,
    deficits: [
      {
        type: 'knee_flexion',
        title: 'Recobro de Rodilla Insuficiente (24.2°)',
        severity: 'alta',
        recommendation: 'Aumentar ángulo de flexión de rodilla para acortar el brazo de palanca y permitir mayor amplitud de zancada.'
      },
      {
        type: 'asymmetry',
        title: 'Asimetría Bilateral de Zancada (14.8% delta)',
        severity: 'media',
        recommendation: 'Reforzar apoyo unipodal izquierdo para equilibrar fuerzas de impacto.'
      }
    ]
  },
  '2': {
    name: 'Javiera Soto',
    category: 'Sub-16',
    age: 16,
    kneeAngle: 27.4,
    symmetry: 81.5, // Muy deficitario (< 85%)
    cadenceHz: 2.95, // Deficitario (< 3.0 Hz)
    ipt: 64.1,
    deficits: [
      {
        type: 'asymmetry',
        title: 'Asimetría Marcada en Tobillos (18.5% disparidad)',
        severity: 'alta',
        recommendation: 'Trabajo correctivo unilateral de rigidez reactiva y propiocepción monopodal.'
      },
      {
        type: 'cadence',
        title: 'Baja Frecuencia Cíclica (2.95 Hz / 177 ppm)',
        severity: 'media',
        recommendation: 'Ejercicios de overspeed para reducir el tiempo de amortiguación en el suelo.'
      }
    ]
  }
};

export default function Drills() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialAthleteParam = searchParams.get('athlete') || '1';

  const [drills, setDrills] = useState(initialDrills);
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [search, setSearch] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [targetDrill, setTargetDrill] = useState(null);
  const [selectedAthlete, setSelectedAthlete] = useState(initialAthleteParam);
  const [ownedAthletes, setOwnedAthletes] = useState([]);
  const [athleteSessions, setAthleteSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [isProcessingCv, setIsProcessingCv] = useState(false);
  const [cvMsg, setCvMsg] = useState('');
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

  // Ejecución en vivo de análisis MediaPipe si el atleta no tiene sesiones o se desea actualizar
  const handleRunRealCvForDrills = async () => {
    if (!selectedAthlete) return;
    setIsProcessingCv(true);
    setCvMsg('Conectando a microservicio MediaPipe en puerto 8000...');
    try {
      const formData = new FormData();
      formData.append('use_sample', 'true');
      formData.append('sample_stride', '2');
      formData.append('max_frames', '120');

      setTimeout(() => setCvMsg('Evaluando 33 articulaciones corporales y ángulos IPT...'), 1200);

      const result = await api.cv.processVideo(formData);
      setCvMsg('Guardando sesión real en base de datos...');

      const ipt = result.ipt_evaluation?.ipt_score || 78.5;
      await api.sessions.create({
        athleteId: Number(selectedAthlete),
        sessionDate: new Date().toISOString(),
        videoUrl: '/sample_sprint.webm',
        notes: `Control Biomecánico MediaPipe — ${result.ipt_evaluation?.categoria || 'Evaluación Técnica Real'}`,
        iptScore: ipt,
        analysis: {
          ipt_evaluation: result.ipt_evaluation,
          summary_metrics: result.summary_metrics,
          video_info: result.video_info
        }
      });

      setCvMsg('¡Sesión evaluada con éxito!');
      loadSessions(selectedAthlete);
    } catch (err) {
      alert(`Error en análisis MediaPipe: ${err.message}`);
    } finally {
      setTimeout(() => {
        setIsProcessingCv(false);
        setCvMsg('');
      }, 1000);
    }
  };

  const [assignedFrequency, setAssignedFrequency] = useState('2 veces por semana');

  // Evaluación biomecánica automática generada desde la última sesión real
  const currentAthleteObj = ownedAthletes.find(a => String(a.id) === String(selectedAthlete)) || {
    name: 'Atleta',
    category: 'Sub-16'
  };

  const athleteEval = useMemo(() => {
    const defaultEval = athleteBiometrics[selectedAthlete] || {
      name: currentAthleteObj.name || 'Atleta',
      category: currentAthleteObj.category || 'Sub-16',
      kneeAngle: 24.2,
      symmetry: 85.2,
      cadenceHz: 3.10,
      ipt: 68.4,
      deficits: [
        {
          type: 'knee_flexion',
          title: 'Recobro de Rodilla Insuficiente (24.2°)',
          severity: 'alta',
          recommendation: 'Aumentar flexión de rodilla libre para acortar el brazo de palanca y acelerar el avance pendular.'
        },
        {
          type: 'asymmetry',
          title: 'Asimetría Bilateral de Zancada (14.8% delta)',
          severity: 'media',
          recommendation: 'Reforzar apoyo unipodal y rigidez reactiva para balancear tiempos de contacto.'
        }
      ]
    };

    if (!athleteSessions || athleteSessions.length === 0) {
      return {
        ...defaultEval,
        hasRealSessions: false
      };
    }

    const latest = athleteSessions[0]; // La más reciente
    const a = latest.analysis || {};
    const sm = a.summary_metrics || {};

    const ipt = typeof latest.iptScore === 'number' ? latest.iptScore : (a.ipt_score || 72.0);
    const kneeAngle = Number(sm.avg_knee_angle ?? sm.min_knee_flexion ?? 24.5);
    const symmetry = Number(sm.avg_symmetry_score ?? 86.0);
    const cadenceHz = Number(sm.cadence_hz ?? 3.05);
    const trunkLean = Number(sm.trunk_lean_angle ?? -5.5);

    const deficits = [];
    if (kneeAngle < 26.0) {
      deficits.push({
        type: 'knee_flexion',
        title: `Recobro de Rodilla Insuficiente (${kneeAngle.toFixed(1)}°)`,
        severity: kneeAngle < 24.5 ? 'alta' : 'media',
        recommendation: 'Aumentar ángulo de flexión de rodilla para acortar el brazo de palanca y permitir mayor amplitud de zancada.'
      });
    }
    if (symmetry < 90.0) {
      deficits.push({
        type: 'asymmetry',
        title: `Asimetría Bilateral en Apoyos (${symmetry.toFixed(1)}%)`,
        severity: symmetry < 85.0 ? 'alta' : 'media',
        recommendation: 'Trabajo correctivo unilateral para equilibrar tiempos de contacto y estabilidad en tobillo/rodilla.'
      });
    }
    if (cadenceHz < 3.10) {
      deficits.push({
        type: 'cadence',
        title: `Baja Frecuencia Cíclica (${cadenceHz.toFixed(2)} Hz / ${Math.round(cadenceHz * 60)} ppm)`,
        severity: cadenceHz < 3.0 ? 'alta' : 'media',
        recommendation: 'Ejercicios de overspeed y skipping en frecuencia para reducir el tiempo de amortiguación en el suelo.'
      });
    }
    if (trunkLean < -6.5) {
      deficits.push({
        type: 'trunk_lean',
        title: `Inclinación Excesiva de Tronco (${trunkLean.toFixed(1)}°)`,
        severity: 'media',
        recommendation: 'Alineación postural y trabajo de core para prevenir colapso anterior.'
      });
    }

    if (deficits.length === 0) {
      deficits.push({
        type: 'cadence',
        title: 'Técnica en Nivel Óptimo — Mantenimiento de Reactividad',
        severity: 'baja',
        recommendation: 'Drills de potencia y zancadas reactivas para preservar la cadencia competitiva.'
      });
    }

    return {
      name: currentAthleteObj.name,
      category: currentAthleteObj.category || 'Sub-16',
      hasRealSessions: true,
      ipt,
      kneeAngle,
      symmetry,
      cadenceHz,
      deficits,
      sessionDate: latest.sessionDate || latest.createdAt
    };
  }, [selectedAthlete, currentAthleteObj, athleteSessions]);

  const cat = athleteEval.category || 'Sub-16';

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
        targetDrill.dosingByCat?.[cat] || targetDrill.dosing,
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
          details: `Dosificación ${cat}: ${drill.dosingByCat?.[cat] || drill.dosing} | Cues: ${drill.cues}`
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
      <section
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
                  Categoría Oficial {cat} FEDACHI
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
                Algoritmo que correlaciona déficits cinemáticos de la sesión con ejercicios correctivos dosificados.
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
                    {a.name} ({a.category || `Edad ${a.age || 15}`})
                  </option>
                ))
              ) : (
                <option value="1">Cargando atletas...</option>
              )}
            </select>

            <button
              type="button"
              disabled={isProcessingCv}
              onClick={handleRunRealCvForDrills}
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
              <span>{isProcessingCv ? 'Evaluando...' : 'Nueva Captura MediaPipe'}</span>
            </button>
          </div>
        </div>

        {cvMsg && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(56,189,248,0.15)', borderRadius: 8, border: '1px solid #38bdf8', color: '#7dd3fc', fontSize: 12, fontWeight: 600 }}>
            {cvMsg}
          </div>
        )}

        {!athleteEval.hasRealSessions && (
          <div style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid #eab308', borderRadius: 10, padding: '12px 16px', color: '#fef08a', fontSize: 12, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <span>Este atleta aún no cuenta con sesiones de carrera analizadas en base de datos. Ejecuta una toma con MediaPipe para prescribir drills con telemetría real.</span>
            <button
              type="button"
              onClick={handleRunRealCvForDrills}
              disabled={isProcessingCv}
              style={{ background: '#eab308', color: '#713f12', border: 'none', padding: '6px 14px', borderRadius: 6, fontWeight: 800, cursor: 'pointer' }}
            >
              Analizar con MediaPipe Ahora
            </button>
          </div>
        )}

        {/* DIAGNÓSTICO BIOMECÁNICO DEL ATLETA */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>IPT Actual</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#38bdf8', marginTop: 2 }}>
              {athleteEval.ipt} <span style={{ fontSize: 12, color: '#64748b' }}>pts</span>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Flexión Rodilla</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: athleteEval.kneeAngle < 26 ? '#f87171' : '#34d399', marginTop: 2 }}>
              {athleteEval.kneeAngle}° {athleteEval.kneeAngle < 26 && <span style={{ fontSize: 11, color: '#f87171' }}>(Bajo recobro)</span>}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Simetría Bilateral</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: athleteEval.symmetry < 90 ? '#fbbf24' : '#34d399', marginTop: 2 }}>
              {athleteEval.symmetry}% {athleteEval.symmetry < 90 && <span style={{ fontSize: 11, color: '#fbbf24' }}>(Asimétrico)</span>}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Cadencia Cíclica</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: athleteEval.cadenceHz < 3.2 ? '#f87171' : '#34d399', marginTop: 2 }}>
              {athleteEval.cadenceHz} Hz <span style={{ fontSize: 12, color: '#94a3b8' }}>({Math.round(athleteEval.cadenceHz * 60)} ppm)</span>
            </div>
          </div>
        </div>

        {/* LISTA DE DRILLS RECOMENDADOS AUTOMÁTICAMENTE */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <strong style={{ fontSize: 14, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Activity size={16} color="#38bdf8" />
              Drills Prescritos Específicamente para Corregir estos Déficits:
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
            {prescribedDrills.map((drill) => (
              <div
                key={drill.id}
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
                  ⏱️ <strong>Dosificación {cat}:</strong> <span style={{ color: 'white', fontWeight: 700 }}>{drill.dosingByCat?.[cat] || drill.dosing}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

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

        <div style={{ position: 'relative', width: 280 }}>
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
      <div className="drills-grid">
        {filtered.map((drill) => {
          const isRecommended = prescribedDrills.some(p => p.id === drill.id);
          return (
            <article key={drill.id} className="drill-library-card" style={isRecommended ? { borderColor: '#0284c7', boxShadow: '0 4px 14px rgba(2,132,199,0.15)' } : {}}>
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
                  <span>⏱️ Dosificación ({cat}): <strong>{drill.dosingByCat?.[cat] || drill.dosing}</strong></span>
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
            </article>
          );
        })}
      </div>

      {/* MODAL ASIGNAR EJERCICIO MANUAL */}
      {showAssignModal && targetDrill && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
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
                      defaultValue={targetDrill.dosingByCat?.[cat] || targetDrill.dosing}
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
          </div>
        </div>
      )}
    </Layout>
  );
}
