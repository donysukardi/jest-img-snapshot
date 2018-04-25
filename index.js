const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://dsds.io');
  const buffer = await page.screenshot();
  const x = buffer.toJSON();
  const y = buffer.toJSON();
  console.log(JSON.stringify(x) === JSON.stringify(y) ? 'same' : 'different');
  console.log(typeof buffer);
  
  await browser.close();
})();