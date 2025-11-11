import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import PortalEfects from "../components/PortalEfects";

export default function Portal() {
  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ height: "600px" }}>
        <Canvas
          shadows
          flat
          camera={{ fov: 45, near: 0.1, far: 50, position: [1, 2, 6] }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />

          {/* Efecto del portal */}
          <PortalEfects />

          <OrbitControls />
        </Canvas>
      </div>
    </div>
  );
}
