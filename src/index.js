const snapshot = require('jest-snapshot');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const { PNG } = require('pngjs');
const Chalk = require('chalk').constructor;
const { RECEIVED_COLOR, EXPECTED_COLOR, matcherHint } = require('jest-matcher-utils');
const { diffImages, generateDiffImage } = require('./diff-images');
const { patchSnapshotState } = require('./patch-snapshot-state');
const { getImageSnapshotFilename, getDiffFilename, getTestnamePrefix, checksum } = require('./utils');

function configureToMatchImageSnapshot({
  customDiffConfig: defaultDiffConfig = {},
  noColors: defaultNoColors = false,
  failureThreshold: defaultFailureThreshold = 0,
  failureThresholdType: defaultFailureThresholdType = 'pixel',
} = {}) {
  return function toMatchImageSnapshot(received, {
    name: customName,
    customDiffConfig = {},
    noColors = defaultNoColors,
    failureThreshold = defaultFailureThreshold,
    failureThresholdType = defaultFailureThresholdType,
  } = {}) {

    const chalk = new Chalk({ enabled: !noColors });
    const { testPath, currentTestName, snapshotState, isNot } = this;
    const { _updateSnapshot } = snapshotState;
    
    if (isNot) {
      throw new Error('Jest: `.not` cannot be used with `.toMatchImgSnapshot()`.');
    }

    const snapshotIdentifier = customName && currentTestName
    ? `${getTestnamePrefix(currentTestName)}${customName}`
    : currentTestName || '';

    const count = Number(snapshotState._counters.get(snapshotIdentifier) || 0) + 1;
    
    const snapshotName = `${customName || currentTestName} ${count}`;
    const filename = getImageSnapshotFilename(snapshotName);
    const diffFilename = getDiffFilename(snapshotName);
    const snapshotValue = {
      type: 'image',
      checksum: checksum(JSON.stringify(received)),
      filename,
    }

    const baseDir = path.dirname(testPath);
    const imgSnapshotDir = path.resolve(baseDir, '__image_snapshots__');
    const baselineSnapshotPath = path.resolve(imgSnapshotDir, filename);
    const diffOutputDir = path.join(imgSnapshotDir, '__diff_output__');
    const diffOutputPath = path.join(diffOutputDir, diffFilename);

    if (snapshotState._updateSnapshot === 'none' && !fs.existsSync(baselineSnapshotPath)) {
      return {
        pass: false,
        message: () => `New snapshot was ${chalk.bold.red('not written')}. The update flag must be explicitly ` +
        'passed to write a new snapshot.\n\n + This is likely because this test is run in a continuous ' +
        'integration (CI) environment in which snapshots are not written by default.\n\n',
      };
    }

    if(!snapshotState.__patched__) {
      patchSnapshotState(snapshotState, {
        currentTestName,
        baseDir,
        imgSnapshotDir,
        diffOutputDir,
      });
    }

    let pass = false;

    if((_updateSnapshot === 'new' && !fs.existsSync(baselineSnapshotPath))) {
      mkdirp.sync(imgSnapshotDir);
      fs.writeFileSync(baselineSnapshotPath, received);
      console.log("Written image to path: " + baselineSnapshotPath);
      pass = true;
    } else {
      const defaultDiffConfig = {
        threshold: 0.01,
      };

      const customDiffConfig = {};
      const diffConfig = Object.assign({}, defaultDiffConfig, customDiffConfig);
      
      const expectedBuffer = fs.readFileSync(baselineSnapshotPath);
      const rawReceivedImage = PNG.sync.read(received);
      const rawBaselineImage = PNG.sync.read(expectedBuffer);
      
      const res = diffImages(
        rawBaselineImage,
        rawReceivedImage,
        diffConfig
      );

      const {
        hasSizeMismatch,
        imageWidth,
        imageHeight,
        receivedImage,
        baselineImage,
        diffImage,
        diffPixelCount,
        diffRatio
      } = res;

      if (hasSizeMismatch) {
        pass = false;
      } else if(diffPixelCount === 0) {
        pass = true;
      } else if (failureThresholdType === 'pixel') {
        pass = diffPixelCount <= failureThreshold;
      } else if (failureThresholdType === 'percent') {
        pass = diffRatio <= failureThreshold;
      } else {
        throw new Error(`Unknown failureThresholdType: ${failureThresholdType}. Valid options are "pixel" or "percent".`);
      }

      if(_updateSnapshot === 'all') {
        mkdirp.sync(imgSnapshotDir);
        
        // It's a passing test, remove previous diff artefact
        if(fs.existsSync(diffOutputPath)) {
          fs.unlinkSync(diffOutputPath);
        }

        if(diffPixelCount !== 0) {
          fs.writeFileSync(baselineSnapshotPath, received);
          console.log("Updated image on path: " + baselineSnapshotPath + "\n  with diff ratio: " + diffRatio + " and diff pixel count: " + diffPixelCount);
        }

        pass = true;
      } else {
        if(pass && diffPixelCount !== 0) {
          // use expectedBuffer so that the test will pass
          snapshotValue.checksum = checksum(JSON.stringify(expectedBuffer));
          console.log("Snapshot on path: " + baselineSnapshotPath + "\n passes with diff ratio: " + diffRatio + " and diff pixel count: " + diffPixelCount);
        }

        if (!pass) {
          generateDiffImage({
            baselineImage,
            receivedImage,
            diffImage,
            imageWidth,
            imageHeight,
            diffOutputDir,
            diffOutputPath
          })
        }
      }
    }

    snapshot.toMatchSnapshot.call(this, snapshotValue, customName);

    if(pass) {
      return {
        message: () => '', pass: true
      };
    } else {
      const report = () => `${RECEIVED_COLOR('Received image')} does not match ` +
      `${EXPECTED_COLOR(`stored snapshot "${snapshotName}"`)}.\n\n` +
        RECEIVED_COLOR('+ ' + diffOutputPath);

      return {
        message: () => matcherHint('.toMatchImageSnapshot', 'image', '') + '\n\n' + report(),
        pass: false,
        name: 'toMatchImageSnapshot'
      }
    }
  }
}

module.exports = {
  toMatchImageSnapshot: configureToMatchImageSnapshot(),
  configureToMatchImageSnapshot,
};