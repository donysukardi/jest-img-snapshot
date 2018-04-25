const snapshot = require('jest-snapshot');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const childProcess = require('child_process');
const pixelmatch = require('pixelmatch');
const mkdirp = require('mkdirp');
const kebabCase = require('lodash.kebabcase');
const { RECEIVED_COLOR, EXPECTED_COLOR, matcherHint } = require('jest-matcher-utils');
const { patchSnapshotState } = require('./patchSnapshotState');
const { getFilename, getScreenshotPath, checksum, alignImagesToSameSize } = require('./utils');

function toMatchImageSnapshot(buffer) {

  const { currentTestName, snapshotState } = this;
  const { _updateSnapshot } = snapshotState;

  const count = Number(snapshotState._counters.get(currentTestName) || 0) + 1;
  const testname = currentTestName + " " + count;

  if(!snapshotState.__patched__) {
    patchSnapshotState(snapshotState);
  }

  const filename = getFilename(testname);
  const basePath = path.resolve(snapshotState._snapshotPath, '../');
  const baselineSnapshotPath = getScreenshotPath(snapshotState._snapshotPath, filename);

  const diffFilename = `${kebabCase(testname)}-diff.png`;
  const diffOutputDir = path.join(basePath, '__diff_output__');
  const diffOutputPath = path.join(diffOutputDir, diffFilename);
  
  let updated = false;
  let pass = false;
  let diffPixelCount;
  let diffRatio;
  
  if((_updateSnapshot === 'new' && !fs.existsSync(baselineSnapshotPath)) || _updateSnapshot === 'all') {
    fs.writeFileSync(baselineSnapshotPath, buffer);
    console.log("Written image to path: " + baselineSnapshotPath);
    if(fs.existsSync(diffOutputPath)) {
      fs.unlinkSync(diffOutputPath);
    }
    pass = true;
  } else {
    const defaultDiffConfig = {
      threshold: 0.01,
    };

    const customDiffConfig = {};
    const failureThreshold = 0.1;
    const failureThresholdType = 'percent';
    const diffConfig = Object.assign({}, defaultDiffConfig, customDiffConfig);
    
    const expectedBuffer = fs.readFileSync(baselineSnapshotPath);
    const rawReceivedImage = PNG.sync.read(buffer);
    const rawBaselineImage = PNG.sync.read(expectedBuffer);
    const hasSizeMismatch = (
      rawReceivedImage.height !== rawBaselineImage.height ||
      rawReceivedImage.width !== rawBaselineImage.width
    );

    // Align images in size if different
    const [receivedImage, baselineImage] = hasSizeMismatch
      ? alignImagesToSameSize(rawReceivedImage, rawBaselineImage)
      : [rawReceivedImage, rawBaselineImage];
    const imageWidth = receivedImage.width;
    const imageHeight = receivedImage.height;
    const diffImage = new PNG({ width: imageWidth, height: imageHeight });

    diffPixelCount = pixelmatch(
      receivedImage.data,
      baselineImage.data,
      diffImage.data,
      imageWidth,
      imageHeight,
      diffConfig
    );

    const totalPixels = imageWidth * imageHeight;
    diffRatio = diffPixelCount / totalPixels;

    if (hasSizeMismatch) {
      pass = false;
    } else if(diffPixelCount === 0) {
      pass = true;
    } else if (failureThresholdType === 'pixel') {
      pass = diffPixelCount <= failureThreshold;
      updated = pass;
    } else if (failureThresholdType === 'percent') {
      pass = diffRatio <= failureThreshold;
      updated = pass;
    } else {
      throw new Error(`Unknown failureThresholdType: ${failureThresholdType}. Valid options are "pixel" or "percent".`);
    }

    if (!pass) {
      mkdirp.sync(diffOutputDir);
      const compositeResultImage = new PNG({
        width: imageWidth * 3,
        height: imageHeight,
      });
      // copy baseline, diff, and received images into composite result image
      PNG.bitblt(
        baselineImage, compositeResultImage, 0, 0, imageWidth, imageHeight, 0, 0
      );
      PNG.bitblt(
        diffImage, compositeResultImage, 0, 0, imageWidth, imageHeight, imageWidth, 0
      );
      PNG.bitblt(
        receivedImage, compositeResultImage, 0, 0, imageWidth, imageHeight, imageWidth * 2, 0
      );

      const input = { imagePath: diffOutputPath, image: compositeResultImage };
      // image._packer property contains a circular reference since node9, causing JSON.stringify to
      // fail. Might as well discard all the hidden properties.
      const serializedInput = JSON.stringify(input, (name, val) => (name[0] === '_' ? undefined : val));

      // writing diff in separate process to avoid perf issues associated with Math in Jest VM (https://github.com/facebook/jest/issues/5163)
      const writeDiffProcess = childProcess.spawnSync('node', [`${__dirname}/write-result-diff-image.js`], { input: Buffer.from(serializedInput) });
      // in case of error print to console
      if (writeDiffProcess.stderr.toString()) { console.log(writeDiffProcess.stderr.toString()); } // eslint-disable-line no-console, max-len
    } else {
      // It's a passing test, remove previous diff artefact
      if(fs.existsSync(diffOutputPath)) {
        fs.unlinkSync(diffOutputPath);
      }
    }
  }

  const value = {
    type: 'image',
    checksum: checksum(JSON.stringify(buffer)),
    filename
  }

  if(updated) {
    const updateSnapshotBak = snapshotState._updateSnapshot;
    snapshotState._updateSnapshot = 'all';
    snapshot.toMatchSnapshot.call(this, value);
    snapshotState._updateSnapshot = updateSnapshotBak;

    fs.writeFileSync(baselineSnapshotPath, buffer);
    console.log("Updated image on path: " + baselineSnapshotPath + "\n  with diff ratio: " + diffRatio + " and diff pixel count: " + diffPixelCount);
  } else {
    snapshot.toMatchSnapshot.call(this, value);
  }

  if(pass) {
    return {
      message: () => '', pass: true
    };
  } else {
    const report = () => `${RECEIVED_COLOR('Received image')} does not match ` +
    `${EXPECTED_COLOR(`stored snapshot "${testname}"`)}.\n\n` +
      RECEIVED_COLOR('+ ' + diffOutputPath);

    return {
      message: () => matcherHint('.toMatchImageSnapshot', 'image', '') + '\n\n' + report(),
      pass: false,
      name: 'toMatchImageSnapshot'
    }
  }
}

module.exports.toMatchImageSnapshot = toMatchImageSnapshot;