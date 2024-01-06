#!/usr/bin/env node

const process = require('process');
const path = require('path');

const gameServerPort = process.argv[2];

const homegamesCorePath = path.dirname(require.resolve('homegames-core'));
const homegamesDepsPath = path.join(homegamesCorePath, 'node_modules');
const squishPath = require.resolve('squish-1005', { paths: [ homegamesDepsPath ] });

process.env.HOME_PORT=3001;
process.env.START_PATH=`/Users/josephgarcia/homegames/chuck/test-game`;
process.env.HOMENAMES_PORT=3000;
process.env.GAME_SERVER_PORT_RANGE_MIN=3050;
process.env.GAME_SERVER_PORT_RANGE_MAX=3051;
process.env.LOG_PATH=`/Users/josephgarcia/homegames/chuck/homegames_log.txt`;
process.env.SQUISH_PATH=squishPath;

const homegames = require('homegames-core');

setTimeout(() => {
    console.log('gonna connect to the game server');
}, 5000);
