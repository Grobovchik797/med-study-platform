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
 const wrap=el('div','gi-table-scroll');
 wrap.setAttribute('role','region');
 wrap.setAttribute('tabindex','0');
 wrap.setAttribute('aria-label','Таблица из кафедральной методички: '+item.title);
 const table=el('table','gi-table gi-original-table');
 const body=el('tbody');
 for(const cells of item.rows) {
  const tr=el('tr');
  for(const cell of cells) {
   const header=cell.kind!=='answer';
   const node=el(header?'th':'td',cell.kind==='title'?'gi-map-title-cell':'',cell.text);
   if(cell.colspan>1)node.colSpan=cell.colspan;
   if(cell.rowspan>1)node.rowSpan=cell.rowspan;
   if(header)node.setAttribute('scope','col');
   tr.append(node);
  }
  body.append(tr);
 }
 table.append(body);wrap.append(table);
 return wrap;
}
function addMap(host,map) {
 const details=el('details','gi-method-card');
 const summary=el('summary','',map.title+' · '+map.page);
 details.append(summary,
  paragraph('Структура и формулировки граф соответствуют кафедральному оригиналу. Заполнения — учебные ответы, не официальный ключ кафедры.'),
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

function renderChapter(host,{chapter,mini,workbook,deepBlocks=[],departmentQuestions=[],onBack,onSlide,onExam,onWorkbook,onDepartment,onFlashcards,depth='brief'}) {
 const focusMount=el('div','gi-topic-focus');
 if(window.MedStudySI?.renderFocus)window.MedStudySI.renderFocus(focusMount,{topicTitle:chapter.title,topicKey:chapter.id});
 let current=chapterDepths[chapter.id]||depth;
 function show(){
  host.replaceChildren();
  append(host,button('← К разделу «Пищеварительная система»',onBack,'gi-back'),
    el('div','kicker','ГИСТОЛОГИЯ · ПИЩЕВАРИТЕЛЬНАЯ СИСТЕМА'),
    el('h1','',chapter.title),
    paragraph(chapter.intro,'gi-lead'),
    paragraph('Методичка: печатные страницы '+chapter.methodPage+'. Источник: АГМА, 1999 год. Современные пояснения добавлены отдельно; это не утверждённая преподавателем редакция.','gi-provenance'));
  // Four real resources on each chapter page, following the small-intestine pilot.
  const resources=el('div','library-features gi-topic-features');
  const notesTile=el('section','card library-feature');
  append(notesTile,el('h2','','Конспект'),paragraph('Краткий и расширенный разбор по главе.'),
    button('Читать краткий →',()=>{current='brief';chapterDepths[chapter.id]=current;show();host.querySelector('#gi-chapter-notes')?.scrollIntoView();},'gi-button'),
    button('Читать расширенный →',()=>{current='deep';chapterDepths[chapter.id]=current;show();host.querySelector('#gi-chapter-notes')?.scrollIntoView();},'gi-button gi-light'));
  const testsTile=el('section','card library-feature');
  const n=mini.length+deepBlocks.filter(b=>b.checkpoint).length;
  append(testsTile,el('h2','','Тесты'),paragraph('Не менее '+n+' вопросов из учебных материалов этой главы, с разбором ответа.'),
    button('Начать тест →',onExam,'gi-button'));
  const atlasTile=el('section','card library-feature');
  append(atlasTile,el('h2','','Атлас'),paragraph(chapter.slideId?
    'Реальный справочный микропрепарат: изучение, самопроверка и поиск структур.':
    'Отдельной подтверждённой микрофотографии для этой главы пока нет.'));
  if(chapter.slideId&&onSlide)atlasTile.append(button('Открыть микропрепарат →',()=>onSlide(chapter.slideId),'gi-button'));
  const cardsTile=el('section','card library-feature');
  append(cardsTile,el('h2','','Карточки'),paragraph('Вспомни признаки и механизмы по восьми карточкам этой темы.'),
    button('Учить карточки →',onFlashcards,'gi-button'));
  append(resources,notesTile,testsTile,atlasTile,cardsTile);
  host.append(resources,focusMount);
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
  content.id='gi-chapter-notes';
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
  const slideFocus={
    duodenum:'Определи тонкую кишку по общей структуре слизистой; железы Бруннера не считай подтверждёнными, пока они не видны отчётливо.',
    jejunum:'Сопоставь ворсинки и крипты. Для этого снимка точечные метки ещё не проверены.',
    ileum:'Посмотри лимфоидный агрегат и крипты; точные клетки не размечены.',
    'salivary-submandibular':'Отличай серозные и слизистые отделы и протоки по общим морфологическим признакам.',
    esophagus:'Сравни многослойный плоский эпителий пищевода с однослойным эпителием желудка.',
    'stomach-fundus':'Ищи фундальные желудочные железы; это конкретно фундальный, а не пилорический отдел.',
    colon:'Ищи крипты без типичных кишечных ворсинок; не путай с тонкой кишкой.',
    liver:'Обрати внимание на ретикулиновую окраску и авторские метки P (портальный тракт) и V (центральная вена).',
    pancreas:'Сравни экзокринную ацинарную ткань с островками; не выдавай предположение за подтверждённую подпись.'
  };
  {
    const box=el('section','gi-slide-in-text');
    append(box,el('div','kicker','МИКРОПРЕПАРАТ ПО ТЕМЕ'),
       el('h2','',chapter.slideId?'Изучи реальный срез: три режима':'Препарат пока не добавлен'),
       paragraph(chapter.slideId?(slideFocus[chapter.slideId]||'Изучи строение органа по его характерным гистологическим признакам.'):
         'В атлас включаются только снимки с подтверждённым органом и условиями использования. Для этой главы нет отдельной проверенной микрофотографии — не подставляем чужой препарат.'));
    if(chapter.slideId&&onSlide)box.append(button('Открыть препарат и вернуться сюда →',()=>onSlide(chapter.slideId),'gi-button'));
    host.append(box);
  }
  if(onDepartment && window.MedStudyDepartment?.catalog.some(x=>x.chapters.includes(chapter.id))){
    const faculty=el('section','gi-slide-in-text dept-in-chapter');
    append(faculty,el('div','kicker','МИКРОПРЕПАРАТЫ КАФЕДРЫ'),
      el('h2','','Снимки для коллоквиума'),
      paragraph('Здесь можно изучить фотографии по названиям, как они обозначены на кафедре. Твои JPG хранятся только в браузере и не заменяют справочные препараты.'),
      button('Открыть кафедральные препараты →',onDepartment,'gi-button'));
    host.append(faculty);
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
      paragraph('Карты по оригинальным таблицам кафедральной методички: сохранены строки, графы и объединения ячеек. Заполнения учебные и требуют сверки с преподавателем.'));
    for(const map of relevant)addMap(maps,map);
    host.append(maps);
  }
  const actions=el('div','gi-end-actions');
  append(actions,button('Тесты по этой теме →',onExam,'gi-button'),
    button('Все заполненные карты →',onWorkbook,'gi-button gi-light'),button('← Назад к темам',onBack,'gi-button gi-light'));
  host.append(actions);
 }
 show();
}
function renderWorkbook(host,{maps,department,onBack,onChapter}){
 host.replaceChildren();append(host,button('← К пищеварительной системе',onBack,'gi-back'),
   el('div','kicker','ПРАКТИЧЕСКАЯ ПОДГОТОВКА'),
   el('h1','','Заполненные ориентировочные карты'),
   paragraph('8 кафедральных ориентировочных карт по оригинальным страницам АГМА, 1999 г. Заголовки, строки, столбцы и объединения ячеек воспроизведены по методичке; ответы учебные, не официальный ключ. Широкие таблицы на телефоне прокручиваются по горизонтали.','gi-lead'));
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
function renderExam(host,{bank,onBack,chapterId=null,chapterTitle='',mini=[],deepBlocks=[]}){
 let level=null,idx=0,correct=0,done=[],chosen=-1;
 const levels={easy:'Лёгкий',medium:'Средний',hard:'Сложный'};
 const topicMode=Boolean(chapterId);
 const topicQuestions=topicMode?[
  ...bank.questions.filter(q=>q.chapter===chapterId),
  ...mini.map(([prompt,options,answer,explanation],i)=>({
   id:'gi-mini-'+chapterId+'-'+i,chapter:chapterId,difficulty:'practice',
   prompt,options,answer,explanation
  })),
  ...deepBlocks.filter(block=>block.checkpoint).map(block=>({
   id:'gi-checkpoint-'+block.id,chapter:chapterId,difficulty:'practice',
   prompt:block.checkpoint.prompt,options:block.checkpoint.options,
   answer:block.checkpoint.answer,explanation:block.checkpoint.explanation
  }))
 ]:[];
 let quizQuestions=[];
 function trackMistake(question,isCorrect){
  if(!topicMode)return;
  try{
   const key='med-study-gi-mistakes-v1';
   const raw=JSON.parse(localStorage.getItem(key)||'{}');
   const all=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
   const existing=Array.isArray(all[chapterId])?all[chapterId].filter(id=>typeof id==='string'):[];
   all[chapterId]=isCorrect?existing.filter(id=>id!==question.id):
    [...new Set([...existing,question.id])];
   localStorage.setItem(key,JSON.stringify(all));
  }catch{}
 }
 function selectLevel(){
  host.replaceChildren();
  append(host,button(topicMode?'← К конспекту':'← К пищеварительной системе',onBack,'gi-back'),
   el('div','kicker',topicMode?'ТЕСТ ПО ТЕМЕ':'ИТОГОВОЕ ТЕСТИРОВАНИЕ'),
   el('h1','',topicMode?chapterTitle:'Контроль знаний по пищеварительной системе'),
   paragraph(topicMode?
    'В этой теме '+topicQuestions.length+' вопросов: 3 коротких, 5 проверок из расширенного конспекта и дополнительные из итогового банка, если они предусмотрены. После каждого ответа — объяснение; проверка преподавателем ещё требуется.':
    'Итоговый тест охватывает весь курс. Выбери уровень сложности.','gi-lead'));
  const controls=el('div','gi-depths');
  if(topicMode){
   if(topicQuestions.length)controls.append(button('Начать тематический тест · '+topicQuestions.length,()=>{
    level='topic';quizQuestions=randomize(topicQuestions);idx=0;correct=0;done=[];question();
   },'gi-button'));
   else controls.append(paragraph('Проверенные вопросы по этой теме пока не добавлены.','gi-lead'));
  }else{
   for(const key of Object.keys(levels)){
    const available=bank.questions.filter(q=>q.difficulty===key);
    controls.append(button(levels[key]+' · '+available.length,()=>{
     level=key;quizQuestions=available;idx=0;correct=0;done=[];question();
    },'gi-button'));
   }
  }
  host.append(controls);
 }
 function question(){
  const set=quizQuestions;
  if(idx>=set.length){finish();return;}
  const q=set[idx];chosen=-1;host.replaceChildren();
  append(host,el('div','kicker',(topicMode?'Тематический тест':levels[level])+' · '+(idx+1)+'/'+set.length),
    el('h2','gi-question-heading',q.prompt));
  const choices=el('div','gi-mini-answers'),result=el('div','gi-mini-feedback'),actions=el('div','gi-end-actions');
  const randomized=randomize(q.options.map((value,i)=>({value,good:i===q.answer})));
  for(const [i,option] of randomized.entries()){
    choices.append(button(option.value,()=>{
      if(chosen!==-1)return;
      chosen=i;done.push({id:q.id,correct:option.good});if(option.good)correct++;
      trackMistake(q,option.good);
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
   const key=topicMode?'med-study-gi-topic-v1':'med-study-gi-exam-v1';
   const old=JSON.parse(localStorage.getItem(key)||'[]');
   const record={at:new Date().toISOString(),difficulty:level,score:correct,total};
   if(topicMode)record.chapter=chapterId;
   if(Array.isArray(old))localStorage.setItem(key,JSON.stringify([...old.slice(-99),record]));
  }catch{}
  host.replaceChildren();
  append(host,el('div','kicker','РЕЗУЛЬТАТ'),el('h1','','Верно: '+correct+' из '+total),
   paragraph('Результат: '+percentage+'%. Неотвеченных вопросов нет. Прогресс хранится только на устройстве.','gi-lead'),
   button(topicMode?'Ещё раз':'Другой уровень',selectLevel,'gi-button'),button(topicMode?'К конспекту':'К темам',onBack,'gi-button gi-light'));
 }
 selectLevel();
}
// Flashcards use ONLY existing authored teaching material; no synthetic facts
// or externally generated questions are added to the medical syllabus.
function renderCards(host,{title,cards,onBack}){
 let order=cards.map((_,i)=>i),index=0,revealed=false;
 function show(){
  const item=cards[order[index]];
  host.replaceChildren();
  append(host,button('← К теме',onBack,'gi-back'),
    el('div','kicker','АКТИВНОЕ ВОСПРОИЗВЕДЕНИЕ'),
    el('h1','',title+' · карточки'),
    paragraph('Сначала сформулируй ответ самостоятельно, затем открой объяснение из конспекта.','gi-lead'),
    el('p','gi-provenance','Карточка '+(index+1)+' из '+order.length+'. Формулировки взяты из существующего материала темы.'));
  const card=el('article','card gi-recall-card');
  append(card,el('div','kicker',revealed?'ПРОВЕРЬ СЕБЯ':'ВСПОМНИ БЕЗ ПОДСКАЗКИ'),el('h2','',item.prompt));
  if(revealed)card.append(paragraph(item.answer));
  else card.append(paragraph('Попробуй ответить своими словами, только затем открой объяснение.'));
  const controls=el('div','gi-end-actions');
  append(controls,button(revealed?'Скрыть ответ':'Показать ответ',()=>{revealed=!revealed;show();},'gi-button'),
   button('← Назад',()=>{index=(index-1+order.length)%order.length;revealed=false;show();},'gi-button gi-light'),
   button('Следующая →',()=>{index=(index+1)%order.length;revealed=false;show();},'gi-button gi-light'),
   button('Перемешать',()=>{order=randomize(order);index=0;revealed=false;show();},'gi-button gi-light'));
  host.append(card,controls);
 }
 if(!cards.length){host.replaceChildren(paragraph('Карточки этой темы ещё не подготовлены.'));return;}
 show();
}

window.MedStudyGI={renderChapter,renderWorkbook,renderExam,renderCards};
})();