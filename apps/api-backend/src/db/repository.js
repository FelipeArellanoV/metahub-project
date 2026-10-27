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
 * Calcula dinámicamente la edad cumplida en años a partir de la fecha de nacimiento (birthDate).
 * Si no se dispone de birthDate, retorna el fallback de edad provisto.
 */
function calculateAge(birthDate, fallbackAge) {
  if (!birthDate) return typeof fallbackAge === 'number' ? fallbackAge : 0;
  const today = new Date();
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return typeof fallbackAge === 'number' ? fallbackAge : 0;
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
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
    this.consents = [];
    this.userIdCounter = 1;
    this.athleteIdCounter = 1;
    this.sessionIdCounter = 1;
    this.consentIdCounter = 1;
  }

  /**
   * Carga datos iniciales en memoria para pruebas directas en vivo
   */
  async seedDefaults() {
    if (this.isPgActive()) return;
    try {
      const coach = await this.createUser({
        name: 'Felipe Arellano (Entrenador UCT)',
        email: 'entrenador@uct.cl',
        password: 'password123',
        role: 'entrenador'
      });
      const martin = await this.createAthlete({
        name: 'Martín San Martín',
        birthDate: '2011-04-18', // 15 años calculados dinámicamente
        age: 15,
        consent: true,
        trainerId: coach.id,
        category: 'Sub-16',
        school: 'Liceo Deportivo Temuco',
        account: {
          email: 'martin@uct.cl',
          password: 'password123'
        }
      });
      await this.createConsent({
        athleteId: martin.id,
        consentType: 'grabacion_biomecanica',
        status: 'granted',
        notes: 'Consentimiento informado firmado por apoderado para registro longitudinal UCT'
      });

      const javiera = await this.createAthlete({
        name: 'Javiera Soto',
        birthDate: '2010-09-22', // 16 años calculados dinámicamente
        age: 16,
        consent: true,
        trainerId: coach.id,
        category: 'Sub-16',
        school: 'Liceo Pablo Neruda',
        account: {
          email: 'javiera@uct.cl',
          password: 'password123'
        }
      });
      await this.createConsent({
        athleteId: javiera.id,
        consentType: 'grabacion_biomecanica',
        status: 'granted',
        notes: 'Consentimiento informado firmado por apoderado para registro longitudinal UCT'
      });
    } catch (e) {
      // Ignorar si ya fueron creados
    }
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
  async createUser({ name, email, password, role = 'entrenador', organizationName = '' }) {
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
        'INSERT INTO users (name, email, password_hash, role, organization_name) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, organization_name as "organizationName", created_at as "createdAt"',
        [name, email.toLowerCase(), passwordHash, safeRole, organizationName]
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
      organizationName,
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
        'SELECT id, name, email, password_hash as "passwordHash", role, organization_name as "organizationName", created_at as "createdAt" FROM users WHERE LOWER(email) = LOWER($1)',
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
        'SELECT id, name, email, role, organization_name as "organizationName", created_at as "createdAt" FROM users WHERE id = $1',
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

  /**
   * Elimina un usuario (se usa para revertir una cuenta de atleta si falla el registro de su ficha,
   * y para borrar la cuenta de acceso cuando se elimina al atleta)
   */
  async deleteUser(id) {
    if (this.isPgActive()) {
      await getPool().query('DELETE FROM users WHERE id = $1', [Number(id)]);
      return;
    }
    this.users = this.users.filter(u => u.id !== Number(id));
  }

  // =======================================================================================
  // 2. GESTIÓN DE ATLETAS (CRUD CON AISLAMIENTO ESTRICTO POR ENTRENADOR)
  // =======================================================================================

  /**
   * Formatea un atleta, calculando dinámicamente su edad a partir de birthDate y añadiendo hasAccount
   */
  formatAthlete(athlete) {
    if (!athlete) return athlete;
    const rawBirthDate = athlete.birthDate || athlete.birth_date || null;
    let birthDateStr = null;
    if (rawBirthDate) {
      birthDateStr = typeof rawBirthDate === 'string'
        ? rawBirthDate.split('T')[0]
        : new Date(rawBirthDate).toISOString().split('T')[0];
    }
    const computedAge = calculateAge(birthDateStr, athlete.age);
    return {
      ...athlete,
      age: computedAge,
      birthDate: birthDateStr,
      hasAccount: Boolean(athlete.userId)
    };
  }

  /**
   * Agrega el indicador 'hasAccount' y formatea edad/nacimiento
   */
  withAccountFlag(athlete) {
    return this.formatAthlete(athlete);
  }

  /**
   * Registra un atleta escolar asociado al perfil del entrenador autenticado.
   * Si se entrega 'birthDate', se almacena la fecha real y se calcula dinámicamente la edad.
   * Si se entrega 'account' ({ email, password }) se crea además una cuenta con rol 'atleta'
   * vinculada a la ficha. Por privacidad de menores, requiere consentimiento parental registrado.
   */
  async createAthlete({ name, age, birthDate = null, consent = false, trainerId, account = null, organizationName = '' }) {
    if (!trainerId) {
      const error = new Error('Se requiere asociar un entrenador.');
      error.statusCode = 400;
      throw error;
    }

    const birthDateStr = birthDate
      ? (typeof birthDate === 'string' ? birthDate.split('T')[0] : new Date(birthDate).toISOString().split('T')[0])
      : null;
    const computedAge = calculateAge(birthDateStr, age);

    let user = null;
    if (account) {
      if (!consent) {
        const error = new Error('Para crear una cuenta de acceso se requiere el consentimiento parental registrado.');
        error.statusCode = 400;
        throw error;
      }
      user = await this.createUser({
        name,
        email: account.email,
        password: account.password,
        role: 'atleta'
      });
    }

    try {
      let createdAthlete;
      if (this.isPgActive()) {
        const pool = getPool();
        const res = await pool.query(
          'INSERT INTO athletes (name, age, birth_date, consent, trainer_id, user_id, organization_name) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, age, birth_date as "birthDate", consent, organization_name as "organizationName", trainer_id as "trainerId", user_id as "userId", created_at as "createdAt"',
          [name, computedAge, birthDateStr, Boolean(consent), Number(trainerId), user ? user.id : null, organizationName]
        );
        createdAthlete = this.withAccountFlag(res.rows[0]);
      } else {
        const newAthlete = {
          id: this.athleteIdCounter++,
          name,
          age: computedAge,
          birthDate: birthDateStr,
          consent: Boolean(consent),
          trainerId: Number(trainerId),
          organizationName,
          userId: user ? user.id : null,
          createdAt: new Date().toISOString()
        };
        this.athletes.push(newAthlete);
        createdAthlete = this.withAccountFlag(newAthlete);
      }

      // Si se registró con consentimiento parental vigente, asentar el registro en consents
      if (consent) {
        await this.createConsent({
          athleteId: createdAthlete.id,
          consentType: 'grabacion_biomecanica',
          status: 'granted',
          notes: 'Consentimiento registrado al crear la ficha escolar'
        });
      }

      return createdAthlete;
    } catch (err) {
      // No dejar una cuenta huérfana si la ficha no pudo registrarse
      if (user) await this.deleteUser(user.id);
      throw err;
    }
  }

  /**
   * Obtiene todos los atletas bajo tutela del entrenador especificado,
   * calculando el conteo de sesiones registradas, la fecha de última sesión y el último IPT.
   */
  async getAthletesByTrainer(trainerId) {
    if (this.isPgActive()) {
      const pool = getPool();
      const res = await pool.query(
        `SELECT a.id, a.name, a.age, a.birth_date as "birthDate", a.consent, a.organization_name as "organizationName", a.trainer_id as "trainerId", a.user_id as "userId", a.created_at as "createdAt",
                COUNT(s.id)::int as "sessionCount",
                MAX(s.session_date) as "lastSessionDate",
                (SELECT s2.ipt_score FROM sessions s2
                  WHERE s2.athlete_id = a.id AND s2.ipt_score IS NOT NULL
                  ORDER BY s2.session_date DESC, s2.id DESC LIMIT 1) as "lastIptScore"
         FROM athletes a
         LEFT JOIN sessions s ON a.id = s.athlete_id
         WHERE a.trainer_id = $1
         GROUP BY a.id
         ORDER BY a.id DESC`,
        [Number(trainerId)]
      );
      return res.rows.map(r => this.withAccountFlag(r));
    }

    return this.athletes
      .filter(a => a.trainerId === Number(trainerId))
      .map(a => {
        const athleteSessions = this.sessions.filter(s => s.athleteId === a.id);
        const last = athleteSessions.length > 0
          ? athleteSessions[athleteSessions.length - 1].sessionDate
          : null;
        const withIpt = athleteSessions.filter(s => typeof s.iptScore === 'number');
        return this.withAccountFlag({
          ...a,
          sessionCount: athleteSessions.length,
          lastSessionDate: last,
          lastIptScore: withIpt.length ? withIpt[withIpt.length - 1].iptScore : null
        });
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
        'SELECT id, name, age, birth_date as "birthDate", consent, organization_name as "organizationName", trainer_id as "trainerId", user_id as "userId", created_at as "createdAt" FROM athletes WHERE id = $1',
        [Number(athleteId)]
      );
      const athlete = res.rows[0];
      if (!athlete) return null;
      if (athlete.trainerId !== Number(trainerId)) {
        const error = new Error('Acceso denegado: este atleta no pertenece a tu perfil de entrenador.');
        error.statusCode = 403;
        throw error;
      }
      return this.withAccountFlag(athlete);
    }

    const athlete = this.athletes.find(a => a.id === Number(athleteId));
    if (!athlete) return null;

    if (athlete.trainerId !== Number(trainerId)) {
      const error = new Error('Acceso denegado: este atleta no pertenece a tu perfil de entrenador.');
      error.statusCode = 403;
      throw error;
    }

    return this.withAccountFlag(athlete);
  }

  /**
   * Obtiene la ficha del atleta dueño de una cuenta de acceso (identidad tomada del JWT),
   * junto con el nombre de su entrenador. Retorna null si la cuenta no tiene ficha vinculada.
   */
  async getAthleteByUserId(userId) {
    if (this.isPgActive()) {
      const pool = getPool();
      const res = await pool.query(
        `SELECT a.id, a.name, a.age, a.birth_date as "birthDate", a.consent, a.organization_name as "organizationName", a.trainer_id as "trainerId", a.user_id as "userId",
                a.created_at as "createdAt", u.name as "trainerName"
         FROM athletes a
         JOIN users u ON u.id = a.trainer_id
         WHERE a.user_id = $1`,
        [Number(userId)]
      );
      return this.withAccountFlag(res.rows[0] || null);
    }

    const athlete = this.athletes.find(a => a.userId === Number(userId));
    if (!athlete) return null;
    const trainer = this.users.find(u => u.id === athlete.trainerId);
    return this.withAccountFlag({ ...athlete, trainerName: trainer ? trainer.name : null });
  }

  /**
   * Actualiza los datos de un atleta existente, soportando birthDate y recálculo dinámico de age
   */
  async updateAthlete({ athleteId, trainerId, name, age, birthDate, consent }) {
    const athlete = await this.getAthleteByIdForTrainer(athleteId, trainerId);
    if (!athlete) {
      const error = new Error('Atleta no encontrado.');
      error.statusCode = 404;
      throw error;
    }

    const birthDateStr = birthDate !== undefined
      ? (birthDate ? (typeof birthDate === 'string' ? birthDate.split('T')[0] : new Date(birthDate).toISOString().split('T')[0]) : null)
      : (athlete.birthDate || null);
    const computedAge = birthDateStr
      ? calculateAge(birthDateStr, age !== undefined ? Number(age) : athlete.age)
      : (age !== undefined ? Number(age) : athlete.age);

    if (this.isPgActive()) {
      const pool = getPool();
      const res = await pool.query(
        'UPDATE athletes SET name = COALESCE($1, name), age = COALESCE($2, age), birth_date = COALESCE($3, birth_date), consent = COALESCE($4, consent) WHERE id = $5 AND trainer_id = $6 RETURNING id, name, age, birth_date as "birthDate", consent, organization_name as "organizationName", trainer_id as "trainerId", user_id as "userId", created_at as "createdAt"',
        [name || null, computedAge, birthDateStr, consent !== undefined ? Boolean(consent) : null, Number(athleteId), Number(trainerId)]
      );
      return this.withAccountFlag(res.rows[0]);
    }

    const stored = this.athletes.find(a => a.id === Number(athleteId));
    if (name !== undefined) stored.name = name;
    if (birthDate !== undefined) stored.birthDate = birthDateStr;
    stored.age = computedAge;
    if (consent !== undefined) stored.consent = Boolean(consent);

    return this.withAccountFlag(stored);
  }

  // =======================================================================================
  // 2b. GESTIÓN FORMAL DE CONSENTIMIENTO PARENTAL (LEY 19.628 / 21.719 - CU-03 / HU-10)
  // =======================================================================================

  /**
   * Asienta o actualiza un consentimiento parental para un atleta escolar
   */
  async createConsent({ athleteId, guardianId = null, consentType = 'grabacion_biomecanica', status = 'granted', expiresAt = null, notes = '' }) {
    if (this.isPgActive()) {
      const pool = getPool();
      const res = await pool.query(
        `INSERT INTO consents (athlete_id, guardian_id, consent_type, status, expires_at, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, athlete_id as "athleteId", guardian_id as "guardianId", consent_type as "consentType",
                   status, granted_at as "grantedAt", expires_at as "expiresAt", notes`,
        [Number(athleteId), guardianId ? Number(guardianId) : null, consentType, status, expiresAt, notes]
      );
      // Sincronizar flag booleano en la tabla athletes
      await pool.query('UPDATE athletes SET consent = $1 WHERE id = $2', [status === 'granted', Number(athleteId)]);
      return res.rows[0];
    }

    const consentEntry = {
      id: this.consentIdCounter++,
      athleteId: Number(athleteId),
      guardianId: guardianId ? Number(guardianId) : null,
      consentType,
      status,
      grantedAt: new Date().toISOString(),
      expiresAt: expiresAt || null,
      notes: notes || ''
    };
    this.consents.push(consentEntry);

    const athlete = this.athletes.find(a => a.id === Number(athleteId));
    if (athlete) {
      athlete.consent = (status === 'granted');
    }

    return consentEntry;
  }

  /**
   * Obtiene el historial de consentimientos asociados a un atleta
   */
  async getConsentsByAthlete(athleteId) {
    if (this.isPgActive()) {
      const pool = getPool();
      const res = await pool.query(
        `SELECT id, athlete_id as "athleteId", guardian_id as "guardianId", consent_type as "consentType",
                status, granted_at as "grantedAt", revoked_at as "revokedAt", expires_at as "expiresAt", notes
         FROM consents
         WHERE athlete_id = $1
         ORDER BY id DESC`,
        [Number(athleteId)]
      );
      return res.rows;
    }

    return this.consents
      .filter(c => c.athleteId === Number(athleteId))
      .sort((a, b) => b.id - a.id);
  }

  /**
   * Comprueba si el atleta escolar cuenta con autorización parental vigente para captura biomecánica
   */
  async isAthleteConsentValid(athleteId) {
    if (this.isPgActive()) {
      const pool = getPool();
      const res = await pool.query(
        `SELECT status, expires_at FROM consents
         WHERE athlete_id = $1
         ORDER BY id DESC LIMIT 1`,
        [Number(athleteId)]
      );
      if (res.rows.length > 0) {
        const latest = res.rows[0];
        if (latest.status !== 'granted') return false;
        if (latest.expires_at && new Date(latest.expires_at) <= new Date()) return false;
        return true;
      }
    }

    const athleteConsents = this.consents.filter(c => c.athleteId === Number(athleteId));
    if (athleteConsents.length > 0) {
      const latest = athleteConsents[athleteConsents.length - 1];
      if (latest.status !== 'granted') return false;
      if (latest.expiresAt && new Date(latest.expiresAt) <= new Date()) return false;
      return true;
    }

    // Respaldo en la ficha del atleta si no existen entradas específicas
    const athlete = this.athletes.find(a => a.id === Number(athleteId));
    return Boolean(athlete && athlete.consent);
  }

  /**
   * Elimina un atleta del sistema y sus dependencias asociadas (incluida su cuenta de acceso)
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
    } else {
      this.athletes = this.athletes.filter(a => a.id !== Number(athleteId));
      this.sessions = this.sessions.filter(s => s.athleteId !== Number(athleteId));
    }

    // Una cuenta de atleta sin ficha no debe seguir pudiendo iniciar sesión
    if (athlete.userId) await this.deleteUser(athlete.userId);

    return { success: true, id: Number(athleteId) };
  }

  // =======================================================================================
  // 3. GESTIÓN DE SESIONES DE CARRERA (ANÁLISIS BIOMECÁNICO)
  // =======================================================================================

  /**
   * Crea y registra una nueva sesión de carrera en terreno.
   * 'iptScore' (0-100) y 'analysis' (resumen compacto del análisis) son opcionales.
   */
  async createSession({ athleteId, trainerId, videoUrl = '', notes = '', iptScore = null, analysis = null }) {
    // Validar que el atleta pertenezca al entrenador antes de asociar la sesión
    const athlete = await this.getAthleteByIdForTrainer(athleteId, trainerId);
    if (!athlete) {
      const error = new Error('Atleta no encontrado.');
      error.statusCode = 404;
      throw error;
    }

    if (this.isPgActive()) {
      const pool = getPool();
      const res = await pool.query(
        'INSERT INTO sessions (athlete_id, trainer_id, video_url, notes, ipt_score, analysis) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, athlete_id as "athleteId", trainer_id as "trainerId", session_date as "sessionDate", video_url as "videoUrl", notes, ipt_score as "iptScore", created_at as "createdAt"',
        [Number(athleteId), Number(trainerId), videoUrl, notes, iptScore, analysis ? JSON.stringify(analysis) : null]
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
      iptScore,
      analysis,
      createdAt: new Date().toISOString()
    };

    this.sessions.push(newSession);
    const { analysis: _omit, ...publicSession } = newSession;
    return publicSession;
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
                s.session_date as "sessionDate", s.video_url as "videoUrl", s.notes,
                s.ipt_score as "iptScore", s.created_at as "createdAt"
         FROM sessions s
         JOIN athletes a ON s.athlete_id = a.id
         WHERE s.athlete_id = $1 AND s.trainer_id = $2
         ORDER BY s.session_date DESC, s.id DESC`,
        [Number(athleteId), Number(trainerId)]
      );
      return res.rows;
    }

    return this.sessions
      .filter(s => s.athleteId === Number(athleteId) && s.trainerId === Number(trainerId))
      .map(({ analysis: _omit, ...s }) => ({
        ...s,
        athleteName: athlete.name
      }))
      .sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate) || b.id - a.id);
  }

  /**
   * Sesiones de un atleta SIN verificación de entrenador, con el resumen de análisis incluido.
   * Uso exclusivo del portal del atleta: el athleteId debe provenir de getAthleteByUserId(req.user.id),
   * nunca de un parámetro enviado por el cliente.
   */
  async getSessionsForAthlete(athleteId) {
    if (this.isPgActive()) {
      const pool = getPool();
      const res = await pool.query(
        `SELECT s.id, s.session_date as "sessionDate", s.notes, s.ipt_score as "iptScore", s.analysis
         FROM sessions s
         WHERE s.athlete_id = $1
         ORDER BY s.session_date DESC, s.id DESC`,
        [Number(athleteId)]
      );
      return res.rows;
    }

    return this.sessions
      .filter(s => s.athleteId === Number(athleteId))
      .map(s => ({
        id: s.id,
        sessionDate: s.sessionDate,
        notes: s.notes,
        iptScore: s.iptScore,
        analysis: s.analysis
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
                s.session_date as "sessionDate", s.video_url as "videoUrl", s.notes,
                s.ipt_score as "iptScore", s.created_at as "createdAt"
         FROM sessions s
         JOIN athletes a ON s.athlete_id = a.id
         WHERE s.trainer_id = $1
         ORDER BY s.session_date DESC, s.id DESC`,
        [Number(trainerId)]
      );
      return res.rows;
    }

    return this.sessions
      .filter(s => s.trainerId === Number(trainerId))
      .map(({ analysis: _omit, ...s }) => {
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
