// Resumen y comparación de sesiones del portal, usando únicamente datos guardados.
const puntaje = s => Number.isFinite(s?.iptScore) ? s.iptScore : null;

export function resumenPersonal(sessions = []) {
  const ordenadas = [...sessions].sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate));
  const ultima = ordenadas.find(s => puntaje(s) !== null) || null;
  return { total: sessions.length, analizadas: sessions.filter(s => s.analizada).length, ultima };
}

export function compararProgreso(inicial, control) {
  if (!inicial || !control || String(inicial.id) === String(control.id)) return { estado: 'seleccion' };
  const a = puntaje(inicial), b = puntaje(control);
  if (a === null || b === null) return { estado: 'sin_analisis' };
  if (!Number.isInteger(inicial.iptVersion) || !Number.isInteger(control.iptVersion)) return { estado: 'sin_version' };
  if (inicial.iptVersion !== control.iptVersion) return { estado: 'version_distinta' };
  return { estado: 'comparable', inicial: a, control: b, delta: Math.round((b - a) * 10) / 10 };
}
