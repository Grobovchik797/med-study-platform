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
  assert.ok((await page.locator('.library-feature').nth(3).textContent()).includes('Учить карточки'));
  await page.locator('.library-feature').nth(3).locator('button').tap();
  await waitHeading(page,'Тонкая кишка · карточки');
  assert.ok((await page.locator('.gi-recall-card').count())===1);
  await page.getByRole('button',{name:'Показать ответ'}).tap();
  assert.ok((await page.locator('.gi-recall-card').textContent()).length>85);
  await page.getByRole('button',{name:'Знаю ✓'}).tap();
  assert.ok((await page.locator('.gi-recall-count').textContent()).includes('Знаю: 1'));
  await page.getByRole('button',{name:'Показать ответ'}).tap();
  await page.getByRole('button',{name:'Повторить ↺'}).tap();
  assert.ok((await page.locator('.gi-recall-count').textContent()).includes('Повторить: 1'));
  await page.getByRole('button',{name:/Повторить трудные/}).tap();
  assert.ok((await page.locator('.gi-provenance').textContent()).includes('Повторение трудных'));
  assert.equal(await page.locator('.gi-recall-meter').getAttribute('aria-valuenow'),'2');
  await page.getByRole('button',{name:'Показать все карточки'}).tap();
  await page.getByRole('button',{name:'← К теме'}).tap();
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
  assert.equal(await page.locator('.gi-topic-features .library-feature').count(),4);
  assert.ok((await page.locator('.gi-milestones h2').textContent()).includes('0 из 4'),
    'Opening a chapter must not count as studying');
  await page.locator('.gi-reading-select').selectOption('115');
  assert.equal(await page.locator('html').getAttribute('data-reading-size'),'115');
  await page.getByRole('button',{name:'Спокойный фон: выключен'}).tap();
  assert.ok(await page.locator('html').evaluate(node=>node.classList.contains('reading-calm')));
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('med-study-reading-prefs-v1')).size),115);
  assert.equal(await page.locator('.si-focus').count(),1,'Each GI chapter needs a focus timer');
  assert.ok((await page.locator('.si-focus').textContent()).includes('Желудок'));
  await page.getByRole('button',{name:'Начать',exact:true}).tap();
  await page.getByRole('button',{name:'Пауза',exact:true}).tap();
  await page.getByRole('button',{name:'Сбросить',exact:true}).tap();
  assert.equal(await page.locator('.si-focus-clock').textContent(),'30:00');
  await page.getByRole('button',{name:'Начать',exact:true}).tap();
  await page.locator('.gi-topic-features .library-feature').nth(3).locator('button').tap();
  await waitHeading(page,'Желудок: оболочки, ямки');
  assert.equal(await page.locator('.gi-recall-card').count(),1);
  await page.getByRole('button',{name:'Показать ответ'}).tap();
  for(let card=0;card<8;card++){
    const label=card%3===0?'Повторить ↺':'Знаю ✓';
    await page.getByRole('button',{name:label}).tap();
    if(card<7)await page.getByRole('button',{name:'Показать ответ'}).tap();
  }
  assert.equal(await page.locator('.gi-recall-complete').count(),1,'Completed recall deck should have an end screen');
  assert.ok((await page.locator('.gi-recall-complete').textContent()).includes('самооценка'));
  await page.getByRole('button',{name:/Повторить трудные/}).tap();
  assert.equal(await page.locator('.gi-recall-card').count(),1);
  await page.getByRole('button',{name:'← К теме'}).tap();
  await waitHeading(page,'Желудок: оболочки');
  await page.locator('.gi-topic-features .library-feature').nth(3).locator('button').tap();
  await waitHeading(page,'Желудок: оболочки, ямки');
  assert.equal(await page.locator('.gi-recall-card').count(),1);
  await page.getByRole('button',{name:'Следующая'}).tap();
  await page.getByRole('button',{name:'Показать ответ'}).tap();
  assert.ok((await page.locator('.gi-recall-card').textContent()).length>90);
  assert.equal(await page.locator('#mobile-more-toggle').getAttribute('aria-current'),'page',
    'Flashcards must highlight the Cards navigation section');
  await page.getByRole('button',{name:'← К теме'}).tap();
  await waitHeading(page,'Желудок: оболочки');
  const accents=await page.locator('.gi-topic-features .library-feature').evaluateAll(nodes=>
    nodes.map(node=>getComputedStyle(node).borderTopColor));
  assert.equal(new Set(accents).size,4,'Four study resources should have distinct colour accents');
  assert.equal(await page.getByRole('button',{name:'Пауза',exact:true}).count(),1,'Timer must continue across topic cards');
  await page.getByRole('button',{name:'Пауза',exact:true}).tap();
  await page.getByRole('button',{name:'Сбросить',exact:true}).tap();
  assert.ok((await page.locator('.gi-milestones h2').textContent()).includes('1 из 4'),
    'All rated cards must mark the card stage, not mere browsing');
  await page.getByRole('button',{name:'Я разобрал этот конспект'}).tap();
  assert.ok((await page.locator('.gi-milestones h2').textContent()).includes('2 из 4'));
  assert.equal(await page.locator('.gi-mini-card').count(),3);
  assert.equal(await page.locator('.gi-brief-block').count(),5);
  await page.locator('.gi-mini-card').first().locator('.gi-mini-choice').first().tap();
  assert.ok((await page.locator('.gi-mini-feedback').first().textContent()).length>30,'Inline question must reveal explanation regardless of randomized answer order');
  assert.equal(await page.locator('.gi-chapter-figure img').count(),1);
  await page.getByRole('button',{name:'Расширенный'}).tap();
  assert.equal(await page.locator('.gi-reading-select').inputValue(),'115');
  assert.equal(await page.getByRole('button',{name:'Спокойный фон: включён'}).count(),1);
  await page.locator('.gi-reading-select').selectOption('100');
  await page.getByRole('button',{name:'Спокойный фон: включён'}).tap();
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
    const indexSource=await fs.readFile(path.join(__dirname,'..','index.html'),'utf8');
    const declaredVersion=indexSource.match(/Med Study · (\d+\.\d+\.\d+)/)?.[1];
    assert.ok(declaredVersion && (await page.locator('.top-pill').textContent()).includes(declaredVersion),
      'Top navigation must match the version declared in index.html');
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
    assert.ok(totalQuestions>=8 && totalQuestions<=11,'Each topic must include 3 mini + 5 deep-checkpoint questions, plus optional final-bank items');
    await beginTopic.tap();
    for(let i=0;i<totalQuestions;i++){
      assert.ok((await page.locator('.gi-question-heading').textContent()).length>10);
      await page.locator('.gi-mini-choice').first().tap();
      await page.getByRole('button',{name:i+1===totalQuestions?'Завершить':'Следующий вопрос'}).tap();
    }
    await waitHeading(page,'Верно:');
    assert.equal(await page.evaluate(()=>window.MedStudyLearning.readMilestones('oral').tests),true,
      'Completed topic tests must be shown in topic learning progress');
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('med-study-gi-topic-v1')||'[]'));
    assert.equal(saved.at(-1).chapter,'oral','Topic result must be stored with chapter ID');
    await page.getByRole('button',{name:'К конспекту'}).tap();
    await waitHeading(page,'Слизистая ротовой полости');
    assert.ok((await page.locator('.gi-milestones h2').textContent()).includes('1 из 3'),
      'A chapter with no microscopy has 3 eligible study stages');
    // Fixture: put one known valid question ID into existing GI mistake storage.
    await page.evaluate(()=>{
      const key='med-study-gi-mistakes-v1',raw=JSON.parse(localStorage.getItem(key)||'{}');
      raw.oral=['gi-mini-oral-0'];localStorage.setItem(key,JSON.stringify(raw));
    });
    await page.getByRole('button',{name:'Тесты по этой теме'}).tap();
    await page.getByRole('button',{name:'Повторить ошибки · 1'}).tap();
    assert.ok((await page.locator('.gi-question-heading').textContent()).length>15);
    assert.ok((await page.locator('.kicker').first().textContent()).includes('Повторение ошибок'));
    await page.locator('.gi-mini-choice').first().tap();
    await page.getByRole('button',{name:'Завершить'}).tap();
    await waitHeading(page,'Верно:');
    await page.getByRole('button',{name:'К конспекту'}).tap();
    await waitHeading(page,'Слизистая ротовой полости');
    // The Errors library launches exactly the missed GI question, not the general test chooser.
    await page.evaluate(()=>{
      const key='med-study-gi-mistakes-v1',raw=JSON.parse(localStorage.getItem(key)||'{}');
      raw.oral=['gi-mini-oral-0'];localStorage.setItem(key,JSON.stringify(raw));
    });
    await page.locator('#mobile-more-toggle').tap();
    await page.locator('#mobile-more-panel [data-nav="mistakes"]').tap();
    await waitHeading(page,'Работа над ошибками');
    await page.locator('.topic-stats').filter({hasText:'Слизистая ротовой полости'}).
      getByRole('button',{name:'Повторить ошибки в тесте'}).tap();
    assert.equal(await page.locator('.gi-question-heading').count(),1);
    assert.ok((await page.locator('.kicker').first().textContent()).includes('Повторение ошибок'));
    await page.getByRole('button',{name:'Выйти из теста'}).tap();
    await page.getByRole('button',{name:'← К конспекту'}).tap();
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
    assert.equal(await page.locator('.library-card').count(),46);
    await page.locator('#mobile-more-toggle').tap();
    await page.locator('#mobile-more-panel [data-nav="cards"]').tap();
    await waitHeading(page,'Карточки по темам');
    assert.equal(await page.locator('.library-card').count(),45,'Existing GI/VNS cards plus 26 cranial nerve topics should be available');
    await page.locator('.library-card').filter({hasText:'Желудок: оболочки'}).locator('.library-go').tap();
    await waitHeading(page,'Желудок: оболочки, ямки');
    assert.equal(await page.locator('.gi-recall-card').count(),1);
    await page.getByRole('button',{name:'← К теме'}).tap();
    await page.locator('#mobile-more-toggle').tap();
    await page.locator('#mobile-more-panel [data-nav="cards"]').tap();
    await page.locator('.library-card').filter({hasText:'Вегетативная нервная система'}).locator('.library-go').tap();
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
    assert.equal(await app.locator('.library-card').count(),46);
    await app.getByRole('button',{name:'Найти термин или препарат'}).tap();
    await waitHeading(app,'Найти термин или препарат');
    await app.locator('.study-search-input').fill('дуоденум');
    assert.ok(await app.locator('.study-search-result').count()>=1,'Android asset origin must load real GI search data');
    await app.getByRole('button',{name:'← К библиотеке'}).tap();
    await waitHeading(app,'Библиотека конспектов');
    // 1.9.11: The complete source-based anatomy module must load on the Android asset origin.
    const oldGI=await app.evaluate(()=>localStorage.getItem('med-study-progress-v1'));
    const oldMilestones=await app.evaluate(()=>localStorage.getItem('med-study-topic-milestones-v1'));
    await app.locator('.library-card').filter({hasText:'I. Обонятельный нерв'}).locator('.library-go').tap();
    await waitHeading(app,'Обонятельный нерв');
    assert.equal(await app.locator('.cn-tabs button').count(),3,'One full note, cards and quiz');
    assert.equal(await app.getByRole('button',{name:'Краткий',exact:true}).count(),0);
    assert.equal(await app.getByRole('button',{name:'Расширенный',exact:true}).count(),0);
    assert.ok((await app.locator('.cn-latin-title').textContent()).includes('Nervus olfactorius'));
    assert.ok((await app.locator('.cn-terminology summary').textContent()).includes('18 терминов'));
    assert.equal(await app.locator('.cn-term-row').count(),18);
    await app.locator('.cn-terminology summary').tap();
    assert.ok((await app.locator('.cn-term-grid').textContent()).includes('Lamina cribrosa'));
    assert.ok(await app.locator('.cn-detail').count()>=3);
    assert.ok((await app.locator('.cn-detail').allTextContents()).join(' ').includes('полоски'));
    await app.getByRole('button',{name:'✓ Я изучил(а) этот конспект'}).tap();
    assert.ok((await app.locator('.cn-status').textContent()).includes('Конспект изучен'));
    await app.getByRole('button',{name:'Карточки',exact:true}).tap();
    await app.getByRole('button',{name:'Показать ответ'}).tap();
    assert.equal(await app.locator('.cn-card .cn-anatomy-text').count(),1);
    await app.getByRole('button',{name:'Тест',exact:true}).tap();
    assert.equal(await app.locator('.cn-option').count(),4);
    assert.equal(await app.evaluate(()=>localStorage.getItem('med-study-progress-v1')),oldGI);
    assert.equal(await app.evaluate(()=>localStorage.getItem('med-study-topic-milestones-v1')),oldMilestones);
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

    // v1.9.6: ordinary gallery has 23 real Commons images (including 2 true TEM), and 15 faculty specimens.
    await desktop.getByRole('button',{name:'Открыть обычные препараты'}).click();
    await waitHeading(desktop,'Изучение и самопроверка');
    assert.equal(await desktop.locator('.si-select option').count(),23);
    assert.equal(await desktop.locator('.si-select option').nth(10).textContent(),'Переход пищевода в желудок',
      'Reference gallery should show the normalized title without an uppercase duplicate');
    await desktop.locator('.si-select').first().selectOption('10');
    assert.equal(await desktop.locator('.si-pin').count(),3,'Gastro-esophageal junction should have 3 spatial markers on photo');
    await desktop.getByRole('button',{name:'＋ Увеличить'}).click();
    assert.ok((await desktop.locator('.si-surface').getAttribute('style')).includes('scale(1.5)'),
      'Zoom should be active before switching study modes');
    await desktop.getByRole('button',{name:'Самопроверка'}).click();
    assert.ok((await desktop.locator('.si-surface').getAttribute('style')).includes('scale(1.5)'),
      'Switching modes must preserve the area being studied');
    await desktop.getByRole('button',{name:'Изучение'}).click();
    await desktop.locator('.si-select').first().selectOption('9');
    assert.ok((await desktop.locator('.si-surface').getAttribute('style')).includes('scale(1)'),
      'Selecting another specimen must reset microscope zoom');
    assert.equal(await desktop.locator('.si-pin').count(),3,'Developing tooth enamel-organ should have 3 spatial markers');
    await desktop.locator('.si-select').first().selectOption('18');
    assert.equal(await desktop.locator('.si-microscope img').count(),1);
    assert.ok(await desktop.getByRole('heading',{name:'Развитие зуба, образование дентина и эмали'}).isVisible());
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
    // 1.9.6: two extra licensed photos are only in the ordinary atlas.
    await desktop.getByRole('button',{name:'Изучение'}).click();
    await desktop.locator('.si-select').first().selectOption('19');
    assert.ok((await desktop.locator('.si-microscope img').getAttribute('src')).endsWith('liver-central-vein.jpg'));
    assert.ok(await desktop.getByRole('heading',{name:'Печень человека — центральная вена'}).isVisible());
    assert.equal(await desktop.locator('.si-pin').count(),0,'No invented labels on human central vein photo');
    await desktop.waitForFunction(()=>document.querySelector('.si-microscope img')?.complete&&document.querySelector('.si-microscope img')?.naturalWidth>=420,{timeout:15000});
    await desktop.locator('.si-select').first().selectOption('20');
    assert.ok((await desktop.locator('.si-microscope img').getAttribute('src')).endsWith('liver-portal-triad.jpg'));
    assert.ok(await desktop.getByRole('heading',{name:'Печень человека — портальная триада'}).isVisible());
    assert.equal(await desktop.locator('.si-pin').count(),0,'Existing source labels are not automatically graded as new pixel annotations');
    await desktop.waitForFunction(()=>document.querySelector('.si-microscope img')?.complete&&document.querySelector('.si-microscope img')?.naturalWidth>=420,{timeout:15000});
    // Two openly licensed real TEM images, not the drawings in the Binar PDF.
    await desktop.locator('.si-select').first().selectOption('21');
    assert.ok((await desktop.locator('.si-microscope img').getAttribute('src')).endsWith('gastric-parietal-tem.jpg'));
    assert.ok((await desktop.locator('.si-legend').textContent()).includes('Париетальная'));
    await desktop.waitForFunction(()=>document.querySelector('.si-microscope img')?.naturalWidth>=420);
    await desktop.locator('.si-select').first().selectOption('22');
    assert.ok((await desktop.locator('.si-microscope img').getAttribute('src')).endsWith('gastric-chief-tem.jpg'));
    await desktop.waitForFunction(()=>document.querySelector('.si-microscope img')?.naturalWidth>=420);
    await desktop.getByRole('button',{name:'← Вернуться к теме'}).click();
    await waitHeading(desktop,'Библиотека атласов');
    // 1.9.7: external EduBiotech is a separate, provenance-labeled atlas,
    // with 17 chapters and no unlicensed third-party images embedded.
    const eduProgress=await desktop.evaluate(()=>localStorage.getItem('med-study-topic-milestones-v1'));
    await desktop.getByRole('button',{name:'Препараты EduBiotech →'}).click();
    await waitHeading(desktop,'Препараты и обозначения EduBiotech');
    assert.equal(await desktop.locator('.edu-original-tile').count(),36,'21 real source specimen + 15 original alternate images');
    assert.equal(await desktop.locator('.edu-original-pin').count(),5,'True author pins from original Java atlas');
    assert.equal(await desktop.locator('.edu-original-structure-list li').count(),5);
    assert.ok((await desktop.locator('.edu-original-credit').textContent()).includes('edubiotech.ru'));
    assert.ok((await desktop.locator('.edu-original-credit').textContent()).includes('Кузнецов'));
    await desktop.waitForFunction(()=>document.querySelector('.edu-original-figure img')?.complete &&
      document.querySelector('.edu-original-figure img')?.naturalWidth===768);
    const pins=await desktop.locator('.edu-original-pin').evaluateAll(nodes=>nodes.map(n=>({left:parseFloat(n.style.left),top:parseFloat(n.style.top)})));
    assert.ok(pins.every(pin=>pin.left>0&&pin.left<100&&pin.top>0&&pin.top<100));
    await desktop.getByRole('button',{name:'Самопроверка'}).click();
    assert.equal(await desktop.locator('.edu-original-pin').count(),0,'Do not reveal labels before answer');
    assert.ok((await desktop.locator('.edu-original-structure-list').textContent()).includes('Структура скрыта'));
    await desktop.getByRole('button',{name:'Показать оригинальные обозначения'}).click();
    assert.equal(await desktop.locator('.edu-original-pin').count(),5);
    await desktop.locator('.edu-original-chapter-filter').selectOption('liver');
    assert.equal(await desktop.locator('.edu-original-tile').count(),4);
    await desktop.locator('.edu-original-tile').filter({hasText:'печень человека'}).first().click();
    assert.ok((await desktop.locator('.edu-original-structure-list').textContent()).includes('триада'));
    assert.ok((await desktop.locator('.edu-original-figure img').getAttribute('src')).endsWith('t25-03.jpg'));
    await desktop.getByRole('button',{name:'Найди структуру'}).click();
    assert.ok((await desktop.locator('.edu-original-target').textContent()).includes('Найди на снимке'));
    await desktop.locator('.edu-original-chapter-filter').selectOption('all');
    assert.equal(await desktop.evaluate(()=>localStorage.getItem('med-study-topic-milestones-v1')),eduProgress);
    await desktop.getByRole('button',{name:'Электронограммы EduBiotech · 3'}).click();
    assert.equal(await desktop.locator('.edu-original-tem-card').count(),3);
    assert.equal(await desktop.locator('.edu-original-tem-card img').count(),3);
    assert.ok((await desktop.locator('[data-edu-tem="pancreas-acinar-tem"]').textContent()).includes('Центроацинарные клетки'));
    assert.ok((await desktop.locator('[data-edu-tem="bile-canaliculus-tem"]').textContent()).includes('Гранулы гликогена'));
    await desktop.waitForFunction(()=>document.querySelector('[data-edu-tem="pancreas-acinar-tem"] img')?.naturalWidth===403);
    assert.equal(await desktop.evaluate(()=>localStorage.getItem('med-study-topic-milestones-v1')),eduProgress);
    await desktop.getByRole('button',{name:'Микропрепараты · 36'}).click();
    assert.equal(await desktop.locator('.edu-original-tile').count(),36);
    await desktop.getByRole('button',{name:'К обзору и электронограммам'}).click();
    await waitHeading(desktop,'Атлас EduBiotech — пищеварительная система');
    assert.equal(await desktop.locator('.edu-topic-card').count(),3);
    assert.equal(await desktop.locator('.edu-chapter-item').count(),17);
    assert.equal(await desktop.locator('.edu-topic-card img').count(),0,'Do not mirror proprietary images from source');
    const links=await desktop.locator('.edu-topic-card .edu-external-link').evaluateAll(nodes=>nodes.map(n=>({href:n.href,target:n.target,rel:n.rel})));
    assert.equal(links.length,6);
    assert.ok(links.every(x=>x.href.startsWith('https://edubiotech.ru/')&&x.target==='_blank'&&x.rel.includes('noopener')));
    await desktop.locator('.edu-chapter-filter').selectOption('liver');
    assert.equal(await desktop.locator('.edu-topic-card').count(),1);
    assert.equal(await desktop.locator('.edu-chapter-item').count(),1);
    assert.ok((await desktop.locator('.edu-topic-card').textContent()).includes('Печень'));
    await desktop.locator('.edu-chapter-filter').selectOption('all');
    await desktop.getByRole('button',{name:'Электронограммы и ультраструктура'}).click();
    assert.equal(await desktop.locator('.edu-electron-card').count(),2,'Two existing licensed TEM images only');
    assert.equal(await desktop.locator('.edu-ultra-card').count(),5,'Five authored ultrastructure study prompts');
    assert.equal(await desktop.evaluate(()=>localStorage.getItem('med-study-topic-milestones-v1')),eduProgress,
      'Browsing the source links must not alter learning progress');
    await desktop.locator('[data-electron-id="parietal"] button').click();
    await waitHeading(desktop,'Изучение и самопроверка');
    assert.ok((await desktop.locator('.si-microscope img').getAttribute('src')).endsWith('gastric-parietal-tem.jpg'));
    await desktop.getByRole('button',{name:'← Вернуться к теме'}).click();
    await waitHeading(desktop,'Библиотека атласов');
    // Regression 1.6: public departmental atlas has all real source JPGs and video frames.
    await desktop.getByRole('button',{name:'Открыть кафедральный атлас'}).click();
    await waitHeading(desktop,'Кафедральные микропрепараты');
    await desktop.waitForFunction(()=>document.querySelectorAll('.dept-file-card').length===15);
    assert.equal(await desktop.locator('.dept-file-card').count(),15);
    assert.equal(await desktop.locator('.dept-file-card strong').first().textContent(),'Двенадцатиперстная кишка');
    const natural=await desktop.locator('.dept-image').first().evaluate(img=>new Promise(resolve=>{
      if(img.complete)return resolve(img.naturalWidth);
      img.addEventListener('load',()=>resolve(img.naturalWidth),{once:true});
      img.addEventListener('error',()=>resolve(0),{once:true});
    }));
    assert.ok(natural>400,'Public real departmental JPEG must be present');
    const videoCard=desktop.locator('.dept-file-card').filter({hasText:'Листовидные сосочки'});
    await videoCard.click();
    assert.equal(await desktop.locator('.dept-public-figure').count(),2,'Video must supply two real fields of view');
    assert.equal(await desktop.locator('.dept-panel h2').textContent(),'Листовидные сосочки');
    assert.equal(await desktop.locator('.dept-modes button').count(),0,'Department no longer has duplicate study/self-check controls');
    assert.equal(await desktop.locator('.dept-panel .dept-answer').count(),0,'No departmental answer form outside random drill');
    assert.ok(await desktop.locator('.dept-cues').isVisible(),'Study mode must keep the useful diagnostic cues');
    assert.ok((await desktop.locator('.dept-public-figure .dept-image').first().getAttribute('alt')).includes('Листовидные сосочки'),
      'Study mode must reveal the correct source title');
    assert.equal(await desktop.getByRole('button',{name:'Тренировка: случайные препараты'}).count(),1,
      'Randomized recognition remains the only department quiz action');

    // The newly approved original pancreas field must load from the supplied PDF.
    await desktop.locator('.dept-file-card').filter({hasText:'Поджелудочная железа'}).click();
    assert.equal(await desktop.locator('.dept-panel h2').textContent(),'Поджелудочная железа');
    assert.ok((await desktop.locator('.dept-image').first().getAttribute('src')).includes('ПОДЖЕЛУДОЧНАЯ ЖЕЛЕЗА'));
    await desktop.waitForFunction(()=>document.querySelector('.dept-panel .dept-image')?.naturalWidth===468);
    assert.ok((await desktop.locator('.dept-cues').textContent()).includes('не подтверждены'));
    // Colloquium drill: all 15 real specimens exactly once; identity shown only after a checked answer.
    await desktop.getByRole('button',{name:'Тренировка: случайные препараты'}).click();
    assert.equal(await desktop.locator('.dept-file-card').count(),0,'Answer-bearing cards must be hidden during randomized drill');
    assert.equal(await desktop.locator('.dept-drill .dept-image').first().getAttribute('alt'),'Микропрепарат: название скрыто');
    const drillItems=await desktop.evaluate(async()=>(
      (await (await fetch('./data/department-public.json')).json()).specimens
        .map(x=>({title:x.title,src:'./'+x.frames[0].src}))
    ));
    assert.equal(drillItems.length,15);
    const seenDrillPhotos=new Set();
    for(let i=0;i<drillItems.length;i++){
      assert.ok((await desktop.locator('.dept-drill-progress').textContent()).includes('Препарат '+(i+1)+' из 15'));
      const src=await desktop.locator('.dept-drill .dept-image').first().getAttribute('src');
      assert.ok(!seenDrillPhotos.has(src),'Random drill repeated a specimen before exhaustion: '+src);
      seenDrillPhotos.add(src);
      const current=drillItems.find(x=>x.src===src);
      assert.ok(current,'Drill served a frame outside the 15 authentic records');
      assert.equal(await desktop.locator('.dept-drill-review').count(),0,'Cues must stay hidden until the answer');
      const guess=i===0?drillItems.find(x=>x.title!==current.title).title:current.title;
      await desktop.locator('.dept-drill .dept-answer').selectOption(guess);
      await desktop.getByRole('button',{name:'Проверить препарат'}).click();
      assert.ok((await desktop.locator('.dept-feedback').textContent()).includes(i===0?'Неверно.':'Верно.'));
      assert.ok(await desktop.locator('.dept-drill-review').isVisible(),'Review should appear after answer');
      assert.ok(await desktop.locator('.dept-drill .dept-answer').isDisabled(),'Cannot revise a checked attempt');
      await desktop.getByRole('button',{name:i===drillItems.length-1?'Посмотреть результат':'Следующий препарат'}).click();
    }
    assert.equal(seenDrillPhotos.size,15,'Every departmental specimen should appear in one complete drill');
    assert.ok((await desktop.locator('.dept-drill-summary h2').textContent()).includes('Распознано 14 из 15'));
    await desktop.getByRole('button',{name:'Пройти ещё раз'}).click();
    assert.ok((await desktop.locator('.dept-drill-progress').textContent()).includes('Препарат 1 из 15'));
    await desktop.getByRole('button',{name:'Вернуться к атласу'}).click();
    assert.equal(await desktop.locator('.dept-file-card').count(),15,'All original atlas records must be available after drill');
    await desktop.locator('.brand').click();
    await waitHeading(desktop,'Med Study — библиотека знаний');
    assert.equal(await desktop.locator('.side-nav [data-nav="home"]').getAttribute('aria-current'),
      'page','Clicking the logo should really navigate to the home view');

    // 1.9.5: all 17 colloquium chapters, six comparisons and honest faculty gaps.
    const progressBefore=await desktop.evaluate(()=>localStorage.getItem('med-study-topic-milestones-v1'));
    await desktop.getByRole('button',{name:'Маршрут к коллоквиуму · 17 глав'}).click();
    await waitHeading(desktop,'Маршрут: 17 глав и узнавание препаратов');
    assert.equal(await desktop.locator('.gi-colloquium-chapter').count(),17);
    assert.equal(await desktop.locator('.gi-compare-pair').count(),6);
    assert.ok((await desktop.locator('.gi-colloquium-pending').textContent()).includes('печени'));
    assert.ok(!(await desktop.locator('.gi-colloquium-pending').textContent()).includes('ещё не получены'));
    assert.equal(await desktop.evaluate(()=>localStorage.getItem('med-study-topic-milestones-v1')),progressBefore,
      'Opening the route must never mark a chapter completed');
    await desktop.locator('[data-compare-id="duodenum-jejunum"] summary').click();
    assert.ok((await desktop.locator('[data-compare-id="duodenum-jejunum"]').textContent()).includes('Бруннера'));
    const toothRoute=desktop.locator('.gi-colloquium-chapter[data-chapter-id="teeth"]');
    await toothRoute.locator('details summary').click();
    assert.equal(await toothRoute.locator('.gi-colloquium-topic-list li').count(),5);
    assert.ok((await toothRoute.textContent()).includes('Что не является доказательством'));
    await toothRoute.getByRole('button',{name:'Конспект'}).click();
    await waitHeading(desktop,'Зуб: эмаль, дентин, цемент и пульпа');
    assert.ok(await desktop.locator('.gi-chapter-colloquium').isVisible());
    await desktop.getByRole('button',{name:'Расширенный',exact:true}).click();
    assert.equal(await desktop.locator('.gi-claim-evidence').count(),2,
      'The two independently crosschecked tooth claims need inline source disclosures');
    await desktop.locator('.gi-claim-evidence summary').first().click();
    assert.equal(await desktop.locator('.gi-claim-evidence').first().locator('a[href^="https://"]').count(),2);
    assert.ok((await desktop.locator('.gi-claim-evidence').first().textContent()).includes('Сопоставлено с лекционным конспектом'));
    await desktop.getByRole('button',{name:'Открыть весь маршрут коллоквиума'}).click();
    await waitHeading(desktop,'Маршрут: 17 глав');
    assert.equal(await desktop.evaluate(()=>localStorage.getItem('med-study-topic-milestones-v1')),progressBefore,
      'Citation and navigation must never alter saved learning progress');
    await desktop.getByRole('button',{name:'← К пищеварительной системе'}).click();
    await waitHeading(desktop,'Пищеварительная система');
    await desktop.locator('.brand').click();
    // 1.9.3: local search must find authored academic text (including the duodenum alias).
    await desktop.getByRole('button',{name:'Поиск по учебнику и атласам'}).click();
    await waitHeading(desktop,'Найти термин или препарат');
    await desktop.locator('.study-search-input').fill('дуоденум');
    assert.ok(await desktop.locator('.study-search-result').count()>=1);
    await desktop.locator('.study-search-result[data-search-kind="chapter"]').first().getByRole('button',{name:'Открыть главу'}).click();
    await waitHeading(desktop,'Двенадцатиперстная кишка');
    await desktop.locator('.brand').click();
    await desktop.getByRole('button',{name:'Что нового · журнал изменений'}).click();
    await waitHeading(desktop,'Что нового в Med Study');
    assert.equal(await desktop.locator('.study-journal-item').count(),16,'Twelve feature releases plus four scientific additions');
    await desktop.getByRole('button',{name:'Научные дополнения'}).click();
    assert.equal(await desktop.locator('.study-journal-item').count(),4);
    assert.equal(await desktop.locator('.study-journal-item[data-chapter-id]').count(),4);
    assert.equal(await desktop.locator('.study-journal-references a').count(),9);
    assert.ok((await desktop.locator('[data-journal-id="sci-2026-11-03-teeth"]').textContent()).includes('с. 4–5'));
    await desktop.getByRole('button',{name:'Функции и интерфейс'}).click();
    assert.equal(await desktop.locator('.study-journal-item').count(),12);
    await desktop.getByRole('button',{name:'← На главную'}).click();

    const courseAfterAudit=await desktop.evaluate(async()=>
      (await (await fetch('./data/gi-curriculum.json')).json()).chapters);
    const chapters=Object.fromEntries(courseAfterAudit.map(ch=>[ch.id,ch.deep]));
    assert.ok(chapters.teeth.some(x=>x.includes('Гертвига')));
    assert.ok(chapters.liver.some(x=>x.includes('Портальная долька')));
    assert.ok(chapters.pancreas.some(x=>x.includes('мальтаза-глюкоамилаза')));
    assert.ok(chapters.colon.some(x=>x.includes('терминальном илеуме')));
    assert.equal(Object.values(chapters).filter(deep=>deep.length>2).length,4,'Only four independently checked chapter expansions');
    // The 24 final questions have distinct rationales for each wrong option.
    await desktop.locator('.side-nav [data-nav="subjects"]').click();
    await desktop.locator('.library-card').filter({hasText:'Гистология, цитология'}).locator('.library-go').click();
    await desktop.locator('.library-card').filter({hasText:'Пищеварительная система'}).locator('.library-go').click();
    await desktop.locator('.library-card').filter({hasText:'Итоговый тест пищеварительной системы'}).locator('.library-go').click();
    await desktop.getByRole('button',{name:'Лёгкий · 8'}).click();
    await desktop.locator('.gi-mini-answers button').filter({hasText:'Подслизистая → слизистая'}).click();
    await desktop.locator('.gi-distractor-review summary').click();
    assert.equal(await desktop.locator('.gi-distractor-review li').count(),3);
    assert.ok((await desktop.locator('.gi-distractor-review').textContent()).includes('Редакционные пояснения'));
    // 1.9.11: Anatomy now contains I–XII from both owner-provided source PDFs.
    const sourceCourse=await desktop.evaluate(async()=> (await (await fetch('./data/cranial-nerves.json')).json()));
    assert.equal(sourceCourse.chapters.length,13);
    assert.equal(sourceCourse.chapters.flatMap(ch=>ch.questions).length,52);
    assert.equal(sourceCourse.chapters.flatMap(ch=>ch.cards).length,53);
    assert.equal(sourceCourse.chapters.flatMap(ch=>ch.sections).length,49);
    assert.equal(sourceCourse.version,2);
    assert.equal(sourceCourse.studyFormat,'one-full-note');
    assert.equal(sourceCourse.chapters.reduce((n,ch)=>n+ch.terms.length,0),263);
    assert.ok(sourceCourse.chapters.reduce((n,ch)=>n+ch.sections.flatMap(s=>s.points).join(' ').length,0)>50000);
    assert.ok(sourceCourse.chapters.every(ch=>!('brief' in ch)&&ch.latinTitle));
    assert.deepEqual(sourceCourse.scope.missing,['VIII','IX','X','XI','XII']);
    const sourceExt=await desktop.evaluate(async()=> (await (await fetch('./data/cranial-nerves-viii-xii.json')).json()));
    assert.equal(sourceExt.chapters.length,13);
    assert.equal(sourceExt.chapters.flatMap(ch=>ch.questions).length,52);
    assert.equal(sourceExt.chapters.flatMap(ch=>ch.cards).length,51);
    assert.equal(sourceExt.chapters.flatMap(ch=>ch.sections).length,51);
    assert.equal(sourceExt.chapters.reduce((n,ch)=>n+ch.terms.length,0),223);
    assert.ok(sourceExt.chapters.reduce((n,ch)=>n+ch.sections.flatMap(s=>s.points).join(' ').length,0)>30000);
    assert.ok(sourceExt.chapters.every(ch=>ch.latinTitle&&!('brief' in ch)));
    assert.deepEqual(sourceExt.scope.included,['VIII','IX','X','XI','XII']);
    await desktop.locator('.brand').click();
    await desktop.getByRole('button',{name:'Черепные нервы · анатомия'}).click();
    await waitHeading(desktop,'Нервная система');
    assert.equal(await desktop.locator('.library-card').count(),27,'Anatomy needs 26 full notes and an exam');
    assert.equal(await desktop.locator('.library-card').filter({hasText:'VIII. Преддверно-улитковый нерв'}).count(),1);
    await desktop.locator('.library-card').filter({hasText:'V3. Нижнечелюстная ветвь'}).locator('.library-go').click();
    await waitHeading(desktop,'Нижнечелюстная ветвь');
    assert.equal(await desktop.locator('.cn-tabs button').count(),3);
    assert.ok((await desktop.locator('.cn-latin-title').textContent()).includes('Nervus mandibularis'));
    assert.equal(await desktop.locator('.cn-term-row').count(),28);
    assert.equal(await desktop.locator('.cn-detail').count(),sourceCourse.chapters.find(c=>c.id==='mandibular').sections.length);
    assert.ok((await desktop.locator('.cn-detail').allTextContents()).join(' ').includes('подбородочн'));
    await desktop.getByRole('button',{name:'Тест',exact:true}).click();
    for(let i=0;i<4;i++){
      await desktop.locator('.cn-option').first().click();
      await desktop.getByRole('button',{name:'Проверить ответ'}).click();
      assert.equal(await desktop.locator('.cn-feedback').count(),1);
      await desktop.getByRole('button',{name:i===3?'Завершить тест':'Следующий вопрос →'}).click();
    }
    assert.ok((await desktop.locator('.cn-result').textContent()).includes('из 4'));
    const stored=await desktop.evaluate(()=>JSON.parse(localStorage.getItem('med-study-cranial-progress-v1')));
    assert.equal(stored.version,1);
    assert.ok(typeof stored.chapters.mandibular.best==='number');
    await desktop.getByRole('button',{name:'Вернуться к разделу'}).click();
    await desktop.getByRole('button',{name:'← Нервная система'}).click();
    await desktop.locator('.library-card').filter({hasText:'Итоговый тест по I–XII парам'}).locator('.library-go').click();
    await waitHeading(desktop,'Итоговая проверка по черепным нервам');
    assert.ok((await desktop.locator('.cn-count').textContent()).includes('1 / 20'));
    assert.equal(await desktop.locator('.cn-option').count(),4);
    // Source 2: five nerves (VIII–XII) in thirteen full notes, with Latin and traceable corrections.
    await desktop.getByRole('button',{name:'← К конспекту'}).click();
    await waitHeading(desktop,'Нервная система');
    await desktop.locator('.library-card').filter({hasText:'VIII. Преддверно-улитковый нерв'}).locator('.library-go').click();
    await waitHeading(desktop,'Преддверно-улитковый нерв: ядра и состав');
    assert.equal(await desktop.locator('.cn-tabs button').count(),3,'No abbreviated study mode');
    assert.equal(await desktop.locator('.cn-detail').count(),sourceExt.chapters[0].sections.length);
    assert.ok((await desktop.locator('.cn-latin-title').textContent()).includes('Nervus vestibulocochlearis'));
    assert.ok((await desktop.locator('.cn-source').textContent()).includes('Черепные нервы (1).pdf'));
    assert.ok((await desktop.locator('.cn-term-grid').textContent()).includes('Nucleus vestibularis'));
    await desktop.getByRole('button',{name:'← Нервная система'}).click();
    await desktop.locator('.library-card').filter({hasText:'IX. Языкоглоточный нерв: барабанная'}).locator('.library-go').click();
    await waitHeading(desktop,'Языкоглоточный нерв: барабанная и остальные ветви');
    assert.ok((await desktop.locator('.cn-detail').allTextContents()).join(' ').includes('foramen ovale'));
    assert.equal(await desktop.locator('.cn-scientific-sources a').count(),1);
    await desktop.getByRole('button',{name:'← Нервная система'}).click();
    await desktop.locator('.library-card').filter({hasText:'XII. Подъязычный нерв и шейная петля'}).locator('.library-go').click();
    await waitHeading(desktop,'Подъязычный нерв и шейная петля');
    assert.ok((await desktop.locator('.cn-detail').allTextContents()).join(' ').includes('thyrohyoideus'));
    assert.ok((await desktop.locator('.cn-term-grid').textContent()).includes('Ansa cervicalis'));
    assert.equal(await desktop.locator('.cn-scientific-sources a').count(),1);
    await desktop.locator('.cn-tabs').getByRole('button',{name:'Карточки',exact:true}).click();
    assert.equal(await desktop.locator('.cn-card').count(),1);
    await desktop.locator('.cn-tabs').getByRole('button',{name:'Тест',exact:true}).click();
    assert.equal(await desktop.locator('.cn-option').count(),4);
    assert.equal(errors.length,0,errors.join('\n'));
    await desktopCtx.close();
    console.log('PASS: GI regression, complete anatomy cranial nerves, quiz and Android origin');
  } finally {await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
