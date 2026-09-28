import {
  Activity,
  CalendarDays,
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

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <Layout>
      <PageHeader
        eyebrow="PANEL DE ENTRENADOR"
        title="Hola, Felipe 👋"
        description="Revisa el progreso de tus atletas y registra nuevas sesiones."
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
          value="3"
          detail="bajo seguimiento"
        />
        <StatCard
          icon={Video}
          label="Sesiones"
          value="14"
          detail="registradas"
        />
        <StatCard
          icon={Activity}
          label="Análisis"
          value="12"
          detail="completados"
        />
        <StatCard
          icon={CalendarDays}
          label="Esta semana"
          value="4"
          detail="nuevas sesiones"
        />
      </section>

      <section className="highlight-card">
        <div className="highlight-icon">
          <Sparkles size={24} />
        </div>

        <div>
          <span className="eyebrow blue">SEGUIMIENTO LONGITUDINAL</span>
          <h2>Convierte cada carrera en una historia de evolución.</h2>
          <p>
            MetaHub organiza las métricas biomecánicas de cada sesión
            para visualizar cambios técnicos en el tiempo.
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
            Ver todos
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
