'use strict';

const main = document.getElementById('main-content');
const sideErrors = document.getElementById('side-errors');
const STORAGE_KEY = 'med-study-progress-v1';
const IS_ANDROID_APP = location.hostname === 'appassets.androidplatform.net';
document.documentElement.dataset.runtime = IS_ANDROID_APP ? 'android-app' : 'web';
const mobileMoreToggle = document.getElementById('mobile-more-toggle');
const mobileMorePanel = document.getElementById('mobile-more-panel');
const mobileMoreBackdrop = document.getElementById('mobile-more-backdrop');
const mobileMoreClose = document.getElementById('mobile-more-close');
const MORE_VIEWS = new Set(['atlas','flashcards','atlases','cards','mistakes','stats','install']);

function setMobileMore(open) {
  if (!mobileMorePanel || !mobileMoreBackdrop || !mobileMoreToggle) return;
  mobileMorePanel.hidden = !open;
  mobileMoreBackdrop.hidden = !open;
  mobileMoreToggle.setAttribute('aria-expanded', String(open));
  mobileMoreToggle.setAttribute('aria-label', open ? 'Закрыть остальные разделы' : 'Открыть остальные разделы');
  if (open) mobileMoreClose.focus();
}
if (mobileMoreToggle) mobileMoreToggle.addEventListener('click', () => setMobileMore(mobileMorePanel.hidden));
if (mobileMoreClose) mobileMoreClose.addEventListener('click', () => setMobileMore(false));
if (mobileMoreBackdrop) mobileMoreBackdrop.addEventListener('click', () => setMobileMore(false));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && mobileMorePanel && !mobileMorePanel.hidden) {
    setMobileMore(false);
    mobileMoreToggle.focus();
  }
});

let questionBank = null;
let lessonData = null;
let atlasData = null;
let subjectCatalog = null;
let learningLibrary = null;
let intestineData = null;
let intestineQuizBank = null;
let intestineSlides = null;
let giAtlasSlides = null;
let giCurriculum = null, giInlineBank = null, giFinalBank = null, giWorkbook = null, giDepartmentQuestions = null, giDeepBlocks = null;
let activeGIChapterId = null;
let intestineDepth = 'brief';
let selectedReceptor = 'beta1';
let view = 'home';
let session = null;
let lastResult = null;
let progress = readProgress();
let installPrompt = null;
let flashcardIndex = 0;
let flashcardFlipped = false;
let flashcardOrder = [];

function readProgress() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      sessions: Number.isSafeInteger(value.sessions) && value.sessions >= 0 ? value.sessions : 0,
      best: Number.isFinite(value.best) && value.best >= 0 && value.best <= 100 ? value.best : null,
      mistakes: Array.isArray(value.mistakes) ? [...new Set(value.mistakes.filter(v => typeof v === 'string'))] : [],
      topicStats: validateTopicStats(value.topicStats)
    };
  } catch (_error) {
    return { sessions: 0, best: null, mistakes: [], topicStats: {} };
  }
}

function validateTopicStats(raw) {
  const safe = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return safe;
  for (const [topic, value] of Object.entries(raw)) {
    if (!value || typeof value !== 'object') continue;
    const attempts = value.attempts;
    const correct = value.correct;
    if (Number.isSafeInteger(attempts) && attempts >= 0 &&
        Number.isSafeInteger(correct) && correct >= 0 && correct <= attempts) {
      safe[topic] = { attempts, correct };
    }
  }
  return safe;
}

function persistProgress() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }
  catch (_error) { /* Private browsing or storage disabled; current session still works. */ }
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}

function append(parent, ...children) {
  for (const child of children) parent.appendChild(child);
  return parent;
}

function button(label, handler, className = 'action-button') {
  const node = element('button', className, label);
  node.type = 'button';
  node.addEventListener('click', handler);
  return node;
}

function updateNav() {
  for (const item of document.querySelectorAll('[data-nav]')) {
    const navigationView = ({ lesson:'notes', intestine:'notes', 'gi-chapter':'notes', 'gi-workbook':'notes', 'gi-exam':'subjects', atlas:'atlases',
      flashcards:'cards', subject:'subjects', section:'subjects', topic:'subjects' })[view] || view;
    const selected = item.dataset.nav === navigationView;
    item.classList.toggle('selected', selected);
    if (selected) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  }
  sideErrors.textContent = String(progress.mistakes.length);
  if (mobileMoreToggle) {
    mobileMoreToggle.classList.toggle('selected', MORE_VIEWS.has(view));
    if (MORE_VIEWS.has(view)) mobileMoreToggle.setAttribute('aria-current', 'page');
    else mobileMoreToggle.removeAttribute('aria-current');
  }
}

function navigate(to) {
  if (IS_ANDROID_APP && to === 'install') to = 'home';
  setMobileMore(false);
  view = to;
  session = null;
  updateNav();
  if (!questionBank) return;
  if (to === 'subjects') showSubjects();
  else if (to === 'notes') showResourceLibrary('notes');
  else if (to === 'atlases') showResourceLibrary('atlas');
  else if (to === 'cards') showResourceLibrary('flashcards');
  else if (to === 'lesson') showLesson();
  else if (to === 'atlas') showAtlas();
  else if (to === 'intestine') showIntestine();
  else if (to === 'flashcards') showFlashcards();
  else if (to === 'stats') showStats();
  else if (to === 'install') showInstallGuide();
  else if (to === 'mistakes') showMistakes();
  else showHome();
  window.scrollTo(0, 0);
}

function titleArea(kicker, title, description) {
  return append(element('div'), element('div', 'kicker', kicker), element('h1', '', title), element('p', 'intro', description));
}

function stat(icon, value, caption) {
  const outer = element('div', 'stat');
  append(outer, element('div', 'stat-icon', icon), append(element('div'), element('div', 'stat-val', value), element('div', 'stat-label', caption)));
  return outer;
}

function subjectCard() {
  const card = element('article', 'subject-card');
  const info = element('div', 'subject-main');
  append(info, element('div', 'subject-tag', 'ДОСТУПНЫЙ МОДУЛЬ'), element('h3', '', questionBank.subject), element('p', '', questionBank.topic + ' · ' + questionBank.questions.length + ' вопросов с объяснениями'));
  const actions = element('div', 'subject-actions');
  append(actions,
    button('Читать конспект', () => navigate('lesson'), 'alt-button'),
    button('20 вопросов →', () => begin(questionBank.questions)),
    button('10 случайных', () => begin(sampleQuestions(questionBank.questions, 10)), 'alt-button')
  );
  append(card, element('div', 'subject-icon', '◈'), info, actions);
  return card;
}

function disclaimer() {
  return element('p', 'note', 'Учебный банк составлен и сверён по материалам NCBI Bookshelf, но не является официальным банком кафедры. Перед экзаменом сопоставляй ответы с программой курса и учебником.');
}


function libraryEntries() {
  if (!learningLibrary || !subjectCatalog) return [];
  const entries = [];
  for (const subject of subjectCatalog.subjects) {
    const tree = learningLibrary.subjects[subject.id];
    if (!tree) continue;
    for (const section of tree.sections) {
      for (const topic of section.topics) {
        entries.push({subject, section, topic});
      }
    }
  }
  return entries;
}

function librarySubject(subjectId) {
  return subjectCatalog?.subjects.find(s => s.id === subjectId);
}

function librarySection(subjectId, sectionId) {
  return learningLibrary?.subjects[subjectId]?.sections.find(s => s.id === sectionId);
}

function contextLink(label, click) {
  return button(label, click, 'library-back-link');
}

function showSubject(subjectId) {
  view = 'subject'; updateNav(); main.replaceChildren();
  const subject = librarySubject(subjectId), tree = learningLibrary?.subjects[subjectId];
  if (!subject) { showSubjects(); return; }
  main.append(contextLink('← Все предметы', () => navigate('subjects')));
  main.append(titleArea('ПРЕДМЕТ', subject.name,
    tree ? 'Выбери раздел. Тема появится внутри него, когда будет подготовлена.'
         : 'Разделы для этого предмета пока не сформированы.'));
  if (!tree || !tree.sections.length) {
    main.append(element('p','note','Пока нет разделов и учебных материалов. Добавим их по программе курса.'));
    return;
  }
  const grid=element('div','library-grid');
  for(const section of tree.sections) {
    const card=element('article','library-card');
    const ready=section.topics.length;
    append(card,element('div','course-kind',ready?'ЕСТЬ ТЕМЫ':'ПЛАНИРУЕТСЯ'),
      element('h3','',section.title),element('p','',section.subtitle),
      element('div','library-status',ready?(ready+' учебная тема'):'Материалы будут добавлены'),
      button(ready?'Открыть раздел →':'Посмотреть раздел →',
        () => showSection(subjectId,section.id),'library-go'));
    grid.append(card);
  }
  main.append(grid);
  window.scrollTo(0,0);
}

function showSection(subjectId,sectionId) {
  const subject=librarySubject(subjectId), section=librarySection(subjectId,sectionId);
  if(!subject||!section){showSubjects();return;}
  view='section';updateNav();main.replaceChildren();
  main.append(contextLink('← '+subject.name,()=>showSubject(subjectId)));
  main.append(titleArea(subject.name.toUpperCase(),section.title,section.subtitle));
  if(!section.topics.length) {
    main.append(element('p','note','Раздел создан. Конспекты и тесты появятся после проверки материалов.'));
    return;
  }
  const grid=element('div','library-grid');
  for(const topic of section.topics) {
    const card=element('article','library-card');
    append(card,element('div','course-kind','УЧЕБНАЯ ТЕМА'),
      element('h3','',topic.title),element('p','',topic.hint),
      button('Открыть тему →',()=>showTopic(topic.id),'library-go'));
    grid.append(card);
  }
  main.append(grid);
  window.scrollTo(0,0);
}


function showSmallIntestineQuiz() {
  view='si-quiz';updateNav();main.replaceChildren();
  if(!window.MedStudySI || !intestineQuizBank) {main.append(element('p','note','Банк тестов не загрузился.'));return;}
  window.MedStudySI.renderQuiz(main,intestineQuizBank,()=>showTopic('histology-small-intestine'));
  window.scrollTo(0,0);
}
function showGIChapter(id) {
  if(!window.MedStudyGI || !giCurriculum)return showSubjects();
  const chapter=giCurriculum.chapters.find(x=>x.id===id);
  if(!chapter)return showSection('histology-cytology','digestive');
  activeGIChapterId=id;
  view='gi-chapter';updateNav();main.replaceChildren();
  window.MedStudyGI.renderChapter(main,{
    chapter,mini:giInlineBank.chapterQuestions[id],workbook:giWorkbook.maps,
    deepBlocks:giDeepBlocks[id],
    departmentQuestions:giDepartmentQuestions.groups.flatMap(g=>g.questions).filter(q=>q.chapter===id),
    onBack:()=>showSection('histology-cytology','digestive'),
    onSlide:slide=>{const index=giSlideIndex(slide);if(index>=0)showSmallIntestineSlides(index,id);else main.append(element('p','note','Препарат пока недоступен для этой темы.'));},
    onExam:()=>showGIExam(id),onWorkbook:showGIWorkbook,
    onDepartment:()=>showDepartmentAtlas(id)
  });
  window.scrollTo(0,0);
}
function showDepartmentAtlas(chapterId=null){
  view='department-atlas';updateNav();main.replaceChildren();
  if(!window.MedStudyDepartment){main.append(element('p','note','Личный атлас не загрузился.'));return;}
  const back=chapterId?()=>showGIChapter(chapterId):()=>showResourceLibrary('atlas');
  window.MedStudyDepartment.render(main,{onBack:back,chapterId});
  window.scrollTo(0,0);
}
function giSlideIndex(id) {return giAtlasSlides?.images?.findIndex(x=>x.id===id)??-1;}
function showGIAtlasChapter(chapterId){
  const chapter=giCurriculum?.chapters.find(x=>x.id===chapterId);
  const index=giSlideIndex(chapter?.slideId);
  if(index<0){showGIChapter(chapterId);main.append(element('p','note','Подтверждённого микропрепарата для этой темы пока нет.'));return;}
  showSmallIntestineSlides(index,chapterId);
}
function showGIWorkbook() {
  view='gi-workbook';updateNav();main.replaceChildren();
  window.MedStudyGI.renderWorkbook(main,{maps:giWorkbook.maps,department:giDepartmentQuestions,
    onBack:()=>showSection('histology-cytology','digestive'),onChapter:showGIChapter});
  window.scrollTo(0,0);
}
function showGIExam(chapterId=null) {
  view='gi-exam';updateNav();main.replaceChildren();
  const chapter=chapterId?giCurriculum?.chapters.find(x=>x.id===chapterId):null;
  window.MedStudyGI.renderExam(main,{bank:giFinalBank,
    chapterId:chapter?.id||null,chapterTitle:chapter?.title||'',
    mini:chapter?giInlineBank.chapterQuestions[chapter.id]||[]:[],
    onBack:chapter?()=>showGIChapter(chapter.id):()=>showSection('histology-cytology','digestive')});
  window.scrollTo(0,0);
}
function showReferenceAtlas(initialIndex=0) {
  showSmallIntestineSlides(initialIndex,null,true);
}
function showSmallIntestineSlides(initialIndex=0,originChapterId=null,allReferences=false) {
  // Button callbacks can pass a click event; only trusted numeric slide indices are valid.
  const slides=(originChapterId||allReferences)?giAtlasSlides:intestineSlides;
  if(!Number.isInteger(initialIndex)||initialIndex<0||initialIndex>=(slides?.images?.length||0))initialIndex=0;
  const from=allReferences?'atlases':originChapterId?'gi-chapter':view, scrollY=originChapterId?0:window.scrollY,
    chapterId=originChapterId||activeGIChapterId,depth=intestineDepth;
  view='si-slides';updateNav();main.replaceChildren();
  if(!window.MedStudySI || !slides?.images?.length) {main.append(element('p','note','Гистологические препараты не загрузились.'));return;}
  const back=()=>{
    if(from==='intestine'){intestineDepth=depth;showIntestine();}
    else if(from==='gi-chapter'&&chapterId)showGIChapter(chapterId);
     else if(from==='atlases')showResourceLibrary('atlas');
    else showTopic('histology-small-intestine');
    requestAnimationFrame(()=>window.scrollTo(0,scrollY));
  };
  window.MedStudySI.renderSlides(main,slides,back,initialIndex);
  window.scrollTo(0,0);
}

function showTopic(topicId) {
  const entry=libraryEntries().find(x=>x.topic.id===topicId);
  if(!entry){showSubjects();return;}
  view='topic';updateNav();main.replaceChildren();
  const {subject,section,topic}=entry;
  if(topic.route==='gi-chapter')return showGIChapter(topic.chapterId);
  if(topic.route==='gi-workbook')return showGIWorkbook();
  if(topic.route==='gi-exam')return showGIExam();
  main.append(contextLink('← '+section.title,()=>showSection(subject.id,section.id)));
  main.append(titleArea(subject.name+' · '+section.title,topic.title,topic.hint));
  const box=element('div','library-features');
  const notes=element('section','card library-feature');
  append(notes,element('h2','','Конспекты'),element('p','',
    topic.id==='ans'?'Пока доступен существующий конспект; подробная научная редакция ещё запланирована.':
    'Два формата конспекта на основе кафедральной тематики. Все спорные уточнения отражены в журнале редакции; сторонние сведения выделены отдельно.'));
  if(topic.route==='intestine') {
    const buttons=element('div','library-buttons');
    for(const item of [{id:'brief',label:'Краткий'},{id:'deep',label:'Расширенный'}]) {
      buttons.append(button(item.label,()=>{intestineDepth=item.id;showIntestine();window.scrollTo(0,0);},
        'library-action'));
    }
    notes.append(buttons);
  } else if(topic.route==='lesson') {
    notes.append(button('Читать конспект →',()=>navigate('lesson'),'library-action'));
  }
  box.append(notes);
  const tests=element('section','card library-feature');
  append(tests,element('h2','','Тестирование'),
    element('p','',topic.id==='histology-small-intestine'?
      '30 вопросов: лёгкие, средние, сложные. Отдельный прогресс и разбор ошибок.':
      topic.quiz?'20 учебных вопросов по ВНС с объяснениями.':
      'Тесты по этой теме пока не подготовлены.'));
  if(topic.id==='histology-small-intestine') {
    tests.append(button('Открыть 3 уровня тестов →',showSmallIntestineQuiz,'library-action'));
  } else if(topic.quiz) append(tests,button('Начать тест →',()=>begin(questionBank.questions),'library-action'),
    button('Экзамен без подсказок',()=>begin(questionBank.questions,'exam'),'alt-button'));
  box.append(tests);
  const atlas=element('section','card library-feature');
  append(atlas,element('h2','','Атлас и изображения'),
    element('p','',topic.id==='histology-small-intestine'?
      '3 реальных микропрепарата с зумом, подписями и самопроверкой. Фото загружаются через интернет.':
      topic.atlas?'Доступен интерактивный атлас рецепторов.':
      'Атлас для этой темы ещё планируется.'));
  if(topic.id==='histology-small-intestine') atlas.append(button('Изучение / самопроверка →',showSmallIntestineSlides,'library-action'));
  else if(topic.atlas) atlas.append(button('Открыть атлас →',()=>navigate('atlas'),'library-action'));
  box.append(atlas);
  const cards=element('section','card library-feature');
  append(cards,element('h2','','Карточки для повторения'),
    element('p','',topic.flashcards?'Повторение основных понятий темы.':
      'Карточки появятся после проверки учебных материалов.'));
  if(topic.flashcards) cards.append(button('Учить карточки →',()=>navigate('flashcards'),'library-action'));
  box.append(cards);
  main.append(box);
  window.scrollTo(0,0);
}

function showResourceLibrary(kind) {
  const settings={
    notes:['КОНСПЕКТЫ','Библиотека конспектов','Выбери предмет и тему — больше ни одна вкладка не привязана к ВНС.'],
    atlas:['АТЛАСЫ','Библиотека атласов','Интерактивные материалы организованы по темам.'],
    flashcards:['ЗАПОМИНАНИЕ','Карточки по темам','Выбирай нужную учебную тему для повторения.']
  }[kind];
  view=kind==='notes'?'notes':kind==='atlas'?'atlases':'cards';
  updateNav();main.replaceChildren();
  main.append(titleArea(...settings));
  if(kind==='atlas'){
    const department=element('section','card dept-banner');
    append(department,element('div','kicker','КОЛЛОКВИУМ · КАФЕДРАЛЬНЫЕ ПРЕПАРАТЫ'),
      element('h2','','14 кафедральных микропрепаратов'),
      element('p','','Исходные названия сохранены без изменений. Реальные фотографии и видеокадры уже доступны. Отдельно открыт справочный атлас лицензированных препаратов.'),
      button('Открыть кафедральный атлас →',()=>showDepartmentAtlas(),'library-action'));
    main.append(department);
    const reference=element('section','card dept-banner');
    append(reference,element('div','kicker','СПРАВОЧНЫЕ · РЕАЛЬНЫЕ МИКРОПРЕПАРАТЫ'),
      element('h2','','Обычные препараты · 19 фотографий'),
      element('p','','Все 14 кафедральных названий покрыты отдельными справочными изображениями. В изучении доступны пронумерованные ориентиры; цифры непосредственно на микрофотографии и автоматическая оценка — только у проверенной разметки.'),
      button('Открыть обычные препараты →',()=>showReferenceAtlas(),'library-action'));
    main.append(reference);
  }
  const entries=libraryEntries().filter(({topic})=>kind==='notes'?
    Object.values(topic.notes||{}).some(Boolean) : kind==='atlas'?topic.atlas:topic.flashcards);
  const grid=element('div','library-grid');
  for(const entry of entries) {
    const {subject,section,topic}=entry;
    const card=element('article','library-card');
    append(card,element('div','course-kind',subject.name+' · '+section.title),
      element('h3','',topic.title));
    if(kind==='notes') {
      append(card,element('p','',topic.hint),
        button('Выбрать конспект →',()=>showTopic(topic.id),'library-go'));
    } else if(kind==='atlas') {
      append(card,element('p','','Атлас доступен в разделе выбранной темы.'),
        button('Открыть атлас →',
          topic.id==='histology-small-intestine'?showSmallIntestineSlides:
          topic.route==='gi-chapter'?()=>showGIAtlasChapter(topic.chapterId):()=>navigate('atlas'),'library-go'));
    } else {
      append(card,element('p','','Карточки для активного повторения.'),
        button('Начать повторение →',()=>navigate('flashcards'),'library-go'));
    }
    grid.append(card);
  }
  main.append(grid);
  if(!entries.length) main.append(element('p','note','Материалы этого типа пока готовятся.'));
  const next=element('div','section-actions');
  next.append(button('Посмотреть все предметы →',()=>navigate('subjects'),'alt-button'));
  main.append(next);
  window.scrollTo(0,0);
}

function showHome() {
  view='home';updateNav();main.replaceChildren();
  main.append(titleArea('ТВОЁ ОБУЧЕНИЕ','Med Study — библиотека знаний',
    'Начни с предмета, выбери раздел и тему. Конспекты, тесты, атласы и повторение открываются в контексте выбранной темы.'));
  const hero=element('section','hero');
  const copy=append(element('div','hero-copy'),
    element('div','kicker','УНИВЕРСИТЕТ · МНОГО ПРЕДМЕТОВ'),
    element('h2','','Выбирай, что изучать сегодня.'),
    element('p','','Перейди от предмета к нужной теме и работай с доступными материалами.'));
  append(hero,copy,button('Выбрать предмет →',()=>navigate('subjects'),'hero-action'));
  main.append(hero);
  const stats=element('section','stats-grid');
  append(stats,
    stat('▤',subjectCatalog?.subjects.length||0,'Предметов в каталоге'),
    stat('◈',libraryEntries().length,'Тем с материалами'),
    stat('↺',progress.mistakes.length,'Вопросов на повторение'));
  main.append(stats);
  const heading=element('div','section-head');
  append(heading,append(element('div'),
    element('h2','','Продолжить обучение'),
    element('p','section-subtitle','Все темы с материалами, которые уже есть в Med Study')));
  main.append(heading);
  const grid=element('div','library-grid');
  for(const {subject,section,topic} of libraryEntries()){
    const card=element('article','library-card');
    append(card,element('div','course-kind',subject.name+' · '+section.title),
      element('h3','',topic.title),element('p','',topic.hint),
      button('Открыть тему →',()=>showTopic(topic.id),'library-go'));
    grid.append(card);
  }
  main.append(grid);
  main.append(append(element('div','section-actions'),
    button('Все конспекты →',()=>navigate('notes'),'alt-button')));
}

function showSubjects() {
  view='subjects';updateNav();main.replaceChildren();
  main.append(titleArea('УНИВЕРСИТЕТ','Мои предметы',
    'Выбери предмет, затем его раздел и конкретную тему. Неактивные разделы остаются в планах.'));
  const grid=element('div','library-grid');
  for(const subject of subjectCatalog.subjects) {
    const tree=learningLibrary?.subjects[subject.id];
    const count=(tree?.sections||[]).reduce((sum,sec)=>sum+sec.topics.length,0);
    const card=element('article','library-card');
    append(card,element('div','course-kind',subject.group==='general'?'ОБЩЕУНИВЕРСИТЕТСКИЙ':'МЕДИЦИНА'),
      element('h3','',subject.name),
      element('p','',tree?tree.sections.length+' разделов в структуре':'Разделы ещё не сформированы'),
      element('div','library-status',count?count+' тема(ы) с материалами':'Материалы готовятся'),
      button('Открыть предмет →',()=>showSubject(subject.id),'library-go'));
    grid.append(card);
  }
  main.append(grid);
}


// Educational emphasis only: preserve the original wording and medical meaning.
function histologyParagraph(value) {
  const p=element('p','hist-paragraph');
  const regex=/(\([^()]{4,170}\)|энтероцит\w*|микроворсинк\w*|ворсинк\w*|крипт\w*|клетк\w*\s+Панета|бокаловидн\w*\s+клетк\w*|пейеров\w*\s+бляшк\w*|микрофотографи\w*|GALT|H[⁺+]\/K[⁺+]-АТФаз\w*|Na[⁺+]\/K[⁺+]-АТФаз\w*|SGLT1|GLUT[25]|CFTR)/gi;
  for(const part of String(value).split(regex)){
    if(!part)continue;
    if(part.startsWith('(')&&part.endsWith(')'))p.append(element('span','hist-inline-aside',part));
    else if(/^(энтероцит|микроворсинк|ворсинк|крипт|клетк|бокаловидн|пейеров|GALT|H[⁺+]|Na[⁺+]|SGLT1|GLUT|CFTR)/i.test(part))
      p.append(element('strong','hist-inline-term',part));
    else p.append(document.createTextNode(part));
  }
  return p;
}
function addMicroscopyContext(card,slide,idx) {
  const fig=element('figure','gi-related-microphoto');
  const img=element('img');
  img.src=slide.src;img.alt='Реальный гистологический препарат: '+slide.title;
  img.loading='lazy';img.decoding='async';
  const status=element('p','gi-photo-fallback','');
  img.addEventListener('error',()=>{status.textContent='Фото пока не загрузилось с внешнего сервера. Ты можешь открыть препарат и повторить загрузку.';});
  const caption=element('figcaption','','Препарат по теме: '+slide.title+'. Нажми, чтобы изучить структуры и вернуться на это место.');
  fig.append(img,caption,status,
    button('Изучить этот препарат →',()=>showSmallIntestineSlides(idx),'gi-button'));
  card.append(fig);
}

function showIntestine() {
  view = 'intestine'; updateNav(); main.replaceChildren();
  if (!intestineData) {
    main.append(element('p','note','Материал по гистологии не загрузился. Обнови страницу.'));
    return;
  }
  main.append(titleArea('ГИСТОЛОГИЯ · ЦИТОЛОГИЯ', intestineData.title,
    'Два формата: полноценная обязательная база и расширенная гистология с механизмами и связями.'));
  const warning=element('div','note');
  warning.textContent=intestineData.review_note;
  main.append(warning);
  const selector=element('div','study-depth-selector');
  for(const variant of intestineData.variants.filter(v=>v.id==='brief'||v.id==='deep')) {
    const active=variant.id===intestineDepth;
    const b=button(variant.title,() => {intestineDepth=variant.id;showIntestine();window.scrollTo(0,0);},
      'study-depth-button'+(active?' active':''));
    b.setAttribute('aria-pressed',String(active));
    selector.append(b);
  }
  main.append(selector);
  const version=intestineData.variants.find(x=>x.id===intestineDepth)||intestineData.variants.find(x=>x.id==='brief');
  const header=element('div','study-depth-header');
  append(header,element('div','kicker',version.label),element('h2','',version.title+' конспект'),
    element('p','',version.description));
  main.append(header);
  const focus=element('div','si-focus-container');
  main.append(focus);
  if(window.MedStudySI?.renderFocus)window.MedStudySI.renderFocus(focus);
  if(version.originStatement)main.append(element('p','si-source-note',version.originStatement));
  // Resources belong near the content they illustrate, not above every note.

  const legend=element('div','hist-reading-legend');
  append(legend,element('span','','Фиолетовый · важный термин / NB'),
    element('span','','Бирюзовый · пояснение в скобках'));
  main.append(legend);

  const toc=element('nav','study-toc');
  append(toc,element('strong','','Разделы · '+version.sections.length));
  for(let n=0;n<version.sections.length;n++) {
    const link=element('a','',version.sections[n].title);
    link.href='#intestine-section-'+n;
    toc.append(link);
  }
  main.append(toc);
  for(let i=0;i<version.sections.length;i++) {
    const section=version.sections[i],card=element('section','card hist-study-section');
    card.id='intestine-section-'+i;
    append(card,element('h2','',section.title));
    for(const paragraph of section.paragraphs) card.append(histologyParagraph(paragraph));
    const label=section.title.toLowerCase();
    if(/рельеф|ворсинк|слизистая|стенка/.test(label) && !main.querySelector('.histology-diagram')) {
      const diagram=element('figure','histology-diagram');
      const img=element('img');img.src='./illustrations/small-intestine-schematic.svg';
      img.alt='Учебная схема ворсинки и крипты';img.loading='lazy';
      diagram.append(img,element('figcaption','','Схема ворсинки и крипты (не микропрепарат).'));
      card.append(diagram);
    }
    if(intestineSlides?.images?.length===3){
      if(/сравнен|различить три отдела|определить.*отдел/.test(label)) {
        for(const [ix,slide] of intestineSlides.images.entries())addMicroscopyContext(card,slide,ix);
      } else if(/бруннер|железы бруннер/.test(label)) addMicroscopyContext(card,intestineSlides.images[0],0);
      else if(/пейер|иммунная защита/.test(label)) addMicroscopyContext(card,intestineSlides.images[2],2);
    }
    if(section.table) {
      const wrap=element('div','hist-table-scroll');
      const t=element('table','hist-table');
      const head=element('thead');const row=element('tr');
      for(const h of section.table.headers) row.append(element('th','',h));
      head.append(row);t.append(head);
      const body=element('tbody');
      for(const values of section.table.rows) {
        const tr=element('tr');
        for(const value of values)tr.append(element('td','',value));
        body.append(tr);
      }
      t.append(body);wrap.append(t);card.append(wrap);
    }
    if(section.userPages) card.append(element('p','si-source-note','В исходном конспекте: стр. '+section.userPages+'; редакционные пояснения и предложения — в журнале сверки.'));
    const takeaway=element('div','hist-takeaway');
    append(takeaway,element('strong','','NB · Обрати внимание'),histologyParagraph(section.key));
    card.append(takeaway);
    if(typeof section.source==='string'&&section.source.startsWith('https://')) {
      const link=element('a','hist-source-link','Проверить раздел по источнику ↗');
      link.href=section.source;link.target='_blank';link.rel='noopener noreferrer';
      card.append(link);
    }
    main.append(card);
  }
  const checklist=element('section','card hist-study-section');
  append(checklist,element('h2','','Что нужно уметь объяснить преподавателю'));
  const ul=element('ul','hist-checklist');
  for(const value of intestineData.checklist) ul.append(element('li','',value));
  checklist.append(ul);
  main.append(checklist);
  const endActions=element('div','si-note-actions');
  endActions.append(button('Перейти к 30 большим тестам →',showSmallIntestineQuiz,'library-action'));
  main.append(endActions);
  const future=element('section','card hist-study-section');
  append(future,element('h2','','Настоящие микропрепараты уже в пилоте'),
    element('p','hist-paragraph','Открой три лицензированных фотографии тонкой кишки. Подписи наложены только на достоверно различимые области. В режиме самопроверки назови отдел и подпиши метки; более подробный цифровой микроскоп — будущая версия.'));
  for(const item of intestineData.future_virtual_slides.examples) {
    const l=element('a','hist-source-link',item.title+' ↗');
    l.href=item.url;l.target='_blank';l.rel='noopener noreferrer';future.append(l);
  }
  future.append(button('Открыть виртуальные препараты →',showSmallIntestineSlides,'library-action'));
  // Общий атлас доступен из раздела «Атласы»; не дублируем галерею на каждом экране конспекта.

}
 
function sampleQuestions(list, count) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

function showLesson() {
  view = 'lesson'; updateNav(); main.replaceChildren();
  if (!lessonData) {
    main.append(element('p','note','Конспект не загрузился. Попробуй обновить страницу.'));
    return;
  }
  main.append(titleArea('УЧЕБНЫЙ КОНСПЕКТ · ВВОДНАЯ ВЕРСИЯ', lessonData.topic, lessonData.subtitle));
  main.append(element('p','note','Это первый учебный материал по ВНС, а не законченный краткий или расширенный конспект. Позже добавим две полноценно выверенные версии по контрольным вопросам: краткую с обязательной базой и расширенную до клеточных и молекулярных механизмов.'));
  const toolbar = element('div','lesson-toolbar');
  append(toolbar, element('span','lesson-label','5 разделов · теория + примеры'),
    button('Перейти к 20 вопросам →', () => begin(questionBank.questions)));
  main.append(toolbar);
  const intro = element('div','lesson-intro');
  append(intro, element('strong','', 'О чём этот модуль'), element('p','',lessonData.intro));
  main.append(intro);
  if (lessonData.visualTip) {
    const legend = element('div', 'visual-legend');
    append(legend, element('span', 'legend-chip sympathy', '● Симпатический'),
      element('span', 'legend-chip parasympathy', '● Парасимпатический'),
      element('span', 'legend-note', 'Цвета различают отделы; эффекты определяются рецепторами.'));
    main.append(legend);
  }
  for (const sec of lessonData.sections) {
    const card = element('section','card lesson-section');
    append(card, element('h2','',sec.title), element('p','lesson-lead',sec.lead));
    const facts = element('div','lesson-facts');
    for (const fact of sec.facts) {
      const item = element('div','lesson-fact');
      append(item, element('h3','',fact.term),element('p','',fact.body));
      facts.append(item);
    }
    card.append(facts);
    if (sec.illustration && typeof sec.illustration.src === 'string' &&
        /^\.\/illustrations\/[a-z-]+\.svg$/.test(sec.illustration.src)) {
      const figure = element('figure', 'lesson-visual');
      append(figure, element('h3', 'lesson-visual-title', sec.illustration.title));
      const link = element('a', 'lesson-visual-open');
      link.href = sec.illustration.src;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.title = 'Открыть схему в полном размере';
      const img = element('img', 'lesson-visual-image');
      img.src = sec.illustration.src;
      img.alt = sec.illustration.alt;
      img.loading = 'lazy';
      img.decoding = 'async';
      link.append(img);
      figure.append(link);
      const bottom = element('figcaption', 'lesson-visual-caption');
      append(bottom, element('span', '', sec.illustration.caption));
      const enlarge = element('a', 'enlarge-link', 'Увеличить ↗');
      enlarge.href = sec.illustration.src; enlarge.target = '_blank'; enlarge.rel = 'noopener noreferrer';
      bottom.append(enlarge); figure.append(bottom); card.append(figure);
    }
    append(card, element('div','lesson-takeaway',sec.takeaway));
    main.append(card);
  }
  const comparison = element('section', 'card lesson-section');
  append(comparison, element('h2', '', 'Сравнительная таблица: 5 органов'),
    element('p', 'lesson-lead', 'Симпатика и парасимпатика могут действовать противоположно, но правильнее запоминать их рецепторы.'));
  const compareGrid = element('div', 'comparison-grid');
  const entries = [
    ['Зрачок', 'α1 · расширение (мидриаз)', 'M3 · сужение (миоз)'],
    ['Сердце', 'β1 · учащение ЧСС', 'M2 · урежение ЧСС'],
    ['Бронхи', 'β2 · расслабление', 'M3 · сокращение'],
    ['ЖКТ', 'Часто ↓ моторика', 'Часто ↑ моторика'],
    ['Мочевой пузырь', 'β3 · расслабление детрузора', 'M3 · сокращение детрузора']
  ];
  const colHead = element('div', 'compare-header');
  append(colHead, element('strong', '', 'Орган'),
    element('strong', 'sympathy-text', 'Симпатический'),
    element('strong', 'parasympathy-text', 'Парасимпатический'));
  compareGrid.append(colHead);
  for (const [organ, sym, para] of entries) {
    const row = element('div', 'compare-row');
    append(row, element('strong', 'compare-organ', organ),
      append(element('div', 'compare-effect sym-effect'), element('span', 'mobile-compare-label', 'Симпатика'), element('span', '', sym)),
      append(element('div', 'compare-effect para-effect'), element('span', 'mobile-compare-label', 'Парасимпатика'), element('span', '', para)));
    compareGrid.append(row);
  }
  comparison.append(compareGrid);
  main.append(comparison);
  const plan = element('section','card lesson-section');
  append(plan,element('h2','',lessonData.plan.title));
  const list = element('ol','lesson-plan');
  for(const s of lessonData.plan.steps) list.append(element('li','',s));
  append(plan,list,element('p','muted',lessonData.plan.note));
  main.append(plan);
  const refs = element('section','card lesson-section');
  append(refs,element('h2','', 'Источники'));
  const ul=element('ul','lesson-sources');
  for(const source of lessonData.sources) {
    const li=element('li');
    const a=element('a','',source.title);
    a.href=source.url; a.target='_blank';a.rel='noopener noreferrer';
    li.append(a);ul.append(li);
  }
  append(refs,ul,element('p','muted',lessonData.disclaimer));
  main.append(refs, append(element('div','section-actions'),button('Проверить знания: 20 вопросов →',()=>begin(questionBank.questions))));
  window.scrollTo(0,0);
}

function showAtlas() {
  view = 'atlas'; updateNav(); main.replaceChildren();
  if (!atlasData) {
    main.append(element('p','note','Атлас не загрузился. Попробуй обновить страницу.'));
    return;
  }
  const entries = atlasData.items;
  let current = entries.find(x => x.id === selectedReceptor) || entries[0];
  main.append(titleArea('ИНТЕРАКТИВНОЕ ОБУЧЕНИЕ', atlasData.title, atlasData.description));
  const shell = element('section', 'atlas-layout');
  const selector = element('div', 'card atlas-selector');
  append(selector, element('h2', '', 'Выбери рецептор'), element('p', 'muted', atlasData.legend));
  const grid = element('div', 'atlas-receptors');
  for (const receptor of entries) {
    const receptorButton = button(receptor.short, () => {
      selectedReceptor = receptor.id;
      showAtlas();
    }, 'atlas-receptor ' + (receptor.division === 'sympathetic' ? 'atlas-sym' : 'atlas-para')
       + (receptor.id === current.id ? ' active' : ''));
    receptorButton.setAttribute('aria-pressed', String(receptor.id === current.id));
    receptorButton.setAttribute('aria-label', receptor.title);
    grid.append(receptorButton);
  }
  selector.append(grid);
  const illustration = element('img', 'atlas-overview');
  illustration.src = './illustrations/receptors.svg';
  illustration.loading = 'lazy';
  illustration.alt = 'Общая схема шести рецепторов ВНС и их типичных эффектов';
  selector.append(illustration);

  const detail = element('article', 'card atlas-detail ' + (current.division === 'sympathetic' ? 'detail-sym' : 'detail-para'));
  append(detail, element('span', 'subject-tag', current.division === 'sympathetic' ? 'СИМПАТИЧЕСКИЙ ОТДЕЛ' : 'ПАРАСИМПАТИЧЕСКИЙ ОТДЕЛ'),
    element('h2', '', current.title));
  const rows = [
    ['Медиатор',current.mediator],
    ['Где действует',current.organ],
    ['Физиологический эффект',current.effect],
    ['Как запомнить',current.remember]
  ];
  for (const [heading, body] of rows) {
    const field = element('div', 'atlas-detail-row');
    append(field, element('strong', '', heading), element('p','', body));
    detail.append(field);
  }
  const ref = element('a','question-source','Проверить источник на NCBI Bookshelf ↗');
  ref.href=current.source;
  ref.target='_blank'; ref.rel='noopener noreferrer';
  detail.append(ref);
  append(shell, selector, detail);
  main.append(shell, element('p','note',atlasData.note));
}

function showFlashcards() {
  view = 'flashcards'; updateNav();
  if (!lessonData) return;
  const source = lessonData.sections.flatMap(section =>
    section.facts.map(fact => ({
      title: fact.term,
      explanation: fact.body,
      topic: section.title
    }))
  );
  if (!flashcardOrder.length) flashcardOrder = source.map((_, index) => index);
  const item = source[flashcardOrder[flashcardIndex]];
  main.replaceChildren();
  main.append(titleArea('АКТИВНОЕ ВСПОМИНАНИЕ', 'Карточки по ВНС',
    'Попробуй объяснить понятие своими словами до того, как откроешь ответ.'));
  main.append(element('p', 'muted', 'Карточка ' + (flashcardIndex + 1) +
    ' из ' + flashcardOrder.length + ' · ' + item.topic));
  const card = element('section', 'card flashcard');
  append(card, element('div', 'kicker', flashcardFlipped ? 'ОБЪЯСНЕНИЕ' : 'ВСПОМНИ ПОНЯТИЕ'),
    element('h2', '', item.title));
  if (flashcardFlipped) card.append(element('p', 'flash-answer', item.explanation));
  else card.append(element('p', 'flash-hint', 'Как бы ты объяснил это на коллоквиуме?'));
  const actions = element('div', 'result-actions');
  append(actions,
    button(flashcardFlipped ? 'Скрыть ответ' : 'Показать ответ', () => {
      flashcardFlipped = !flashcardFlipped; showFlashcards();
    }),
    button('← Предыдущая', () => {
      flashcardIndex = (flashcardIndex - 1 + flashcardOrder.length) % flashcardOrder.length;
      flashcardFlipped = false; showFlashcards();
    }, 'alt-button'),
    button('Следующая →', () => {
      flashcardIndex = (flashcardIndex + 1) % flashcardOrder.length;
      flashcardFlipped = false; showFlashcards();
    }, 'alt-button'),
    button('Перемешать', () => {
      flashcardOrder = sampleQuestions(flashcardOrder, flashcardOrder.length);
      flashcardIndex = 0; flashcardFlipped = false; showFlashcards();
    }, 'alt-button')
  );
  main.append(card, actions);
}

function readGIHistory(key) {
  try {
    const data=JSON.parse(localStorage.getItem(key)||'[]');
    return Array.isArray(data)?data.filter(x=>x&&Number.isSafeInteger(x.score)&&
      Number.isSafeInteger(x.total)&&x.total>0&&x.score>=0&&x.score<=x.total):[];
  } catch {return [];}
}
function readGIMistakes() {
  try{
    const data=JSON.parse(localStorage.getItem('med-study-gi-mistakes-v1')||'{}');
    if(!data||typeof data!=='object'||Array.isArray(data))return {};
    const out={};
    for(const [id,values] of Object.entries(data)){
      if(Array.isArray(values))out[id]=[...new Set(values.filter(x=>typeof x==='string'))];
    }
    return out;
  }catch{return {};}
}
function showStats() {
  view = 'stats'; updateNav(); main.replaceChildren();
  main.append(titleArea('АНАЛИТИКА ПО ТЕМАМ', 'Мой прогресс',
    'Результаты разделены по учебным темам. В статистику входят завершённые тесты; три мини-вопроса внутри каждой главы отдельно не учитываются.'));
  const giTopics=readGIHistory('med-study-gi-topic-v1');
  const giFinals=readGIHistory('med-study-gi-exam-v1');
  const giMissed=readGIMistakes();
  const si=window.MedStudySI?.readProgress();
  const allScores=[progress.best,...giTopics,...giFinals].filter(x=>typeof x==='number');
  const allTests=[...giTopics,...giFinals];
  const percents=allTests.map(x=>Math.round(x.score/x.total*100));
  const bestScores=[...(progress.best===null?[]:[progress.best]),...percents,...(si?.byDifficulty?Object.values(si.byDifficulty).filter(Boolean).map(x=>x.best).filter(Number.isFinite):[])];
  const best=bestScores.length?Math.max(...bestScores):null;
  const totalMissed=progress.mistakes.length+Object.values(giMissed).reduce((sum,a)=>sum+a.length,0)+(si?.missed?.length||0);
  const grid = element('div', 'stats-grid');
  append(grid,
    stat('◷', progress.sessions+allTests.length+(si?.sessions||0), 'Завершённых тренировок (все модули)'),
    stat('✦', best===null?'—':best+'%', 'Лучший результат (все модули)'),
    stat('↺', totalMissed, 'Вопросов на повторение (все модули)'));
  main.append(grid);
  for(const {subject,section,topic} of libraryEntries()) {
    const box = element('section','card topic-stats');
    append(box,element('div','kicker',subject.name+' · '+section.title),element('h2','',topic.title));
    if(!topic.quiz){
      append(box,element('p','note','По этой теме тестов пока нет, поэтому и статистика не собирается.'));
      main.append(box);continue;
    }
    if(topic.id==='histology-small-intestine'){
      if(si){
        append(box,element('p','muted','Завершено тренировок по тонкой кишке: '+si.sessions+' · вопросов на повторение: '+si.missed.length));
        for(const [level,name] of [['easy','Лёгкий'],['medium','Средний'],['hard','Сложный']]){
          const x=si.byDifficulty[level],label=element('div','topic-stat-line');
          append(label,element('strong','',name),element('span','muted',x?'Тренировок: '+x.sessions+' · лучший результат '+x.best+'%':'Тренировок пока нет'));
          box.append(label);
        }
      }
      main.append(box);continue;
    }
    if(topic.route==='gi-chapter'){
      const sessions=giTopics.filter(x=>x.chapter===topic.chapterId);
      const missed=giMissed[topic.chapterId]?.length||0;
      if(sessions.length){
        const best=Math.max(...sessions.map(x=>Math.round(100*x.score/x.total)));
        const last=sessions[sessions.length-1];
        append(box,element('p','muted','Тематических тренировок: '+sessions.length+
          ' · лучший результат: '+best+'% · последняя: '+last.score+' из '+last.total+
          ' · вопросов на повторение: '+missed));
      }else append(box,element('p','muted','По этой главе ещё нет завершённых тематических тестов. Три мини-вопроса в конспекте в статистику не входят.'));
      main.append(box);continue;
    }
    if(topic.route==='gi-exam'){
      if(giFinals.length){
        const best=Math.max(...giFinals.map(x=>Math.round(100*x.score/x.total)));
        append(box,element('p','muted','Итоговых тренировок по всему курсу: '+giFinals.length+' · лучший результат: '+best+'%.'));
      }else append(box,element('p','muted','Итоговых тренировок по пищеварительной системе пока нет.'));
      main.append(box);continue;
    }
    if(topic.id!=='ans'){
      append(box,element('p','muted','Для этого раздела отдельная статистика ещё не предусмотрена.'));
      main.append(box);continue;
    }
    append(box,element('p','muted','ВНС: результаты по смысловым разделам. Считаются все ответы, включая повторения.'));
    const subtopics=[...new Set(questionBank.questions.map(q=>q.topic))];
    for(const subtopic of subtopics){
      const entry=progress.topicStats[subtopic]||{attempts:0,correct:0};
      const rate=entry.attempts?Math.round(entry.correct/entry.attempts*100):0;
      const row=element('div','topic-stat-line');
      append(row,element('strong','',subtopic),element('span','muted',
        entry.attempts?entry.correct+' из '+entry.attempts+' · '+rate+'%':'Ответов пока нет'));
      const bar=element('div','session-progress');
      const fill=element('div');fill.style.width=rate+'%';bar.append(fill);
      append(box,row,bar);
    }
    main.append(box);
  }
}

function showInstallGuide() {
  if (IS_ANDROID_APP) { navigate('home'); return; }
  view = 'install'; updateNav(); main.replaceChildren();
  main.append(titleArea('НА ТВОЁМ ТЕЛЕФОНЕ', 'Установить Med Study',
    'Один адрес для всех обновлений. На поддерживаемых устройствах сайт можно добавить как приложение.'));
  const info = element('section', 'card lesson-section');
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const status = element('div', 'install-status');
  append(status, element('strong', '', standalone ? '✓ Запущено как отдельное веб-приложение' : 'Открыто в браузере'),
    element('p', '', standalone
      ? 'Иконка Med Study работает в отдельном окне без стандартной адресной строки.'
      : 'Обычное открытие ссылки не устанавливает приложение. Ниже — варианты для твоего устройства.'));
  info.append(status);
  append(info, element('h2', '', 'Android — Google Chrome'),
    element('p', 'intro', 'Открой этот адрес в Google Chrome, а не во встроенном браузере Telegram или другой программы. Нажми ⋮ → «Установить приложение» или «Добавить на главный экран». На совместимых устройствах Chrome может установить WebAPK, а на других — только ярлык.'),
    element('h2', '', 'Как понять, что это приложение, а не ярлык?'),
    element('p', 'intro', 'Если при запуске с иконки нет адресной строки, а Med Study отображается отдельным окном в списке приложений — это установленное PWA. Если просто открывается вкладка браузера, перед тобой ярлык.'),
    element('h2', '', 'iPhone — Safari'),
    element('p', 'intro', 'Открой сайт в Safari → «Поделиться» → «На экран Домой» → «Добавить». На совместимых версиях iOS установленное веб-приложение может открываться отдельно.'),
    element('h2', '', 'Один адрес и обновления'),
    element('p', 'intro', 'При новых версиях ссылка остаётся той же; открой приложение с интернетом и при необходимости перезапусти, чтобы получить изменения. Прогресс хранится локально, на другом телефоне он не появится.'));
  if (installPrompt) info.append(button('Установить на устройство', async () => {
    if (!installPrompt) return;
    const currentPrompt = installPrompt;
    installPrompt = null;
    await currentPrompt.prompt();
    await currentPrompt.userChoice;
    showInstallGuide();
  }));
  main.append(info);
}

function showMistakes() {
  view = 'mistakes'; updateNav(); main.replaceChildren();
  main.append(titleArea('ПОВТОРЕНИЕ ПО ТЕМАМ', 'Работа над ошибками',
    'Ошибки сгруппированы по учебным темам: отдельный банк ВНС и отдельный банк тонкой кишки.'));
  const entries=libraryEntries().filter(x=>x.topic.quiz);
  if(!entries.length){main.append(element('p','note','Пока нет тестовых банков.'));return;}
  for(const {subject,section,topic} of entries) {
    const module=element('section','card topic-stats');
    append(module,element('div','kicker',subject.name+' · '+section.title),
      element('h2','',topic.title));
    if(topic.id==='histology-small-intestine'){
      const m=window.MedStudySI?.readProgress()?.missed?.length||0;
      append(module,element('p','muted',m?'Нужно повторить: '+m:'Ошибок на повторение пока нет.'),
        button(m?'Повторить вопросы →':'Открыть тему →',
          m?showSmallIntestineQuiz:()=>showTopic(topic.id),'library-action'));
      main.append(module);
      continue;
    }
    if(topic.route==='gi-chapter'){
      const missed=readGIMistakes()[topic.chapterId]||[];
      append(module,element('p','muted',missed.length?'Ошибок на повторение: '+missed.length:'Ошибок на повторение пока нет.'),
        button(missed.length?'Открыть конспект и повторить →':'Открыть тему →',
          ()=>showGIChapter(topic.chapterId),'library-action'));
      main.append(module);continue;
    }
    const questions=topic.id==='ans'?
      questionBank.questions.filter(q=>progress.mistakes.includes(q.id)):[];
    if(!questions.length) {
      append(module,element('p','muted','Ошибок на повторение пока нет.'),
        button('Открыть тему →',()=>showTopic(topic.id),'alt-button'));
    } else {
      append(module,element('p','muted','Нужно повторить: '+questions.length),
        button('Повторить ошибки →',()=>begin(questions),'library-action'));
    }
    main.append(module);
  }
}

function breadcrumb() {
  const node = element('div', 'breadcrumb');
  append(node, button('Мои предметы', () => navigate('subjects'), ''), element('span', '', '›'), element('span', '', questionBank.topic));
  return node;
}

function begin(questions, mode = 'practice') {
  session = { questions: questions.slice(), mode, index: 0, score: 0, answered: false, failures: [], lastAnswer: null };
  renderQuestion();
}

function renderQuestion() {
  if (!session) return;
  if (session.index >= session.questions.length) { finishSession(); return; }
  const q = session.questions[session.index];
  session.answered = false;
  main.replaceChildren();
  main.append(breadcrumb());
  const card = element('section', 'card');
  const top = append(element('div', 'session-top'), element('span', '', 'ВОПРОС ' + (session.index + 1) + ' ИЗ ' + session.questions.length), element('span', '', session.mode === 'exam' ? 'ЭКЗАМЕН · БЕЗ ПОДСКАЗОК' : questionBank.subject));
  const progressBar = element('div', 'session-progress');
  const fill = element('div'); fill.style.width = (session.index / session.questions.length * 100) + '%';
  progressBar.setAttribute('role', 'progressbar');
  progressBar.setAttribute('aria-label', 'Прогресс теста');
  progressBar.setAttribute('aria-valuenow', String(session.index));
  progressBar.setAttribute('aria-valuemax', String(session.questions.length));
  progressBar.appendChild(fill);
  append(card, top, progressBar, element('h2', 'question', q.question));
  const options = element('div', 'options');
  for (const choice of q.options) {
    const item = element('button', 'option');
    item.type = 'button'; item.dataset.optionId = choice.id;
    append(item, element('span', 'option-letter', choice.id), element('span', '', choice.text));
    item.addEventListener('click', () => answer(q, choice.id, options, card));
    options.appendChild(item);
  }
  card.appendChild(options);
  main.appendChild(card);
  window.scrollTo(0, 0);
}

function answer(q, selectedId, options, card) {
  if (!session || session.answered) return;
  session.answered = true;
  const correct = selectedId === q.correct_answer;
  if (correct) {
    session.score++;
    if (session.mode !== 'exam') progress.mistakes = progress.mistakes.filter(id => id !== q.id);
  } else {
    session.failures.push(q);
    if (session.mode !== 'exam' && !progress.mistakes.includes(q.id)) progress.mistakes.push(q.id);
  }
  if (session.mode !== 'exam') {
    const topicEntry = progress.topicStats[q.topic] || { attempts: 0, correct: 0 };
    topicEntry.attempts++;
    if (correct) topicEntry.correct++;
    progress.topicStats[q.topic] = topicEntry;
    persistProgress(); updateNav();
  }
  for (const option of options.children) {
    const id = option.dataset.optionId;
    option.disabled = true;
    if (session.mode !== 'exam' && id === q.correct_answer) option.classList.add('good');
    if (session.mode !== 'exam' && id === selectedId && !correct) option.classList.add('bad');
    if (session.mode === 'exam' && id === selectedId) option.classList.add('chosen');
  }
  const feedback = element('div', 'feedback ' + (session.mode === 'exam' ? 'neutral' : correct ? 'good' : 'bad'));
  feedback.setAttribute('role', 'status');
  append(feedback, element('strong', '',
    session.mode === 'exam' ? 'Ответ принят' :
    correct ? 'Верно! Отличная работа.' : 'Не совсем. Разберём правильный ответ.'),
    element('p', '', session.mode === 'exam'
      ? 'В экзаменационном режиме пояснения и правильные ответы будут доступны после завершения.'
      : q.explanation));
  if (session.mode !== 'exam' && typeof q.source === 'string' && q.source.startsWith('https://www.ncbi.nlm.nih.gov/books/')) {
    const sourceLink = element('a', 'question-source', 'Источник: NCBI Bookshelf ↗');
    sourceLink.href = q.source; sourceLink.target = '_blank'; sourceLink.rel = 'noopener noreferrer';
    feedback.append(sourceLink);
  }
  const actions = element('div', 'quiz-actions');
  const next = button(session.index + 1 === session.questions.length ? 'Завершить тест →' : 'Следующий вопрос →', () => { session.index++; renderQuestion(); });
  append(actions, element('span', 'muted', session.mode === 'exam' ? 'Ответ сохранён' : 'Правильных ответов: ' + session.score), next);
  append(card, feedback, actions);
  next.focus();
}

function finishSession() {
  if (!session) return;
  const completed = session;
  session = null;
  const percent = Math.round(100 * completed.score / completed.questions.length);
  if (completed.mode === 'exam') {
    const failed = new Set(completed.failures.map(q => q.id));
    for (const question of completed.questions) {
      const correct = !failed.has(question.id);
      if (correct) progress.mistakes = progress.mistakes.filter(id => id !== question.id);
      else if (!progress.mistakes.includes(question.id)) progress.mistakes.push(question.id);
      const entry = progress.topicStats[question.topic] || { attempts: 0, correct: 0 };
      entry.attempts++;
      if (correct) entry.correct++;
      progress.topicStats[question.topic] = entry;
    }
  }
  progress.sessions++;
  progress.best = progress.best === null ? percent : Math.max(progress.best, percent);
  persistProgress(); updateNav();
  lastResult = { score: completed.score, count: completed.questions.length, failures: completed.failures.slice() };
  main.replaceChildren();
  main.append(titleArea('ТРЕНИРОВКА ЗАВЕРШЕНА', completed.mode === 'exam' ? 'Экзамен завершён' : 'Твой результат', 'Главное — понимать материал и регулярно возвращаться к сложным вопросам.'));
  const card = element('section', 'card');
  append(card, element('div', 'kicker', 'ГОТОВО!'), element('div', 'result-score', lastResult.score + ' / ' + lastResult.count), element('h2', '', percent + '% правильных ответов'), element('p', 'intro', lastResult.failures.length ? 'Ошибки сохранены в разделе «Работа над ошибками».' : 'Все ответы верные! Можно повторить тему или выбрать следующую.'));
  const actions = element('div', 'result-actions');
  if (lastResult.failures.length) actions.append(button('Повторить ошибки (' + lastResult.failures.length + ')', () => begin(lastResult.failures)));
  append(actions, button('Полный тест · 20 вопросов', () => begin(questionBank.questions), 'alt-button'), button('На главную', () => navigate('home'), 'alt-button'));
  append(card, actions);
  main.append(append(element('div', 'section-actions'), card), disclaimer());
  if (completed.mode === 'exam' && completed.failures.length) {
    const review = element('section', 'card lesson-section');
    append(review, element('h2', '', 'Разбор ошибок'));
    for (const question of completed.failures) {
      const row = element('div', 'lesson-fact');
      const correctOption = question.options.find(o => o.id === question.correct_answer);
      append(row, element('h3', '', question.question),
        element('p', '', 'Правильный ответ: ' + (correctOption ? correctOption.text : question.correct_answer)),
        element('p', '', question.explanation));
      const src = element('a', 'question-source', 'Источник ↗');
      src.href = question.source; src.target = '_blank'; src.rel = 'noopener noreferrer';
      row.append(src); review.append(row);
    }
    main.append(review);
  }
  window.scrollTo(0, 0);
}

function isValidBank(data) {
  return data && typeof data === 'object' && data.version === 1 &&
    typeof data.subject === 'string' && typeof data.topic === 'string' &&
    Array.isArray(data.questions) && data.questions.length > 0 &&
    data.questions.every(q => typeof q.id === 'string' && typeof q.question === 'string' && typeof q.explanation === 'string' &&
      Array.isArray(q.options) && q.options.length === 4 &&
      q.options.every(x => typeof x.id === 'string' && typeof x.text === 'string') &&
      q.options.some(x => x.id === q.correct_answer));
}

function showLoadError(error) {
  main.replaceChildren();
  append(main, titleArea('ОШИБКА ЗАГРУЗКИ', 'Не удалось загрузить учебные материалы', 'Проверь подключение или попробуй открыть приложение через веб-сервер. При открытии файла напрямую браузер может блокировать чтение JSON.'), element('p', 'note', String(error)));
}

for (const item of document.querySelectorAll('[data-nav]')) {
  item.addEventListener('click', () => navigate(item.dataset.nav));
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  if (view === 'install' && questionBank) showInstallGuide();
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  if (view === 'install' && questionBank) showInstallGuide();
});
if ('serviceWorker' in navigator && location.hostname !== 'appassets.androidplatform.net') {
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
    .catch(() => { /* The website remains available online. */ });
}

Promise.all([
  fetch('./data/questions.json', { cache: 'no-store' }).then(response => { if (!response.ok) throw Error('HTTP ' + response.status); return response.json(); }),
  fetch('./data/lesson.json', { cache: 'no-store' }).then(response => { if (!response.ok) throw Error('HTTP ' + response.status); return response.json(); }),
  fetch('./data/atlas.json', { cache: 'no-store' }).then(response => { if (!response.ok) throw Error('HTTP ' + response.status); return response.json(); }),
  fetch('./data/subjects.json', { cache: 'no-store' }).then(response => { if (!response.ok) throw Error('HTTP ' + response.status); return response.json(); }),
  fetch('./data/histology-small-intestine.json', { cache: 'no-store' }).then(response => { if (!response.ok) throw Error('HTTP ' + response.status); return response.json(); }),
  fetch('./data/library.json', { cache: 'no-store' }).then(response => { if (!response.ok) throw Error('HTTP ' + response.status); return response.json(); }),
  fetch('./data/small-intestine-quiz.json', { cache: 'no-store' }).then(response => { if (!response.ok) throw Error('HTTP ' + response.status); return response.json(); }),
  fetch('./data/small-intestine-slides.json', { cache: 'no-store' }).then(response => { if (!response.ok) throw Error('HTTP ' + response.status); return response.json(); }),
  fetch('./data/gi-atlas.json', { cache: 'no-store' }).then(r=>{if(!r.ok)throw Error('GI atlas '+r.status);return r.json();}),
  fetch('./data/gi-curriculum.json', { cache: 'no-store' }).then(r=>{if(!r.ok)throw Error('GI curriculum '+r.status);return r.json();}),
  fetch('./data/gi-inline-quiz.json', { cache: 'no-store' }).then(r=>{if(!r.ok)throw Error('GI mini '+r.status);return r.json();}),
  fetch('./data/gi-final-quiz.json', { cache: 'no-store' }).then(r=>{if(!r.ok)throw Error('GI exam '+r.status);return r.json();}),
  fetch('./data/gi-workbook.json', { cache: 'no-store' }).then(r=>{if(!r.ok)throw Error('GI workbook '+r.status);return r.json();}),
  fetch('./data/gi-department-questions.json', { cache: 'no-store' }).then(r=>{if(!r.ok)throw Error('GI method questions '+r.status);return r.json();}),
  fetch('./data/gi-deep-a.json', { cache: 'no-store' }).then(r=>{if(!r.ok)throw Error('GI deep A '+r.status);return r.json();}),
  fetch('./data/gi-deep-b.json', { cache: 'no-store' }).then(r=>{if(!r.ok)throw Error('GI deep B '+r.status);return r.json();})
])
  .then(([data, lesson, atlas, subjects, intestine, library, histQuiz, slides, extraAtlas, giCourse, giMini, giExam, giMaps, giMethodQuestions, giDeepA, giDeepB]) => {
    if (!isValidBank(data)) throw new Error('Некорректный формат банка вопросов');
    if (!lesson || !Array.isArray(lesson.sections) || lesson.sections.length === 0) throw new Error('Не удалось загрузить конспект');
    if (!atlas || !Array.isArray(atlas.items) || atlas.items.length !== 6) throw new Error('Некорректный формат атласа');
    if (!subjects || !Array.isArray(subjects.subjects) || subjects.subjects.length !== 11 ||
        !Array.isArray(subjects.note_modes) || subjects.note_modes.length !== 2) {
      throw new Error('Каталог предметов повреждён');
    }
    if (!intestine || !Array.isArray(intestine.variants) ||
        intestine.variants.length !== 3 ||
        !['brief','deep'].every(key => intestine.variants.some(v => v.id === key && Array.isArray(v.sections)))) {
      throw new Error('Материал по тонкой кишке повреждён');
    }
    if (!library || library.version !== 1 || !library.subjects ||
        !Array.isArray(library.subjects['histology-cytology']?.sections) ||
        !Array.isArray(library.subjects['normal-physiology']?.sections)) {
      throw Error('Структура библиотеки повреждена');
    }
    if (!histQuiz || histQuiz.questions?.length !== 30 ||
        !slides || slides.images?.length !== 3 || extraAtlas?.version!==1 || extraAtlas.images?.length!==16 || !window.MedStudySI)
      throw Error('Новый учебный модуль по гистологии не загружен');
    if(!window.MedStudyGI||giCourse?.chapters?.length!==17||giExam?.questions?.length!==24||giMaps?.version!==2||giMaps?.maps?.length!==8 ||
      Object.values(giMini?.chapterQuestions||{}).some(x=>x.length!==3)||
      giMethodQuestions?.groups?.reduce((sum,g)=>sum+g.questions.length,0)!==56)
      throw Error('Пищеварительная система: повреждены материалы');
    giDeepBlocks=Object.assign(Object.create(null),giDeepA?.blocks,giDeepB?.blocks);
    if(giCourse.chapters.some(ch=>giDeepBlocks[ch.id]?.length!==5))
      throw Error('Не хватает подробных гистологических блоков');
    giCurriculum=giCourse;giInlineBank=giMini;giFinalBank=giExam;giWorkbook=giMaps;giDepartmentQuestions=giMethodQuestions;
    questionBank = data; lessonData = lesson; atlasData = atlas; subjectCatalog = subjects; intestineData = intestine; learningLibrary = library;
    intestineQuizBank=histQuiz;intestineSlides=slides;
    giAtlasSlides={images:[...slides.images,...extraAtlas.images]};
    progress.mistakes = progress.mistakes.filter(id => questionBank.questions.some(q => q.id === id));
    persistProgress();
    showHome();
  })
  .catch(showLoadError);
