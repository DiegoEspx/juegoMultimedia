const jwt = require('jsonwebtoken');

exports.protect = (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'No autorizado. Token no encontrado.' 
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        req.user = { id: decoded.id };
        
        next(); 
    } catch (err) {
        return res.status(401).json({ 
            success: false, 
            message: 'No autorizado. Token inválido o expirado.' 
        });
    }
};