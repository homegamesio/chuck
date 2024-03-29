#!/usr/bin/env node

const process = require('process');
const path = require('path');
const http = require('http');

const { connect, getStats, parseAssets } = require('./common');

const targetArgIndex = process.argv.findIndex(i => i === '--target');

if (targetArgIndex < 0 || !process.argv[targetArgIndex + 1]) {
    console.error('Missing target, eg. --target localhost:3000');
    process.exit(1);
}

const target = process.argv[targetArgIndex + 1];

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
    frames.push({ time: Date.now(), data: msg });
    if (frames.length % 10 === 0) {
        const totalMap = Object.assign({
            playerId,
            squishVersion,
            sessionMetadata: {
                bezelInfo,
                aspectRatio
            },
            gameAssets,
        }, getStats(frames));
        console.log(totalMap);
    }

    if (frames.length > 1000) {
        console.log('cool');
        process.exit(1);
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
//    const ws = new WebSocket(`ws://${target}`);
//
//    ws.on('error', (err) => {
//        console.log("error!");
//        console.log(err);
//    });
//
//    ws.on('open', () => {
//        ws.send(JSON.stringify({
//            type: 'ready',
//            clientInfo: {
//                deviceType: 'desktop',
//                aspectRatio: (16/9)
//            }
//        }));
//    });
//
//    ws.on('message', (data) => {
//        const ting = new Uint8ClampedArray(data);
//        handleMessage(ting);
//    });

}, 1500);
