const Block = require('../models/Block');

// Obtener bloques (ahora requiere autenticación)
exports.getBlocks = async (req, res) => {
    // Opcional: Puedes usar req.user.id aquí para filtrar bloques por usuario
    try {
        const level = parseInt(req.query.level) || 1;

        // El token es válido, se procede a la consulta de bloques
        const blocks = await Block.find({
            level: level
        }).select('name x y z level -_id');

        res.json(blocks);
    } catch (error) {
        console.error('Error al obtener bloques:', error);
        res.status(500).json({
            message: 'Error al obtener bloques',
            error: error.message
        });
    }
};

// Agregar un nuevo bloque (ahora requiere autenticación)
exports.addBlock = async (req, res) => {
    // Opcional: Asigna el ID del usuario al bloque para saber quién lo creó
    // const userId = req.user.id; 
    const {
        name,
        x,
        y,
        z,
        level
    } = req.body;

    try {
        const newBlock = new Block({
            name,
            x,
            y,
            z,
            level,
            // Creador: userId // Si se usa para persistencia por usuario
        });
        await newBlock.save();
        res.status(201).json({
            message: 'Bloque guardado',
            block: newBlock
        });
    } catch (error) {
        console.error('Error al guardar bloque:', error);
        res.status(400).json({
            message: 'Error al guardar bloque',
            error: error.message
        });
    }
}
