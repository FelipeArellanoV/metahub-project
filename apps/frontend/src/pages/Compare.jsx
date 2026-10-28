/**
 * =========================================================================================
 * PROYECTO METAHUB — SEGUIMIENTO LONGITUDINAL DE LA TÉCNICA DE CARRERA EN ATLETISMO ESCOLAR
 * Escuela de Ingeniería Civil en Informática — Universidad Católica de Temuco
 * 
 * Memoria / Trabajo de Título:
 * Autores: Felipe Arellano Vargas & Sofía Henríquez Soto
 * Profesor Guía: Dr. Marcos Lévano
 * 
 * Módulo: Comparador Biomecánico Split-Screen y Métricas Cinemáticas (Compare.jsx)
 * Descripción: Conectado a la base de datos persistente y microservicio de Visión por Computador.
 *              Permite contrastar cualquier par de sesiones reales de un atleta escolar,
 *              calculando deltas cinemáticos verdaderos (IPT, cadencia, zancada, ángulos)
 *              y permitiendo la ejecución de análisis MediaPipe en tiempo real.
 * =========================================================================================
 */

import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  Gauge,
  GitCompare,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Timer,
  TrendingUp,
  User,
  Zap,
  Video,
  Camera,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, PageHeader } from '../components/UI.jsx';
import api from '../services/api.js';
const poseRequest=async path=>{const r=await fetch((import.meta.env.VITE_API_BASE||'')+path,{headers:{Authorization:'Bearer '+localStorage.getItem('metahub_token')}});const data=await r.json();if(!r.ok)throw new Error(data.error||'No se pudieron cargar los datos');return data;};

const formatMetric=(value,digits)=>Number.isFinite(value)?value.toFixed(digits):'Sin medición';

function extractSessionMetrics(session) {
  if (!session) {
    return {
      id: 'N/A',
      date: 'Sin fecha',
      title: 'Sesión no disponible',
      ipt: 0,
      kneeAngle: 0,
      hipAngle: 0,
      symmetry: 0,
      trunkLean: 0,
      cadenceHz: 0,
      cadencePpm: 0,
      strideLengthM: 0,
      speedMs: 0,
      notes: ''
    };
  }

  const a = session.analysis || {};
  const sm = a.summary_metrics || {};
  const ipt = typeof session.iptScore === 'number'
    ? session.iptScore
    : (typeof a.ipt_score === 'number' ? a.ipt_score : NaN);

  const cadenceHz = sm.cadence_hz ?? (sm.avg_cadence_hz ?? NaN);
  const cadencePpm = sm.cadence_ppm ?? Math.round(cadenceHz * 60);
  const strideLengthM = sm.stride_length_m ?? NaN;
  const speedMs = sm.speed_ms ?? NaN;
  const kneeAngle = sm.avg_knee_angle ?? sm.min_knee_flexion ?? NaN;
  const hipAngle = sm.avg_hip_angle ?? sm.peak_hip_extension ?? NaN;
  const symmetry = sm.avg_symmetry_score ?? NaN;
  const trunkLean = sm.trunk_lean_angle ?? NaN;

  const dateFormatted = session.sessionDate
    ? new Date(session.sessionDate).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
    : (session.createdAt ? new Date(session.createdAt).toLocaleDateString('es-CL') : 'Fecha registro');

  return {
    id: `SES-${String(session.id).padStart(3, '0')}`,
    date: dateFormatted,
    rawDate: session.sessionDate || session.createdAt,
    title: session.notes ? session.notes.slice(0, 42) : `Sesión #${session.id}`,
    ipt: Number(ipt),
    kneeAngle: Number(kneeAngle),
    hipAngle: Number(hipAngle),
    symmetry: Number(symmetry),
    trunkLean: Number(trunkLean),
    cadenceHz: Number(cadenceHz),
    cadencePpm: Number(cadencePpm),
    strideLengthM: Number(strideLengthM),
    speedMs: Number(speedMs),
    notes: session.notes || '',
    videoUrl: session.videoUrl || ''
  };
}

export default function Compare() {
  const navigate = useNavigate();
  const viewerRole=JSON.parse(localStorage.getItem('metahub_user')||'{}').role;
  const [athletesList, setAthletesList] = useState([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState('');
  const [athleteSessions, setAthleteSessions] = useState([]);
  const [selectedSessionAId, setSelectedSessionAId] = useState('');
  const [selectedSessionBId, setSelectedSessionBId] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [isProcessingCv, setIsProcessingCv] = useState(false);
  const [cvStatusMessage, setCvStatusMessage] = useState('');

  const [isPlaying, setIsPlaying] = useState(false);
  const [scrubPhase, setScrubPhase] = useState(55);
  const animFrameRef = useRef(null);
  const [showSkeleton, setShowSkeleton] = useState(true);

  // 1. Cargar lista real de atletas desde el backend
  useEffect(() => {
    let isMounted = true;
    (viewerRole==='atleta' ? api.portal.getMe().then(data=>[data.athlete]) : poseRequest('/api/roster').then(data=>data.athletes))
      .then(list => {
        if (isMounted && Array.isArray(list) && list.length > 0) {
          setAthletesList(list);
          setSelectedAthleteId(String(list[0].id));
        }
      })
      .catch(err => {
        console.warn('Error cargando atletas:', err);
      });
    return () => { isMounted = false; };
  }, []);

  // 2. Al cambiar el atleta, cargar sus sesiones reales
  const loadSessionsForAthlete = (athleteId) => {
    if (!athleteId) return;
    setLoadingSessions(true);
    poseRequest('/api/videos/sessions?athleteId='+encodeURIComponent(athleteId)).then(data=>data.sessions)
      .then(sessions => {
        const sorted = (sessions || []).slice().sort((a, b) => new Date(a.sessionDate || a.createdAt) - new Date(b.sessionDate || b.createdAt));
        setAthleteSessions(sorted);
        if (sorted.length >= 2) {
          // Sesión A: primera en el tiempo (Línea base)
          setSelectedSessionAId(String(sorted[0].id));
          // Sesión B: última en el tiempo (Control posterior)
          setSelectedSessionBId(String(sorted[sorted.length - 1].id));
        } else if (sorted.length === 1) {
          setSelectedSessionAId(String(sorted[0].id));
          setSelectedSessionBId('');
        } else {
          setSelectedSessionAId('');
          setSelectedSessionBId('');
        }
      })
      .catch(err => {
        console.warn('Error cargando sesiones del atleta:', err);
        setAthleteSessions([]);
      })
      .finally(() => setLoadingSessions(false));
  };

  useEffect(() => {
    if (selectedAthleteId) {
      loadSessionsForAthlete(selectedAthleteId);
    }
  }, [selectedAthleteId]);

  const handleRunRealCvAnalysis=()=>navigate(viewerRole==='atleta'?'/upload':'/capture');

  // 4. Animación de reproducción sincronizada en bucle
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let lastTime = performance.now();
    const cycleDuration = 1800; // 1.8 segundos por zancada en cámara lenta para análisis

    const tick = (now) => {
      const elapsed = now - lastTime;
      setScrubPhase(prev => {
        const next = prev + (elapsed / cycleDuration) * 100;
        return next >= 100 ? 0 : next;
      });
      lastTime = now;
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying]);

  // Sesiones seleccionadas para la comparativa
  const rawSessionA = athleteSessions.find(s => String(s.id) === String(selectedSessionAId));
  const rawSessionB = athleteSessions.find(s => String(s.id) === String(selectedSessionBId));

  const sA = useMemo(() => extractSessionMetrics(rawSessionA), [rawSessionA]);
  const sB = useMemo(() => extractSessionMetrics(rawSessionB), [rawSessionB]);

  const hasTwoSessions = Boolean(rawSessionA && rawSessionB && rawSessionA.id !== rawSessionB.id);

  // Cálculo de deltas dinámicos
  const deltas = useMemo(() => {
    if (!hasTwoSessions) return [];
    const diffIpt = sB.ipt - sA.ipt;
    const diffCadence = sB.cadenceHz - sA.cadenceHz;
    const diffStride = sB.strideLengthM - sA.strideLengthM;
    const diffSpeed = sB.speedMs - sA.speedMs;
    const diffKnee = sB.kneeAngle - sA.kneeAngle;
    const diffSym = sB.symmetry - sA.symmetry;

    return [
      {
        metric: 'Índice de Perfeccionamiento Técnico (IPT)',
        unit: 'pts',
        before: formatMetric(sA.ipt,1),
        after: formatMetric(sB.ipt,1),
        diff: `${diffIpt >= 0 ? '+' : ''}${diffIpt.toFixed(1)} pts`,
        percent: `${diffIpt >= 0 ? '+' : ''}${sA.ipt > 0 ? ((diffIpt / sA.ipt) * 100).toFixed(1) : 0}%`,
        positive: diffIpt >= 0,
        interpretation: 'Eficiencia técnica global consolidada',
        icon: <Sparkles size={16} />
      },
      {
        metric: 'Cadencia de Zancada',
        unit: 'Hz (pasos/s)',
        before: `${formatMetric(sA.cadenceHz,2)} Hz`,
        after: `${formatMetric(sB.cadenceHz,2)} Hz`,
        diff: `${diffCadence >= 0 ? '+' : ''}${diffCadence.toFixed(2)} Hz`,
        percent: `${sB.cadencePpm} ppm (antes ${sA.cadencePpm})`,
        positive: diffCadence >= 0,
        interpretation: 'Mayor velocidad de ciclo por segundo',
        icon: <Timer size={16} />
      },
      {
        metric: 'Longitud de Zancada Estimada',
        unit: 'metros',
        before: `${formatMetric(sA.strideLengthM,2)} m`,
        after: `${formatMetric(sB.strideLengthM,2)} m`,
        diff: `${diffStride >= 0 ? '+' : ''}${diffStride.toFixed(2)} m`,
        percent: `${diffStride >= 0 ? '+' : ''}${sA.strideLengthM > 0 ? ((diffStride / sA.strideLengthM) * 100).toFixed(1) : 0}% amplitud`,
        positive: diffStride >= 0,
        interpretation: 'Amplitud de ataque sin sobrezancada',
        icon: <Gauge size={16} />
      },
      {
        metric: 'Velocidad de Pasada (v = Cadencia × Zancada)',
        unit: 'm/s',
        before: `${formatMetric(sA.speedMs,2)} m/s`,
        after: `${formatMetric(sB.speedMs,2)} m/s`,
        diff: `${diffSpeed >= 0 ? '+' : ''}${diffSpeed.toFixed(2)} m/s`,
        percent: `${(sB.speedMs * 3.6).toFixed(1)} km/h (antes ${(sA.speedMs * 3.6).toFixed(1)})`,
        positive: diffSpeed >= 0,
        interpretation: 'Incremento neto de velocidad lineal',
        icon: <Zap size={16} />
      },
      {
        metric: 'Flexión de Rodilla (Fase de Recobro)',
        unit: 'grados',
        before: `${formatMetric(sA.kneeAngle,1)}°`,
        after: `${formatMetric(sB.kneeAngle,1)}°`,
        diff: `${diffKnee >= 0 ? '+' : ''}${diffKnee.toFixed(1)}°`,
        percent: diffKnee >= 0 ? 'Mayor elevación de ataque' : 'Recobro más plano',
        positive: diffKnee >= 0,
        interpretation: 'Reducción del momento de inercia de la pierna libre',
        icon: <Activity size={16} />
      },
      {
        metric: 'Índice de Simetría Bilateral',
        unit: '%',
        before: `${formatMetric(sA.symmetry,1)}%`,
        after: `${formatMetric(sB.symmetry,1)}%`,
        diff: `${diffSym >= 0 ? '+' : ''}${diffSym.toFixed(1)}%`,
        percent: 'Equilibrio bilateral de apoyos',
        positive: diffSym >= 0,
        interpretation: 'Prevención activa de lesiones por sobrecarga asimétrica',
        icon: <GitCompare size={16} />
      }
    ].filter((_,i)=>[['ipt','ipt'],['cadenceHz','cadenceHz'],['strideLengthM','strideLengthM'],['speedMs','speedMs'],['kneeAngle','kneeAngle'],['symmetry','symmetry']][i].every((key,j)=>Number.isFinite((j?sB:sA)[key])));
  }, [sA, sB, hasTwoSessions]);

  const currentAthlete = athletesList.find(a => String(a.id) === String(selectedAthleteId));

  const dynamicCoachVerdict=hasTwoSessions&&Number.isFinite(sA.ipt)&&Number.isFinite(sB.ipt)
   ? 'Cambio observado de IPT: '+(sB.ipt-sA.ipt).toFixed(1)+' puntos. Revisa las tomas y sus condiciones de captura junto al entrenador.' : null;

  const getPhaseName = (val) => {
    if (val < 33) return 'Fase de Impulso / Despegue Post-Contacto';
    if (val < 66) return 'Fase de Vuelo / Recobro Alto y Ataque';
    return 'Fase de Amortiguación y Contacto Inicial';
  };

  // Coordenadas dinámicas de cinemática para el esqueleto
  const t = scrubPhase / 100;
  const kneeY_A = 215 - Math.sin(t * Math.PI) * 22;
  const kneeX_A = 165 - Math.cos(t * Math.PI) * 15;
  const footY_A = 255 - Math.sin(t * Math.PI) * 18;
  const footX_A = 140 - Math.cos(t * Math.PI) * 25;

  const kneeY_B = 195 - Math.sin(t * Math.PI) * (25 + Math.min(15, (Number.isFinite(sB.kneeAngle - sA.kneeAngle) ? sB.kneeAngle - sA.kneeAngle : 0) * 2));
  const kneeX_B = 160 - Math.cos(t * Math.PI) * 18;
  const footY_B = 238 - Math.sin(t * Math.PI) * 28;
  const footX_B = 185 - Math.cos(t * Math.PI) * 30;

  return (
    <Layout>
      <PageHeader
        eyebrow="SEGUIMIENTO LONGITUDINAL BIOMECÁNICO REAL"
        title="Comparador Bi-Sesión «Antes vs. Después»"
        description="Contrasta sincrónicamente la técnica de carrera entre sesiones reales almacenadas, evaluando cadencia (Hz), longitud de zancada (m) y ángulos articulares con MediaPipe."
        action={
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className={`filter-pill ${showSkeleton ? 'active' : ''}`}
              type="button"
              onClick={() => setShowSkeleton(!showSkeleton)}
            >
              <Layers size={14} style={{ display: 'inline', marginRight: 6 }} />
              {showSkeleton ? 'Ocultar Esqueleto' : 'Mostrar Esqueleto'}
            </button>
            <button
              type="button"
              className="primary-button"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px' }}
              onClick={() => navigate('/drills?athlete=' + selectedAthleteId)}
            >
              <Dumbbell size={16} />
              <span>Prescribir Drills para este Atleta</span>
            </button>
          </div>
        }
      />

      {/* BARRA DE SELECCIÓN DE ATLETA Y SESIONES REALES */}
      <div className="comparator-header-bar" style={{ background: 'white', padding: '16px 20px', borderRadius: 14, border: '1px solid #e2e8f0', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={18} color="#0284c7" />
              <strong style={{ fontSize: 13, color: '#10283f' }}>Atleta:</strong>
            </div>
            <select
              className="form-control"
              style={{ width: 230, height: 38, fontSize: 13, fontWeight: 600 }}
              value={selectedAthleteId}
              onChange={(e) => setSelectedAthleteId(e.target.value)}
            >
              {athletesList.map(a => (
                <option key={a.id} value={String(a.id)}>
                  {a.name} ({a.category || `Edad ${a.age || 15}`})
                </option>
              ))}
            </select>

            {/* Selector de Sesión A (Antes) */}
            {athleteSessions.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Sesión A (Antes):</span>
                <select
                  className="form-control"
                  style={{ width: 170, height: 38, fontSize: 12, fontWeight: 600 }}
                  value={selectedSessionAId}
                  onChange={(e) => setSelectedSessionAId(e.target.value)}
                >
                  {athleteSessions.map(s => (
                    <option key={s.id} value={String(s.id)}>
                      #{s.id} — {new Date(s.sessionDate || s.createdAt).toLocaleDateString('es-CL')} (IPT {s.iptScore || 's/d'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Selector de Sesión B (Después) */}
            {athleteSessions.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0284c7' }}>Sesión B (Después):</span>
                <select
                  className="form-control"
                  style={{ width: 170, height: 38, fontSize: 12, fontWeight: 600 }}
                  value={selectedSessionBId}
                  onChange={(e) => setSelectedSessionBId(e.target.value)}
                >
                  {athleteSessions.map(s => (
                    <option key={s.id} value={String(s.id)}>
                      #{s.id} — {new Date(s.sessionDate || s.createdAt).toLocaleDateString('es-CL')} (IPT {s.iptScore || 's/d'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-outline-sm"
              disabled={isProcessingCv}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                background: '#f0fdf4',
                color: '#15803d',
                border: '1px solid #bbf7d0',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 12
              }}
              onClick={handleRunRealCvAnalysis}
            >
              {isProcessingCv ? <RefreshCw size={14} className="spin" /> : <Camera size={14} />}
              <span>{isProcessingCv ? 'Procesando en :8000...' : 'Grabar o subir carrera'}</span>
            </button>
          </div>
        </div>

        {cvStatusMessage && (
          <div style={{ marginTop: 12, padding: '8px 14px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe', color: '#1e40af', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={14} className="spin" />
            <span>{cvStatusMessage}</span>
          </div>
        )}
      </div>

      {/* CASO: Menos de 2 sesiones registradas para este atleta */}
      {!hasTwoSessions && (
        <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 14, padding: '24px 28px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <AlertCircle size={32} color="#d97706" />
            <div>
              <strong style={{ display: 'block', fontSize: 15, color: '#92400e' }}>
                Atleta con {athleteSessions.length} sesión(es) en base de datos
              </strong>
              <span style={{ fontSize: 13, color: '#b45309' }}>
                Para contrastar el antes y después se requieren al menos 2 sesiones de carrera.
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="primary-button"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: '#d97706', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
              onClick={handleRunRealCvAnalysis}
              disabled={isProcessingCv}
            >
              <Camera size={16} />
              <span>Grabar o subir carrera</span>
            </button>
            <button
              type="button"
              className="btn-outline-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'white', border: '1px solid #d97706', color: '#b45309', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
              onClick={() => navigate(viewerRole==='atleta'?'/upload':'/capture')}
            >
              <Video size={16} />
              <span>Ir a Captura en Terreno</span>
            </button>
          </div>
        </div>
      )}

      <p style={{fontSize:12,color:"#64748b"}}>Animación ilustrativa de la zancada. El movimiento del monito no reproduce las articulaciones detectadas en el video. Las mediciones disponibles corresponden a las sesiones seleccionadas.</p>
      {/* REPRODUCTOR SINCRONIZADO Y CONTROL DE FASE */}
      <div className="sync-playback-bar" style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#f8fafc', padding: '14px 20px', borderRadius: 14, border: '1px solid #e2e8f0', marginBottom: 24 }}>
        <button
          type="button"
          className="btn-schedule-sm"
          style={{ width: 140, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#0284c7', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          <span>{isPlaying ? 'Pausar Sincro' : 'Reproducir'}</span>
        </button>

        <button
          type="button"
          className="btn-outline-sm"
          style={{ height: 40, padding: '0 14px', background: 'white', border: '1px solid #cbd5e1', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          title="Reiniciar ciclo"
          onClick={() => setScrubPhase(0)}
        >
          <RotateCcw size={16} />
        </button>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ fontWeight: 700, color: '#10283f' }}>
              Fase ilustrada: <span style={{ color: '#0284c7' }}>{getPhaseName(scrubPhase)}</span>
            </span>
            <span style={{ color: '#64748b', fontWeight: 700, fontFamily: 'monospace' }}>
              {Math.round(scrubPhase)}% del ciclo de zancada
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={scrubPhase}
            onChange={(e) => setScrubPhase(parseInt(e.target.value, 10))}
            style={{ width: '100%', cursor: 'pointer', accentColor: '#0284c7' }}
          />
        </div>
      </div>

      {/* VISTA SPLIT-SCREEN LADO A LADO */}
      <div className="split-screen-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 26 }}>
        {/* LADO IZQUIERDO: TOMA INICIAL (SESIÓN A) */}
        <div className="video-mock-card" style={{ background: '#0b1329', borderRadius: 16, overflow: 'hidden', border: '1px solid #1e293b', color: 'white', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
          <div className="video-mock-header" style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: 1 }}>
                ANTES · LÍNEA BASE
              </span>
              <strong style={{ display: 'block', fontSize: 15, marginTop: 2 }}>
                {sA.title}
              </strong>
            </div>
            <span style={{ fontSize: 12, color: '#94a3b8', background: 'rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: 6 }}>
              {sA.id} · {sA.date}
            </span>
          </div>

          <div className="video-canvas-viewport" style={{ position: 'relative', height: 280, background: 'radial-gradient(circle at center, #111e38 0%, #060b18 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 400 300" style={{ width: '100%', height: '100%' }}>
              <line x1="20" y1="260" x2="380" y2="260" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
              
              {showSkeleton && (
                <g stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" opacity="0.9">
                  <circle cx="200" cy="70" r="13" fill="#0284c7" />
                  <line x1="200" y1="83" x2="190" y2="160" />
                  <line x1="190" y1="160" x2={kneeX_A} y2={kneeY_A} stroke="#f43f5e" strokeWidth="4" />
                  <line x1={kneeX_A} y1={kneeY_A} x2={footX_A} y2={footY_A} stroke="#f43f5e" strokeWidth="4" />
                  <line x1="190" y1="160" x2="225" y2="210" />
                  <line x1="225" y1="210" x2="235" y2="258" />
                  <line x1="198" y1="105" x2="170" y2="140" />
                  <line x1="198" y1="105" x2="230" y2="135" />
                  <circle cx={kneeX_A} cy={kneeY_A} r="5" fill="#f43f5e" />
                  <circle cx="190" cy="160" r="5" fill="#38bdf8" />
                </g>
              )}
            </svg>

            <div style={{ position: 'absolute', top: '55%', left: '22%', background: 'rgba(244,63,94,0.2)', border: '1px solid #f43f5e', color: '#fda4af', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
              Flexión: {formatMetric(sA.kneeAngle,1)}°
            </div>

            <div style={{ position: 'absolute', bottom: 12, left: 16, fontSize: 11, color: '#f87171' }}>
              Cadencia: {formatMetric(sA.cadenceHz,2)} Hz ({sA.cadencePpm} ppm)
            </div>
          </div>

          <div className="video-mock-footer" style={{ padding: '12px 18px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 12 }}>
            <div>IPT: <strong style={{ color: '#fca5a5' }}>{formatMetric(sA.ipt,1)} pts</strong></div>
            <div>Cadencia: <strong style={{ color: '#cbd5e1' }}>{formatMetric(sA.cadenceHz,2)} Hz</strong></div>
            <div>Zancada: <strong style={{ color: '#cbd5e1' }}>{formatMetric(sA.strideLengthM,2)} m</strong></div>
          </div>
        </div>

        {/* LADO DERECHO: CONTROL POSTERIOR (SESIÓN B) */}
        <div className="video-mock-card" style={{ background: '#0b1329', borderRadius: 16, overflow: 'hidden', border: '2px solid #0284c7', color: 'white', boxShadow: '0 12px 30px rgba(2,132,199,0.2)' }}>
          <div className="video-mock-header" style={{ padding: '14px 18px', background: 'rgba(2,132,199,0.15)', borderBottom: '1px solid rgba(2,132,199,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#38bdf8', letterSpacing: 1 }}>
                DESPUÉS · CONTROL POSTERIOR
              </span>
              <strong style={{ display: 'block', fontSize: 15, marginTop: 2, color: 'white' }}>
                {sB.title}
              </strong>
            </div>
            <span style={{ fontSize: 12, color: '#38bdf8', background: 'rgba(2,132,199,0.25)', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
              {sB.id} · {sB.date}
            </span>
          </div>

          <div className="video-canvas-viewport" style={{ position: 'relative', height: 280, background: 'radial-gradient(circle at center, #0e294b 0%, #060b18 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 400 300" style={{ width: '100%', height: '100%' }}>
              <line x1="20" y1="260" x2="380" y2="260" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
              
              {showSkeleton && (
                <g stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" opacity="0.95">
                  <circle cx="205" cy="65" r="13" fill="#0284c7" />
                  <line x1="205" y1="78" x2="198" y2="155" />
                  <line x1="198" y1="155" x2={kneeX_B} y2={kneeY_B} stroke="#10b981" strokeWidth="4" />
                  <line x1={kneeX_B} y1={kneeY_B} x2={footX_B} y2={footY_B} stroke="#10b981" strokeWidth="4" />
                  <line x1="198" y1="155" x2="235" y2="205" />
                  <line x1="235" y1="205" x2="248" y2="258" />
                  <line x1="203" y1="100" x2="165" y2="135" />
                  <line x1="203" y1="100" x2="242" y2="130" />
                  <circle cx={kneeX_B} cy={kneeY_B} r="5" fill="#10b981" />
                  <circle cx="198" cy="155" r="5" fill="#38bdf8" />
                </g>
              )}
            </svg>

            <div style={{ position: 'absolute', top: '50%', left: '22%', background: 'rgba(16,185,129,0.2)', border: '1px solid #10b981', color: '#6ee7b7', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
              Flexión: {formatMetric(sB.kneeAngle,1)}°
            </div>

            <div style={{ position: 'absolute', bottom: 12, left: 16, fontSize: 11, color: '#6ee7b7', fontWeight: 600 }}>
              Cadencia: {formatMetric(sB.cadenceHz,2)} Hz ({sB.cadencePpm} ppm)
            </div>
          </div>

          <div className="video-mock-footer" style={{ padding: '12px 18px', background: 'rgba(2,132,199,0.1)', borderTop: '1px solid rgba(2,132,199,0.2)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 12 }}>
            <div>IPT: <strong style={{ color: '#86efac' }}>{formatMetric(sB.ipt,1)} pts</strong></div>
            <div>Cadencia: <strong style={{ color: '#6ee7b7' }}>{formatMetric(sB.cadenceHz,2)} Hz</strong></div>
            <div>Zancada: <strong style={{ color: '#6ee7b7' }}>{formatMetric(sB.strideLengthM,2)} m</strong></div>
          </div>
        </div>
      </div>



      {/* TARJETAS DE DELTAS BIOMECÁNICOS */}
      {hasTwoSessions && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#10283f', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={18} color="#0284c7" />
              <span>Deltas Biomecánicos y Cinemáticos de Evolución Real (Δ)</span>
            </h3>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Comparativa entre {sA.date} vs. {sB.date}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {deltas.map((d, idx) => (
              <div
                key={idx}
                style={{
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: '16px 18px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {d.icon}
                    {d.metric}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: d.positive ? '#ecfdf5' : '#fef2f2',
                      color: d.positive ? '#059669' : '#dc2626'
                    }}
                  >
                    {d.diff}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
                  <span style={{ fontSize: 14, color: '#94a3b8', textDecoration: 'line-through' }}>{d.before}</span>
                  <span style={{ color: '#0284c7', fontWeight: 800 }}>➔</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{d.after}</span>
                </div>

                <div style={{ fontSize: 11, color: '#64748b', borderTop: '1px dashed #e2e8f0', paddingTop: 8, marginTop: 'auto' }}>
                  <span style={{ fontWeight: 600, color: '#334155' }}>Impacto: </span>
                  {d.interpretation} ({d.percent})
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DICTAMEN TÉCNICO Y ACCIÓN FORMATIVA */}
      {dynamicCoachVerdict && (
        <div
          style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
            marginBottom: 30
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 size={22} color="#10b981" />
              <div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#10283f' }}>
                  Resumen de mediciones disponibles
                </h4>
                <span style={{ fontSize: 12, color: '#64748b' }}>Comparación de resultados almacenados</span>
              </div>
            </div>

            <button
              type="button"
              className="primary-button"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#0284c7' }}
              onClick={() => navigate('/drills?athlete=' + selectedAthleteId)}
            >
              <Dumbbell size={16} />
              <span>Prescribir Ejercicios para este Atleta</span>
              <ChevronRight size={16} />
            </button>
          </div>

          <p style={{ fontSize: 13, color: '#334155', margin: 0, lineHeight: 1.6, background: '#f8fafc', padding: 16, borderRadius: 10, borderLeft: '4px solid #0284c7' }}>
            "{dynamicCoachVerdict}"
          </p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
            <span className="report-badge-pill" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f0fdf4', color: '#166534', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
              <Sparkles size={14} /> Evolución IPT: {(sB.ipt - sA.ipt) >= 0 ? '+' : ''}{(sB.ipt - sA.ipt).toFixed(1)} pts
            </span>
            <span className="report-badge-pill" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#eff6ff', color: '#1e40af', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
              <Timer size={14} /> Cadencia Actual: {formatMetric(sB.cadenceHz,2)} Hz ({sB.cadencePpm} ppm)
            </span>
          </div>
        </div>
      )}
    </Layout>
  );
}
