// Experience/Utils/Physics.js
import * as CANNON from 'cannon-es'

export default class Physics {
    constructor() {
        // Mundo
        this.world = new CANNON.World({
            gravity: new CANNON.Vec3(0, -9.82, 0),
        })
        this.world.broadphase = new CANNON.SAPBroadphase(this.world)
        this.world.allowSleep = true
        this.world.solver.iterations = 10
        this.world.solver.tolerance = 1e-3

        // ====== Materiales ======
        const defaultMat = new CANNON.Material('default')

        // Asegura que defaultContactMaterial exista y tenga valores “anti-rebote”
        this.world.defaultContactMaterial = new CANNON.ContactMaterial(
            defaultMat,
            defaultMat, {
                friction: 0.4,
                restitution: 0.0,
                contactEquationStiffness: 5e5,
                contactEquationRelaxation: 4,
                frictionEquationStiffness: 1e5,
                frictionEquationRelaxation: 3,
            }
        )

        // Nombres “nuevos”
        const groundMat = new CANNON.Material('ground')
        const playerMat = new CANNON.Material('player')
        const obstacleMat = new CANNON.Material('obstacle')
        const wallMat = new CANNON.Material('wall')

        // Contactos clave
        const playerGround = new CANNON.ContactMaterial(playerMat, groundMat, {
            friction: 0.5,
            restitution: 0.0,
            contactEquationStiffness: 5e5,
            contactEquationRelaxation: 4,
            frictionEquationStiffness: 1e5,
            frictionEquationRelaxation: 3,
        })
        const playerObstacle = new CANNON.ContactMaterial(playerMat, obstacleMat, {
            friction: 0.6,
            restitution: 0.0,
            contactEquationStiffness: 5e5,
            contactEquationRelaxation: 4,
            frictionEquationStiffness: 1e5,
            frictionEquationRelaxation: 3,
        })
        const playerWall = new CANNON.ContactMaterial(playerMat, wallMat, {
            friction: 0.6,
            restitution: 0.0,
            contactEquationStiffness: 5e5,
            contactEquationRelaxation: 3,
            frictionEquationStiffness: 1e5,
            frictionEquationRelaxation: 3,
        })

        this.world.addContactMaterial(playerGround)
        this.world.addContactMaterial(playerObstacle)
        this.world.addContactMaterial(playerWall)

        // Exponer materiales
        this.materials = {
            groundMat,
            playerMat,
            obstacleMat,
            wallMat,
            defaultMat
        }

        // ✅ Alias de compatibilidad (lo que usa tu código existente)
        this.sueloMaterial = groundMat
        this.granjeroMaterial = playerMat
        this.obstacleMaterial = obstacleMat
        this.wallMaterial = wallMat
        this.defaultMaterial = defaultMat

        this.bodies = []
    }

    update(delta) {
        // ⚠️ No reasignes this.world.bodies; Cannon gestiona esa lista internamente.
        // Simplemente step:
        const fixed = 1 / 60
        this.world.step(fixed, delta, 3)
    }
}