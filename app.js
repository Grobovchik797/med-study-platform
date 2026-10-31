'use strict';

const main = document.getElementById('main-content');
const sideErrors = document.getElementById('side-errors');
const STORAGE_KEY = 'med-study-progress-v1';

let questionBank = null;
let lessonData = null;
let view = 'home';
let session = null;
let lastResult = null;
let progress = readProgress();

function readProgress() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      sessions: Number.isSafeInteger(value.sessions) && value.sessions >= 0 ? value.sessions : 0,
      best: Number.isFinite(value.best) && value.best >= 0 && value.best <= 100 ? value.best : null,
      mistakes: Array.isArray(value.mistakes) ? [...new Set(value.mistakes.filter(v => typeof v === 'string'))] : []
    };
  } catch (_error) {
    return { sessions: 0, best: null, mistakes: [] };
  }
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
    const selected = item.dataset.nav === view;
    item.classList.toggle('selected', selected);
    if (selected) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  }
  sideErrors.textContent = String(progress.mistakes.length);
}

function navigate(to) {
  view = to;
  session = null;
  updateNav();
  if (!questionBank) return;
  if (to === 'subjects') showSubjects();
  else if (to === 'lesson') showLesson();
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

function showHome() {
  view = 'home'; updateNav(); main.replaceChildren();
  main.append(titleArea('ДОБРО ПОЖАЛОВАТЬ', 'Твоя учёба — под контролем.', 'Учебные темы, тесты и повторение ошибок в одном месте. Начни с короткой тренировки и отслеживай свой прогресс.'));
  const hero = element('section', 'hero');
  const heroCopy = append(element('div', 'hero-copy'), element('div', 'kicker', 'СЕГОДНЯ МОЖНО НАЧАТЬ'), element('h2', '', 'Каждый правильный ответ — шаг вперёд.'), element('p', '', 'Выбирай тему, отвечай на вопросы и сразу узнавай, почему ответ правильный.'));
  append(hero, heroCopy, button('Изучить тему →', () => navigate('lesson'), 'hero-action'));
  main.append(hero);
  const stats = element('section', 'stats-grid');
  append(stats,
    stat('◷', progress.sessions, 'Пройдено тренировок'),
    stat('✦', progress.best === null ? '—' : progress.best + '%', 'Лучший результат'),
    stat('↺', progress.mistakes.length, 'Вопросов на повторение'));
  main.append(stats);
  const heading = append(element('div', 'section-head'), append(element('div'), element('h2', '', 'Доступные предметы'), element('p', 'section-subtitle', 'Начни обучение с первого модуля')));
  main.append(heading, subjectCard(), disclaimer());
}

function showSubjects() {
  view = 'subjects'; updateNav(); main.replaceChildren();
  main.append(titleArea('БИБЛИОТЕКА ПРЕДМЕТОВ', 'Мои предметы', 'Первый полный модуль: конспект по ВНС и 20 вопросов для тренировки. Другие предметы добавим позднее.'));
  const heading = append(element('div', 'section-head'), append(element('div'), element('h2', '', 'Первый учебный модуль'), element('p', 'section-subtitle', 'Сейчас доступна демонстрационная тема')));
  main.append(heading, subjectCard(), disclaimer());
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
  main.append(titleArea('УЧЕБНЫЙ КОНСПЕКТ', lessonData.topic, lessonData.subtitle));
  const toolbar = element('div','lesson-toolbar');
  append(toolbar, element('span','lesson-label','5 разделов · теория + примеры'),
    button('Перейти к 20 вопросам →', () => begin(questionBank.questions)));
  main.append(toolbar);
  const intro = element('div','lesson-intro');
  append(intro, element('strong','', 'О чём этот модуль'), element('p','',lessonData.intro));
  main.append(intro);
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
    append(card, element('div','lesson-takeaway',sec.takeaway));
    main.append(card);
  }
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

function showMistakes() {
  view = 'mistakes'; updateNav(); main.replaceChildren();
  main.append(titleArea('ПОВТОРЕНИЕ', 'Работа над ошибками', 'Сюда попадают вопросы, в которых ты ошибался. Когда отвечаешь верно при повторении, вопрос исчезает из списка.'));
  const questions = questionBank.questions.filter(q => progress.mistakes.includes(q.id));
  if (!questions.length) {
    const empty = element('div', 'empty');
    append(empty, element('div', 'empty-icon', '✓'), element('h2', '', 'Пока нет вопросов на повторение'), element('p', '', 'Пройди первый тест — сложные вопросы автоматически появятся здесь.'), button('Перейти к тесту →', () => begin(questionBank.questions)));
    main.append(append(element('div', 'section-actions'), empty));
  } else {
    const card = element('div', 'card');
    append(card, element('div', 'kicker', 'ПОВТОРИМ СЛОЖНОЕ'), element('h2', '', 'Осталось вопросов: ' + questions.length), element('p', 'intro', 'Пройди только те задания, в которых были ошибки. Успешный ответ удалит вопрос из повторения.'));
    append(card, append(element('div', 'section-actions'), button('Повторить ошибки →', () => begin(questions))));
    main.append(append(element('div', 'section-actions'), card));
  }
}

function breadcrumb() {
  const node = element('div', 'breadcrumb');
  append(node, button('Мои предметы', () => navigate('subjects'), ''), element('span', '', '›'), element('span', '', questionBank.topic));
  return node;
}

function begin(questions) {
  session = { questions: questions.slice(), index: 0, score: 0, answered: false, failures: [], lastAnswer: null };
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
  const top = append(element('div', 'session-top'), element('span', '', 'ВОПРОС ' + (session.index + 1) + ' ИЗ ' + session.questions.length), element('span', '', questionBank.subject));
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
    progress.mistakes = progress.mistakes.filter(id => id !== q.id);
  } else {
    session.failures.push(q);
    if (!progress.mistakes.includes(q.id)) progress.mistakes.push(q.id);
  }
  persistProgress(); updateNav();
  for (const option of options.children) {
    const id = option.dataset.optionId;
    option.disabled = true;
    if (id === q.correct_answer) option.classList.add('good');
    if (id === selectedId && !correct) option.classList.add('bad');
  }
  const feedback = element('div', 'feedback ' + (correct ? 'good' : 'bad'));
  feedback.setAttribute('role', 'status');
  append(feedback, element('strong', '', correct ? 'Верно! Отличная работа.' : 'Не совсем. Разберём правильный ответ.'), element('p', '', q.explanation));
  if (typeof q.source === 'string' && q.source.startsWith('https://www.ncbi.nlm.nih.gov/books/')) {
    const sourceLink = element('a', 'question-source', 'Источник: NCBI Bookshelf ↗');
    sourceLink.href = q.source; sourceLink.target = '_blank'; sourceLink.rel = 'noopener noreferrer';
    feedback.append(sourceLink);
  }
  const actions = element('div', 'quiz-actions');
  const next = button(session.index + 1 === session.questions.length ? 'Завершить тест →' : 'Следующий вопрос →', () => { session.index++; renderQuestion(); });
  append(actions, element('span', 'muted', 'Правильных ответов: ' + session.score), next);
  append(card, feedback, actions);
  next.focus();
}

function finishSession() {
  if (!session) return;
  const completed = session;
  session = null;
  const percent = Math.round(100 * completed.score / completed.questions.length);
  progress.sessions++;
  progress.best = progress.best === null ? percent : Math.max(progress.best, percent);
  persistProgress(); updateNav();
  lastResult = { score: completed.score, count: completed.questions.length, failures: completed.failures.slice() };
  main.replaceChildren();
  main.append(titleArea('ТРЕНИРОВКА ЗАВЕРШЕНА', 'Твой результат', 'Главное — понимать материал и регулярно возвращаться к сложным вопросам.'));
  const card = element('section', 'card');
  append(card, element('div', 'kicker', 'ГОТОВО!'), element('div', 'result-score', lastResult.score + ' / ' + lastResult.count), element('h2', '', percent + '% правильных ответов'), element('p', 'intro', lastResult.failures.length ? 'Ошибки сохранены в разделе «Работа над ошибками».' : 'Все ответы верные! Можно повторить тему или выбрать следующую.'));
  const actions = element('div', 'result-actions');
  if (lastResult.failures.length) actions.append(button('Повторить ошибки (' + lastResult.failures.length + ')', () => begin(lastResult.failures)));
  append(actions, button('Полный тест · 20 вопросов', () => begin(questionBank.questions), 'alt-button'), button('На главную', () => navigate('home'), 'alt-button'));
  append(card, actions);
  main.append(append(element('div', 'section-actions'), card), disclaimer());
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
  append(main, titleArea('ОШИБКА ЗАГРУЗКИ', 'Не удалось открыть вопросы', 'Проверь подключение или попробуй открыть приложение через веб-сервер. При открытии файла напрямую браузер может блокировать чтение JSON.'), element('p', 'note', String(error)));
}

for (const item of document.querySelectorAll('[data-nav]')) {
  item.addEventListener('click', () => navigate(item.dataset.nav));
}

Promise.all([
  fetch('./data/questions.json', { cache: 'no-store' }).then(response => { if (!response.ok) throw Error('HTTP ' + response.status); return response.json(); }),
  fetch('./data/lesson.json', { cache: 'no-store' }).then(response => { if (!response.ok) throw Error('HTTP ' + response.status); return response.json(); })
])
  .then(([data, lesson]) => {
    if (!isValidBank(data)) throw new Error('Некорректный формат банка вопросов');
    if (!lesson || !Array.isArray(lesson.sections) || lesson.sections.length === 0) throw new Error('Не удалось загрузить конспект');
    questionBank = data; lessonData = lesson;
    progress.mistakes = progress.mistakes.filter(id => questionBank.questions.some(q => q.id === id));
    persistProgress();
    showHome();
  })
  .catch(showLoadError);
