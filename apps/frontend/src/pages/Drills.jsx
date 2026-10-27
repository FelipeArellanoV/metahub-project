import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Dumbbell,
  Filter,
  Flame,
  Plus,
  Search,
  Sparkles,
  UserCheck,
  X
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Layout, PageHeader } from '../components/UI.jsx';
import api from '../services/api.js';
import { saveCollaboration } from '../services/collaboration.js';

const initialDrills = [
  {
    id: 'D-01',
    name: 'Skipping A sobre Vallas Bajas (40cm)',
    category: 'Recobro de Rodilla',
    difficulty: 'intermedio',
    difficultyLabel: 'Intermedio',
    goal: 'Aumentar el ángulo de flexión de rodilla en fase de vuelo y forzar un ataque activo del pie.',
    execution: 'Colocar 6 vallas a 1.20m de distancia. Pasar con elevación rápida de rodilla a 90°, manteniendo el tobillo en flexión dorsal.',
    commonErrors: 'Echar el tronco hacia atrás para compensar falta de fuerza en el psoas.',
    dosing: '4 series x 6 vallas con pausa completa (1:30 min).',
    recommendedFor: []
  },
  {
    id: 'D-02',
    name: 'Trabajo Propioceptivo en Tobillo Unipodal',
    category: 'Simetría & Tobillo',
    difficulty: 'iniciacion',
    difficultyLabel: 'Iniciación',
    goal: 'Corregir asimetrías de apoyo lateral y reforzar los estabilizadores del tobillo.',
    execution: 'Apoyo monopodal sobre superficie inestable (bosu o colchoneta). Mantener equilibrio 20 segundos realizando círculos con brazos.',
    commonErrors: 'Bloquear la rodilla o colapsar el arco plantar medial.',
    dosing: '3 series x 25 seg por pierna.',
    recommendedFor: []
  },
  {
    id: 'D-03',
    name: 'Salidas Asistidas con Inclinación a 45°',
    category: 'Postura & Tronco',
    difficulty: 'intermedio',
    difficultyLabel: 'Intermedio',
    goal: 'Enseñar la línea de fuerza extendida desde el tobillo hasta la coronilla en los primeros 15 metros.',
    execution: 'El atleta se deja caer hacia adelante manteniendo el cuerpo recto hasta que el compañero libera la resistencia.',
    commonErrors: 'Flexionar la cintura antes del despegue, perdiendo alineación.',
    dosing: '5 salidas de 15 metros.',
    recommendedFor: []
  },
  {
    id: 'D-04',
    name: 'Zancadas Reactivas en Gradas',
    category: 'Impulso & Extensión',
    difficulty: 'avanzado',
    difficultyLabel: 'Avanzado',
    goal: 'Desarrollar la potencia del glúteo mayor y la triple extensión (tobillo, rodilla y cadera).',
    execution: 'Subir gradas de 2 en 2 con empuje explosivo de la pierna trasera, minimizando el tiempo de contacto.',
    commonErrors: 'Mirar al suelo o apoyar únicamente los dedos del pie.',
    dosing: '4 repeticiones de 12 gradas.',
    recommendedFor: []
  },
  {
    id: 'D-05',
    name: 'Carrera Resistida con Arnés Elástico',
    category: 'Impulso & Extensión',
    difficulty: 'intermedio',
    difficultyLabel: 'Intermedio',
    goal: 'Consolidar la postura de aceleración con resistencia constante.',
    execution: 'Sprints de 20 metros con goma elástica tensionada por el entrenador.',
    commonErrors: 'Pasos excesivamente largos (overstriding) por exceso de resistencia.',
    dosing: '4 pasadas de 20 metros.',
    recommendedFor: []
  },
  {
    id: 'D-06',
    name: 'Bote de Tobillo Continuo (Pogo Jumps)',
    category: 'Simetría & Tobillo',
    difficulty: 'iniciacion',
    difficultyLabel: 'Iniciación',
    goal: 'Mejorar la rigidez tendinosa (stiffness) del tendón de Aquiles y la reactividad articular.',
    execution: 'Saltos verticales cortos usando casi exclusivamente la articulación del tobillo con piernas casi rectas.',
    commonErrors: 'Doblar excesivamente las rodillas disipando la energía elástica.',
    dosing: '3 series de 20 botes rápidos.',
    recommendedFor: []
  }
];

export default function Drills() {
  const [drills, setDrills] = useState(initialDrills);
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [search, setSearch] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [targetDrill, setTargetDrill] = useState(null);
  const [selectedAthlete, setSelectedAthlete] = useState('');
  const [ownedAthletes, setOwnedAthletes] = useState([]);
  const [scopeError, setScopeError] = useState('');
  const [assignBusy, setAssignBusy] = useState(false);
  const assignment = useRef({signature:'',requestId:''});
  const sending = useRef(false);
  useEffect(() => {
    let alive=true;
    api.athletes.getAll().then(rows=>{if(alive){setOwnedAthletes(rows);setSelectedAthlete(rows[0]?String(rows[0].id):'');}})
      .catch(err=>{if(alive){setOwnedAthletes([]);setScopeError(err.message);}});
    return ()=>{alive=false;};
  }, []);
  const [assignedFrequency, setAssignedFrequency] = useState('2 veces por semana');

  const filtered = useMemo(() => {
    return drills.filter((d) => {
      const matchCategory = categoryFilter === 'Todas' || d.category === categoryFilter;
      const matchSearch =
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.goal.toLowerCase().includes(search.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [drills, categoryFilter, search]);

  const handleOpenAssign = (drill) => {
    setTargetDrill(drill);
    setShowAssignModal(true);
  };

  const handleConfirmAssign = async (e) => {
    e.preventDefault();
    if(sending.current || !ownedAthletes.some(a=>String(a.id)===selectedAthlete))return;
    const fields={athleteId:Number(selectedAthlete),title:targetDrill.name,
      details:[targetDrill.dosing,assignedFrequency,targetDrill.execution].join(' · ')};
    const signature=JSON.stringify(fields);
    if(assignment.current.signature!==signature)assignment.current={signature,requestId:crypto.randomUUID()};
    sending.current=true;setAssignBusy(true);setScopeError('');
    try {
      await saveCollaboration('tasks',null,{...fields,requestId:assignment.current.requestId});
      assignment.current={signature:'',requestId:''};
      setShowAssignModal(false);
      alert('Ejercicio guardado en el seguimiento de tu atleta.');
    } catch(err){setScopeError(err.message);}
    finally{sending.current=false;setAssignBusy(false);}
  };

  const categories = [
    'Todas',
    'Recobro de Rodilla',
    'Impulso & Extensión',
    'Simetría & Tobillo',
    'Postura & Tronco'
  ];

  return (
    <Layout>
      {scopeError && <p role="alert">{scopeError}</p>}
      <PageHeader
        eyebrow="CATÁLOGO FORMATIVO DE ATLETISMO"
        title="Biblioteca de Drills & Ejercicios"
        description="Banco pedagógico de ejercicios técnicos clasificados por objetivo biomecánico para asignar a tus atletas."
        action={
          <button
            className="primary-button"
            type="button"
            onClick={() => handleOpenAssign(drills[0])}
          >
            <Plus size={18} />
            Asignar ejercicio
          </button>
        }
      />

      {/* FILTER PILLS & SEARCH */}
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
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`filter-pill ${categoryFilter === cat ? 'active' : ''}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat === 'Todas'
                ? `Todos (${drills.length})`
                : `${cat} (${drills.filter((d) => d.category === cat).length})`}
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
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por ejercicio o falla..."
            className="form-control"
            style={{ height: 38, paddingLeft: 36, fontSize: 12 }}
          />
        </div>
      </div>

      {/* DRILLS CARDS GRID */}
      <div className="drills-grid">
        {filtered.map((drill) => (
          <article key={drill.id} className="drill-library-card">
            <div className="drill-card-media">
              <span className="drill-badge-category">{drill.category}</span>
              <span className={`drill-difficulty-pill ${drill.difficulty}`}>
                {drill.difficultyLabel}
              </span>
              <Dumbbell size={36} color="#60c6f5" style={{ opacity: 0.9, marginBottom: 8 }} />
              <strong style={{ fontSize: 14, maxWidth: '85%' }}>{drill.name}</strong>
            </div>

            <div className="drill-card-body">
              <div>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#2474d2', textTransform: 'uppercase' }}>
                  Objetivo Biomecánico
                </span>
                <p style={{ fontSize: 12, color: '#10283f', margin: '4px 0 10px', lineHeight: 1.4, fontWeight: 600 }}>
                  {drill.goal}
                </p>
              </div>

              <div className="drill-instructions-box">
                <strong style={{ display: 'block', fontSize: 11, color: '#10283f', marginBottom: 2 }}>
                  Ejecución técnica:
                </strong>
                {drill.execution}
              </div>

              <div style={{ fontSize: 11, color: '#dc2626', marginBottom: 12 }}>
                <strong>Error a evitar:</strong> {drill.commonErrors}
              </div>

              <div className="drill-dosing-row">
                <span>⏱️ Dosificación: <strong>{drill.dosing.split('(')[0]}</strong></span>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button
                  type="button"
                  className="btn-schedule-sm"
                  style={{ height: 36, fontSize: 12 }}
                  onClick={() => handleOpenAssign(drill)}
                >
                  <UserCheck size={14} />
                  Asignar a atleta
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* MODAL ASIGNAR EJERCICIO A ATLETA */}
      {showAssignModal && targetDrill && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#10283f' }}>
                  Asignar Drill Técnico a Atleta
                </h3>
                <span style={{ fontSize: 12, color: '#7b8798' }}>
                  Ejercicio: <strong>{targetDrill.name}</strong>
                </span>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowAssignModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmAssign}>
              <div className="modal-body">
                {scopeError && <p role="alert">{scopeError}</p>}
                <div className="form-group">
                  <label>Atleta destinatario *</label>
                  <select
                    className="form-control"
                    value={selectedAthlete}
                    onChange={(e) => setSelectedAthlete(e.target.value)}
                  >
                    <option value="">Seleccionar atleta propio</option>
                    {ownedAthletes.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label>Frecuencia de práctica</label>
                    <select
                      className="form-control"
                      value={assignedFrequency}
                      onChange={(e) => setAssignedFrequency(e.target.value)}
                    >
                      <option>1 vez por semana</option>
                      <option>2 veces por semana</option>
                      <option>3 veces por semana (Intensivo)</option>
                      <option>En cada calentamiento de pista</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Duración del bloque</label>
                    <input
                      type="text"
                      className="form-control"
                      defaultValue="3 semanas consecutivas"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Instrucciones específicas para el alumno</label>
                  <textarea
                    rows={3}
                    className="form-control"
                    defaultValue={`Foco principal: ${targetDrill.goal} Cuidar de no: ${targetDrill.commonErrors.toLowerCase()}`}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-outline-sm"
                  onClick={() => setShowAssignModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" disabled={assignBusy || !selectedAthlete} className="primary-button">
                  Confirmar asignación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
