const assert = require('assert');
const app = require('../src/app');
const dbRepository = require('../src/db/repository');
const http = require('http');

function makeRequest(app, method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const payload = body ? JSON.stringify(body) : '';
      
      const reqHeaders = {
        'Content-Type': 'application/json',
        ...headers
      };
      if (body) {
        reqHeaders['Content-Length'] = Buffer.byteLength(payload);
      }

      const req = http.request({
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: reqHeaders
      }, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
          server.close();
          try {
            const parsed = responseData ? JSON.parse(responseData) : {};
            resolve({ statusCode: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ statusCode: res.statusCode, body: responseData });
          }
        });
      });

      req.on('error', (err) => {
        server.close();
        reject(err);
      });

      if (body) {
        req.write(payload);
      }
      req.end();
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
      'Authorization': `Bearer ${regA.body.token}`
    }, { name: 'Martín Atleta', age: 15, consent: true });

    const regB = await makeRequest(app, 'POST', '/api/auth/register', {}, {
      name: 'Entrenador B',
      email: 'entrenadorb@uct.cl',
      password: 'password123'
    });

    const resB = await makeRequest(app, 'GET', '/api/athletes', {
      'Authorization': `Bearer ${regB.body.token}`
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
      'Authorization': `Bearer ${token}`
    }, { name: 'Atleta Prueba', age: 14, consent: false });

    const athleteId = createRes.body.athlete.id;

    // Actualizar (PUT)
    const updateRes = await makeRequest(app, 'PUT', `/api/athletes/${athleteId}`, {
      'Authorization': `Bearer ${token}`
    }, { name: 'Atleta Editado', age: 15, consent: true });

    assert.strictEqual(updateRes.statusCode, 200);
    assert.strictEqual(updateRes.body.athlete.name, 'Atleta Editado');

    // Eliminar (DELETE)
    const deleteRes = await makeRequest(app, 'DELETE', `/api/athletes/${athleteId}`, {
      'Authorization': `Bearer ${token}`
    });

    assert.strictEqual(deleteRes.statusCode, 200);

    // Verificar borrado
    const getRes = await makeRequest(app, 'GET', `/api/athletes/${athleteId}`, {
      'Authorization': `Bearer ${token}`
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
      'Authorization': `Bearer ${token}`
    }, { name: 'Javiera Soto', age: 16, consent: true });

    const athleteId = athleteRes.body.athlete.id;

    const sessionRes = await makeRequest(app, 'POST', '/api/sessions', {
      'Authorization': `Bearer ${token}`
    }, { athleteId, notes: 'Evaluación técnica de carrera' });

    assert.strictEqual(sessionRes.statusCode, 201);
    assert.strictEqual(sessionRes.body.session.athleteId, athleteId);

    const listRes = await makeRequest(app, 'GET', `/api/athletes/${athleteId}/sessions`, {
      'Authorization': `Bearer ${token}`
    });

    assert.strictEqual(listRes.statusCode, 200);
    assert.strictEqual(listRes.body.sessions.length, 1);
  });

  console.log(`\n📊 Resumen de pruebas: ${passed} pasadas, ${failed} falladas.`);
  if (failed > 0) process.exit(1);
}

runTests();
