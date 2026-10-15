import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Compass,
  FileCheck,
  GitCompare,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  TrendingUp,
  User,
  Video
} from 'lucide-react';
import { useState } from 'react';
import { Layout, PageHeader } from '../components/UI.jsx';

const comparisonData = {
  'Martín Atleta': {
    initialSession: {
      id: 'S-002',
      date: '15 Mar 2026',
      title: 'Evaluación Inicial (Mes 1)',
      kneeAngle: '24,2°',
      hipAngle: '38,5°',
      symmetry: '85,2%',
      trunkLean: '-7,4°',
      cadence: '3,1 Hz',
      notes: 'Flexión de rodilla baja en recobro; ligera caída de cadera en contacto.'
    },
    currentSession: {
      id: 'S-014',
      date: '26 Sep 2026',
      title: 'Control Longitudinal (Mes 6)',
      kneeAngle: '28,1°',
      hipAngle: '44,2°',
      symmetry: '95,8%',
      trunkLean: '-4,2°',
      cadence: '3,4 Hz',
      notes: 'Excelente elevación de rodilla; zancada simétrica y centro de masa estable.'
    },
    deltas: [
      {
        metric: 'Flexión de Rodilla (Recobro)',
        before: '24,2°',
        after: '28,1°',
        diff: '+3,9°',
        status: 'positive',
        interpretation: 'Mayor altura de ataque y amplitud de zancada'
      },
      {
        metric: 'Índice de Simetría Izq / Der',
        before: '85,2%',
        after: '95,8%',
        diff: '+10,6%',
        status: 'positive',
        interpretation: 'Equilibrio biomecánico óptimo entre extremidades'
      },
      {
        metric: 'Inclinación de Tronco',
        before: '-7,4°',
        after: '-4,2°',
        diff: '+3,2°',
        status: 'positive',
        interpretation: 'Postura más erguida, previene frenado anterior'
      },
      {
        metric: 'Cadencia Estimada',
        before: '3,1 Hz',
        after: '3,4 Hz',
        diff: '+0,3 Hz',
        status: 'positive',
        interpretation: 'Mayor velocidad de ciclo por segundo'
      }
    ]
  },
  'Antonia Pérez': {
    initialSession: {
      id: 'S-003',
      date: '22 Mar 2026',
      title: 'Evaluación Inicial (Mes 1)',
      kneeAngle: '25,0°',
      hipAngle: '39,1°',
      symmetry: '81,5%',
      trunkLean: '-6,8°',
      cadence: '2,9 Hz',
      notes: 'Disparidad notable entre pierna izquierda y derecha.'
    },
    currentSession: {
      id: 'S-011',
      date: '20 Sep 2026',
      title: 'Control Longitudinal (Mes 6)',
      kneeAngle: '27,4°',
      hipAngle: '42,0°',
      symmetry: '89,2%',
      trunkLean: '-5,1°',
      cadence: '3,2 Hz',
      notes: 'Mejora sostenida tras trabajo unilateral en tobillo.'
    },
    deltas: [
      {
        metric: 'Flexión de Rodilla',
        before: '25,0°',
        after: '27,4°',
        diff: '+2,4°',
        status: 'positive',
        interpretation: 'Elevación de rodilla en rango esperado para Sub-14'
      },
      {
        metric: 'Simetría de Zancada',
        before: '81,5%',
        after: '89,2%',
        diff: '+7,7%',
        status: 'positive',
        interpretation: 'Reducción de sobrecarga en pierna derecha'
      },
      {
        metric: 'Inclinación de Tronco',
        before: '-6,8°',
        after: '-5,1°',
        diff: '+1,7°',
        status: 'positive',
        interpretation: 'Mejor alineación cefalocaudal'
      },
      {
        metric: 'Cadencia',
        before: '2,9 Hz',
        after: '3,2 Hz',
        diff: '+0,3 Hz',
        status: 'positive',
        interpretation: 'Ritmo más fluido en velocidad mantenida'
      }
    ]
  }
};

export default function Compare() {
  const [selectedAthlete, setSelectedAthlete] = useState('Martín Atleta');
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrubPhase, setScrubPhase] = useState(60); // 0% = Despegue, 50% = Vuelo, 100% = Contacto
  const [showSkeleton, setShowSkeleton] = useState(true);

  const currentData = comparisonData[selectedAthlete] || comparisonData['Martín Atleta'];

  const getPhaseName = (val) => {
    if (val < 33) return 'Fase de Impulso / Despegue';
    if (val < 66) return 'Fase de Vuelo / Recobro Alto';
    return 'Fase de Contacto Inicial';
  };

  return (
    <Layout>
      <PageHeader
        eyebrow="SEGUIMIENTO LONGITUDINAL BIOMECÁNICO"
        title="Comparador Bi-Sesión Antes vs. Después"
        description="Analiza visualmente la evolución técnica entre la toma inicial y el control actual mediante reproducción sincronizada."
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className={`filter-pill ${showSkeleton ? 'active' : ''}`}
              type="button"
              onClick={() => setShowSkeleton(!showSkeleton)}
            >
              <Layers size={14} style={{ display: 'inline', marginRight: 6 }} />
              {showSkeleton ? 'Ocultar Esqueleto' : 'Mostrar Esqueleto'}
            </button>
          </div>
        }
      />

      {/* TOP CONTROL BAR */}
      <div className="comparator-header-bar">
        <div className="comparator-selectors">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={18} color="#2474d2" />
            <strong style={{ fontSize: 13, color: '#10283f' }}>Atleta evaluado:</strong>
          </div>
          <select
            className="form-control"
            style={{ width: 200, height: 38, fontSize: 13 }}
            value={selectedAthlete}
            onChange={(e) => setSelectedAthlete(e.target.value)}
          >
            <option value="Martín Atleta">Martín Atleta (Sub-16)</option>
            <option value="Antonia Pérez">Antonia Pérez (Sub-14)</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: '#7b8798', fontWeight: 600 }}>
            Periodo evaluado: <strong>Marzo ➔ Septiembre 2026 (6 Meses)</strong>
          </span>
          <span
            style={{
              background: '#e9f8f1',
              color: '#116945',
              fontWeight: 800,
              fontSize: 11,
              padding: '4px 10px',
              borderRadius: 8
            }}
          >
            Mejora validada ✓
          </span>
        </div>
      </div>

      {/* SYNCHRONIZED PLAYBACK & SCRUB BAR */}
      <div className="sync-playback-bar">
        <button
          type="button"
          className="btn-schedule-sm"
          style={{ width: 140, height: 40 }}
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          <span>{isPlaying ? 'Pausar Sincro' : 'Reproducir'}</span>
        </button>

        <button
          type="button"
          className="btn-outline-sm"
          style={{ height: 40, padding: '0 12px' }}
          title="Reiniciar zancada"
          onClick={() => setScrubPhase(0)}
        >
          <RotateCcw size={16} />
        </button>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ fontWeight: 700, color: '#10283f' }}>
              Control de fase: <strong>{getPhaseName(scrubPhase)}</strong>
            </span>
            <span style={{ color: '#7b8798', fontWeight: 600 }}>{scrubPhase}% del ciclo</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={scrubPhase}
            onChange={(e) => setScrubPhase(parseInt(e.target.value, 10))}
            style={{ width: '100%', cursor: 'pointer', accentColor: '#2474d2' }}
          />
        </div>
      </div>

      {/* SPLIT-SCREEN DOUBLE VIEWPORT */}
      <div className="split-screen-container">
        {/* LEFT: INITIAL SESSION */}
        <div className="video-mock-card">
          <div className="video-mock-header">
            <div>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: 0.8 }}>
                ANTES · TOMA INICIAL
              </span>
              <strong style={{ display: 'block', fontSize: 14 }}>
                {currentData.initialSession.title}
              </strong>
            </div>
            <span style={{ fontSize: 11, color: '#cbd5e1' }}>
              {currentData.initialSession.id} · {currentData.initialSession.date}
            </span>
          </div>

          <div className="video-canvas-viewport">
            {/* SVG Pose Simulation - Initial Angle */}
            <svg className="pose-overlay-graphics" viewBox="0 0 400 300">
              {/* Ground line */}
              <line x1="20" y1="260" x2="380" y2="260" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
              
              {showSkeleton && (
                <g stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" opacity="0.9">
                  {/* Head */}
                  <circle cx="200" cy="70" r="14" fill="#0284c7" />
                  {/* Spine */}
                  <line x1="200" y1="84" x2="190" y2="160" />
                  {/* Left Leg (Less flexion) */}
                  <line x1="190" y1="160" x2="165" y2="215" stroke="#f43f5e" strokeWidth="4" />
                  <line x1="165" y1="215" x2="140" y2="255" stroke="#f43f5e" strokeWidth="4" />
                  {/* Right Leg */}
                  <line x1="190" y1="160" x2="225" y2="210" />
                  <line x1="225" y1="210" x2="235" y2="258" />
                  {/* Arms */}
                  <line x1="198" y1="105" x2="170" y2="140" />
                  <line x1="198" y1="105" x2="230" y2="135" />
                  {/* Joints */}
                  <circle cx="165" cy="215" r="5" fill="#f43f5e" />
                  <circle cx="190" cy="160" r="5" fill="#38bdf8" />
                </g>
              )}
            </svg>

            {/* Float angle badge */}
            <div className="angle-callout-tag" style={{ top: '65%', left: '26%', borderColor: '#f43f5e', color: '#fda4af' }}>
              Flexión: {currentData.initialSession.kneeAngle}
            </div>

            <div style={{ position: 'absolute', bottom: 12, left: 14, fontSize: 10, color: '#94a3b8' }}>
              Ángulo de ataque insuficiente (bajo recobro)
            </div>
          </div>

          <div className="video-mock-footer">
            <span style={{ fontSize: 11, color: '#cbd5e1' }}>
              Simetría inicial: <strong>{currentData.initialSession.symmetry}</strong>
            </span>
            <span style={{ fontSize: 11, color: '#cbd5e1' }}>
              Tronco: <strong>{currentData.initialSession.trunkLean}</strong>
            </span>
          </div>
        </div>

        {/* RIGHT: CURRENT SESSION */}
        <div className="video-mock-card" style={{ borderColor: '#2474d2' }}>
          <div className="video-mock-header" style={{ background: 'rgba(36, 116, 210, 0.15)' }}>
            <div>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#60c6f5', letterSpacing: 0.8 }}>
                DESPUÉS · CONTROL ACTUAL
              </span>
              <strong style={{ display: 'block', fontSize: 14 }}>
                {currentData.currentSession.title}
              </strong>
            </div>
            <span style={{ fontSize: 11, color: '#60c6f5', fontWeight: 700 }}>
              {currentData.currentSession.id} · {currentData.currentSession.date}
            </span>
          </div>

          <div className="video-canvas-viewport">
            {/* SVG Pose Simulation - Enhanced Angle */}
            <svg className="pose-overlay-graphics" viewBox="0 0 400 300">
              {/* Ground line */}
              <line x1="20" y1="260" x2="380" y2="260" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
              
              {showSkeleton && (
                <g stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" opacity="0.95">
                  {/* Head */}
                  <circle cx="205" cy="65" r="14" fill="#0284c7" />
                  {/* Spine */}
                  <line x1="205" y1="79" x2="198" y2="155" />
                  {/* Left Leg (Higher flexion angle) */}
                  <line x1="198" y1="155" x2="160" y2="195" stroke="#10b981" strokeWidth="4" />
                  <line x1="160" y1="195" x2="185" y2="238" stroke="#10b981" strokeWidth="4" />
                  {/* Right Leg */}
                  <line x1="198" y1="155" x2="235" y2="205" />
                  <line x1="235" y1="205" x2="248" y2="258" />
                  {/* Arms */}
                  <line x1="203" y1="100" x2="165" y2="135" />
                  <line x1="203" y1="100" x2="242" y2="130" />
                  {/* Joints */}
                  <circle cx="160" cy="195" r="5" fill="#10b981" />
                  <circle cx="198" cy="155" r="5" fill="#38bdf8" />
                </g>
              )}
            </svg>

            {/* Float angle badge */}
            <div className="angle-callout-tag" style={{ top: '60%', left: '26%', borderColor: '#10b981', color: '#6ee7b7' }}>
              Flexión: {currentData.currentSession.kneeAngle} (Óptimo)
            </div>

            <div style={{ position: 'absolute', bottom: 12, left: 14, fontSize: 10, color: '#6ee7b7', fontWeight: 600 }}>
              Mayor flexión en fase de vuelo (+3,9° ganancia)
            </div>
          </div>

          <div className="video-mock-footer" style={{ background: '#0a1d30' }}>
            <span style={{ fontSize: 11, color: '#6ee7b7' }}>
              Simetría actual: <strong>{currentData.currentSession.symmetry}</strong>
            </span>
            <span style={{ fontSize: 11, color: '#cbd5e1' }}>
              Tronco: <strong>{currentData.currentSession.trunkLean}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* DELTAS SUMMARY CARDS */}
      <h3 style={{ fontSize: 16, fontWeight: 800, color: '#10283f', margin: '0 0 14px' }}>
        Deltas Biomecánicos de Evolución (Δ)
      </h3>

      <div className="delta-stat-grid">
        {currentData.deltas.map((d, idx) => (
          <div key={idx} className="delta-card">
            <span className="delta-metric-title">{d.metric}</span>
            <div className="delta-values-row">
              <span className="delta-before">{d.before}</span>
              <span className="delta-arrow">➔</span>
              <strong className="delta-after">{d.after}</strong>
            </div>
            <div className="delta-badge-diff positive">
              <TrendingUp size={12} />
              <span>{d.diff} de mejora</span>
            </div>
            <span style={{ fontSize: 11, color: '#64748b', marginTop: 8, lineHeight: 1.3 }}>
              {d.interpretation}
            </span>
          </div>
        ))}
      </div>

      {/* COACH ASSESSMENT CONCLUSION */}
      <div
        style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          padding: 22,
          boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <CheckCircle2 size={20} color="#1c9b69" />
          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#10283f' }}>
            Dictamen Técnico del Entrenador (Felipe Arellano)
          </h4>
        </div>
        <p style={{ fontSize: 13, color: '#475569', margin: '0 0 14px', lineHeight: 1.5 }}>
          "El atleta muestra una evolución altamente positiva en los 6 meses de intervención escolar. El trabajo con vallas bajas y multisaltos corrigió la caída prematura de cadera, permitiendo alcanzar una flexión de rodilla de 28,1° en fase de recobro, lo cual optimiza la longitud de paso sin comprometer la cadencia. La asimetría bajó del 14,8% al 4,2%, entrando en zona óptima de prevención de lesiones."
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span className="report-badge-pill">
            <Sparkles size={13} /> Cumplimiento de Objetivos: 100%
          </span>
          <span className="report-badge-pill">
            <Activity size={13} /> Técnica Apta para Competencia Escolar
          </span>
        </div>
      </div>
    </Layout>
  );
}
