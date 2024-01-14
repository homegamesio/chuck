const path = require('path');

const TEST_GAME_PATH = path.join(__dirname, 'test-game');

const assertEquals = (a, b) => {
    if (a !== b) {
        throw new Error(`Expected values to be equal: ${a} is not equal to ${b}`);
    }
};

class TestScenario {
    constructor(gamePath, tickRate, squishVersion) {
        this.gamePath = gamePath;
        this.tickRate = tickRate;
        this.squishVersion = squishVersion;
    }

    run() {
        console.log('need to run test at ' + this.gamePath);
    }
}

const testScenario1 = new TestScenario(TEST_GAME_PATH, 10, 'squish-1005');
testScenario1.run();
