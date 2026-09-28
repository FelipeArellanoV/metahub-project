const request = require('supertest');
const app = require('../src/app');
const dbRepository = require('../src/db/repository');

describe('T-04 Autenticación JWT y Aislamiento por Entrenador', () => {
  beforeEach(() => {
    // Limpiar repositorio antes de cada prueba para garantizar aislamiento de tests
    dbRepository.reset();
  });

  // PRUEBA 1: Registro exitoso con hash de contraseña y JWT
  test('Prueba 1: Debe registrar un entrenador exitosamente y retornar token JWT', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Felipe Arellano',
        email: 'felipe@uct.cl',
        password: 'password123',
        role: 'entrenador'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user.email).toBe('felipe@uct.cl');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  // PRUEBA 2: Login con credenciales válidas
  test('Prueba 2: Debe iniciar sesión con credenciales válidas y devolver token', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Sofía Henríquez',
        email: 'sofia@uct.cl',
        password: 'secretoSeguro123'
      });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'sofia@uct.cl',
        password: 'secretoSeguro123'
      });

    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body).toHaveProperty('token');
    expect(loginRes.body.user.name).toBe('Sofía Henríquez');
  });

  // PRUEBA 3: Rechazo de credenciales erróneas
  test('Prueba 3: Debe denegar el acceso con contraseña incorrecta (401)', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Marcos Levano',
        email: 'marcos@uct.cl',
        password: 'claveCorrecta123'
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'marcos@uct.cl',
        password: 'claveIncorrecta'
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/Credenciales inválidas/i);
  });

  // PRUEBA 4: Protección de rutas sin token JWT
  test('Prueba 4: Debe denegar el acceso a /api/athletes si no se envía token JWT (401)', async () => {
    const res = await request(app).get('/api/athletes');
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/Token JWT requerido/i);
  });

  // PRUEBA 5: Aislamiento de lista de atletas por entrenador (H-04)
  test('Prueba 5: Un entrenador NO debe ver los atletas creados por otro entrenador', async () => {
    // 1. Registrar Entrenador A y crear atleta "Martín"
    const regA = await request(app).post('/api/auth/register').send({
      name: 'Entrenador A',
      email: 'entrenadora@uct.cl',
      password: 'password123'
    });
    const tokenA = regA.body.token;

    await request(app)
      .post('/api/athletes')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Martín Atleta', age: 15, consent: true });

    // 2. Registrar Entrenador B
    const regB = await request(app).post('/api/auth/register').send({
      name: 'Entrenador B',
      email: 'entrenadorb@uct.cl',
      password: 'password123'
    });
    const tokenB = regB.body.token;

    // 3. Entrenador B consulta sus atletas
    const resB = await request(app)
      .get('/api/athletes')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(resB.statusCode).toBe(200);
    expect(resB.body.athletes).toHaveLength(0); // Debe estar vacío para Entrenador B
  });

  // PRUEBA 6: Intento de acceso directo denegado a atleta ajeno (H-04)
  test('Prueba 6: Debe rechazar con 403 si un entrenador intenta acceder al ID de un atleta de otro entrenador', async () => {
    // 1. Registrar Entrenador A y crear atleta
    const regA = await request(app).post('/api/auth/register').send({
      name: 'Entrenador A',
      email: 'entrenadora2@uct.cl',
      password: 'password123'
    });
    const tokenA = regA.body.token;

    const createRes = await request(app)
      .post('/api/athletes')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Javiera Soto', age: 16, consent: true });
    
    const athleteId = createRes.body.athlete.id;

    // 2. Registrar Entrenador B
    const regB = await request(app).post('/api/auth/register').send({
      name: 'Entrenador B',
      email: 'entrenadorb2@uct.cl',
      password: 'password123'
    });
    const tokenB = regB.body.token;

    // 3. Entrenador B intenta solicitar atletaId del Entrenador A
    const resB = await request(app)
      .get(`/api/athletes/${athleteId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(resB.statusCode).toBe(403);
    expect(resB.body.error).toMatch(/Acceso denegado/i);
  });
});
