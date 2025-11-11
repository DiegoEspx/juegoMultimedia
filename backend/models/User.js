import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Define el esquema para el modelo de usuario
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'El correo electrónico es obligatorio'],
    unique: true, // ¡CRUCIAL! Previene el error 400 si se intenta registrar dos veces el mismo email
    lowercase: true,
    trim: true,
    match: [/.+\@.+\..+/, 'Por favor, usa un email válido']
  },
  password: {
    type: String,
    required: [true, 'La contraseña es obligatoria'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
    select: false, // ¡CRUCIAL! Previene que el hash de la contraseña se envíe en consultas normales
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Middleware que encripta la contraseña antes de guardarla en la base de datos
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Método para verificar la contraseña en el login
userSchema.methods.matchPassword = async function (enteredPassword) {
  // Compara el texto plano con el hash guardado (this.password)
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;