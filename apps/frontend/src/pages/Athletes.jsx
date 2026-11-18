import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Dumbbell,
  FileCheck,
  Filter,
  Flame,
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
import ScopedRoster from '../components/ScopedRoster.jsx';
import ConsentPanel from '../components/ConsentPanel.jsx';
import { AnimatePresence } from 'framer-motion';
import { EASE_OUT, Skeleton, motion } from '../components/Motion.jsx';
import { CATEGORIAS, categoriaPorEdad } from '../services/categoria.js';

const DRAWER_TABS = [
  { id: 'general', label: 'Resumen' },
  { id: 'apoyo', label: 'Apoyo' },
  { id: 'consent', label: 'Consentimiento' }
];

/** Tarjeta de atleta en carga: misma silueta que AthleteCard. Solo visual. */
function AthleteCardSkeleton() {
  return (
    <div className="athlete-row" aria-hidden="true">
      <div className="athlete-row-main">
        <Skeleton width={44} height={44} radius={999} />
        <div className="mh-skeleton-stack" style={{ flex: 1 }}>
          <Skeleton width="62%" height={15} />
          <Skeleton width="45%" height={11} />
        </div>
        <Skeleton width={40} height={28} radius={8} />
      </div>
    </div>
  );
}


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
    school: '',
    guardian: '',
    phone: '',
    consent: false
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
        age: a.age ?? null,
        category: a.category || categoriaPorEdad(a.age),
        lastIptScore: a.lastIptScore ?? null,
        school: a.organizationName || a.school || 'Sin registrar',
        lastSession: a.lastIptScore ? `IPT: ${a.lastIptScore} pts` : 'Sin sesiones',
        sessions: a.sessionCount || 0,
        consent: a.consent === true,
        consentDate: a.consentDate || null,
        guardian: a.guardianName || null,
        phone: a.guardianPhone || null,
        needsSupport: a.lastIptScore !== null && a.lastIptScore !== undefined && a.lastIptScore < 75,
        supportReason: a.lastIptScore !== null && a.lastIptScore !== undefined && a.lastIptScore < 75 ? `IPT bajo umbral (${a.lastIptScore} pts)` : 'Técnica en rango normal',
        notes: a.hasAccount ? 'Cuenta de estudiante activa' : 'Sin cuenta vinculada',
        hasAccount: a.hasAccount
      }));
      setAthletesList(mapped);
    } catch (err) {
      setAthletesList([]);
      setErrorMsg(err.message || 'Error cargando atletas');
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
    if (!newAthlete.school.trim()) { setErrorMsg('Indica el club o establecimiento del atleta.'); return; }
    const age = parseInt(newAthlete.age, 10);
    if (!Number.isInteger(age) || age < 4 || age > 100) { setErrorMsg('Indica una edad válida.'); return; }
    // Ley 19.628 / 21.719: el consentimiento de un menor lo firma su apoderado o tutor legal.
    if (newAthlete.consent && age < 18 && newAthlete.guardian.trim().length < 3) {
      setErrorMsg('Para registrar el consentimiento de un menor indica el nombre del apoderado que lo firmó.');
      return;
    }
    if (enableAccount && accountPassword.trim().length < 8) { setErrorMsg('La contraseña temporal debe tener al menos 8 caracteres.'); return; }
    setErrorMsg('');

    try {
      const payload = {
        name: newAthlete.name.trim(),
        age,
        organizationName: newAthlete.school.trim(),
        consentStatus: newAthlete.consent ? 'vigente' : 'pendiente'
      };
      if (newAthlete.consent && newAthlete.guardian.trim()) payload.guardianName = newAthlete.guardian.trim();
      if (newAthlete.consent && newAthlete.phone.trim()) payload.guardianPhone = newAthlete.phone.trim();

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
        school: '',
        guardian: '',
        phone: '',
        consent: false
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
        eyebrow="EQUIPO"
        title="Atletas"
        description="Fichas, consentimiento del apoderado y planes de refuerzo."
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
      <div className="athletes-toolbar">
        <label className="mh-search">
          <Search size={17} aria-hidden="true" />
          <span className="mh-visually-hidden">Buscar atleta</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre o club"
          />
        </label>
        <div className="filter-pills-bar" role="group" aria-label="Filtrar por categoría">
          {['Todas', ...CATEGORIAS, 'Apoyo'].map((cat) => (
            <button
              key={cat}
              type="button"
              className={`filter-pill ${categoryFilter === cat ? 'active' : ''}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {/* Mientras carga no se muestran contadores en 0 que no son reales */}
              {cat === 'Todas'
                ? `Todos${loading ? '' : ` (${athletesList.length})`}`
                : cat === 'Apoyo'
                ? `Requieren apoyo${loading ? '' : ` (${athletesList.filter((a) => a.needsSupport).length})`}`
                : `${cat}${loading ? '' : ` (${athletesList.filter((a) => a.category === cat).length})`}`}
            </button>
          ))}
        </div>
      </div>

      {/* ATHLETES GRID */}
      {loading ? (
        <div className="athletes-grid" role="status" aria-busy="true">
          <span className="mh-visually-hidden">Cargando atletas desde la base de datos...</span>
          {[0, 1, 2].map(i => <AthleteCardSkeleton key={i} />)}
        </div>
      ) : filteredAthletes.length > 0 ? (
        <motion.div className="athletes-grid" layout="position">
          <AnimatePresence mode="popLayout" initial={true}>
            {filteredAthletes.map((athlete, i) => (
              <motion.div
                key={athlete.id}
                className="mh-grid-item"
                layout="position"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.34, ease: EASE_OUT, delay: Math.min(i, 6) * 0.05 } }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.16 } }}
              >
                <AthleteCard {...athlete} onView={() => setSelectedAthlete(athlete)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <motion.div className="empty-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h3>No encontramos atletas</h3>
          <p>{athletesList.length ? 'Ningún atleta coincide con el filtro o la búsqueda.' : 'Aún no hay atletas registrados. Usa "Inscribir atleta" para comenzar.'}</p>
        </motion.div>
      )}

      <details className="mh-club-details">
        <summary>Atletas de mis clubes <small>solo lectura</small></summary>
        <ScopedRoster embedded clubOnly mode="club" />
      </details>

      {/* ATHLETE DETAIL DRAWER */}
      <AnimatePresence>
      {selectedAthlete && (
        <motion.div key="drawer" className="drawer-backdrop mh-motion" onClick={() => setSelectedAthlete(null)}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2, delay: 0.05 } }}
          transition={{ duration: 0.2 }}>
          <motion.div className="drawer-panel mh-motion" onClick={(e) => e.stopPropagation()}
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: EASE_OUT }}>
            <div className="drawer-header">
              <div className="drawer-identity">
                <div className="athlete-avatar-circle">{selectedAthlete.initials}</div>
                <div>
                  <h3>{selectedAthlete.name}</h3>
                  <span>{[selectedAthlete.age != null ? selectedAthlete.age + ' años' : null, selectedAthlete.category, selectedAthlete.school].filter(Boolean).join(' · ')}</span>
                </div>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Cerrar ficha"
                onClick={() => setSelectedAthlete(null)}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            {/* DRAWER TABS: el subrayado de la pestaña activa aparece con scaleX y opacidad */}
            <div className="drawer-tabs-bar">
              {DRAWER_TABS.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  className={`drawer-tab-btn mh-motion-tab ${activeDrawerTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveDrawerTab(tab.id)}
                >
                  {tab.label}
                  {/* Sin layoutId: dentro de un AnimatePresence que sale, layoutId impide desmontar el drawer. */}
                  <motion.span className="mh-tab-underline" aria-hidden="true" initial={false}
                    animate={{ opacity: activeDrawerTab === tab.id ? 1 : 0, scaleX: activeDrawerTab === tab.id ? 1 : 0.3 }}
                    transition={{ duration: 0.22, ease: EASE_OUT }} />
                </button>
              ))}
            </div>

            <div className="drawer-content">
              <AnimatePresence mode="wait" initial={false}>
              <motion.div key={activeDrawerTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }} transition={{ duration: 0.22, ease: EASE_OUT }}>
              {activeDrawerTab === 'general' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ background: 'var(--surface-raised)', padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 800 }}>EDAD</span>
                      <strong style={{ display: 'block', fontSize: 14, color: 'var(--navy)' }}>
                        {selectedAthlete.age != null ? selectedAthlete.age + ' años' : 'Sin registrar'}
                      </strong>
                    </div>
                    <div style={{ background: 'var(--surface-raised)', padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 800 }}>CATEGORÍA</span>
                      <strong style={{ display: 'block', fontSize: 14, color: 'var(--blue)' }}>
                        {selectedAthlete.category || 'Sin registrar'}
                      </strong>
                    </div>
                  </div>

                  <div style={{ background: 'var(--surface-raised)', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 800 }}>ESTABLECIMIENTO ESCOLAR</span>
                    <strong style={{ display: 'block', fontSize: 14, color: 'var(--navy)', marginTop: 2 }}>
                      {selectedAthlete.school}
                    </strong>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ background: 'var(--surface-raised)', padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 800 }}>SESIONES REALIZADAS</span>
                      <strong style={{ display: 'block', fontSize: 15, color: 'var(--navy)' }}>
                        {selectedAthlete.sessions} sesiones
                      </strong>
                    </div>
                    <div style={{ background: 'var(--surface-raised)', padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 800 }}>ÚLTIMA TOMA</span>
                      <strong style={{ display: 'block', fontSize: 13, color: 'var(--navy)' }}>
                        {selectedAthlete.lastSession}
                      </strong>
                    </div>
                  </div>

                  <div>
                    <h5 style={{ fontSize: 12, fontWeight: 800, color: 'var(--navy)', margin: '10px 0 6px' }}>
                      Notas de Seguimiento del Entrenador
                    </h5>
                    <p style={{ fontSize: 12, color: 'var(--muted)', background: 'var(--surface-raised)', padding: 12, borderRadius: 8, margin: 0, lineHeight: 1.4 }}>
                      "{selectedAthlete.notes}"
                    </p>
                  </div>
                </div>
              )}

              {activeDrawerTab === 'apoyo' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div
                    style={{
                      background: selectedAthlete.needsSupport ? 'var(--warning-bg)' : 'var(--success-bg)',
                      border: `1px solid ${selectedAthlete.needsSupport ? 'var(--border)' : 'var(--border)'}`,
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
                      <strong style={{ fontSize: 14, color: selectedAthlete.needsSupport ? 'var(--warning-text)' : 'var(--success-text)' }}>
                        {selectedAthlete.needsSupport ? 'Requiere Atención Técnica' : 'Técnica en Rango Óptimo'}
                      </strong>
                    </div>
                    <p style={{ fontSize: 12, color: selectedAthlete.needsSupport ? 'var(--warning-text)' : 'var(--success-text)', margin: 0, lineHeight: 1.4 }}>
                      {selectedAthlete.supportReason}
                    </p>
                  </div>

                  <h5 style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)', margin: '8px 0 4px' }}>
                    Plan de Intervención Recomendado
                  </h5>
                  <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
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
                <ConsentPanel
                  athlete={selectedAthlete}
                  onChanged={granted => {
                    setSelectedAthlete(prev => (prev ? { ...prev, consent: granted } : prev));
                    loadAthletes();
                  }}
                />
              )}
              </motion.div>
              </AnimatePresence>
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
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* MODAL AGREGAR ATLETA */}
      <AnimatePresence>
      {showAddModal && (
        <motion.div key="modal" className="modal-overlay" onClick={() => setShowAddModal(false)}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <motion.div className="modal-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true"
            initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98, transition: { duration: 0.16 } }}
            transition={{ duration: 0.3, ease: EASE_OUT }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--navy)' }}>
                  Inscribir Nuevo Atleta Escolar
                </h3>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
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
                    <label>Categoría (según edad)</label>
                    <output className="form-control mh-derived" aria-live="polite">
                      {categoriaPorEdad(newAthlete.age) || 'Indica la edad'}
                    </output>
                  </div>
                </div>

                <div className="form-group">
                  <label>Club o establecimiento *</label>
                  <input
                    type="text"
                    className="form-control"
                    required maxLength={160}
                    value={newAthlete.school}
                    onChange={(e) => setNewAthlete({ ...newAthlete, school: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label>Nombre Apoderado{newAthlete.consent && parseInt(newAthlete.age, 10) < 18 ? ' *' : ''}</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej. Marcela Morales"
                      required={newAthlete.consent && parseInt(newAthlete.age, 10) < 18}
                      minLength={3}
                      maxLength={120}
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
                  <label htmlFor="consentToggle" style={{ fontSize: 12, color: 'var(--text)', cursor: 'pointer', margin: 0 }}>
                    Consentimiento informado escolar firmado por el apoderado
                  </label>
                </div>

                <AnimatePresence initial={false}>
                {errorMsg && (
                  <motion.div key={errorMsg} role="alert" style={{ padding: '8px 12px', background: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: 8, fontSize: 12, marginTop: 10 }}
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0, x: [0, -5, 4, -2, 0] }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, x: { duration: 0.32 } }}>
                    {errorMsg}
                  </motion.div>
                )}
                </AnimatePresence>

                <div style={{ marginTop: 12, padding: 12, background: 'var(--surface-raised)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="checkbox"
                      id="enableAccountToggle"
                      checked={enableAccount}
                      disabled={!newAthlete.consent}
                      onChange={(e) => setEnableAccount(e.target.checked)}
                      style={{ width: 16, height: 16, cursor: 'pointer' }}
                    />
                    <label htmlFor="enableAccountToggle" style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', cursor: 'pointer', margin: 0 }}>
                      Habilitar credenciales de acceso para el estudiante (Portal Móvil)
                    </label>
                  </div>
                  {!newAthlete.consent && (
                    <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginTop: 4 }}>
                      * Requiere consentimiento informado vigente
                    </span>
                  )}
                  {enableAccount && newAthlete.consent && (
                    <motion.div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}
                      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
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
                        <label style={{ fontSize: 11 }}>Contraseña temporal (mín 8 car.) *</label>
                        <input
                          type="password"
                          required={enableAccount}
                          minLength={8}
                          maxLength={128}
                          className="form-control"
                          placeholder="••••••••"
                          value={accountPassword}
                          onChange={(e) => setAccountPassword(e.target.value)}
                        />
                      </div>
                    </motion.div>
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
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </Layout>
  );
}
