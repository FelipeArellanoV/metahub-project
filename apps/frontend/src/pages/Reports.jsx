import {
  Award,
  Calendar,
  CheckCircle2,
  Download,
  FileCheck,
  FileText,
  Heart,
  Medal,
  Printer,
  Share2,
  Sparkles,
  Star,
  Trophy,
  User
} from 'lucide-react';
import { useState } from 'react';
import { Layout, PageHeader } from '../components/UI.jsx';

const reportAthletes = {
  'Martín Atleta': {
    name: 'Martín Atleta',
    age: 15,
    category: 'Sub-16',
    school: 'Liceo Deportivo Temuco',
    guardian: 'Carlos Atleta (Padre)',
    period: 'Marzo — Octubre 2026 (Semestre Escolar)',
    sessionsCount: 8,
    achievements: [
      { title: 'Constancia en Pista', desc: '100% de asistencia a evaluaciones programadas', icon: Medal, color: '#2474d2' },
      { title: 'Zancada Equilibrada', desc: 'Simetría óptima de 95,8% entre pierna izq/der', icon: Trophy, color: '#1c9b69' },
      { title: 'Superación Técnica', desc: 'Ganancia de +3,9° en flexión y recobro de rodilla', icon: Star, color: '#d69b2b' }
    ],
    skills: [
      { name: 'Alineación e Inclinación de Tronco', level: 'Sobresaliente', score: '95%' },
      { name: 'Elevación de Rodilla en Fase de Vuelo', level: 'Muy Bueno (Notable evolución)', score: '92%' },
      { name: 'Aterrizaje del Pie con Mediopié', level: 'Consolidado', score: '90%' },
      { name: 'Compromiso y Disciplina Escolar', level: 'Ejemplar', score: '100%' }
    ],
    coachMessage:
      'Estimada familia: Durante este semestre Martín ha demostrado una dedicación ejemplar en los entrenamientos en pista. Los análisis de video mostraron una corrección evidente en la postura de carrera, logrando una zancada mucho más potente y segura contra lesiones. ¡Felicitaciones por el apoyo familiar constante!'
  },
  'Antonia Pérez': {
    name: 'Antonia Pérez',
    age: 15,
    category: 'Sub-14',
    school: 'Colegio Metodista',
    guardian: 'Roberto Pérez (Padre)',
    period: 'Marzo — Octubre 2026 (Semestre Escolar)',
    sessionsCount: 6,
    achievements: [
      { title: 'Asistencia Ejemplar', desc: 'Participación activa en todas las sesiones formativas', icon: Medal, color: '#2474d2' },
      { title: 'Progreso en Tobillo', desc: 'Reducción de asimetría de 14,8% a menos de 5%', icon: Trophy, color: '#1c9b69' },
      { title: 'Fuerza Reactiva', desc: 'Gran velocidad en ejercicios pliométricos', icon: Star, color: '#d69b2b' }
    ],
    skills: [
      { name: 'Equilibrio y Apoyo Monopodal', level: 'Muy Bueno', score: '89%' },
      { name: 'Cadencia de Paso en Velocidad', level: 'Sobresaliente', score: '94%' },
      { name: 'Técnica de Braceo Coordinado', level: 'Consolidado', score: '91%' },
      { name: 'Espíritu de Equipo y Respeto', level: 'Ejemplar', score: '100%' }
    ],
    coachMessage:
      'Estimado apoderado: Antonia ha tenido una evolución destacada en el control de su pisada. Su constancia en los ejercicios de tobillo permitió equilibrar la fuerza de ambas piernas, aumentando su seguridad al correr. Un orgullo ver su entusiasmo deportivo.'
  }
};

export default function Reports() {
  const [selectedAthlete, setSelectedAthlete] = useState('Martín Atleta');
  const [reportType, setReportType] = useState('apoderado');

  const current = reportAthletes[selectedAthlete] || reportAthletes['Martín Atleta'];

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    alert(`Enlace seguro de la ficha formativa de ${current.name} copiado al portapapeles para enviar por WhatsApp o correo al apoderado.`);
  };

  return (
    <Layout>
      <PageHeader
        eyebrow="COMUNICACIÓN ESCOLAR Y FORMATIVA"
        title="Generador de Fichas de Progreso"
        description="Emite informes pedagógicos y certificados de avance técnico diseñados para entregar a los apoderados y directivos del colegio."
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn-outline-sm btn-print"
              type="button"
              onClick={handleShare}
            >
              <Share2 size={16} />
              Compartir con apoderado
            </button>
            <button
              className="primary-button btn-print"
              type="button"
              onClick={handlePrint}
            >
              <Printer size={16} />
              Imprimir / Guardar en PDF
            </button>
          </div>
        }
      />

      {/* CONTROLS BAR */}
      <div className="report-actions-bar" style={{
        background: 'white',
        border: '1px solid #e6eaf0',
        borderRadius: 16,
        padding: '16px 20px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 14
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <User size={18} color="#2474d2" />
          <strong style={{ fontSize: 13, color: '#10283f' }}>Seleccionar Atleta:</strong>
          <select
            className="form-control"
            style={{ width: 180, height: 38, fontSize: 13 }}
            value={selectedAthlete}
            onChange={(e) => setSelectedAthlete(e.target.value)}
          >
            <option value="Martín Atleta">Martín Atleta</option>
            <option value="Antonia Pérez">Antonia Pérez</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <strong style={{ fontSize: 13, color: '#10283f' }}>Tipo de Ficha:</strong>
          <div className="filter-pills-bar">
            <button
              type="button"
              className={`filter-pill ${reportType === 'apoderado' ? 'active' : ''}`}
              onClick={() => setReportType('apoderado')}
            >
              Ficha para Apoderado
            </button>
            <button
              type="button"
              className={`filter-pill ${reportType === 'certificado' ? 'active' : ''}`}
              onClick={() => setReportType('certificado')}
            >
              Certificado Escolar
            </button>
          </div>
        </div>
      </div>

      {/* PRINTABLE REPORT SHEET CONTAINER */}
      <div className="report-sheet-container">
        <article className="report-sheet">
          {/* INSTITUTIONAL HEADER */}
          <div className="report-header-banner">
            <div className="institution-logos">
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #2474d2, #35a8e0)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 18
                }}
              >
                MH
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: 16, color: '#10283f', letterSpacing: -0.3 }}>
                  MetaHub Performance Lab
                </strong>
                <span style={{ fontSize: 11, color: '#7b8798', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Universidad Católica de Temuco · Escuela de Informática y Ed. Física
                </span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#2474d2', background: '#eaf3ff', padding: '4px 10px', borderRadius: 6, display: 'inline-block' }}>
                DOCUMENTO OFICIAL DE SEGUIMIENTO
              </span>
              <span style={{ display: 'block', fontSize: 11, color: '#7b8798', marginTop: 4 }}>
                Periodo: {current.period}
              </span>
            </div>
          </div>

          {/* ATHLETE HIGHLIGHT PROFILE */}
          <div style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #edf4fc 100%)',
            border: '1px solid #d8e5f5',
            borderRadius: 16,
            padding: '20px 24px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16
          }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#2474d2', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                INFORME DE RENDIMIENTO Y TÉCNICA FORMATIVA
              </span>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#10283f', margin: '4px 0 2px' }}>
                {current.name}
              </h2>
              <span style={{ fontSize: 13, color: '#4b5868' }}>
                {current.school} · Categoría {current.category} ({current.age} años)
              </span>
            </div>

            <div style={{ textAlign: 'right' }}>
              <strong style={{ fontSize: 22, color: '#1c9b69', display: 'block' }}>
                {current.sessionsCount} Sesiones
              </strong>
              <span style={{ fontSize: 11, color: '#7b8798' }}>Evaluaciones completadas</span>
            </div>
          </div>

          {/* INSIGNIAS Y LOGROS ALCANZADOS */}
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#10283f', margin: '0 0 14px' }}>
            🏆 Reconocimientos y Logros del Semestre
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 26 }}>
            {current.achievements.map((ach, idx) => {
              const Icon = ach.icon;
              return (
                <div
                  key={idx}
                  style={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: 14,
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    boxShadow: '0 3px 10px rgba(0,0,0,0.02)'
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: `${ach.color}18`,
                      color: ach.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: 13, color: '#10283f' }}>
                      {ach.title}
                    </strong>
                    <span style={{ fontSize: 11, color: '#64748b', lineHeight: 1.3, display: 'block' }}>
                      {ach.desc}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* SKILLS CHECKLIST */}
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#10283f', margin: '0 0 14px' }}>
            📊 Evaluación de Competencias Técnicas y Actitudinales
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {current.skills.map((skill, idx) => (
              <div
                key={idx}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e9edf3',
                  borderRadius: 10,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle2 size={16} color="#1c9b69" />
                  <strong style={{ fontSize: 13, color: '#10283f' }}>{skill.name}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#2474d2' }}>
                    {skill.level}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 800, background: '#eaf3ff', color: '#1e5fad', padding: '3px 8px', borderRadius: 6 }}>
                    {skill.score}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* COACH PERSONAL MESSAGE */}
          <div className="report-feedback-box">
            <span style={{ fontSize: 10, fontWeight: 800, color: '#2474d2', letterSpacing: 0.8, textTransform: 'uppercase' }}>
              Mensaje del Entrenador para la Familia
            </span>
            <p style={{ fontSize: 13, color: '#334155', margin: '8px 0 0', lineHeight: 1.5, fontStyle: 'italic' }}>
              "{current.coachMessage}"
            </p>
          </div>

          {/* INSTITUTIONAL SIGNATURE BLOCK */}
          <div className="report-signature-block">
            <div>
              <span style={{ fontSize: 11, color: '#7b8798', display: 'block' }}>Destinatario:</span>
              <strong style={{ fontSize: 13, color: '#10283f' }}>{current.guardian}</strong>
            </div>

            <div style={{ textAlign: 'right' }}>
              <strong style={{ display: 'block', fontSize: 14, color: '#10283f' }}>
                Felipe Arellano Vargas
              </strong>
              <span style={{ fontSize: 11, color: '#7b8798', display: 'block' }}>
                Profesor Guía: Marcos Lévano · UCT
              </span>
              <span style={{ fontSize: 10, color: '#1c9b69', fontWeight: 700 }}>
                Firmado digitalmente con credenciales MetaHub Lab ✓
              </span>
            </div>
          </div>
        </article>
      </div>
    </Layout>
  );
}
