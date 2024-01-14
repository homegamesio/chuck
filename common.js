const WebSocket = require('ws');

const ASSET_START = 1;

const IMAGE_SUBTYPE = 1;
const AUDIO_SUBTYPE = 2;
const FONT_SUBTYPE = 3;

const ASSET_SUBTYPES = new Set([IMAGE_SUBTYPE, AUDIO_SUBTYPE, FONT_SUBTYPE]);

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

const getStats = (frames, squishPath = null) => {
    const last100StartIndex = Math.max(0, frames.length - 100);
    const last100EndIndex = Math.min(frames.length - 1, last100StartIndex + 100);

    let last100Start = frames[last100StartIndex].time;
    let last100End = frames[last100EndIndex].time;

    const avgMillisPerFrame = (last100End - last100Start) / 100;

    const data = {
        totalFrames: frames.length,
        performance: {
            '100': calcPerformance(frames, 100),
            '1000': calcPerformance(frames, 1000),
            'all': calcPerformance(frames)
        }
    }

    if (squishPath) {
        const startTime = Date.now();
        const unsquishedPayload = unsquishPayload(frames[frames.length - 1].data, squishPath);
        const endTime = Date.now();

        data['totalNodes'] = unsquishedPayload.length;
        data['unsquishTime'] = endTime - startTime;
    }

    return data;
};

const unsquishPayload = (payload, squishPath) => {
    let i = 0;
    let unsquished = [];
    const { unsquish } = require(squishPath);
    while (i < payload.length) {
        const frameSize = payload[i + 1] + payload[i + 2] + payload[i + 3];
        unsquished.push(unsquish(payload.slice(i, i + frameSize)));
        i += frameSize;
    }
    return unsquished;
};

const parseAssets = (buf) => {
    let i = 0;

    const gameAssets = {
        audio: {},
        images: {},
        fonts: {}
    };

    while (i < buf.length) {
        const frameType = buf[i];

        if (frameType === ASSET_START) {
            const assetType = buf[i + 1];
            if (ASSET_SUBTYPES.has(assetType)) {
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

    return gameAssets;
}

const connect = (target, onMessage, deviceType = 'desktop', aspectRatio = (16 / 9)) => {
    const ws = new WebSocket(`ws://${target}`);

    ws.on('error', (err) => {
        console.error("error!");
        console.error(err);
    });

    ws.on('open', () => {
        ws.send(JSON.stringify({
            type: 'ready',
            clientInfo: {
                deviceType,
                aspectRatio
            }
        }));
    });

    ws.on('message', (data) => {
        const ting = new Uint8ClampedArray(data);
        onMessage(ting);
    });
};

module.exports = {
    getStats,
    parseAssets,
    connect
}
