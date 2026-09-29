const dbRepository = require('../db/repository');

async function getAthletes(req, res) {
  try {
    const trainerId = req.user.id;
    const athletes = await dbRepository.getAthletesByTrainer(trainerId);
    return res.json({ athletes });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function getAthleteById(req, res) {
  try {
    const athleteId = req.params.id;
    const trainerId = req.user.id;
    const athlete = await dbRepository.getAthleteByIdForTrainer(athleteId, trainerId);
    
    if (!athlete) {
      return res.status(404).json({ error: 'Atleta no encontrado.' });
    }

    return res.json({ athlete });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message });
  }
}

async function createAthlete(req, res) {
  try {
    const { name, age, consent } = req.body;
    const trainerId = req.user.id;

    if (!name || age === undefined) {
      return res.status(400).json({
        error: 'El nombre y la edad del atleta son requeridos.'
      });
    }

    const newAthlete = await dbRepository.createAthlete({
      name,
      age,
      consent,
      trainerId
    });

    return res.status(201).json({
      message: 'Atleta registrado exitosamente.',
      athlete: newAthlete
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message });
  }
}

async function updateAthlete(req, res) {
  try {
    const athleteId = req.params.id;
    const trainerId = req.user.id;
    const { name, age, consent } = req.body;

    const updated = await dbRepository.updateAthlete({
      athleteId,
      trainerId,
      name,
      age,
      consent
    });

    return res.json({
      message: 'Atleta actualizado exitosamente.',
      athlete: updated
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message });
  }
}

async function deleteAthlete(req, res) {
  try {
    const athleteId = req.params.id;
    const trainerId = req.user.id;

    await dbRepository.deleteAthlete({
      athleteId,
      trainerId
    });

    return res.json({
      message: 'Atleta eliminado exitosamente.',
      id: Number(athleteId)
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message });
  }
}

module.exports = {
  getAthletes,
  getAthleteById,
  createAthlete,
  updateAthlete,
  deleteAthlete
};
