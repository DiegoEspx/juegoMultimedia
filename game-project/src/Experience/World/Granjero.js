// Experience/World/Granjero.js
import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import Sound from './Sound.js'

export default class Granjero {
    constructor(experience) {
        this.experience = experience
        this.scene = experience.scene
        this.resources = experience.resources
        this.time = experience.time
        this.physics = experience.physics
        this.keyboard = experience.keyboard
        this.debug = experience.debug
        this.points = 0
        this._shiftDown = false
        this._spaceHeld = false

        // ---- Config tunable
        this.cfg = {
            // movimiento
            baseForce: 150,
            sprintMult: 1.8,
            turnSpeed: 3.2,
            maxSpeed: 9,
            maxSpeedSprint: 13,
            linearDamping: 0.07,
            angularDamping: 0.4,

            // salto / grounded helpers
            jumpImpulse: 5.2,
            airControl: 0.35,
            coyoteMs: 120,
            jumpBufferMs: 140,
            minGroundDot: 0.5,

            // cuerpo físico
            radius: 0.38, // se recalcula con el alto del modelo
            mass: 2,

            // seguridad
            fallResetY: 12,
            spawn: new CANNON.Vec3(0, 1.2, 0),
        }

        this.state = {
            grounded: false,
            lastGroundMs: 0,
            lastJumpPressMs: -9999,
            dead: false,
        }

        this.setModel() // define modelo y ajusta pies + radio
        this.setSounds()
        this.setPhysics() // usa floorY + radius para el spawn
        this.setAnimation()
        this._wireCollisions()
        this.snapToFloor() // corrige en caliente si hace falta
    }

    // =============== MODELO ===============
    // =============== MODELO ===============
    setModel() {
        const items = this.resources.items || {};
        const gltf = items.granjeroModel || null;
        if (!gltf || !gltf.scene) {
            console.error('❌ granjeroModel no cargado en resources.items');
            this.model = new THREE.Group();
            this.group = new THREE.Group();
            this.group.add(this.model);
            this.scene.add(this.group);
            return;
        }

        // 1) Instancia y agrega a la escena
        this.model = gltf.scene;
        this.model.scale.set(1, 1, 1);
        this.model.position.set(0, 0, 0);

        this.group = new THREE.Group();
        this.group.add(this.model);
        this.scene.add(this.group);

        // 2) Pintar por código (ignora materiales del GLB)
        // Paleta por defecto
        this.palette = {
            hat: 0x7a4b2a, // sombrero
            skin: 0xf4c7a1, // piel
            shirt: 0x1c9c4b, // camisa/overol
            pants: 0x2a2a2a, // pantalón
            boots: 0x4a2d1b, // botas
            moustache: 0x3a2a1a, // bigote
            hair: 0x3c2f21, // pelo/cejas
            belt: 0x282828, // cinturón
            metal: 0xaaaaaa, // hebillas/metal
            default: 0xb6d53e // fallback
        };

        // Helpers de pintado
        var nameHas = function (child) {
            var n = (child.name || '').toLowerCase();
            for (var i = 1; i < arguments.length; i++) {
                if (n.indexOf(arguments[i]) !== -1) return true;
            }
            return false;
        };

        var makeMat = function (hex) {
            var mat = new THREE.MeshStandardMaterial({
                color: hex,
                roughness: 0.9,
                metalness: 0.0
            });
            mat.toneMapped = true;
            return mat;
        };

        var self = this; // para usar dentro de funciones
        var paintMesh = function (child) {
            var color = self.palette.default;

            if (nameHas(child, 'hat', 'sombrero')) color = self.palette.hat;
            else if (nameHas(child, 'skin', 'cara', 'head', 'face', 'piel')) color = self.palette.skin;
            else if (nameHas(child, 'shirt', 'camisa', 'chest', 'torso', 'overol', 'pecho')) color = self.palette.shirt;
            else if (nameHas(child, 'pant', 'pantal', 'leg', 'pierna')) color = self.palette.pants;
            else if (nameHas(child, 'boot', 'shoe', 'bot', 'zapato', 'foot')) color = self.palette.boots;
            else if (nameHas(child, 'moustache', 'bigote')) color = self.palette.moustache;
            else if (nameHas(child, 'hair', 'pelo', 'ceja', 'eyebrow')) color = self.palette.hair;
            else if (nameHas(child, 'belt', 'cinturon')) color = self.palette.belt;
            else if (nameHas(child, 'metal', 'hebilla', 'buckle')) color = self.palette.metal;

            if (Array.isArray(child.material)) {
                child.material = child.material.map(function () {
                    return makeMat(color);
                });
            } else {
                child.material = makeMat(color);
            }
            child.castShadow = true;
            child.receiveShadow = true;
        };

        // Recorre el modelo y pinta todo
        this.model.traverse(function (child) {
            if (child.isMesh) paintMesh(child);
        });

        // API para cambiar colores en runtime
        this.setPalette = (partial) => {
            this.palette = Object.assign({}, this.palette, partial || {});
            this.model.traverse(function (child) {
                if (child.isMesh) paintMesh(child);
            });
        };

        // 3) Inputs de sprint (Shift)
        this._shiftDown = false;
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') this._shiftDown = true;
        });
        window.addEventListener('keyup', (e) => {
            if (e.key === 'Shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') this._shiftDown = false;
        });

        // 4) Ajusta radio por altura real y alinea pies al collider
        var bbox = new THREE.Box3().setFromObject(this.model);
        var size = new THREE.Vector3();
        bbox.getSize(size);
        var charHeight = Math.max(0.001, size.y);
        this.cfg.radius = Math.max(0.15, charHeight * 0.48);
        this._fitModelToCollider();
    }


    // Alinear pies al collider (tangencia con la esfera)
    _fitModelToCollider() {
        this.model.updateMatrixWorld(true)
        const bbox = new THREE.Box3().setFromObject(this.model)
        const minY = bbox.min.y
        const eps = 0.02
        const targetMin = -this.cfg.radius + eps
        const dy = targetMin - minY
        this.model.position.y += dy
    }

    // =============== FÍSICA ===============
    setPhysics() {
        const shape = new CANNON.Sphere(this.cfg.radius)

        // materiales con fricción
        this.physics.granjeroMaterial = this.physics.granjeroMaterial || new CANNON.Material('granjero')
        this.physics.sueloMaterial = this.physics.sueloMaterial || new CANNON.Material('suelo')

        if (!this.physics._granjeroSueloCM) {
            this.physics._granjeroSueloCM = new CANNON.ContactMaterial(
                this.physics.granjeroMaterial,
                this.physics.sueloMaterial, {
                    friction: 0.65,
                    restitution: 0.0,
                    contactEquationStiffness: 1e7,
                    contactEquationRelaxation: 3
                }
            )
            this.physics.world.addContactMaterial(this.physics._granjeroSueloCM)
        }

        // spawn en base al piso real
        const floorY =
            (this.experience && this.experience.world && this.experience.world.floor && this.experience.world.floor.floorY) || 0
        const spawnY = floorY + this.cfg.radius + 0.02

        this.body = new CANNON.Body({
            mass: this.cfg.mass,
            shape,
            position: new CANNON.Vec3(this.cfg.spawn.x, spawnY, this.cfg.spawn.z),
            linearDamping: 0.15,
            angularDamping: this.cfg.angularDamping,
            material: this.physics.granjeroMaterial
        })
        this.body.angularFactor.set(0, 1, 0)
        this.physics.world.addBody(this.body)

        // Ray helper
        this._groundRay = new CANNON.Ray()
        this._groundRayModeDist = this.cfg.radius + 0.1
    }

    // =============== SONIDOS ===============
    setSounds() {
        this.walkSound = new Sound('/sounds/robot/walking.mp3', {
            loop: true,
            volume: 0.45
        })
        this.jumpSound = new Sound('/sounds/robot/jump.mp3', {
            volume: 0.8
        })
    }

    // =============== ANIMACIÓN ===============
    setAnimation() {
        this.animation = {
            mixer: null,
            actions: {},
            play: () => {}
        }
        if (!this.model) return

        this.animation.mixer = new THREE.AnimationMixer(this.model)

        const items = this.resources.items || {}
        const gm = items.granjeroModel || {}
        const clips = gm.animations || []
        const by = (n) => {
            for (let i = 0; i < clips.length; i++) {
                const nm = (clips[i].name || '').toLowerCase()
                if (nm.indexOf(n) !== -1) return clips[i]
            }
            return null
        }

        const idle = by('idle') || clips[0] || null
        const walk = by('walk') || by('run')
        const jump = by('jump')
        const death = by('death') || by('die')
        const dance = by('dance')

        if (idle) this.animation.actions.idle = this.animation.mixer.clipAction(idle)
        if (walk) this.animation.actions.walking = this.animation.mixer.clipAction(walk)
        if (jump) this.animation.actions.jump = this.animation.mixer.clipAction(jump)
        if (death) this.animation.actions.death = this.animation.mixer.clipAction(death)
        if (dance) this.animation.actions.dance = this.animation.mixer.clipAction(dance)

        this.animation.actions.current = this.animation.actions.idle || this.animation.actions.walking
        if (this.animation.actions.current) this.animation.actions.current.play()

        if (this.animation.actions.jump) {
            this.animation.actions.jump.setLoop(THREE.LoopOnce)
            this.animation.actions.jump.clampWhenFinished = true
        }

        this.animation.play = (name) => {
            const next = this.animation.actions[name]
            const prev = this.animation.actions.current
            if (!next || next === prev) return
            next.reset().play()
            if (prev) next.crossFadeFrom(prev, 0.2, false)
            this.animation.actions.current = next
        }
    }

    // =============== COLISIONES (grounded) ===============
    _wireCollisions() {
        const up = new CANNON.Vec3(0, 1, 0)
        this.body.addEventListener('collide', (e) => {
            const contact = e.contact || null
            const ni = contact ? contact.ni : null
            if (!ni) return
            const dot = Math.abs(ni.dot(up))
            if (dot > this.cfg.minGroundDot) {
                this.state.grounded = true
                this.state.lastGroundMs = this.time.elapsed
            }
        })
    }

    // =============== INPUT UTILS ===============
    _readKeys() {
        const getter = this.keyboard.getState
        const k = (typeof getter === 'function' ? getter.call(this.keyboard) : {}) || {}
        return {
            up: k.up || k.w,
            down: k.down || k.s,
            left: k.left || k.a,
            right: k.right || k.d,
            shift: !!k.shift,
            space: !!k.space,
        }
    }

    _canUseCoyote(nowMs) {
        return this.state.grounded || (nowMs - this.state.lastGroundMs) <= this.cfg.coyoteMs
    }

    _clampHorizontalSpeed(max) {
        const v = this.body.velocity
        const horiz = Math.hypot(v.x, v.z)
        if (horiz > max) {
            const s = max / (horiz || 1e-6)
            v.x *= s
            v.z *= s
        }
    }

    // =============== UPDATE LOOP ===============
    update() {
        if (this.state.dead) return
        const dt = Math.max(0.0001, this.time.delta * 0.001)
        if (this.animation.mixer) this.animation.mixer.update(dt)

        const nowMs = this.time.elapsed || (typeof performance !== 'undefined' ? performance.now() : Date.now())
        const keys = this._readKeys()

        const maxSpeed = keys.shift ? this.cfg.maxSpeedSprint : this.cfg.maxSpeed
        const controlFactor = this._canUseCoyote(nowMs) ? 1.0 : this.cfg.airControl

        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion)
        const backward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.group.quaternion)

        const moveForce = this.cfg.baseForce * (keys.shift ? this.cfg.sprintMult : 1.0) * controlFactor
        let moving = false

        if (keys.up) {
            this.body.applyForce(new CANNON.Vec3(forward.x * moveForce, 0, forward.z * moveForce), this.body.position)
            moving = true
        }
        if (keys.down) {
            this.body.applyForce(new CANNON.Vec3(backward.x * moveForce, 0, backward.z * moveForce), this.body.position)
            moving = true
        }

        if (keys.left) {
            this.group.rotation.y += this.cfg.turnSpeed * dt
            this.body.quaternion.setFromEuler(0, this.group.rotation.y, 0)
        }
        if (keys.right) {
            this.group.rotation.y -= this.cfg.turnSpeed * dt
            this.body.quaternion.setFromEuler(0, this.group.rotation.y, 0)
        }

        this._clampHorizontalSpeed(maxSpeed)

        if (this.animation && this.animation.actions) {
            const acts = this.animation.actions
            if (moving && acts.current !== acts.walking && this._canUseCoyote(nowMs) && acts.walking) {
                this.animation.play('walking')
                if (this.walkSound && this.walkSound.play) this.walkSound.play()
            }
            if (!moving && acts.current !== acts.idle && this._canUseCoyote(nowMs) && acts.idle) {
                this.animation.play('idle')
                if (this.walkSound && this.walkSound.stop) this.walkSound.stop()
            }
            if (!this._canUseCoyote(nowMs) && acts.current !== acts.jump && acts.jump) {
                if (this.walkSound && this.walkSound.stop) this.walkSound.stop()
            }
        }

        // sincronizar transform visual
        this.group.position.copy(this.body.position)

        // safety reset
        if (this.body.position.y > this.cfg.fallResetY || this.body.position.y < -this.cfg.fallResetY) {
            this._resetToSpawn()
        }
    }

    _resetToSpawn() {
        const floorY =
            (this.experience && this.experience.world && this.experience.world.floor && this.experience.world.floor.floorY) || 0
        const spawn = new CANNON.Vec3(this.cfg.spawn.x, floorY + this.cfg.radius + 0.02, this.cfg.spawn.z)
        this.body.position.copy(spawn)
        this.body.velocity.set(0, 0, 0)
        this.body.angularVelocity.set(0, 0, 0)
        this.group.position.copy(spawn)
    }

    // Pegarlo al piso usando raycast (útil tras cambiar alturas/niveles)
    snapToFloor() {
        const world = this.physics.world
        if (!world || !this.body) return

        const from = new CANNON.Vec3(this.body.position.x, this.body.position.y + 1, this.body.position.z)
        const to = new CANNON.Vec3(this.body.position.x, this.body.position.y - 5, this.body.position.z)

        const ray = new CANNON.Ray(from, to)
        const result = new CANNON.RaycastResult()
        ray.intersectWorld(world, {
            mode: CANNON.Ray.ANY,
            skipBackfaces: true
        }, result)

        if (result.hasHit) {
            const targetY = result.hitPointWorld.y + this.cfg.radius + 0.02
            this.body.position.y = targetY
            this.group.position.y = targetY
            this.body.velocity.y = 0
        }
    }

    // =============== VR / MÓVIL ===============
    moveInDirection(dir, speed) {
        if (!window.userInteracted || !this.experience.renderer.instance.xr.isPresenting) return
        const mobile = (window.experience && window.experience.mobileControls) || null
        if (mobile && mobile.intensity > 0) {
            const dir2D = mobile.directionVector
            const dir3D = new THREE.Vector3(dir2D.x, 0, dir2D.y).normalize()

            const adjusted = 260 * mobile.intensity
            const force = new CANNON.Vec3(dir3D.x * adjusted, 0, dir3D.z * adjusted)
            this.body.applyForce(force, this.body.position)

            if (this.animation && this.animation.actions && this.animation.actions.walking) {
                if (this.animation.actions.current !== this.animation.actions.walking) {
                    this.animation.play('walking')
                }
            }

            const angle = Math.atan2(dir3D.x, dir3D.z)
            this.group.rotation.y = angle
            this.body.quaternion.setFromEuler(0, this.group.rotation.y, 0)
            this._clampHorizontalSpeed(this.cfg.maxSpeedSprint)
        }
    }

    // =============== MUERTE ===============
    die() {
        if (this.state.dead) return
        this.state.dead = true

        if (this.animation && this.animation.actions && this.animation.actions.death) {
            if (this.animation.actions.current) this.animation.actions.current.fadeOut(0.15)
            this.animation.actions.death.reset().fadeIn(0.15).play()
            this.animation.actions.current = this.animation.actions.death
        }
        if (this.walkSound && this.walkSound.stop) this.walkSound.stop()

        // quitar cuerpo físico
        const idx = this.physics.world.bodies.indexOf(this.body)
        if (idx !== -1) this.physics.world.bodies.splice(idx, 1)
        this.body = null

        this.group.position.y -= 0.5
        this.group.rotation.x = -Math.PI / 2
    }
}