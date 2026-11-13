/* Med Study · кафедральный раздел физиологии крови. Без замены прежних конспектов.
 * Все источники из локального JSON. Markdown преобразуется в DOM без вставки произвольного HTML.
 */
(function(){
  'use strict';
  const KEY='med-study-blood-department-progress-v1';
  const n=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e;};
  const add=(el,...els)=>{els.forEach(e=>el.append(e));return el;};
  const b=(label,fn,cls='bd-button')=>{const x=n('button',cls,label);x.type='button';x.addEventListener('click',fn);return x;};
  let progress={individual:{},final:null,oral:{},practical:{}};
  try{const p=JSON.parse(localStorage.getItem(KEY)||'{}');if(p&&typeof p==='object')progress={...progress,...p};}catch(_){/* Device-specific data is optional. */}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(progress));}catch(_){}}
  function inline(el,text){
    const pattern=/(\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|`([^`\n]+)`|\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\))/g;
    let pos=0,m;
    while((m=pattern.exec(text))!==null){
      if(m.index>pos)el.append(document.createTextNode(text.slice(pos,m.index)));
      if(m[2])el.append(n('strong','',m[2]));
      else if(m[3])el.append(n('em','',m[3]));
      else if(m[4])el.append(n('code','',m[4]));
      else if(m[5]&&/^https:\/\//.test(m[6])){const a=n('a','bd-source',m[5]);a.href=m[6];a.target='_blank';a.rel='noopener noreferrer';el.append(a);}
      else el.append(document.createTextNode(m[0]));
      pos=pattern.lastIndex;
    }
    if(pos<text.length)el.append(document.createTextNode(text.slice(pos)));
    return el;
  }
  function markdown(text){
    const root=n('div','bd-markdown'),lines=String(text||'').replace(/\r\n/g,'\n').split('\n');let i=0;
    while(i<lines.length){
      let row=lines[i].trim();if(!row){i++;continue;}
      // Tables with a mandatory separator row; the last cell can contain normal punctuation.
      if(row.startsWith('|') && i+1<lines.length && /^\|?[\s:|\-]+\|?$/.test(lines[i+1].trim())){
        const table=n('table','bd-table'),parse=x=>x.trim().replace(/^\||\|$/g,'').split('|').map(y=>y.trim());
        const heads=parse(row);const thead=n('thead'),tr=n('tr');heads.forEach(h=>tr.append(inline(n('th'),h)));thead.append(tr);table.append(thead);i+=2;
        const body=n('tbody');while(i<lines.length && lines[i].trim().startsWith('|')){const tr=n('tr');parse(lines[i]).forEach(c=>tr.append(inline(n('td'),c)));body.append(tr);i++;}
        table.append(body);root.append(add(n('div','bd-table-scroll'),table));continue;
      }
      if(/^#{2,5}\s+/.test(row)){const depth=Math.min(4,(row.match(/^#+/)||['##'])[0].length);root.append(inline(n('h'+depth),row.replace(/^#{2,5}\s+/,'')));i++;continue;}
      if(/^\s*[-*]\s+/.test(lines[i])||/^\s*\d+\.\s+/.test(lines[i])){
        const ordered=/^\s*\d+\.\s+/.test(lines[i]);const list=n(ordered?'ol':'ul');
        while(i<lines.length){const item=lines[i].match(ordered?/^\s*\d+\.\s+(.*)$/:/^\s*[-*]\s+(.*)$/);if(!item)break;
          list.append(inline(n('li'),item[1]));i++;}
        root.append(list);continue;
      }
      if(/^>\s*/.test(row)){root.append(inline(n('blockquote'),row.replace(/^>\s*/,'')));i++;continue;}
      if(/^([-*_]\s*){3,}$/.test(row)){root.append(n('hr'));i++;continue;}
      const parts=[];
      while(i<lines.length && lines[i].trim() && !/^#{2,5}\s+|^\s*[-*]\s+|^\s*\d+\.\s+|^>\s*/.test(lines[i]) && !(lines[i].trim().startsWith('|') && i+1<lines.length && /^\|?[\s:|\-]+\|?$/.test(lines[i+1].trim()))){parts.push(lines[i].trim());i++;}
      if(parts.length)root.append(inline(n('p'),parts.join(' ')));else i++;
    }
    return root;
  }
  function screen(root,title,subtitle,onBack,backLabel='← Физиология крови'){
    root.replaceChildren();const page=n('div','blood-page bd-page');
    if(onBack)page.append(b(backLabel,onBack,'blood-back'));
    add(page,n('div','blood-kicker','Нормальная физиология · Кафедра'),n('h1','blood-heading',title),n('p','blood-intro',subtitle));
    root.append(page);return page;
  }
  function title(text){return n('h2','bd-section',text);}
  function warn(){return n('p','bd-warning','Учебная авторская редакция по кафедральной фотографии и лекциям. Не официальный ответник кафедры и не клиническая инструкция.');}
  function getQ(data,num){return data.questions.find(q=>q.number===Number(num));}
  function validate(data){
    if(data?.courseId!=='normal-physiology-blood-department'||data.questionCount!==25||data.questions?.length!==25||data.practicals?.length!==8||data.pediatric?.length!==3||data.finalQuestions?.length!==25)return false;
    if(data.questions.some((q,i)=>q.number!==i+1||q.id!==`blood-dept-q${String(i+1).padStart(2,'0')}`||q.answerMarkdown?.length<700||!q.additionalMarkdown||!Array.isArray(q.existingBloodTopicIds)))return false;
    const ids=new Set(),prompts=new Set();
    const check=q=>{if(!q?.id||ids.has(q.id)||!q.prompt||prompts.has(q.prompt.trim().toLowerCase())||q.options?.length!==4||!q.options.some(o=>o.id===q.correct)||!q.explanation)return false;ids.add(q.id);prompts.add(q.prompt.trim().toLowerCase());return true;};
    if(Object.keys(data.practiceQuestions||{}).length!==25||Object.values(data.practiceQuestions).some(q=>q.length!==2||!q.every(check)))return false;
    if(!data.finalQuestions.every(check)||ids.size!==75)return false;
    return true;
  }
  const GROUPS=[['Система крови и константы',1,5],['Эритроциты, гемолиз, гемоглобин',6,10],['Лейкоциты и иммунитет',11,16],['ABO, Rh и переливание',17,20],['Гемостаз, РАСК, фибринолиз',21,25]];
  function landing(root,data,handlers={},filterTopic=null){
    const matches=data.questions.filter(q=>!filterTopic||q.existingBloodTopicIds.includes(filterTopic));
    const wrapper=screen(root,filterTopic?'Кафедральные вопросы к этой теме':'Кафедральный коллоквиум · физиология крови',filterTopic?matches.length+' связанных кафедральных вопроса по полному учебному конспекту':'25 официально перечисленных вопросов методички (с.148–149) с авторскими развёрнутыми ответами',handlers.onBack);
    const nav=n('nav','bd-nav');
    if(filterTopic)nav.append(b('Все 25 вопросов',()=>landing(root,data,handlers),'bd-button'));
    nav.append(b('🎤 Устный опрос',()=>oral(root,data,handlers),'bd-button'));
    nav.append(b('🧪 8 практических навыков',()=>practicalList(root,data,handlers),'bd-button'));
    nav.append(b('👶 3 педиатрических вопроса',()=>pediatricList(root,data,handlers),'bd-button'));
    nav.append(b('📝 Кафедральный экзамен · 25',()=>finalExam(root,data,handlers),'bd-button bd-button-primary'));
    wrapper.append(nav,warn());
    if(!matches.length)wrapper.append(n('p','bd-empty','Для этой мини-темы прямых кафедральных вопросов нет. Открой весь перечень.'));
    for(const [group,start,end] of GROUPS){const subset=matches.filter(q=>q.number>=start&&q.number<=end);if(!subset.length)continue;
      wrapper.append(title(group));const grid=n('div','bd-question-grid');
      for(const q of subset){const card=n('article','bd-question-card');
        add(card,n('div','bd-question-number','ВОПРОС №'+q.number),n('h3','',q.title),n('p','',q.existingBloodTopicIds.join(' · ')+' · 2 отдельных вопроса для самопроверки'),b(progress.individual[q.number]?'Повторить ответ →':'Учить ответ →',()=>question(root,data,q.number,handlers,filterTopic)));
        grid.append(card);
      }wrapper.append(grid);
    }
    wrapper.append(referenceList(data));window.scrollTo(0,0);
  }
  function referenceList(data){const details=n('details','bd-references'),summary=n('summary','','Научные справочники и происхождение материалов');details.append(summary,n('p','',data.provenance.status));
    const list=n('ul');for(const ref of data.references){const li=n('li'),a=n('a','bd-source',ref.id+' · '+ref.title);if(!/^https:\/\//.test(ref.url))continue;a.href=ref.url;a.target='_blank';a.rel='noopener noreferrer';li.append(a);list.append(li);}details.append(list);return details;
  }
  function question(root,data,num,handlers={},filterTopic=null){const q=getQ(data,num);if(!q)return landing(root,data,handlers);
    const page=screen(root,`Вопрос №${q.number}. ${q.title}`,'Кафедральный устный ответ · материал из лекций, сверенный с научными источниками',()=>landing(root,data,handlers,filterTopic),'← Все кафедральные вопросы');
    const tabs=n('div','bd-tab-row');
    tabs.append(b('По кафедре · открыт',()=>{},'bd-tab bd-tab-active'));
    if(q.existingBloodTopicIds[0]&&handlers.onTopic)tabs.append(b('Общий конспект →',()=>handlers.onTopic(q.existingBloodTopicIds[0]),'bd-tab'));
    page.append(tabs,add(n('section','bd-answer'),title('Основной структурированный ответ'),markdown(q.answerMarkdown)));
    page.append(add(n('section','bd-additional'),title('Что добавить от себя'),markdown(q.additionalMarkdown)));
    page.append(add(n('section','bd-self'),title('Возможный дополнительный вопрос преподавателя'),markdown(q.selfCheckMarkdown)));
    page.append(n('p','bd-source-note','Основа: '+q.sourceNotes));
    const c=n('section','bd-quiz-area');add(c,title('Проверь ответ · 2 отдельных вопроса'),n('p','bd-muted','Эти вопросы не встречаются в общем кафедральном экзамене.'));
    c.append(b('Начать проверку',()=>quiz(c,data.practiceQuestions[String(num)],'Мини-тест по вопросу №'+num,score=>{progress.individual[num]={score,date:new Date().toISOString()};save();}), 'bd-button bd-button-primary'));
    page.append(c);
    const bar=n('div','bd-bottom-nav');if(num>1)bar.append(b('← №'+(num-1),()=>question(root,data,num-1,handlers)));
    if(num<25)bar.append(b('№'+(num+1)+' →',()=>question(root,data,num+1,handlers)));
    page.append(bar,warn());window.scrollTo(0,0);
  }
  function quiz(host,items,label,after,exam=false){
    host.replaceChildren();let at=0,score=0;const responses=[];
    const draw=()=>{host.replaceChildren();if(at>=items.length){
      if(after)after(score);add(host,title('Результат: '+score+' из '+items.length),n('p','bd-muted','Все вопросы разобраны. Ни один из них не совпадает с заданиями другого уровня.'));
      if(exam){for(const r of responses){const box=n('section','bd-review');box.append(n('h3','',r.q.prompt));box.append(n('p','',r.correct?'Верно':'Неверно. Правильный ответ: '+r.q.options.find(o=>o.id===r.q.correct).text));box.append(n('p','',r.q.explanation));host.append(box);}}
      host.append(b('Пройти ещё раз',()=>quiz(host,items,label,after,exam),'bd-button'));return;}
      const q=items[at],frame=n('section','bd-quiz-question'),feedback=n('div','bd-feedback');feedback.setAttribute('role','status');
      add(frame,n('div','bd-question-number',label+' · '+(at+1)+' / '+items.length),n('h3','',q.prompt));
      const choices=n('div','bd-answers');
      for(const o of q.options){choices.append(b(o.text,()=>{
        if(frame.dataset.answered)return;frame.dataset.answered='1';const ok=o.id===q.correct;if(ok)score++;responses.push({q,correct:ok});
        choices.querySelectorAll('button').forEach(button=>button.disabled=true);
        if(!exam){feedback.append(n('p',ok?'bd-correct':'bd-incorrect',ok?'Верно.':'Пока неверно.'));feedback.append(n('p','',q.explanation));}
        frame.append(b(at+1===items.length?'Завершить':'Следующий вопрос →',()=>{at++;draw();},'bd-button bd-button-primary'));
      },'bd-choice'));}
      frame.append(choices,feedback);host.append(frame);
    };draw();
  }
  function finalExam(root,data,handlers={}){const page=screen(root,'Общий кафедральный тест','25 вопросов, отдельный банк: ни один не повторяет 50 тематических проверок',()=>landing(root,data,handlers));
    const host=n('div','bd-exam'),intro=n('p','bd-muted','Выбери ответ на каждый вопрос. Правильные решения и объяснения будут показаны после завершения всего теста. Результат сохраняется отдельно от общего курса.');
    page.append(intro,b('Начать экзамен',()=>quiz(host,data.finalQuestions,'КАФЕДРАЛЬНЫЙ ЭКЗАМЕН',score=>{progress.final={score,date:new Date().toISOString()};save();},true),'bd-button bd-button-primary'),host);window.scrollTo(0,0);
  }
  function oral(root,data,handlers={}){
    const page=screen(root,'Тренажёр устного коллоквиума','Случайный вопрос без подсказки → проговори вслух → раскрой эталон → оцени себя',()=>landing(root,data,handlers));
    const host=n('div','bd-oral');page.append(host);let queue=[...data.questions];
    // Deterministic rotation avoiding dependency on randomness in teaching progress.
    const start=()=>{const pending=queue.filter(x=>!progress.oral[x.number]);if(!pending.length){queue=[...data.questions];}const current=(pending.length?pending:queue)[Math.floor(Math.random()*(pending.length||queue.length))];
      host.replaceChildren();add(host,n('div','bd-question-number','УСТНЫЙ ВОПРОС · №'+current.number),n('h2','',current.title),n('p','bd-muted','Сначала произнеси определение, основные механизмы, показатели/нормы и физиологическое значение. Затем открывай проверку.'));
      host.append(b('Показать полный ответ',()=>{
        host.querySelectorAll('button').forEach(x=>x.disabled=true);
        host.append(markdown(current.answerMarkdown),add(n('section','bd-additional'),title('Что можно добавить от себя'),markdown(current.additionalMarkdown)));
        const checks=n('div','bd-checks');checks.append(n('h3','','Самооценка ответа:'));
        const labels=['Дал определение','Объяснил механизм и функции','Назвал нужные нормы или этапы','Ответил на уточнение преподавателя'];
        const boxes=labels.map(label=>{const row=n('label','bd-check'),cb=n('input');cb.type='checkbox';row.append(cb,document.createTextNode(' '+label));checks.append(row);return cb;});
        checks.append(b('Записать результат и следующий вопрос',()=>{progress.oral[current.number]={score:boxes.filter(x=>x.checked).length,date:new Date().toISOString()};save();start();},'bd-button bd-button-primary'));host.append(checks);
      },'bd-button bd-button-primary'));
    };start();window.scrollTo(0,0);
  }
  function practicalList(root,data,handlers={}){
    const page=screen(root,'Кафедральный практикум','Все 8 навыков со страницы 149: принципы, интерпретация и учебные симуляции',()=>landing(root,data,handlers));
    page.append(n('p','bd-warning','Это только учебные задания. Лабораторные процедуры и гемотрансфузии выполняют по утверждённому протоколу под руководством специалиста.'));
    for(let i=0;i<data.practicals.length;i++){const x=data.practicals[i],card=n('article','bd-practical-card');
      add(card,n('div','bd-question-number','НАВЫК №'+(i+1)),n('h2','',x.title),n('p','',x.principle));
      const ul=n('ul');x.keyPoints.forEach(v=>ul.append(n('li','',v)));card.append(ul,n('p','bd-source-note','Основа: '+x.source));
      const area=n('div','bd-practice-task'),task=x.task;
      add(area,n('h3','','Интерактивное задание'),n('p','',task.prompt));
      const feedback=n('div','bd-feedback');feedback.setAttribute('role','status');
      const assess=value=>{const ok=task.type==='number'?Math.abs(value-task.answer)<=task.tolerance:value===task.answer;
        feedback.replaceChildren(n('p',ok?'bd-correct':'bd-incorrect',ok?'Верно.':'Неверно. '+(task.type==='number'?'Правильное значение: '+task.answer+' '+task.unit:'Правильный ответ: '+task.answer)),n('p','',task.explanation));
        if(ok){progress.practical[x.id]=true;save();}
      };
      if(task.type==='choice'){for(const v of task.options)area.append(b(v,()=>assess(v),'bd-choice'));}
      else{const input=n('input','bd-number');input.inputMode='decimal';input.placeholder='Численный ответ';area.append(input,b('Проверить',()=>{const value=Number(input.value.trim().replace(',','.'));if(input.value.trim()&&Number.isFinite(value))assess(value);else feedback.replaceChildren(n('p','bd-incorrect','Введи численное значение.'));}));}
      card.append(area,feedback);page.append(card);
    }window.scrollTo(0,0);
  }
  function pediatricList(root,data,handlers={}){
    const page=screen(root,'Дополнительно для педиатрического факультета','Три вопроса со страницы 149. Возрастные нормы не подменяются референсами взрослого.',()=>landing(root,data,handlers));
    for(let i=0;i<data.pediatric.length;i++){const q=data.pediatric[i],card=n('article','bd-pediatric');
      add(card,n('div','bd-question-number','ПЕДИАТРИЯ · ВОПРОС '+(i+1)),n('h2','',q.title),markdown(q.answerMarkdown),add(n('section','bd-additional'),n('h3','','Что добавить от себя'),markdown(q.additionalMarkdown)));
      if(q.sourceUrl?.startsWith('https://')){const a=n('a','bd-source','Сверочный медицинский источник');a.href=q.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';card.append(a);}page.append(card);
    }page.append(warn());window.scrollTo(0,0);
  }
  window.MedStudyBloodDepartment={validate,landing,question,finalExam,oral,practicalList,pediatricList,markdown};
})();