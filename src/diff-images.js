const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');
const childProcess = require('child_process');
const mkdirp = require('mkdirp');

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

function diffImages(
  rawBaselineImage,
  rawReceivedImage,
  diffConfig
) {
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

  const diffPixelCount = pixelmatch(
    receivedImage.data,
    baselineImage.data,
    diffImage.data,
    imageWidth,
    imageHeight,
    diffConfig
  );

  const totalPixels = imageWidth * imageHeight;
  const diffRatio = diffPixelCount / totalPixels;

  return {
    diffRatio,
    diffPixelCount,
    hasSizeMismatch,
    imageWidth,
    imageHeight,
    receivedImage,
    baselineImage,
    diffImage
  }
}

function generateDiffImage({
  baselineImage,
  receivedImage,
  diffImage,
  imageWidth,
  imageHeight,
  diffOutputDir,
  diffOutputPath
}) {
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
}

module.exports.diffImages = diffImages;
module.exports.generateDiffImage = generateDiffImage;