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
router.put('/:id', athleteController.updateAthlete);
router.delete('/:id', athleteController.deleteAthlete);

// Gestión formal de Consentimientos Informados (CU-07 / HU-10)
router.get('/:id/consents', athleteController.getAthleteConsents);
router.post('/:id/consents', athleteController.createAthleteConsent);

module.exports = router;
