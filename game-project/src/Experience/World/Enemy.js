import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import FinalPrizeParticles from '../Utils/FinalPrizeParticles.js'
import Sound from './Sound.js'

export default class Enemy {
    constructor({
        scene,
        physicsWorld,
        playerRef,
        model,
        position,
        experience,
        animations = {},
        baseSpeed = 1.0
    }) {
        this.experience = experience
        this.scene = scene
        this.physicsWorld = physicsWorld
        this.playerRef = playerRef
        this.baseSpeed = baseSpeed
        this.speed = this.baseSpeed
        this.delayActivation = 0

        // Sonido de proximidad
        this.proximitySound = new Sound('/sounds/alert.ogg', {
            loop: true,
            volume: 0
        })
        this.proximitySound.play()

        // Modelo visual
        this.model = model.clone()
        this.model.position.copy(position)
        this.scene.add(this.model)

        // Animaciones
        this.mixer = new THREE.AnimationMixer(this.model)
        this.animations = {}
        animations.forEach(clip => this.animations[clip.name] = this.mixer.clipAction(clip))
        if (this.animations['walk']) {
            this.animations['walk'].play();
            this.currentAnimation = 'walk'
        } else this.currentAnimation = null

        // Material físico
        const enemyMaterial = new CANNON.Material('enemyMaterial')
        enemyMaterial.friction = 0.0

        // Cuerpo físico
        const shape = new CANNON.Sphere(0.5)
        this.body = new CANNON.Body({
            mass: 5,
            shape,
            material: enemyMaterial,
            position: new CANNON.Vec3(position.x, position.y, position.z),
            linearDamping: 0.01
        })

        if (this.playerRef?.body) {
            this.body.position.y = this.playerRef.body.position.y
            this.model.position.y = this.body.position.y
        }

        this.body.sleepSpeedLimit = 0.0
        this.body.wakeUp()
        this.physicsWorld.addBody(this.body)
        this.model.userData.physicsBody = this.body
        this._fitModelToCollider()

        // Ajuste inicial usando el floor del mundo
        const floorY = (this.scene.floor?.floorY ?? 0)
        this.body.position.y = floorY + 0.5 // 0.5 es el radio de la esfera
        this.model.position.y = this.body.position.y

        // luego en update(), después de mover el cuerpo:
        this._snapToFloor()

        // Colisión con jugador
        this._onCollide = (event) => {
            if (event.body === this.playerRef.body) {
                if (typeof this.playerRef.die === 'function') this.playerRef.die()
                if (this.proximitySound) this.proximitySound.stop()
                if (this.model.parent) {
                    new FinalPrizeParticles({
                        scene: this.scene,
                        targetPosition: this.body.position,
                        sourcePosition: this.body.position,
                        experience: this.experience
                    })
                    this.destroy()
                }
            }
        }
        this.body.addEventListener('collide', this._onCollide)
    }

    update(delta) {
        if (this.delayActivation > 0) {
            this.delayActivation -= delta;
            return
        }
        if (!this.body || !this.playerRef?.body) return

        const targetPos = new CANNON.Vec3(
            this.playerRef.body.position.x,
            this.playerRef.body.position.y,
            this.playerRef.body.position.z
        )
        const enemyPos = this.body.position

        // ... (Cálculo de velocidad y volumen, sin cambios) ...

        // Movimiento hacia el jugador - SOLO X Y Z
        const direction = new CANNON.Vec3(
            targetPos.x - enemyPos.x,
            0, // <-- FORZAMOS Y A CERO para el cálculo de dirección horizontal
            targetPos.z - enemyPos.z
        )

        if (direction.length() > 0.5) {
            // Rotación: Hacer que el enemigo mire al jugador (usando la dirección horizontal)
            const rotationDirection = direction.clone().normalize()
            const lookTarget = new THREE.Vector3(
                this.playerRef.body.position.x,
                this.model.position.y,
                this.playerRef.body.position.z
            )
            this.model.lookAt(lookTarget) // Mirar al jugador

            // Aplicar Velocidad horizontal
            direction.normalize()
            direction.scale(this.speed, direction)

            this.body.velocity.x = direction.x
            // this.body.velocity.y se deja libre para que la gravedad de CANNON lo maneje
            this.body.velocity.z = direction.z

            // Cambiar animación a 'walk'
            if (this.animations['walk'] && this.currentAnimation !== 'walk') this._playAnimation('walk')
        } else {
            this.body.velocity.x = 0
            this.body.velocity.z = 0
            if (this.animations['idle'] && this.currentAnimation !== 'idle') this._playAnimation('idle')
        }
        if (this.mixer) this.mixer.update(delta)
        this.model.position.copy(this.body.position)
    }
    

    _playAnimation(name) {
        Object.values(this.animations).forEach(a => a.stop())
        if (this.animations[name]) this.animations[name].play()
        this.currentAnimation = name
    }

    destroy() {
        if (this.model) this.scene.remove(this.model)
        if (this.proximitySound) this.proximitySound.stop()
        if (this.body) {
            this.body.removeEventListener('collide', this._onCollide)
            if (this.physicsWorld.bodies.includes(this.body)) this.physicsWorld.removeBody(this.body)
            this.body = null
        }
    }
    _fitModelToCollider() {
        if (!this.model || !this.body) return
        this.model.updateMatrixWorld(true)
        const bbox = new THREE.Box3().setFromObject(this.model)
        const minY = bbox.min.y
        const eps = 0.02
        const targetMin = -0.5 + eps // radio del cuerpo físico
        const dy = targetMin - minY
        this.model.position.y += dy
    }

    _snapToFloor() {
        if (!this.body) return
        const world = this.physicsWorld
        const from = new CANNON.Vec3(this.body.position.x, this.body.position.y + 1, this.body.position.z)
        const to = new CANNON.Vec3(this.body.position.x, this.body.position.y - 5, this.body.position.z)

        const ray = new CANNON.Ray(from, to)
        const result = new CANNON.RaycastResult()
        ray.intersectWorld(world, {
            mode: CANNON.Ray.ANY,
            skipBackfaces: true
        }, result)

        if (result.hasHit) {
            this.body.position.y = result.hitPointWorld.y + 0.5 // radio del collider
            this.model.position.y = this.body.position.y
        }
    }

}