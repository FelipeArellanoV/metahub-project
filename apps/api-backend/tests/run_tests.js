/**
 * =========================================================================================
 * PROYECTO METAHUB — SEGUIMIENTO LONGITUDINAL DE LA TÉCNICA DE CARRERA EN ATLETISMO ESCOLAR
 * Escuela de Ingeniería Civil en Informática — Universidad Católica de Temuco
 * 
 * Memoria / Trabajo de Título:
 * Autores: Felipe Arellano Vargas & Sofía Henríquez Soto
 * Profesor Guía: Dr. Marcos Lévano
 * 
 * Módulo: Suite de Pruebas Automatizadas de Integración Backend (run_tests.js)
 * Descripción: Suite de pruebas de regresión que valida sin dependencias externas:
 *              1. Registro y emisión de tokens JWT bajo salting bcrypt (RNF03).
 *              2. Autenticación, control de acceso y denegación de credenciales erróneas.
 *              3. Protección de endpoints y aislamiento estricto de atletas por entrenador (HU-04).
 *              4. Ciclo de vida CRUD completo de atletas y registro de sesiones de carrera.
 * =========================================================================================
 */

const assert = require('assert');
const { EventEmitter } = require('events');
const app = require('../src/app');
const dbRepository = require('../src/db/repository');

function makeRequest(app, method, url, headers = {}, body = null) {
  return new Promise((resolve) => {
    const req = new EventEmitter();
    req.method = method;
    req.url = url;
    req.headers = {};
    for (const [k, v] of Object.entries(headers)) {
      req.headers[k.toLowerCase()] = v;
    }

    const res = new EventEmitter();
    res.statusCode = 200;
    res._headers = {};
    res.setHeader = function(k, v) { res._headers[k.toLowerCase()] = v; };
    res.getHeader = function(k) { return res._headers[k.toLowerCase()]; };

    let responseText = '';
    res.end = function(chunk) {
      if (chunk) responseText += chunk.toString();
      let parsed = responseText;
      try {
        parsed = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        parsed = responseText;
      }
      resolve({ statusCode: res.statusCode, body: parsed });
    };

    // Ejecutar app handler
    app(req, res);

    // Emitir eventos data y end en el siguiente tick para dar tiempo a registrar los listeners
    process.nextTick(() => {
      if (body && (method === 'POST' || method === 'PUT')) {
        const payload = typeof body === 'string' ? body : JSON.stringify(body);
        req.emit('data', Buffer.from(payload));
      }
      req.emit('end');
    });
  });
}

async function runTests() {
  console.log('🧪 Ejecutando Suite Completa de Pruebas Backend MetaHub (T-04 & T-09)...\n');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    dbRepository.reset();
    try {
      await fn();
      console.log(`  ✅ PASÓ: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FALLÓ: ${name}`);
      console.error(`     Error: ${err.message}\n`);
      failed++;
    }
  }

  // PRUEBA 1
  await test('Prueba 1: Registro de entrenador y generación de JWT', async () => {
    const res = await makeRequest(app, 'POST', '/api/auth/register', {}, {
      name: 'Felipe Arellano',
      email: 'felipe@uct.cl',
      password: 'password123',
      role: 'entrenador'
    });
    assert.strictEqual(res.statusCode, 201);
    assert.ok(res.body.token, 'Debe incluir token JWT');
    assert.strictEqual(res.body.user.email, 'felipe@uct.cl');
    assert.strictEqual(res.body.user.passwordHash, undefined, 'No debe retornar hash de contraseña');
  });

  // PRUEBA 2
  await test('Prueba 2: Login con credenciales válidas', async () => {
    await makeRequest(app, 'POST', '/api/auth/register', {}, {
      name: 'Sofía Henríquez',
      email: 'sofia@uct.cl',
      password: 'secretoSeguro123'
    });

    const loginRes = await makeRequest(app, 'POST', '/api/auth/login', {}, {
      email: 'sofia@uct.cl',
      password: 'secretoSeguro123'
    });

    assert.strictEqual(loginRes.statusCode, 200);
    assert.ok(loginRes.body.token);
    assert.strictEqual(loginRes.body.user.name, 'Sofía Henríquez');
  });

  // PRUEBA 3
  await test('Prueba 3: Denegación de acceso con contraseña incorrecta (401)', async () => {
    await makeRequest(app, 'POST', '/api/auth/register', {}, {
      name: 'Marcos Levano',
      email: 'marcos@uct.cl',
      password: 'claveCorrecta123'
    });

    const res = await makeRequest(app, 'POST', '/api/auth/login', {}, {
      email: 'marcos@uct.cl',
      password: 'claveIncorrecta'
    });

    assert.strictEqual(res.statusCode, 401);
    assert.ok(res.body.error.includes('Credenciales inválidas'));
  });

  // PRUEBA 4
  await test('Prueba 4: Protección de rutas sin token JWT (401)', async () => {
    const res = await makeRequest(app, 'GET', '/api/athletes');
    assert.strictEqual(res.statusCode, 401);
    assert.ok(res.body.error.includes('Token JWT requerido'));
  });

  // PRUEBA 5
  await test('Prueba 5: Un entrenador NO debe ver los atletas creados por otro entrenador', async () => {
    const regA = await makeRequest(app, 'POST', '/api/auth/register', {}, {
      name: 'Entrenador A',
      email: 'entrenadora@uct.cl',
      password: 'password123'
    });

    await makeRequest(app, 'POST', '/api/athletes', {
      'authorization': `Bearer ${regA.body.token}`
    }, { name: 'Martín Atleta', age: 15, consent: true });

    const regB = await makeRequest(app, 'POST', '/api/auth/register', {}, {
      name: 'Entrenador B',
      email: 'entrenadorb@uct.cl',
      password: 'password123'
    });

    const resB = await makeRequest(app, 'GET', '/api/athletes', {
      'authorization': `Bearer ${regB.body.token}`
    });

    assert.strictEqual(resB.statusCode, 200);
    assert.strictEqual(resB.body.athletes.length, 0);
  });

  // PRUEBA 6
  await test('Prueba 6: Actualizar (PUT) y Eliminar (DELETE) atleta de forma segura', async () => {
    const reg = await makeRequest(app, 'POST', '/api/auth/register', {}, {
      name: 'Entrenador C',
      email: 'entrenadorc@uct.cl',
      password: 'password123'
    });
    const token = reg.body.token;

    const createRes = await makeRequest(app, 'POST', '/api/athletes', {
      'authorization': `Bearer ${token}`
    }, { name: 'Atleta Prueba', age: 14, consent: false });

    const athleteId = createRes.body.athlete.id;

    // Actualizar (PUT)
    const updateRes = await makeRequest(app, 'PUT', `/api/athletes/${athleteId}`, {
      'authorization': `Bearer ${token}`
    }, { name: 'Atleta Editado', age: 15, consent: true });

    assert.strictEqual(updateRes.statusCode, 200);
    assert.strictEqual(updateRes.body.athlete.name, 'Atleta Editado');

    // Eliminar (DELETE)
    const deleteRes = await makeRequest(app, 'DELETE', `/api/athletes/${athleteId}`, {
      'authorization': `Bearer ${token}`
    });

    assert.strictEqual(deleteRes.statusCode, 200);

    // Verificar borrado
    const getRes = await makeRequest(app, 'GET', `/api/athletes/${athleteId}`, {
      'authorization': `Bearer ${token}`
    });

    assert.strictEqual(getRes.statusCode, 404);
  });

  // PRUEBA 7
  await test('Prueba 7: Registro y obtención de sesiones de carrera', async () => {
    const reg = await makeRequest(app, 'POST', '/api/auth/register', {}, {
      name: 'Entrenador D',
      email: 'entrenadord@uct.cl',
      password: 'password123'
    });
    const token = reg.body.token;

    const athleteRes = await makeRequest(app, 'POST', '/api/athletes', {
      'authorization': `Bearer ${token}`
    }, { name: 'Javiera Soto', age: 16, consent: true });

    const athleteId = athleteRes.body.athlete.id;

    const sessionRes = await makeRequest(app, 'POST', '/api/sessions', {
      'authorization': `Bearer ${token}`
    }, { athleteId, notes: 'Evaluación técnica de carrera' });

    assert.strictEqual(sessionRes.statusCode, 201);
    assert.strictEqual(sessionRes.body.session.athleteId, athleteId);

    const listRes = await makeRequest(app, 'GET', `/api/athletes/${athleteId}/sessions`, {
      'authorization': `Bearer ${token}`
    });

    assert.strictEqual(listRes.statusCode, 200);
    assert.strictEqual(listRes.body.sessions.length, 1);
  });

  // PRUEBA 8
  await test('Prueba 8: Obtención global de sesiones del entrenador (GET /api/sessions) y conteo en atletas', async () => {
    const reg = await makeRequest(app, 'POST', '/api/auth/register', {}, {
      name: 'Entrenador E',
      email: 'entrenadore@uct.cl',
      password: 'password123'
    });
    const token = reg.body.token;

    const ath1 = await makeRequest(app, 'POST', '/api/athletes', {
      'authorization': `Bearer ${token}`
    }, { name: 'Atleta Uno', age: 15, consent: true });

    const ath2 = await makeRequest(app, 'POST', '/api/athletes', {
      'authorization': `Bearer ${token}`
    }, { name: 'Atleta Dos', age: 16, consent: true });

    await makeRequest(app, 'POST', '/api/sessions', {
      'authorization': `Bearer ${token}`
    }, { athleteId: ath1.body.athlete.id, notes: 'Sesion 1' });

    await makeRequest(app, 'POST', '/api/sessions', {
      'authorization': `Bearer ${token}`
    }, { athleteId: ath2.body.athlete.id, notes: 'Sesion 2' });

    const allSessionsRes = await makeRequest(app, 'GET', '/api/sessions', {
      'authorization': `Bearer ${token}`
    });

    assert.strictEqual(allSessionsRes.statusCode, 200);
    assert.strictEqual(allSessionsRes.body.sessions.length, 2);
    assert.strictEqual(allSessionsRes.body.sessions[0].athleteName, 'Atleta Dos');

    const athletesRes = await makeRequest(app, 'GET', '/api/athletes', {
      'authorization': `Bearer ${token}`
    });
    assert.strictEqual(athletesRes.statusCode, 200);
    assert.strictEqual(athletesRes.body.athletes[0].sessionCount, 1);
  });

  // =======================================================================================
  // ROL ATLETA REAL: cuentas, aislamiento de datos y progreso calculado desde sesiones
  // =======================================================================================
  const { computeProgress } = require('../src/services/progress');

  const bearer = (token) => ({ authorization: `Bearer ${token}` });

  async function registerCoach(email = 'coach@uct.cl') {
    const reg = await makeRequest(app, 'POST', '/api/auth/register', {}, {
      name: 'Entrenador', email, password: 'password123'
    });
    return reg.body.token;
  }

  function fakeCvResult(ipt, symmetry = 95) {
    return {
      status: 'success',
      video_info: { duration_seconds: 3, fps: 30, detection_rate_pct: 100, filename: 'x.mp4' },
      summary_metrics: { avg_symmetry_score: symmetry },
      ipt_evaluation: {
        ipt_score: ipt,
        categoria: 'En Perfeccionamiento',
        badge: 'NIVEL II',
        sector_prioritario: 'Sector 2: Recobro',
        prescripcion_completa: { ejercicios: [{ nombre: 'Skipping A' }] }
      },
      // Datos pesados que NO deben persistirse
      frames: new Array(50).fill({ landmarks: new Array(33).fill({ x: 0.1, y: 0.2 }) })
    };
  }

  await test('Prueba 11: El entrenador crea un atleta con cuenta y este puede iniciar sesión como rol atleta', async () => {
    const coach = await registerCoach();
    const res = await makeRequest(app, 'POST', '/api/athletes', bearer(coach), {
      name: 'Martin Real', age: 15, consent: true, email: 'martin.real@uct.cl', password: 'temporal123'
    });
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.athlete.hasAccount, true);
    assert.strictEqual(JSON.stringify(res.body).includes('temporal123'), false, 'No debe devolver la contraseña');

    const login = await makeRequest(app, 'POST', '/api/auth/login', {}, {
      email: 'martin.real@uct.cl', password: 'temporal123'
    });
    assert.strictEqual(login.statusCode, 200);
    assert.strictEqual(login.body.user.role, 'atleta');
  });

  await test('Prueba 12: No se crea cuenta de atleta sin consentimiento parental (y no queda usuario huérfano)', async () => {
    const coach = await registerCoach();
    const res = await makeRequest(app, 'POST', '/api/athletes', bearer(coach), {
      name: 'Sin Consentimiento', age: 14, consent: false, email: 'sc@uct.cl', password: 'temporal123'
    });
    assert.strictEqual(res.statusCode, 400);
    const login = await makeRequest(app, 'POST', '/api/auth/login', {}, { email: 'sc@uct.cl', password: 'temporal123' });
    assert.strictEqual(login.statusCode, 401);
  });

  await test('Prueba 13: Correo duplicado rechazado sin dejar ficha creada', async () => {
    const coach = await registerCoach();
    await makeRequest(app, 'POST', '/api/athletes', bearer(coach), {
      name: 'Uno', age: 15, consent: true, email: 'dup@uct.cl', password: 'temporal123'
    });
    const dup = await makeRequest(app, 'POST', '/api/athletes', bearer(coach), {
      name: 'Dos', age: 15, consent: true, email: 'dup@uct.cl', password: 'temporal123'
    });
    assert.strictEqual(dup.statusCode, 400);
    const list = await makeRequest(app, 'GET', '/api/athletes', bearer(coach));
    assert.strictEqual(list.body.athletes.length, 1);
  });

  await test('Prueba 14: El token de atleta no accede a rutas del entrenador (403) ni el de entrenador al portal (403)', async () => {
    const coach = await registerCoach();
    await makeRequest(app, 'POST', '/api/athletes', bearer(coach), {
      name: 'Ana', age: 15, consent: true, email: 'ana@uct.cl', password: 'temporal123'
    });
    const athTok = (await makeRequest(app, 'POST', '/api/auth/login', {}, { email: 'ana@uct.cl', password: 'temporal123' })).body.token;

    assert.strictEqual((await makeRequest(app, 'GET', '/api/athletes', bearer(athTok))).statusCode, 403);
    assert.strictEqual((await makeRequest(app, 'GET', '/api/sessions', bearer(athTok))).statusCode, 403);
    assert.strictEqual((await makeRequest(app, 'POST', '/api/sessions', bearer(athTok), { athleteId: 1 })).statusCode, 403);
    assert.strictEqual((await makeRequest(app, 'GET', '/api/portal/me', bearer(coach))).statusCode, 403);
    assert.strictEqual((await makeRequest(app, 'GET', '/api/portal/me')).statusCode, 401);
  });

  await test('Prueba 15: Una sesión guarda el IPT y un resumen sin los cuadros del video', async () => {
    const coach = await registerCoach();
    const ath = await makeRequest(app, 'POST', '/api/athletes', bearer(coach), {
      name: 'Beto', age: 15, consent: true, email: 'beto@uct.cl', password: 'temporal123'
    });
    const created = await makeRequest(app, 'POST', '/api/sessions', bearer(coach), {
      athleteId: ath.body.athlete.id, analysis: fakeCvResult(79.84)
    });
    assert.strictEqual(created.statusCode, 201);
    assert.strictEqual(created.body.session.iptScore, 79.8);

    const bad = await makeRequest(app, 'POST', '/api/sessions', bearer(coach), {
      athleteId: ath.body.athlete.id, analysis: { ipt_evaluation: { ipt_score: 250 } }
    });
    assert.strictEqual(bad.statusCode, 400);

    const athTok = (await makeRequest(app, 'POST', '/api/auth/login', {}, { email: 'beto@uct.cl', password: 'temporal123' })).body.token;
    const portal = await makeRequest(app, 'GET', '/api/portal/me', bearer(athTok));
    assert.strictEqual(portal.statusCode, 200);
    assert.strictEqual(portal.body.latestAnalysis.ipt_score, 79.84);
    assert.strictEqual(portal.body.latestAnalysis.frames, undefined, 'No se deben persistir los cuadros');
  });

  await test('Prueba 16: Cada atleta ve únicamente sus propios datos en el portal', async () => {
    const coach = await registerCoach();
    const a = await makeRequest(app, 'POST', '/api/athletes', bearer(coach), {
      name: 'Atleta A', age: 15, consent: true, email: 'a@uct.cl', password: 'temporal123'
    });
    const b = await makeRequest(app, 'POST', '/api/athletes', bearer(coach), {
      name: 'Atleta B', age: 16, consent: true, email: 'b@uct.cl', password: 'temporal123'
    });
    await makeRequest(app, 'POST', '/api/sessions', bearer(coach), { athleteId: a.body.athlete.id, analysis: fakeCvResult(70) });
    await makeRequest(app, 'POST', '/api/sessions', bearer(coach), { athleteId: a.body.athlete.id, analysis: fakeCvResult(80) });
    await makeRequest(app, 'POST', '/api/sessions', bearer(coach), { athleteId: b.body.athlete.id, analysis: fakeCvResult(92) });

    const tokA = (await makeRequest(app, 'POST', '/api/auth/login', {}, { email: 'a@uct.cl', password: 'temporal123' })).body.token;
    const tokB = (await makeRequest(app, 'POST', '/api/auth/login', {}, { email: 'b@uct.cl', password: 'temporal123' })).body.token;

    const pa = (await makeRequest(app, 'GET', '/api/portal/me', bearer(tokA))).body;
    const pb = (await makeRequest(app, 'GET', '/api/portal/me', bearer(tokB))).body;
    assert.strictEqual(pa.athlete.name, 'Atleta A');
    assert.strictEqual(pa.sessions.length, 2);
    assert.strictEqual(pa.progress.deltaIpt, 10);
    assert.strictEqual(pb.athlete.name, 'Atleta B');
    assert.strictEqual(pb.sessions.length, 1);
    assert.strictEqual(pb.progress.bestIpt, 92);
  });

  await test('Prueba 17: Eliminar al atleta elimina también su cuenta de acceso', async () => {
    const coach = await registerCoach();
    const ath = await makeRequest(app, 'POST', '/api/athletes', bearer(coach), {
      name: 'Temporal', age: 15, consent: true, email: 'tmp@uct.cl', password: 'temporal123'
    });
    await makeRequest(app, 'DELETE', `/api/athletes/${ath.body.athlete.id}`, bearer(coach));
    const login = await makeRequest(app, 'POST', '/api/auth/login', {}, { email: 'tmp@uct.cl', password: 'temporal123' });
    assert.strictEqual(login.statusCode, 401);
  });

  await test('Prueba 18: XP, nivel y medallas se calculan solo con datos reales', async () => {
    const empty = computeProgress([]);
    assert.strictEqual(empty.xp, 0);
    assert.strictEqual(empty.level, 1);
    assert.ok(empty.medals.every(m => !m.earned), 'Sin sesiones no hay medallas');

    const sessions = [
      { id: 1, sessionDate: '2026-01-01T10:00:00Z', iptScore: 70 },
      { id: 2, sessionDate: '2026-01-08T10:00:00Z', iptScore: 78 },
      { id: 3, sessionDate: '2026-01-15T10:00:00Z', iptScore: 75 } // baja: no resta XP
    ];
    const p = computeProgress(sessions, { summary_metrics: { avg_symmetry_score: 93 } });
    assert.strictEqual(p.sessionCount, 3);
    assert.strictEqual(p.xp, 3 * 100 + 8 * 20);
    assert.strictEqual(p.deltaIpt, 5);
    const earned = p.medals.filter(m => m.earned).map(m => m.id);
    assert.ok(earned.includes('first_session') && earned.includes('ipt_75') && earned.includes('improvement') && earned.includes('symmetry'));
    assert.ok(!earned.includes('ipt_90') && !earned.includes('consistency'));
  });

  await test('Prueba 19: Registro de atleta con birthDate y cálculo dinámico de age', async () => {
    const coach = await registerCoach();
    // Atleta nacido en 2011-04-18
    const ath = await makeRequest(app, 'POST', '/api/athletes', bearer(coach), {
      name: 'Estudiante Biomecánico',
      birthDate: '2011-04-18',
      consent: true
    });
    assert.strictEqual(ath.statusCode, 201);
    assert.strictEqual(ath.body.athlete.birthDate, '2011-04-18');
    assert.strictEqual(ath.body.athlete.age, 15);

    // Actualizar birthDate a 2010
    const upd = await makeRequest(app, 'PUT', `/api/athletes/${ath.body.athlete.id}`, bearer(coach), {
      birthDate: '2010-04-18'
    });
    assert.strictEqual(upd.statusCode, 200);
    assert.strictEqual(upd.body.athlete.age, 16);
  });

  await test('Prueba 20: Gestión formal de Consentimientos Informados (CU-07 / HU-10)', async () => {
    const coach = await registerCoach();
    const ath = await makeRequest(app, 'POST', '/api/athletes', bearer(coach), {
      name: 'Atleta con Consentimiento',
      age: 14,
      consent: true
    });
    const athleteId = ath.body.athlete.id;

    // Verificar consulta de consentimiento
    const consRes = await makeRequest(app, 'GET', `/api/athletes/${athleteId}/consents`, bearer(coach));
    assert.strictEqual(consRes.statusCode, 200);
    assert.strictEqual(consRes.body.hasValidConsent, true);
    assert.ok(consRes.body.consents.length >= 1);

    // Revocar consentimiento
    const revokeRes = await makeRequest(app, 'POST', `/api/athletes/${athleteId}/consents`, bearer(coach), {
      status: 'revoked',
      notes: 'Revocación por parte del apoderado'
    });
    assert.strictEqual(revokeRes.statusCode, 201);

    // Validar que ahora no está habilitado para captura
    const validRes = await makeRequest(app, 'GET', `/api/athletes/${athleteId}/consents`, bearer(coach));
    assert.strictEqual(validRes.body.hasValidConsent, false);
  });

  console.log(`\n📊 Resumen de pruebas: ${passed} pasadas, ${failed} falladas.`);
  if (failed > 0) process.exit(1);
}

runTests();
