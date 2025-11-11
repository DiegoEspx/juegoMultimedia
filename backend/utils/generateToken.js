import jwt from 'jsonwebtoken';

/**
 * Genera un JSON Web Token (JWT) con el ID y email del usuario.
 */
const generateToken = (id, email) => {
    // Usa la variable de entorno para la clave secreta
    const secret = process.env.JWT_SECRET || 'asegurate_de_cambiar_esto_por_una_clave_larga';

    return jwt.sign({
        id,
        email
    }, secret, {
        expiresIn: '1d', // El token es válido por un día
    });
};

export default generateToken;