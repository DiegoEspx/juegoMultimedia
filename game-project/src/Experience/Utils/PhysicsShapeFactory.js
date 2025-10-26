import * as THREE from 'three'
import * as CANNON from 'cannon-es'

/**
 * Box aproximado a partir del bbox del modelo (transform ya aplicada).
 * shrinkFactor < 1 encoge el collider para evitar enganches.
 */
export function createBoxShapeFromModel(model, shrinkFactor = 1.0) {
    model.updateMatrixWorld(true)

    const bbox = new THREE.Box3().setFromObject(model)
    const size = new THREE.Vector3()
    bbox.getSize(size)

    const fx = shrinkFactor,
        fy = shrinkFactor,
        fz = shrinkFactor
    const hx = Math.max(1e-4, (size.x * fx) / 2)
    const hy = Math.max(1e-4, (size.y * fy) / 2)
    const hz = Math.max(1e-4, (size.z * fz) / 2)

    return new CANNON.Box(new CANNON.Vec3(hx, hy, hz))
}

/**
 * Trimesh exacto de TODO el árbol del modelo.
 * - Hornea matrixWorld de cada mesh (posición/rotación/escala reales)
 * - Usa Uint32Array para índices (modelos grandes)
 * ⚠️ Como horneamos world, el Body que use esta shape debe ir en (0,0,0).
 */
export function createTrimeshShapeFromModel(model) {
    model.updateMatrixWorld(true)

    const vertices = []
    const indices = []

    const v = new THREE.Vector3()
    const mat = new THREE.Matrix4()
    let vertexOffset = 0

    model.traverse((child) => {
        if (!child.isMesh || !child.geometry) return

        // clona y asegura no-indexado
        const geom = child.geometry.clone().toNonIndexed()
        const pos = geom.attributes.position
        if (!pos) return

        mat.copy(child.matrixWorld)

        // posiciones en mundo
        for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i).applyMatrix4(mat)
            vertices.push(v.x, v.y, v.z)
        }

        // triángulos secuenciales (no-indexado)
        for (let i = 0; i < pos.count; i += 3) {
            indices.push(vertexOffset + i, vertexOffset + i + 1, vertexOffset + i + 2)
        }
        vertexOffset += pos.count
    })

    if (vertices.length === 0) {
        console.warn('❌ Trimesh vacío: modelo sin vértices')
        return null
    }

    const verts32 = new Float32Array(vertices)
    const idx32 = new Uint32Array(indices) // ⬅️ importante

    return new CANNON.Trimesh(verts32, idx32)
}