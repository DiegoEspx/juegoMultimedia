import express from 'express';
import {
    registerUser,
    loginUser
} from '../controllers/authController.js';

const router = express.Router();

// Las rutas que llama el Frontend:
router.post('/register', registerUser);
router.post('/login', loginUser);

export default router;