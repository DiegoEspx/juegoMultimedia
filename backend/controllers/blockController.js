const Block = require('../models/Block');

exports.getBlocks = async (req, res) => {
    try {
        const level = parseInt(req.query.level) || 1;

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

exports.addBlock = async (req, res) => {
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
