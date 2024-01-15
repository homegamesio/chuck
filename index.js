#!/usr/bin/env node

const process = require('process');
const path = require('path');
const http = require('http');

const WebSocket = require('ws');

const { connect, getStats, parseAssets } = require('./common');

const targetArgIndex = process.argv.findIndex(i => i === '--target');
const portArgIndex = process.argv.findIndex(i=> i === '--port');

if (targetArgIndex < 0 || !process.argv[targetArgIndex + 1]) {
    console.error('Missing target, eg. --target localhost:3000');
    process.exit(1);
}

const target = process.argv[targetArgIndex + 1];
let gameServerPort;

if (portArgIndex >= 0 && process.argv[portArgIndex + 1]) {
    gameServerPort = Number(process.argv[portArgIndex + 1]);
    console.log('you also want to run watch server on ' + gameServerPort);
}


const homegamesCorePath = path.dirname(require.resolve('homegames-core'));
const homegamesDepsPath = path.join(homegamesCorePath, 'node_modules');
const squishPath = require.resolve('squish-1005', { paths: [ homegamesDepsPath ] });

const squishMap = require('./squish-map');

const ASSET_BUNDLE = 1;
const READY_MESSAGE = 2;
const GAME_FRAME = 3;

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

const runReportingServer = (port) => { 
    const app = (req, res) => {
        if (req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(getStats(frames)));
        }
    };

    http.createServer(app).listen(port);
}

const ASSET_START = 1;

const IMAGE_SUBTYPE = 1;
const AUDIO_SUBTYPE = 2;
const FONT_SUBTYPE = 3;

const assetSubtypes = new Set([IMAGE_SUBTYPE, AUDIO_SUBTYPE, FONT_SUBTYPE]);

const storeAssets = (buf) => {
    let i = 0;

    while (i < buf.length) {
        const frameType = buf[i];

        if (frameType === ASSET_START) {
            const assetType = buf[i + 1];
            if (assetSubtypes.has(assetType)) {
                const payloadLengthBase36StartIndex = i + 2;
                const payloadLengthBase36StringLength = 10; // just kind of a known number
                const payloadKeyLength = 32; // another known number
                const payloadLengthBase36EndIndex = payloadLengthBase36StartIndex + payloadLengthBase36StringLength;

                const payloadLengthBase36 = String.fromCharCode.apply(null, buf.slice(payloadLengthBase36StartIndex, payloadLengthBase36EndIndex));
                const payloadLength = parseInt(payloadLengthBase36, 36);
                const payloadKeyRaw = buf.slice(payloadLengthBase36EndIndex, payloadLengthBase36EndIndex + payloadKeyLength);
                const payloadKey = String.fromCharCode.apply(null, payloadKeyRaw.filter(k => k)); 
                
                const payloadData = buf.slice(payloadLengthBase36EndIndex + payloadKeyLength, payloadLengthBase36EndIndex +  payloadLength);

                if (assetType === IMAGE_SUBTYPE) {
                    let imgBase64String = "";
                    for (let i = 0; i < payloadData.length; i++) {
                        imgBase64String += String.fromCharCode(payloadData[i]);
                    }
                    const imgBase64 = btoa(imgBase64String);
                    gameAssets['images'][payloadKey] = {"type": "image", "data": "data:image/jpeg;base64," + imgBase64};
                    i += 12 + payloadLength;
                } else if (assetType === AUDIO_SUBTYPE) {
                    gameAssets['audio'][payloadKey] = {"type": "audio", "data": payloadData.buffer, "decoded": false};
                    i += 12 + payloadLength;
                } else if (assetType === FONT_SUBTYPE) {
                    gameAssets['fonts'][payloadKey] = { "type": "font", "data": payloadData.length, "name": payloadKey }
                    i += 12 + payloadLength;
                } 
            } else {
                console.error('Unknown asset type: ' + assetType);
            }
        } else {
            console.error('Unknown frame type: ' + frameType);
        }
    }
}

const handleGameFrame = (msg) => {
    frames.push({ time: Date.now(), data: msg });
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
        storeAssets(msg);
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
    const ws = new WebSocket(`ws://${target}`);

    ws.on('error', (err) => {
        console.log("error!");
        console.log(err);
    });

    ws.on('open', () => {
        ws.send(JSON.stringify({
            type: 'ready',
            clientInfo: {
                deviceType: 'desktop',
                aspectRatio: (16/9)
            }
        }));
    });

    ws.on('message', (data) => {
        const ting = new Uint8ClampedArray(data);
        handleMessage(ting);
    });

    if (gameServerPort) {
        runReportingServer(gameServerPort);
    }

}, 1500);
