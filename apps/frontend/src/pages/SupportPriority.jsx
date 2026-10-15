import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Dumbbell,
  Filter,
  Flame,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  User,
  X
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, PageHeader } from '../components/UI.jsx';

const initialPriorityAthletes = [
  {
    id: 1,
    name: 'Martín Atleta',
    initials: 'MA',
    age: 15,
    category: 'Sub-16',
    school: 'Liceo Deportivo Temuco',
    urgency: 'high',
    urgencyLabel: 'Alta Prioridad',
    detectedIssue: 'Limitación de flexión de rodilla en recobro (24,2° vs 28° esperado) y caída de cadera en fase de impulso.',
    impact: 'Pérdida de longitud de zancada en velocidad máxima y sobrecarga en gemelos.',
    drills: [
      'Skipping A con vallas bajas (40cm)',
      'Pliometría unipodal reactiva',
      'Carrera resistida con arnés elástico'
    ],
    lastSession: 'Sesión S-014 (hace 4 días)',
    status: 'Plan activo',
    sessionsAssigned: 2
  },
  {
    id: 4,
    name: 'Antonia Pérez',
    initials: 'AP',
    age: 15,
    category: 'Sub-14',
    school: 'Colegio Metodista',
    urgency: 'high',
    urgencyLabel: 'Alta Prioridad',
    detectedIssue: 'Asimetría marcada de zancada (14,8% de disparidad entre pierna izquierda y derecha).',
    impact: 'Riesgo de sobrecarga tendinosa y pérdida de eficiencia energética al esprintar.',
    drills: [
      'Trabajo propioceptivo en tobillo izquierdo',
      'Zancadas continuas con foco en extensión',
      'Ejercicios unilaterales en cajón'
    ],
    lastSession: 'Sesión S-011 (hace 8 días)',
    status: 'Pendiente refuerzo',
    sessionsAssigned: 1
  },
  {
    id: 3,
    name: 'Tomás Muñoz',
    initials: 'TM',
    age: 14,
    category: 'Sub-14',
    school: 'Instituto Claret',
    urgency: 'medium',
    urgencyLabel: 'Prioridad Media',
    detectedIssue: 'Inclinación de tronco excesiva en aceleración y retraso en el despegue de talón.',
    impact: 'Aterrizaje por delante del centro de masa (overstriding inicial).',
    drills: [
      'Salidas asistidas con inclinación a 45°',
      'Fortalecimiento de cadena posterior y core',
      'Técnica de braceo coordinado'
    ],
    lastSession: 'Sin sesión reciente',
    status: 'Evaluación citada',
    sessionsAssigned: 0
  },
  {
    id: 2,
    name: 'Javiera Soto',
    initials: 'JS',
    age: 16,
    category: 'Sub-18',
    school: 'Liceo Pablo Neruda',
    urgency: 'monitoring',
    urgencyLabel: 'En Observación',
    detectedIssue: 'Leve caída del centro de masa en los últimos 15 metros por fatiga muscular.',
    impact: 'Reducción de frecuencia de paso en tramo final de 60m.',
    drills: [
      'Pasadas técnicas submáximas de 80m',
      'Trabajo de cadencia con metrónomo a 180 spm'
    ],
    lastSession: 'Sesión S-013 (hace 6 días)',
    status: 'En seguimiento',
    sessionsAssigned: 3
  }
];

export default function SupportPriority() {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState(initialPriorityAthletes);
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState(null);

  const filtered = useMemo(() => {
    return athletes.filter((a) => {
      const matchUrgency = filterUrgency === 'all' || a.urgency === filterUrgency;
      const matchSearch =
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.detectedIssue.toLowerCase().includes(search.toLowerCase());
      return matchUrgency && matchSearch;
    });
  }, [athletes, filterUrgency, search]);

  const handleOpenSchedule = (athlete) => {
    setScheduleTarget(athlete);
    setShowScheduleModal(true);
  };

  const handleConfirmSchedule = (e) => {
    e.preventDefault();
    alert(`Sesión de refuerzo agendada exitosamente para ${scheduleTarget.name} en el calendario.`);
    setShowScheduleModal(false);
  };

  return (
    <Layout>
      <PageHeader
        eyebrow="ATENCIÓN TÉCNICA PRIORITARIA"
        title="Atletas que Necesitan Mayor Ayuda"
        description="Identificación y recomendaciones de refuerzo para atletas que presentan desbalances o requieren corrección biomecánica."
        action={
          <button
            className="primary-button"
            type="button"
            onClick={() => navigate('/calendar')}
          >
            <Calendar size={18} />
            Ver en calendario
          </button>
        }
      />

      {/* TOP CALLOUT BANNER */}
      <div className="priority-banner">
        <div className="priority-banner-title">
          <div className="priority-banner-icon">
            <Flame size={24} />
          </div>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800 }}>
              Plan de Refuerzo Técnico y Seguimiento Escolar
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: '#c3d5eb', lineHeight: 1.4 }}>
              Basado en los registros de sesiones y capturas en pista, el sistema destaca a{' '}
              <strong style={{ color: '#ffc857' }}>
                {athletes.filter((a) => a.urgency === 'high').length} atletas con alta prioridad
              </strong>{' '}
              para evitar lesiones y potenciar su técnica de carrera.
            </p>
          </div>
        </div>

        <button
          type="button"
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            borderRadius: 12,
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
          onClick={() => setFilterUrgency('high')}
        >
          Filtrar urgentes
        </button>
      </div>

      {/* TOOLBAR WITH FILTERS AND SEARCH */}
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
          <button
            type="button"
            className={`filter-pill ${filterUrgency === 'all' ? 'active' : ''}`}
            onClick={() => setFilterUrgency('all')}
          >
            Todos ({athletes.length})
          </button>
          <button
            type="button"
            className={`filter-pill ${filterUrgency === 'high' ? 'active' : ''}`}
            onClick={() => setFilterUrgency('high')}
          >
            🔴 Alta prioridad ({athletes.filter((a) => a.urgency === 'high').length})
          </button>
          <button
            type="button"
            className={`filter-pill ${filterUrgency === 'medium' ? 'active' : ''}`}
            onClick={() => setFilterUrgency('medium')}
          >
            🟡 Prioridad media ({athletes.filter((a) => a.urgency === 'medium').length})
          </button>
          <button
            type="button"
            className={`filter-pill ${filterUrgency === 'monitoring' ? 'active' : ''}`}
            onClick={() => setFilterUrgency('monitoring')}
          >
            🔵 En observación ({athletes.filter((a) => a.urgency === 'monitoring').length})
          </button>
        </div>

        <div style={{ position: 'relative', width: 260 }}>
          <Search
            size={16}
            color="#94a3b8"
            style={{ position: 'absolute', left: 12, top: 12 }}
          />
          <input
            type="text"
            className="form-control"
            style={{ height: 38, paddingLeft: 36, fontSize: 12 }}
            placeholder="Buscar por nombre o falla..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* PRIORITY CARDS GRID */}
      <div className="priority-grid">
        {filtered.map((item) => (
          <article
            key={item.id}
            className={`priority-card urgency-${item.urgency}`}
          >
            <div className="priority-card-header">
              <div className="athlete-badge-group">
                <div className="athlete-avatar-circle">{item.initials}</div>
                <div>
                  <strong style={{ fontSize: 15, color: '#10283f', display: 'block' }}>
                    {item.name}
                  </strong>
                  <span style={{ fontSize: 11, color: '#7b8798' }}>
                    {item.category} · {item.age} años · {item.school}
                  </span>
                </div>
              </div>

              <span className={`urgency-pill ${item.urgency}`}>
                {item.urgencyLabel}
              </span>
            </div>

            {/* DIAGNOSTIC ISSUE */}
            <div className="diagnostic-box">
              <span className="diagnostic-title">
                <AlertTriangle size={13} color="#d95454" />
                Aspecto Crítico Detectado
              </span>
              <p className="diagnostic-desc">{item.detectedIssue}</p>
            </div>

            {/* IMPACT ON ATHLETE */}
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#7b8798', textTransform: 'uppercase' }}>
                Impacto Técnico
              </span>
              <p style={{ fontSize: 11, color: '#475569', margin: '3px 0 0', lineHeight: 1.35 }}>
                {item.impact}
              </p>
            </div>

            {/* RECOMMENDED DRILLS */}
            <div className="drills-container">
              <span className="drills-label">
                <Dumbbell size={12} style={{ display: 'inline', marginRight: 4 }} />
                Ejercicios Correctivos Recomendados
              </span>
              <div className="drill-chips-list">
                {item.drills.map((drill, idx) => (
                  <span key={idx} className="drill-chip">
                    • {drill}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ fontSize: 11, color: '#7b8798', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={12} />
              Última medición: {item.lastSession}
            </div>

            {/* ACTION BUTTONS */}
            <div className="priority-card-actions">
              <button
                type="button"
                className="btn-schedule-sm"
                onClick={() => handleOpenSchedule(item)}
              >
                <Calendar size={14} />
                Agendar sesión de refuerzo
              </button>

              <button
                type="button"
                className="btn-outline-sm"
                onClick={() => setSelectedAthlete(item)}
              >
                Ver ficha
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* DRAWER DETALLE DE FICHA Y PLAN */}
      {selectedAthlete && (
        <div className="drawer-backdrop" onClick={() => setSelectedAthlete(null)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="athlete-avatar-circle" style={{ width: 44, height: 44 }}>
                  {selectedAthlete.initials}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#10283f' }}>
                    {selectedAthlete.name}
                  </h3>
                  <span style={{ fontSize: 12, color: '#7b8798' }}>
                    {selectedAthlete.category} · {selectedAthlete.school}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setSelectedAthlete(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="drawer-content">
              <div className="diagnostic-box" style={{ background: '#fff7ed', borderColor: '#fed7aa', marginBottom: 18 }}>
                <span className="diagnostic-title" style={{ color: '#c2410c' }}>
                  <AlertCircle size={14} color="#ea580c" />
                  Estado de Intervención: {selectedAthlete.urgencyLabel}
                </span>
                <p className="diagnostic-desc" style={{ color: '#9a3412', marginTop: 4 }}>
                  {selectedAthlete.detectedIssue}
                </p>
              </div>

              <h4 style={{ fontSize: 14, fontWeight: 800, color: '#10283f', margin: '0 0 10px' }}>
                Plan de Refuerzo en Pista Asignado
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {selectedAthlete.drills.map((drill, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 10,
                      padding: '12px 14px',
                      background: '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: '#eaf3ff',
                        color: '#2474d2',
                        fontWeight: 800,
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <strong style={{ display: 'block', fontSize: 13, color: '#10283f' }}>
                        {drill}
                      </strong>
                      <span style={{ fontSize: 11, color: '#7b8798' }}>
                        3 series x 4 repeticiones con descanso completo
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <h4 style={{ fontSize: 14, fontWeight: 800, color: '#10283f', margin: '0 0 10px' }}>
                Bitácora de Observaciones del Entrenador
              </h4>

              <div
                style={{
                  border: '1px solid #e6eaf0',
                  borderRadius: 12,
                  padding: 14,
                  background: 'white',
                  marginBottom: 16
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong style={{ fontSize: 12, color: '#10283f' }}>Felipe Arellano (Entrenador)</strong>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>13 Octubre 2026</span>
                </div>
                <p style={{ fontSize: 12, color: '#475569', margin: 0, lineHeight: 1.4 }}>
                  "Durante las pasadas de 30 metros noté que el alumno tiende a frenar el braceo cuando se cansa. Se le recomendó mantener la mirada al horizonte y no apresurar el contacto con el suelo."
                </p>
              </div>
            </div>

            <div className="drawer-footer">
              <button
                type="button"
                className="btn-outline-sm"
                onClick={() => setSelectedAthlete(null)}
              >
                Cerrar
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  const target = selectedAthlete;
                  setSelectedAthlete(null);
                  handleOpenSchedule(target);
                }}
              >
                <Calendar size={16} />
                Agendar sesión de refuerzo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AGENDAR REFUERZO */}
      {showScheduleModal && scheduleTarget && (
        <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#10283f' }}>
                  Agendar Sesión de Refuerzo
                </h3>
                <span style={{ fontSize: 12, color: '#7b8798' }}>
                  Atleta: <strong>{scheduleTarget.name}</strong> ({scheduleTarget.category})
                </span>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowScheduleModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmSchedule}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Objetivo principal de la sesión</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    defaultValue={`Refuerzo técnico: ${scheduleTarget.detectedIssue.split('(')[0]}`}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label>Fecha en Octubre</label>
                    <input
                      type="text"
                      className="form-control"
                      defaultValue="Viernes 17 Oct 2026"
                    />
                  </div>

                  <div className="form-group">
                    <label>Horario</label>
                    <input
                      type="text"
                      className="form-control"
                      defaultValue="17:00 - 18:00 hrs"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Pista / Espacio de entrenamiento</label>
                  <input
                    type="text"
                    className="form-control"
                    defaultValue="Pista UCT (Zona de rectas)"
                  />
                </div>

                <div className="form-group">
                  <label>Ejercicios seleccionados para la sesión</label>
                  <textarea
                    rows={3}
                    className="form-control"
                    defaultValue={scheduleTarget.drills.map((d) => `• ${d}`).join('\n')}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-outline-sm"
                  onClick={() => setShowScheduleModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="primary-button">
                  Confirmar en calendario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
