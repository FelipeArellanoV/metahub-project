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
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  Gauge,
  GitCompare,
  Layers,
  Sparkles,
  Timer,
  User,
  Zap,
  Video,
  Camera,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, PageHeader } from '../components/UI.jsx';
import api from '../services/api.js';
import { SkeletonList, cardVariants, motion } from '../components/Motion.jsx';
import PoseComparison from '../components/PoseComparison.jsx';
import { extraerMetricasSesion, formatearMetrica, compararSesiones } from '../services/metricasSesion.js';
const poseRequest=async path=>{const r=await fetch((import.meta.env.VITE_API_BASE||'')+path,{headers:{Authorization:'Bearer '+localStorage.getItem('metahub_token')}});const data=await r.json();if(!r.ok)throw new Error(data.error||'No se pudieron cargar los datos');return data;};


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

  // Sesiones seleccionadas para la comparativa
  const rawSessionA = athleteSessions.find(s => String(s.id) === String(selectedSessionAId));
  const rawSessionB = athleteSessions.find(s => String(s.id) === String(selectedSessionBId));

  const sA = useMemo(() => extraerMetricasSesion(rawSessionA), [rawSessionA]);
  const sB = useMemo(() => extraerMetricasSesion(rawSessionB), [rawSessionB]);

  const hasTwoSessions = Boolean(rawSessionA && rawSessionB && rawSessionA.id !== rawSessionB.id);

  // Cálculo de deltas dinámicos
  const deltas = useMemo(() => {
    if (!hasTwoSessions) return [];
    const cmp = compararSesiones(sA, sB);
    const diffIpt = cmp.ipt.diff ?? NaN;
    const diffCadence = cmp.cadenceHz.diff ?? NaN;
    const diffStride = cmp.strideLengthM.diff ?? NaN;
    const diffSpeed = cmp.speedMs.diff ?? NaN;
    const diffKnee = cmp.kneeAngle.diff ?? NaN;
    const diffSym = cmp.symmetry.diff ?? NaN;

    return [
      {
        metric: 'Índice de Perfeccionamiento Técnico (IPT)',
        unit: 'pts',
        before: formatearMetrica(sA.ipt,1),
        after: formatearMetrica(sB.ipt,1),
        diff: `${diffIpt >= 0 ? '+' : ''}${diffIpt.toFixed(1)} pts`,
        percent: `${diffIpt >= 0 ? '+' : ''}${sA.ipt > 0 ? ((diffIpt / sA.ipt) * 100).toFixed(1) : 0}%`,
        positive: diffIpt >= 0,
        interpretation: 'Eficiencia técnica global consolidada',
        icon: <Sparkles size={16} />
      },
      {
        metric: 'Cadencia de Zancada',
        unit: 'Hz (pasos/s)',
        before: `${formatearMetrica(sA.cadenceHz,2)} Hz`,
        after: `${formatearMetrica(sB.cadenceHz,2)} Hz`,
        diff: `${diffCadence >= 0 ? '+' : ''}${diffCadence.toFixed(2)} Hz`,
        percent: `${sB.cadencePpm} ppm (antes ${sA.cadencePpm})`,
        positive: diffCadence >= 0,
        interpretation: 'Mayor velocidad de ciclo por segundo',
        icon: <Timer size={16} />
      },
      {
        metric: 'Longitud de Zancada Estimada',
        unit: 'metros',
        before: `${formatearMetrica(sA.strideLengthM,2)} m`,
        after: `${formatearMetrica(sB.strideLengthM,2)} m`,
        diff: `${diffStride >= 0 ? '+' : ''}${diffStride.toFixed(2)} m`,
        percent: `${diffStride >= 0 ? '+' : ''}${sA.strideLengthM > 0 ? ((diffStride / sA.strideLengthM) * 100).toFixed(1) : 0}% amplitud`,
        positive: diffStride >= 0,
        interpretation: 'Amplitud de ataque sin sobrezancada',
        icon: <Gauge size={16} />
      },
      {
        metric: 'Velocidad de Pasada (v = Cadencia × Zancada)',
        unit: 'm/s',
        before: `${formatearMetrica(sA.speedMs,2)} m/s`,
        after: `${formatearMetrica(sB.speedMs,2)} m/s`,
        diff: `${diffSpeed >= 0 ? '+' : ''}${diffSpeed.toFixed(2)} m/s`,
        percent: `${(sB.speedMs * 3.6).toFixed(1)} km/h (antes ${(sA.speedMs * 3.6).toFixed(1)})`,
        positive: diffSpeed >= 0,
        interpretation: 'Incremento neto de velocidad lineal',
        icon: <Zap size={16} />
      },
      {
        metric: 'Flexión de Rodilla (Fase de Recobro)',
        unit: 'grados',
        before: `${formatearMetrica(sA.kneeAngle,1)}°`,
        after: `${formatearMetrica(sB.kneeAngle,1)}°`,
        diff: `${diffKnee >= 0 ? '+' : ''}${diffKnee.toFixed(1)}°`,
        percent: diffKnee >= 0 ? 'Mayor elevación de ataque' : 'Recobro más plano',
        positive: diffKnee >= 0,
        interpretation: 'Reducción del momento de inercia de la pierna libre',
        icon: <Activity size={16} />
      },
      {
        metric: 'Índice de Simetría Bilateral',
        unit: '%',
        before: `${formatearMetrica(sA.symmetry,1)}%`,
        after: `${formatearMetrica(sB.symmetry,1)}%`,
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

  // Mediciones almacenadas de cada sesión, mostradas bajo los videos reales.
  const conUnidad = (value, digits, unit) => Number.isFinite(value) ? formatearMetrica(value, digits) + unit : formatearMetrica(value, digits);
  const sessionSummary = (s, label, accent) => (
    <div className="compare-session-summary" style={{ borderTop: `3px solid ${accent}` }}>
      <span className="compare-session-label">{label}</span>
      <strong>{s.title}</strong>
      <small>{s.id} · {s.date}</small>
      <dl>
        <div><dt>IPT</dt><dd>{conUnidad(s.ipt,1,' pts')}</dd></div>
        <div><dt>Cadencia</dt><dd>{conUnidad(s.cadenceHz,2,' Hz')}</dd></div>
        <div><dt>Zancada</dt><dd>{conUnidad(s.strideLengthM,2,' m')}</dd></div>
        <div><dt>Flexión rodilla</dt><dd>{conUnidad(s.kneeAngle,1,'°')}</dd></div>
      </dl>
    </div>
  );

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
      <motion.div variants={cardVariants} className="comparator-header-bar" style={{ background: 'white', padding: '16px 20px', borderRadius: 14, border: '1px solid #e2e8f0', marginBottom: 20 }}>
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
                  {a.name}{a.category ? ` (${a.category})` : a.age ? ` (Edad ${a.age})` : ''}
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
      </motion.div>

      {/* CASO: Menos de 2 sesiones registradas para este atleta */}
      {loadingSessions && !hasTwoSessions && (
        <div className="panel-card" style={{ marginBottom: 24 }}><SkeletonList rows={2} label="Cargando sesiones del atleta…" /></div>
      )}
      {!hasTwoSessions && !loadingSessions && (
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

      {/* VIDEOS REALES CON EL ESQUELETO DETECTADO POR MEDIAPIPE, SINCRONIZADOS */}
      {hasTwoSessions && (
        <motion.div variants={cardVariants} style={{ marginBottom: 26 }}>
          <PoseComparison sessionA={rawSessionA} sessionB={rawSessionB} showSkeleton={showSkeleton} canAnalyze />
          <div className="compare-session-summaries">
            {sessionSummary(sA, 'ANTES · LÍNEA BASE', '#94a3b8')}
            {sessionSummary(sB, 'DESPUÉS · CONTROL POSTERIOR', '#0284c7')}
          </div>
        </motion.div>
      )}

      {/* TARJETAS DE DELTAS BIOMECÁNICOS */}
      {hasTwoSessions && (
        <motion.div style={{ marginBottom: 28 }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
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
        </motion.div>
      )}

      {/* DICTAMEN TÉCNICO Y ACCIÓN FORMATIVA */}
      {dynamicCoachVerdict && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
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
              <Timer size={14} /> Cadencia Actual: {formatearMetrica(sB.cadenceHz,2)} Hz{Number.isFinite(sB.cadencePpm) ? ` (${sB.cadencePpm} ppm)` : ''}
            </span>
          </div>
        </motion.div>
      )}
    </Layout>
  );
}
