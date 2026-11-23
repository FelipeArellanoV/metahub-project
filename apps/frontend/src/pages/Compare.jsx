/**
 * =========================================================================================
 * PROYECTO METAHUB — SEGUIMIENTO LONGITUDINAL DE LA TÉCNICA DE CARRERA EN ATLETISMO ESCOLAR
 * Escuela de Ingeniería Civil en Informática — Universidad Católica de Temuco
 * 
 * Memoria / Trabajo de Título:
 * Autores: Felipe Arellano Vargas & Sofía Henríquez Soto
 * Profesor Guía: Dr. Marcos Lévano
 * 
 * Módulo: Comparador Biomecánico Split-Screen y Métricas Cinemáticas (Compare.jsx)
 * Descripción: Conectado a la base de datos persistente y microservicio de Visión por Computador.
 *              Permite contrastar cualquier par de sesiones reales de un atleta escolar,
 *              calculando deltas cinemáticos verdaderos (IPT, cadencia, zancada, ángulos)
 *              y permitiendo la ejecución de análisis MediaPipe en tiempo real.
 * =========================================================================================
 */

import {
  Activity,
  Camera,
  Dumbbell,
  Gauge,
  GitCompare,
  Layers,
  Sparkles,
  Timer,
  Zap
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, PageHeader } from '../components/UI.jsx';
import api from '../services/api.js';
import { SkeletonList, cardVariants, motion } from '../components/Motion.jsx';
import PoseComparison from '../components/PoseComparison.jsx';
import { PerfilComparado, TablaDiferencias } from '../components/DetalleAnalisis.jsx';
import { perfilComparado, diferenciasEntre } from '../services/detalleAnalisis.js';
import { extraerMetricasSesion, formatearMetrica, compararSesiones } from '../services/metricasSesion.js';
const poseRequest=async path=>{const r=await fetch((import.meta.env.VITE_API_BASE||'')+path,{headers:{Authorization:'Bearer '+localStorage.getItem('metahub_token')}});const data=await r.json();if(!r.ok)throw new Error(data.error||'No se pudieron cargar los datos');return data;};


export default function Compare() {
  const navigate = useNavigate();
  const viewerRole=JSON.parse(localStorage.getItem('metahub_user')||'{}').role;
  const [athletesList, setAthletesList] = useState([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState('');
  const [athleteSessions, setAthleteSessions] = useState([]);
  const [selectedSessionAId, setSelectedSessionAId] = useState('');
  const [selectedSessionBId, setSelectedSessionBId] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [isProcessingCv, setIsProcessingCv] = useState(false);
  const [cvStatusMessage, setCvStatusMessage] = useState('');

  const [showSkeleton, setShowSkeleton] = useState(true);

  // 1. Cargar lista real de atletas desde el backend
  useEffect(() => {
    let isMounted = true;
    (viewerRole==='atleta' ? api.portal.getMe().then(data=>[data.athlete]) : poseRequest('/api/roster').then(data=>data.athletes))
      .then(list => {
        if (isMounted && Array.isArray(list) && list.length > 0) {
          setAthletesList(list);
          setSelectedAthleteId(String(list[0].id));
        }
      })
      .catch(err => {
        console.warn('Error cargando atletas:', err);
      });
    return () => { isMounted = false; };
  }, []);

  // 2. Al cambiar el atleta, cargar sus sesiones reales
  const loadSessionsForAthlete = (athleteId) => {
    if (!athleteId) return;
    setLoadingSessions(true);
    poseRequest('/api/videos/sessions?athleteId='+encodeURIComponent(athleteId)).then(data=>data.sessions)
      .then(sessions => {
        const sorted = (sessions || []).slice().sort((a, b) => new Date(a.sessionDate || a.createdAt) - new Date(b.sessionDate || b.createdAt));
        setAthleteSessions(sorted);
        if (sorted.length >= 2) {
          // Sesión A: primera en el tiempo (Línea base)
          setSelectedSessionAId(String(sorted[0].id));
          // Sesión B: última en el tiempo (Control posterior)
          setSelectedSessionBId(String(sorted[sorted.length - 1].id));
        } else if (sorted.length === 1) {
          setSelectedSessionAId(String(sorted[0].id));
          setSelectedSessionBId('');
        } else {
          setSelectedSessionAId('');
          setSelectedSessionBId('');
        }
      })
      .catch(err => {
        console.warn('Error cargando sesiones del atleta:', err);
        setAthleteSessions([]);
      })
      .finally(() => setLoadingSessions(false));
  };

  useEffect(() => {
    if (selectedAthleteId) {
      loadSessionsForAthlete(selectedAthleteId);
    }
  }, [selectedAthleteId]);

  const handleRunRealCvAnalysis=()=>navigate(viewerRole==='atleta'?'/upload':'/capture');

  // Sesiones seleccionadas para la comparativa
  const rawSessionA = athleteSessions.find(s => String(s.id) === String(selectedSessionAId));
  const rawSessionB = athleteSessions.find(s => String(s.id) === String(selectedSessionBId));

  const sA = useMemo(() => extraerMetricasSesion(rawSessionA), [rawSessionA]);
  const sB = useMemo(() => extraerMetricasSesion(rawSessionB), [rawSessionB]);

  const hasTwoSessions = Boolean(rawSessionA && rawSessionB && rawSessionA.id !== rawSessionB.id);

  // Cálculo de deltas dinámicos
  const deltas = useMemo(() => {
    if (!hasTwoSessions) return [];
    const cmp = compararSesiones(sA, sB);
    const diffIpt = cmp.ipt.diff ?? NaN;
    const diffCadence = cmp.cadenceHz.diff ?? NaN;
    const diffStride = cmp.strideLengthM.diff ?? NaN;
    const diffSpeed = cmp.speedMs.diff ?? NaN;
    const diffKnee = cmp.kneeAngle.diff ?? NaN;
    const diffSym = cmp.symmetry.diff ?? NaN;

    return [
      {
        metric: 'IPT',
        unit: 'pts',
        before: formatearMetrica(sA.ipt,1),
        after: formatearMetrica(sB.ipt,1),
        diff: `${diffIpt >= 0 ? '+' : ''}${diffIpt.toFixed(1)} pts`,
        percent: `${diffIpt >= 0 ? '+' : ''}${sA.ipt > 0 ? ((diffIpt / sA.ipt) * 100).toFixed(1) : 0}%`,
        positive: diffIpt >= 0,
        interpretation: 'Eficiencia técnica global consolidada',
        icon: <Sparkles size={16} />
      },
      {
        metric: 'Cadencia',
        unit: 'Hz (pasos/s)',
        before: `${formatearMetrica(sA.cadenceHz,2)} Hz`,
        after: `${formatearMetrica(sB.cadenceHz,2)} Hz`,
        diff: `${diffCadence >= 0 ? '+' : ''}${diffCadence.toFixed(2)} Hz`,
        percent: `${sB.cadencePpm} ppm (antes ${sA.cadencePpm})`,
        positive: diffCadence >= 0,
        interpretation: 'Mayor velocidad de ciclo por segundo',
        icon: <Timer size={16} />
      },
      {
        metric: 'Zancada',
        unit: 'metros',
        before: `${formatearMetrica(sA.strideLengthM,2)} m`,
        after: `${formatearMetrica(sB.strideLengthM,2)} m`,
        diff: `${diffStride >= 0 ? '+' : ''}${diffStride.toFixed(2)} m`,
        percent: `${diffStride >= 0 ? '+' : ''}${sA.strideLengthM > 0 ? ((diffStride / sA.strideLengthM) * 100).toFixed(1) : 0}% amplitud`,
        positive: diffStride >= 0,
        interpretation: 'Amplitud de ataque sin sobrezancada',
        icon: <Gauge size={16} />
      },
      {
        metric: 'Velocidad',
        unit: 'm/s',
        before: `${formatearMetrica(sA.speedMs,2)} m/s`,
        after: `${formatearMetrica(sB.speedMs,2)} m/s`,
        diff: `${diffSpeed >= 0 ? '+' : ''}${diffSpeed.toFixed(2)} m/s`,
        percent: `${(sB.speedMs * 3.6).toFixed(1)} km/h (antes ${(sA.speedMs * 3.6).toFixed(1)})`,
        positive: diffSpeed >= 0,
        interpretation: 'Incremento neto de velocidad lineal',
        icon: <Zap size={16} />
      },
      {
        metric: 'Flexión de rodilla',
        unit: 'grados',
        before: `${formatearMetrica(sA.kneeAngle,1)}°`,
        after: `${formatearMetrica(sB.kneeAngle,1)}°`,
        diff: `${diffKnee >= 0 ? '+' : ''}${diffKnee.toFixed(1)}°`,
        percent: diffKnee >= 0 ? 'Mayor elevación de ataque' : 'Recobro más plano',
        positive: diffKnee >= 0,
        interpretation: 'Reducción del momento de inercia de la pierna libre',
        icon: <Activity size={16} />
      },
      {
        metric: 'Simetría entre pasos',
        unit: 'pts',
        before: `${formatearMetrica(sA.symmetry,0)} pts`,
        after: `${formatearMetrica(sB.symmetry,0)} pts`,
        diff: `${diffSym >= 0 ? '+' : ''}${diffSym.toFixed(0)} pts`,
        percent: diffSym >= 0 ? 'Pasos de ambas piernas más parecidos' : 'Pasos de ambas piernas menos parecidos',
        positive: diffSym >= 0,
        interpretation: 'Compara los pasos alternos (pierna A y B) con la variabilidad de la referencia',
        icon: <GitCompare size={16} />
      }
    ].filter((_,i)=>[['ipt','ipt'],['cadenceHz','cadenceHz'],['strideLengthM','strideLengthM'],['speedMs','speedMs'],['kneeAngle','kneeAngle'],['symmetry','symmetry']][i].every((key,j)=>Number.isFinite((j?sB:sA)[key])));
  }, [sA, sB, hasTwoSessions]);



  const isCoach = viewerRole !== 'atleta';
  const fechaSesion = s => new Date(s.sessionDate || s.createdAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
  const sinMedicion = hasTwoSessions
    ? [['cadenceHz', 'cadencia'], ['strideLengthM', 'zancada'], ['speedMs', 'velocidad'], ['kneeAngle', 'flexión de rodilla'], ['symmetry', 'simetría']]
        .filter(([key]) => !Number.isFinite(sA[key]) || !Number.isFinite(sB[key])).map(([, label]) => label)
    : [];
  const iptDiff = hasTwoSessions && Number.isFinite(sA.ipt) && Number.isFinite(sB.ipt) ? sB.ipt - sA.ipt : null;
  const sessionSelect = (label, value, set) => (
    <label className="mh-field">
      <span>{label}</span>
      <select value={value} onChange={e => set(e.target.value)}>
        {athleteSessions.map(s => (
          <option key={s.id} value={String(s.id)}>
            {fechaSesion(s)} · #{s.id}{s.iptScore != null ? ' · IPT ' + s.iptScore : ''}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <Layout>
      <PageHeader
        eyebrow="ANÁLISIS"
        title="Comparar"
        description={isCoach ? 'El antes y después de un atleta, con el esqueleto que detectó MediaPipe.' : 'Tu antes y después, con el esqueleto que detectó MediaPipe.'}
      />

      <motion.section variants={cardVariants} className="mh-compare-pick" aria-label="Qué comparar">
        {isCoach && (
          <label className="mh-field">
            <span>Atleta</span>
            <select value={selectedAthleteId} onChange={(e) => setSelectedAthleteId(e.target.value)}>
              {athletesList.map(a => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
            </select>
          </label>
        )}
        {athleteSessions.length > 0 && sessionSelect('Antes', selectedSessionAId, setSelectedSessionAId)}
        {athleteSessions.length > 0 && sessionSelect('Después', selectedSessionBId, setSelectedSessionBId)}
      </motion.section>

      {loadingSessions && !hasTwoSessions && (
        <div className="panel-card"><SkeletonList rows={2} label="Cargando sesiones…" /></div>
      )}

      {!hasTwoSessions && !loadingSessions && (
        <motion.section variants={cardVariants} className="mh-hero mh-hero-empty">
          <span className="mh-kicker">Faltan sesiones</span>
          <h2>{athleteSessions.length === 1
            ? 'Hay 1 sesión registrada. Para comparar se necesitan 2.'
            : athleteSessions.length === 0 ? 'Aún no hay sesiones registradas.' : 'Elige dos sesiones distintas.'}</h2>
          {athleteSessions.length < 2 && (
            <button type="button" className="primary-button" onClick={handleRunRealCvAnalysis}>
              <Camera size={18} aria-hidden="true" />{isCoach ? 'Grabar pasada' : 'Subir video'}
            </button>
          )}
        </motion.section>
      )}

      {hasTwoSessions && (
        <>
          <motion.section variants={cardVariants} className="mh-compare-hero" aria-label="IPT antes y después">
            <div className="mh-compare-side">
              <span className="mh-kicker is-muted">Antes · {sA.date}</span>
              <span className="mh-compare-score is-before">{formatearMetrica(sA.ipt, 1)}</span>
            </div>
            <span className="mh-compare-arrow" aria-hidden="true">→</span>
            <div className="mh-compare-side">
              <span className="mh-kicker">Después · {sB.date}</span>
              <span className="mh-compare-score">{formatearMetrica(sB.ipt, 1)}</span>
            </div>
            {iptDiff != null && (
              <span className={'mh-chip ' + (iptDiff >= 0 ? 'ok' : 'bad')}>{iptDiff >= 0 ? '+' : ''}{iptDiff.toFixed(1)} IPT</span>
            )}
          </motion.section>

          {deltas.some(d => d.metric !== 'IPT') && (
            <motion.section variants={cardVariants} className="mh-block" aria-labelledby="mh-cambios">
              <h2 id="mh-cambios" className="mh-block-title">Cambios por medición</h2>
              <ul className="mh-delta-grid">
                {deltas.filter(d => d.metric !== 'IPT').map(d => (
                  <li key={d.metric}>
                    <span className="mh-delta-name">{d.metric}</span>
                    <span className="mh-delta-after">{d.after}</span>
                    <span className="mh-delta-foot">
                      <span>antes {d.before}</span>
                      <span className={'mh-chip ' + (d.positive ? 'ok' : 'bad')}>{d.diff}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </motion.section>
          )}
          {rawSessionA?.analysis && rawSessionB?.analysis && perfilComparado(rawSessionA.analysis, rawSessionB.analysis).length > 0 && (
            <motion.section variants={cardVariants} className="mh-block" aria-labelledby="mh-perfil-cmp">
              <h2 id="mh-perfil-cmp" className="mh-block-title">Perfil antes y después</h2>
              <p className="mh-block-note">Distancia de cada variable a la referencia, en DE. Hueco: sesión inicial; lleno: sesión de control.</p>
              <PerfilComparado antes={rawSessionA.analysis} despues={rawSessionB.analysis} />
            </motion.section>
          )}
          {rawSessionA?.analysis && rawSessionB?.analysis && diferenciasEntre(rawSessionA.analysis, rawSessionB.analysis).length > 0 && (
            <motion.section variants={cardVariants} className="mh-block" aria-labelledby="mh-dif-cmp">
              <h2 id="mh-dif-cmp" className="mh-block-title">Cambio por variable</h2>
              <TablaDiferencias antes={rawSessionA.analysis} despues={rawSessionB.analysis} />
            </motion.section>
          )}
          {sinMedicion.length > 0 && (
            <p className="mh-block-note mh-compare-missing">Sin medición en alguna de las dos sesiones: {sinMedicion.join(', ')}.</p>
          )}

          <motion.section variants={cardVariants} className="mh-block" aria-labelledby="mh-videos">
            <div className="mh-block-head">
              <h2 id="mh-videos" className="mh-block-title">Esqueleto sincronizado</h2>
              <button type="button" className={'filter-pill' + (showSkeleton ? ' active' : '')} aria-pressed={showSkeleton}
                onClick={() => setShowSkeleton(!showSkeleton)}>
                <Layers size={14} aria-hidden="true" />{showSkeleton ? ' Esqueleto visible' : ' Esqueleto oculto'}
              </button>
            </div>
            <PoseComparison sessionA={rawSessionA} sessionB={rawSessionB} showSkeleton={showSkeleton} canAnalyze />
          </motion.section>

          {isCoach && (
            <div className="mh-compare-actions">
              <button type="button" className="primary-button" onClick={() => navigate('/drills?athlete=' + selectedAthleteId)}>
                <Dumbbell size={18} aria-hidden="true" />Asignar ejercicios
              </button>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
