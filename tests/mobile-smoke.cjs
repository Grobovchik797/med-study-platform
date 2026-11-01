'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

async function waitHeading(page,title) {
  await page.waitForFunction(t=>document.querySelector('#main-content h1')?.textContent?.includes(t),title);
}
async function navigateHistology(page) {
  await page.locator('.side-nav [data-nav="subjects"]').tap();
  await waitHeading(page,'Мои предметы');
  assert.equal(await page.locator('.library-card').count(),11);
  const hist=page.locator('.library-card').filter({hasText:'Гистология, цитология'});
  await hist.locator('.library-go').tap();
  await waitHeading(page,'Гистология, цитология');
  assert.equal(await page.locator('.library-card').count(),11);
  const gi=page.locator('.library-card').filter({hasText:'Пищеварительная система'});
  await gi.locator('.library-go').tap();
  await waitHeading(page,'Пищеварительная система');
  assert.equal(await page.locator('.library-card').count(),20);
  const legacy=page.locator('.library-card').filter({hasText:'Тонкая кишка — исходный подробный пилот'});
  await legacy.locator('.library-go').tap();
  await waitHeading(page,'Тонкая кишка');
  assert.equal(await page.locator('.library-feature').count(),4);
  assert.ok((await page.locator('.library-feature').nth(1).textContent()).includes('30 вопросов'));
  assert.ok((await page.locator('.library-feature').nth(2).textContent()).includes('3 реальных микропрепарата'));
  await page.locator('.library-feature').nth(1).locator('button').tap();
  await waitHeading(page,'Проверка знаний');
  assert.equal(await page.locator('.si-choice-row .si-button').count() >= 3,true);
  await page.locator('.si-choice-row .si-button').first().tap();
  assert.equal(await page.locator('.si-answer').count(),4);
  await page.locator('.si-answer').first().tap();
  await page.getByRole('button',{name:'Проверить ответ'}).tap();
  assert.equal(await page.locator('.si-feedback').isVisible(),true);
  await page.getByRole('button',{name:'Выйти'}).tap();
  await page.getByRole('button',{name:'← Назад к теме'}).tap();
  await waitHeading(page,'Тонкая кишка');
  await page.locator('.library-feature').nth(2).locator('button').tap();
  await waitHeading(page,'Изучение и самопроверка');
  assert.equal(await page.locator('.si-microscope').count(),1);
  assert.equal(await page.locator('.si-pin').count(),2);
  assert.equal(await page.locator('.si-microscope img').count(),1);
  for(const value of ['0','1','2']){
    await page.locator('.si-select').selectOption(value);
    await page.waitForFunction(()=>document.querySelector('.si-microscope img')?.naturalWidth>420,{timeout:15000});
    assert.ok((await page.locator('.si-microscope img').getAttribute('src')).startsWith('./photos/'),
      'Microscope must use bundled local photo');
  }
  await page.locator('.si-select').selectOption('0');
  assert.equal(await page.locator('.si-choice-row').count()>0,true);
  await page.getByRole('button',{name:'Найди структуру'}).tap();
  assert.equal(await page.locator('.si-pin').count(),0);
  assert.ok((await page.locator('.si-find-hint').textContent()).includes('Найди:'));
  const microscope=page.locator('.si-microscope');
  const microscopeBox=await microscope.boundingBox();
  assert.ok(microscopeBox,'Need a visible microscope to test pointer search');
  await microscope.tap({position:{x:microscopeBox.width*.41,y:microscopeBox.height*.51}});
  assert.equal(await page.locator('.si-pin-revealed').count(),1,'First numbered target should appear after tap');
  assert.ok((await page.locator('.si-find-feedback').textContent()).includes('область №1'));
  await page.getByRole('button',{name:'Изучение'}).tap();
  await page.getByRole('button',{name:'Самопроверка'}).tap();
  assert.equal(await page.locator('.si-field').count(),3);
  await page.getByRole('button',{name:'Проверить препарат и подписи'}).tap();
  assert.ok((await page.locator('.si-feedback').textContent()).includes('Верный отдел'));
  await page.getByRole('button',{name:'← Вернуться к теме'}).tap();
  await waitHeading(page,'Тонкая кишка');
  await page.locator('.library-buttons button').first().tap();
  await waitHeading(page,'Тонкая кишка');
  assert.equal(await page.locator('.study-depth-button').count(),2);
  assert.equal(await page.locator('.hist-study-section').count(),10);
  assert.equal(await page.locator('.histology-diagram img').count(),1);
  assert.equal(await page.locator('.hist-gallery-card img').count(),0);
  assert.equal(await page.locator('.hist-gallery-card img').count(),0);
  assert.equal(await page.locator('.si-focus').count(),1);
  assert.ok(await page.locator('.gi-related-microphoto').count()>0);
  await page.getByRole('button',{name:'Начать'}).tap();
  await page.getByRole('button',{name:'Пауза'}).tap();
  await page.getByRole('button',{name:'Сбросить'}).tap();
  assert.equal(await page.locator('.si-focus-clock').textContent(),'30:00');
  await page.locator('.study-depth-button').nth(0).tap();
  assert.equal(await page.locator('.hist-study-section').count(),10);
  assert.equal(await page.locator('.histology-diagram img').count(),1);
  assert.ok(await page.locator('.hist-inline-aside').count()>1);
  assert.ok((await page.locator('.hist-takeaway strong').first().textContent()).includes('NB'));
  await page.locator('.study-depth-button').nth(1).tap();
  assert.equal(await page.locator('.hist-study-section').count(),15);
  assert.equal(await page.locator('.histology-diagram img').count(),1);
  assert.equal(await page.locator('.hist-gallery-card img').count(),0);
}

async function navigateDigestiveCourse(page) {
  await page.locator('.side-nav [data-nav="subjects"]').tap();
  await waitHeading(page,'Мои предметы');
  await page.locator('.library-card').filter({hasText:'Гистология, цитология'}).locator('.library-go').tap();
  await waitHeading(page,'Гистология, цитология');
  await page.locator('.library-card').filter({hasText:'Пищеварительная система'}).locator('.library-go').tap();
  await waitHeading(page,'Пищеварительная система');
  assert.equal(await page.locator('.library-card').count(),20);
  await page.locator('.library-card').filter({hasText:'Желудок: оболочки, ямки'}).locator('.library-go').tap();
  await waitHeading(page,'Желудок: оболочки');
  assert.equal(await page.locator('.gi-mini-card').count(),3);
  assert.equal(await page.locator('.gi-brief-block').count(),5);
  await page.locator('.gi-mini-card').first().locator('.gi-mini-choice').first().tap();
  assert.ok((await page.locator('.gi-mini-feedback').first().textContent()).length>30,'Inline question must reveal explanation regardless of randomized answer order');
  assert.equal(await page.locator('.gi-chapter-figure img').count(),1);
  await page.getByRole('button',{name:'Расширенный'}).tap();
  assert.equal(await page.locator('.gi-deep-block').count(),5);
  assert.equal(await page.locator('.gi-checkpoint').count(),5);
  assert.ok((await page.locator('.gi-content').textContent()).includes('Подробный разбор'));
  await page.locator('.gi-checkpoint').first().locator('.gi-mini-choice').first().tap();
  assert.ok((await page.locator('.gi-checkpoint .gi-mini-feedback').first().textContent()).length>25);
  await page.getByRole('button',{name:'Все заполненные карты'}).tap();
  await waitHeading(page,'Заполненные ориентировочные карты');
  assert.equal(await page.locator('.gi-method-card').count(),12); // 8 original maps + 4 departmental question lists
  await page.locator('.gi-method-card summary').first().tap();
  assert.equal(await page.locator('.gi-table').count(),8);
  assert.equal(await page.locator('.gi-original-table').count(),8);
  assert.equal(await page.locator('.gi-original-table').first().locator('th[rowspan="3"]').count(),1);
  assert.equal(await page.locator('.gi-original-table').nth(2).locator('th[rowspan="4"]').count(),1);
  assert.equal(await page.locator('.gi-original-table').nth(3).locator('tr').count(),5);
  await page.getByRole('button',{name:'← К пищеварительной системе'}).first().tap();
  await waitHeading(page,'Пищеварительная система');
  await page.locator('.library-card').filter({hasText:'Итоговый тест пищеварительной системы'}).locator('.library-go').tap();
  await waitHeading(page,'Контроль знаний');
  await page.getByRole('button',{name:'Лёгкий · 8'}).tap();
  assert.ok(await page.locator('.gi-mini-choice').count()===4);
  await page.locator('.gi-mini-choice').first().tap();
  assert.ok((await page.locator('.gi-mini-feedback').textContent()).length>35);
  await page.getByRole('button',{name:'Выйти из теста'}).tap();
}

async function main() {
  const browser=await chromium.launch({headless:true});
  const errors=[];
  try {
    const ctx=await browser.newContext({viewport:{width:390,height:780},isMobile:true,hasTouch:true});
    const page=await ctx.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:8765/',{waitUntil:'networkidle'});
    await waitHeading(page,'Med Study — библиотека знаний');
    const nav=await page.locator('.sidebar').boundingBox();
    assert.ok(nav && nav.y>=48 && nav.y+nav.height<190,'Top navigation obstruction');
    await page.locator('.hero-action').tap();
    await waitHeading(page,'Мои предметы');
    await navigateHistology(page);
    await navigateDigestiveCourse(page);
    // Regression 1.2: every GI atlas entry routes to the matching intestinal slide.
    for(const [chapterTitle,index] of [
      ['Двенадцатиперстная кишка','0'],
      ['Тощая кишка','1'],
      ['Подвздошная кишка и пейеровы бляшки','2']
    ]) {
      await page.locator('#mobile-more-toggle').tap();
      await page.locator('#mobile-more-panel [data-nav="atlases"]').tap();
      await waitHeading(page,'Библиотека атласов');
      await page.locator('.library-card').filter({hasText:chapterTitle}).locator('.library-go').tap();
      await waitHeading(page,'Изучение и самопроверка');
      assert.equal(await page.locator('.si-select').inputValue(),index,'Wrong GI microscopy slide: '+chapterTitle);
      assert.equal(await page.getByRole('heading',{name:'Интерактивный атлас рецепторов'}).count(),0);
      await page.getByRole('button',{name:'← Вернуться к теме'}).tap();
      await waitHeading(page,chapterTitle);
    }
    // Regression: existing references and newly sourced tooth slide must route correctly.
    for(const [chapterTitle,slideIndex] of [
      ['Слюнные железы','3'],
      ['Пищевод и пищеводно-желудочный переход','4'],
      ['Желудок: оболочки, ямки','5'],
      ['Толстая кишка, аппендикс','6'],
      ['Печень: долька','7'],
      ['Поджелудочная железа: ацинусы','8'],
      ['Зуб: эмаль, дентин','9'],
      ['Язык и сосочки','14'],
      ['Миндалины и лимфоэпителиальное','15']
    ]) {
      await page.locator('#mobile-more-toggle').tap();
      await page.locator('#mobile-more-panel [data-nav="atlases"]').tap();
      await waitHeading(page,'Библиотека атласов');
      await page.locator('.library-card').filter({hasText:chapterTitle}).locator('.library-go').tap();
      await waitHeading(page,'Изучение и самопроверка');
      assert.equal(await page.locator('.si-select').first().inputValue(),slideIndex,'Wrong real GI specimen for '+chapterTitle);
      await page.getByRole('button',{name:'Самопроверка'}).tap();
      assert.ok(await page.getByText('Какой орган или отдел показан на препарате?').isVisible());
      await page.getByRole('button',{name:'Найди структуру'}).tap();
      assert.match(await page.locator('.si-find-hint').textContent(),/Найди структуру №|Найди:/,'Find prompt must work for both spatially marked and guide-only slides');
      assert.ok((await page.locator('.si-find-mode .si-pin').count())===0,'Do not invent coordinates on new slides');
      await page.getByRole('button',{name:'← Вернуться к теме'}).tap();
      await waitHeading(page,chapterTitle);
    }
    // A separate genuine photo of the gastro-esophageal transition is available in the references.
    await page.locator('#mobile-more-toggle').tap();
    await page.locator('#mobile-more-panel [data-nav="atlases"]').tap();
    await page.locator('.library-card').filter({hasText:'Пищевод и пищеводно-желудочный переход'}).locator('.library-go').tap();
    await page.locator('.si-select').first().selectOption('10');
    assert.ok(await page.getByRole('heading',{name:'ПЕРЕХОД ПИЩЕВОДА В ЖЕЛУДОК'}).isVisible());
    await page.getByRole('button',{name:'← Вернуться к теме'}).tap();
    // Regression 1.4: topics without a verified image are not falsely shown as atlas entries.
    await page.locator('#mobile-more-toggle').tap();
    await page.locator('#mobile-more-panel [data-nav="atlases"]').tap();
    await waitHeading(page,'Библиотека атласов');
    assert.equal(await page.locator('.library-card').filter({hasText:'Вкусовые почки'}).count(),0);
    assert.ok(await page.locator('.library-card').count()>=11);
    // Regression 1.2: a chapter test must never redirect to the GI-wide final examination.
    await page.locator('.side-nav [data-nav="subjects"]').tap();
    await waitHeading(page,'Мои предметы');
    await page.locator('.library-card').filter({hasText:'Гистология, цитология'}).locator('.library-go').tap();
    await page.locator('.library-card').filter({hasText:'Пищеварительная система'}).locator('.library-go').tap();
    await page.locator('.library-card').filter({hasText:'Слизистая ротовой полости, губы, щёки и нёбо'}).locator('.library-go').tap();
    await waitHeading(page,'Слизистая ротовой полости');
    await page.getByRole('button',{name:'Тесты по этой теме'}).tap();
    await waitHeading(page,'Слизистая ротовой полости');
    const beginTopic=page.getByRole('button',{name:/Начать тематический тест/});
    const totalQuestions=Number((await beginTopic.textContent()).match(/\d+/)[0]);
    assert.ok(totalQuestions>=3 && totalQuestions<=8,'Topic quiz must show its real question count');
    await beginTopic.tap();
    for(let i=0;i<totalQuestions;i++){
      assert.ok((await page.locator('.gi-question-heading').textContent()).length>10);
      await page.locator('.gi-mini-choice').first().tap();
      await page.getByRole('button',{name:i+1===totalQuestions?'Завершить':'Следующий вопрос'}).tap();
    }
    await waitHeading(page,'Верно:');
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('med-study-gi-topic-v1')||'[]'));
    assert.equal(saved.at(-1).chapter,'oral','Topic result must be stored with chapter ID');
    await page.getByRole('button',{name:'К конспекту'}).tap();
    await waitHeading(page,'Слизистая ротовой полости');
    await page.locator('#mobile-more-toggle').tap();
    await page.locator('#mobile-more-panel [data-nav="stats"]').tap();
    await waitHeading(page,'Мой прогресс');
    const plan=page.locator('.topic-stats').filter({hasText:'Общий план пищеварительной трубки'});
    assert.ok(!(await plan.textContent()).includes('Результаты ВНС'));
    assert.ok((await page.locator('.topic-stats').filter({hasText:'Слизистая ротовой полости'}).textContent()).includes('Тематических тренировок'));
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
    assert.ok(overflow<=3,'Unexpected page overflow: '+overflow);

    await page.locator('.side-nav [data-nav="notes"]').tap();
    await waitHeading(page,'Библиотека конспектов');
    assert.equal(await page.locator('.library-card').count(),20);
    await page.locator('#mobile-more-toggle').tap();
    await page.locator('#mobile-more-panel [data-nav="cards"]').tap();
    await waitHeading(page,'Карточки по темам');
    assert.equal(await page.locator('.library-card').count(),1);
    await page.locator('.library-go').tap();
    await waitHeading(page,'Карточки по ВНС');
    await page.locator('#mobile-more-toggle').tap();
    await page.locator('#mobile-more-panel [data-nav="atlases"]').tap();
    await waitHeading(page,'Библиотека атласов');
    assert.ok(await page.locator('.library-card').count()>=2);
    await page.locator('.library-card').filter({hasText:'Вегетативная нервная система'}).locator('.library-go').tap();
    await waitHeading(page,'Интерактивный атлас рецепторов');
    await page.locator('#mobile-more-toggle').tap();
    await page.locator('#mobile-more-panel [data-nav="stats"]').tap();
    await waitHeading(page,'Мой прогресс');
    assert.ok(await page.locator('.topic-stats').count()>=2,'Statistics must support multiple course topics');
    assert.equal(errors.length,0,errors.join('\n'));

    const appctx=await browser.newContext({viewport:{width:360,height:760},isMobile:true,hasTouch:true});
    const app=await appctx.newPage();
    app.on('pageerror',e=>errors.push(e.message));
    await app.route('https://appassets.androidplatform.net/assets/www/**',async route=>{
      const url=new URL(route.request().url());
      const rel=decodeURIComponent(url.pathname.replace('/assets/www/',''));
      const file=path.resolve(process.cwd(),rel);
      if(!file.startsWith(process.cwd()+path.sep)){await route.fulfill({status:403,body:'Forbidden'});return;}
      try{
        const bytes=await fs.readFile(file);
        const extension=path.extname(rel);
        const mime=({'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'})[extension]||'application/octet-stream';
        await route.fulfill({status:200,contentType:mime,body:bytes});
      }catch{await route.fulfill({status:404,body:'Not found'});}
    });
    await app.goto('https://appassets.androidplatform.net/assets/www/index.html',{waitUntil:'networkidle'});
    await waitHeading(app,'Med Study — библиотека знаний');
    assert.equal(await app.locator('html').getAttribute('data-runtime'),'android-app');
    const bar=await app.locator('.sidebar').boundingBox();
    assert.ok(bar && bar.y<85 && bar.y+bar.height<190,'Android menu overlaps OS navbar');
    await navigateHistology(app);
    await app.locator('#mobile-more-toggle').tap();
    assert.equal(await app.locator('#mobile-more-panel [data-nav="install"]').isVisible(),false);
    await app.locator('#mobile-more-panel [data-nav="mistakes"]').tap();
    await waitHeading(app,'Работа над ошибками');
    assert.ok(await app.locator('.topic-stats').count()>=2,'Android statistics must support multiple topics');
    await app.locator('.side-nav [data-nav="notes"]').tap();
    await waitHeading(app,'Библиотека конспектов');
    assert.equal(await app.locator('.library-card').count(),20);
    assert.equal(errors.length,0,errors.join('\n'));
    await appctx.close();await ctx.close();

    // Regression 1.4.1: the desktop sidebar must remain visible at the end of a long GI chapter.
    const desktopCtx=await browser.newContext({viewport:{width:1280,height:800}});
    const desktop=await desktopCtx.newPage();
    desktop.on('pageerror',e=>errors.push(e.message));
    await desktop.goto('http://127.0.0.1:8765/',{waitUntil:'networkidle'});
    await waitHeading(desktop,'Med Study — библиотека знаний');
    await desktop.locator('.side-nav [data-nav="subjects"]').click();
    await desktop.locator('.library-card').filter({hasText:'Гистология, цитология'}).locator('.library-go').click();
    await desktop.locator('.library-card').filter({hasText:'Пищеварительная система'}).locator('.library-go').click();
    await desktop.locator('.library-card').filter({hasText:'Желудок: оболочки, ямки'}).locator('.library-go').click();
    await waitHeading(desktop,'Желудок: оболочки');
    await desktop.getByRole('button',{name:'Расширенный'}).click();
    assert.ok((await desktop.locator('.gi-deep-block').count())===5);
    await desktop.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
    await desktop.waitForFunction(()=>window.scrollY>700);
    const sideBox=await desktop.locator('.sidebar').boundingBox();
    assert.ok(sideBox && sideBox.y>=-2 && sideBox.y<=2 &&
      sideBox.height>=790 && sideBox.height<=802,'Desktop sidebar should remain visible and viewport-tall');
    const atlasNav=desktop.locator('.side-nav .nav-item[data-nav="atlases"]');
    assert.ok(await atlasNav.isVisible(),'Atlas navigation disappeared at chapter end');
    await atlasNav.click();
    await waitHeading(desktop,'Библиотека атласов');

    // v1.7: ordinary gallery has 19 distinct real Commons specimens, all 14 departmental types.
    await desktop.getByRole('button',{name:'Открыть обычные препараты'}).click();
    await waitHeading(desktop,'Изучение и самопроверка');
    assert.equal(await desktop.locator('.si-select option').count(),19);
    await desktop.locator('.si-select').first().selectOption('10');
    assert.equal(await desktop.locator('.si-pin').count(),3,'Gastro-esophageal junction should have 3 spatial markers on photo');
    await desktop.locator('.si-select').first().selectOption('9');
    assert.equal(await desktop.locator('.si-pin').count(),3,'Developing tooth enamel-organ should have 3 spatial markers');
    await desktop.locator('.si-select').first().selectOption('18');
    assert.equal(await desktop.locator('.si-microscope img').count(),1);
    assert.ok(await desktop.getByRole('heading',{name:'РАЗВИТИЕ ЗУБА, ОБРАЗОВАНИЕ ДЕНТИНА И ЭМАЛИ'}).isVisible());
    assert.equal(await desktop.locator('.si-legend li').count(),3,'Expected three numbered visible learning cues');
    assert.equal(await desktop.locator('.si-pin').count(),3,'Developing enamel and dentin need 3 real image labels');
    await desktop.getByRole('button',{name:'Найди структуру'}).click();
    assert.ok((await desktop.locator('.si-find-hint').textContent()).includes('Найди:'));
    const photoBounds=await desktop.locator('.si-microscope').boundingBox();
    assert.ok(photoBounds,'Microscope should remain visible');
    await desktop.locator('.si-microscope').click({position:{x:photoBounds.width*.52,y:photoBounds.height*.42}});
    assert.ok((await desktop.locator('.si-find-feedback').textContent()).includes('без автоматических баллов'));
    await desktop.getByRole('button',{name:'Изучение'}).click();
    await desktop.locator('.si-select').first().selectOption('3'); // guide-only submandibular gland
    await desktop.getByRole('button',{name:'Найди структуру'}).click();
    assert.ok((await desktop.locator('.si-find-hint').textContent()).includes('Найди структуру №1'));
    assert.equal(await desktop.locator('.si-pin').count(),0,'Do not invent spatial points on unreviewed source images');
    await desktop.getByRole('button',{name:'← Вернуться к теме'}).click();
    await waitHeading(desktop,'Библиотека атласов');
    // Regression 1.6: public departmental atlas has all real source JPGs and video frames.
    await desktop.getByRole('button',{name:'Открыть кафедральный атлас'}).click();
    await waitHeading(desktop,'Кафедральные микропрепараты');
    await desktop.waitForFunction(()=>document.querySelectorAll('.dept-file-card').length===14);
    assert.equal(await desktop.locator('.dept-file-card').count(),14);
    assert.equal(await desktop.locator('.dept-file-card strong').first().textContent(),'12 ПЕРСТНАЯ КИШКА');
    const natural=await desktop.locator('.dept-image').first().evaluate(img=>new Promise(resolve=>{
      if(img.complete)return resolve(img.naturalWidth);
      img.addEventListener('load',()=>resolve(img.naturalWidth),{once:true});
      img.addEventListener('error',()=>resolve(0),{once:true});
    }));
    assert.ok(natural>400,'Public real departmental JPEG must be present');
    const videoCard=desktop.locator('.dept-file-card').filter({hasText:'ЛИСТОВИДНЫЕ СОСОЧКИ'});
    await videoCard.click();
    assert.equal(await desktop.locator('.dept-public-figure').count(),2,'Video must supply two real fields of view');
    await desktop.getByRole('button',{name:'Самопроверка'}).click();
    assert.ok((await desktop.locator('.dept-panel h2').textContent()).includes('Определи препарат'));
    await desktop.locator('.dept-answer').selectOption('ЛИСТОВИДНЫЕ СОСОЧКИ');
    await desktop.getByRole('button',{name:'Проверить ответ'}).click();
    assert.ok((await desktop.locator('.dept-feedback').textContent()).includes('Верно:'));
    assert.equal(await desktop.locator('.dept-modes button').count(),2,'Department must have only study and self-check');
    assert.equal(await desktop.locator('.dept-modes').getByRole('button',{name:'Найди структуру'}).count(),0);
    await desktop.getByRole('button',{name:'Изучение'}).click();
    assert.equal(await desktop.locator('.dept-modes button').count(),2);
    assert.equal(errors.length,0,errors.join('\n'));
    await desktopCtx.close();
    console.log('PASS: multi-topic navigation, GI atlas, desktop sticky sidebar and Android menu');
  } finally {await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
