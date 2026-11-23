// Inicio del entrenador y Portal del atleta: mismo "último análisis", mismos datos (ADR-023).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ultimoAnalisis, avisosEquipo, SIMETRIA_BAJA } from '../src/services/resumenEquipo.js';
import { resumenDeAnalisis, ultimaSesionConAnalisis } from '../src/services/analisisSesion.js';
import { ejerciciosParaHallazgos, dosisPara, bandaDeEdad } from '../src/services/catalogoEjercicios.js';

const v2 = (ipt, extra = {}) => ({
  ipt_score: ipt, version: '2.0-referenciado', sector_prioritario: 'Sector 2: Recobro',
  desglose_sectores: { simetria_bilateral: { score: 55, variables: [{ variable: 'rodilla_min_balanceo' }] } },
  cinematica_eventos: { variables: { rodilla_min_balanceo: { media: 41.2 } } },
  recomendaciones: { disponible: true, confianza: { nivel: 'alta' }, hallazgos: [] },
  ...extra
});
const sesion = (id, ipt, analysis) => ({ id, sessionDate: '2026-11-19T12:00:00Z', iptScore: ipt, analysis });

test('el último análisis es la sesión más reciente con análisis y se compara con el IPT anterior', () => {
  const r = ultimoAnalisis([sesion(5, 80, v2(80)), sesion(4, 72.5, v2(72.5))]);
  assert.equal(r.session.id, 5);
  assert.equal(r.ipt, 80);
  assert.equal(r.deltaIpt, 7.5);
  assert.equal(r.flexionRodilla, 41.2);          // rodilla mínima del recobro medida por paso
  assert.equal(r.simetria, 55);                  // simetría por pasos alternos (pierna A y B)
  assert.equal(r.sectorPrioritario, 'Sector 2: Recobro');
});

test('una sesión en análisis no reemplaza al último análisis; un análisis sin IPT sí, con su motivo', () => {
  const enCola = sesion(9, null, null);
  const r = ultimoAnalisis([enCola, sesion(4, 72.5, v2(72.5))]);
  assert.equal(r.session.id, 4);
  const trote = sesion(10, null, v2(null, { motivo: 'Sin IPT: ritmo de trote.', recomendaciones: { disponible: false } }));
  const r2 = ultimoAnalisis([trote, sesion(4, 72.5, v2(72.5))]);
  assert.equal(r2.session.id, 10);
  assert.equal(r2.ipt, null);
  assert.equal(r2.motivoSinIpt, 'Sin IPT: ritmo de trote.');
  assert.equal(r2.deltaIpt, null);
  assert.equal(r2.sectorPrioritario, null);      // sin IPT no hay sector "a trabajar"
  assert.equal(ultimoAnalisis([enCola]), null);
  assert.equal(ultimoAnalisis(undefined), null);
});

test('la simetría por rótulos izquierda/derecha de análisis antiguos no se muestra ni genera avisos', () => {
  const antigua = sesion(3, 60.8, { ipt_score: 60.8, summary_metrics: { avg_symmetry_score: 42.5, symmetry_valid: true } });
  const r = ultimoAnalisis([antigua]);
  assert.equal(r.simetria, null);
  assert.deepEqual(avisosEquipo([], { athlete: { id: 1, name: 'A' }, sessions: [antigua] }), []);
});

test('avisos: hallazgos de la técnica primero, luego calidad, video sin IPT y consentimientos', () => {
  const athletes = [
    { id: 2, name: 'Atleta Prueba UI', canEdit: true, consent: true },
    { id: 3, name: 'Segundo Atleta UI', canEdit: true, consent: false },
    { id: 7, name: 'Atleta de otro entrenador', canEdit: false, consent: false }
  ];
  const conHallazgos = sesion(6, 58, v2(58, { recomendaciones: { disponible: true, confianza: { nivel: 'baja' }, hallazgos: [
    { id: 'simetria_x', tipo: 'simetria', titulo: 'Diferencia entre piernas' },
    { id: 'rodilla_min_balanceo', tipo: 'recobro', titulo: 'Rodilla mínima en el recobro fuera del rango de referencia' }] } }));
  const avisos = avisosEquipo(athletes, { athlete: athletes[0], sessions: [conHallazgos] });
  assert.deepEqual(avisos.map(a => [a.nombre, a.tipo, a.tono]), [
    ['Atleta Prueba UI', 'simetria', 'alto'],
    ['Atleta Prueba UI', 'hallazgo', 'alto'],
    ['Atleta Prueba UI', 'confianza', 'medio'],
    ['Segundo Atleta UI', 'consentimiento', 'medio']
  ]);
  assert.equal(avisos[1].texto, 'Rodilla mínima en el recobro fuera del rango de referencia');
  const sinIpt = sesion(10, null, v2(null, { recomendaciones: { disponible: false, confianza: { nivel: 'media' } } }));
  assert.deepEqual(avisosEquipo([], { athlete: athletes[0], sessions: [sinIpt] }).map(a => a.tipo), ['simetria', 'sin_ipt']);
});

test(`una simetría entre pasos de ${SIMETRIA_BAJA} pts o más, sin hallazgos, no genera aviso`, () => {
  const ok = sesion(5, 80, v2(80, { desglose_sectores: { simetria_bilateral: { score: SIMETRIA_BAJA, variables: [{}] } } }));
  assert.deepEqual(avisosEquipo([], { athlete: { id: 1, name: 'A' }, sessions: [ok] }), []);
});

test('el atleta y el entrenador ven los mismos hallazgos y los mismos ejercicios del catálogo', () => {
  const hallazgos = [{ id: 'distancia_relativa_contacto', tipo: 'contacto', titulo: 'Pie por delante…' },
                     { id: 'rodilla_min_balanceo', tipo: 'recobro', titulo: 'Rodilla mínima…' }];
  const s = sesion(8, 61, v2(61, { recomendaciones: { disponible: true, hallazgos } }));
  // Portal: lee el último análisis desde latestAnalysis; Inicio/Ejercicios: desde la lista de sesiones.
  const portal = resumenDeAnalisis({ analysis: s.analysis });
  const entrenador = resumenDeAnalisis(ultimaSesionConAnalisis([sesion(9, null, null), s]));
  assert.deepEqual(portal.hallazgos, entrenador.hallazgos);
  assert.equal(portal.ipt, entrenador.ipt);
  const ej = ejerciciosParaHallazgos(portal.hallazgos).map(d => d.id);
  assert.ok(ej.includes('D-05'), 'sobrezancada -> zarpazo');
  assert.ok(ej.includes('D-01'), 'recobro -> skipping A');
  assert.deepEqual(ejerciciosParaHallazgos([]), []);              // sin hallazgos no se sugieren ejercicios
  assert.match(dosisPara({ dosingByCat: { 'Sub-16': '3x8' } }, bandaDeEdad(15)), /3x8/);
  assert.match(dosisPara({ dosingByCat: {} }, bandaDeEdad(30)), /entrenador/);
});

test('pendientes del equipo: vencidos y revisiones como avisos, y totales solo de atletas propios', async () => {
  const { totalesEquipo } = await import('../src/services/resumenEquipo.js');
  const atletas = [
    { id: 1, name: 'A', canEdit: true, consent: true, pendingReviews: 2, overdueTasks: 1, queuedVideos: 1, lastAnalysisAt: new Date().toISOString() },
    { id: 2, name: 'B', canEdit: false, consent: true, pendingReviews: 5, overdueTasks: 3, queuedVideos: 2 }
  ];
  const avisos = avisosEquipo(atletas, null);
  assert.deepEqual(avisos.map(a => a.tipo), ['vencidos', 'revision']);
  assert.equal(avisos[0].tono, 'alto');
  assert.match(avisos[1].texto, /2 sesiones analizadas/);
  assert.deepEqual(totalesEquipo(atletas), { atletas: 1, revisiones: 2, vencidos: 1, enCola: 1, activos30d: 1 });
});

test('la diferencia con el análisis anterior solo usa la misma versión del IPT', () => {
  const v3 = ipt => ({ ipt_score: ipt, version: '3.0-perfil', recomendaciones: { disponible: true, hallazgos: [] } });
  const r = ultimoAnalisis([sesion(9, 89.8, v3(89.8)), sesion(8, 60.8, v2(60.8)), sesion(7, 85.6, v3(85.6))]);
  assert.equal(r.deltaIpt, 4.2);
  assert.equal(ultimoAnalisis([sesion(9, 89.8, v3(89.8)), sesion(8, 60.8, v2(60.8))]).deltaIpt, null);
});
