// backend/models/Block.js

const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema({
    name: String,
    x: Number,
    y: Number,
    z: Number,
    level: {
        type: Number,
        required: true,
        default: 1 // Valor por defecto si no se especifica
    }
});

module.exports = mongoose.model('Block', blockSchema);