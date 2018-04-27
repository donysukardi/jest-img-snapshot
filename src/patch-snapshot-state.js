const fs = require('fs');
const path = require('path');
const { getImageSnapshotFilename, getDiffFilename, getTestnamePrefix } = require('./utils');

function patchSnapshotState(snapshotState, {
  currentTestName,
  baseDir,
  imgSnapshotDir,
  diffOutputDir
}) {
  const testnamePrefix = getTestnamePrefix(currentTestName);

  const _removeUncheckedKeys = snapshotState.removeUncheckedKeys;
  snapshotState.removeUncheckedKeys = function() {
    if (this._updateSnapshot === 'all' && this._uncheckedKeys.size) {
      let message = '';     
      this._uncheckedKeys.forEach(x => {
        let snapshotName = x.startsWith(testnamePrefix) ? x.replace(testnamePrefix, '') : x;
        const imagePath = path.resolve(imgSnapshotDir, getImageSnapshotFilename(snapshotName));
        const diffFilePath = path.resolve(diffOutputDir, getDiffFilename(snapshotName));
        
        message += "Deleted: " + imagePath + "\n";
        if(fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
        if(fs.existsSync(diffFilePath)) {
          fs.unlinkSync(diffFilePath);
        }
      });
      
      console.log(message);
    }
    _removeUncheckedKeys.call(this);
  }

  const _getUncheckedKeys = snapshotState.getUncheckedKeys;
  snapshotState.getUncheckedKeys = function() {
    if (this._updateSnapshot !== 'all' && this._uncheckedKeys.size) {
      let message = '';
      this._uncheckedKeys.forEach(x => {
        let snapshotName = x.startsWith(testnamePrefix) ? x.replace(testnamePrefix, '') : x;
        const imagePath = path.resolve(imgSnapshotDir, getImageSnapshotFilename(snapshotName));
        message += "Obsolete: " + imagePath + "\n";
      });
      console.log(message);
    }
    const uncheckedKeys = _getUncheckedKeys.call(this);
    return uncheckedKeys;
  }

  snapshotState.__patched__ = true;
}

module.exports.patchSnapshotState = patchSnapshotState;