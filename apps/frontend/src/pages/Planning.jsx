import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  User,
  X
} from 'lucide-react';
import { useState } from 'react';
import { Layout, PageHeader } from '../components/UI.jsx';

const initialEvents = [
  {
    id: 1,
    day: 2,
    athlete: 'Martín Atleta',
    category: 'Sub-16',
    title: 'Control 30m lanzado',
    time: '16:00 - 17:00',
    location: 'Pista UCT',
    type: 'evaluacion',
    notes: 'Medición de velocidad pico en últimos 10 metros'
  },
  {
    id: 2,
    day: 6,
    athlete: 'Martín Atleta',
    category: 'Sub-16',
    title: 'Refuerzo: Técnica de recobro',
    time: '17:15 - 18:00',
    location: 'Pista Estadio Temuco',
    type: 'refuerzo',
    notes: 'Ejercicios de vallas bajas y skipping alto para elevar rodilla'
  },
  {
    id: 3,
    day: 9,
    athlete: 'Javiera Soto',
    category: 'Sub-18',
    title: 'Test 60m planos',
    time: '16:30 - 17:30',
    location: 'Pista UCT',
    type: 'test',
    notes: 'Seguimiento de simetría tras 3 semanas de entrenamiento'
  },
  {
    id: 4,
    day: 13,
    athlete: 'Antonia Pérez',
    category: 'Sub-14',
    title: 'Refuerzo: Simetría de apoyo',
    time: '16:00 - 17:00',
    location: 'Pista Colegio',
    type: 'refuerzo',
    notes: 'Trabajo propioceptivo en tobillo izquierdo'
  },
  {
    id: 5,
    day: 15,
    athlete: 'Martín Atleta & Javiera Soto',
    category: 'Equipo Escolar',
    title: 'Captura en pista: Sprint 60m',
    time: '16:30 - 18:00',
    location: 'Pista UCT (Recta principal)',
    type: 'evaluacion',
    notes: 'Grabación lateral a 6 metros con smartphone a 60fps'
  },
  {
    id: 6,
    day: 17,
    athlete: 'Tomás Muñoz',
    category: 'Sub-14',
    title: 'Evaluación salida de tacos',
    time: '15:30 - 16:30',
    location: 'Pista UCT',
    type: 'test',
    notes: 'Análisis de ángulo de inclinación corporal al despegue'
  },
  {
    id: 7,
    day: 22,
    athlete: 'Martín Atleta',
    category: 'Sub-16',
    title: 'Refuerzo: Flexión de rodilla',
    time: '16:30 - 17:30',
    location: 'Pista Estadio Temuco',
    type: 'refuerzo',
    notes: 'Evaluación de transferencia de ejercicios pliométricos'
  },
  {
    id: 8,
    day: 28,
    athlete: 'Control General',
    category: 'Todos',
    title: 'Test de cierre de mes',
    time: '16:00 - 18:30',
    location: 'Pista UCT',
    type: 'evaluacion',
    notes: 'Medición longitudinal comparativa de técnica'
  }
];

export default function Planning() {
  const [selectedDay, setSelectedDay] = useState(15);
  const [events, setEvents] = useState(initialEvents);
  const [filterType, setFilterType] = useState('todos');
  const [showModal, setShowModal] = useState(false);

  // New session modal form state
  const [newSession, setNewSession] = useState({
    day: 15,
    athlete: 'Martín Atleta',
    category: 'Sub-16',
    title: '',
    time: '16:30 - 17:30',
    location: 'Pista UCT',
    type: 'evaluacion',
    notes: ''
  });

  const filteredEvents = events.filter((ev) => {
    if (filterType === 'todos') return true;
    return ev.type === filterType;
  });

  const selectedDayEvents = filteredEvents.filter((ev) => ev.day === selectedDay);

  const handleCreateSession = (e) => {
    e.preventDefault();
    if (!newSession.title.trim()) return;

    const created = {
      id: Date.now(),
      day: parseInt(newSession.day, 10),
      athlete: newSession.athlete,
      category: newSession.category,
      title: newSession.title,
      time: newSession.time,
      location: newSession.location,
      type: newSession.type,
      notes: newSession.notes || 'Sin observaciones previas'
    };

    setEvents([...events, created]);
    setSelectedDay(created.day);
    setShowModal(false);
    setNewSession({
      day: 15,
      athlete: 'Martín Atleta',
      category: 'Sub-16',
      title: '',
      time: '16:30 - 17:30',
      location: 'Pista UCT',
      type: 'evaluacion',
      notes: ''
    });
  };

  // October 2026 starts on Thursday (index 3 for 0-indexed Mon-Sun: Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6)
  // Total days in Oct 2026: 31 days
  const leadingBlanks = 3; // Thu is 4th day of week
  const daysInMonth = 31;

  const weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <Layout>
      <PageHeader
        eyebrow="PLANIFICACIÓN DE PISTA"
        title="Calendario de Evaluaciones y Refuerzos"
        description="Organiza las jornadas de captura con smartphone, tests biomecánicos y entrenamientos correctivos."
        action={
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              setNewSession((prev) => ({ ...prev, day: selectedDay }));
              setShowModal(true);
            }}
          >
            <Plus size={18} />
            Planificar sesión
          </button>
        }
      />

      {/* FILTER PILLS BAR */}
      <div style={{ marginBottom: 20 }}>
        <div className="filter-pills-bar">
          <button
            type="button"
            className={`filter-pill ${filterType === 'todos' ? 'active' : ''}`}
            onClick={() => setFilterType('todos')}
          >
            Todas las sesiones ({events.length})
          </button>
          <button
            type="button"
            className={`filter-pill ${filterType === 'evaluacion' ? 'active' : ''}`}
            onClick={() => setFilterType('evaluacion')}
          >
            📹 Evaluaciones en pista ({events.filter(e => e.type === 'evaluacion').length})
          </button>
          <button
            type="button"
            className={`filter-pill ${filterType === 'refuerzo' ? 'active' : ''}`}
            onClick={() => setFilterType('refuerzo')}
          >
            ⚡ Sesiones de refuerzo técnico ({events.filter(e => e.type === 'refuerzo').length})
          </button>
          <button
            type="button"
            className={`filter-pill ${filterType === 'test' ? 'active' : ''}`}
            onClick={() => setFilterType('test')}
          >
            ⏱️ Tests cronometrados ({events.filter(e => e.type === 'test').length})
          </button>
        </div>
      </div>

      <div className="calendar-layout">
        {/* MAIN CALENDAR CARD */}
        <section className="calendar-card">
          <div className="calendar-nav-bar">
            <div className="calendar-month-title">
              <CalendarIcon size={22} color="#2474d2" />
              <h2>Octubre 2026</h2>
            </div>

            <div className="calendar-nav-btns">
              <button
                type="button"
                className="nav-arrow-btn"
                title="Mes anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                className="nav-arrow-btn"
                title="Mes siguiente"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="calendar-grid">
            {weekdays.map((wd) => (
              <div key={wd} className="calendar-weekday-header">
                {wd}
              </div>
            ))}

            {/* Leading blanks for Sept */}
            {Array.from({ length: leadingBlanks }).map((_, idx) => (
              <div key={`blank-${idx}`} className="calendar-day-cell inactive-month">
                <span className="day-number" style={{ opacity: 0.4 }}>
                  {28 + idx}
                </span>
              </div>
            ))}

            {/* Days 1..31 */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const isToday = day === 15;
              const isSelected = day === selectedDay;
              const dayEvs = filteredEvents.filter((e) => e.day === day);

              return (
                <div
                  key={`day-${day}`}
                  className={`calendar-day-cell ${isSelected ? 'selected-day' : ''} ${isToday ? 'today-cell' : ''}`}
                  onClick={() => setSelectedDay(day)}
                >
                  <div className="day-number-row">
                    <span className="day-number">{day}</span>
                    {dayEvs.length > 0 && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#2474d2',
                          background: '#eaf3ff',
                          borderRadius: 6,
                          padding: '1px 5px'
                        }}
                      >
                        {dayEvs.length}
                      </span>
                    )}
                  </div>

                  <div className="day-events-pills">
                    {dayEvs.slice(0, 2).map((ev) => (
                      <span
                        key={ev.id}
                        className={`event-pill ${ev.type}`}
                        title={ev.title}
                      >
                        {ev.title}
                      </span>
                    ))}
                    {dayEvs.length > 2 && (
                      <span style={{ fontSize: 9, color: '#7b8798', fontWeight: 700 }}>
                        +{dayEvs.length - 2} más
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SIDEBAR: AGENDA FOR SELECTED DAY */}
        <aside className="agenda-card">
          <div className="agenda-date-badge">
            <Clock size={13} />
            {selectedDay} de Octubre, 2026 {selectedDay === 15 ? '(Hoy)' : ''}
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 6px', color: '#10283f' }}>
            Actividades del Día
          </h3>
          <p style={{ fontSize: 12, color: '#7b8798', margin: 0 }}>
            {selectedDayEvents.length === 1
              ? '1 actividad programada'
              : `${selectedDayEvents.length} actividades programadas`}
          </p>

          <div className="agenda-items-list">
            {selectedDayEvents.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '30px 10px',
                  background: '#f8fafc',
                  borderRadius: 12,
                  border: '1px dashed #cbd5e1'
                }}
              >
                <CalendarIcon size={32} color="#94a3b8" style={{ marginBottom: 8 }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: '#475569', margin: '0 0 6px' }}>
                  Sin sesiones para este día
                </p>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                  Aprovecha para agendar una captura o sesión correctiva.
                </span>
              </div>
            ) : (
              selectedDayEvents.map((ev) => (
                <div key={ev.id} className="agenda-item">
                  <div className="agenda-item-header">
                    <span className="agenda-item-time">
                      <Clock size={12} />
                      {ev.time}
                    </span>
                    <span
                      className={`urgency-pill ${
                        ev.type === 'refuerzo' ? 'medium' : ev.type === 'evaluacion' ? 'monitoring' : 'high'
                      }`}
                      style={{ fontSize: 9, padding: '2px 8px' }}
                    >
                      {ev.type === 'refuerzo' ? 'Refuerzo' : ev.type === 'evaluacion' ? 'Evaluación' : 'Test'}
                    </span>
                  </div>

                  <h4 className="agenda-item-title">{ev.title}</h4>

                  <div className="agenda-item-meta">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <User size={12} />
                      {ev.athlete} ({ev.category})
                    </span>
                  </div>

                  <div className="agenda-item-meta" style={{ marginTop: 4 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={12} />
                      {ev.location}
                    </span>
                  </div>

                  {ev.notes && (
                    <p
                      style={{
                        fontSize: 11,
                        color: '#64748b',
                        background: '#f1f5f9',
                        padding: '6px 8px',
                        borderRadius: 6,
                        margin: '8px 0 0',
                        fontStyle: 'italic'
                      }}
                    >
                      "{ev.notes}"
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          <button
            type="button"
            className="btn-schedule-sm"
            style={{ width: '100%' }}
            onClick={() => {
              setNewSession((prev) => ({ ...prev, day: selectedDay }));
              setShowModal(true);
            }}
          >
            <Plus size={16} />
            Agendar en este día
          </button>
        </aside>
      </div>

      {/* MODAL PLANIFICAR SESION */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#10283f' }}>
                  Planificar Sesión de Pista
                </h3>
                <span style={{ fontSize: 12, color: '#7b8798' }}>
                  Día seleccionado: {newSession.day} de Octubre, 2026
                </span>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSession}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Título de la actividad *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="Ej. Control de flexión de rodilla en 30m"
                    value={newSession.title}
                    onChange={(e) =>
                      setNewSession({ ...newSession, title: e.target.value })
                    }
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label>Atleta citado</label>
                    <select
                      className="form-control"
                      value={newSession.athlete}
                      onChange={(e) =>
                        setNewSession({ ...newSession, athlete: e.target.value })
                      }
                    >
                      <option value="Martín Atleta">Martín Atleta</option>
                      <option value="Javiera Soto">Javiera Soto</option>
                      <option value="Antonia Pérez">Antonia Pérez</option>
                      <option value="Tomás Muñoz">Tomás Muñoz</option>
                      <option value="Grupo Sub-16">Grupo Sub-16</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Tipo de sesión</label>
                    <select
                      className="form-control"
                      value={newSession.type}
                      onChange={(e) =>
                        setNewSession({ ...newSession, type: e.target.value })
                      }
                    >
                      <option value="evaluacion">📹 Evaluación en pista</option>
                      <option value="refuerzo">⚡ Refuerzo técnico</option>
                      <option value="test">⏱️ Test cronometrado</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label>Día de Octubre</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      className="form-control"
                      value={newSession.day}
                      onChange={(e) =>
                        setNewSession({ ...newSession, day: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Horario</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newSession.time}
                      onChange={(e) =>
                        setNewSession({ ...newSession, time: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Ubicación / Pista</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newSession.location}
                    onChange={(e) =>
                      setNewSession({ ...newSession, location: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Notas para el entrenador</label>
                  <textarea
                    rows={3}
                    className="form-control"
                    placeholder="Instrucciones previas, ejercicios que se evaluarán, equipo necesario..."
                    value={newSession.notes}
                    onChange={(e) =>
                      setNewSession({ ...newSession, notes: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-outline-sm"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="primary-button">
                  Guardar en calendario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
