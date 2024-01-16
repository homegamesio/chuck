const path = require('path');
const { fork } = require('child_process');

const homegamesCorePath = path.dirname(require.resolve('homegames-core'));
const homegamesDepsPath = path.join(homegamesCorePath, 'node_modules');

const TEST_GAME_PATH = path.join(__dirname, 'test-game');

const assertEquals = (a, b) => {
    if (a !== b) {
        throw new Error(`Expected values to be equal: ${a} is not equal to ${b}`);
    }
};

const assertLessThan = (a, b) => {
    if (a >= b) {
        throw new Error(`Expected value ${a} to be less than ${b}`);
    }
};

const assertGreaterThan = (a, b) => {
    if (a <= b) {
        throw new Error(`Expected value ${a} to be greater than ${b}`);
    }
};

class TestRun {
    constructor(name, gamePath, tickRate, squishVersion, scaleFactor, port, spec, timeout, expectedFrameCount) {
        this.name = name;
        this.scaleFactor = scaleFactor;
        this.gamePath = gamePath;
        this.tickRate = tickRate;
        this.squishVersion = squishVersion;
        this.squishPath = require.resolve(`squish-${squishVersion}`, { paths: [ homegamesDepsPath ] });
        this.port = port;
        this.spec = spec;
        this.timeout = timeout;
        this.expectedFrameCount = expectedFrameCount;
    }

    run() {
        return new Promise((resolve, reject) => {
            console.log('Running ' + this.name + ' with timeout ' + this.timeout?.duration);
            const myEnv = process.env;

            const proc = fork(
                'test-runner.js', 
                [], 
                {
                    silent: true, 
                    env: { 
                        ...myEnv,
                        TICK_RATE: this.tickRate, 
                        START_PATH: this.gamePath, 
                        SQUISH_PATH: this.squishPath,
                        TARGET_SERVER: `localhost:${this.port}`,
                        HOME_PORT: this.port,
                        SCALE_FACTOR: this.scaleFactor,
                        SQUISH_VERSION: this.squishVersion,
                        FRAME_TOTAL: 1000,
                        TIMEOUT: this.timeout?.duration || ''
                    }
                }
            );

            const startString = 'resultzz:';
            proc.stdout.on('data', (data) => {
                if (data.toString().startsWith(startString)) {
                    const parsed = JSON.parse(data.toString().substring(startString.length));
                    console.log(parsed);
                    for (let key in this.spec) {
                        if (this.spec[key].min) {
                            assertGreaterThan(parsed.performance['all'][key], this.spec[key].min);
                        }

                        if (this.spec[key].max) {
                            assertLessThan(parsed.performance['all'][key], this.spec[key].max);
                        }
                    }

                    if (this.expectedFrameCount !== undefined) {
                        assertEquals(parsed.totalFrames, this.expectedFrameCount);
                    }

                    this.resolved = true;
                    resolve(parsed);
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
            });
        });
    }
}

const run = async () => {
    await new TestRun('only updates when we want it to', TEST_GAME_PATH, 200, '1006', 8, 3000, {}, { duration: 10 * 1000, shouldFail: false }, 4).run();
    await new TestRun('push the socket with 200fps', TEST_GAME_PATH, 200, '1005', 8, 3000, { avgFps: { min: 180, max: 205 } }).run();
    await new TestRun('100fps small node count', TEST_GAME_PATH, 100, '1005', 3, 3000, { avgFps: { min: 90, max: 110 } }).run();
    await new TestRun('100fps medium node count', TEST_GAME_PATH, 100, '1005', 5, 3000, { avgFps: { min: 90, max: 110 } }).run();
    await new TestRun('100fps large node count', TEST_GAME_PATH, 100, '1005', 10, 3000, { avgFps: { min: 90, max: 110 } }).run();
    await new TestRun('push it with enormous node count', TEST_GAME_PATH, 100, '1005', 20, 3000, { avgFps: { min: 30, max: 60 } }).run();
    await new TestRun('60fps small node count', TEST_GAME_PATH, 60, '1005', 1, 3000, { avgFps: { min: 57, max: 63 } }).run();
    await new TestRun('60fps medium node count', TEST_GAME_PATH, 60, '1005', 3, 3000, { avgFps: { min: 57, max: 63 } }).run();
    await new TestRun('60fps large node count', TEST_GAME_PATH, 60, '1005', 5, 3000, { avgFps: { min: 57, max: 63 } }).run();
    await new TestRun('60fps enormous node count', TEST_GAME_PATH, 60, '1005', 10, 3000, { avgFps: { min: 57, max: 63 } }).run();
    await new TestRun('30fps small node count', TEST_GAME_PATH, 30, '1005', 1, 3000, { avgFps: { min: 28.5, max: 34.5 } }).run();
    await new TestRun('30fps medium node count', TEST_GAME_PATH, 30, '1005', 3, 3000, { avgFps: { min: 28.5, max: 34.5 } }).run();
    await new TestRun('30fps large node count', TEST_GAME_PATH, 30, '1005', 5, 3000, { avgFps: { min: 28.5, max: 34.5 } }).run();
    await new TestRun('30fps enormous node count', TEST_GAME_PATH, 30, '1005', 10, 3000, { avgFps: { min: 28.5, max: 34.5 } }).run();
}

run();
