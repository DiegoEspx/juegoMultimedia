const express = require('express');
const router = express.Router();
const blockController = require('../controllers/blockController');
const {
    protect
} = require('../middleware/auth'); // Importa el middleware

// Rutas protegidas con el middleware 'protect'
// Solo se podrá acceder si se proporciona un token JWT válido
router.get('/', protect, blockController.getBlocks);
router.post('/', protect, blockController.addBlock);

// Nota: Si tenías otras rutas como /batch, también deben ser protegidas si quieres que sean seguras.

module.exports = router;