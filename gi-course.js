/* Med Study GI course: topic-scoped content, workbook and separate tests.
   Deliberately no HTML injection. All educational strings stay textContent. */
(() => {
'use strict';
const el=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=String(text);return x;};
const button=(value,callback,cls='gi-button')=>{const x=el('button',cls,value);x.type='button';x.addEventListener('click',callback);return x;};
const append=(host,...nodes)=>{nodes.forEach(x=>host.append(x));return host;};
const titles={brief:'Краткий',deep:'Расширенный'};
const randomize=a=>{const arr=a.slice();for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;};
const chapterDepths=Object.create(null);
function paragraph(text,cls='gi-paragraph') {
 const p=el('p',cls);
 const pieces=String(text).split(/(\([^()]{3,170}\)|NB\.)/);
 for(const part of pieces){
   if(!part)continue;
   const style=part.startsWith('(')?'gi-parenthetical':part==='NB.'?'gi-term':'';
   p.append(style?el('span',style,part):document.createTextNode(part));
 }
 return p;
}
function sectionTitle(text){return el('h2','gi-subheading',text);}
function workbookTable(item) {
 const wrap=el('div','gi-table-scroll'),table=el('table','gi-table');
 const head=el('thead'),tr=el('tr');
 for(const name of item.columns)tr.append(el('th','',name));
 head.append(tr);table.append(head);
 const body=el('tbody');
 for(const values of item.rows){
  const row=el('tr');
  for(const value of values)row.append(el('td','',value));
  body.append(row);
 }
 table.append(body);wrap.append(table);return wrap;
}
function addMap(host,map) {
 const details=el('details','gi-method-card');
 const summary=el('summary','',map.title+' · '+map.page);
 details.append(summary,paragraph('Ориентировочная карта из методички: форма сохранена по смыслу; заполнение — новая учебная редакция.'),
  workbookTable(map));
 host.append(details);
}
function renderMiniQuestions(host,items) {
 const wrap=el('section','gi-quiz-inline');
 append(wrap,el('div','kicker','СРАЗУ ПРОВЕРЬ СЕБЯ'),sectionTitle('3 коротких вопроса после раздела'),
   paragraph('Нажми ответ — увидишь результат и объяснение. Эти вопросы не входят в итоговый тест.'));
 for(const [ix,item] of items.entries()){
  const [prompt,answers,correct,reason]=item;
  const card=el('article','gi-mini-card');
  append(card,el('h3','',(ix+1)+'. '+prompt));
  const choices=el('div','gi-mini-answers'),message=el('div','gi-mini-feedback');
  randomize(answers.map((answer,i)=>({answer,good:i===correct}))).forEach(item=>{
   const opt=button(item.answer,()=>{
    for(const b of choices.querySelectorAll('button'))b.disabled=true;
    opt.classList.add(item.good?'gi-correct':'gi-incorrect');
    append(message,el('strong','',item.good?'Верно!':'Неверно. Правильный ответ: '+answers[correct]),paragraph(reason));
   },'gi-mini-choice');
   choices.append(opt);
  });
  card.append(choices,message);wrap.append(card);
 }
 host.append(wrap);
}
function renderBlockCheckpoint(host,checkpoint) {
  const box=el('div','gi-checkpoint');
  append(box,el('div','kicker','ПРОВЕРКА ЭТОГО БЛОКА'),el('h3','',checkpoint.prompt));
  const options=el('div','gi-mini-answers');
  const feedback=el('div','gi-mini-feedback');
  randomize(checkpoint.options.map((value,i)=>({value,good:i===checkpoint.answer}))).forEach(option=>{
    const choice=button(option.value,()=>{
      for(const b of options.querySelectorAll('button'))b.disabled=true;
      choice.classList.add(option.good?'gi-correct':'gi-incorrect');
      append(feedback,el('strong','',option.good?'Верно!':'Правильный ответ: '+checkpoint.options[checkpoint.answer]),paragraph(checkpoint.explanation));
    },'gi-mini-choice');
    options.append(choice);
  });
  box.append(options,feedback);host.append(box);
}
function briefExtract(text){
  return String(text).split(/(?<=\.)\s+/u).slice(0,2).join(' ');
}

function renderChapter(host,{chapter,mini,workbook,deepBlocks=[],departmentQuestions=[],onBack,onSlide,onExam,onWorkbook,depth='brief'}) {
 let current=chapterDepths[chapter.id]||depth;
 function show(){
  host.replaceChildren();
  append(host,button('← К разделу «Пищеварительная система»',onBack,'gi-back'),
    el('div','kicker','ГИСТОЛОГИЯ · ПИЩЕВАРИТЕЛЬНАЯ СИСТЕМА'),
    el('h1','',chapter.title),
    paragraph(chapter.intro,'gi-lead'),
    paragraph('Методичка: печатные страницы '+chapter.methodPage+'. Источник: АГМА, 1999 год. Современные пояснения добавлены отдельно; это не утверждённая преподавателем редакция.','gi-provenance'));
  const depths=el('div','gi-depths');
  for(const key of ['brief','deep']){
    const b=button(titles[key],()=>{current=key;chapterDepths[chapter.id]=key;show();},'gi-button'+(current===key?' gi-active':''));
    b.setAttribute('aria-pressed',String(current===key));depths.append(b);
  }host.append(depths);
  const imageByChapter={
    tongue:'gi-tongue.svg',taste:'gi-tongue.svg',
    stomach:'gi-stomach.svg','gastric-glands':'gi-stomach.svg',
    liver:'gi-liver.svg',pancreas:'gi-pancreas.svg'
  };
  const schematic=imageByChapter[chapter.id];
  if(schematic){
    const figure=el('figure','gi-chapter-figure');
    const picture=el('img');
    picture.src='./illustrations/'+schematic;
    picture.alt='Авторская учебная схема: '+chapter.title;
    picture.loading='lazy';
    figure.append(picture,el('figcaption','','Авторская учебная схема, не реальная микрофотография.'));
    host.append(figure);
  }
  const content=el('article','card gi-content');
  append(content,el('h2','','Учебный конспект'),
    paragraph(chapter.intro));
  for(const x of chapter.brief)content.append(paragraph(x));
  if(current==='brief'){
    content.append(sectionTitle('Основные признаки и структуры по блокам'));
    for(const block of deepBlocks){
      const brief=el('section','gi-brief-block');
      brief.append(el('h3','',block.title),paragraph(briefExtract(block.text)));
      content.append(brief);
    }
  }else{
    content.append(sectionTitle('Подробный разбор по слоям, клеткам и механизмам'));
    for(const x of chapter.deep)content.append(paragraph(x));
    for(const [number,block] of deepBlocks.entries()){
      const part=el('section','gi-deep-block');
      part.id='gi-block-'+chapter.id+'-'+(number+1);
      append(part,el('div','gi-block-index','БЛОК '+(number+1)+' / '+deepBlocks.length),
        el('h3','',block.title),paragraph(block.text));
      renderBlockCheckpoint(part,block.checkpoint);
      content.append(part);
    }
  }
  append(content,append(el('div','gi-nb'),el('strong','','NB · Обрати внимание'),paragraph(chapter.nb)));
  host.append(content);
  if(chapter.slideId && onSlide){
    const box=el('section','gi-slide-in-text');
    append(box,el('div','kicker','ПРЕПАРАТ ПО ТЕМЕ'),
       el('h2','','Найди структурные признаки на реальном срезе'),
       paragraph(chapter.slideId==='duodenum'?'Для двенадцатиперстной кишки ищи ворсинки, крипты и подслизистые дуоденальные железы.':
        chapter.slideId==='ileum'?'Для подвздошной кишки обрати внимание на лимфоидный агрегат и крипты.':
        'Распознай кишечный отдел по сочетанию признаков, не по одной детали.'),
       button('Открыть препарат и вернуться сюда →',()=>onSlide(chapter.slideId),'gi-button'));
    host.append(box);
  }
  renderMiniQuestions(host,mini);
  if(departmentQuestions.length){
    const control=el('details','gi-method-card');
    const summary=el('summary','','Контрольные вопросы по методичке · '+departmentQuestions.length);
    const list=el('ol','gi-department-list');
    for(const x of departmentQuestions)list.append(el('li','',x.text));
    control.append(summary,list,paragraph('Для подробной подготовки используй весь конспект, а не только короткие мини-тесты.'));
    host.append(control);
  }
  const relevant=workbook.filter(m=>m.chapters.includes(chapter.id));
  if(relevant.length){
    const maps=el('section','gi-map-section');
    append(maps,sectionTitle('Ориентировочные карты к этой теме'),
      paragraph('Задания из методички доступны в заполненном виде; материалы не заменяют проверку преподавателем.'));
    for(const map of relevant)addMap(maps,map);
    host.append(maps);
  }
  const actions=el('div','gi-end-actions');
  append(actions,button('Итоговые тесты (другие вопросы) →',onExam,'gi-button'),
    button('Все заполненные карты →',onWorkbook,'gi-button gi-light'),button('← Назад к темам',onBack,'gi-button gi-light'));
  host.append(actions);
 }
 show();
}
function renderWorkbook(host,{maps,department,onBack,onChapter}){
 host.replaceChildren();append(host,button('← К пищеварительной системе',onBack,'gi-back'),
   el('div','kicker','ПРАКТИЧЕСКАЯ ПОДГОТОВКА'),
   el('h1','','Заполненные ориентировочные карты'),
   paragraph('Схемы учебных таблиц из методических разработок АГМА 1999 г. Заполнения подготовлены самостоятельно; это не оригинальный официальный ключ кафедры.','gi-lead'));
 for(const map of maps)addMap(host,map);
 const source=el('section','gi-map-section');
 append(source,sectionTitle('56 контрольных вопросов методички'),paragraph('Сверено по четырём кафедральным темам. Нажимай «Открыть конспект», чтобы перейти к связанному разделу.'));
 for(const group of department.groups){
   const details=el('details','gi-method-card');
   const summary=el('summary','',group.topic+' · '+group.questions.length+' вопросов');
   const list=el('ol','gi-department-list');
   for(const q of group.questions){
      const li=el('li');append(li,el('span','',q.text),
        button('Открыть соответствующую главу →',()=>onChapter(q.chapter),'gi-question-link'));
      list.append(li);
   }
   details.append(summary,list);source.append(details);
 }
 host.append(source,button('← К разделу',onBack,'gi-button gi-light'));
}
function renderExam(host,{bank,onBack}){
 let level=null,idx=0,correct=0,done=[],chosen=-1;
 const levels={easy:'Лёгкий',medium:'Средний',hard:'Сложный'};
 function selectLevel(){
  host.replaceChildren();
  append(host,button('← К пищеварительной системе',onBack,'gi-back'),
    el('div','kicker','ИТOГОВОЕ ТЕСТИРОВАНИЕ'),el('h1','','Контроль знаний по пищеварительной системе'),
    paragraph('По 8 новых вопросов на каждый уровень; эти задания не повторяют три мини-теста в конце подразделов.','gi-lead'));
  const controls=el('div','gi-depths');
  for(const key of Object.keys(levels))controls.append(button(levels[key]+' · 8',()=>{
    level=key;idx=0;correct=0;done=[];question();
  },'gi-button'));host.append(controls);
 }
 function question(){
  const set=bank.questions.filter(q=>q.difficulty===level);
  if(idx>=set.length){finish();return;}
  const q=set[idx];chosen=-1;host.replaceChildren();
  append(host,el('div','kicker',levels[level]+' · '+(idx+1)+'/'+set.length),
    el('h2','gi-question-heading',q.prompt));
  const choices=el('div','gi-mini-answers'),result=el('div','gi-mini-feedback'),actions=el('div','gi-end-actions');
  const randomized=randomize(q.options.map((value,i)=>({value,good:i===q.answer})));
  for(const [i,option] of randomized.entries()){
    choices.append(button(option.value,()=>{
      if(chosen!==-1)return;
      chosen=i;done.push({id:q.id,correct:option.good});if(option.good)correct++;
      for(const b of choices.querySelectorAll('button'))b.disabled=true;
      append(result,el('strong','',option.good?'Верно!':'Правильный ответ: '+q.options[q.answer]),paragraph(q.explanation));
      actions.append(button(idx+1===set.length?'Завершить':'Следующий вопрос →',()=>{idx++;question();},'gi-button'));
    },'gi-mini-choice'));
  }
  host.append(choices,result,actions);
  host.append(button('Выйти из теста',selectLevel,'gi-button gi-light'));
 }
 function finish(){
  const total=done.length,percentage=Math.round(correct/total*100);
  try{
   const old=JSON.parse(localStorage.getItem('med-study-gi-exam-v1')||'[]');
   if(Array.isArray(old))localStorage.setItem('med-study-gi-exam-v1',JSON.stringify([...old.slice(-29),{at:new Date().toISOString(),difficulty:level,score:correct,total}]));
  }catch{}
  host.replaceChildren();
  append(host,el('div','kicker','РЕЗУЛЬТАТ'),el('h1','','Верно: '+correct+' из '+total),
   paragraph('Результат: '+percentage+'%. Неотвеченных вопросов нет. Прогресс хранится только на устройстве.','gi-lead'),
   button('Другой уровень',selectLevel,'gi-button'),button('К темам',onBack,'gi-button gi-light'));
 }
 selectLevel();
}
window.MedStudyGI={renderChapter,renderWorkbook,renderExam};
})();