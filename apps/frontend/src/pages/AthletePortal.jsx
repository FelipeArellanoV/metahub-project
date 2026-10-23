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
import { useNavigate } from 'react-router-dom';
import { Layout, PageHeader } from '../components/UI.jsx';
import api from '../services/api.js';

export default function AthletePortal() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [portalData, setPortalData] = useState(null);
  const [error, setError] = useState(null);
  const [assistanceConfirmed, setAssistanceConfirmed] = useState(false);
  const [completedDrills, setCompletedDrills] = useState({});

  useEffect(() => {
    async function loadPortal() {
      try {
        setLoading(true);
        const data = await api.portal.getMe();
        setPortalData(data);
      } catch (err) {
        // Si hay token demo o falla el backend, verificar demo
        const isDemo = typeof window !== 'undefined' && window.location.search.includes('demo=1');
        if (isDemo) {
          setPortalData({
            athlete: {
              name: 'Martín San Martín (Demo)',
              category: 'Sub-16',
              school: 'Liceo Deportivo Temuco',
              consentStatus: 'vigente'
            },
            progress: {
              xp: 450,
              level: { name: 'Intermedio' },
              nextLevelAt: 700,
              sessionCount: 4,
              deltaIpt: 7.5,
              medals: [
                { id: 'first_session', name: 'Bautismo en Pista', description: 'Primera sesión analizada', earned: true, icon: '🏃' },
                { id: 'ipt_75', name: 'Técnica Sólida', description: 'IPT alcanzado ≥ 75 pts', earned: true, icon: '🎯' },
                { id: 'improvement', name: 'Progresión Positiva', description: 'Superaste tu marca previa', earned: true, icon: '📈' }
              ]
            },
            sessions: [
              { id: 101, sessionDate: new Date().toISOString(), iptScore: 78.4 }
            ],
            latestAnalysis: null
          });
        } else {
          setError(err.message || 'Error cargando datos del portal');
        }
      } finally {
        setLoading(false);
      }
    }
    loadPortal();
  }, []);

  const toggleDrill = (idx) => {
    setCompletedDrills(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const athlete = portalData?.athlete;
  const progress = portalData?.progress;
  const sessions = portalData?.sessions || [];
  const latestAnalysis = portalData?.latestAnalysis;

  // Ejercicios dinámicos derivados de la última prescripción biomecánica real
  const dynamicDrills = latestAnalysis?.prescripcion_completa?.ejercicios || [];

  const completedCount = Object.values(completedDrills).filter(Boolean).length;
  const totalDrills = dynamicDrills.length;
  const progressPercent = totalDrills > 0 ? Math.round((completedCount / totalDrills) * 100) : 0;

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
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: athlete?.consentStatus === 'vigente' ? '#6ee7b7' : '#f59e0b' }}>
            <ShieldCheck size={15} /> Consentimiento {athlete?.consentStatus === 'vigente' ? 'vigente' : 'pendiente'}
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
          {/* CITACIÓN OFICIAL EN PISTA */}
          <div
            style={{
              background: 'white',
              border: '1px solid #e6eaf0',
              borderRadius: 16,
              padding: 20,
              boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#2474d2', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                PRÓXIMA SESIÓN EN PISTA
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#7b8798', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={13} /> Horario habitual de entrenamiento
              </span>
            </div>

            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: '#10283f' }}>
              Captura Biomecánica: Sprint y Medición con Calibrador de Terreno
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: '#475569', lineHeight: 1.4 }}>
              Ubicación: <strong>Pista Atlética UCT Campus Norte</strong>. Tu profesor registrará tus pasadas con el giroscopio calibrado y la cámara de alta frecuencia para actualizar tu Índice de Perfeccionamiento Técnico (IPT).
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
                <MapPin size={14} color="#2474d2" /> Campus Norte UCT
              </div>

              <button
                type="button"
                className={assistanceConfirmed ? 'btn-outline-sm' : 'primary-button'}
                style={{
                  height: 38,
                  background: assistanceConfirmed ? '#e9f8f1' : undefined,
                  borderColor: assistanceConfirmed ? '#10b981' : undefined,
                  color: assistanceConfirmed ? '#116945' : undefined
                }}
                onClick={() => setAssistanceConfirmed(!assistanceConfirmed)}
              >
                {assistanceConfirmed ? (
                  <>
                    <CheckCircle2 size={15} color="#10b981" />
                    <span>¡Asistencia Confirmada!</span>
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    <span>Confirmar asistencia</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* MIS TAREAS / DRILLS BIOMECÁNICOS REALES */}
          <div
            style={{
              background: 'white',
              border: '1px solid #e6eaf0',
              borderRadius: 16,
              padding: 20,
              boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#2474d2', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  PLAN PROGRESIVO DE EJERCICIOS CORRECTIVOS
                </span>
                <h3 style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 800, color: '#10283f' }}>
                  Prescripción Técnica Asignada
                </h3>
              </div>
              {totalDrills > 0 && (
                <span style={{ fontSize: 12, fontWeight: 800, color: '#2474d2', background: '#eaf3ff', padding: '4px 10px', borderRadius: 8 }}>
                  {completedCount} de {totalDrills} ({progressPercent}%)
                </span>
              )}
            </div>

            {totalDrills > 0 ? (
              <>
                <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 4, margin: '12px 0 16px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${progressPercent}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #2474d2, #10b981)',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {dynamicDrills.map((drill, idx) => {
                    const isDone = !!completedDrills[idx];
                    return (
                      <div
                        key={idx}
                        className={`athlete-task-item ${isDone ? 'completed' : ''}`}
                        onClick={() => toggleDrill(idx)}
                        style={{ cursor: 'pointer', padding: 12, border: '1px solid #f1f5f9', borderRadius: 10 }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div className={`checkbox-round ${isDone ? 'checked' : ''}`}>
                            {isDone && <Check size={14} />}
                          </div>
                          <div>
                            <strong style={{ fontSize: 13, color: '#10283f', textDecoration: isDone ? 'line-through' : 'none' }}>
                              [{drill.fase || 'FASE'}] {drill.nombre}
                            </strong>
                            <span style={{ fontSize: 11, color: '#7b8798', display: 'block' }}>
                              {drill.protocolo} · <em>Foco: {drill.foco}</em>
                            </span>
                          </div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: isDone ? '#10b981' : '#f59e0b' }}>
                          {isDone ? 'Completado ✓' : 'Pendiente'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ padding: '24px 16px', background: '#f8fafc', borderRadius: 10, textAlign: 'center', marginTop: 12, color: '#64748b' }}>
                <Dumbbell size={28} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>
                  Sin ejercicios correctivos pendientes actualmente.
                </p>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                  Tu plan se generará automáticamente tras la próxima pasada grabada y evaluada con el IPT MetaHub.
                </span>
              </div>
            )}
          </div>

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
                        {s.iptScore ? `${s.iptScore} pts` : 'Evaluada'}
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
