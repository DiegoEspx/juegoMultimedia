// Experience/World/Floor.js
import * as THREE from 'three'
import * as CANNON from 'cannon-es'

export default class Floor {
    constructor(experience) {
        this.experience = experience
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.physics = this.experience.physics

        // 🔹 Altura global del piso (cambia aquí para subir/bajar todo el piso)
        this.floorY = 0.1 // 0 = al ras; 0.3 = 30 cm arriba

        // Tamaño visible del piso
        this.size = {
            width: 120,
            height: 0.2,
            depth: 120
        }

        this._setGeometry()
        this._setTextures()
        this._setMaterial()
        this._setMesh()
        this._setPhysics()
    }

    _setGeometry() {
        this.geometry = new THREE.BoxGeometry(
            this.size.width,
            this.size.height,
            this.size.depth
        )
    }

    _setTextures() {
        const maxAniso =
            this.experience?.renderer?.instance?.capabilities?.getMaxAnisotropy?.() || 1

        this.textures = {}
        this.textures.color = this.resources.items.grassColorTexture
        if ('colorSpace' in this.textures.color)
            this.textures.color.colorSpace = THREE.SRGBColorSpace
        this.textures.color.wrapS = this.textures.color.wrapT = THREE.RepeatWrapping
        this.textures.color.anisotropy = maxAniso

        this.textures.normal = this.resources.items.grassNormalTexture
        this.textures.normal.wrapS = this.textures.normal.wrapT = THREE.RepeatWrapping
        this.textures.normal.anisotropy = maxAniso

        const rx = Math.max(1, Math.round(this.size.width / 2))
        const rz = Math.max(1, Math.round(this.size.depth / 2))
        this.textures.color.repeat.set(rx, rz)
        this.textures.normal.repeat.set(rx, rz)
    }

    _setMaterial() {
        this.material = new THREE.MeshStandardMaterial({
            map: this.textures.color,
            normalMap: this.textures.normal,
            roughness: 1,
            metalness: 0
        })
    }

    _setMesh() {
        this.mesh = new THREE.Mesh(this.geometry, this.material)
        // Cara superior del cubo en Y = floorY
        this.mesh.position.set(0, this.floorY - this.size.height / 2, 0)
        this.mesh.receiveShadow = true
        this.mesh.name = 'FloorMesh'
        this.scene.add(this.mesh)
    }

    _setPhysics() {
        // Plane infinito alineado a Y = floorY
        this.body = new CANNON.Body({
            mass: 0,
            material: this.physics.sueloMaterial ?? this.physics.materials?.groundMat
        })
        this.body.addShape(new CANNON.Plane())
        this.body.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
        this.body.position.set(0, this.floorY, 0)
        this.body.name = 'FloorBody'
        this.physics.world.addBody(this.body)
    }

    // API para mover la altura en runtime
    setHeight(y) {
        this.floorY = y
        if (this.mesh) this.mesh.position.y = this.floorY - this.size.height / 2
        if (this.body) this.body.position.y = this.floorY
    }
}