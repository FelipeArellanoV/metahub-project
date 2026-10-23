import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Dumbbell,
  FileCheck,
  Filter,
  Flame,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  User,
  X
} from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AthleteCard,
  Layout,
  PageHeader
} from '../components/UI.jsx';
import api from '../services/api.js';

const initialAthletes = [
  {
    id: 1,
    name: 'Martín Atleta',
    initials: 'MA',
    age: 15,
    category: 'Sub-16',
    school: 'Liceo Deportivo Temuco',
    lastSession: '26 Sep 2026',
    sessions: 8,
    consent: true,
    consentDate: '12 Mar 2026',
    guardian: 'Carlos Atleta (Padre)',
    phone: '+56 9 8765 4321',
    needsSupport: true,
    supportReason: 'Flexión de rodilla limitada (24,2° vs 28°) y caída de cadera.',
    notes: 'Requiere énfasis en skipping alto con vallas bajas.'
  },
  {
    id: 2,
    name: 'Javiera Soto',
    initials: 'JS',
    age: 16,
    category: 'Sub-18',
    school: 'Liceo Pablo Neruda',
    lastSession: '24 Sep 2026',
    sessions: 6,
    consent: true,
    consentDate: '18 Mar 2026',
    guardian: 'Elena Soto (Madre)',
    phone: '+56 9 7654 3210',
    needsSupport: false,
    supportReason: 'Técnica balanceada, en observación por resistencia a la fatiga.',
    notes: 'Excelente respuesta en salidas de tacos.'
  },
  {
    id: 3,
    name: 'Tomás Muñoz',
    initials: 'TM',
    age: 14,
    category: 'Sub-14',
    school: 'Instituto Claret',
    lastSession: 'Sin sesiones',
    sessions: 0,
    consent: false,
    consentDate: 'Pendiente de entrega',
    guardian: 'Marcela Muñoz (Madre)',
    phone: '+56 9 6543 2109',
    needsSupport: true,
    supportReason: 'Inclinación excesiva de tronco en aceleración.',
    notes: 'Requiere firma de apoderado antes de la primera captura en video.'
  },
  {
    id: 4,
    name: 'Antonia Pérez',
    initials: 'AP',
    age: 15,
    category: 'Sub-14',
    school: 'Colegio Metodista',
    lastSession: '20 Sep 2026',
    sessions: 3,
    consent: true,
    consentDate: '05 Abr 2026',
    guardian: 'Roberto Pérez (Padre)',
    phone: '+56 9 5432 1098',
    needsSupport: true,
    supportReason: 'Asimetría marcada en zancada izq/der (14,8%).',
    notes: 'Trabajo unilateral en tobillo y cadera izquierda asignado.'
  }
];

export default function Athletes() {
  const navigate = useNavigate();
  const [athletesList, setAthletesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [enableAccount, setEnableAccount] = useState(false);
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState('general');

  const [newAthlete, setNewAthlete] = useState({
    name: '',
    age: '15',
    category: 'Sub-16',
    school: 'Colegio Regional Temuco',
    guardian: '',
    phone: '',
    consent: true
  });

  const loadAthletes = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await api.athletes.getAll();
      const mapped = data.map((a) => ({
        id: a.id,
        name: a.name,
        initials: (a.name || 'AT').split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase(),
        age: a.age || 15,
        category: a.category || 'Sub-16',
        school: a.school || 'Liceo Regional',
        lastSession: a.lastIptScore ? `IPT: ${a.lastIptScore} pts` : 'Sin sesiones',
        sessions: a.sessionCount || 0,
        consent: a.consentStatus === 'vigente',
        consentDate: a.consentDate || 'Registrado',
        guardian: a.guardianName || 'Apoderado registrado',
        phone: a.guardianPhone || '+56 9 0000 0000',
        needsSupport: a.lastIptScore !== null && a.lastIptScore !== undefined && a.lastIptScore < 75,
        supportReason: a.lastIptScore !== null && a.lastIptScore !== undefined && a.lastIptScore < 75 ? `IPT bajo umbral (${a.lastIptScore} pts)` : 'Técnica en rango normal',
        notes: a.hasAccount ? 'Cuenta de estudiante activa' : 'Sin cuenta vinculada',
        hasAccount: a.hasAccount
      }));
      setAthletesList(mapped);
    } catch (err) {
      if (typeof window !== 'undefined' && window.location.search.includes('demo=1')) {
        setAthletesList(initialAthletes);
      } else {
        setErrorMsg(err.message || 'Error cargando atletas');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAthletes();
  }, []);

  const filteredAthletes = useMemo(() => {
    return athletesList.filter((athlete) => {
      const matchSearch =
        athlete.name.toLowerCase().includes(search.toLowerCase()) ||
        athlete.school.toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;

      if (categoryFilter === 'Todas') return true;
      if (categoryFilter === 'Apoyo') return athlete.needsSupport;
      return athlete.category === categoryFilter;
    });
  }, [athletesList, search, categoryFilter]);

  const handleAddAthlete = async (e) => {
    e.preventDefault();
    if (!newAthlete.name.trim()) return;
    setErrorMsg('');

    try {
      const payload = {
        name: newAthlete.name.trim(),
        age: parseInt(newAthlete.age, 10) || 15,
        category: newAthlete.category,
        school: newAthlete.school.trim(),
        guardianName: newAthlete.guardian.trim() || 'Apoderado no registrado',
        guardianPhone: newAthlete.phone.trim() || '+56 9 0000 0000',
        consentStatus: newAthlete.consent ? 'vigente' : 'pendiente',
        consentDate: newAthlete.consent ? new Date().toISOString().split('T')[0] : null
      };

      if (enableAccount && accountEmail.trim() && accountPassword.trim()) {
        payload.account = {
          email: accountEmail.trim(),
          password: accountPassword.trim()
        };
      }

      await api.athletes.create(payload);
      await loadAthletes();
      setShowAddModal(false);
      setNewAthlete({
        name: '',
        age: '15',
        category: 'Sub-16',
        school: 'Colegio Regional Temuco',
        guardian: '',
        phone: '',
        consent: true
      });
      setEnableAccount(false);
      setAccountEmail('');
      setAccountPassword('');
    } catch (err) {
      setErrorMsg(err.message || 'Error guardando atleta');
    }
  };

  return (
    <Layout>
      <PageHeader
        eyebrow="GESTIÓN DE ATLETAS ESCOLARES"
        title="Roster del Equipo"
        description="Fichas deportivas, estado de consentimiento parental y asignación de planes de refuerzo."
        action={
          <button
            className="primary-button"
            type="button"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={18} />
            Inscribir atleta
          </button>
        }
      />

      {/* FILTER PILLS & SEARCH TOOLBAR */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 20
        }}
      >
        <div className="filter-pills-bar">
          {['Todas', 'Sub-14', 'Sub-16', 'Sub-18', 'Apoyo'].map((cat) => (
            <button
              key={cat}
              type="button"
              className={`filter-pill ${categoryFilter === cat ? 'active' : ''}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat === 'Todas'
                ? `Todos (${athletesList.length})`
                : cat === 'Apoyo'
                ? `⚡ Requieren apoyo (${athletesList.filter((a) => a.needsSupport).length})`
                : `${cat} (${athletesList.filter((a) => a.category === cat).length})`}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: 260 }}>
          <Search
            size={16}
            color="#94a3b8"
            style={{ position: 'absolute', left: 12, top: 12 }}
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre o colegio..."
            className="form-control"
            style={{ height: 38, paddingLeft: 36, fontSize: 12 }}
          />
        </div>
      </div>

      {/* ATHLETES GRID */}
      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
          <p style={{ fontWeight: 600 }}>Cargando atletas desde la base de datos...</p>
        </div>
      ) : filteredAthletes.length > 0 ? (
        <div className="athletes-grid">
          {filteredAthletes.map((athlete) => (
            <AthleteCard
              key={athlete.id}
              {...athlete}
              onView={() => setSelectedAthlete(athlete)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-card">
          <h3>No encontramos atletas</h3>
          <p>Aún no hay atletas registrados. Haz clic en "Inscribir atleta" para comenzar.</p>
        </div>
      )}

      {/* ATHLETE DETAIL DRAWER */}
      {selectedAthlete && (
        <div className="drawer-backdrop" onClick={() => setSelectedAthlete(null)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="athlete-avatar-circle" style={{ width: 44, height: 44 }}>
                  {selectedAthlete.initials}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#10283f' }}>
                    {selectedAthlete.name}
                  </h3>
                  <span style={{ fontSize: 12, color: '#7b8798' }}>
                    {selectedAthlete.category} · {selectedAthlete.school}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setSelectedAthlete(null)}
              >
                <X size={20} />
              </button>
            </div>

            {/* DRAWER TABS */}
            <div className="drawer-tabs-bar">
              <button
                type="button"
                className={`drawer-tab-btn ${activeDrawerTab === 'general' ? 'active' : ''}`}
                onClick={() => setActiveDrawerTab('general')}
              >
                Ficha General
              </button>
              <button
                type="button"
                className={`drawer-tab-btn ${activeDrawerTab === 'apoyo' ? 'active' : ''}`}
                onClick={() => setActiveDrawerTab('apoyo')}
              >
                Apoyo Biomecánico
              </button>
              <button
                type="button"
                className={`drawer-tab-btn ${activeDrawerTab === 'consent' ? 'active' : ''}`}
                onClick={() => setActiveDrawerTab('consent')}
              >
                Consentimiento Ético
              </button>
            </div>

            <div className="drawer-content">
              {activeDrawerTab === 'general' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: 10, color: '#7b8798', fontWeight: 800 }}>EDAD</span>
                      <strong style={{ display: 'block', fontSize: 14, color: '#10283f' }}>
                        {selectedAthlete.age} años
                      </strong>
                    </div>
                    <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: 10, color: '#7b8798', fontWeight: 800 }}>CATEGORÍA</span>
                      <strong style={{ display: 'block', fontSize: 14, color: '#2474d2' }}>
                        {selectedAthlete.category}
                      </strong>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: 10, color: '#7b8798', fontWeight: 800 }}>ESTABLECIMIENTO ESCOLAR</span>
                    <strong style={{ display: 'block', fontSize: 14, color: '#10283f', marginTop: 2 }}>
                      {selectedAthlete.school}
                    </strong>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: 10, color: '#7b8798', fontWeight: 800 }}>SESIONES REALIZADAS</span>
                      <strong style={{ display: 'block', fontSize: 15, color: '#10283f' }}>
                        {selectedAthlete.sessions} sesiones
                      </strong>
                    </div>
                    <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: 10, color: '#7b8798', fontWeight: 800 }}>ÚLTIMA TOMA</span>
                      <strong style={{ display: 'block', fontSize: 13, color: '#10283f' }}>
                        {selectedAthlete.lastSession}
                      </strong>
                    </div>
                  </div>

                  <div>
                    <h5 style={{ fontSize: 12, fontWeight: 800, color: '#10283f', margin: '10px 0 6px' }}>
                      Notas de Seguimiento del Entrenador
                    </h5>
                    <p style={{ fontSize: 12, color: '#475569', background: '#f1f5f9', padding: 12, borderRadius: 8, margin: 0, lineHeight: 1.4 }}>
                      "{selectedAthlete.notes}"
                    </p>
                  </div>
                </div>
              )}

              {activeDrawerTab === 'apoyo' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div
                    style={{
                      background: selectedAthlete.needsSupport ? '#fff5dc' : '#e9f8f1',
                      border: `1px solid ${selectedAthlete.needsSupport ? '#ffe399' : '#b7ebcf'}`,
                      borderRadius: 12,
                      padding: 16
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      {selectedAthlete.needsSupport ? (
                        <Flame size={18} color="#d69b2b" />
                      ) : (
                        <CheckCircle2 size={18} color="#1c9b69" />
                      )}
                      <strong style={{ fontSize: 14, color: selectedAthlete.needsSupport ? '#925c04' : '#116945' }}>
                        {selectedAthlete.needsSupport ? 'Requiere Atención Técnica' : 'Técnica en Rango Óptimo'}
                      </strong>
                    </div>
                    <p style={{ fontSize: 12, color: selectedAthlete.needsSupport ? '#784d07' : '#0c5236', margin: 0, lineHeight: 1.4 }}>
                      {selectedAthlete.supportReason}
                    </p>
                  </div>

                  <h5 style={{ fontSize: 13, fontWeight: 800, color: '#10283f', margin: '8px 0 4px' }}>
                    Plan de Intervención Recomendado
                  </h5>
                  <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                    Puedes agendar directamente una sesión de refuerzo en el calendario para trabajar estos puntos.
                  </p>

                  <button
                    type="button"
                    className="primary-button"
                    style={{ width: '100%', marginTop: 8 }}
                    onClick={() => {
                      setSelectedAthlete(null);
                      navigate('/priority');
                    }}
                  >
                    <Dumbbell size={16} />
                    Ver ficha en módulo de apoyo
                  </button>
                </div>
              )}

              {activeDrawerTab === 'consent' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div
                    style={{
                      background: selectedAthlete.consent ? '#e9f8f1' : '#fff5dc',
                      border: `1px solid ${selectedAthlete.consent ? '#b7ebcf' : '#ffe399'}`,
                      borderRadius: 12,
                      padding: 16
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <ShieldCheck size={20} color={selectedAthlete.consent ? '#1c9b69' : '#d69b2b'} />
                      <strong style={{ fontSize: 14, color: selectedAthlete.consent ? '#116945' : '#925c04' }}>
                        {selectedAthlete.consent ? 'Consentimiento Parental Vigente' : 'Consentimiento Pendiente'}
                      </strong>
                    </div>
                    <span style={{ fontSize: 12, color: '#475569', display: 'block' }}>
                      Fecha de registro: <strong>{selectedAthlete.consentDate}</strong>
                    </span>
                  </div>

                  <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: 10, color: '#7b8798', fontWeight: 800 }}>APODERADO / TUTOR LEGAL</span>
                    <strong style={{ display: 'block', fontSize: 14, color: '#10283f', marginTop: 2 }}>
                      {selectedAthlete.guardian}
                    </strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#2474d2', marginTop: 6 }}>
                      <Phone size={13} /> {selectedAthlete.phone}
                    </div>
                  </div>

                  <div style={{ fontSize: 11, color: '#7b8798', lineHeight: 1.4, padding: '0 4px' }}>
                    * El consentimiento informado escolar es obligatorio de acuerdo al protocolo del Comité de Ética de la Universidad Católica de Temuco previo a la captura de video de menores.
                  </div>
                </div>
              )}
            </div>

            <div className="drawer-footer">
              <button
                type="button"
                className="btn-outline-sm"
                onClick={() => setSelectedAthlete(null)}
              >
                Cerrar
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setSelectedAthlete(null);
                  navigate('/calendar');
                }}
              >
                <Calendar size={16} />
                Planificar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR ATLETA */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#10283f' }}>
                  Inscribir Nuevo Atleta Escolar
                </h3>
                <span style={{ fontSize: 12, color: '#7b8798' }}>
                  Ingresa los antecedentes para el seguimiento longitudinal
                </span>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowAddModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddAthlete}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nombre y Apellido *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="Ej. Francisca Rivas"
                    value={newAthlete.name}
                    onChange={(e) => setNewAthlete({ ...newAthlete, name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label>Edad (Años) *</label>
                    <input
                      type="number"
                      required
                      min="10"
                      max="19"
                      className="form-control"
                      value={newAthlete.age}
                      onChange={(e) => setNewAthlete({ ...newAthlete, age: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Categoría Escolar</label>
                    <select
                      className="form-control"
                      value={newAthlete.category}
                      onChange={(e) => setNewAthlete({ ...newAthlete, category: e.target.value })}
                    >
                      <option value="Sub-14">Sub-14</option>
                      <option value="Sub-16">Sub-16</option>
                      <option value="Sub-18">Sub-18</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Colegio / Institución Educativa</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newAthlete.school}
                    onChange={(e) => setNewAthlete({ ...newAthlete, school: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label>Nombre Apoderado</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej. Marcela Morales"
                      value={newAthlete.guardian}
                      onChange={(e) => setNewAthlete({ ...newAthlete, guardian: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Teléfono Apoderado</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="+56 9 1234 5678"
                      value={newAthlete.phone}
                      onChange={(e) => setNewAthlete({ ...newAthlete, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  <input
                    type="checkbox"
                    id="consentToggle"
                    checked={newAthlete.consent}
                    onChange={(e) => setNewAthlete({ ...newAthlete, consent: e.target.checked })}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                  <label htmlFor="consentToggle" style={{ fontSize: 12, color: '#334155', cursor: 'pointer', margin: 0 }}>
                    Consentimiento informado escolar firmado por el apoderado
                  </label>
                </div>

                {errorMsg && (
                  <div style={{ padding: '8px 12px', background: '#fff1f2', color: '#9f1239', borderRadius: 8, fontSize: 12, marginTop: 10 }}>
                    {errorMsg}
                  </div>
                )}

                <div style={{ marginTop: 12, padding: 12, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="checkbox"
                      id="enableAccountToggle"
                      checked={enableAccount}
                      disabled={!newAthlete.consent}
                      onChange={(e) => setEnableAccount(e.target.checked)}
                      style={{ width: 16, height: 16, cursor: 'pointer' }}
                    />
                    <label htmlFor="enableAccountToggle" style={{ fontSize: 12, fontWeight: 700, color: '#10283f', cursor: 'pointer', margin: 0 }}>
                      Habilitar credenciales de acceso para el estudiante (Portal Móvil)
                    </label>
                  </div>
                  {!newAthlete.consent && (
                    <span style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginTop: 4 }}>
                      * Requiere consentimiento informado vigente
                    </span>
                  )}
                  {enableAccount && newAthlete.consent && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: 11 }}>Correo del estudiante/apoderado *</label>
                        <input
                          type="email"
                          required={enableAccount}
                          className="form-control"
                          placeholder="estudiante@uct.cl"
                          value={accountEmail}
                          onChange={(e) => setAccountEmail(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: 11 }}>Contraseña temporal (mín 6 car.) *</label>
                        <input
                          type="password"
                          required={enableAccount}
                          minLength={6}
                          className="form-control"
                          placeholder="••••••••"
                          value={accountPassword}
                          onChange={(e) => setAccountPassword(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-outline-sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="primary-button">
                  Guardar atleta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
