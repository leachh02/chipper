const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext(); // no session for first-time login
  await context.storageState({ path: 'auth.json' });

  const page = await context.newPage();
  await page.goto('https://www.youtube.com/playlist?list=WL');
  await page.waitForSelector('ytd-playlist-video-renderer');

  const videoIds = await page.$$eval('ytd-playlist-video-renderer a#thumbnail', anchors =>
    anchors.map(a => new URL(a.href).searchParams.get('v')).filter(Boolean)
  );

  fs.writeFileSync('watch_later.json', JSON.stringify(videoIds, null, 2));
  console.log(`✅ Found ${videoIds.length} videos`);
  await browser.close();
})();