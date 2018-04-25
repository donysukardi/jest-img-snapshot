const fs = require('fs');
const { getScreenshotPath, getDiffPath, getFilename, getDiffFilename } = require('./utils');

function patchSnapshotState(snapshotState) {
  const _removeUncheckedKeys = snapshotState.removeUncheckedKeys;
  snapshotState.removeUncheckedKeys = function() {
    if (this._updateSnapshot === 'all' && this._uncheckedKeys.size) {
      let str = '';
      this._uncheckedKeys.forEach(x => {
        const xPath = getScreenshotPath(this._snapshotPath, getFilename(x));
        const diffPath = getDiffPath(this._snapshotPath, getDiffFilename(x));
        str += "Deleted: " + xPath + "\n";
        if(fs.existsSync(xPath)) {
          fs.unlinkSync(xPath);
        }
        if(fs.existsSync(diffPath)) {
          fs.unlinkSync(diffPath);
        }
      });
      
      console.log(str);
    }
    _removeUncheckedKeys.call(this);
  }

  const _getUncheckedKeys = snapshotState.getUncheckedKeys;
  snapshotState.getUncheckedKeys = function() {
    if (this._updateSnapshot !== 'all' && this._uncheckedKeys.size) {
      let str = '';
      this._uncheckedKeys.forEach(x => {
        str += "Obsolete: " + getScreenshotPath(this._snapshotPath, getFilename(x)) + "\n";
      });
      console.log(str);
    }
    const uncheckedKeys = _getUncheckedKeys.call(this);
    return uncheckedKeys;
  }

  snapshotState.__patched__ = true;
}

module.exports.patchSnapshotState = patchSnapshotState;