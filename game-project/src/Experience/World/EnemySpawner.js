import Enemy from './Enemy.js'
import {
    GLTFLoader
} from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
    clone as cloneSkinned
} from 'three/examples/jsm/utils/SkeletonUtils.js'

export default class EnemySpawner {
    constructor({
        scene,
        physicsWorld,
        playerRef,
        experience
    }) {
        this.scene = scene
        this.physicsWorld = physicsWorld
        this.playerRef = playerRef
        this.experience = experience

        this.loader = new GLTFLoader()
        this.enemies = []
        this.models = [] // [{name, scene, animations}]
    }

    async loadAllSkins() {
        const skins = [{
                name: 'vampire',
                url: '/models/enemies/character-vampire.glb'
            },
            {
                name: 'zombie',
                url: '/models/enemies/character-zombie.glb'
            },
            {
                name: 'ghost',
                url: '/models/enemies/character-ghost.glb'
            },
            {
                name: 'skeleton',
                url: '/models/enemies/character-skeleton.glb'
            }
        ]

        const promises = skins.map(skin =>
            new Promise((resolve, reject) => {
                this.loader.load(
                    skin.url,
                    gltf => resolve({
                        name: skin.name,
                        gltf
                    }),
                    undefined,
                    err => reject(`❌ Error al cargar ${skin.url}: ${err.message}`)
                )
            })
        )

        this.models = await Promise.all(promises)
        console.log(`✅ ${this.models.length} skins de enemigos cargadas.`)
    }

    /**
     * Crea un enemigo en una posición específica con un modelo aleatorio.
     */
    spawnAt(position) {
        if (this.models.length === 0) {
            console.warn('EnemySpawner: No hay skins cargadas todavía.')
            return
        }

        // Skin aleatoria
        const randomSkin = this.models[Math.floor(Math.random() * this.models.length)]
        const clonedModel = cloneSkinned(randomSkin.gltf.scene)
        const animations = randomSkin.gltf.animations

        // Ajustes visuales
        clonedModel.scale.set(1, 1, 1)
        clonedModel.traverse(o => {
            if (o.isMesh) {
                o.castShadow = true
                o.receiveShadow = true
            }
        })

        // Velocidad diferente según skin (opcional)
        let speed = 1
        if (randomSkin.name === 'ghost') speed = 2
        if (randomSkin.name === 'skeleton') speed = 0.8

        // Crear enemigo real
        const enemy = new Enemy({
            scene: this.scene,
            physicsWorld: this.physicsWorld,
            playerRef: this.playerRef,
            experience: this.experience,
            model: clonedModel,
            position,
            animations,
            skinName: randomSkin.name,
            baseSpeed: speed
        })

        this.enemies.push(enemy)
        return enemy
    }

    update(delta) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i]
            if (!e.body) {
                this.enemies.splice(i, 1)
                continue
            }
            e.update(delta)
        }
    }
}