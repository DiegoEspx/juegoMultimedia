import React from "react";
import { useEffect, useRef, useState } from "react";
import Experience from "./Experience/Experience"; // Tu clase Three.js
import LoginScreen from "./LoginScreen"; // 👈 Necesitas crear este componente
import "./styles/loader.css"; // Estilos globales si los necesitas

// Define la llave para el token en localStorage
const AUTH_TOKEN_KEY = "authToken";

const App = () => {
  const canvasRef = useRef();

  // --- ESTADOS DE LA APLICACIÓN ---
  const [progress, setProgress] = useState(0);
  const [isLoadingResources, setIsLoadingResources] = useState(true); // Estado de carga de Three.js
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Estado de sesión JWT

  // --- 1. Lógica de Montaje e Inicialización ---
  useEffect(() => {
    // Comprobar si existe el token guardado al cargar la app
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      // En una app real, aquí validarías el token contra el backend antes de setear a true
      setIsAuthenticated(true);
    }
  }, []);

  // --- 2. Lógica de Carga de Recursos (Se ejecuta solo si isAuthenticated es true) ---
  useEffect(() => {
    let experienceInstance = null;

    if (isAuthenticated) {
      console.log("Usuario autenticado. Cargando experiencia 3D...");

      // Inicializar la experiencia Three.js
      experienceInstance = new Experience(canvasRef.current);

      const handleProgress = (e) => setProgress(e.detail);
      const handleComplete = () => setIsLoadingResources(false);

      window.addEventListener("resource-progress", handleProgress);
      window.addEventListener("resource-complete", handleComplete);

      // Cleanup: Limpieza de eventos al desmontar
      return () => {
        window.removeEventListener("resource-progress", handleProgress);
        window.removeEventListener("resource-complete", handleComplete);
        // Opcional: Destruir la instancia de Experience si es necesario
        // if (experienceInstance && experienceInstance.destroy) {
        //     experienceInstance.destroy();
        // }
      };
    }
    // Si no está autenticado, no hacemos nada aquí
  }, [isAuthenticated]); // Dependencia clave

  // --- 3. Manejadores de Autenticación ---

  /** * Función que el LoginScreen llama al iniciar sesión exitosamente.
   * @param {string} token - El JWT recibido del backend.
   */
  const handleLoginSuccess = (token) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    setIsAuthenticated(true); // Esto dispara el useEffect que inicializa Experience
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setIsAuthenticated(false);
    setIsLoadingResources(true); // Restablecer la carga si el usuario cierra sesión
  };

  // --- 4. Renderizado Condicional ---

  // Si no está autenticado, muestra la pantalla de Login
  if (!isAuthenticated) {
    // Debes pasarle la función de éxito al componente de Login
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Si está autenticado, muestra el loader o el juego
  return (
    <>
      {(isLoadingResources || progress < 100) && (
        // El loader se muestra mientras los recursos 3D se cargan
        <div id="loader-overlay">
          <div id="loader-bar" style={{ width: `${progress}%` }}></div>
          <div id="loader-text">Cargando juego... {Math.round(progress)}%</div>
        </div>
      )}

      {/* El Canvas siempre existe, pero Experience solo se inicializa si está autenticado */}
      <canvas
        ref={canvasRef}
        className="webgl"
        style={{ display: isLoadingResources ? "none" : "block" }}
      />

      {/* Botón de Salida (Opcional) */}
      {!isLoadingResources && (
        <button
          onClick={handleLogout}
          style={{
            position: "fixed",
            top: "10px",
            right: "10px",
            zIndex: 1000,
            padding: "10px",
            backgroundColor: "red",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          Cerrar Sesión
        </button>
      )}
    </>
  );
};

export default App;
