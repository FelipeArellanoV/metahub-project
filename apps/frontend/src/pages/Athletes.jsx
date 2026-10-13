/**
 * =========================================================================================
 * PROYECTO METAHUB — SEGUIMIENTO LONGITUDINAL DE LA TÉCNICA DE CARRERA EN ATLETISMO ESCOLAR
 * Escuela de Ingeniería Civil en Informática — Universidad Católica de Temuco
 * 
 * Memoria / Trabajo de Título:
 * Autores: Felipe Arellano Vargas & Sofía Henríquez Soto
 * Profesor Guía: Dr. Marcos Lévano
 * 
 * Módulo: Vista de Gestión de Atletas Escolares (Athletes.jsx)
 * Descripción: Permite al entrenador registrar, listar, filtrar y eliminar atletas,
 *              gestionando el consentimiento informado y visualizando el historial de carreras.
 * =========================================================================================
 */

import { AlertCircle, CalendarDays, CheckCircle2, Loader2, Plus, Search, Video, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AthleteCard, Layout, PageHeader } from '../components/UI.jsx';
import api from '../services/api.js';

export default function Athletes() {
  const [athletesList, setAthletesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newAthlete, setNewAthlete] = useState({ name: '', age: '', consent: true });
  
  // Detalle de Atleta
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [athleteSessions, setAthleteSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Cargar atletas al montar
  const fetchAthletes = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.athletes.getAll();
      setAthletesList(data);
    } catch (err) {
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAthletes();
  }, []);

  const filteredAthletes = useMemo(() => {
    return athletesList.filter((athlete) =>
      athlete.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [athletesList, search]);

  const handleAddAthlete = async (e) => {
    e.preventDefault();
    if (!newAthlete.name.trim() || !newAthlete.age) return;

    try {
      setSubmitting(true);
      const created = await api.athletes.create({
        name: newAthlete.name.trim(),
        age: parseInt(newAthlete.age, 10),
        consent: Boolean(newAthlete.consent)
      });

      setAthletesList((prev) => [created, ...prev]);
      setNewAthlete({ name: '', age: '', consent: true });
      setShowModal(false);
    } catch (err) {
      alert(`Error al registrar atleta: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAthlete = async (id, name) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar a ${name}? Se eliminarán también sus sesiones asociadas.`)) {
      return;
    }

    try {
      await api.athletes.delete(id);
      setAthletesList((prev) => prev.filter((a) => a.id !== id));
      if (selectedAthlete?.id === id) {
        setSelectedAthlete(null);
      }
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`);
    }
  };

  const handleViewAthlete = async (athlete) => {
    setSelectedAthlete(athlete);
    setLoadingSessions(true);
    setAthleteSessions([]);
    try {
      const sessions = await api.sessions.getByAthlete(athlete.id);
      setAthleteSessions(sessions);
    } catch (err) {
      console.error('Error al cargar sesiones del atleta:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  return (
    <Layout>
      <PageHeader
        eyebrow="GESTIÓN DE ATLETAS"
        title="Mis atletas"
        description="Consulta el estado de seguimiento, sesiones y consentimiento informado de cada atleta escolar."
        action={
          <button
            className="primary-button"
            type="button"
            onClick={() => setShowModal(true)}
          >
            <Plus size={18} />
            Agregar atleta
          </button>
        }
      />

      <section className="toolbar-card">
        <div className="search-box search-box-wide">
          <Search size={18} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre..."
            aria-label="Buscar atleta"
          />
        </div>

        <span className="toolbar-counter">
          {filteredAthletes.length} atleta(s) registrado(s)
        </span>
      </section>

      {/* Manejo de estados de carga y error */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <Loader2 size={32} className="spin-animation" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontWeight: '600', fontSize: '15px' }}>Cargando atletas desde la base de datos...</p>
        </div>
      ) : error ? (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '16px',
          padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', color: '#991b1b', marginBottom: '24px'
        }}>
          <AlertCircle size={28} />
          <div style={{ flex: 1 }}>
            <strong style={{ display: 'block', fontSize: '15px' }}>Error de conexión con la API</strong>
            <span style={{ fontSize: '13px' }}>{error}</span>
          </div>
          <button className="secondary-button" type="button" onClick={fetchAthletes}>
            Reintentar
          </button>
        </div>
      ) : filteredAthletes.length > 0 ? (
        <div className="athletes-grid">
          {filteredAthletes.map((athlete) => (
            <AthleteCard
              key={athlete.id}
              {...athlete}
              onView={() => handleViewAthlete(athlete)}
              onDelete={handleDeleteAthlete}
            />
          ))}
        </div>
      ) : (
        <div className="empty-card">
          <h3>No encontramos atletas</h3>
          <p>
            {search ? 'Prueba con otro término de búsqueda.' : 'Aún no has registrado atletas en tu perfil. Haz clic en "Agregar atleta" para comenzar.'}
          </p>
        </div>
      )}

      {/* Modal para Agregar Atleta */}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: '#1e293b' }}>Registrar Nuevo Atleta</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px' }}>
              Ingresa los datos del atleta para iniciar el seguimiento biomecánico con MediaPipe.
            </p>

            <form onSubmit={handleAddAthlete}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Nombre completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Rodrigo Silva"
                  value={newAthlete.name}
                  onChange={(e) => setNewAthlete({ ...newAthlete, name: e.target.value })}
                  style={{ width: '100%', height: '44px', padding: '0 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Edad (años) *
                </label>
                <input
                  type="number"
                  min="6"
                  max="25"
                  required
                  placeholder="Ej. 16"
                  value={newAthlete.age}
                  onChange={(e) => setNewAthlete({ ...newAthlete, age: e.target.value })}
                  style={{ width: '100%', height: '44px', padding: '0 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="consentCheck"
                  checked={newAthlete.consent}
                  onChange={(e) => setNewAthlete({ ...newAthlete, consent: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="consentCheck" style={{ fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
                  Consentimiento informado firmado y vigente (Requerimiento Escolar)
                </label>
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
                  {submitting ? 'Guardando...' : 'Guardar Atleta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalle de Atleta e Historial de Sesiones */}
      {selectedAthlete && (
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
            maxWidth: '560px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span className="eyebrow blue">PERFIL DE ATLETA</span>
                <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '4px 0 2px', color: '#1e293b' }}>
                  {selectedAthlete.name}
                </h2>
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  {selectedAthlete.age} años · Registrado el {new Date(selectedAthlete.createdAt || Date.now()).toLocaleDateString('es-CL')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAthlete(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={22} />
              </button>
            </div>

            <div style={{
              background: '#f8fafc',
              borderRadius: '12px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Estado de Protocolo</span>
                <strong style={{ display: 'block', fontSize: '14px', color: selectedAthlete.consent ? '#15803d' : '#b45309' }}>
                  {selectedAthlete.consent ? 'Consentimiento Aprobado' : 'Pendiente de Consentimiento'}
                </strong>
              </div>
              <span className={`status ${selectedAthlete.consent ? 'success' : 'warning'}`}>
                <span className="status-dot" />
                {selectedAthlete.consent ? 'Válido' : 'Pendiente'}
              </span>
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Video size={18} style={{ color: '#2474d2' }} />
              Sesiones Registradas ({athleteSessions.length})
            </h3>

            {loadingSessions ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                <Loader2 size={24} className="spin-animation" style={{ margin: '0 auto 8px' }} />
                <span style={{ fontSize: '13px' }}>Cargando sesiones...</span>
              </div>
            ) : athleteSessions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {athleteSessions.map((s) => (
                  <div key={s.id} style={{
                    border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <strong style={{ fontSize: '14px', color: '#1e293b' }}>
                        Sesión #{s.id}
                      </strong>
                      <span style={{ display: 'block', fontSize: '12px', color: '#64748b' }}>
                        {new Date(s.sessionDate).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {s.notes ? ` · ${s.notes}` : ''}
                      </span>
                    </div>
                    <span className="status success">
                      <span className="status-dot" />
                      Registrada
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px', background: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
                <p style={{ margin: 0, fontSize: '13px' }}>Este atleta no tiene sesiones de carrera aún.</p>
              </div>
            )}

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="primary-button"
                onClick={() => setSelectedAthlete(null)}
                style={{ height: '40px', padding: '0 20px', borderRadius: '10px' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
