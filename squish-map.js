const path = require('path');

const homegamesCorePath = path.dirname(require.resolve('homegames-core'));
const homegamesDepsPath = path.join(homegamesCorePath, 'node_modules');

const squishMap = {

};

const insertVersion = (squishVersion) => {
    const squishPath = require.resolve(`squish-${squishVersion}`, { paths: [ homegamesDepsPath ] });
    squishMap[squishVersion] = require(squishPath);
};

insertVersion('0756');
insertVersion('0762');
insertVersion('0765');
insertVersion('0766');
insertVersion('0767');
insertVersion('1000');
insertVersion('1004');
insertVersion('1005');
insertVersion('1006');

module.exports = squishMap;
