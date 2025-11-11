import * as THREE from 'three'

export default class Fox {
    constructor(experience) {
        this.experience = experience
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.time = this.experience.time
        this.debug = this.experience.debug
        this.granjero = this.experience.world.granjero
        // Debug
        if (this.debug.active) {
            this.debugFolder = this.debug.ui.addFolder('fox')
        }

        // Resource
        this.resource = this.resources.items.foxModel

        this.setModel()
        this.setAnimation()
    }

    setModel() {
        this.model = this.resource.scene
        this.model.scale.set(0.008, 0.008, 0.008)
        this.model.position.set(3, 0.1, -10)
        this.scene.add(this.model)
        //Activando la sobra de fox
        this.model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true
            }
        })
    }

    setAnimation() {
        this.animation = {}

        // Mixer
        this.animation.mixer = new THREE.AnimationMixer(this.model)

        // Actions
        this.animation.actions = {}

        this.animation.actions.idle = this.animation.mixer.clipAction(this.resource.animations[0])
        this.animation.actions.walking = this.animation.mixer.clipAction(this.resource.animations[1])
        this.animation.actions.running = this.animation.mixer.clipAction(this.resource.animations[2])

        // Configuración adicional para evitar problemas
        Object.values(this.animation.actions).forEach(action => {
            // Esto ayuda a que el crossfade sea más suave
            action.setEffectiveWeight(1.0).play()
            action.enabled = true
        })

        // Inicializar
        this.animation.actions.current = this.animation.actions.idle
        this.animation.actions.current.play()


        // Play the action
        this.animation.play = (name) => {
            const newAction = this.animation.actions[name]
            const oldAction = this.animation.actions.current

            // Solo cambiar si la nueva acción es diferente a la actual
            if (newAction !== oldAction) {
                newAction.reset()
                newAction.play()

                // CrossFade más largo (0.5s) para más suavidad, luego ajusta
                // Si la animación es muy corta, un crossfade corto (0.1 o 0.2) puede ser mejor.
                const crossFadeDuration = 0.3;
                newAction.crossFadeFrom(oldAction, crossFadeDuration)

                this.animation.actions.current = newAction
            }
        }

        // Debug
        if (this.debug.active) {
            const debugObject = {
                playIdle: () => {
                    this.animation.play('idle')
                },
                playWalking: () => {
                    this.animation.play('walking')
                },
                playRunning: () => {
                    this.animation.play('running')
                }
            }
            this.debugFolder.add(debugObject, 'playIdle')
            this.debugFolder.add(debugObject, 'playWalking')
            this.debugFolder.add(debugObject, 'playRunning')
        }
    }

    update() {
        if (!this.granjero) {
            this.granjero = this.experience.world.granjero
        }

        // 🛑 CORRECCIÓN CLAVE: Usar solo this.time.delta * 0.001 (tiempo en segundos)
        // El * 4 extra lo hace 4 veces más rápido.
        this.animation.mixer.update(this.time.delta * 0.001)

        if (this.granjero && this.granjero.group) {
            const foxPosition = this.model.position
            const granjeroPosition = this.granjero.group.position

            // Vector 2D del objetivo (ignorando la altura y del zorro en el movimiento)
            const targetPosition2D = new THREE.Vector3(granjeroPosition.x, foxPosition.y, granjeroPosition.z);


            const direction = targetPosition2D.clone().sub(foxPosition)
            const distance = direction.length()

            // --- ✨ AJUSTES AQUÍ ---
            const minDistance = 1.2 // Distancia mínima para detenerse
            const followSpeed = 5.0; // Velocidad de seguimiento ajustada
            const turnSpeed = 0.009; // Velocidad de rotación LERP: ajustada para usar delta sin el * 9

            let currentAnimation = 'idle';

            if (distance > minDistance) {
                // Queremos que siempre CORRA cuando se mueve
                currentAnimation = 'running';

                // Movimiento
                direction.normalize()
                // La velocidad de seguimiento se aplica aquí, no en el mixer
                const moveDelta = direction.multiplyScalar(followSpeed * this.time.delta * 0.001)
                this.model.position.add(moveDelta)

                // Rotación suave (la cabeza sigue al objetivo)
                const targetAngle = Math.atan2(direction.x, direction.z)

                // Usar LERP con un factor de 'turnSpeed' (0 a 1)
                this.model.rotation.y = THREE.MathUtils.lerp(
                    this.model.rotation.y,
                    targetAngle,
                    turnSpeed * this.time.delta // Usamos el delta en la LERP para que sea frame-rate independent
                )
            } else {
                // Si está cerca, se detiene
                currentAnimation = 'idle';
            }

            // 💡 Lógica de cambio de animación más limpia
            const currentActionName = this.animation.actions.current.getClip().name;
            if (currentAnimation !== currentActionName) {
                this.animation.play(currentAnimation);
            }
        }
    }
}