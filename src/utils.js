const crypto = require('crypto');
const kebabCase = require('lodash.kebabcase');

function getImageSnapshotFilename(snapshotName) {
  return `${kebabCase(snapshotName)}-snap.png`;
}

function getDiffFilename(snapshotName) {
  return `${kebabCase(snapshotName)}-diff.png`;
}

function checksum(str, algorithm, encoding) {
  return crypto.createHash(algorithm || 'md5')
    .update(str, 'utf8')
    .digest(encoding || 'hex');
}

function getTestnamePrefix(currentTestName){
  return `${currentTestName}: `;
}

module.exports.checksum = checksum;
module.exports.getImageSnapshotFilename = getImageSnapshotFilename;
module.exports.getDiffFilename = getDiffFilename;
module.exports.getTestnamePrefix = getTestnamePrefix;