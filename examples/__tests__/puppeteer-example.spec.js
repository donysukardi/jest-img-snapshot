// eslint is looking for `puppeteer` at root level package.json
// eslint-disable-next-line import/no-unresolved
const puppeteer = require('puppeteer');

describe('jest-img-snapshot with puppeteer', () => {
  let browser;

  beforeAll(async () => {
    browser = await puppeteer.launch();
  });

  it('works', async () => {
    const page = await browser.newPage();
    await page.goto('https://example.com');
    const image = await page.screenshot();

    expect(image).toMatchImageSnapshot();
  });

  afterAll(async () => {
    await browser.close();
  });
});
