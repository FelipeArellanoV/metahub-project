import {
  Activity,
  Calendar,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock,
  Eye,
  FileVideo,
  Filter,
  MapPin,
  Play,
  Plus,
  Video,
  X
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, PageHeader } from '../components/UI.jsx';

const initialSessions = [
  {
    id: 'S-014',
    athlete: 'Martín Atleta',
    date: '26 Sep 2026',
    testType: 'Sprint 30m Lanzado',
    trackType: 'Pista Sintética (UCT)',
    status: 'Completada',
    quality: '94%',
    fps: '60 FPS',
    metric: 'M1 26,4°',
    notes: 'Tomas limpias de perfil derecho a 6 metros de distancia.'
  },
  {
    id: 'S-013',
    athlete: 'Javiera Soto',
    date: '24 Sep 2026',
    testType: '60m Planos Salida Baja',
    trackType: 'Pista Sintética (UCT)',
    status: 'Completada',
    quality: '91%',
    fps: '60 FPS',
    metric: 'M1 27,1°',
    notes: 'Buena iluminación natural, encuadre completo de cuerpo entero.'
  },
  {
    id: 'S-012',
    athlete: 'Martín Atleta',
    date: '21 Sep 2026',
    testType: 'Skipping A en 20m',
    trackType: 'Pista Ceniza (Estadio)',
    status: 'Procesando',
    quality: '—',
    fps: '30 FPS',
    metric: '—',
    notes: 'Procesando esqueleto BlazePose en servidor.'
  },
  {
    id: 'S-011',
    athlete: 'Antonia Pérez',
    date: '20 Sep 2026',
    testType: 'Sprint 30m Lanzado',
    trackType: 'Pista Colegio',
    status: 'Rechazada',
    quality: '58%',
    fps: '30 FPS',
    metric: '—',
    notes: 'Atleta salió de encuadre en los últimos 5 metros. Requiere repetición.'
  }
];

export default function Sessions() {
  const navigate = useNavigate();
  const [sessionList, setSessionList] = useState(initialSessions);
  const [filter, setFilter] = useState('Todas');
  const [showModal, setShowModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  const [newSession, setNewSession] = useState({
    athlete: 'Martín Atleta',
    testType: 'Sprint 30m Lanzado',
    trackType: 'Pista Sintética (UCT)',
    fps: '60 FPS',
    notes: ''
  });

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
      testType: newSession.testType,
      trackType: newSession.trackType,
      status: 'Procesando',
      quality: '96%',
      fps: newSession.fps,
      metric: 'M1 25,8°',
      notes: newSession.notes || 'Captura en pista registrada.'
    };
    setSessionList([created, ...sessionList]);
    setShowModal(false);
  };

  return (
    <Layout>
      <PageHeader
        eyebrow="ANÁLISIS BIOMECÁNICO EN PISTA"
        title="Sesiones de Carrera"
        description="Revisa el historial de tomas de video, estado de procesamiento y calidad de encuadre."
        action={
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="secondary-button"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 194, 255, 0.15), rgba(0, 245, 160, 0.15))',
                border: '1px solid #00f5a0',
                color: '#00f5a0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              type="button"
              onClick={() => navigate('/capture')}
            >
              <Camera size={18} />
              Cámara en Vivo & Calibración
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={() => setShowModal(true)}
            >
              <Plus size={18} />
              Nueva sesión
            </button>
          </div>
        }
      />

      <section className="stats-grid stats-grid-3">
        <article className="stat-card">
          <div className="stat-icon"><Video size={22} /></div>
          <div>
            <span className="stat-label">Total sesiones</span>
            <strong className="stat-value">{sessionList.length}</strong>
            <span className="stat-detail">en registro</span>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-icon"><Activity size={22} /></div>
          <div>
            <span className="stat-label">Completadas</span>
            <strong className="stat-value">{sessionList.filter(s => s.status === 'Completada').length}</strong>
            <span className="stat-detail">procesadas</span>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-icon"><CalendarDays size={22} /></div>
          <div>
            <span className="stat-label">Esta semana</span>
            <strong className="stat-value">4</strong>
            <span className="stat-detail">capturas</span>
          </div>
        </article>
      </section>

      <section className="panel-card" style={{ marginTop: 24 }}>
        <div className="panel-heading">
          <div>
            <span className="eyebrow">REGISTRO HISTÓRICO</span>
            <h2>Últimas Sesiones</h2>
          </div>

          <div className="filter-pills-bar">
            {['Todas', 'Completada', 'Procesando', 'Rechazada'].map((st) => (
              <button
                key={st}
                type="button"
                className={`filter-pill ${filter === st ? 'active' : ''}`}
                onClick={() => setFilter(st)}
              >
                {st === 'Todas' ? `Todas (${sessionList.length})` : st}
              </button>
            ))}
          </div>
        </div>

        <div className="session-list">
          {filtered.map((session) => (
            <article className="session-row" key={session.id}>
              <div className="session-icon">
                <Play size={17} />
              </div>

              <div className="session-primary">
                <strong>{session.athlete}</strong>
                <span>{session.id} · {session.date} · {session.testType}</span>
              </div>

              <div className="session-meta">
                <span>Superficie</span>
                <strong>{session.trackType.split('(')[0]}</strong>
              </div>

              <div className="session-meta">
                <span>Calidad</span>
                <strong>{session.quality}</strong>
              </div>

              <span className={`status ${session.status === 'Completada' ? 'success' : session.status === 'Rechazada' ? 'danger' : 'warning'}`}>
                <span className="status-dot" />
                {session.status}
              </span>

              <button
                className="text-button"
                type="button"
                onClick={() => setSelectedSession(session)}
              >
                Ver ficha
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* MODAL DETALLE DE SESIÓN */}
      {selectedSession && (
        <div className="modal-overlay" onClick={() => setSelectedSession(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#10283f' }}>
                  Ficha Técnica: Sesión {selectedSession.id}
                </h3>
                <span style={{ fontSize: 12, color: '#7b8798' }}>
                  Atleta: <strong>{selectedSession.athlete}</strong> · Fecha: {selectedSession.date}
                </span>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setSelectedSession(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 10, color: '#7b8798', fontWeight: 800 }}>ESTADO</span>
                  <strong style={{ display: 'block', fontSize: 13, color: '#10283f', marginTop: 2 }}>
                    {selectedSession.status}
                  </strong>
                </div>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 10, color: '#7b8798', fontWeight: 800 }}>CALIDAD DE ENCUADRE</span>
                  <strong style={{ display: 'block', fontSize: 13, color: '#2474d2', marginTop: 2 }}>
                    {selectedSession.quality}
                  </strong>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 10, color: '#7b8798', fontWeight: 800 }}>CONDICIÓN DE TERRENO Y CÁMARA</span>
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#334155' }}>
                  <span>• <strong>Prueba:</strong> {selectedSession.testType}</span>
                  <span>• <strong>Pista:</strong> {selectedSession.trackType}</span>
                  <span>• <strong>Tasa de muestreo:</strong> {selectedSession.fps}</span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: 10, color: '#7b8798', fontWeight: 800, textTransform: 'uppercase' }}>
                  Observaciones de la toma
                </span>
                <p style={{ fontSize: 12, color: '#475569', background: '#f1f5f9', padding: 10, borderRadius: 8, margin: '4px 0 0' }}>
                  "{selectedSession.notes}"
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-outline-sm"
                onClick={() => setSelectedSession(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR NUEVA SESION */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#10283f' }}>
                  Registrar Nueva Sesión en Pista
                </h3>
                <span style={{ fontSize: 12, color: '#7b8798' }}>
                  Configura los datos del test antes de la captura o subida de video
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
                  <label>Atleta citado *</label>
                  <select
                    className="form-control"
                    value={newSession.athlete}
                    onChange={(e) => setNewSession({ ...newSession, athlete: e.target.value })}
                  >
                    <option>Martín Atleta</option>
                    <option>Javiera Soto</option>
                    <option>Tomás Muñoz</option>
                    <option>Antonia Pérez</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label>Tipo de prueba</label>
                    <select
                      className="form-control"
                      value={newSession.testType}
                      onChange={(e) => setNewSession({ ...newSession, testType: e.target.value })}
                    >
                      <option>Sprint 30m Lanzado</option>
                      <option>60m Planos Salida Baja</option>
                      <option>Skipping A en 20m</option>
                      <option>Pasadas Técnicas</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Superficie de pista</label>
                    <select
                      className="form-control"
                      value={newSession.trackType}
                      onChange={(e) => setNewSession({ ...newSession, trackType: e.target.value })}
                    >
                      <option>Pista Sintética (UCT)</option>
                      <option>Pista Ceniza (Estadio)</option>
                      <option>Pista Colegio</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Video de la carrera (Smartphone MP4/MOV)</label>
                  <div
                    style={{
                      border: '2px dashed #cbd5e1',
                      borderRadius: 12,
                      padding: 22,
                      textAlign: 'center',
                      background: '#f8fafc',
                      cursor: 'pointer'
                    }}
                  >
                    <Video size={28} style={{ color: '#2474d2', marginBottom: 6 }} />
                    <strong style={{ display: 'block', fontSize: 13, color: '#10283f' }}>
                      Seleccionar archivo o usar cámara
                    </strong>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>
                      Recomendado: 60 FPS lateral perpendicular a 6 metros
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label>Notas de la toma</label>
                  <textarea
                    rows={2}
                    className="form-control"
                    placeholder="Condición del viento, fatiga del atleta..."
                    value={newSession.notes}
                    onChange={(e) => setNewSession({ ...newSession, notes: e.target.value })}
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
                  Iniciar procesamiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
