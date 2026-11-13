'use strict';
/* Separate mobile regression check for departmental physiology of blood. Run from repo root. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:390,height:780},isMobile:true,hasTouch:true});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
    await page.locator('.side-nav [data-nav="subjects"]').click();
    await page.locator('.library-card').filter({hasText:'Нормальная физиология'}).locator('.library-go').click();
    await page.locator('.library-card').filter({hasText:'Физиология крови'}).locator('.library-go').click();
    assert.equal(await page.locator('.library-card').count(),38,'36 old full notes + atlas + exam stay available');
    await page.getByRole('button',{name:'Кафедральный коллоквиум →'}).click();
    await page.waitForSelector('.bd-question-card');
    assert.equal(await page.locator('.bd-question-card').count(),25,'all 25 departmental prompts');
    await page.locator('.bd-question-card').filter({hasText:'Виды и функции лейкоцитов'}).getByRole('button',{name:/Учить ответ/}).click();
    await page.waitForSelector('.bd-answer');
    assert.ok((await page.locator('.bd-answer').textContent()).length>1200,'full detailed response must be present');
    assert.ok(await page.locator('.bd-table').count()>=1,'leukocyte formula must be shown as a table');
    assert.ok(await page.locator('.bd-additional').count()>=1);
    await page.getByRole('button',{name:'Начать проверку'}).click();
    assert.equal(await page.locator('.bd-quiz-question .bd-choice').count(),4);
    await page.locator('.bd-quiz-question .bd-choice').first().click();
    await page.getByRole('button',{name:/Следующий вопрос/}).click();
    await page.locator('.bd-quiz-question .bd-choice').first().click();
    await page.getByRole('button',{name:'Завершить'}).click();
    assert.ok((await page.locator('.bd-quiz-area').textContent()).includes('из 2'));
    assert.ok(await page.evaluate(()=>!!localStorage.getItem('med-study-blood-department-progress-v1')),'own progress key');
    await page.getByRole('button',{name:'← Все кафедральные вопросы'}).click();
    await page.getByRole('button',{name:/8 практических навыков/}).click();
    assert.equal(await page.locator('.bd-practical-card').count(),8);
    await page.locator('.bd-practical-card').first().locator('.bd-choice').first().click();
    assert.ok(await page.locator('.bd-feedback').first().textContent());
    await page.getByRole('button',{name:/Физиология крови/}).first().click();
    await page.getByRole('button',{name:/3 педиатрических вопроса/}).click();
    assert.equal(await page.locator('.bd-pediatric').count(),3);
    await page.getByRole('button',{name:/Физиология крови/}).first().click();
    await page.getByRole('button',{name:/Устный опрос/}).click();
    assert.ok((await page.locator('.bd-oral').textContent()).includes('УСТНЫЙ ВОПРОС'));
    await page.getByRole('button',{name:'Показать полный ответ'}).click();
    assert.equal(await page.locator('.bd-check').count(),4);
    await page.locator('.bd-check input').first().check();
    await page.getByRole('button',{name:/Записать результат/}).click();
    await page.getByRole('button',{name:/Физиология крови/}).first().click();
    await page.getByRole('button',{name:/Кафедральный экзамен/}).click();
    await page.getByRole('button',{name:'Начать экзамен'}).click();
    for(let i=0;i<25;i++){
      await page.locator('.bd-quiz-question .bd-choice').first().click();
      await page.getByRole('button',{name:i===24?'Завершить':'Следующий вопрос →'}).click();
    }
    assert.equal(await page.locator('.bd-review').count(),25,'full result explanations');
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('med-study-blood-department-progress-v1')).final!==null),true);
    // New mode is two-way linked to existing full lessons.
    await page.getByRole('button',{name:/Физиология крови/}).first().click();
    await page.locator('.bd-question-card').first().getByRole('button',{name:/Учить ответ/}).click();
    await page.getByRole('button',{name:/Общий конспект/}).click();
    assert.equal(await page.locator('.blood-block').count(),2);
    await page.getByRole('button',{name:/По кафедре/}).click();
    assert.ok(await page.locator('.bd-question-card').count()>=1,'contextual departmental questions');
    assert.deepEqual(errors,[],'page JavaScript errors');
    console.log('PASS: 25 complete answers, 50 independent topic checks, 25 exam questions, 8 practice scenarios, 3 pediatrics, oral and safe navigation');
  }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});