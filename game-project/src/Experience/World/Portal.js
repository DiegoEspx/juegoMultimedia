import * as THREE from 'three'
import gsap from 'gsap'
import Experience from '../Experience.js'

// Importa tus shaders base
import portalVertexShader from '../../shaders/portal/vertex.glsl'
import portalFragmentShader from '../../shaders/portal/fragment.glsl'

export default class Portal {
    constructor(position = new THREE.Vector3(0, 0, 0)) {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.time = this.experience.time

        this.position = position

        this.group = new THREE.Group()
        this.group.position.copy(this.position)
        this.scene.add(this.group)

        this.setPortalMesh()
        this.setParticles()
        this.setVortex()
    }

    // 🔮 Portal principal (shader base)
    setPortalMesh() {
        const geometry = new THREE.CircleGeometry(2.5, 64)
        this.material = new THREE.ShaderMaterial({
            vertexShader: portalVertexShader,
            fragmentShader: portalFragmentShader,
            uniforms: {
                uTime: {
                    value: 0
                },
                uColorStart: {
                    value: new THREE.Color('#ff9fff')
                },
                uColorEnd: {
                    value: new THREE.Color('#a800ff')
                },
                uIntensity: {
                    value: 0
                },
            },
            transparent: true,
            side: THREE.DoubleSide,
        })

        this.mesh = new THREE.Mesh(geometry, this.material)
        this.mesh.rotation.x = -Math.PI / 2
        this.group.add(this.mesh)
    }

    // ✨ Capa de partículas girando alrededor del portal
    setParticles() {
        const particleCount = 150
        const positions = new Float32Array(particleCount * 3)
        const sizes = new Float32Array(particleCount)

        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2
            const radius = 2.5 + Math.random() * 0.5
            const x = Math.cos(angle) * radius
            const y = Math.random() * 0.3
            const z = Math.sin(angle) * radius
            positions.set([x, y, z], i * 3)
            sizes[i] = Math.random() * 0.05 + 0.02
        }

        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

        const material = new THREE.PointsMaterial({
            color: '#ff69b4',
            size: 0.06,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        })

        this.particles = new THREE.Points(geometry, material)
        this.group.add(this.particles)
    }

    // 🌀 Efecto espiral interior tipo vórtice
    setVortex() {
        const geometry = new THREE.RingGeometry(0.2, 2, 64, 1)
        const material = new THREE.MeshBasicMaterial({
            color: '#ff4ddb',
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
        })
        this.vortex = new THREE.Mesh(geometry, material)
        this.vortex.rotation.x = -Math.PI / 2
        this.group.add(this.vortex)
    }

    // 🔁 Actualización por frame
    update(delta) {
        if (this.material.uniforms.uIntensity.value > 0) {
            this.material.uniforms.uTime.value += delta
        }

        // Rotaciones animadas
        this.particles.rotation.y += delta * 0.5
        this.vortex.rotation.z += delta * 1.2

        // Pulso leve
        const scale = 1 + Math.sin(this.time.elapsed * 0.003) * 0.05
        this.vortex.scale.set(scale, scale, scale)
    }

    // 🔮 Activar efecto del portal
    activate() {
        this.mesh.visible = true
        gsap.to(this.material.uniforms.uIntensity, {
            value: 1,
            duration: 2,
            ease: 'power2.inOut',
        })
        gsap.to(this.vortex.material, {
            opacity: 1,
            duration: 2,
        })
    }

    // 💀 Apagar el portal
    deactivate() {
        gsap.to(this.material.uniforms.uIntensity, {
            value: 0,
            duration: 1,
            ease: 'power2.inOut',
            onComplete: () => {
                this.mesh.visible = false
            },
        })
        gsap.to(this.vortex.material, {
            opacity: 0,
            duration: 1,
        })
    }
}