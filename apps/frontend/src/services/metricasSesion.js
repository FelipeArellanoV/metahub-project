// Lógica pura de la comparación de sesiones (T-06). Se separó de Compare.jsx para poder probarla.

export const formatearMetrica = (value, digits) => Number.isFinite(value) ? value.toFixed(digits) : 'Sin medición';

export function extraerMetricasSesion(session) {
  if (!session) {
    return {
      id: 'N/A',
      date: 'Sin fecha',
      title: 'Sesión no disponible',
      ipt: 0,
      kneeAngle: 0,
      hipAngle: 0,
      symmetry: 0,
      trunkLean: 0,
      cadenceHz: 0,
      cadencePpm: 0,
      strideLengthM: 0,
      speedMs: 0,
      notes: ''
    };
  }

  const a = session.analysis || {};
  const sm = a.summary_metrics || {};
  const ipt = typeof session.iptScore === 'number'
    ? session.iptScore
    : (typeof a.ipt_score === 'number' ? a.ipt_score : NaN);

  const cadenceHz = sm.cadence_hz ?? (sm.avg_cadence_hz ?? NaN);
  const cadencePpm = sm.cadence_ppm ?? Math.round(cadenceHz * 60);
  const strideLengthM = sm.stride_length_m ?? NaN;
  const speedMs = sm.speed_ms ?? NaN;
  const kneeAngle = sm.avg_knee_angle ?? sm.min_knee_flexion ?? NaN;
  const hipAngle = sm.avg_hip_angle ?? sm.peak_hip_extension ?? NaN;
  const symmetry = sm.avg_symmetry_score ?? NaN;
  const trunkLean = sm.trunk_lean_angle ?? NaN;

  const dateFormatted = session.sessionDate
    ? new Date(session.sessionDate).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
    : (session.createdAt ? new Date(session.createdAt).toLocaleDateString('es-CL') : 'Fecha registro');

  return {
    id: `SES-${String(session.id).padStart(3, '0')}`,
    date: dateFormatted,
    rawDate: session.sessionDate || session.createdAt,
    title: session.notes ? session.notes.slice(0, 42) : `Sesión #${session.id}`,
    ipt: Number(ipt),
    kneeAngle: Number(kneeAngle),
    hipAngle: Number(hipAngle),
    symmetry: Number(symmetry),
    trunkLean: Number(trunkLean),
    cadenceHz: Number(cadenceHz),
    cadencePpm: Number(cadencePpm),
    strideLengthM: Number(strideLengthM),
    speedMs: Number(speedMs),
    notes: session.notes || '',
    videoUrl: session.videoUrl || ''
  };
}

// Diferencia B - A por métrica. Si falta alguno de los dos valores devuelve null (no inventa un cero).
export function compararSesiones(a, b) {
  const keys = ['ipt', 'cadenceHz', 'strideLengthM', 'speedMs', 'kneeAngle', 'symmetry'];
  const out = {};
  for (const k of keys) {
    const x = a?.[k], y = b?.[k];
    const ok = Number.isFinite(x) && Number.isFinite(y);
    out[k] = { before: ok ? x : null, after: ok ? y : null, diff: ok ? y - x : null,
               pct: ok && x > 0 ? ((y - x) / x) * 100 : null };
  }
  return out;
}
