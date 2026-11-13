/* Med Study · Физиология крови · полный конспект, независимые тесты и атлас задач.
   Данные в data/physiology-blood*.json; ни одна старая статистика не изменяется. */
(function () {
  'use strict';
  const STORAGE = 'med-study-blood-progress-v1';
  const SOURCES = [
    ['Лейкоцитарная формула (MedlinePlus)', 'https://medlineplus.gov/ency/article/003657.htm'],
    ['Клинический анализ крови (NHLBI)', 'https://www.nhlbi.nih.gov/health/blood-tests'],
    ['Ретикулоциты (MedlinePlus)', 'https://medlineplus.gov/ency/article/003637.htm'],
    ['Гемостаз (Merck Manual)', 'https://www.merckmanuals.com/professional/hematology/hemostasis/overview-of-hemostasis'],
    ['Совместимость компонентов (Lifeblood)', 'https://www.lifeblood.com.au/health-professionals/products/component-compatibility'],
  ];
  const n = (tag, cls, content) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (content !== undefined) el.textContent = String(content);
    return el;
  };
  function linkButton(text, fn, cls = 'blood-btn') { const b=n('button',cls,text); b.type='button'; b.addEventListener('click',fn); return b; }
  function add(parent, ...children) { for(const child of children) parent.append(child); return parent; }
  function note(text){return n('p','blood-note',text);}
  function newProgress(){return {mini:{},topic:{},exam:[],tasks:{}};}
  function readProgress(){
    try{
      const raw=JSON.parse(localStorage.getItem(STORAGE)||'null');
      if(!raw || typeof raw!=='object')return newProgress();
      return {mini:raw.mini&&typeof raw.mini==='object'?raw.mini:{},topic:raw.topic&&typeof raw.topic==='object'?raw.topic:{},exam:Array.isArray(raw.exam)?raw.exam:[],tasks:raw.tasks&&typeof raw.tasks==='object'?raw.tasks:{}};
    }catch(_){return newProgress();}
  }
  const progress=readProgress();
  function save(){try{localStorage.setItem(STORAGE,JSON.stringify(progress));}catch(_){}}
  function showRoot(root, label, title, subtitle, onBack) {
    root.replaceChildren();
    const wrapper=n('div','blood-page');
    if(onBack) wrapper.append(linkButton('← '+label,onBack,'blood-back'));
    add(wrapper,n('div','blood-kicker','НОРМАЛЬНАЯ ФИЗИОЛОГИЯ · КРОВЬ'),n('h1','blood-heading',title),n('p','blood-intro',subtitle));
    root.append(wrapper);return wrapper;
  }
  function heading(text) {return n('h2','blood-section-title',text);}
  function findTopic(course,id){for(const track of course.tracks){for(const topic of track.topics){if(topic.id===id)return {track,topic};}}return null;}
  function allTopicIds(course){return course.tracks.flatMap(t=>t.topics.map(a=>a.id));}
  function diagram(name){
    if(!/^[\p{L}\p{N}_\-]+\.svg$/u.test(name))return note('Схема недоступна.');
    const frame=n('figure','blood-figure'), img=n('img');
    img.src='./illustrations/blood/'+encodeURIComponent(name); img.alt='Учебная русскоязычная схема '+name.replace(/\.svg$/,'').replace(/^\d+_/,'').replaceAll('_',' ');
    img.loading='lazy'; img.decoding='async';
    frame.append(img,n('figcaption','','Схема по теме · оригинальная русскоязычная учебная иллюстрация'));
    return frame;
  }
  function answerButtons(host,q,after){
    const options=n('div','blood-options'), result=n('div','blood-feedback');result.setAttribute('role','status');
    const title=n('h3','blood-question',q.prompt);
    host.append(title,options,result);
    q.options.forEach((choice,index)=>{
      const b=linkButton(String.fromCharCode(65+index)+'. '+choice,()=>{
        const ok=index===q.correctIndex;
        [...options.children].forEach((option,i)=>{option.disabled=true;if(i===q.correctIndex)option.classList.add('correct');if(i===index&&!ok)option.classList.add('wrong');});
        result.textContent=(ok?'Верно. ':'Нужно повторить. ')+q.explanation;
        result.classList.toggle('is-correct',ok);
        if(after)after(ok);
      },'blood-option');
      options.append(b);
    });
  }
  function completedMiniCount(topic){return topic.miniblocks.filter(b=>progress.mini[b.id]).length;}
  function renderTopic(root,course,topicId,handlers={}){
    const found=findTopic(course,topicId);if(!found)return;
    const {track,topic}=found;
    const wrapper=showRoot(root, 'К разделу',topic.title,track.title+' · '+topic.source+' · один полный конспект',handlers.onBack);
    const meter=n('p','blood-meter','Мини-блоки: '+completedMiniCount(topic)+' из '+topic.miniblocks.length+' · тематический тест: '+(progress.topic[topic.id]?'пройден':'впереди'));
    wrapper.append(meter);
    if(handlers.onLecture)wrapper.append(linkButton('Полная исходная лекция без сокращений →',()=>handlers.onLecture(track.id),'blood-source-button'));
    if(topic.figures?.length){const row=n('div','blood-figures');topic.figures.forEach(name=>row.append(diagram(name)));wrapper.append(row);}
    for(let i=0;i<topic.miniblocks.length;i++){
      const b=topic.miniblocks[i], section=n('section','blood-block');
      add(section,n('div','blood-block-label','МИНИ-БЛОК '+(i+1)+' / '+topic.miniblocks.length),heading(b.title));
      const textParts=b.text.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);
      for(const para of textParts)section.append(n('p','blood-text',para));
      const quiz=n('div','blood-mini'); quiz.append(n('div','blood-subtitle','МИНИ-ПРОВЕРКА · 1 ВОПРОС'));
      if(progress.mini[b.id]) quiz.append(n('p','blood-done','Уже пройдено. Можно пройти снова.'));
      answerButtons(quiz,b.check,()=>{progress.mini[b.id]=true;save();meter.textContent='Мини-блоки: '+completedMiniCount(topic)+' из '+topic.miniblocks.length+' · тематический тест: '+(progress.topic[topic.id]?'пройден':'впереди');});
      section.append(quiz);wrapper.append(section);
    }
    const testBlock=n('section','blood-topic-test');
    add(testBlock,n('div','blood-block-label','ЗАКРЕПЛЕНИЕ ТЕМЫ'),heading('Тематический тест'),note('Три новых вопроса. Ни один не повторяет мини-проверки и не встречается в общем экзамене.'));
    const buttonHost=n('div'), quizHost=n('div','blood-test-host');
    const start=()=>renderTest(quizHost,topic.topicTest,'Тест '+topic.id,score=>{progress.topic[topic.id]={score,total:topic.topicTest.length,date:new Date().toISOString()};save();meter.textContent='Мини-блоки: '+completedMiniCount(topic)+' из '+topic.miniblocks.length+' · тематический тест: пройден';});
    buttonHost.append(linkButton(progress.topic[topic.id]?'Пройти тематический тест ещё раз':'Начать тематический тест',start));
    testBlock.append(buttonHost,quizHost);wrapper.append(testBlock);
    const tasks=handlers.tasks?.filter(t=>t.topic===topic.id)||[];
    if(tasks.length)wrapper.append(add(n('section','blood-related'),heading('Закрепление в атласе задач'),note(tasks.map(t=>t.title).join(' · ')),linkButton('Открыть атлас задач →',()=>handlers.onAtlas?.(topic.id))));
    wrapper.append(add(n('p','blood-disclaimer'),'Материал предназначен для учёбы, а не самостоятельной диагностики. Референсы могут отличаться по возрасту, методу и лаборатории.'));
    window.scrollTo(0,0);
  }
  function renderTest(host,questions,title,onComplete,examMode=false){
    const answers=[];let cursor=0;
    const show=()=>{
      host.replaceChildren();
      if(cursor>=questions.length){
        const score=answers.filter((v,i)=>v===questions[i].correctIndex).length;
        host.append(heading(title+': '+score+' из '+questions.length));
        const list=n('div','blood-recap');
        questions.forEach((q,i)=>{
          const row=n('div','blood-recap-item');
          add(row,n('h4','',String(i+1)+'. '+q.prompt),n('p','',answers[i]===q.correctIndex?'Верный ответ':'Ошибка'),n('p','','Правильно: '+q.options[q.correctIndex]),n('p','',q.explanation));list.append(row);
        });
        host.append(list,linkButton('Пройти ещё раз',()=>{cursor=0;answers.length=0;show();}));
        onComplete?.(score);return;
      }
      const q=questions[cursor];host.append(n('p','blood-progress','Вопрос '+(cursor+1)+' из '+questions.length));
      const section=n('section','blood-test-question'), opts=n('div','blood-options');
      section.append(n('h3','blood-question',q.prompt),opts);
      q.options.forEach((value,index)=>{opts.append(linkButton(String.fromCharCode(65+index)+'. '+value,()=>{
        answers.push(index);cursor++;show();
      },'blood-option'));});
      host.append(section);
    };show();
  }
  function renderExam(root,questions,handlers={}){
    const wrapper=showRoot(root,'К разделу','Итоговый экзамен по физиологии крови','30 вопросов. Ни один не повторяет вопросы мини-блоков или тематических тестов. Ответы и объяснения доступны после завершения.',handlers.onBack);
    const host=n('div','blood-exam-host');wrapper.append(host);
    const launch=()=>renderTest(host,questions,'Общий экзамен',score=>{progress.exam.push({score,total:questions.length,date:new Date().toISOString()});save();},true);
    host.append(linkButton('Начать экзамен',launch));window.scrollTo(0,0);
  }
  function renderAtlas(root,tasks,handlers={},filterTopic){
    const subtitle='27 учебных упражнений: расчёты, выбор решений, последовательности. Это не инструмент клинических решений.';
    const wrapper=showRoot(root,'К разделу',filterTopic?'Задачи по теме '+filterTopic:'Атлас интерактивных задач',subtitle,handlers.onBack);
    wrapper.append(note('В заданиях с расчётами можно вводить десятичную запятую. Ответ проверяется в указанных единицах.'));
    const shown=filterTopic?tasks.filter(t=>t.topic===filterTopic):tasks;
    if(filterTopic)wrapper.append(linkButton('Показать все задачи',()=>handlers.onAll?.()));
    const count=n('p','blood-meter','Выполнено: '+shown.filter(t=>progress.tasks[t.id]).length+' из '+shown.length);wrapper.append(count);
    for(const task of shown){
      const card=n('article','blood-task');
      add(card,n('div','blood-block-label',task.id+' · '+task.type),heading(task.title),note(task.description));
      const input=n('div','blood-task-input'),feedback=n('div','blood-feedback'); feedback.setAttribute('role','status');
      const finished=(ok)=>{feedback.textContent=(ok?'Верно. ':'Проверь ещё раз. ')+task.explanation;feedback.classList.toggle('is-correct',ok);if(ok){progress.tasks[task.id]=true;save();count.textContent='Выполнено: '+shown.filter(t=>progress.tasks[t.id]).length+' из '+shown.length;}};
      if(task.type==='selection'){
        task.options.forEach(opt=>input.append(linkButton(opt,()=>finished(opt===task.answer),'blood-option')));
      }else if(task.type==='calculation'){
        const number=n('input','blood-input');number.type='text';number.inputMode='decimal';number.placeholder='Численный ответ ('+(task.unit||'')+')';
        number.setAttribute('aria-label','Ответ для задачи '+task.title);
        input.append(number,linkButton('Проверить ответ',()=>{
          const value=Number(number.value.trim().replace(',','.'));
          finished(number.value.trim()!==''&&Number.isFinite(value)&&Math.abs(value-task.answer)<=(task.tolerance??0.001));
        }));
        number.addEventListener('keydown',e=>{if(e.key==='Enter')input.querySelector('button').click();});
      }else if(task.type==='ordering'){
        const selects=[];const rows=n('div','blood-ordering');
        task.steps.forEach((_,position)=>{
          const row=n('label','blood-order-row','Шаг '+(position+1)+': '),select=n('select','blood-select');
          select.append(new Option('Выбери событие',''));
          task.steps.forEach((step,i)=>select.append(new Option(step,String(i))));
          row.append(select);rows.append(row);selects.push(select);
        });
        input.append(rows,linkButton('Проверить порядок',()=>{
          const result=selects.map(s=>s.value);
          const complete=result.every(v=>v!=='')&&new Set(result).size===result.length;
          finished(complete&&result.every((v,i)=>Number(v)===task.correctOrder[i]));
        }));
      }
      if(progress.tasks[task.id])card.append(n('p','blood-done','Ранее выполнено'));
      card.append(input,feedback);wrapper.append(card);
    }
    window.scrollTo(0,0);
  }
  function renderLecture(root,lectures,trackId,handlers={}){
    const lecture=lectures?.lectures?.[trackId];
    if(!lecture)return;
    const wrapper=showRoot(root,'К разделу','Полный исходный конспект: '+lecture.title,lecture.pageCount+' страниц исходного учебного материала. Текст сохранён по страницам без сокращения; страницы изображения не воспроизводят.',handlers.onBack);
    wrapper.append(add(n('p','blood-original-warning'),
      'АРХИВНАЯ ЛЕКЦИЯ: исходная расшифровка может содержать ошибки чисел, терминов и физиологии. Для запоминания норм и прохождения тестов используй научно уточнённые мини-блоки, а не неподтверждённые цифры из архива.'));
    lecture.pages.forEach(page=>{
      const section=n('section','blood-original-page');
      add(section,n('h2','blood-section-title','Страница '+page.page),n('div','blood-original-text',page.text));
      wrapper.append(section);
    });
    window.scrollTo(0,0);
  }
  function renderSources(root,handlers={}){
    const wrapper=showRoot(root,'К разделу','Научные источники','Референсы для уточнений и исправлений. Четыре исходных конспекта не публикуются дословно.',handlers.onBack);
    const list=n('ul','blood-source-list');
    SOURCES.forEach(([label,url])=>{const li=n('li'),a=n('a','',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';li.append(a);list.append(li);});wrapper.append(list);
  }
  function validate(course,exam,atlas){
    if(course?.schemaVersion!==1 || course.tracks?.length!==5 || course.studyModes?.join()!=='only_full_note')throw Error('Физиология крови: неправильная структура курса');
    const ids=new Set(),prompts=new Set();let minis=0,topics=0,topicTests=0;
    const check=q=>{if(!q||ids.has(q.id)||prompts.has(q.prompt)||!Array.isArray(q.options)||q.options.length!==4||!Number.isInteger(q.correctIndex)||q.correctIndex<0||q.correctIndex>3||!q.explanation)throw Error('Физиология крови: дубли или неверный тест '+q?.id);ids.add(q.id);prompts.add(q.prompt);};
    for(const track of course.tracks){for(const t of track.topics){topics++;if(t.miniblocks?.length!==2 || t.topicTest?.length!==3)throw Error('Физиология крови: неполная тема '+t.id);
      for(const b of t.miniblocks){if(!b.text||!b.title)throw Error('Физиология крови: пустой блок '+b.id);check(b.check);minis++;}
      for(const q of t.topicTest){check(q);topicTests++;}
    }}
    if(!Array.isArray(exam)||exam.length!==30)throw Error('Физиология крови: неполный экзамен');
    exam.forEach(check);
    if(topics!==36||minis!==72||topicTests!==108||ids.size!==210)throw Error('Физиология крови: неверное количество материалов');
    if(atlas?.tasks?.length!==27||new Set(atlas.tasks.map(x=>x.id)).size!==27)throw Error('Физиология крови: атлас задач повреждён');
    return true;
  }
  window.MedStudyBlood={renderTopic,renderExam,renderAtlas,renderLecture,renderSources,validate,readProgress,findTopic,allTopicIds};
})();