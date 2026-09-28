import { Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  AthleteCard,
  Layout,
  PageHeader
} from '../components/UI.jsx';

const initialAthletes = [
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
  },
  {
    id: 4,
    name: 'Antonia Pérez',
    initials: 'AP',
    age: 15,
    lastSession: '20 Sep 2026',
    sessions: 3,
    consent: true
  }
];

export default function Athletes() {
  const [search, setSearch] = useState('');

  const filteredAthletes = useMemo(() => {
    return initialAthletes.filter((athlete) =>
      athlete.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  return (
    <Layout>
      <PageHeader
        eyebrow="GESTIÓN DE ATLETAS"
        title="Mis atletas"
        description="Consulta el estado de seguimiento y consentimiento de cada atleta."
        action={
          <button
            className="primary-button"
            type="button"
            onClick={() => alert('El formulario para agregar atletas se implementará con el backend.')}
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
          {filteredAthletes.length} atleta(s)
        </span>
      </section>

      {filteredAthletes.length > 0 ? (
        <div className="athletes-grid">
          {filteredAthletes.map((athlete) => (
            <AthleteCard
              key={athlete.id}
              {...athlete}
              onView={() => alert(`Próximamente: historial de ${athlete.name}`)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-card">
          <h3>No encontramos atletas</h3>
          <p>Prueba con otro nombre.</p>
        </div>
      )}
    </Layout>
  );
}
