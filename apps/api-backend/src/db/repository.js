const crypto = require('crypto');
const { getPool } = require('./pgClient');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

class Repository {
  constructor() {
    this.reset();
  }

  reset() {
    this.users = [];
    this.athletes = [];
    this.sessions = [];
    this.userIdCounter = 1;
    this.athleteIdCounter = 1;
    this.sessionIdCounter = 1;
  }

  // Helper para verificar si PostgreSQL está disponible
  isPgActive() {
    try {
      return Boolean(getPool());
    } catch (e) {
      return false;
    }
  }

  // --- Métodos de Usuarios ---
  async createUser({ name, email, password, role = 'entrenador' }) {
    if (this.isPgActive()) {
      const pool = getPool();
      const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
      if (existing.rows.length > 0) {
        const error = new Error('El correo electrónico ya está registrado.');
        error.statusCode = 400;
        throw error;
      }
      const passwordHash = hashPassword(password);
      const res = await pool.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at as "createdAt"',
        [name, email.toLowerCase(), passwordHash, role]
      );
      return res.rows[0];
    }

    const existing = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      const error = new Error('El correo electrónico ya está registrado.');
      error.statusCode = 400;
      throw error;
    }

    const passwordHash = hashPassword(password);
    const newUser = {
      id: this.userIdCounter++,
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
      createdAt: new Date().toISOString()
    };

    this.users.push(newUser);
    return this.sanitizeUser(newUser);
  }

  async findUserByEmail(email) {
    if (this.isPgActive()) {
      const pool = getPool();
      const res = await pool.query('SELECT id, name, email, password_hash as "passwordHash", role, created_at as "createdAt" FROM users WHERE LOWER(email) = LOWER($1)', [email]);
      return res.rows[0] || null;
    }
    return this.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  async findUserById(id) {
    if (this.isPgActive()) {
      const pool = getPool();
      const res = await pool.query('SELECT id, name, email, role, created_at as "createdAt" FROM users WHERE id = $1', [Number(id)]);
      return res.rows[0] || null;
    }
    const user = this.users.find(u => u.id === Number(id));
    return user ? this.sanitizeUser(user) : null;
  }

  async validatePassword(user, password) {
    return verifyPassword(password, user.passwordHash);
  }

  sanitizeUser(user) {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  // --- Métodos de Atletas (CRUD + Aislamiento por Entrenador) ---
  async createAthlete({ name, age, consent = false, trainerId }) {
    if (!trainerId) {
      const error = new Error('Se requiere asociar un entrenador.');
      error.statusCode = 400;
      throw error;
    }

    if (this.isPgActive()) {
      const pool = getPool();
      const res = await pool.query(
        'INSERT INTO athletes (name, age, consent, trainer_id) VALUES ($1, $2, $3, $4) RETURNING id, name, age, consent, trainer_id as "trainerId", created_at as "createdAt"',
        [name, Number(age), Boolean(consent), Number(trainerId)]
      );
      return res.rows[0];
    }

    const newAthlete = {
      id: this.athleteIdCounter++,
      name,
      age: Number(age),
      consent: Boolean(consent),
      trainerId: Number(trainerId),
      createdAt: new Date().toISOString()
    };

    this.athletes.push(newAthlete);
    return newAthlete;
  }

  async getAthletesByTrainer(trainerId) {
    if (this.isPgActive()) {
      const pool = getPool();
      const res = await pool.query(
        'SELECT id, name, age, consent, trainer_id as "trainerId", created_at as "createdAt" FROM athletes WHERE trainer_id = $1 ORDER BY id DESC',
        [Number(trainerId)]
      );
      return res.rows;
    }
    return this.athletes.filter(a => a.trainerId === Number(trainerId));
  }

  async getAthleteByIdForTrainer(athleteId, trainerId) {
    if (this.isPgActive()) {
      const pool = getPool();
      const res = await pool.query('SELECT id, name, age, consent, trainer_id as "trainerId", created_at as "createdAt" FROM athletes WHERE id = $1', [Number(athleteId)]);
      const athlete = res.rows[0];
      if (!athlete) return null;
      if (athlete.trainerId !== Number(trainerId)) {
        const error = new Error('Acceso denegado: este atleta no pertenece a tu perfil de entrenador.');
        error.statusCode = 403;
        throw error;
      }
      return athlete;
    }

    const athlete = this.athletes.find(a => a.id === Number(athleteId));
    if (!athlete) return null;
    
    if (athlete.trainerId !== Number(trainerId)) {
      const error = new Error('Acceso denegado: este atleta no pertenece a tu perfil de entrenador.');
      error.statusCode = 403;
      throw error;
    }

    return athlete;
  }

  async updateAthlete({ athleteId, trainerId, name, age, consent }) {
    const athlete = await this.getAthleteByIdForTrainer(athleteId, trainerId);
    if (!athlete) {
      const error = new Error('Atleta no encontrado.');
      error.statusCode = 404;
      throw error;
    }

    if (this.isPgActive()) {
      const pool = getPool();
      const res = await pool.query(
        'UPDATE athletes SET name = COALESCE($1, name), age = COALESCE($2, age), consent = COALESCE($3, consent) WHERE id = $4 AND trainer_id = $5 RETURNING id, name, age, consent, trainer_id as "trainerId", created_at as "createdAt"',
        [name || null, age !== undefined ? Number(age) : null, consent !== undefined ? Boolean(consent) : null, Number(athleteId), Number(trainerId)]
      );
      return res.rows[0];
    }

    if (name !== undefined) athlete.name = name;
    if (age !== undefined) athlete.age = Number(age);
    if (consent !== undefined) athlete.consent = Boolean(consent);

    return athlete;
  }

  async deleteAthlete({ athleteId, trainerId }) {
    const athlete = await this.getAthleteByIdForTrainer(athleteId, trainerId);
    if (!athlete) {
      const error = new Error('Atleta no encontrado.');
      error.statusCode = 404;
      throw error;
    }

    if (this.isPgActive()) {
      const pool = getPool();
      await pool.query('DELETE FROM athletes WHERE id = $1 AND trainer_id = $2', [Number(athleteId), Number(trainerId)]);
      return { success: true, id: Number(athleteId) };
    }

    this.athletes = this.athletes.filter(a => a.id !== Number(athleteId));
    return { success: true, id: Number(athleteId) };
  }

  // --- Métodos de Sesiones ---
  async createSession({ athleteId, trainerId, videoUrl = '', notes = '' }) {
    await this.getAthleteByIdForTrainer(athleteId, trainerId);

    if (this.isPgActive()) {
      const pool = getPool();
      const res = await pool.query(
        'INSERT INTO sessions (athlete_id, trainer_id, video_url, notes) VALUES ($1, $2, $3, $4) RETURNING id, athlete_id as "athleteId", trainer_id as "trainerId", session_date as "sessionDate", video_url as "videoUrl", notes, created_at as "createdAt"',
        [Number(athleteId), Number(trainerId), videoUrl, notes]
      );
      return res.rows[0];
    }

    const newSession = {
      id: this.sessionIdCounter++,
      athleteId: Number(athleteId),
      trainerId: Number(trainerId),
      sessionDate: new Date().toISOString(),
      videoUrl,
      notes,
      createdAt: new Date().toISOString()
    };

    this.sessions.push(newSession);
    return newSession;
  }

  async getSessionsByAthlete(athleteId, trainerId) {
    await this.getAthleteByIdForTrainer(athleteId, trainerId);

    if (this.isPgActive()) {
      const pool = getPool();
      const res = await pool.query(
        'SELECT id, athlete_id as "athleteId", trainer_id as "trainerId", session_date as "sessionDate", video_url as "videoUrl", notes, created_at as "createdAt" FROM sessions WHERE athlete_id = $1 AND trainer_id = $2 ORDER BY session_date DESC',
        [Number(athleteId), Number(trainerId)]
      );
      return res.rows;
    }

    return this.sessions.filter(s => s.athleteId === Number(athleteId) && s.trainerId === Number(trainerId));
  }
}

const dbRepository = new Repository();
module.exports = dbRepository;
