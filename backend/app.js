import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import blockRoutes from './routes/blockRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/threejs_blocks';
const JWT_SECRET = process.env.JWT_SECRET || 'mi_clave_secreta_super_segura';


const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB Conectado exitosamente');
    } catch (error) {
        console.error(`❌ Error al conectar a MongoDB: ${error.message}`);
        process.exit(1);
    }
};

connectDB();


app.use(express.json());

app.use(cors({
    origin: 'https://juego-multimedia-brown.vercel.app/',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
}));


app.use('/api/auth', authRoutes);
app.use('/api/blocks', blockRoutes);

app.get('/', (req, res) => {
    res.send('API corriendo...');
});