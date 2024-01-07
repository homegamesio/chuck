#!/usr/bin/env node

const process = require('process');
const path = require('path');
const http = require('http');

const WebSocket = require('ws');

const gameServerPort = process.argv[2];

const homegamesCorePath = path.dirname(require.resolve('homegames-core'));
const homegamesDepsPath = path.join(homegamesCorePath, 'node_modules');
const squishPath = require.resolve('squish-1005', { paths: [ homegamesDepsPath ] });

const squishMap = require('./squish-map');

process.env.HOME_PORT=3001;
process.env.START_PATH=`/Users/josephgarcia/homegames/chuck/test-game`;
process.env.HOMENAMES_PORT=3000;
process.env.GAME_SERVER_PORT_RANGE_MIN=3050;
process.env.GAME_SERVER_PORT_RANGE_MAX=3051;
process.env.LOG_PATH=`/Users/josephgarcia/homegames/chuck/homegames_log.txt`;
process.env.SQUISH_PATH=squishPath;

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

const calcPerformance = (frames, frameCount) => {
    if (!frameCount) {
        frameCount = frames.length;
    }
    const sIndex = Math.max(0, frames.length - frameCount);
    const eIndex = Math.min(frames.length - 1, sIndex + frameCount);

    let start = frames[sIndex].time;
    let end = frames[eIndex].time;

    let lowestFrameTime;
    let highestFrameTime;
    let totalFrameTime = 0;
    let avgFrameTime;

    for (let i = sIndex; i < eIndex - 1; i++) {
        const timeDiff = frames[i + 1].time - frames[i].time;
        if (!lowestFrameTime || timeDiff < lowestFrameTime) {
            lowestFrameTime = timeDiff;
        }

        if (!highestFrameTime || timeDiff > highestFrameTime) {
            highestFrameTime = timeDiff;
        }
        
        totalFrameTime += timeDiff;
    }

    avgFrameTime = totalFrameTime / (frameCount);

    const avgMillisPerFrame = (end - start) / frameCount;

    return {
        avgFps: 1000 / avgMillisPerFrame,
        avgFrameTime,
        lowestFrameTime,
        highestFrameTime
    }
};

const getStats = () => {
    const last100StartIndex = Math.max(0, frames.length - 100);
    const last100EndIndex = Math.min(frames.length - 1, last100StartIndex + 100);

    let last100Start = frames[last100StartIndex].time;
    let last100End = frames[last100EndIndex].time;

    const avgMillisPerFrame = (last100End - last100Start) / 100;

    return {
        playerId,
        squishVersion,
        sessionMetadata: {
            bezelInfo,
            aspectRatio
        },
        gameAssets,
        totalFrames: frames.length,
        performance: {
            '100': calcPerformance(frames, 100),
            '1000': calcPerformance(frames, 1000),
            'all': calcPerformance(frames)
        }
    }
};

const runReportingServer = (port) => { 
    const app = (req, res) => {
        if (req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(getStats()));
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
    const ws = new WebSocket('ws://localhost:3001');// + process.env.HOME_PORT);

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

    if (process.env.SERVER_PORT) {
        runReportingServer(process.env.SERVER_PORT);
    }

}, 1500);
