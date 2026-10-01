import { Activity, CalendarDays, Play, Plus, Video } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Layout, PageHeader } from '../components/UI.jsx';

const sessions = [
  {
    id: 'S-014',
    athlete: 'Martín Atleta',
    date: '26 Sep 2026',
    status: 'Completada',
    quality: '94%',
    metric: 'M1 26,4°'
  },
  {
    id: 'S-013',
    athlete: 'Javiera Soto',
    date: '24 Sep 2026',
    status: 'Completada',
    quality: '91%',
    metric: 'M1 27,1°'
  },
  {
    id: 'S-012',
    athlete: 'Martín Atleta',
    date: '21 Sep 2026',
    status: 'Procesando',
    quality: '—',
    metric: '—'
  },
  {
    id: 'S-011',
    athlete: 'Antonia Pérez',
    date: '20 Sep 2026',
    status: 'Rechazada',
    quality: '58%',
    metric: '—'
  }
];

export default function Sessions() {
  const [sessionList, setSessionList] = useState(sessions);
  const [filter, setFilter] = useState('Todas');
  const [showModal, setShowModal] = useState(false);
  const [newSession, setNewSession] = useState({ athlete: 'Martín Atleta', file: null });

  const filtered = useMemo(() => {
    if (filter === 'Todas') return sessionList;
    return sessionList.filter((session) => session.status === filter);
  }, [filter, sessionList]);

  const handleCreateSession = (e) => {
    e.preventDefault();
    const created = {
      id: `S-0${sessionList.length + 11}`,
      athlete: newSession.athlete,
      date: 'Hoy',
      status: 'Procesando',
      quality: '96%',
      metric: 'M1 25,8°'
    };
    setSessionList([created, ...sessionList]);
    setShowModal(false);
  };

  return (
    <Layout>
      <PageHeader
        eyebrow="ANÁLISIS BIOMECÁNICO"
        title="Sesiones"
        description="Revisa el estado de procesamiento y resultados de las sesiones registradas."
        action={
          <button
            className="primary-button"
            type="button"
            onClick={() => setShowModal(true)}
          >
            <Plus size={18} />
            Nueva sesión
          </button>
        }
      />

      <section className="stats-grid stats-grid-3">
        <article className="stat-card">
          <div className="stat-icon"><Video size={22} /></div>
          <div><span className="stat-label">Total</span><strong className="stat-value">{sessionList.length}</strong><span className="stat-detail">sesiones</span></div>
        </article>
        <article className="stat-card">
          <div className="stat-icon"><Activity size={22} /></div>
          <div><span className="stat-label">Completadas</span><strong className="stat-value">{sessionList.filter(s => s.status === 'Completada').length}</strong><span className="stat-detail">con análisis</span></div>
        </article>
        <article className="stat-card">
          <div className="stat-icon"><CalendarDays size={22} /></div>
          <div><span className="stat-label">Esta semana</span><strong className="stat-value">4</strong><span className="stat-detail">registradas</span></div>
        </article>
      </section>

      <section className="panel-card">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">HISTORIAL</span>
            <h2>Últimas sesiones</h2>
          </div>

          <select
            className="select-control"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option>Todas</option>
            <option>Completada</option>
            <option>Procesando</option>
            <option>Rechazada</option>
          </select>
        </div>

        <div className="session-list">
          {filtered.map((session) => (
            <article className="session-row" key={session.id}>
              <div className="session-icon">
                <Play size={17} />
              </div>

              <div className="session-primary">
                <strong>{session.athlete}</strong>
                <span>{session.id} · {session.date}</span>
              </div>

              <div className="session-meta">
                <span>Calidad</span>
                <strong>{session.quality}</strong>
              </div>

              <div className="session-meta">
                <span>Métrica</span>
                <strong>{session.metric}</strong>
              </div>

              <span className={`status ${session.status === 'Completada' ? 'success' : session.status === 'Rechazada' ? 'danger' : 'warning'}`}>
                <span className="status-dot" />
                {session.status}
              </span>

              <button
                className="text-button"
                type="button"
                onClick={() => alert(`Detalle de Sesión ${session.id}:\nÁngulo Rodilla: 26,4°\nÁngulo Cadera: 45,1°\nFrecuencia: 3.2 Hz`)}
              >
                Ver
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* Modal para Nueva Sesión */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '28px',
            width: '100%',
            maxWidth: '440px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 6px', color: '#1e293b' }}>Registrar Nueva Sesión</h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px' }}>Selecciona el atleta y sube el video para el análisis biomecánico con MediaPipe.</p>

            <form onSubmit={handleCreateSession}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Atleta</label>
                <select
                  value={newSession.athlete}
                  onChange={(e) => setNewSession({ ...newSession, athlete: e.target.value })}
                  style={{ width: '100%', height: '44px', padding: '0 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', background: 'white' }}
                >
                  <option>Martín Atleta</option>
                  <option>Javiera Soto</option>
                  <option>Tomás Muñoz</option>
                  <option>Antonia Pérez</option>
                </select>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Video de la Carrera (MP4, MOV)</label>
                <div style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '20px', textAlign: 'center', background: '#f8fafc' }}>
                  <Video size={28} style={{ color: '#2474d2', marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#334155' }}>Haz clic para seleccionar video</p>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>o arrastra el archivo aquí</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ height: '42px', padding: '0 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  style={{ height: '42px', padding: '0 20px', borderRadius: '10px' }}
                >
                  Iniciar Procesamiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
