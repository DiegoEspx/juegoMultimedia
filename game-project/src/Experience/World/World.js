import * as THREE from 'three'
import Environment from './Environment.js'
import Fox from './Fox.js'
import Granjero from './Granjero.js'
import ToyCarLoader from '../../loaders/ToyCarLoader.js'
import Floor from './Floor.js'
import ThirdPersonCamera from './ThirdPersonCamera.js'
import Sound from './Sound.js'
import AmbientSound from './AmbientSound.js'
import MobileControls from '../../controls/MobileControls.js'
import LevelManager from './LevelManager.js'
import BlockPrefab from './BlockPrefab.js'
import FinalPrizeParticles from '../Utils/FinalPrizeParticles.js'
import EnemySpawner from './EnemySpawner.js'

export default class World {
    constructor(experience) {
        this.experience = experience
        this.scene = this.experience.scene
        this.resources = this.experience.resources

        // Core gameplay state
        this.levelManager = new LevelManager(this.experience)
        this.blockPrefab = new BlockPrefab(this.experience)
        this.finalPrizeActivated = false
        this.gameStarted = false
        this.enemies = []
        this.points = 0
        this.hasMoved = false
        this.allowPrizePickup = false
        this.totalScore = 0
        this.currentLevelScore = 0
        this.currentLevel = 1
        // SFX
        this.coinSound = new Sound('/sounds/coin.ogg')
        this.ambientSound = new AmbientSound('/sounds/ambiente.mp3')
        this.winner = new Sound('/sounds/winner.mp3')
        this.portalSound = new Sound('/sounds/portal.mp3')
        this.loseSound = new Sound('/sounds/lose.ogg')

        // Habilitar recogida de monedas luego de 2s
        setTimeout(() => {
            this.allowPrizePickup = true
        }, 2000)

        // Esperar a que los assets estén listos para cargar el mundo
        this.resources.on('ready', () => {
            // No usar await en constructor; delegamos a un método async
            this._initAfterResources()
                .catch(err => console.error('❌ Error en init del World:', err))
        })
    }

    async _initAfterResources() {
        // Piso + entorno
        this.floor = new Floor(this.experience)
        this.environment = new Environment(this.experience)

        // Bloques y premios
        this.loader = new ToyCarLoader(this.experience)
        await this.loader.loadFromAPI()


        // Personajes
        this.fox = new Fox(this.experience)
        this.granjero = new Granjero(this.experience)

        // Verificar físicas antes de continuar (EnemySpawner depende de esto)
        if (!this.experience.physics || !this.experience.physics.world) {
            console.error('🚫 Sistema de físicas no está inicializado al cargar el mundo.')
            return
        }

        // Jugador y cámara
        this.player = this.granjero
        this.experience.vr.bindCharacter(this.granjero)
        this.thirdPersonCamera = new ThirdPersonCamera(this.experience, this.granjero.group)

        // Controles móviles -> teclado compartido
        this.mobileControls = new MobileControls({
            onUp: (pressed) => {
                this.experience.keyboard.keys.up = pressed
            },
            onDown: (pressed) => {
                this.experience.keyboard.keys.down = pressed
            },
            onLeft: (pressed) => {
                this.experience.keyboard.keys.left = pressed
            },
            onRight: (pressed) => {
                this.experience.keyboard.keys.right = pressed
            }
        })

        // Spawner de enemigos (ahora que physics y player existen)
        this.enemySpawner = new EnemySpawner({
            scene: this.scene,
            physicsWorld: this.experience.physics.world,
            playerRef: this.player,
            experience: this.experience
        })

        await this.enemySpawner.loadAllSkins()
        const rawCount =
            import.meta.env.VITE_ENEMIES_COUNT
        const parsed = Number(rawCount)

        // Solo crear enemigos si el número es válido y mayor que 0
        if (Number.isFinite(parsed) && parsed > 0) {
            this.setEnemyCount(parsed)
        } else {
            this.clearEnemies() // asegura que no haya ninguno
            console.log('👻 Sin enemigos: VITE_ENEMIES_COUNT =', rawCount)
        }

        // Modo VR
        this._checkVRMode()
        this.experience.renderer.instance.xr.addEventListener('sessionstart', () => this._checkVRMode())
    }
    // Utilidades de enemigos
    clearEnemies() {
        if (!this.enemies) return
        this.enemies.forEach(e => e?.destroy?.())
        this.enemies = []
    }

    setEnemyCount(total = 3) {
        // limpia y crea exactamente 'total' enemigos
        this.clearEnemies()

        // posiciones fijas para los primeros 3
        const fixed = [
            new THREE.Vector3(2, 0, -3),
            new THREE.Vector3(-4, 0, 5),
            new THREE.Vector3(6, 0, 1)
        ]

        const toSpawn = Math.max(0, Math.floor(total))
        for (let i = 0; i < toSpawn; i++) {
            let pos
            if (i < fixed.length) {
                pos = fixed[i]
            } else {
                // si hay más de 3, usar spawn aleatorio alrededor del jugador
                const playerPos = this.player?.body?.position || new THREE.Vector3(0, 0, 0)
                const minRadius = 25
                const maxRadius = 40
                const angle = Math.random() * Math.PI * 2
                const radius = minRadius + Math.random() * (maxRadius - minRadius)
                pos = new THREE.Vector3(
                    playerPos.x + Math.cos(angle) * radius,
                    1.5,
                    playerPos.z + Math.sin(angle) * radius
                )
            }
            const enemy = this.enemySpawner?.spawnAt?.(pos)
            if (enemy) {
                enemy.delayActivation = 1 + i * 0.4
                this.enemies.push(enemy)
            }
        }
    }

    // ---- API pública ----
    toggleAudio() {
        this.ambientSound.toggle()
    }

    // Crear varios enemigos alejados del jugador
    spawnEnemies(count = 3) {
        if (!this.player?.body?.position || !this.enemySpawner) return

        const playerPos = this.player.body.position
        const minRadius = 25
        const maxRadius = 40

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2
            const radius = minRadius + Math.random() * (maxRadius - minRadius)
            const x = playerPos.x + Math.cos(angle) * radius
            const z = playerPos.z + Math.sin(angle) * radius
            const y = 1.5

            const e = this.enemySpawner.spawnAt(new THREE.Vector3(x, y, z))
            if (e) {
                e.delayActivation = 1.0 + i * 0.35
                this.enemies.push(e)
            }
        }
    }

    _updateHUD() {
        const required = this.loader?.requiredCoins ?? 0;
        this.experience.menu.setStatus?.({
            level: this.currentLevel,
            levelScore: this.currentLevelScore,
            totalScore: this.totalScore,
            required
        });
    }

    update(delta) {
        this.fox?.update()
        this.granjero?.update()
        this.blockPrefab?.update()

        // 🧟‍♂️ Enemigos sólo si el juego está activo
        if (this.gameStarted) {
            this.enemies?.forEach(e => e?.update?.(delta))

            // 💀 ¿Alguno atrapó al jugador?
            const playerPos = this.granjero?.body?.position
            if (playerPos) {
                const distToClosest = this.enemies?.reduce((min, e) => {
                    if (!e?.body?.position) return min
                    const d = e.body.position.distanceTo(playerPos)
                    return Math.min(min, d)
                }, Infinity) ?? Infinity

                if (distToClosest < 1.0 && !this.defeatTriggered) {
                    this.defeatTriggered = true
                    if (window.userInteracted && this.loseSound) this.loseSound.play()

                    const firstEnemy = this.enemies?. [0]
                    const enemyMesh = firstEnemy?.model || firstEnemy?.group
                    if (enemyMesh) {
                        enemyMesh.scale.set(1.3, 1.3, 1.3)
                        setTimeout(() => enemyMesh.scale.set(1, 1, 1), 500)
                    }

                    this.experience.modal.show({
                        icon: '💀',
                        message: '¡El enemigo te atrapó!\n¿Quieres intentarlo otra vez?',
                        buttons: [{
                                text: '🔁 Reintentar',
                                onClick: () => this.experience.resetGameToFirstLevel()
                            },
                            {
                                text: '❌ Salir',
                                onClick: () => this.experience.resetGame()
                            }
                        ]
                    })
                    return
                }
            }
        }

        if (this.thirdPersonCamera && this.experience.isThirdPerson && !this.experience.renderer.instance.xr.isPresenting) {
            this.thirdPersonCamera.update()
        }

        this.loader?.prizes?.forEach(p => p.update(delta))

        if (!this.allowPrizePickup || !this.loader || !this.granjero || !this.granjero.body) return

        // Posición de referencia (VR o PC)
        let pos = null
        if (this.experience.renderer.instance.xr.isPresenting) {
            pos = this.experience.camera.instance.position
        } else if (this.granjero?.body?.position) {
            pos = this.granjero.body.position
        } else {
            return
        }

        const speed = this.granjero?.body?.velocity?.length?.() || 0
        const moved = speed > 0.5

        this.loader.prizes.forEach((prize) => {
            if (!prize.pivot) return
            const dist = prize.pivot.position.distanceTo(pos)
            if (dist < 1.2 && moved && !prize.collected) {
                prize.collect()
                prize.collected = true

                if (prize.role === 'coin') {
                    // puntos “legacy” si los usas
                    this.points = (this.points || 0) + 1
                    this.granjero.points = this.points

                    // ✅ objetivo real: monedas detectadas por ToyCarLoader
                    const pointsTarget = this.loader?.requiredCoins ?? 0

                    if (!this.finalPrizeActivated && this.points === pointsTarget) {
                        const finalCoin = this.loader.prizes.find(p => p.role === 'finalPrize')
                        if (finalCoin && !finalCoin.collected && finalCoin.pivot) {
                            // mostrar portal
                            finalCoin.pivot.visible = true
                            if (finalCoin.model) finalCoin.model.visible = true
                            this.finalPrizeActivated = true

                            new FinalPrizeParticles({
                                scene: this.scene,
                                targetPosition: finalCoin.pivot.position,
                                sourcePosition: this.granjero.body.position,
                                experience: this.experience
                            })
                            this._buildDiscoRays(finalCoin.pivot.position)
                            if (window.userInteracted) this.portalSound.play()
                        }
                    }
                }


                if (prize.role === 'finalPrize') {
                    if (this.levelManager.currentLevel < this.levelManager.totalLevels) {
                        this.levelManager.nextLevel()
                        this.points = 0
                        this.granjero.points = 0
                    } else {
                        const elapsed = this.experience.tracker.stop()
                        this.experience.tracker.saveTime(elapsed)
                        this.experience.tracker.showEndGameModal(elapsed)
                        this.experience.obstacleWavesDisabled = true
                        clearTimeout(this.experience.obstacleWaveTimeout)
                        this.experience.raycaster?.removeAllObstacles?.()
                        if (window.userInteracted) this.winner.play()
                    }
                }

                // Reducir obstáculos
                if (this.experience.raycaster?.removeRandomObstacles) {
                    const reduction = 0.2 + Math.random() * 0.1
                    this.experience.raycaster.removeRandomObstacles(reduction)
                }

                if (window.userInteracted) this.coinSound.play()
                this.experience.menu.setStatus?.(`🎖️ Puntos: ${this.points}`)
            }
        })

        // Activación automática del finalPrize si ya están todas las default
        if (!this.finalPrizeActivated && this.loader?.prizes) {
            const totalDefault = this.loader.prizes.filter(p => p.role === 'default').length
            const collectedDefault = this.loader.prizes.filter(p => p.role === 'default' && p.collected).length
            if (totalDefault > 0 && collectedDefault === totalDefault) {
                const finalCoin = this.loader.prizes.find(p => p.role === 'finalPrize')
                if (finalCoin && !finalCoin.collected && finalCoin.pivot) {
                    finalCoin.pivot.visible = true
                    if (finalCoin.model) finalCoin.model.visible = true
                    this.finalPrizeActivated = true

                    new FinalPrizeParticles({
                        scene: this.scene,
                        targetPosition: finalCoin.pivot.position,
                        sourcePosition: this.experience.vrDolly?.position ?? this.experience.camera.instance.position,
                        experience: this.experience
                    })

                    this._buildDiscoRays(finalCoin.pivot.position)
                    if (window.userInteracted) this.portalSound.play()
                }
            }
        }

        // Rotación del faro
        if (this.discoRaysGroup) {
            this.discoRaysGroup.rotation.y += delta * 0.5
        }

        // Optimización física por distancia
        const refPos = this.experience.renderer.instance.xr.isPresenting ?
            this.experience.camera.instance.position :
            this.granjero?.body?.position

        if (refPos) {
            this.scene.traverse((obj) => {
                if (obj.userData?.levelObject && obj.userData.physicsBody) {
                    const dist = obj.position.distanceTo(refPos)
                    const shouldEnable = dist < 40 && obj.visible
                    const body = obj.userData.physicsBody
                    if (shouldEnable && !body.enabled) body.enabled = true
                    else if (!shouldEnable && body.enabled) body.enabled = false
                }
            })
        }
    }

    async loadLevel(level) {
        try {
            const backendUrl =
                import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
            const apiUrl = `${backendUrl}/api/blocks?level=${level}`

            let data
            try {
                const res = await fetch(apiUrl)
                if (!res.ok) throw new Error('Error desde API')
                const ct = res.headers.get('content-type') || ''
                if (!ct.includes('application/json')) {
                    const preview = (await res.text()).slice(0, 120)
                    throw new Error(`Respuesta no-JSON desde API (${apiUrl}): ${preview}`)
                }
                data = await res.json()
            } catch (error) {
                console.warn(`⚠️ No se pudo conectar con el backend. Usando datos locales para nivel ${level}...`)
                const publicPath = (p) => {
                    const base =
                        import.meta.env.BASE_URL || '/'
                    return `${base.replace(/\/$/, '')}/${p.replace(/^\//, '')}`
                }
                const localUrl = publicPath('data/toy_car_blocks.json')
                const localRes = await fetch(localUrl)
                if (!localRes.ok) {
                    const preview = (await localRes.text()).slice(0, 120)
                    throw new Error(`No se pudo cargar ${localUrl} (HTTP ${localRes.status}). Vista previa: ${preview}`)
                }
                const localCt = localRes.headers.get('content-type') || ''
                if (!localCt.includes('application/json')) {
                    const preview = (await localRes.text()).slice(0, 120)
                    throw new Error(`Contenido no JSON en ${localUrl}. Vista previa: ${preview}`)
                }
                const allBlocks = await localRes.json()
                const filteredBlocks = allBlocks.filter(b => b.level === level)
                data = {
                    blocks: filteredBlocks,
                    spawnPoint: {
                        x: -17,
                        y: 1.5,
                        z: -67
                    }
                }
            }

            const spawnPoint = data.spawnPoint || {
                x: 5,
                y: 1.5,
                z: 5
            }
            this.points = 0
            if (this.granjero) this.granjero.points = 0
            this.finalPrizeActivated = false
            this.experience.menu.setStatus?.(`🎖️ Puntos: ${this.points}`)

            if (data.blocks) {
                const publicPath = (p) => {
                    const base =
                        import.meta.env.BASE_URL || '/'
                    return `${base.replace(/\/$/, '')}/${p.replace(/^\//, '')}`
                }
                const preciseUrl = publicPath('config/precisePhysicsModels.json')
                const preciseRes = await fetch(preciseUrl)
                if (!preciseRes.ok) {
                    const preview = (await preciseRes.text()).slice(0, 120)
                    throw new Error(`No se pudo cargar ${preciseUrl} (HTTP ${preciseRes.status}). Vista previa: ${preview}`)
                }
                const preciseCt = preciseRes.headers.get('content-type') || ''
                if (!preciseCt.includes('application/json')) {
                    const preview = (await preciseRes.text()).slice(0, 120)
                    throw new Error(`Contenido no JSON en ${preciseUrl}. Vista previa: ${preview}`)
                }
                const preciseModels = await preciseRes.json()
                this.loader._processBlocks(data.blocks, preciseModels)
            } else {
                // Fallback si la API ya devuelve el layout completo
                await this.loader.loadFromURL(apiUrl)
            }

            // Reset visual de premios (ocultar finalPrize hasta activación)
            this.loader.prizes.forEach(p => {
                if (p.model) p.model.visible = (p.role !== 'finalPrize')
                p.collected = false
            })

            this.totalDefaultCoins = this.loader.prizes.filter(p => p.role === 'default').length
            this.resetGranjeroPosition(spawnPoint)
            console.log(`✅ Nivel ${level} cargado con spawn en`, spawnPoint)
        } catch (error) {
            console.error('❌ Error cargando nivel:', error)
        }
    }

    clearCurrentScene() {
        if (!this.experience || !this.scene || !this.experience.physics || !this.experience.physics.world) {
            console.warn('⚠️ No se puede limpiar: sistema de físicas no disponible.')
            return
        }

        let visualObjectsRemoved = 0
        let physicsBodiesRemoved = 0

        const childrenToRemove = []
        this.scene.children.forEach((child) => {
            if (child.userData && child.userData.levelObject) childrenToRemove.push(child)
        })

        childrenToRemove.forEach((child) => {
            if (child.geometry) child.geometry.dispose()
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(mat => mat.dispose())
                else child.material.dispose()
            }
            this.scene.remove(child)
            if (child.userData.physicsBody) this.experience.physics.world.removeBody(child.userData.physicsBody)
            visualObjectsRemoved++
        })

        if (this.experience.physics && this.experience.physics.world && Array.isArray(this.experience.physics.bodies)) {
            const survivingBodies = []
            const bodiesBefore = this.experience.physics.bodies.length
            this.experience.physics.bodies.forEach((body) => {
                if (body.userData && body.userData.levelObject) {
                    this.experience.physics.world.removeBody(body)
                    physicsBodiesRemoved++
                } else {
                    survivingBodies.push(body)
                }
            })
            this.experience.physics.bodies = survivingBodies
            console.log('🧹 Physics Cleanup Report:')
            console.log(`✅ Cuerpos físicos eliminados: ${physicsBodiesRemoved}`)
            console.log(`🎯 Cuerpos físicos sobrevivientes: ${survivingBodies.length}`)
            console.log(`📦 Estado inicial: ${bodiesBefore} cuerpos → Estado final: ${survivingBodies.length} cuerpos`)
        } else {
            console.warn('⚠️ Physics system no disponible o sin cuerpos activos, omitiendo limpieza física.')
        }

        // Eliminar modelos de premios del nivel anterior
        if (this.loader && this.loader.prizes.length > 0) {
            this.loader.prizes.forEach(prize => {
                if (prize.model) {
                    this.scene.remove(prize.model)
                    if (prize.model.geometry) prize.model.geometry.dispose()
                    if (prize.model.material) {
                        if (Array.isArray(prize.model.material)) prize.model.material.forEach(mat => mat.dispose())
                        else prize.model.material.dispose()
                    }
                }
            })
            this.loader.prizes = []
            console.log('🎯 Premios del nivel anterior eliminados correctamente.')
        }

        this.finalPrizeActivated = false

        if (this.discoRaysGroup) {
            this.discoRaysGroup.children.forEach(obj => {
                if (obj.geometry) obj.geometry.dispose()
                if (obj.material) obj.material.dispose()
            })
            this.scene.remove(this.discoRaysGroup)
            this.discoRaysGroup = null
        }

        console.log('🧹 Escena limpiada antes de cargar el nuevo nivel.')
        console.log(`✅ Objetos 3D eliminados: ${visualObjectsRemoved}`)
        console.log(`✅ Cuerpos físicos eliminados: ${physicsBodiesRemoved}`)
        console.log(`🎯 Objetos 3D actuales en escena: ${this.scene.children.length}`)
    }

    resetGranjeroPosition(spawn = {
        x: -17,
        y: 1.5,
        z: -67
    }) {
        if (!this.granjero?.body || !this.granjero?.group) return
        this.granjero.body.position.set(spawn.x, spawn.y, spawn.z)
        this.granjero.body.velocity.set(0, 0, 0)
        this.granjero.body.angularVelocity.set(0, 0, 0)
        this.granjero.body.quaternion.setFromEuler(0, 0, 0)
        this.granjero.group.position.set(spawn.x, spawn.y, spawn.z)
        this.granjero.group.rotation.set(0, 0, 0)
    }

    async _processLocalBlocks(blocks) {
        const preciseRes = await fetch('/config/precisePhysicsModels.json')
        const preciseModels = await preciseRes.json()
        this.loader._processBlocks(blocks, preciseModels)
        this.loader.prizes.forEach(p => {
            if (p.model) p.model.visible = (p.role !== 'finalPrize')
            p.collected = false
        })
        this.totalDefaultCoins = this.loader.prizes.filter(p => p.role === 'default').length
        console.log(`🎯 Total de monedas default para el nivel local: ${this.totalDefaultCoins}`)
    }

    _checkVRMode() {
        const isVR = this.experience.renderer.instance.xr.isPresenting
        if (isVR) {
            if (this.granjero?.group) this.granjero.group.visible = false
            // Dar tiempo al jugador en VR
            this.enemies?.forEach(e => {
                e.delayActivation = Math.max(e.delayActivation || 0, 10)
            })
            // Reposicionar cámara para inicio VR
            this.experience.camera.instance.position.set(5, 1.6, 5)
            this.experience.camera.instance.lookAt(new THREE.Vector3(5, 1.6, 4))
        } else {
            if (this.granjero?.group) this.granjero.group.visible = true
        }
    }

    _buildDiscoRays(position) {
        if (this.discoRaysGroup) {
            this.scene.remove(this.discoRaysGroup)
            this.discoRaysGroup = null
        }

        this.discoRaysGroup = new THREE.Group()
        this.scene.add(this.discoRaysGroup)

        const rayMaterial = new THREE.MeshBasicMaterial({
            color: 0xaa00ff,
            transparent: true,
            opacity: 0.25,
            side: THREE.DoubleSide
        })

        const rayCount = 4
        for (let i = 0; i < rayCount; i++) {
            const cone = new THREE.ConeGeometry(0.2, 4, 6, 1, true)
            const ray = new THREE.Mesh(cone, rayMaterial)
            ray.position.set(0, 2, 0)
            ray.rotation.x = Math.PI / 2
            ray.rotation.z = (i * Math.PI * 2) / rayCount

            const spot = new THREE.SpotLight(0xaa00ff, 2, 12, Math.PI / 7, 0.2, 0.5)
            spot.castShadow = false
            spot.shadow.mapSize.set(1, 1)
            spot.position.copy(ray.position)
            spot.target.position.set(Math.cos(ray.rotation.z) * 10, 2, Math.sin(ray.rotation.z) * 10)

            ray.userData.spot = spot
            this.discoRaysGroup.add(ray)
            this.discoRaysGroup.add(spot)
            this.discoRaysGroup.add(spot.target)
        }

        this.discoRaysGroup.position.copy(position)
    }
}