const assert = require('assert');
const app = require('../src/app');
const dbRepository = require('../src/db/repository');
const http = require('http');

// Simple helper to simulate requests against express app
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
  console.log('🧪 Ejecutando Suite de Pruebas T-04 (Autenticación & Aislamiento por Entrenador)...\n');
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
    // Entrenador A crea atleta Martín
    const regA = await makeRequest(app, 'POST', '/api/auth/register', {}, {
      name: 'Entrenador A',
      email: 'entrenadora@uct.cl',
      password: 'password123'
    });

    await makeRequest(app, 'POST', '/api/athletes', {
      'Authorization': `Bearer ${regA.body.token}`
    }, { name: 'Martín Atleta', age: 15, consent: true });

    // Entrenador B consulta sus atletas
    const regB = await makeRequest(app, 'POST', '/api/auth/register', {}, {
      name: 'Entrenador B',
      email: 'entrenadorb@uct.cl',
      password: 'password123'
    });

    const resB = await makeRequest(app, 'GET', '/api/athletes', {
      'Authorization': `Bearer ${regB.body.token}`
    });

    assert.strictEqual(resB.statusCode, 200);
    assert.strictEqual(resB.body.athletes.length, 0, 'Entrenador B no debe ver atletas de A');
  });

  // PRUEBA 6
  await test('Prueba 6: Rechazo con 403 al intentar acceder al ID de un atleta de otro entrenador', async () => {
    const regA = await makeRequest(app, 'POST', '/api/auth/register', {}, {
      name: 'Entrenador A',
      email: 'entrenadora2@uct.cl',
      password: 'password123'
    });

    const createRes = await makeRequest(app, 'POST', '/api/athletes', {
      'Authorization': `Bearer ${regA.body.token}`
    }, { name: 'Javiera Soto', age: 16, consent: true });

    const athleteId = createRes.body.athlete.id;

    const regB = await makeRequest(app, 'POST', '/api/auth/register', {}, {
      name: 'Entrenador B',
      email: 'entrenadorb2@uct.cl',
      password: 'password123'
    });

    const resB = await makeRequest(app, 'GET', `/api/athletes/${athleteId}`, {
      'Authorization': `Bearer ${regB.body.token}`
    });

    assert.strictEqual(resB.statusCode, 403);
    assert.ok(resB.body.error.includes('Acceso denegado'));
  });

  console.log(`\n📊 Resumen de pruebas: ${passed} pasadas, ${failed} falladas.`);
  if (failed > 0) process.exit(1);
}

runTests();
