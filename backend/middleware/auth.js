const jwt = require('jsonwebtoken');

// Middleware para verificar la validez del token JWT
exports.protect = (req, res, next) => {
    let token;

    // 1. Verificar si el token está presente en el header Authorization (Bearer <token>)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        // Formato: Bearer <token>, extraemos solo el token.
        token = req.headers.authorization.split(' ')[1];
    }

    // 2. Si no hay token, denegar el acceso
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'No autorizado. Token no encontrado.' 
        });
    }

    try {
        // 3. Verificar el token y obtener el payload (ID del usuario)
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 4. Adjuntar el ID del usuario a la solicitud para uso posterior
        req.user = { id: decoded.id };
        
        next(); // Continuar a la siguiente función del controlador/ruta
    } catch (err) {
        // Si el token es inválido o ha expirado
        return res.status(401).json({ 
            success: false, 
            message: 'No autorizado. Token inválido o expirado.' 
        });
    }
};