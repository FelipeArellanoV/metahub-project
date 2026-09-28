const dbRepository = require('../db/repository');
const { sign } = require('../config/jwt');

async function register(req, res) {
  try {
    const { name, email, password, role } = req.body || {};

    if (!name || !email || !password) {
      res.statusCode = 400;
      return res.json({
        error: 'Nombre, correo electrónico y contraseña son obligatorios.'
      });
    }

    if (password.length < 6) {
      res.statusCode = 400;
      return res.json({
        error: 'La contraseña debe tener al menos 6 caracteres.'
      });
    }

    const user = await dbRepository.createUser({ name, email, password, role });
    const token = sign({ id: user.id, email: user.email, role: user.role, name: user.name });

    res.statusCode = 201;
    return res.json({
      message: 'Usuario registrado exitosamente.',
      user,
      token
    });
  } catch (err) {
    res.statusCode = err.statusCode || 500;
    return res.json({ error: err.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      res.statusCode = 400;
      return res.json({
        error: 'Correo y contraseña son requeridos.'
      });
    }

    const user = await dbRepository.findUserByEmail(email);
    if (!user) {
      res.statusCode = 401;
      return res.json({
        error: 'Credenciales inválidas.'
      });
    }

    const isValid = await dbRepository.validatePassword(user, password);
    if (!isValid) {
      res.statusCode = 401;
      return res.json({
        error: 'Credenciales inválidas.'
      });
    }

    const safeUser = dbRepository.sanitizeUser(user);
    const token = sign({ id: safeUser.id, email: safeUser.email, role: safeUser.role, name: safeUser.name });

    res.statusCode = 200;
    return res.json({
      message: 'Inicio de sesión exitoso.',
      user: safeUser,
      token
    });
  } catch (err) {
    res.statusCode = 500;
    return res.json({ error: err.message });
  }
}

async function getProfile(req, res) {
  try {
    const user = await dbRepository.findUserById(req.user.id);
    if (!user) {
      res.statusCode = 404;
      return res.json({ error: 'Usuario no encontrado.' });
    }
    return res.json({ user });
  } catch (err) {
    res.statusCode = 500;
    return res.json({ error: err.message });
  }
}

module.exports = {
  register,
  login,
  getProfile
};
