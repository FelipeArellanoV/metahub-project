const request = require('supertest');
const app = require('../src/app');
const dbRepository = require('../src/db/repository');

describe('T-04 Autenticación JWT, CRUD Atletas y Gestión de Sesiones', () => {
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

    const regB = await request(app).post('/api/auth/register').send({
      name: 'Entrenador B',
      email: 'entrenadorb@uct.cl',
      password: 'password123'
    });
    const tokenB = regB.body.token;

    const resB = await request(app)
      .get('/api/athletes')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(resB.statusCode).toBe(200);
    expect(resB.body.athletes).toHaveLength(0);
  });

  // PRUEBA 6: Actualizar (PUT) y Eliminar (DELETE) Atleta
  test('Prueba 6: Debe permitir actualizar y eliminar un atleta propio', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Entrenador C',
      email: 'entrenadorc@uct.cl',
      password: 'password123'
    });
    const token = reg.body.token;

    const createRes = await request(app)
      .post('/api/athletes')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Atleta Prueba', age: 14, consent: false });

    const athleteId = createRes.body.athlete.id;

    // Actualizar (PUT)
    const updateRes = await request(app)
      .put(`/api/athletes/${athleteId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Atleta Actualizado', age: 15, consent: true });

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.athlete.name).toBe('Atleta Actualizado');
    expect(updateRes.body.athlete.age).toBe(15);

    // Eliminar (DELETE)
    const deleteRes = await request(app)
      .delete(`/api/athletes/${athleteId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.statusCode).toBe(200);

    // Verificar que ya no existe
    const getRes = await request(app)
      .get(`/api/athletes/${athleteId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.statusCode).toBe(404);
  });

  // PRUEBA 7: Registro y consulta de sesiones de carrera
  test('Prueba 7: Debe registrar una sesión de carrera y permitir su consulta', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Entrenador D',
      email: 'entrenadord@uct.cl',
      password: 'password123'
    });
    const token = reg.body.token;

    const athleteRes = await request(app)
      .post('/api/athletes')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Tomas Muñoz', age: 16, consent: true });

    const athleteId = athleteRes.body.athlete.id;

    // Crear sesión
    const sessionRes = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ athleteId, notes: 'Evaluación técnica de zancada' });

    expect(sessionRes.statusCode).toBe(201);
    expect(sessionRes.body.session.athleteId).toBe(athleteId);

    // Consultar sesiones del atleta
    const listRes = await request(app)
      .get(`/api/athletes/${athleteId}/sessions`)
      .set('Authorization', `Bearer ${token}`);

    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.sessions).toHaveLength(1);
    expect(listRes.body.sessions[0].notes).toBe('Evaluación técnica de zancada');
  });
});
