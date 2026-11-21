// Catálogo de ejercicios y su relación con los hallazgos del análisis (ADR-018, ADR-023).
// Compartido por la vista del entrenador (Ejercicios) y la del atleta (Portal), para que ambos vean lo mismo.

export const CATALOGO_EJERCICIOS = [
  {
    id: 'D-01',
    name: 'Skipping A sobre Vallas Bajas (40cm)',
    category: 'Recobro de Rodilla',
    targetDeficit: 'knee_flexion',
    difficulty: 'intermedio',
    difficultyLabel: 'Intermedio',
    goal: 'Aumentar el ángulo de flexión de rodilla en fase de vuelo y forzar un ataque activo del pie.',
    execution: 'Colocar 6 vallas a 1.20m de distancia. Pasar con elevación rápida de rodilla a 90°, manteniendo el tobillo en flexión dorsal.',
    commonErrors: 'Echar el tronco hacia atrás para compensar falta de fuerza en el psoas.',
    cues: '«Rodilla al horizonte, tobillo armado a 90°»',
    dosingByCat: {
      'Sub-14': '3 series x 5 vallas (pausa 1:45 min)',
      'Sub-16': '4 series x 6 vallas (pausa 1:30 min)',
      'Sub-18': '5 series x 8 vallas (pausa 2:00 min)'
    },
    dosing: '4 series x 6 vallas con pausa completa (1:30 min).'
  },
  {
    id: 'D-02',
    name: 'Trabajo Propioceptivo en Tobillo Unipodal',
    category: 'Simetría & Tobillo',
    targetDeficit: 'asymmetry',
    difficulty: 'iniciacion',
    difficultyLabel: 'Iniciación',
    goal: 'Corregir asimetrías de apoyo lateral y reforzar los estabilizadores del tobillo.',
    execution: 'Apoyo monopodal sobre superficie inestable (bosu o colchoneta). Mantener equilibrio 20 segundos realizando círculos con brazos.',
    commonErrors: 'Bloquear la rodilla o colapsar el arco plantar medial.',
    cues: '«Presiona con el primer metatarsiano, cadera alta y nivelada»',
    dosingByCat: {
      'Sub-14': '3 series x 20 seg por pierna',
      'Sub-16': '3 series x 25 seg por pierna',
      'Sub-18': '4 series x 30 seg con perturbación externa'
    },
    dosing: '3 series x 25 seg por pierna.'
  },
  {
    id: 'D-03',
    name: 'Salidas Asistidas con Inclinación a 45°',
    category: 'Postura & Tronco',
    targetDeficit: 'trunk_lean',
    difficulty: 'intermedio',
    difficultyLabel: 'Intermedio',
    goal: 'Enseñar la línea de fuerza extendida desde el tobillo hasta la coronilla en los primeros 15 metros.',
    execution: 'El atleta se deja caer hacia adelante manteniendo el cuerpo recto hasta que el compañero libera la resistencia.',
    commonErrors: 'Flexionar la cintura antes del despegue, perdiendo alineación.',
    cues: '«Línea recta talón-nuca, no quiebres la cadera»',
    dosingByCat: {
      'Sub-14': '4 salidas de 10 metros',
      'Sub-16': '5 salidas de 15 metros',
      'Sub-18': '6 salidas de 20 metros'
    },
    dosing: '5 salidas de 15 metros.'
  },
  {
    id: 'D-04',
    name: 'Zancadas Reactivas en Gradas',
    category: 'Impulso & Extensión',
    targetDeficit: 'propulsion',
    difficulty: 'avanzado',
    difficultyLabel: 'Avanzado',
    goal: 'Desarrollar la potencia del glúteo mayor y la triple extensión (tobillo, rodilla y cadera).',
    execution: 'Subir gradas de 2 en 2 con empuje explosivo de la pierna trasera, minimizando el tiempo de contacto.',
    commonErrors: 'Mirar al suelo o apoyar únicamente los dedos del pie.',
    cues: '«Pisa fuerte y despega rápido, el suelo quema»',
    dosingByCat: {
      'Sub-14': '3 repeticiones x 8 gradas',
      'Sub-16': '4 repeticiones x 12 gradas',
      'Sub-18': '5 repeticiones x 16 gradas'
    },
    dosing: '4 repeticiones de 12 gradas.'
  },
  {
    id: 'D-05',
    name: 'Zarpazo Activo en Carrera (Paw-Back Drill)',
    category: 'Recobro de Rodilla',
    targetDeficit: 'overstriding',
    difficulty: 'avanzado',
    difficultyLabel: 'Avanzado',
    goal: 'Eliminar el frenado por sobrezancada (overstriding) tirando activamente del suelo hacia atrás.',
    execution: 'Desde skipping alto, extender la pierna al frente y tirar con violencia hacia abajo y atrás antes del contacto.',
    commonErrors: 'Aterrizar con la pierna totalmente estirada por delante del centro de masa.',
    cues: '«Garras al suelo, el pie ataca de arriba hacia abajo»',
    dosingByCat: {
      'Sub-14': '3 pasadas de 20 metros',
      'Sub-16': '4 pasadas de 30 metros',
      'Sub-18': '5 pasadas de 40 metros'
    },
    dosing: '4 pasadas de 30 metros.'
  },
  {
    id: 'D-06',
    name: 'Skipping Rápido en Frecuencia (Overspeed)',
    category: 'Impulso & Extensión',
    targetDeficit: 'cadence',
    difficulty: 'intermedio',
    difficultyLabel: 'Intermedio',
    goal: 'Aumentar la cadencia de zancada (>3.2 Hz) y reducir el tiempo de contacto con el suelo.',
    execution: 'Skipping con máxima velocidad de pies en un espacio de 10 metros, buscando el mayor número de apoyos por segundo.',
    commonErrors: 'Bajar la altura de las rodillas o balancear el tronco.',
    cues: '«Cadencia ametralladora, contacto elástico y breve»',
    dosingByCat: {
      'Sub-14': '4 pasadas de 8 metros al 100%',
      'Sub-16': '5 pasadas de 10 metros al 100%',
      'Sub-18': '6 pasadas de 12 metros con metrónomo'
    },
    dosing: '5 pasadas de 10 metros con pausa completa.'
  },
  {
    id: 'D-07',
    name: 'Bote de Tobillo Continuo (Pogo Jumps)',
    category: 'Simetría & Tobillo',
    targetDeficit: 'asymmetry',
    difficulty: 'iniciacion',
    difficultyLabel: 'Iniciación',
    goal: 'Mejorar la rigidez tendinosa (stiffness) del tendón de Aquiles y la simetría de despegue.',
    execution: 'Saltos verticales cortos usando casi exclusivamente la articulación del tobillo con piernas casi rectas.',
    commonErrors: 'Doblar excesivamente las rodillas disipando la energía elástica.',
    cues: '«Tobillos de resorte, rodillas firmes y despegue simétrico»',
    dosingByCat: {
      'Sub-14': '3 series x 15 botes',
      'Sub-16': '3 series x 20 botes',
      'Sub-18': '4 series x 25 botes con ritmo metronómico'
    },
    dosing: '3 series de 20 botes rápidos.'
  }
];

// Banda de edad de trabajo (misma regla que el servicio de visión, ADR-018). No es una categoría oficial.
export function bandaDeEdad(edad) {
  const e = Number(edad);
  if (!Number.isFinite(e) || e < 10 || e > 17) return null;
  return e <= 13 ? 'Sub-14' : e <= 15 ? 'Sub-16' : 'Sub-18';
}

export const TIPO_A_DEFICIT = { propulsion: 'propulsion', recobro: 'knee_flexion', simetria: 'asymmetry', contacto: 'overstriding', cadencia: 'cadence' };

/** Ejercicios del catálogo que corresponden a los hallazgos del análisis (sin hallazgos, ninguno). */
export function ejerciciosParaHallazgos(hallazgos, catalogo = CATALOGO_EJERCICIOS) {
  const tipos = new Set((hallazgos || []).map(h => TIPO_A_DEFICIT[h.tipo] || h.tipo));
  return catalogo.filter(d => tipos.has(d.targetDeficit));
}

/** Dosis del ejercicio según la banda de edad; sin banda, la define el entrenador. */
export function dosisPara(ejercicio, banda) {
  return (banda && ejercicio.dosingByCat?.[banda]) || 'Dosis a definir por el entrenador (edad no registrada o fuera de rango)';
}
