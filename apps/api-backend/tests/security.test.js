// Revisión de seguridad: límites de tasa, validación de entradas, encabezados, CORS,
// errores sin detalles internos y flujo de consentimiento de menores.
process.env.NODE_ENV = 'test';
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const app = require('../src/app');
const repo = require('../src/db/repository');
const rateLimit = require('../src/services/rateLimit');
const security = require('../src/config/security');
const { sign, verify } = require('../src/config/jwt');

function request(method, url, { headers = {}, body = null, ip = '203.0.113.7' } = {}) {
  return new Promise(resolve => {
    const req = new EventEmitter();
    req.method = method; req.url = url; req.headers = {};
    req.socket = { remoteAddress: ip };
    req.resume = () => {}; req.pipe = () => req;
    for (const [k, v] of Object.entries(headers)) req.headers[k.toLowerCase()] = v;
    const res = new EventEmitter();
    res.statusCode = 200; res.headers = {}; res.headersSent = false;
    res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
    res.getHeader = k => res.headers[k.toLowerCase()];
    res.destroy = () => resolve({ statusCode: res.statusCode, headers: res.headers, body: null });
    res.end = chunk => {
      let parsed = chunk ? chunk.toString() : '';
      try { parsed = parsed ? JSON.parse(parsed) : {}; } catch { /* texto */ }
      resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed });
    };
    app(req, res);
    process.nextTick(() => {
      if (body !== null) req.emit('data', Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)));
      req.emit('end');
    });
  });
}
const json = (method, url, body, extra = {}) => request(method, url, { ...extra, body, headers: { 'content-type': 'application/json', ...(extra.headers || {}) } });
const bearer = token => ({ headers: { authorization: 'Bearer ' + token } });

async function coach(email = 'coach' + Math.random().toString(36).slice(2) + '@uct.cl') {
  const r = await json('POST', '/api/auth/register', { name: 'Entrenadora', email, password: 'claveSegura123' });
  assert.equal(r.statusCode, 201, JSON.stringify(r.body));
  return r.body.token;
}

beforeEach(() => { repo.reset(); rateLimit.resetAll(); delete process.env.CORS_ORIGINS; });

// ---------------------------------------------------------------- autenticación
test('Login: ya no existe la contraseña maestra "password123"/"123456"', async () => {
  await coach('victima@uct.cl');
  for (const password of ['password123', '123456']) {
    const r = await json('POST', '/api/auth/login', { email: 'victima@uct.cl', password });
    assert.equal(r.statusCode, 401, 'la contraseña ' + password + ' no debe abrir cuentas ajenas');
  }
});

test('Login: tras 5 intentos fallidos para la misma cuenta responde 429 con Retry-After', async () => {
  await coach('ana@uct.cl');
  for (let i = 0; i < 5; i++) {
    const r = await json('POST', '/api/auth/login', { email: 'ana@uct.cl', password: 'incorrecta' + i });
    assert.equal(r.statusCode, 401);
  }
  const blocked = await json('POST', '/api/auth/login', { email: 'ana@uct.cl', password: 'claveSegura123' });
  assert.equal(blocked.statusCode, 429);
  assert.ok(Number(blocked.headers['retry-after']) > 0);
  // Otra IP no queda bloqueada por los intentos de la primera.
  const other = await json('POST', '/api/auth/login', { email: 'ana@uct.cl', password: 'claveSegura123' }, { ip: '198.51.100.20' });
  assert.equal(other.statusCode, 200);
});

test('Login: un inicio correcto reinicia el contador de la cuenta', async () => {
  await coach('beto@uct.cl');
  for (let i = 0; i < 4; i++) await json('POST', '/api/auth/login', { email: 'beto@uct.cl', password: 'mala' });
  assert.equal((await json('POST', '/api/auth/login', { email: 'beto@uct.cl', password: 'claveSegura123' })).statusCode, 200);
  for (let i = 0; i < 4; i++) assert.equal((await json('POST', '/api/auth/login', { email: 'beto@uct.cl', password: 'mala' })).statusCode, 401);
});

test('Login: el límite por IP frena el barrido de muchas cuentas', async () => {
  let last;
  for (let i = 0; i < 31; i++) last = await json('POST', '/api/auth/login', { email: `x${i}@uct.cl`, password: 'cualquiera1' });
  assert.equal(last.statusCode, 429);
});

test('Registro: valida tipos, formato de correo y largo de contraseña', async () => {
  const cases = [
    { name: 'Ana', email: 'no-es-correo', password: 'claveSegura123' },
    { name: 'Ana', email: 'ana@uct.cl', password: 'corta' },
    { name: { $gt: '' }, email: 'ana@uct.cl', password: 'claveSegura123' },
    { name: 'A'.repeat(101), email: 'ana@uct.cl', password: 'claveSegura123' },
    { name: 'Ana', email: 'ana@uct.cl', password: 'x'.repeat(129) }
  ];
  for (const body of cases) {
    const r = await json('POST', '/api/auth/register', body);
    assert.equal(r.statusCode, 400, JSON.stringify(body).slice(0, 60));
  }
});

test('Registro: límite de registros por IP', async () => {
  let last;
  for (let i = 0; i < 11; i++) last = await json('POST', '/api/auth/register', { name: 'Ana', email: `r${i}@uct.cl`, password: 'claveSegura123' });
  assert.equal(last.statusCode, 429);
});

test('JWT: se rechaza un token con algoritmo "none"', async () => {
  const enc = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const forged = enc({ alg: 'none', typ: 'JWT' }) + '.' + enc({ id: 1, role: 'admin', exp: Math.floor(Date.now() / 1000) + 600 }) + '.';
  assert.throws(() => verify(forged));
  const r = await request('GET', '/api/athletes', bearer(forged));
  assert.equal(r.statusCode, 401);
});

// ---------------------------------------------------------------- encabezados y CORS
test('Encabezados: las respuestas de la API llevan cabeceras de seguridad y no se guardan en caché', async () => {
  const r = await request('GET', '/api/health');
  assert.equal(r.headers['x-content-type-options'], 'nosniff');
  assert.equal(r.headers['x-frame-options'], 'DENY');
  assert.match(r.headers['content-security-policy'], /default-src 'none'/);
  assert.equal(r.headers['cache-control'], 'no-store');
});

test('CORS: un origen desconocido se rechaza y nunca se responde con comodín', async () => {
  process.env.CORS_ORIGINS = 'https://metahub.ejemplo.cl';
  const evil = await request('GET', '/api/health', { headers: { origin: 'https://atacante.example' } });
  assert.equal(evil.statusCode, 403);
  assert.equal(evil.headers['access-control-allow-origin'], undefined);
  const pre = await request('OPTIONS', '/api/auth/login', { headers: { origin: 'https://atacante.example' } });
  assert.equal(pre.statusCode, 403);
  const ok = await request('GET', '/api/health', { headers: { origin: 'https://metahub.ejemplo.cl' } });
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.headers['access-control-allow-origin'], 'https://metahub.ejemplo.cl');
  assert.equal(ok.headers.vary, 'Origin');
});

test('CORS: el mismo origen (detrás de nginx/Caddy) funciona sin configuración extra', async () => {
  process.env.CORS_ORIGINS = 'https://otro.ejemplo.cl';
  const r = await request('GET', '/api/health', { headers: { origin: 'https://metahub.ejemplo.cl', host: 'metahub.ejemplo.cl' } });
  assert.equal(r.statusCode, 200);
});

test('CORS: un host con punto final ("localhost.") es el mismo origen y no abre otros dominios', async () => {
  process.env.CORS_ORIGINS = 'http://localhost';
  const dotted = await request('GET', '/api/health', { headers: { origin: 'http://localhost.' } });
  assert.equal(dotted.statusCode, 200);
  assert.equal(dotted.headers['access-control-allow-origin'], 'http://localhost.');
  const sameHost = await request('GET', '/api/health', { headers: { origin: 'http://localhost.', host: 'localhost' } });
  assert.equal(sameHost.statusCode, 200);
  const withPort = await request('GET', '/api/health', { headers: { origin: 'https://metahub.ejemplo.cl.:8443', host: 'metahub.ejemplo.cl:8443' } });
  assert.equal(withPort.statusCode, 200);
  const lookalike = await request('GET', '/api/health', { headers: { origin: 'http://localhost.atacante.example' } });
  assert.equal(lookalike.statusCode, 403);
});

test('Producción: la API exige JWT_SECRET fuerte, DATABASE_URL y CORS_ORIGINS https explícitos', () => {
  const good = { NODE_ENV: 'production', JWT_SECRET: 'a'.repeat(64), DATABASE_URL: 'postgres://x', CORS_ORIGINS: 'https://metahub.ejemplo.cl' };
  assert.doesNotThrow(() => security.assertProductionConfig(good));
  assert.throws(() => security.assertProductionConfig({ ...good, JWT_SECRET: '' }), /JWT_SECRET/);
  assert.throws(() => security.assertProductionConfig({ ...good, JWT_SECRET: 'reemplazar_por_un_secreto_largo_y_aleatorio' }), /JWT_SECRET/);
  assert.throws(() => security.assertProductionConfig({ ...good, CORS_ORIGINS: '*' }), /CORS_ORIGINS/);
  assert.throws(() => security.assertProductionConfig({ ...good, CORS_ORIGINS: 'http://metahub.ejemplo.cl' }), /CORS_ORIGINS/);
  assert.throws(() => security.assertProductionConfig({ ...good, DATABASE_URL: '' }), /DATABASE_URL/);
  assert.doesNotThrow(() => security.assertProductionConfig({ NODE_ENV: 'development' }));
});

test('IP del cliente: un X-Forwarded-For falsificado no evade el límite por IP', () => {
  const prev = process.env.TRUST_PROXY_HOPS;
  process.env.TRUST_PROXY_HOPS = '1';
  try {
    // nginx agrega la IP real al final; el cliente inventó "1.2.3.4" al principio.
    const req = { headers: { 'x-forwarded-for': '1.2.3.4, 198.51.100.9' }, socket: { remoteAddress: '172.18.0.5' } };
    assert.equal(security.clientIp(req), '198.51.100.9');
  } finally {
    if (prev === undefined) delete process.env.TRUST_PROXY_HOPS; else process.env.TRUST_PROXY_HOPS = prev;
  }
});

// ---------------------------------------------------------------- errores
test('Errores: un fallo interno responde 500 genérico, sin el mensaje original', async () => {
  const token = await coach();
  const original = repo.getAthletesByTrainer;
  repo.getAthletesByTrainer = async () => { throw new Error('relation "athletes" does not exist at /srv/app/db.js:42'); };
  try {
    const r = await request('GET', '/api/athletes', bearer(token));
    assert.equal(r.statusCode, 500);
    assert.doesNotMatch(JSON.stringify(r.body), /relation|db\.js|athletes/);
  } finally {
    repo.getAthletesByTrainer = original;
  }
});

test('Errores: la ruta 404 no refleja la URL pedida', async () => {
  const r = await request('GET', '/api/<script>alert(1)</script>');
  assert.equal(r.statusCode, 404);
  assert.doesNotMatch(JSON.stringify(r.body), /script/);
});

test('Entradas: un cuerpo JSON mayor a 2 MiB se rechaza con 413', async () => {
  const r = await json('POST', '/api/auth/login', { email: 'a@uct.cl', password: 'x'.repeat(3 * 1024 * 1024) });
  assert.equal(r.statusCode, 413);
});

// ---------------------------------------------------------------- subida y visión
test('Subida: límite de videos por usuario y hora', async () => {
  const token = sign({ id: 999, role: 'entrenador', email: 'c@uct.cl', name: 'C' });
  let last;
  for (let i = 0; i < 21; i++) last = await request('POST', '/api/capture/videos?filename=a.mp4', { ...bearer(token), body: 'x' });
  assert.equal(last.statusCode, 429);
});

test('Visión: /api/cv/process-video exige sesión iniciada', async () => {
  const r = await request('POST', '/api/cv/process-video', { headers: { 'content-type': 'multipart/form-data; boundary=x' }, body: 'x' });
  assert.equal(r.statusCode, 401);
  const athlete = sign({ id: 5, role: 'atleta', email: 'a@uct.cl', name: 'A' });
  const forbidden = await request('POST', '/api/cv/process-video', { ...bearer(athlete), body: 'x' });
  assert.equal(forbidden.statusCode, 403);
});

// ---------------------------------------------------------------- consentimiento de menores
test('Consentimiento: un menor no puede quedar con consentimiento sin nombre real del apoderado', async () => {
  const token = await coach();
  const sinApoderado = await json('POST', '/api/athletes', { name: 'Martina', age: 14, consent: true }, bearer(token));
  assert.equal(sinApoderado.statusCode, 400);
  const placeholder = await json('POST', '/api/athletes', { name: 'Martina', age: 14, consentStatus: 'vigente', guardianName: 'Apoderado no registrado' }, bearer(token));
  assert.equal(placeholder.statusCode, 400);
  assert.equal((await request('GET', '/api/athletes', bearer(token))).body.athletes.length, 0, 'no queda ficha a medias');

  const ok = await json('POST', '/api/athletes', { name: 'Martina', age: 14, consent: true, guardianName: 'Carolina Pérez', guardianRelationship: 'Madre' }, bearer(token));
  assert.equal(ok.statusCode, 201);
  assert.equal(ok.body.athlete.consent, true);
  const history = await request('GET', `/api/athletes/${ok.body.athlete.id}/consents`, bearer(token));
  assert.equal(history.body.hasValidConsent, true);
  assert.equal(history.body.consents[0].guardianName, 'Carolina Pérez');
  assert.equal(history.body.consents[0].guardianRelationship, 'Madre');
});

test('Consentimiento: sin edad conocida se trata como menor (exige apoderado)', async () => {
  const token = await coach();
  const r = await json('POST', '/api/athletes', { name: 'Sin Edad', birthDate: '2012-03-01', consent: true }, bearer(token));
  assert.equal(r.statusCode, 400);
});

test('Consentimiento: un atleta mayor de edad puede consentir por sí mismo', async () => {
  const token = await coach();
  const r = await json('POST', '/api/athletes', { name: 'Adulto', age: 19, consent: true }, bearer(token));
  assert.equal(r.statusCode, 201);
  assert.equal(r.body.athlete.consent, true);
});

test('Consentimiento: crear cuenta de atleta exige consentimiento formal', async () => {
  const token = await coach();
  const r = await json('POST', '/api/athletes', { name: 'Sin Cons', age: 14, email: 'sc@uct.cl', password: 'temporal123' }, bearer(token));
  assert.equal(r.statusCode, 400);
});

test('Consentimiento: PUT no puede marcar consentimiento sin apoderado; quitarlo queda como revocación', async () => {
  const token = await coach();
  const a = (await json('POST', '/api/athletes', { name: 'Leo', age: 13 }, bearer(token))).body.athlete;
  assert.equal(a.consent, false);
  const bypass = await json('PUT', `/api/athletes/${a.id}`, { consent: true }, bearer(token));
  assert.equal(bypass.statusCode, 400);
  const grant = await json('PUT', `/api/athletes/${a.id}`, { consent: true, guardianName: 'Jorge Soto' }, bearer(token));
  assert.equal(grant.statusCode, 200);
  assert.equal(grant.body.athlete.consent, true);
  const revoke = await json('PUT', `/api/athletes/${a.id}`, { consent: false }, bearer(token));
  assert.equal(revoke.body.athlete.consent, false);
  const history = await request('GET', `/api/athletes/${a.id}/consents`, bearer(token));
  assert.equal(history.body.hasValidConsent, false);
  assert.equal(history.body.consents[0].status, 'revoked');
  assert.ok(history.body.consents[0].revokedAt, 'la revocación queda fechada');
});

test('Consentimiento: valida estado, vencimiento y propiedad de la ficha', async () => {
  const token = await coach();
  const other = await coach();
  const a = (await json('POST', '/api/athletes', { name: 'Leo', age: 13 }, bearer(token))).body.athlete;
  const url = `/api/athletes/${a.id}/consents`;
  assert.equal((await json('POST', url, { status: 'aprobado-por-mi', guardianName: 'Jorge Soto' }, bearer(token))).statusCode, 400);
  assert.equal((await json('POST', url, { guardianName: 'Jorge Soto', expiresAt: '2001-01-01' }, bearer(token))).statusCode, 400);
  assert.equal((await json('POST', url, { guardianName: 'Jorge Soto', expiresAt: 'mañana' }, bearer(token))).statusCode, 400);
  assert.equal((await json('POST', url, { guardianName: 'Jorge Soto', notes: 'x'.repeat(501) }, bearer(token))).statusCode, 400);
  assert.equal((await json('POST', url, { guardianName: 'Jorge Soto' }, bearer(other))).statusCode, 403, 'otro entrenador no registra consentimientos');
  assert.equal((await request('GET', url, bearer(other))).statusCode, 403, 'otro entrenador no ve consentimientos');
  assert.equal((await json('POST', '/api/athletes/99999/consents', { guardianName: 'Jorge Soto' }, bearer(token))).statusCode, 404);
  const next = new Date(Date.now() + 200 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const ok = await json('POST', url, { guardianName: 'Jorge Soto', expiresAt: next }, bearer(token));
  assert.equal(ok.statusCode, 201);
  assert.equal(ok.body.consent.guardianName, 'Jorge Soto');
});

test('Entradas: fichas de atleta con datos fuera de rango se rechazan', async () => {
  const token = await coach();
  const future = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  for (const body of [
    { name: 'Ana', birthDate: future },
    { name: 'Ana', birthDate: '2012-02-30' },
    { name: 'Ana', age: 'quince' },
    { name: 'Ana', age: 300 },
    { name: 'A'.repeat(101), age: 14 },
    { name: 'Ana', age: 14, consent: 'si' }
  ]) {
    const r = await json('POST', '/api/athletes', body, bearer(token));
    assert.equal(r.statusCode, 400, JSON.stringify(body).slice(0, 60));
  }
});

test('Consentimiento: guarda el teléfono del apoderado y rechaza teléfonos inválidos', async () => {
  const token = await coach();
  const bad = await json('POST', '/api/athletes', { name: 'Leo', age: 13, consent: true, guardianName: 'Jorge Soto', guardianPhone: 'llamar después' }, bearer(token));
  assert.equal(bad.statusCode, 400);
  const ok = await json('POST', '/api/athletes', { name: 'Leo', age: 13, consent: true, guardianName: 'Jorge Soto', guardianPhone: '+56 9 1234 5678' }, bearer(token));
  assert.equal(ok.statusCode, 201);
  const history = await request('GET', `/api/athletes/${ok.body.athlete.id}/consents`, bearer(token));
  assert.equal(history.body.consents[0].guardianPhone, '+56 9 1234 5678');
});

test('Pruebas: el almacén en memoria no escribe database.json', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const file = path.join(__dirname, '../data/database.json');
  const before = fs.readFileSync(file, 'utf8');
  await coach();
  assert.equal(fs.readFileSync(file, 'utf8'), before);
});
