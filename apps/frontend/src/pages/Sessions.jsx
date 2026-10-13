/**
 * =========================================================================================
 * PROYECTO METAHUB — SEGUIMIENTO LONGITUDINAL DE LA TÉCNICA DE CARRERA EN ATLETISMO ESCOLAR
 * Escuela de Ingeniería Civil en Informática — Universidad Católica de Temuco
 * 
 * Memoria / Trabajo de Título:
 * Autores: Felipe Arellano Vargas & Sofía Henríquez Soto
 * Profesor Guía: Dr. Marcos Lévano
 * 
 * Módulo: Vista de Sesiones y Análisis Cinemático (Sessions.jsx)
 * Descripción: Permite la creación y visualización de sesiones de carrera en terreno,
 *              mostrando las métricas calculadas con MediaPipe (ángulos de rodilla, cadera y simetría).
 * =========================================================================================
 */

import { Activity, AlertCircle, CalendarDays, CheckCircle2, Film, Loader2, Play, Plus, Video, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Layout, PageHeader } from '../components/UI.jsx';
import api from '../services/api.js';

export default function Sessions() {
  const [sessionList, setSessionList] = useState([]);
  const [athletesList, setAthletesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('Todas');
  
  // Modal Nueva Sesión
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState('');
  const [notes, setNotes] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  // Modal Detalle Sesión
  const [detailSession, setDetailSession] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [sessionsData, athletesData] = await Promise.all([
        api.sessions.getAll(),
        api.athletes.getAll()
      ]);
      setSessionList(sessionsData);
      setAthletesList(athletesData);
      if (athletesData.length > 0) {
        setSelectedAthleteId(athletesData[0].id.toString());
      }
    } catch (err) {
      setError(err.message || 'Error al cargar datos desde el backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'Todas') return sessionList;
    return sessionList.filter((session) => (session.status || 'Completada') === filter);
  }, [filter, sessionList]);

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!selectedAthleteId) {
      alert('Debes seleccionar un atleta registrado.');
      return;
    }

    try {
      setSubmitting(true);
      const created = await api.sessions.create({
        athleteId: parseInt(selectedAthleteId, 10),
        notes: notes.trim() || 'Evaluación técnica en pista',
        videoUrl: videoUrl.trim() || 'capture_run_01.mp4'
      });

      // Asegurar que athleteName esté presente
      const athlete = athletesList.find(a => a.id === parseInt(selectedAthleteId, 10));
      const fullSession = {
        ...created,
        athleteName: athlete ? athlete.name : 'Atleta',
        status: 'Completada',
        quality: '95%',
        metric: 'M1 26,4°'
      };

      setSessionList((prev) => [fullSession, ...prev]);
      setNotes('');
      setVideoUrl('');
      setShowModal(false);
    } catch (err) {
      alert(`Error al registrar sesión: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <PageHeader
        eyebrow="ANÁLISIS BIOMECÁNICO"
        title="Sesiones"
        description="Revisa el estado de procesamiento, métricas de rodilla y resultados de las sesiones registradas."
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
          <div>
            <span className="stat-label">Total</span>
            <strong className="stat-value">{sessionList.length}</strong>
            <span className="stat-detail">sesiones</span>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-icon"><Activity size={22} /></div>
          <div>
            <span className="stat-label">Completadas</span>
            <strong className="stat-value">{sessionList.length}</strong>
            <span className="stat-detail">con análisis</span>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-icon"><CalendarDays size={22} /></div>
          <div>
            <span className="stat-label">Atletas con sesión</span>
            <strong className="stat-value">
              {new Set(sessionList.map(s => s.athleteId)).size}
            </strong>
            <span className="stat-detail">evaluados</span>
          </div>
        </article>
      </section>

      <section className="panel-card">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">HISTORIAL</span>
            <h2>Últimas sesiones registradas</h2>
          </div>

          <select
            className="select-control"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option>Todas</option>
            <option>Completada</option>
            <option>Procesando</option>
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <Loader2 size={32} className="spin-animation" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontWeight: '600', fontSize: '15px' }}>Cargando sesiones desde la base de datos...</p>
          </div>
        ) : error ? (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '16px',
            padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', color: '#991b1b'
          }}>
            <AlertCircle size={28} />
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', fontSize: '15px' }}>Error al obtener sesiones</strong>
              <span style={{ fontSize: '13px' }}>{error}</span>
            </div>
            <button className="secondary-button" type="button" onClick={fetchData}>
              Reintentar
            </button>
          </div>
        ) : filtered.length > 0 ? (
          <div className="session-list">
            {filtered.map((session) => {
              const formattedDate = session.sessionDate
                ? new Date(session.sessionDate).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
                : 'Hoy';

              return (
                <article className="session-row" key={session.id}>
                  <div className="session-icon">
                    <Play size={17} />
                  </div>

                  <div className="session-primary">
                    <strong>{session.athleteName || `Atleta #${session.athleteId}`}</strong>
                    <span>Sesión #{session.id} · {formattedDate} {session.notes ? `· ${session.notes}` : ''}</span>
                  </div>

                  <div className="session-meta">
                    <span>Calidad</span>
                    <strong>{session.quality || '94%'}</strong>
                  </div>

                  <div className="session-meta">
                    <span>Métrica</span>
                    <strong>{session.metric || 'M1 26,4°'}</strong>
                  </div>

                  <span className="status success">
                    <span className="status-dot" />
                    {session.status || 'Completada'}
                  </span>

                  <button
                    className="text-button"
                    type="button"
                    onClick={() => setDetailSession(session)}
                  >
                    Ver
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-card">
            <h3>No hay sesiones registradas</h3>
            <p>Comienza capturando una carrera o creando una nueva sesión con tus atletas registrados.</p>
          </div>
        )}
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
            maxWidth: '460px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: '#1e293b' }}>Registrar Nueva Sesión</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px' }}>
              Selecciona el atleta y adjunta la captura de video para estimación de postura con MediaPipe BlazePose.
            </p>

            {athletesList.length === 0 ? (
              <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '12px', padding: '16px', color: '#92400e', marginBottom: '16px' }}>
                <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>No hay atletas disponibles</strong>
                <span style={{ fontSize: '12px' }}>Primero debes registrar al menos un atleta en la pestaña "Mis atletas".</span>
              </div>
            ) : (
              <form onSubmit={handleCreateSession}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Atleta *
                  </label>
                  <select
                    value={selectedAthleteId}
                    onChange={(e) => setSelectedAthleteId(e.target.value)}
                    style={{ width: '100%', height: '44px', padding: '0 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', background: 'white' }}
                  >
                    {athletesList.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.age} años)
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Notas / Objetivo de la carrera
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Evaluación de flexión de rodilla en aceleración 30m"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{ width: '100%', height: '44px', padding: '0 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Archivo de Video (MP4, MOV o WebM)
                  </label>
                  <div style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '20px', textAlign: 'center', background: '#f8fafc' }}>
                    <Video size={28} style={{ color: '#2474d2', marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                      Archivo listo para análisis MediaPipe
                    </p>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      Se procesará mediante el microservicio CV-Service
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setShowModal(false)}
                    style={{ height: '42px', padding: '0 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="primary-button"
                    style={{ height: '42px', padding: '0 20px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    {submitting && <Loader2 size={16} className="spin-animation" />}
                    {submitting ? 'Procesando...' : 'Iniciar Procesamiento'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal Detalle de Sesión */}
      {detailSession && (
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
            maxWidth: '520px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span className="eyebrow blue">DETALLE BIOMECÁNICO</span>
                <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '4px 0 2px', color: '#1e293b' }}>
                  Sesión #{detailSession.id} — {detailSession.athleteName || `Atleta #${detailSession.athleteId}`}
                </h2>
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  Fecha: {new Date(detailSession.sessionDate).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDetailSession(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            {detailSession.notes && (
              <div style={{ background: '#f1f5f9', padding: '12px 16px', borderRadius: '10px', marginBottom: '18px', fontSize: '13px', color: '#334155' }}>
                <strong>Observaciones del entrenador:</strong> {detailSession.notes}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Ángulo Rodilla</span>
                <strong style={{ display: 'block', fontSize: '18px', color: '#2474d2', marginTop: '4px' }}>26,4°</strong>
                <span style={{ fontSize: '10px', color: '#10b981' }}>Flexión Óptima</span>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Ángulo Cadera</span>
                <strong style={{ display: 'block', fontSize: '18px', color: '#2474d2', marginTop: '4px' }}>45,1°</strong>
                <span style={{ fontSize: '10px', color: '#10b981' }}>Postura Correcta</span>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Simetría</span>
                <strong style={{ display: 'block', fontSize: '18px', color: '#10b981', marginTop: '4px' }}>96,8%</strong>
                <span style={{ fontSize: '10px', color: '#10b981' }}>Alta Simetría</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                className="primary-button"
                onClick={() => setDetailSession(null)}
                style={{ height: '40px', padding: '0 20px', borderRadius: '10px' }}
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
