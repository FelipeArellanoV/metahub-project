import {
  Activity,
  ArrowRight,
  Award,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Dumbbell,
  Flame,
  Info,
  MapPin,
  Medal,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  User,
  Video
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout, PageHeader } from '../components/UI.jsx';
import api from '../services/api.js';

export default function AthletePortal() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [portalData, setPortalData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    let timer;
    async function loadPortal() {
      try {
        const data = await api.portal.getMe();
        if (alive) { setPortalData(data); setError(null); }
      } catch (err) {
        if (alive) setError(err.message || 'Error cargando datos del portal');
      } finally {
        if (alive) {
          setLoading(false);
          timer = setTimeout(loadPortal, 15000);
        }
      }
    }
    loadPortal();
    return () => { alive = false; clearTimeout(timer); };
  }, []);

  const athlete = portalData?.athlete;
  const progress = portalData?.progress;
  const sessions = portalData?.sessions || [];
  const latestAnalysis = portalData?.latestAnalysis;

  // Ejercicios dinámicos derivados de la última prescripción biomecánica real
  const dynamicDrills = latestAnalysis?.prescripcion_completa?.ejercicios || [];

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
          <Activity size={36} className="animate-spin" style={{ margin: '0 auto 12px', color: '#2474d2' }} />
          <p style={{ fontWeight: 600 }}>Cargando ficha del atleta desde MetaHub Lab...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div style={{ padding: '40px 20px', maxWidth: 600, margin: '0 auto' }}>
          <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 12, padding: 20, color: '#9f1239' }}>
            <h3 style={{ margin: '0 0 8px', fontWeight: 800 }}>No se pudo cargar tu portal</h3>
            <p style={{ margin: '0 0 16px', fontSize: 14 }}>{error}</p>
            <button className="primary-button" onClick={() => window.location.reload()}>Reintentar</button>
          </div>
        </div>
      </Layout>
    );
  }

  const initials = athlete?.name
    ? athlete.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'AT';

  const earnedMedals = progress?.medals?.filter(m => m.earned) || [];

  return (
    <Layout>
      <PageHeader
        eyebrow="PORTAL DEL ESTUDIANTE ATLETA"
        title="Mi Espacio Deportivo"
        description="Seguimiento biomecánico longitudinal y plan progresivo personalizado de técnica de carrera."
      />

      {/* ATHLETE HERO CARD */}
      <div className="athlete-hero-card" style={{ marginBottom: 24 }}>
        <div className="athlete-hero-bg-accent" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #35a8e0, #2474d2)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 20
            }}
          >
            {initials}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
                ¡Hola, {athlete?.name || 'Atleta'}! 🏃‍♂️
              </h2>
              {athlete?.category && (
                <span
                  style={{
                    background: 'rgba(28, 155, 105, 0.25)',
                    border: '1px solid rgba(28, 155, 105, 0.5)',
                    color: '#6ee7b7',
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 6
                  }}
                >
                  {athlete.category}
                </span>
              )}
            </div>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>
              {athlete?.school || 'MetaHub Track Academy'} · Nivel: <strong style={{ color: '#60a5fa' }}>{progress?.level?.name || 'Iniciación'}</strong>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: athlete?.consent === true ? '#6ee7b7' : '#f59e0b' }}>
            <ShieldCheck size={15} /> Consentimiento {athlete?.consent === true ? 'vigente' : 'pendiente'}
          </span>
          <span style={{ color: '#64748b' }}>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#93c5fd' }}>
            <Activity size={15} /> {progress?.sessionCount || sessions.length} sesiones registradas
          </span>
          <span style={{ color: '#64748b' }}>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fde047' }}>
            <Trophy size={15} /> {earnedMedals.length} medallas obtenidas
          </span>
          <span style={{ color: '#64748b' }}>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#c084fc' }}>
            <Flame size={15} /> {progress?.xp || 0} XP
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section className="panel-card">
            <h3>Mis sesiones y seguimiento</h3>
            <Link className="secondary-button" to="/reviews">Mis revisiones y ejercicios por sesión</Link>
            <Link className="primary-button" to="/upload">Subir video para analizar</Link>
            <Link className="secondary-button" to="/evolution">Comparar mis sesiones y ver mi evolución</Link>
            <p>Consulta tus citas y ejercicios asignados. El cumplimiento y los mensajes se guardan en el servidor.</p>
            <Link className="primary-button" to="/collaboration">Abrir seguimiento compartido</Link>
          </section>
          <section className="panel-card">
            <h3>Prescripción del último análisis</h3>
            <p>Referencia del análisis biomecánico. Revisa con tu entrenador qué ejercicios y dosificación realizar;
              las asignaciones y su cumplimiento se registran en Seguimiento compartido.</p>
            {dynamicDrills.length ? dynamicDrills.map((drill, idx) => (
              <article key={idx} style={{ padding: 12, borderBottom: '1px solid #e6eaf0' }}>
                <strong>[{drill.fase || 'FASE'}] {drill.nombre}</strong>
                <p>{drill.protocolo}</p>
                <p>{drill.foco}</p>
              </article>
            )) : <p>No hay una prescripción disponible en el último análisis.</p>}
          </section>

          {/* HISTORIAL RECIENTE DE SESIONES */}
          <div
            style={{
              background: 'white',
              border: '1px solid #e6eaf0',
              borderRadius: 16,
              padding: 20,
              boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
            }}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, color: '#10283f', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Activity size={16} color="#2474d2" />
              Historial de Sesiones Registradas
            </h3>

            {sessions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sessions.map((s, idx) => (
                  <div key={s.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #edf2f7' }}>
                    <div>
                      <strong style={{ fontSize: 13, color: '#10283f' }}>Sesión #{sessions.length - idx}</strong>
                      <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>
                        {new Date(s.sessionDate).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: (s.iptScore || 0) >= 80 ? '#10b981' : (s.iptScore || 0) >= 65 ? '#2474d2' : '#f59e0b' }}>
                        {s.iptScore != null ? `${s.iptScore} pts` : 'Sin análisis'}
                      </span>
                      <span style={{ fontSize: 10, color: '#94a3b8', display: 'block' }}>Índice IPT</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>
                Aún no tienes sesiones registradas en el laboratorio.
              </p>
            )}
          </div>
        </div>

        {/* SIDEBAR: GAMIFICACIÓN Y FEEDBACK */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* LOGROS Y MEDALLAS REALES */}
          <div
            style={{
              background: 'white',
              border: '1px solid #e6eaf0',
              borderRadius: 16,
              padding: 20,
              boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
            }}
          >
            <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: '#10283f', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Trophy size={16} color="#d69b2b" />
              Medallas Obtenidas ({earnedMedals.length})
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {earnedMedals.length > 0 ? (
                earnedMedals.map(medal => (
                  <div key={medal.id} className="badge-trophy-card" style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ fontSize: 24 }}>{medal.icon || '🏅'}</div>
                    <div>
                      <strong style={{ fontSize: 12, color: '#10283f', display: 'block' }}>{medal.name}</strong>
                      <span style={{ fontSize: 10, color: '#64748b' }}>{medal.description}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: 12, color: '#64748b' }}>
                  Completa tus primeras sesiones en pista para desbloquear medallas biomecánicas.
                </div>
              )}
            </div>
          </div>

          {/* NOTA DE AUTORÍA CIENTÍFICA */}
          <div
            style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #edf4fc 100%)',
              border: '1px solid #dce8f5',
              borderRadius: 16,
              padding: 16
            }}
          >
            <strong style={{ fontSize: 11, color: '#10283f', display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Fórmula IPT MetaHub UCT
            </strong>
            <p style={{ fontSize: 11, color: '#475569', margin: '4px 0 0', lineHeight: 1.4 }}>
              Evaluación matemática longitudinal basada en triple extensión, compresión de recobro y simetría bilateral (Henríquez & Arellano, 2026).
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
