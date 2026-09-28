const express = require('express');
const router = express.Router();
const athleteController = require('../controllers/athleteController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Todos los endpoints de atletas requieren estar autenticado como 'entrenador' o 'admin'
router.use(verifyToken);
router.use(requireRole(['entrenador', 'admin']));

router.get('/', athleteController.getAthletes);
router.get('/:id', athleteController.getAthleteById);
router.post('/', athleteController.createAthlete);

module.exports = router;
