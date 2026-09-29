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

  console.log(`\n📊 Resumen de pruebas: ${passed} pasadas, ${failed} falladas.`);
  if (failed > 0) process.exit(1);
}

runTests();
