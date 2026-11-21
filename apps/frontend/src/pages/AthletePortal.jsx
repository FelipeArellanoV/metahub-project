import {
  Activity,
  Flag,
  Flame,
  Medal,
  Repeat,
  Rocket,
  Scale,
  ShieldCheck,
  TrendingUp,
  Trophy,
  Upload
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout, PageHeader } from '../components/UI.jsx';
import api from '../services/api.js';
import { Skeleton, cardVariants, motion } from '../components/Motion.jsx';
import { resumenDeAnalisis } from '../services/analisisSesion.js';
import { bandaDeEdad, dosisPara, ejerciciosParaHallazgos } from '../services/catalogoEjercicios.js';

/** Ícono de cada medalla que entrega la API (progress.medals[].id). */
const MEDAL_ICONS = {
  first_session: Flag,
  consistency: Repeat,
  ipt_75: Rocket,
  ipt_90: Trophy,
  improvement: TrendingUp,
  symmetry: Scale
};

export default function AthletePortal() {

  const [loading, setLoading] = useState(true);
  const [portalData, setPortalData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    let timer;
    async function loadPortal() {
      try {
        const data = await api.portal.getMe();
        if (alive) { setPortalData(data); setError(null); }
      } catch (err) {
        if (alive) setError(err.message || 'Error cargando datos del portal');
      } finally {
        if (alive) {
          setLoading(false);
          timer = setTimeout(loadPortal, 15000);
        }
      }
    }
    loadPortal();
    return () => { alive = false; clearTimeout(timer); };
  }, []);

  const athlete = portalData?.athlete;
  const progress = portalData?.progress;
  const sessions = portalData?.sessions || [];
  const latestAnalysis = portalData?.latestAnalysis;

  // Misma lectura que el Inicio y Ejercicios del entrenador: último análisis, sus hallazgos y los
  // ejercicios del catálogo que corresponden a esos hallazgos (services/catalogoEjercicios.js).
  const ultimo = latestAnalysis ? resumenDeAnalisis({ analysis: latestAnalysis }) : null;
  const hallazgos = ultimo ? ultimo.hallazgos : [];
  const ejercicios = ejerciciosParaHallazgos(hallazgos);
  const banda = bandaDeEdad(athlete?.age);

  if (loading) {
    return (
      <Layout>
        <div className="mh-skeleton-stack" role="status" aria-busy="true" style={{ gap: 20 }}>
          <span className="mh-visually-hidden">Cargando ficha del atleta desde MetaHub Lab...</span>
          <div className="mh-skeleton-stack"><Skeleton width="45%" height={11} /><Skeleton width="75%" height={30} radius={10} /><Skeleton width="90%" height={13} /></div>
          <div className="panel-card mh-skeleton-stack">
            <div className="mh-skeleton-identity"><Skeleton width={64} height={64} radius={18} /><div className="mh-skeleton-stack" style={{ flex: 1 }}><Skeleton width="55%" height={20} /><Skeleton width="35%" height={12} /></div></div>
            <div className="mh-skeleton-facts">{[0, 1, 2, 3].map(i => <div className="mh-skeleton-stack" key={i}><Skeleton width="70%" height={10} /><Skeleton width="45%" height={18} /></div>)}</div>
          </div>
          <div className="panel-card mh-skeleton-stack"><Skeleton width="40%" height={16} /><Skeleton height={12} /><Skeleton width="80%" height={12} /></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="roster-message error" role="alert">
          <div>
            <strong>No se pudo cargar tu portal</strong>
            <p>{error}</p>
            <button className="primary-button" onClick={() => window.location.reload()}>Reintentar</button>
          </div>
        </div>
      </Layout>
    );
  }

  const earnedMedals = progress?.medals?.filter(m => m.earned) || [];
  const allMedals = progress?.medals || [];
  const firstName = (athlete?.name || '').split(' ')[0] || 'atleta';
  // El indicador muestra el último análisis (igual que el Inicio del entrenador). Si ese análisis no tuvo
  // IPT, se dice por qué y se recuerda el último IPT obtenido.
  const ultimoIptValido = Number.isFinite(progress?.latestIpt) ? progress.latestIpt : null;
  const latestIpt = ultimo ? ultimo.ipt : ultimoIptValido;
  const deltaIpt = latestIpt != null && Number.isFinite(progress?.deltaAnterior) ? progress.deltaAnterior : null;
  // Arco del indicador: semicírculo de radio 84 centrado en (100,104); el IPT va de 0 a 100.
  const arc = latestIpt == null ? null : (() => {
    const t = Math.max(0, Math.min(100, latestIpt)) / 100 * Math.PI;
    return `M16 104A84 84 0 0 1 ${(100 - 84 * Math.cos(t)).toFixed(1)} ${(104 - 84 * Math.sin(t)).toFixed(1)}`;
  })();
  const xpRange = progress?.xpNext ? Math.max(1, progress.xpNext - (progress.xpFloor || 0)) : null;
  const xpPct = xpRange ? Math.min(100, Math.round(((progress.xp || 0) - (progress.xpFloor || 0)) / xpRange * 100)) : null;
  const fecha = d => new Date(d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <Layout>
      <PageHeader
        eyebrow={'Hola, ' + firstName}
        title="Tu progreso"
        description={athlete?.trainerName ? 'Entrenador: ' + athlete.trainerName : undefined}
      />

      <div className="mh-portal">
        <motion.section variants={cardVariants} className="mh-gauge-card" aria-label="Tu índice de técnica">
          {latestIpt != null ? <>
            <svg viewBox="0 0 200 112" className="mh-gauge" role="img" aria-label={`IPT ${latestIpt} de 100`}>
              <path d="M16 104a84 84 0 0 1 168 0" className="mh-gauge-track" />
              <path d={arc} className="mh-gauge-value" />
            </svg>
            <span className="mh-gauge-score">{latestIpt}</span>
            <span className="mh-gauge-label">
              Índice de técnica (IPT)
              {deltaIpt != null && <> · <b className={deltaIpt >= 0 ? 'is-up' : 'is-down'}>{deltaIpt > 0 ? '+' : ''}{deltaIpt}</b> desde tu análisis anterior</>}
            </span>
            {ultimo?.ic95 && <span className="mh-gauge-label">IC 95 %: {ultimo.ic95[0]}–{ultimo.ic95[1]}</span>}
          </> : ultimo ? <>
            <span className="mh-kicker">Tu último video no tuvo IPT</span>
            <p className="mh-gauge-empty">{ultimo.motivoSinIpt || 'El video no permitió comparar tu técnica con la referencia.'}</p>
            {ultimoIptValido != null && <p className="mh-block-note">Tu último IPT fue {ultimoIptValido}.</p>}
          </> : <>
            <span className="mh-kicker">Tu primer análisis</span>
            <p className="mh-gauge-empty">Sube un video de tu carrera y aquí verás tu índice de técnica.</p>
          </>}
          <Link className="primary-button mh-gauge-cta" to="/upload"><Upload size={18} aria-hidden="true" />Subir video de carrera</Link>
        </motion.section>

        <motion.ul variants={cardVariants} className="mh-facts" aria-label="Tu estado">
          <li className={athlete?.consent === true ? 'ok' : 'warn'}><ShieldCheck size={16} aria-hidden="true" />Consentimiento {athlete?.consent === true ? 'vigente' : 'pendiente'}</li>
          <li><Activity size={16} aria-hidden="true" />{progress?.sessionCount ?? sessions.length} {(progress?.sessionCount ?? sessions.length) === 1 ? 'sesión' : 'sesiones'}</li>
          {progress?.label && <li><Flame size={16} aria-hidden="true" />{progress.label} · {progress.xp || 0} XP</li>}
        </motion.ul>

        <motion.section variants={cardVariants} className="mh-block" aria-labelledby="mh-sesiones">
          <div className="mh-block-head">
            <h2 id="mh-sesiones" className="mh-block-title">Tus sesiones</h2>
            <Link to="/reviews" className="mh-link">Revisiones</Link>
          </div>
          {sessions.length ? (
            <ul className="mh-list">
              {sessions.map((s, idx) => (
                <li key={s.id || idx}>
                  <Link to={'/reviews?sessionId=' + s.id}>
                    <span className="mh-list-text">
                      <strong>{fecha(s.sessionDate)}</strong>
                      <small>{s.sectorPrioritario ? 'A trabajar: ' + s.sectorPrioritario.replace(/^Sector \d+:\s*/, '')
                        : s.analizada && s.iptScore == null ? 'Sin IPT: revisa el motivo'
                        : s.analizada ? 'Sesión #' + (sessions.length - idx) : 'En análisis o sin video'}</small>
                    </span>
                    <span className={'mh-list-score' + (idx > 0 ? ' is-past' : '')}>{s.iptScore != null ? s.iptScore : '—'}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="mh-empty-line">Aún no tienes sesiones registradas.</p>}
        </motion.section>

        <motion.section variants={cardVariants} className="mh-block" aria-labelledby="mh-plan">
          <div className="mh-block-head">
            <h2 id="mh-plan" className="mh-block-title">Tu plan sugerido</h2>
            <Link to="/collaboration" className="mh-link">Seguimiento</Link>
          </div>
          <p className="mh-block-note">Sale de tu último análisis, igual que lo ve tu entrenador. Él te asigna los ejercicios en Seguimiento.</p>
          {hallazgos.length > 0 && (
            <ul className="mh-findings">
              {hallazgos.map(h => <li key={h.id}><strong>{h.titulo}</strong>{h.interpretacion && <small>{h.interpretacion}</small>}</li>)}
            </ul>
          )}
          {ejercicios.length ? (
            <ol className="mh-drills">
              {ejercicios.map(drill => (
                <li key={drill.id}>
                  <span className="mh-drill-phase">{drill.category}</span>
                  <strong>{drill.name}</strong>
                  <span className="mh-drill-dose">{dosisPara(drill, banda)}</span>
                  {drill.cues && <small>{drill.cues}</small>}
                </li>
              ))}
            </ol>
          ) : <p className="mh-empty-line">{!ultimo ? 'Aún no tienes un análisis.'
            : ultimo.recomendaciones && !ultimo.recomendaciones.disponible
              ? (ultimo.recomendaciones.motivo_no_disponible || 'Tu último análisis no permite sugerir ejercicios.')
              : (ultimo.recomendaciones?.mensaje || 'Tu último análisis no encontró variables fuera de la referencia.')}</p>}
        </motion.section>

        {allMedals.length > 0 && (
          <motion.section variants={cardVariants} className="mh-block" aria-labelledby="mh-medallas">
            <div className="mh-block-head">
              <h2 id="mh-medallas" className="mh-block-title">Medallas</h2>
              <span className="mh-block-count">{earnedMedals.length} de {allMedals.length}</span>
            </div>
            {xpPct != null && (
              <div className="mh-xp" role="progressbar" aria-label={'Avance hacia ' + (progress.nextLabel || 'el siguiente nivel')}
                aria-valuemin={0} aria-valuemax={100} aria-valuenow={xpPct}>
                <span className="mh-xp-fill" style={{ transform: `scaleX(${xpPct / 100})` }} />
              </div>
            )}
            {progress?.nextLabel && <p className="mh-block-note">{progress.xp || 0} de {progress.xpNext} XP para {progress.nextLabel}</p>}
            <ul className="mh-medals">
              {allMedals.map(medal => {
                const Icon = MEDAL_ICONS[medal.id] || Medal;
                return (
                  <li key={medal.id} className={medal.earned ? 'is-earned' : ''}>
                    <span className="mh-medal-icon" aria-hidden="true"><Icon size={20} /></span>
                    <strong>{medal.title}</strong>
                    <small>{medal.earned ? medal.detail : 'Pendiente · ' + medal.detail}</small>
                  </li>
                );
              })}
            </ul>
          </motion.section>
        )}

        <div className="mh-note">
          <strong>Cómo se calcula tu IPT</strong>
          <p>
            Cada paso de tu video se compara con velocistas de referencia (Miyashiro et al., 2019) en el contacto, el
            despegue y el recobro. 100 es igual a la referencia y cada 10 puntos menos equivalen a 1 desviación
            estándar de diferencia (la misma escala que el Gait Deviation Index). Si eres escolar, es normal estar
            por debajo: lo importante es tu avance. Tu entrenador decide qué trabajar.
          </p>
        </div>
      </div>
    </Layout>
  );
}
