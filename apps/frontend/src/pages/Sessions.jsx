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
  const [filter, setFilter] = useState('Todas');

  const filtered = useMemo(() => {
    if (filter === 'Todas') return sessions;
    return sessions.filter((session) => session.status === filter);
  }, [filter]);

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
            onClick={() => alert('El flujo de nueva sesión se implementará en el siguiente avance.')}
          >
            <Plus size={18} />
            Nueva sesión
          </button>
        }
      />

      <section className="stats-grid stats-grid-3">
        <article className="stat-card">
          <div className="stat-icon"><Video size={22} /></div>
          <div><span className="stat-label">Total</span><strong className="stat-value">14</strong><span className="stat-detail">sesiones</span></div>
        </article>
        <article className="stat-card">
          <div className="stat-icon"><Activity size={22} /></div>
          <div><span className="stat-label">Completadas</span><strong className="stat-value">12</strong><span className="stat-detail">con análisis</span></div>
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
                onClick={() => alert(`Sesión ${session.id}: vista de detalle pendiente de conexión al backend.`)}
              >
                Ver
              </button>
            </article>
          ))}
        </div>
      </section>
    </Layout>
  );
}
