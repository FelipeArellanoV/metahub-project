const crypto = require('crypto');

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
    this.userIdCounter = 1;
    this.athleteIdCounter = 1;
  }

  // Métodos de Usuarios
  async createUser({ name, email, password, role = 'entrenador' }) {
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
    return this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  async findUserById(id) {
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

  // Métodos de Atletas (aislamiento por entrenadorId / trainerId)
  async createAthlete({ name, age, consent = false, trainerId }) {
    if (!trainerId) {
      const error = new Error('Se requiere asociar un entrenador.');
      error.statusCode = 400;
      throw error;
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
    return this.athletes.filter(a => a.trainerId === Number(trainerId));
  }

  async getAthleteByIdForTrainer(athleteId, trainerId) {
    const athlete = this.athletes.find(a => a.id === Number(athleteId));
    if (!athlete) return null;
    
    // Verificación estricta de propiedad
    if (athlete.trainerId !== Number(trainerId)) {
      const error = new Error('Acceso denegado: este atleta no pertenece a tu perfil de entrenador.');
      error.statusCode = 403;
      throw error;
    }

    return athlete;
  }
}

const dbRepository = new Repository();
module.exports = dbRepository;
