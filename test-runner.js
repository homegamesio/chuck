const process = require('process');
const path = require('path');
const http = require('http');

const { connect, getStats, parseAssets } = require('./common');

const target = 'localhost:3000';

const homegamesCorePath = path.dirname(require.resolve('homegames-core'));
const homegamesDepsPath = path.join(homegamesCorePath, 'node_modules');
const squishPath = require.resolve('squish-1005', { paths: [ homegamesDepsPath ] });

const squishMap = require('./squish-map');

const targetPort = Number(target.split(':')[1]);
process.env.HOME_PORT=targetPort;
process.env.START_PATH=`/Users/josephgarcia/homegames/chuck/test-game`;
//process.env.HOMENAMES_PORT=targetPort;
//process.env.GAME_SERVER_PORT_RANGE_MIN=3050;
//process.env.GAME_SERVER_PORT_RANGE_MAX=3051;
//process.env.LOG_PATH=`/Users/josephgarcia/homegames/chuck/homegames_log.txt`;
process.env.SQUISH_PATH=squishPath;

// test game specific
process.env.BASE_WIDTH = 2;
process.env.BASE_HEIGHT = 2;
process.env.SCALE_FACTOR = 1;
process.env.TICK_RATE = 4000;


//const target = process.env.TARGET_SERVER;
//
//console.log("THIS IS TARGET SERVER");
//console.log(target);
//
//const homegamesCorePath = path.dirname(require.resolve('homegames-core'));
//const homegamesDepsPath = path.join(homegamesCorePath, 'node_modules');
//const squishPath = require.resolve('squish-1005', { paths: [ homegamesDepsPath ] });
//
//const squishMap = require('./squish-map');
//
//const targetPort = Number(target.split(':')[1]);
//process.env.SQUISH_PATH=squishPath;
//
//// test game specific
//process.env.BASE_WIDTH = 2;
//process.env.BASE_HEIGHT = 2;
//process.env.SCALE_FACTOR = 1;
//process.env.FRAME_TOTAL = 100;

const ASSET_BUNDLE = 1;
const READY_MESSAGE = 2;
const GAME_FRAME = 3;

const homegames = require('homegames-core');

let bezelInfo;
let aspectRatio;
let squishVersion;
let squish;
let unsquish;
let Colors;
let playerId;
let gameAssets = {
    audio: {},
    images: {},
    fonts: {}
};
let frames = [];

const handleGameFrame = (msg) => {
    console.log('resultzz:bnbgbgbgbg');
    frames.push({ time: Date.now(), data: msg });
    if (frames.length === process.env.FRAME_TOTAL) {
        const totalMap = Object.assign({
            playerId,
            squishVersion,
            sessionMetadata: {
                bezelInfo,
                aspectRatio
            },
            gameAssets,
        }, getStats(frames));
        console.log(`resultzz:${totalMap}`);
        process.exit(0);
    }
};

const handleMessage = (msg) => {
    const messageType = msg[0];
    if (messageType === READY_MESSAGE) {
        const confirmedPlayerId = msg[1];
        const aspectRatioX = msg[2];
        const aspectRatioY = msg[3];
        const bezelX = msg[4];
        const bezelY = msg[5];
        const squishVersionStringLength = msg[6];
        const squishVersionString = String.fromCharCode.apply(null, msg.slice(7, 7 + squishVersionStringLength));
        squishVersion = squishVersionString;
        
        const eventPayload = {
            type: 'initMessage',
            playerId: confirmedPlayerId,
            aspectRatio: {
                x: aspectRatioX,
                y: aspectRatioY
            },
            bezel: {
                x: bezelX,
                y: bezelY
            },
            squishVersion: squishVersionString
        };

        handleEvent(eventPayload);
    } else if (messageType === ASSET_BUNDLE) {
        gameAssets = parseAssets(msg);
    } else if (messageType === GAME_FRAME) {
        handleGameFrame(msg);
    } else {
        console.log('need to handle this: ' + messageType);
        console.log(msg);
    }
};

const handleEvent = (payload) => {
    if (payload.type === 'initMessage') {
        playerId = payload.playerId; 
        aspectRatio = payload.aspectRatio;
        bezelInfo = payload.bezel;

        const matchedSquishVersion = squishMap[payload.squishVersion];
        
        squish = matchedSquishVersion.squish;
        unsquish = matchedSquishVersion.unsquish;
        Colors = matchedSquishVersion.Colors;
    }
};

setTimeout(() => {
    connect(target, handleMessage);
}, 500);