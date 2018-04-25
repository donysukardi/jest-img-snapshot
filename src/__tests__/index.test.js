const puppeteer = require('puppeteer');

describe('index', () => {
  let browser;

  beforeAll(async () => {
    browser = await puppeteer.launch();
  });

  it('works', async () => {
    const page = await browser.newPage();
    await page.goto('https://www.google.com.sg/search?q=time&oq=time&aqs=chrome..69i57j69i61j69i59j69i61j0l2.2487j0j7&sourceid=chrome&ie=UTF-8');
    const img = await page.screenshot();
    expect(img).toMatchImageSnapshot();
    expect(img).toMatchImageSnapshot();
  }, 10000);

  afterAll(async () => {
    await browser.close();
  });
});