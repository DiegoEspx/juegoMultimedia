import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';

export const registerUser = async (req, res) => {
    const {
        email,
        password
    } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Por favor, proporciona email y contraseña.'
        });
    }

    try {
        const user = await User.create({
            email,
            password
        });

        if (user) {
            const token = generateToken(user._id, user.email);

            return res.status(201).json({
                success: true,
                message: 'Registro exitoso.',
                email: user.email,
                token: token,
            });
        }
    } catch (error) {
        console.error('Error en el registro:', error);
        let message = 'Error en el registro.';
        if (error.code === 11000) {
            message = 'El usuario con este correo ya está registrado.';
        } else if (error.errors) {
            message = Object.values(error.errors).map(val => val.message).join(', ');
        }
        return res.status(400).json({
            success: false,
            message: message
        });
    }
};

export const loginUser = async (req, res) => {
    const {
        email,
        password
    } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Por favor, proporciona email y contraseña.'
        });
    }

    try {
        const user = await User.findOne({
            email
        }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas (email o contraseña incorrectos).'
            });
        }

        const isMatch = await user.matchPassword(password);

        if (isMatch) {
            const token = generateToken(user._id, user.email);

            return res.json({
                success: true,
                message: 'Login exitoso.',
                email: user.email,
                token: token,
            });
        } else {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas (email o contraseña incorrectos).'
            });
        }

    } catch (error) {
        console.error('Error en el inicio de sesión:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno en el servidor durante el inicio de sesión.'
        });
    }
};