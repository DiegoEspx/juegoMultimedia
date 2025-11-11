import * as THREE from 'three'
import gsap from 'gsap'
import Experience from '../Experience.js'

// Importa tus shaders
import portalVertexShader from '../../shaders/portal/vertex.glsl'
import portalFragmentShader from '../../shaders/portal/fragment.glsl'

export default class Portal {
    constructor(position = new THREE.Vector3(0, 0, 0)) {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.time = this.experience.time

        this.position = position

        this.setModel()
    }

    setModel() {
        // Geometría circular (como el vórtice)
        const geometry = new THREE.CircleGeometry(2, 64)

        // Material del portal usando tu shader GLSL
        this.material = new THREE.ShaderMaterial({
            vertexShader: portalVertexShader,
            fragmentShader: portalFragmentShader,
            uniforms: {
                uTime: {
                    value: 0
                },
                uColorStart: {
                    value: new THREE.Color('#6dfcff')
                },
                uColorEnd: {
                    value: new THREE.Color('#5c00ff')
                },
                uIntensity: {
                    value: 0
                }, // intensidad controlable (apagado al inicio)
            },
            transparent: true,
            side: THREE.DoubleSide,
        })

        // Malla del portal
        this.mesh = new THREE.Mesh(geometry, this.material)
        this.mesh.rotation.x = -Math.PI / 2
        this.mesh.position.copy(this.position)

        // 🔥 Al inicio, invisible (hasta que se active)
        this.mesh.visible = true

        // Agrega al mundo
        this.scene.add(this.mesh)
    }

    update(delta) {
        // Anima el shader si está activo
        if (this.material.uniforms.uIntensity.value > 0) {
            this.material.uniforms.uTime.value += delta
        }
    }

    // 🔮 Activa el vórtice (cuando recoges todas las monedas)
    activate() {
        this.mesh.visible = true
        gsap.to(this.material.uniforms.uIntensity, {
            value: 1,
            duration: 1.5,
            ease: 'power2.inOut',
        })
    }

    // 💀 Apagar el portal si lo necesitas
    deactivate() {
        gsap.to(this.material.uniforms.uIntensity, {
            value: 0,
            duration: 1.0,
            ease: 'power2.inOut',
            onComplete: () => {
                this.mesh.visible = false
            },
        })
    }
}