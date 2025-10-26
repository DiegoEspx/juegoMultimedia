// src/World/EnemySkins.js
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'

export default class EnemySkins {
  constructor() {
    this.loader = new GLTFLoader()
    this.skins = []        // [{ name, gltf }]
    this._loaded = false
  }

  async loadAll() {
    if (this._loaded) return
    const paths = [
      { name: 'vampire',  url: '/models/enemies/character-vampire.glb' },
      { name: 'zombie',   url: '/models/enemies/character-zombie.glb' },
      { name: 'ghost',    url: '/models/enemies/character-ghost.glb' },
      { name: 'skeleton', url: '/models/enemies/character-skeleton.glb' },
    ]

    const loads = paths.map(p => new Promise((resolve, reject) => {
      this.loader.load(
        p.url,
        gltf => resolve({ name: p.name, gltf }),
        undefined,
        err => reject(new Error(`No se pudo cargar ${p.url}: ${err.message}`))
      )
    }))

    this.skins = await Promise.all(loads)
    this._loaded = true
  }

  /**
   * Devuelve un { model, animations, name } CLONADO e independiente.
   * Usa SkeletonUtils.clone para conservar los huesos/animaciones.
   */
  getRandomSkin() {
    if (!this._loaded || this.skins.length === 0) throw new Error('Skins no cargados')
    const pick = this.skins[Math.floor(Math.random() * this.skins.length)]
    const clonedScene = cloneSkinned(pick.gltf.scene)
    const animations = pick.gltf.animations || []
    // Ajustes opcionales por skin (escala/orientación):
    clonedScene.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
    return { model: clonedScene, animations, name: pick.name }
  }
}
