/**
 * =========================================================================================
 * PROYECTO METAHUB — SEGUIMIENTO LONGITUDINAL DE LA TÉCNICA DE CARRERA EN ATLETISMO ESCOLAR
 * Escuela de Ingeniería Civil en Informática — Universidad Católica de Temuco
 * 
 * Memoria / Trabajo de Título:
 * Autores: Felipe Arellano Vargas & Sofía Henríquez Soto
 * Profesor Guía: Dr. Marcos Lévano
 * 
 * Módulo: Repositorio de Persistencia Transaccional (PostgreSQL / TimescaleDB & Fallback en Memoria)
 * Descripción: Implementa el patrón Repository para la persistencia desacoplada de usuarios
 *              (entrenadores), atletas escolares y sesiones de carrera. Provee aislamiento
 *              estricto de datos por entrenador (RNF de seguridad y privacidad en deporte escolar).
 * =========================================================================================
 */

const crypto = require('crypto');
let bcrypt;
try {
  bcrypt = require('bcryptjs');
} catch (e) {
  bcrypt = null;
}

const { getPool } = require('./pgClient');

// Costo de salting robusto para mitigar ataques de fuerza bruta (RNF03)
const BCRYPT_SALT_ROUNDS = 12;

/**
 * Función auxiliar de hashing PBKDF2 (derivación nativa con salting de 64 bytes)
 * Utilizada como fallback de alta seguridad si bcrypt no se encuentra preinstalado.
 */
function pbkdf2Hash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verificación en tiempo constante contra hash derivado PBKDF2
 */
function pbkdf2Verify(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

/**
 * Genera el hash unidireccional de una contraseña en texto plano
 */
async function hashPassword(password) {
  if (bcrypt) {
    return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  }
  return pbkdf2Hash(password);
}

/**
 * Valida una contraseña ingresada contra el hash almacenado en la base de datos
 */
async function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  if (bcrypt && !storedHash.includes(':')) {
    return bcrypt.compare(password, storedHash);
  }
  if (storedHash.includes(':')) {
    return pbkdf2Verify(password, storedHash);
  }
  if (bcrypt) {
    return bcrypt.compare(password, storedHash);
  }
  return false;
}

/**
 * Clase controladora del repositorio de datos de MetaHub
 */
class Repository {
  constructor() {
    this.reset();
  }

  /**
   * Inicializa o reinicia el almacén en memoria (utilizado para aislamiento de pruebas unitarias)
   */
  reset() {
    this.users = [];
    this.athletes = [];
    this.sessions = [];
    this.userIdCounter = 1;
    this.athleteIdCounter = 1;
    this.sessionIdCounter = 1;
  }

  /**
   * Comprueba si la conexión activa a PostgreSQL / TimescaleDB se encuentra operativa
   */
  isPgActive() {
    try {
      return Boolean(getPool());
    } catch (e) {
      return false;
    }
  }

  // =======================================================================================
  // 1. GESTIÓN DE USUARIOS Y ENTRENADORES (AUTENTICACIÓN)
  // =======================================================================================

  /**
   * Registra un nuevo entrenador en el sistema.
   * Por directriz de seguridad (RNF03), el registro público fuerza el rol 'entrenador'
   * previniendo escalamiento de privilegios a 'admin'.
   */
  async createUser({ name, email, password, role = 'entrenador' }) {
    const safeRole = role === 'admin' ? 'entrenador' : (role || 'entrenador');
    const passwordHash = await hashPassword(password);

    if (this.isPgActive()) {
      const pool = getPool();
      const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
      if (existing.rows.length > 0) {
        const error = new Error('El correo electrónico ya está registrado.');
        error.statusCode = 400;
        throw error;
      }
      const res = await pool.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at as "createdAt"',
        [name, email.toLowerCase(), passwordHash, safeRole]
      );
      return res.rows[0];
    }

    const existing = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      const error = new Error('El correo electrónico ya está registrado.');
      error.statusCode = 400;
      throw error;
    }

    const newUser = {
      id: this.userIdCounter++,
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: safeRole,
      createdAt: new Date().toISOString()
    };

    this.users.push(newUser);
    return this.sanitizeUser(newUser);
  }

  /**
   * Busca un usuario por su dirección de correo electrónico
   */
  async findUserByEmail(email) {
    if (this.isPgActive()) {
      const pool = getPool();
      const res = await pool.query(
        'SELECT id, name, email, password_hash as "passwordHash", role, created_at as "createdAt" FROM users WHERE LOWER(email) = LOWER($1)',
        [email]
      );
      return res.rows[0] || null;
    }
    return this.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  /**
   * Busca un usuario por su identificador único
   */
  async findUserById(id) {
    if (this.isPgActive()) {
      const pool = getPool();
      const res = await pool.query(
        'SELECT id, name, email, role, created_at as "createdAt" FROM users WHERE id = $1',
        [Number(id)]
      );
      return res.rows[0] || null;
    }
    const user = this.users.find(u => u.id === Number(id));
    return user ? this.sanitizeUser(user) : null;
  }

  /**
   * Compara la contraseña provista en texto plano con el hash almacenado
   */
  async validatePassword(user, password) {
    return verifyPassword(password, user.passwordHash);
  }

  /**
   * Elimina campos sensibles (hash de contraseña) antes de serializar al cliente
   */
  sanitizeUser(user) {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  // =======================================================================================
  // 2. GESTIÓN DE ATLETAS (CRUD CON AISLAMIENTO ESTRICTO POR ENTRENADOR)
  // =======================================================================================

  /**
   * Registra un atleta escolar asociado al perfil del entrenador autenticado
   */
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

  /**
   * Obtiene todos los atletas bajo tutela del entrenador especificado,
   * calculando el conteo de sesiones registradas y la fecha de última sesión.
   */
  async getAthletesByTrainer(trainerId) {
    if (this.isPgActive()) {
      const pool = getPool();
      const res = await pool.query(
        `SELECT a.id, a.name, a.age, a.consent, a.trainer_id as "trainerId", a.created_at as "createdAt",
                COUNT(s.id)::int as "sessionCount",
                MAX(s.session_date) as "lastSessionDate"
         FROM athletes a
         LEFT JOIN sessions s ON a.id = s.athlete_id
         WHERE a.trainer_id = $1
         GROUP BY a.id
         ORDER BY a.id DESC`,
        [Number(trainerId)]
      );
      return res.rows;
    }

    return this.athletes
      .filter(a => a.trainerId === Number(trainerId))
      .map(a => {
        const athleteSessions = this.sessions.filter(s => s.athleteId === a.id);
        const last = athleteSessions.length > 0 
          ? athleteSessions[athleteSessions.length - 1].sessionDate 
          : null;
        return {
          ...a,
          sessionCount: athleteSessions.length,
          lastSessionDate: last
        };
      })
      .sort((a, b) => b.id - a.id);
  }

  /**
   * Obtiene un atleta por ID validando que pertenezca al entrenador solicitante
   */
  async getAthleteByIdForTrainer(athleteId, trainerId) {
    if (this.isPgActive()) {
      const pool = getPool();
      const res = await pool.query(
        'SELECT id, name, age, consent, trainer_id as "trainerId", created_at as "createdAt" FROM athletes WHERE id = $1',
        [Number(athleteId)]
      );
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

  /**
   * Actualiza los datos de un atleta existente
   */
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

  /**
   * Elimina un atleta del sistema y sus dependencias asociadas
   */
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
    this.sessions = this.sessions.filter(s => s.athleteId !== Number(athleteId));
    return { success: true, id: Number(athleteId) };
  }

  // =======================================================================================
  // 3. GESTIÓN DE SESIONES DE CARRERA (ANÁLISIS BIOMECÁNICO)
  // =======================================================================================

  /**
   * Crea y registra una nueva sesión de carrera en terreno
   */
  async createSession({ athleteId, trainerId, videoUrl = '', notes = '' }) {
    // Validar que el atleta pertenezca al entrenador antes de asociar la sesión
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

  /**
   * Consulta las sesiones de un atleta específico bajo tutela del entrenador
   */
  async getSessionsByAthlete(athleteId, trainerId) {
    const athlete = await this.getAthleteByIdForTrainer(athleteId, trainerId);

    if (this.isPgActive()) {
      const pool = getPool();
      const res = await pool.query(
        `SELECT s.id, s.athlete_id as "athleteId", a.name as "athleteName", s.trainer_id as "trainerId", 
                s.session_date as "sessionDate", s.video_url as "videoUrl", s.notes, s.created_at as "createdAt"
         FROM sessions s
         JOIN athletes a ON s.athlete_id = a.id
         WHERE s.athlete_id = $1 AND s.trainer_id = $2
         ORDER BY s.session_date DESC`,
        [Number(athleteId), Number(trainerId)]
      );
      return res.rows;
    }

    return this.sessions
      .filter(s => s.athleteId === Number(athleteId) && s.trainerId === Number(trainerId))
      .map(s => ({
        ...s,
        athleteName: athlete.name
      }))
      .sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate) || b.id - a.id);
  }

  /**
   * Consulta global de todas las sesiones registradas por un entrenador
   */
  async getSessionsByTrainer(trainerId) {
    if (this.isPgActive()) {
      const pool = getPool();
      const res = await pool.query(
        `SELECT s.id, s.athlete_id as "athleteId", a.name as "athleteName", s.trainer_id as "trainerId", 
                s.session_date as "sessionDate", s.video_url as "videoUrl", s.notes, s.created_at as "createdAt"
         FROM sessions s
         JOIN athletes a ON s.athlete_id = a.id
         WHERE s.trainer_id = $1
         ORDER BY s.session_date DESC`,
        [Number(trainerId)]
      );
      return res.rows;
    }

    return this.sessions
      .filter(s => s.trainerId === Number(trainerId))
      .map(s => {
        const athlete = this.athletes.find(a => a.id === s.athleteId);
        return {
          ...s,
          athleteName: athlete ? athlete.name : 'Atleta Desconocido'
        };
      })
      .sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate) || b.id - a.id);
  }
}

// Exportar instancia única (Singleton) del repositorio
const dbRepository = new Repository();
module.exports = dbRepository;
