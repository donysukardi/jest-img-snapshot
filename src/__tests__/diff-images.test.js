const { PNG } = require('pngjs');
const { diffImages, generateCompositeDiffImage } = require('../diff-images');

describe('diffImages', () => {
  it('works on same images', () => {
    const baselineImage = new PNG({ width: 128, height: 128 });
    const receivedImage = new PNG({ width: 128, height: 128 });
    const diffConfig = {
      threshold: 0.01,
    };

    const results = diffImages(baselineImage, receivedImage, diffConfig);

    expect(results.hasSizeMismatch).toBe(false);
    expect(results.diffPixelCount).toBe(0);
    expect(results.diffRatio).toBe(0);
  });

  it('detects size mismatch', () => {
    const baselineImage = new PNG({ width: 64, height: 64 });
    const receivedImage = new PNG({ width: 128, height: 128 });
    const diffConfig = {
      threshold: 0.01,
    };

    const results = diffImages(baselineImage, receivedImage, diffConfig);
    expect(results.hasSizeMismatch).toBe(true);
  });

  it('works on images of different sizes', () => {
    const baselineImage = new PNG({ width: 128, height: 128 });
    const receivedImage = new PNG({ width: 128, height: 128 });
    const diffConfig = {
      threshold: 0.01,
    };

    // Paint first pixel black
    const idx = (128 * 0 + 0) << 2;
    baselineImage.data[idx] = 0;
    baselineImage.data[idx + 1] = 0;
    baselineImage.data[idx + 2] = 0;
    baselineImage.data[idx + 3] = 0xff;

    const results = diffImages(baselineImage, receivedImage, diffConfig);
    expect(results.diffRatio).toBe(1/(128*128));
    expect(results.diffPixelCount).toBe(1);
  })
});

describe('generateCompositeDiffImage', () => {
  it('generates composite diff image', () => {
    const baselineImage = new PNG({ width: 128, height: 128 });
    const receivedImage = new PNG({ width: 128, height: 128 });
    const diffImage = new PNG({ width: 128, height: 128 });
    const compositeDiffImage = generateCompositeDiffImage(
      baselineImage,
      receivedImage,
      diffImage
    );

    expect(compositeDiffImage.width).toBe(128*3);
    expect(compositeDiffImage.height).toBe(128);
  });
});