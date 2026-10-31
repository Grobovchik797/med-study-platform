'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const BASE = 'http://127.0.0.1:8765/';

async function waitForHeading(page, value) {
  await page.waitForFunction(expected =>
    document.querySelector('#main-content h1')?.textContent?.includes(expected), value);
}

async function run() {
  const browser = await chromium.launch({ headless:true });
  const failures = [];
  try {
    const context = await browser.newContext({
      viewport:{ width:390,height:780 }, isMobile:true, hasTouch:true,
      deviceScaleFactor:2
    });
    const page = await context.newPage();
    page.on('pageerror', error => failures.push(error.message));
    await page.goto(BASE, { waitUntil:'networkidle' });
    await waitForHeading(page, 'Твоя учёба');
    assert.equal(await page.locator('#mobile-more-toggle').isVisible(),true);
    assert.equal(await page.locator('.side-nav [data-nav="atlas"]').isVisible(),false);
    // Critical regression: navigation must be at TOP, never within Android's
    // bottom 3-button system navigation area (typically last 50-90 px).
    const navRect = await page.locator('.sidebar').boundingBox();
    assert.ok(navRect, 'Navigation not visible');
    assert.ok(navRect.y >= 48 && navRect.y <= 75,
      'Mobile navigation is not below the top header: ' + JSON.stringify(navRect));
    assert.ok(navRect.y + navRect.height < 175,
      'Top navigation unexpectedly low: ' + JSON.stringify(navRect));
    assert.ok(navRect.y + navRect.height < 780 - 100,
      'Navigation overlaps simulated Android navigation bar');
    const hit = await page.locator('.side-nav [data-nav="home"]').evaluate(button => {
      const rect = button.getBoundingClientRect();
      const element = document.elementFromPoint(rect.left + rect.width / 2,rect.top + rect.height / 2);
      return element === button || button.contains(element);
    });
    assert.equal(hit,true,'Mobile navigation button is obscured');

    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 3,'Unexpected full-page horizontal overflow: ' + overflow);

    // Course catalog remains tappable and honest about missing materials.
    await page.locator('.side-nav [data-nav="subjects"]').tap();
    await waitForHeading(page, 'Мои предметы');
    assert.equal(await page.locator('.course-card').count(), 11);
    assert.equal(await page.locator('.note-mode').count(), 2);
    assert.equal(await page.locator('.course-card .course-actions').count(), 1);
    const philosophy = await page.locator('.course-card').filter({ hasText: 'Философия' }).textContent();
    assert.ok(philosophy.includes('планируется'));
    await page.locator('.side-nav [data-nav="home"]').tap();
    await waitForHeading(page, 'Твоя учёба');

    // Reproduces the broken hero tap reported by an Android user.
    await page.locator('.hero-action').tap();
    await waitForHeading(page, 'Вегетативная нервная система');
    await page.locator('#mobile-more-toggle').tap();
    assert.equal(await page.locator('#mobile-more-panel').isVisible(),true);
    const panelRect = await page.locator('#mobile-more-panel').boundingBox();
    assert.ok(panelRect && panelRect.y > navRect.y,
      'More menu should drop from top navigation');
    assert.ok(panelRect.y + panelRect.height < 780 - 50,
      'More menu must not overlap Android system navigation region');
    await page.locator('#mobile-more-panel [data-nav="flashcards"]').tap();
    await waitForHeading(page, 'Карточки по ВНС');
    assert.equal(await page.locator('#mobile-more-panel').isVisible(),false);

    await page.locator('#mobile-more-toggle').tap();
    await page.locator('#mobile-more-panel [data-nav="stats"]').tap();
    await waitForHeading(page, 'Мой прогресс');
    await page.locator('#mobile-more-toggle').tap();
    await page.locator('#mobile-more-panel [data-nav="atlas"]').tap();
    await waitForHeading(page, 'Интерактивный атлас рецепторов');
    await page.locator('.atlas-receptor').first().tap();
    assert.ok((await page.locator('.atlas-detail').textContent()).includes('α1'));

    // Simulate the special origin used by the Android native wrapper.
    // In that runtime installation actions must be hidden.
    const appContext = await browser.newContext({
      viewport:{width:360,height:760},isMobile:true,hasTouch:true
    });
    const appPage = await appContext.newPage();
    await appPage.route('https://appassets.androidplatform.net/assets/www/**', async route => {
      const url = new URL(route.request().url());
      const relative = decodeURIComponent(url.pathname.replace('/assets/www/',''));
      const target = path.resolve(process.cwd(),relative);
      if (!target.startsWith(process.cwd() + path.sep)) {
        await route.fulfill({status:403,body:'Forbidden'});return;
      }
      try {
        const bytes=await fs.readFile(target);
        const ext=path.extname(relative);
        const mime=({'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'})[ext]||'application/octet-stream';
        await route.fulfill({status:200,contentType:mime,body:bytes});
      } catch {
        await route.fulfill({status:404,body:'Not found'});
      }
    });
    await appPage.goto('https://appassets.androidplatform.net/assets/www/index.html',
      {waitUntil:'networkidle'});
    await waitForHeading(appPage, 'Твоя учёба');
    assert.equal(await appPage.locator('html').getAttribute('data-runtime'),'android-app');
    await appPage.locator('.side-nav [data-nav="subjects"]').tap();
    await waitForHeading(appPage, 'Мои предметы');
    assert.equal(await appPage.locator('.course-card').count(), 11);
    await appPage.locator('.side-nav [data-nav="home"]').tap();
    await waitForHeading(appPage, 'Твоя учёба');
    const appNavRect = await appPage.locator('.sidebar').boundingBox();
    assert.ok(appNavRect && appNavRect.y < 80 &&
      appNavRect.y + appNavRect.height < 190,
      'Android-origin navigation must be at the top: ' + JSON.stringify(appNavRect));
    await appPage.locator('#mobile-more-toggle').tap();
    assert.equal(await appPage.locator('#mobile-more-panel [data-nav="install"]').isVisible(),false);
    await appPage.locator('#mobile-more-panel [data-nav="mistakes"]').tap();
    await waitForHeading(appPage,'Работа над ошибками');
    await appPage.locator('#mobile-more-toggle').tap();
    await appPage.locator('#mobile-more-panel [data-nav="stats"]').tap();
    await waitForHeading(appPage,'Мой прогресс');
    await appPage.locator('.side-nav [data-nav="home"]').tap();
    await appPage.locator('.hero-action').tap();
    await waitForHeading(appPage,'Вегетативная нервная система');
    assert.deepEqual(failures,[],'Unexpected JavaScript errors');
    console.log('PASS: mobile buttons, More menu, Android-origin simulation and no overflow');
    await appContext.close();await context.close();
  } finally {
    await browser.close();
  }
}
run().catch(error => {console.error(error);process.exitCode=1;});
