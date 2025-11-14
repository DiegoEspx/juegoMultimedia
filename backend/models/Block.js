// backend/models/Block.js

const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema({
    name: String,
    x: Number,
    y: Number,
    z: Number,
    role: String,
    level: {
        type: Number,
        required: true,
        default: 1
    }
});

module.exports = mongoose.model('Block', blockSchema);