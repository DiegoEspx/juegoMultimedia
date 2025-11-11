import jwt from 'jsonwebtoken';

// Función para generar un JWT
const generateToken = (id, email) => {
    // El token se firma con el ID y el email del usuario.
    // Utiliza una variable de entorno para la clave secreta (process.env.JWT_SECRET)
    return jwt.sign({ id, email }, process.env.JWT_SECRET, {
        expiresIn: '1d', // El token expira en 1 día
    });
};

export default generateToken;