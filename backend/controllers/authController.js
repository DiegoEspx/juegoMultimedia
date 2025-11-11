import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';

// =========================================================
// @desc    Registrar un nuevo usuario
// @route   POST /api/auth/register
// =========================================================
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

    // El modelo verifica si el usuario existe (unique: true)
    try {
        // La función User.create activa el middleware 'pre('save')' que hashea la contraseña
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
        // Capturamos errores de validación y de email duplicado (E11000)
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

// =========================================================
// @desc    Autenticar un usuario y obtener token
// @route   POST /api/auth/login
// =========================================================
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
        // 1. Buscar usuario (El .select('+password') es esencial para obtener el hash)
        const user = await User.findOne({
            email
        }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas (email o contraseña incorrectos).'
            });
        }

        // 2. Comprobar la contraseña usando el método definido en el modelo
        const isMatch = await user.matchPassword(password);

        if (isMatch) {
            // 3. Contraseña correcta, generar JWT
            const token = generateToken(user._id, user.email);

            return res.json({
                success: true,
                message: 'Login exitoso.',
                email: user.email,
                token: token,
            });
        } else {
            // 4. Contraseña incorrecta
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