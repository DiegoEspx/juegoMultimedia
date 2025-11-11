import React, { useState } from "react";
import "./App.css"; // Importa tu hoja de estilos CSS

const API_BASE_URL = "http://localhost:3001/api/auth";

const LockIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const App = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });
    setIsLoading(true);

    const url = isRegisterMode
      ? `${API_BASE_URL}/register`
      : `${API_BASE_URL}/login`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: username, password }),
      });

      const data = await response.json();
      if (response.ok) {
        if (isRegisterMode) {
          showMessage(
            "Registro exitoso. ¡Ahora puedes iniciar sesión!",
            "success"
          );
          setIsRegisterMode(false);
          setUsername("");
          setPassword("");
        } else {
          showMessage("Inicio de sesión exitoso.", "success");
          if (onLoginSuccess && data.token) onLoginSuccess(data.token);
        }
      } else {
        showMessage(data.message || response.statusText, "error");
      }
    } catch (error) {
      showMessage("Error de conexión. Intenta de nuevo más tarde.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>{isRegisterMode ? "Crea tu Cuenta" : "Acceso al Sistema"}</h2>
          <p>
            {isRegisterMode
              ? "Únete a la plataforma"
              : "Ingresa tus credenciales"}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Nombre de Usuario</label>
            <input
              type="text"
              id="username"
              placeholder="Ej. usuario_master"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          {message.text && (
            <div className={`message ${message.type}`}>{message.text}</div>
          )}

          <button type="submit" disabled={isLoading}>
            {isLoading
              ? isRegisterMode
                ? "Registrando..."
                : "Accediendo..."
              : isRegisterMode
              ? "Registrarse"
              : "Acceder"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isRegisterMode
              ? "¿Ya tienes una cuenta?"
              : "¿No tienes una cuenta?"}
            <button
              onClick={() => setIsRegisterMode(!isRegisterMode)}
              disabled={isLoading}
              className="toggle-btn"
            >
              {isRegisterMode ? "Inicia Sesión" : "Regístrate Aquí"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
