const dbRepository = require('../db/repository');

async function createSession(req, res) {
  try {
    const { athleteId, videoUrl, notes } = req.body || {};
    const trainerId = req.user.id;

    if (!athleteId) {
      return res.status(400).json({ error: 'El ID del atleta es obligatorio.' });
    }

    const session = await dbRepository.createSession({
      athleteId,
      trainerId,
      videoUrl,
      notes
    });

    return res.status(201).json({
      message: 'Sesión creada exitosamente.',
      session
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message });
  }
}

async function getAthleteSessions(req, res) {
  try {
    const athleteId = req.params.athleteId;
    const trainerId = req.user.id;

    const sessions = await dbRepository.getSessionsByAthlete(athleteId, trainerId);
    return res.json({ sessions });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message });
  }
}

module.exports = {
  createSession,
  getAthleteSessions
};
