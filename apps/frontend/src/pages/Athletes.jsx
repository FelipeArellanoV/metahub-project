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
  const [athletesList, setAthletesList] = useState(initialAthletes);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newAthlete, setNewAthlete] = useState({ name: '', age: '', consent: true });

  const filteredAthletes = useMemo(() => {
    return athletesList.filter((athlete) =>
      athlete.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [athletesList, search]);

  const handleAddAthlete = (e) => {
    e.preventDefault();
    if (!newAthlete.name.trim()) return;
    
    const initials = newAthlete.name
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'AT';

    const created = {
      id: Date.now(),
      name: newAthlete.name,
      initials,
      age: parseInt(newAthlete.age) || 16,
      lastSession: 'Sin sesiones',
      sessions: 0,
      consent: newAthlete.consent
    };

    setAthletesList([created, ...athletesList]);
    setNewAthlete({ name: '', age: '', consent: true });
    setShowModal(false);
  };

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
          {filteredAthletes.length} atleta(s)
        </span>
      </section>

      {filteredAthletes.length > 0 ? (
        <div className="athletes-grid">
          {filteredAthletes.map((athlete) => (
            <AthleteCard
              key={athlete.id}
              {...athlete}
              onView={() => alert(`Historial biomecánico de ${athlete.name}: 02 sesiones registradas.`)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-card">
          <h3>No encontramos atletas</h3>
          <p>Prueba con otro nombre o agrega uno nuevo.</p>
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
            <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 6px', color: '#1e293b' }}>Registrar Nuevo Atleta</h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px' }}>Ingresa los datos para iniciar el seguimiento biomecánico.</p>

            <form onSubmit={handleAddAthlete}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Nombre completo</label>
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
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Edad (años)</label>
                <input
                  type="number"
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
                  style={{ width: '18px', height: '18px' }}
                />
                <label htmlFor="consentCheck" style={{ fontSize: '13px', color: '#334155', cursor: 'pointer' }}>Consentimiento firmado y vigente</label>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ height: '42px', padding: '0 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  style={{ height: '42px', padding: '0 20px', borderRadius: '10px' }}
                >
                  Guardar Atleta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
