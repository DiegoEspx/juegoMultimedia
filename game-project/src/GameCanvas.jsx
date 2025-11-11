import { useEffect, useRef, useState } from 'react'
import Experience from './Experience/Experience' // Ruta a tu clase principal
import './styles/loader.css' // Se asume que este archivo de estilos existe

/**
 * Componente que contiene el canvas Three.js y el cargador de recursos.
 * Solo se renderiza si el usuario está autenticado.
 */
const GameCanvas = ({ userEmail, authToken, onLogout }) => { 
  const canvasRef = useRef()
  const [progress, setProgress] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 💡 PASA EL TOKEN JWT A LA CLASE EXPERIENCE
    // Tu clase Experience ahora puede usar este token para peticiones seguras al backend.
    const experience = new Experience(canvasRef.current, authToken) 

    const handleProgress = (e) => setProgress(e.detail)
    const handleComplete = () => setLoading(false)

    window.addEventListener('resource-progress', handleProgress)
    window.addEventListener('resource-complete', handleComplete)

    return () => {
      window.removeEventListener('resource-progress', handleProgress)
      window.removeEventListener('resource-complete', handleComplete)
      // Agrega lógica de destrucción/limpieza de Three.js si es necesario
    }
  }, [authToken]) // Dependencia del token para asegurar que Experience se reinicie o inicialice con él
  
  // Controles de sesión superpuestos al canvas
  const sessionControls = (
      <div className="absolute top-4 left-4 p-3 bg-white/80 rounded-lg shadow-xl text-sm z-10 font-mono text-gray-800">
          <p className="font-bold">Sesión: {userEmail}</p>
          <button 
              onClick={onLogout} 
              className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-1 px-4 rounded transition duration-200"
          >
              Cerrar Sesión
          </button>
      </div>
  );

  return (
    <div className="relative w-full h-full">
      {sessionControls} 
      {/* El cargador que usa tus estilos de loader.css */}
      {loading && (
        <div id="loader-overlay" className="fixed inset-0 flex flex-col items-center justify-center bg-gray-900/90 z-20">
          <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
             <div 
                id="loader-bar" 
                className="h-full bg-indigo-500 transition-all duration-300 ease-out" 
                style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div id="loader-text" className="mt-4 text-white font-mono">Cargando... {Math.round(progress)}%</div>
        </div>
      )}
      <canvas ref={canvasRef} className="webgl" />
    </div>
  )
}

export default GameCanvas