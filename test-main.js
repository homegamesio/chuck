const path = require('path');
const { fork } = require('child_process');

const homegamesCorePath = path.dirname(require.resolve('homegames-core'));
const homegamesDepsPath = path.join(homegamesCorePath, 'node_modules');

const TEST_GAME_PATH = path.join(__dirname, 'test-game');

console.log("TEST_MAMM");
console.log(TEST_GAME_PATH);

const assertEquals = (a, b) => {
    if (a !== b) {
        throw new Error(`Expected values to be equal: ${a} is not equal to ${b}`);
    }
};

class TestScenario {
    constructor(gamePath, tickRate, squishVersion, port) {
        this.gamePath = gamePath;
        this.tickRate = tickRate;
        this.squishVersion = squishVersion;
        this.squishPath = require.resolve(`squish-${squishVersion}`, { paths: [ homegamesDepsPath ] });
        this.port = port;
    }

    run() {
        const myEnv = process.env;
        const proc = fork(
            'test-runner.js', 
            [], 
            {
                silent: true, 
                env: { 
                    TICK_RATE: this.tickRate, 
                    START_PATH: this.gamePath, 
                    SQUISH_PATH: this.squishPath,
                    TARGET_SERVER: `localhost:${this.port}`,
                    HOME_PORT: 3000,
                    ...myEnv
                }
            }
        );

        const startString = 'resultzz:';
        proc.stdout.on('data', (data) => {
            console.log(data.toString());
            if (data.toString().startsWith(startString)) {
                const parsed = JSON.parse(data.toString().substring(startString.length));
                console.log(parsed);
            }
        });

        proc.stderr.on('data', (data) => {
            console.error(data.toString());
        });

        proc.on('error', (err) => {
            console.error('erorororor');
            console.error(err);
        });

        proc.on('exit', (exitCode) => {
            console.log('exited ' + exitCode);
        });
    }
}

const testScenario1 = new TestScenario(TEST_GAME_PATH, 100, '1005', 3000);
testScenario1.run();
