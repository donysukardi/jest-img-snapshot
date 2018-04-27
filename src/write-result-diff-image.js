const { PNG } = require('pngjs');
const fs = require('fs');
const getStdin = require('get-stdin');

getStdin.buffer().then((buffer) => {
  try {
    const input = JSON.parse(buffer);
    const { imagePath, image } = input;

    image.data = Buffer.from(image.data);

    const pngBuffer = PNG.sync.write(image);
    fs.writeFileSync(imagePath, pngBuffer);
    process.exit(0);
  } catch (error) {
    console.error(error); // eslint-disable-line no-console
    process.exit(1);
  }
});