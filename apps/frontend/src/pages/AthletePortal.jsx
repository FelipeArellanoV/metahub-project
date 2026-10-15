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
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, PageHeader } from '../components/UI.jsx';

export default function AthletePortal() {
  const navigate = useNavigate();

  const [assistanceConfirmed, setAssistanceConfirmed] = useState(false);
  const [completedDrills, setCompletedDrills] = useState({
    1: true,
    2: true,
    3: false
  });

  const toggleDrill = (id) => {
    setCompletedDrills((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const completedCount = Object.values(completedDrills).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / 3) * 100);

  return (
    <Layout>
      <PageHeader
        eyebrow="PORTAL DEL ESTUDIANTE ATLETA"
        title="Mi Espacio Deportivo"
        description="Revisa tus citas de pista, tus ejercicios asignados y la evolución de tu técnica de carrera."
        action={
          <button
            className="btn-outline-sm"
            type="button"
            onClick={() => navigate('/reports')}
          >
            <Trophy size={16} />
            Ver mi ficha de logros
          </button>
        }
      />

      {/* ATHLETE HERO CARD */}
      <div className="athlete-hero-card">
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
            MA
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
                ¡Hola, Martín! 🏃‍♂️
              </h2>
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
                Sub-16
              </span>
            </div>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>
              Liceo Deportivo Temuco · Entrenador: Felipe Arellano
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6ee7b7' }}>
            <ShieldCheck size={15} /> Consentimiento parental vigente
          </span>
          <span style={{ color: '#64748b' }}>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#93c5fd' }}>
            <Activity size={15} /> 8 sesiones en registro
          </span>
          <span style={{ color: '#64748b' }}>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fde047' }}>
            <Trophy size={15} /> 3 medallas obtenidas
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* PRÓXIMA CITACIÓN EN PISTA */}
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
                HOY EN PISTA (CITACIÓN OFICIAL)
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#7b8798', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={13} /> 16:30 hrs
              </span>
            </div>

            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: '#10283f' }}>
              Captura en Video: Sprint 60m y Medición de Recobro
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: '#475569', lineHeight: 1.4 }}>
              Ubicación: <strong>Pista Atlética UCT (Zona de rectas)</strong>. Lleva zapatillas de clavos y ropa deportiva de carrera. Se grabará la serie para comparar con tu sesión de marzo.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
                <MapPin size={14} color="#2474d2" /> Pista UCT Campus Norte
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
                    <span>Confirmar que iré a pista</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* MIS TAREAS / DRILLS DE LA SEMANA */}
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
                  PLAN SEMANAL DE ENTRENAMIENTO
                </span>
                <h3 style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 800, color: '#10283f' }}>
                  Mis Ejercicios Asignados
                </h3>
              </div>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#2474d2', background: '#eaf3ff', padding: '4px 10px', borderRadius: 8 }}>
                {completedCount} de 3 listos ({progressPercent}%)
              </span>
            </div>

            {/* PROGRESS BAR */}
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

            {/* DRILL 1 */}
            <div
              className={`athlete-task-item ${completedDrills[1] ? 'completed' : ''}`}
              onClick={() => toggleDrill(1)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className={`checkbox-round ${completedDrills[1] ? 'checked' : ''}`}>
                  {completedDrills[1] && <Check size={14} />}
                </div>
                <div>
                  <strong style={{ fontSize: 13, color: '#10283f', textDecoration: completedDrills[1] ? 'line-through' : 'none' }}>
                    Skipping A sobre vallas bajas (40cm)
                  </strong>
                  <span style={{ fontSize: 11, color: '#7b8798', display: 'block' }}>
                    4 series x 6 vallas · Foco: subir rodilla a 90° sin doblar cintura
                  </span>
                </div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: completedDrills[1] ? '#10b981' : '#f59e0b' }}>
                {completedDrills[1] ? 'Completado ✓' : 'Pendiente'}
              </span>
            </div>

            {/* DRILL 2 */}
            <div
              className={`athlete-task-item ${completedDrills[2] ? 'completed' : ''}`}
              onClick={() => toggleDrill(2)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className={`checkbox-round ${completedDrills[2] ? 'checked' : ''}`}>
                  {completedDrills[2] && <Check size={14} />}
                </div>
                <div>
                  <strong style={{ fontSize: 13, color: '#10283f', textDecoration: completedDrills[2] ? 'line-through' : 'none' }}>
                    Pliometría reactiva unipodal
                  </strong>
                  <span style={{ fontSize: 11, color: '#7b8798', display: 'block' }}>
                    3 series x 8 saltos en cajón de 30cm · Foco: rigidez de tobillo
                  </span>
                </div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: completedDrills[2] ? '#10b981' : '#f59e0b' }}>
                {completedDrills[2] ? 'Completado ✓' : 'Pendiente'}
              </span>
            </div>

            {/* DRILL 3 */}
            <div
              className={`athlete-task-item ${completedDrills[3] ? 'completed' : ''}`}
              onClick={() => toggleDrill(3)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className={`checkbox-round ${completedDrills[3] ? 'checked' : ''}`}>
                  {completedDrills[3] && <Check size={14} />}
                </div>
                <div>
                  <strong style={{ fontSize: 13, color: '#10283f', textDecoration: completedDrills[3] ? 'line-through' : 'none' }}>
                    Carrera resistida con arnés elástico
                  </strong>
                  <span style={{ fontSize: 11, color: '#7b8798', display: 'block' }}>
                    4 pasadas x 20m · Foco: empuje fuerte de cadera
                  </span>
                </div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: completedDrills[3] ? '#10b981' : '#f59e0b' }}>
                {completedDrills[3] ? 'Completado ✓' : 'Pendiente'}
              </span>
            </div>
          </div>
        </div>

        {/* SIDEBAR: GAMIFICACIÓN Y FEEDBACK */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* LOGROS Y MEDALLAS */}
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
              Mis Logros Biomecánicos
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="badge-trophy-card" style={{ padding: 12 }}>
                <div style={{ fontSize: 22 }}>🚀</div>
                <div>
                  <strong style={{ fontSize: 12, color: '#10283f', display: 'block' }}>+3,9° en Rodilla</strong>
                  <span style={{ fontSize: 10, color: '#64748b' }}>Tu zancada es más amplia y alta</span>
                </div>
              </div>

              <div className="badge-trophy-card" style={{ padding: 12 }}>
                <div style={{ fontSize: 22 }}>🎯</div>
                <div>
                  <strong style={{ fontSize: 12, color: '#10283f', display: 'block' }}>95,8% de Simetría</strong>
                  <span style={{ fontSize: 10, color: '#64748b' }}>Fuerza balanceada en ambas piernas</span>
                </div>
              </div>

              <div className="badge-trophy-card" style={{ padding: 12 }}>
                <div style={{ fontSize: 22 }}>🏅</div>
                <div>
                  <strong style={{ fontSize: 12, color: '#10283f', display: 'block' }}>Asistencia Perfecta</strong>
                  <span style={{ fontSize: 10, color: '#64748b' }}>8 de 8 sesiones completadas</span>
                </div>
              </div>
            </div>
          </div>

          {/* MENSAJE DEL ENTRENADOR FELIPE */}
          <div
            style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #edf4fc 100%)',
              border: '1px solid #dce8f5',
              borderRadius: 16,
              padding: 18
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: '#2474d2',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: 11,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                FA
              </div>
              <div>
                <strong style={{ fontSize: 12, color: '#10283f', display: 'block' }}>
                  Nota del Profesor Felipe
                </strong>
                <span style={{ fontSize: 10, color: '#7b8798' }}>Hace 2 días</span>
              </div>
            </div>

            <p style={{ fontSize: 12, color: '#334155', fontStyle: 'italic', margin: 0, lineHeight: 1.4 }}>
              "Excelente actitud en la sesión de gradas, Martín. Noté que ya no frenas con el talón al tocar el suelo. Sigue practicando las vallas bajas esta semana."
            </p>
          </div>

          {/* BOTÓN VER COMPARATIVA */}
          <button
            type="button"
            className="primary-button"
            style={{ width: '100%', height: 42 }}
            onClick={() => navigate('/compare')}
          >
            <Play size={16} />
            Ver mi comparativa en video
          </button>
        </div>
      </div>
    </Layout>
  );
}
