const fs = require('fs');
const path = require('path');
const { getImageSnapshotFilename, getDiffFilename, getTestnamePrefix } = require('./utils');

function logDeletedFiles(files) {
  return files.reduce((acc, x) => acc + `Deleted: ${x}\n`, '');
}

function logObsoleteFiles(files) {
  return files.reduce((acc, x) => acc + `Obsolete: ${x}\n`, '');
}

function patchSnapshotState(snapshotState, {
  currentTestName,
  imgSnapshotDir,
  diffOutputDir
}) {
  const testnamePrefix = getTestnamePrefix(currentTestName);

  const _getUncheckedKeys = snapshotState.getUncheckedKeys;
  snapshotState.getUncheckedKeys = function() {
    if (this._updateSnapshot !== 'all' && this._uncheckedKeys.size) {
      const obsoleteFiles = [];
      this._uncheckedKeys.forEach(x => {
        let snapshotName = x.startsWith(testnamePrefix) ? x.replace(testnamePrefix, '') : x;
        const imagePath = path.resolve(imgSnapshotDir, getImageSnapshotFilename(snapshotName));
        obsoleteFiles.push(imagePath);
      });
      console.log(logObsoleteFiles(obsoleteFiles));
    }
    const uncheckedKeys = _getUncheckedKeys.call(this);
    return uncheckedKeys;
  }

  const _removeUncheckedKeys = snapshotState.removeUncheckedKeys;
  snapshotState.removeUncheckedKeys = function() {
    if (this._updateSnapshot === 'all' && this._uncheckedKeys.size) {
      const deletedFiles = [];
      this._uncheckedKeys.forEach(x => {
        let snapshotName = x.startsWith(testnamePrefix) ? x.replace(testnamePrefix, '') : x;
        const imagePath = path.resolve(imgSnapshotDir, getImageSnapshotFilename(snapshotName));
        const diffFilePath = path.resolve(diffOutputDir, getDiffFilename(snapshotName));
        deletedFiles.push(imagePath);
        if(fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
        if(fs.existsSync(diffFilePath)) {
          fs.unlinkSync(diffFilePath);
        }
      });
      console.log(logDeletedFiles(deletedFiles));
    }
    _removeUncheckedKeys.call(this);
  }

  snapshotState.__patched__ = true;
}

module.exports.logDeletedFiles = logDeletedFiles;
module.exports.logObsoleteFiles = logObsoleteFiles;
module.exports.patchSnapshotState = patchSnapshotState;