const express = require('express');
const router = express.Router();
const blockController = require('../controllers/blockController');
const {
    protect
} = require('../middleware/auth');

router.get('/', blockController.getBlocks);

router.post('/', protect, blockController.addBlock);

module.exports = router;