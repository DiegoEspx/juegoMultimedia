// EnemySpawner.js (MODIFICADO)
import Enemy from './Enemy.js'
import {
    GLTFLoader
} from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
    clone as cloneSkinned
} from 'three/examples/jsm/utils/SkeletonUtils.js'
import * as THREE from 'three' // Necesitamos THREE para los colores

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
        this.models = [] // [{name, gltf}]
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
     * Crea un enemigo en una posición específica con un modelo y personalización.
     * @param {THREE.Vector3} position - La posición inicial del enemigo.
     * @param {string} [skinName=null] - El nombre de la skin a usar (ej: 'vampire'). Si es null, se elige una aleatoria.
     */
    spawnAt(position, skinName = null) { // ⭐ Añadir skinName como argumento
        if (this.models.length === 0) {
            console.warn('EnemySpawner: No hay skins cargadas todavía.')
            return
        }

        let selectedSkin;
        if (skinName) {
            selectedSkin = this.models.find(s => s.name === skinName);
            if (!selectedSkin) {
                console.warn(`EnemySpawner: Skin "${skinName}" no encontrada, usando una aleatoria.`)
                selectedSkin = this.models[Math.floor(Math.random() * this.models.length)]
            }
        } else {
            selectedSkin = this.models[Math.floor(Math.random() * this.models.length)]
        }

        const clonedModel = cloneSkinned(selectedSkin.gltf.scene)
        const animations = selectedSkin.gltf.animations

        // ⭐ Lógica de personalización de color ⭐
        clonedModel.traverse(o => {
            if (o.isMesh && o.material) {
                // Asegurarse de que el material no sea compartido por referencia si se modifica
                if (Array.isArray(o.material)) {
                    o.material = o.material.map(mat => mat.clone());
                } else {
                    o.material = o.material.clone();
                }

                if (selectedSkin.name === 'vampire') {
                    // Para vampiros, podemos hacerlos más oscuros o darles un toque púrpura/rojo
                    if (o.material.map) o.material.color.set(0x8A2BE2); // Un púrpura oscuro
                    else o.material.color.set(0x4B0082); // Color más profundo para otros materiales
                } else if (selectedSkin.name === 'ghost') {
                    // Fantasmas: Blancos semitransparentes y ojos negros
                    o.material.transparent = true;
                    o.material.opacity = 0.7; // Un poco transparente
                    if (o.name.toLowerCase().includes('eye')) { // Asumiendo que los ojos tienen 'eye' en su nombre
                        o.material.color.set(0x000000); // Ojos negros
                    } else {
                        o.material.color.set(0xFFFFFF); // Blanco puro
                    }
                } else if (selectedSkin.name === 'zombie') {
                    // Zombies: Verdes putrefactos
                    if (o.material.map) o.material.color.set(0x556B2F); // Verde oliva oscuro
                    else o.material.color.set(0x6B8E23); // Un verde musgo
                } else if (selectedSkin.name === 'skeleton') {
                    // Esqueletos: Ya suelen ser grises/blancos, podemos darles un toque más hueso o dejarlos como están.
                    // Voy a darles un tono hueso claro.
                    if (o.material.map) o.material.color.set(0xF5DEB3); // Amarillo claro hueso
                    else o.material.color.set(0xD2B48C); // Más oscuro hueso
                }
                o.material.needsUpdate = true; // Asegurarse de que Three.js actualice el material
            }
        });


        // Ajustes visuales (escalado general)
        clonedModel.scale.set(1, 1, 1) // Puedes ajustar esta escala si tus modelos son muy grandes/pequeños
        clonedModel.traverse(o => {
            if (o.isMesh) {
                o.castShadow = true
                o.receiveShadow = true
            }
        })

        // Velocidad diferente según skin (opcional)
        let speed = 1
        if (selectedSkin.name === 'ghost') speed = 2
        if (selectedSkin.name === 'skeleton') speed = 0.8

        // Crear enemigo real
        const enemy = new Enemy({
            scene: this.scene,
            physicsWorld: this.physicsWorld,
            playerRef: this.playerRef,
            experience: this.experience,
            model: clonedModel,
            position,
            animations,
            skinName: selectedSkin.name, // Pasamos el nombre de la skin al Enemy
            baseSpeed: speed
        })

        this.enemies.push(enemy)
        return enemy
    }

    // ... (Métodos update y destroy) ...
    update(delta) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i]
            // Si el enemigo no tiene cuerpo o ha sido destruido
            if (!e || !e.body) { // Añadido `!e` por si el elemento ya fue destruido y splice no lo quita a tiempo
                this.enemies.splice(i, 1)
                continue
            }
            e.update(delta)
        }
    }

    // ⭐ Método para eliminar todos los enemigos (útil al cambiar de nivel) ⭐
    clearAllEnemies() {
        this.enemies.forEach(enemy => enemy.destroy());
        this.enemies = []; // Vaciar el array
        console.log("🧹 Todos los enemigos han sido eliminados.");
    }
}