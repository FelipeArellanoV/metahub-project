/**
 * =========================================================================================
 * PROYECTO METAHUB — SEGUIMIENTO LONGITUDINAL DE LA TÉCNICA DE CARRERA EN ATLETISMO ESCOLAR
 * Escuela de Ingeniería Civil en Informática — Universidad Católica de Temuco
 * 
 * Memoria / Trabajo de Título:
 * Autores: Felipe Arellano Vargas & Sofía Henríquez Soto
 * Profesor Guía: Dr. Marcos Lévano
 * 
 * Módulo: Panel de Control y Tablero de Rendimiento (Dashboard.jsx)
 * Descripción: Presenta la visión global del progreso deportivo, estadísticas de atletas,
 *              resumen de consentimientos vigentes y accesos directos a sesiones recientes.
 * =========================================================================================
 */

import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Plus,
  Sparkles,
  Users,
  Video
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AthleteCard,
  Layout,
  PageHeader,
  StatCard
} from '../components/UI.jsx';
import api from '../services/api.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  let userName = 'Entrenador';
  try {
    const rawUser = localStorage.getItem('metahub_user');
    if (rawUser) {
      const user = JSON.parse(rawUser);
      userName = user.name ? user.name.split(' ')[0] : 'Entrenador';
    }
  } catch (e) {
    // ignore
  }

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [athletesData, sessionsData] = await Promise.all([
          api.athletes.getAll(),
          api.sessions.getAll()
        ]);
        setAthletes(athletesData);
        setSessions(sessionsData);
      } catch (err) {
        console.error('Error cargando datos del dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const consentCount = athletes.filter(a => a.consent).length;

  return (
    <Layout>
      <PageHeader
        eyebrow="PANEL DE RENDIMIENTO"
        title={`Hola, ${userName} 👋`}
        description="Revisa el progreso longitudinal de tus atletas escolares y registra nuevas capturas de carrera."
        action={
          <button
            className="primary-button"
            type="button"
            onClick={() => navigate('/athletes')}
          >
            <Plus size={18} />
            Gestionar atletas
          </button>
        }
      />

      <section className="stats-grid">
        <StatCard
          icon={Users}
          label="Atletas activos"
          value={loading ? '...' : athletes.length.toString()}
          detail="bajo seguimiento"
        />
        <StatCard
          icon={Video}
          label="Sesiones"
          value={loading ? '...' : sessions.length.toString()}
          detail="registradas"
        />
        <StatCard
          icon={Activity}
          label="Consentimientos"
          value={loading ? '...' : `${consentCount}/${athletes.length}`}
          detail="vigentes"
        />
        <StatCard
          icon={CalendarDays}
          label="Evaluados"
          value={loading ? '...' : new Set(sessions.map(s => s.athleteId)).size.toString()}
          detail="atletas con sesión"
        />
      </section>

      <section className="highlight-card">
        <div className="highlight-icon">
          <Sparkles size={24} />
        </div>

        <div>
          <span className="eyebrow blue">SEGUIMIENTO LONGITUDINAL</span>
          <h2>Convierte cada carrera en una historia de evolución técnica.</h2>
          <p>
            MetaHub procesa la estimación de postura corporal con MediaPipe BlazePose para extraer
            los ángulos articulares de rodilla y simetría de zancada a lo largo del tiempo.
          </p>
        </div>

        <button
          className="secondary-button"
          type="button"
          onClick={() => navigate('/sessions')}
        >
          Ver sesiones
        </button>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span className="eyebrow">SEGUIMIENTO</span>
            <h2>Atletas recientes</h2>
          </div>

          <button
            className="text-link-button"
            type="button"
            onClick={() => navigate('/athletes')}
          >
            Ver todos ({athletes.length})
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
            <Loader2 size={28} className="spin-animation" style={{ margin: '0 auto 10px' }} />
            <span>Cargando atletas...</span>
          </div>
        ) : athletes.length > 0 ? (
          <div className="athletes-grid">
            {athletes.slice(0, 3).map((athlete) => (
              <AthleteCard
                key={athlete.id}
                {...athlete}
                onView={() => navigate('/athletes')}
              />
            ))}
          </div>
        ) : (
          <div className="empty-card">
            <h3>No tienes atletas registrados todavía</h3>
            <p>Registra a tus primeros corredores para comenzar a monitorear su técnica de carrera.</p>
            <button
              className="primary-button"
              type="button"
              style={{ marginTop: '14px' }}
              onClick={() => navigate('/athletes')}
            >
              <Plus size={16} />
              Agregar Atleta
            </button>
          </div>
        )}
      </section>
    </Layout>
  );
}
