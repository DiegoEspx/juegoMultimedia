import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import blockRoutes from './routes/blockRoutes.js'; // Asumiendo que esta ya la tienes

dotenv.config(); // Cargar variables de entorno

const app = express();
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/threejs_blocks';
const JWT_SECRET = process.env.JWT_SECRET || 'mi_clave_secreta_super_segura';

// =========================================================
// Conexión a MongoDB
// =========================================================
const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB Conectado exitosamente');
    } catch (error) {
        console.error(`❌ Error al conectar a MongoDB: ${error.message}`);
        process.exit(1);
    }
};

connectDB(); // Inicia la conexión a la base de datos

// =========================================================
// Middlewares
// =========================================================
app.use(express.json()); // Permite a Express parsear JSON en el cuerpo de las peticiones (req.body)

// Configuración de CORS (Importante para que el frontend pueda conectarse)
app.use(cors({
    origin: 'http://localhost:5173', // Ajusta esto al puerto de tu frontend (ej. Vite)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
}));

// =========================================================
// Rutas de la API
// =========================================================
app.use('/api/auth', authRoutes); // Rutas de autenticación (Login y Registro)
app.use('/api/blocks', blockRoutes); // Rutas de los bloques (Deberás protegerlas con el middleware de auth)

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('API corriendo...');
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});