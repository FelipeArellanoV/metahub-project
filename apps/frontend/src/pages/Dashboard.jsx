import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CalendarDays,
  Clock,
  Dumbbell,
  Flame,
  MapPin,
  Plus,
  Sparkles,
  Users,
  Video
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AthleteCard,
  Layout,
  PageHeader,
  StatCard
} from '../components/UI.jsx';

const athletes = [
  {
    id: 1,
    name: 'Martín Atleta',
    initials: 'MA',
    age: 15,
    lastSession: '26 Sep 2026',
    sessions: 8,
    consent: true
  },
  {
    id: 2,
    name: 'Javiera Soto',
    initials: 'JS',
    age: 16,
    lastSession: '24 Sep 2026',
    sessions: 6,
    consent: true
  },
  {
    id: 3,
    name: 'Tomás Muñoz',
    initials: 'TM',
    age: 14,
    lastSession: 'Sin sesiones',
    sessions: 0,
    consent: false
  }
];

const priorityAlerts = [
  {
    id: 1,
    name: 'Martín Atleta',
    category: 'Sub-16',
    issue: 'Flexión de rodilla limitada (24,2° vs 28°) y caída de cadera.',
    urgency: 'high',
    urgencyLabel: 'Alta Prioridad',
    drill: 'Skipping A en vallas 40cm'
  },
  {
    id: 4,
    name: 'Antonia Pérez',
    category: 'Sub-14',
    issue: 'Asimetría marcada en zancada izq/der (14,8% disparidad).',
    urgency: 'high',
    urgencyLabel: 'Alta Prioridad',
    drill: 'Trabajo propioceptivo de tobillo'
  }
];

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <Layout>
      <PageHeader
        eyebrow="PANEL DE ENTRENADOR"
        title="Hola, Felipe 👋"
        description="Centro de control del laboratorio de técnica de carrera escolar."
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn-outline-sm"
              type="button"
              onClick={() => navigate('/calendar')}
            >
              <Calendar size={16} />
              Calendario
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={() => navigate('/sessions')}
            >
              <Plus size={18} />
              Nueva captura
            </button>
          </div>
        }
      />

      {/* METRIC KPIS */}
      <section className="stats-grid">
        <StatCard
          icon={Users}
          label="Atletas en seguimiento"
          value="4"
          detail="Sub-14, Sub-16, Sub-18"
        />
        <StatCard
          icon={Video}
          label="Sesiones de pista"
          value="14"
          detail="capturas registradas"
        />
        <StatCard
          icon={AlertTriangle}
          label="Requieren apoyo"
          value="2"
          detail="prioridad técnica alta"
        />
        <StatCard
          icon={CalendarDays}
          label="Citas esta semana"
          value="3"
          detail="en pista atlética"
        />
      </section>

      {/* 🔴 EXCLUSIVE REQUIRED SECTION: ATLETAS QUE NECESITAN MAYOR AYUDA */}
      <section className="section-block" style={{ marginTop: 24 }}>
        <div className="section-heading">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Flame size={18} />
            </div>
            <div>
              <span className="eyebrow" style={{ color: '#dc2626' }}>
                ATENCIÓN TÉCNICA PRIORITARIA
              </span>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                Atletas que Necesitan Mayor Ayuda
              </h2>
            </div>
          </div>

          <button
            className="text-link-button"
            type="button"
            onClick={() => navigate('/priority')}
          >
            Ver plan completo <ArrowRight size={14} style={{ display: 'inline', marginLeft: 4 }} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {priorityAlerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                background: 'white',
                border: '1px solid #fee2e2',
                borderLeft: '5px solid #ef4444',
                borderRadius: 14,
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 14px rgba(239,68,68,0.06)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <strong style={{ fontSize: 14, color: '#10283f' }}>{alert.name}</strong>
                  <span
                    style={{
                      background: '#fee2e2',
                      color: '#b91c1c',
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: 6
                    }}
                  >
                    {alert.urgencyLabel}
                  </span>
                </div>

                <p style={{ fontSize: 12, color: '#4b5868', margin: '0 0 10px', lineHeight: 1.4 }}>
                  {alert.issue}
                </p>

                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '6px 10px',
                    fontSize: 11,
                    color: '#1e5fad',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 12
                  }}
                >
                  <Dumbbell size={13} />
                  <span>Drill sugerido: <strong>{alert.drill}</strong></span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                <button
                  type="button"
                  className="btn-schedule-sm"
                  style={{ height: 32, fontSize: 11 }}
                  onClick={() => navigate('/calendar')}
                >
                  <Calendar size={13} />
                  Agendar refuerzo
                </button>
                <button
                  type="button"
                  className="btn-outline-sm"
                  style={{ height: 32, fontSize: 11 }}
                  onClick={() => navigate('/priority')}
                >
                  Ver recomendación
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 📅 EXCLUSIVE REQUIRED SECTION: CALENDARIO DE PLANIFICACIÓN PREVIEW */}
      <section className="section-block" style={{ marginTop: 28 }}>
        <div className="section-heading">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#eaf3ff',
                color: '#2474d2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Calendar size={18} />
            </div>
            <div>
              <span className="eyebrow blue">AGENDA EN TERRENO</span>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                Próximas Sesiones de Pista Planificadas
              </h2>
            </div>
          </div>

          <button
            className="text-link-button"
            type="button"
            onClick={() => navigate('/calendar')}
          >
            Abrir calendario completo <ArrowRight size={14} style={{ display: 'inline', marginLeft: 4 }} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
          {/* TODAY'S SESSION */}
          <div
            style={{
              background: 'linear-gradient(135deg, #10283f 0%, #1e3a5f 100%)',
              color: 'white',
              borderRadius: 14,
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span
                  style={{
                    background: 'rgba(53,168,224,0.25)',
                    color: '#60c6f5',
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: 6
                  }}
                >
                  HOY · JUEVES 15 OCT
                </span>
                <span style={{ fontSize: 11, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} /> 16:30 hrs
                </span>
              </div>

              <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>
                Captura en pista: Sprint 60m
              </h4>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 10px' }}>
                Martín Atleta & Javiera Soto · Recta principal
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#cbd5e1' }}>
              <MapPin size={12} color="#35a8e0" /> Pista UCT Temuco
            </div>
          </div>

          {/* UPCOMING SESSION 1 */}
          <div
            style={{
              background: 'white',
              border: '1px solid #e6eaf0',
              borderRadius: 14,
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span
                  style={{
                    background: '#e9f8f1',
                    color: '#116945',
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: 6
                  }}
                >
                  SÁBADO 17 OCT
                </span>
                <span style={{ fontSize: 11, color: '#7b8798', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} /> 15:30 hrs
                </span>
              </div>

              <h4 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#10283f' }}>
                Evaluación salida de tacos
              </h4>
              <p style={{ fontSize: 12, color: '#7b8798', margin: '0 0 10px' }}>
                Tomás Muñoz · Ángulo de despegue y tronco
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#7b8798' }}>
              <MapPin size={12} color="#2474d2" /> Pista UCT Temuco
            </div>
          </div>

          {/* UPCOMING SESSION 2 */}
          <div
            style={{
              background: 'white',
              border: '1px solid #e6eaf0',
              borderRadius: 14,
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span
                  style={{
                    background: '#fff5dc',
                    color: '#925c04',
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: 6
                  }}
                >
                  JUEVES 22 OCT
                </span>
                <span style={{ fontSize: 11, color: '#7b8798', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} /> 16:30 hrs
                </span>
              </div>

              <h4 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#10283f' }}>
                Refuerzo: Flexión de rodilla
              </h4>
              <p style={{ fontSize: 12, color: '#7b8798', margin: '0 0 10px' }}>
                Martín Atleta · Transferencia pliométrica
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#7b8798' }}>
              <MapPin size={12} color="#d69b2b" /> Pista Estadio Temuco
            </div>
          </div>
        </div>
      </section>

      {/* RECENT ATHLETES */}
      <section className="section-block" style={{ marginTop: 28 }}>
        <div className="section-heading">
          <div>
            <span className="eyebrow">EQUIPO ESCOLAR</span>
            <h2>Atletas Recientes</h2>
          </div>

          <button
            className="text-link-button"
            type="button"
            onClick={() => navigate('/athletes')}
          >
            Ver todos ({athletes.length})
          </button>
        </div>

        <div className="athletes-grid">
          {athletes.map((athlete) => (
            <AthleteCard
              key={athlete.id}
              {...athlete}
              onView={() => navigate('/athletes')}
            />
          ))}
        </div>
      </section>
    </Layout>
  );
}
