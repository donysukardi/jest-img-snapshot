const path = require('path');
const kebabCase = require('lodash.kebabcase');
const crypto = require('crypto');
const { PNG } = require('pngjs');

function checksum(str, algorithm, encoding) {
  return crypto.createHash(algorithm || 'md5')
    .update(str, 'utf8')
    .digest(encoding || 'hex');
}

function getFilename(testname) {
  const snapshotIdentifier = kebabCase(testname);
  return `${snapshotIdentifier}-snap.png`;
}

function getDiffFilename(testname) {
  const snapshotIdentifier = kebabCase(testname);
  return `${snapshotIdentifier}-diff.png`;
}

function getDiffPath(snapshotPath, filename) {
  const diffPath = path.resolve(snapshotPath, '../__diff_output__', filename);
  return diffPath;
}

function getScreenshotPath(snapshotPath, filename) {
  const screenshotPath = path.resolve(snapshotPath, '../', filename);
  return screenshotPath;
}

/**
 * Helper function to create reusable image resizer
 */
const createImageResizer = (width, height) => (source) => {
  const resized = new PNG({ width, height, fill: true });
  PNG.bitblt(source, resized, 0, 0, source.width, source.height, 0, 0);
  return resized;
};

/**
 * Fills diff area with black transparent color for meaningful diff
 */
/* eslint-disable no-plusplus, no-param-reassign, no-bitwise */
const fillSizeDifference = (width, height) => (image) => {
  const inArea = (x, y) => y > height || x > width;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (inArea(x, y)) {
        const idx = ((image.width * y) + x) << 2;
        image.data[idx] = 0;
        image.data[idx + 1] = 0;
        image.data[idx + 2] = 0;
        image.data[idx + 3] = 64;
      }
    }
  }
  return image;
};
/* eslint-enabled */

/**
 * Aligns images sizes to biggest common value
 * and fills new pixels with transparent pixels
 */
const alignImagesToSameSize = (firstImage, secondImage) => {
  // Keep original sizes to fill extended area later
  const firstImageWidth = firstImage.width;
  const firstImageHeight = firstImage.height;
  const secondImageWidth = secondImage.width;
  const secondImageHeight = secondImage.height;
  // Calculate biggest common values
  const resizeToSameSize = createImageResizer(
    Math.max(firstImageWidth, secondImageWidth),
    Math.max(firstImageHeight, secondImageHeight)
  );
  // Resize both images
  const resizedFirst = resizeToSameSize(firstImage);
  const resizedSecond = resizeToSameSize(secondImage);
  // Fill resized area with black transparent pixels
  return [
    fillSizeDifference(firstImageWidth, firstImageHeight)(resizedFirst),
    fillSizeDifference(secondImageWidth, secondImageHeight)(resizedSecond),
  ];
};

module.exports.checksum = checksum;
module.exports.getFilename = getFilename;
module.exports.getScreenshotPath = getScreenshotPath;
module.exports.alignImagesToSameSize = alignImagesToSameSize;
module.exports.fillSizeDifference = fillSizeDifference;
module.exports.createImageResizer = createImageResizer;
module.exports.getDiffFilename = getDiffFilename;
module.exports.getDiffPath = getDiffPath;