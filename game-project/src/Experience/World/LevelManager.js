export default class LevelManager {
    constructor(experience) {
        this.experience = experience;
        this.currentLevel = 1;
        this.totalLevels = 3;

        this.spawnPoints = {
            1: {
                x: -17,
                y: 1.5,
                z: -67
            }, // Posición de inicio para el Nivel 1
            2: {
                x: 49.4,
                y: -34.815,
                z: 8.57
            }, // Posición de inicio para el Nivel 2
            3: {
                x: -24.32,
                y: 1,
                z: 0.15
            } // Posición de inicio para el Nivel 3
        };
    }

    nextLevel() {
        if (this.currentLevel < this.totalLevels) {
            this.currentLevel++;
            this.experience.world.clearCurrentScene();
            const newSpawn = this.spawnPoints[this.currentLevel];
            this.experience.world.loadLevel(this.currentLevel, newSpawn);
        }
    }

    resetLevel() {
        this.currentLevel = 1;
        this.experience.world.loadLevel(this.currentLevel);

        const initialSpawn = this.spawnPoints[1];
        setTimeout(() => {
            this.experience.world.resetGranjeroPosition(initialSpawn);
        }, 500);
    }

    getCurrentLevelTargetPoints() {
        return this.pointsToComplete?. [this.currentLevel] || 2;
    }
}