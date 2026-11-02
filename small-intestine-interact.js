/* Med Study — independent, topic-scoped small-intestine interactions.
 * Plain JavaScript to keep offline local notes and original ANS progress intact.
 */
(() => {
'use strict';
const KEY='medstudy-small-intestine-v1';
const e=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=String(text);return node;};
const add=(host,...nodes)=>{nodes.forEach(node=>host.append(node));return host;};
const btn=(text,cb,cls='si-button')=>{const b=e('button',cls,text);b.type='button';b.addEventListener('click',cb);return b;};
function read(){
  try{
    const d=JSON.parse(localStorage.getItem(KEY)||'{}');
    return {sessions:Number.isInteger(d.sessions)?d.sessions:0,
      byDifficulty:d.byDifficulty&&typeof d.byDifficulty==='object'?d.byDifficulty:{},
      missed:Array.isArray(d.missed)?d.missed.filter(x=>typeof x==='string'):[]};
  }catch{return {sessions:0,byDifficulty:{},missed:[]};}
}
function store(d){try{localStorage.setItem(KEY,JSON.stringify(d));}catch{}}
const levelName={easy:'Лёгкий',medium:'Средний',hard:'Сложный'};
function notes(source){const p=e('p','si-source-note',source||'');return p;}
function renderQuiz(host,bank,exit){
 let difficulty='easy',questions=[],index=0,correct=0,selected=null,checked=false,wrong=[];
 const root=e('section','si-workspace');host.append(root);
 function start(level,subset) {
  difficulty=level;
  questions=subset||bank.questions.filter(q=>q.difficulty===level);
  index=0;correct=0;selected=null;checked=false;wrong=[];
  question();
 }
 function chooser(){
  root.replaceChildren();add(root,e('div','kicker','ГИСТОЛОГИЯ · ТОНКАЯ КИШКА'),
   e('h1','','Проверка знаний'),e('p','si-instruction','Выбери сложность. 10 вопросов на каждый уровень, с пояснением и страницей учебного источника.'));
  const row=e('div','si-choice-row');
  for(const level of ['easy','medium','hard']){
    const n=bank.questions.filter(q=>q.difficulty===level).length;
    row.append(btn(levelName[level]+' · '+n+' вопросов',()=>start(level)));
  }
  root.append(row);
  const p=read(),info=e('div','si-info');
  add(info,e('strong','', 'История по тонкой кишке'),
      e('p','', 'Завершено тренировок: '+p.sessions+'. Ошибок для повторения: '+p.missed.length+'.'));
  root.append(info);
  const miss=bank.questions.filter(q=>p.missed.includes(q.id));
  if(miss.length){
    const m=e('div','si-choice-row');m.append(btn('Повторить ошибки · '+miss.length,()=>start('review',miss),'si-button secondary'));root.append(m);
  }
  root.append(btn('← Назад к теме',exit,'si-button secondary'));
 }
 function question(){
  if(index>=questions.length){finish();return;}
  const q=questions[index];selected=null;checked=false;root.replaceChildren();
  add(root,e('div','kicker',(levelName[difficulty]||'Повторение')+' · '+(index+1)+'/'+questions.length),
    e('h2','',q.prompt));
  const options=e('div','si-answers');
  q.options.forEach((text,i)=>{
   const label=e('label','si-answer');const radio=e('input');radio.type='radio';radio.name='si-answer';radio.value=i;radio.addEventListener('change',()=>{selected=i;});
   add(label,radio,e('span','',text));options.append(label);
  });
  root.append(options);
  const outcome=e('div','si-feedback');const buttons=e('div','si-choice-row');
  const check=btn('Проверить ответ',()=>{
    if(checked||selected===null)return;
    checked=true;const good=selected===q.answer;if(good)correct++;else wrong.push(q.id);
    options.querySelectorAll('input').forEach(x=>x.disabled=true);
    add(outcome,e('strong',good?'si-good':'si-bad',good?'Правильно!':'Неверно. Правильный ответ: '+q.options[q.answer]),
      e('p','',q.explanation),e('p','si-source-note','Из исходного материала: '+q.sourceNote));
    check.disabled=true;
    buttons.append(btn(index+1===questions.length?'Завершить':'Следующий вопрос →',()=>{index++;question();}));
  });
  buttons.append(check,btn('Выйти',chooser,'si-button secondary'));
  root.append(buttons,outcome);
 }
 function finish(){
  root.replaceChildren();
  const pct=Math.round(100*correct/questions.length),p=read();p.sessions++;
  const name=levelName[difficulty]||'Повторение';
  const prev=p.byDifficulty[difficulty]||{sessions:0,best:0};
  p.byDifficulty[difficulty]={sessions:prev.sessions+1,best:Math.max(prev.best,pct)};
  for(const q of questions){
    if(wrong.includes(q.id)){if(!p.missed.includes(q.id))p.missed.push(q.id);}
    else p.missed=p.missed.filter(id=>id!==q.id);
  }store(p);
  window.MedStudyLearning?.markMilestone('histology-small-intestine','tests');
  add(root,e('div','kicker',name),e('h1','','Результат: '+correct+' из '+questions.length),
      e('p','','Верных ответов: '+pct+'%. Ошибок на повторение: '+wrong.length+'.'),
      e('p','si-source-note','Результат сохраняется только на этом устройстве (отдельно от старого банка ВНС).'));
  const remaining=bank.questions.filter(q=>p.missed.includes(q.id));
  if(remaining.length)root.append(btn('Повторить ошибки · '+remaining.length,()=>start('review',remaining),'si-button'));
  root.append(btn('Новая тренировка',chooser),btn('К теме',exit,'si-button secondary'));
 }
 chooser();
}
function renderSlides(host,data,exit,initialIndex=0,onReviewed=null){
 const root=e('section','si-workspace');host.append(root);
 let slideIndex=initialIndex,visibleSlideIndex=initialIndex,mode='study',zoom=1,dx=0,dy=0,point=null;
 const results=read();
 function show(){
  const slide=data.images[slideIndex];
  // Keep the inspected area when switching study/find/self-check. Reset only
  // when changing to another specimen, or after pressing the explicit reset.
  if(slideIndex!==visibleSlideIndex){zoom=1;dx=0;dy=0;}
  visibleSlideIndex=slideIndex;point=null;
  root.replaceChildren();add(root,e('div','kicker','ВИРТУАЛЬНЫЕ МИКРОПРЕПАРАТЫ'),
   e('h1','','Изучение и самопроверка'),
   e('p','si-instruction','Увеличивай и перемещай реальную микрофотографию. Точечные метки есть только у проверенных областей. На остальных препаратах доступны тренировки распознавания органа и самостоятельный поиск признаков.'));
  const selectors=e('div','si-choice-row');
  const slidesSelect=e('select','si-select');slidesSelect.setAttribute('aria-label','Выбрать препарат');
  data.images.forEach((s,i)=>{const label=s.departmentTitle&&s.departmentTitle!==s.title?s.departmentTitle+' · '+s.title:s.title;const opt=e('option','',mode==='study'?label:'Препарат '+(i+1));opt.value=String(i);slidesSelect.append(opt);});
  slidesSelect.value=String(slideIndex);
  slidesSelect.addEventListener('change',()=>{slideIndex=Number(slidesSelect.value);show();});
  const study=btn('Изучение',()=>{mode='study';show();},'si-button'+(mode==='study'?' current':' secondary'));
  const check=btn('Самопроверка',()=>{mode='test';show();},'si-button'+(mode==='test'?' current':' secondary'));
  const find=btn('Найди структуру',()=>{mode='find';show();},'si-button'+(mode==='find'?' current':' secondary'));
  selectors.append(slidesSelect,study,check,find);root.append(selectors);
  root.append(e('p','si-instruction',
    mode==='study'?'Изучай название, видимые ориентиры и легенду 1/2/3. Метки на фотографии есть только там, где проверено их положение.' :
    mode==='test'?'Определи отдел кишки и подпиши отмеченные области. Названия скрыты.' :
    'Найди характерные структуры на снимке. Координаты проверяются автоматически только на препаратах с подтверждёнными метками.'));
  if(mode==='study')root.append(e('h2','',slide.title));
  const frame=e('div','si-microscope');frame.style.aspectRatio=slide.aspect;
  const surface=e('div','si-surface');
  const photo=e('img');photo.alt=mode==='study'?slide.title:'Учебный гистологический микропрепарат: определи орган';
  photo.loading='eager';photo.decoding='async';
  const loading=e('div','si-image-loading');
  add(loading,e('span','si-loading-spinner'),e('span','','Открываем препарат…'));
  frame.append(loading);
  const markLoaded=()=>{
    if(!photo.naturalWidth){markFailed();return;}
    frame.classList.remove('si-image-error');loading.remove();
  };
  const markFailed=()=>{
    frame.classList.add('si-image-error');loading.replaceChildren();
    add(loading,e('strong','','Препарат не открылся'),
      e('p','','Локальный файл не найден или повреждён. Проверь обновление приложения. Временно можно открыть оригинал автора в браузере.'),
      btn('Повторить загрузку',()=>{frame.classList.remove('si-image-error');loading.replaceChildren(e('span','si-loading-spinner'),e('span','','Повторная загрузка…'));photo.src=slide.src+'?reload='+Date.now();},'si-button secondary'));
  };
  photo.addEventListener('load',markLoaded);
  photo.addEventListener('error',markFailed);
  photo.src=slide.src;
  surface.append(photo);
  for(const ann of slide.annotations){
    if(mode==='find')continue;
    const mark=e('span','si-pin',String(ann.n));mark.style.left=ann.x+'%';mark.style.top=ann.y+'%';
    mark.title=mode==='study'?ann.label:'Структура '+ann.n;mark.setAttribute('aria-label',mark.title);surface.append(mark);
  }
  function transform(){surface.style.transform='translate('+dx+'px,'+dy+'px) scale('+zoom+')';}
  frame.addEventListener('pointerdown',event=>{
    if(event.pointerType==='mouse'&&event.button!==0)return;
    point={id:event.pointerId,x:event.clientX,y:event.clientY,dx,dy};
    frame.setPointerCapture(event.pointerId);
  });
  frame.addEventListener('pointermove',event=>{
    if(!point||point.id!==event.pointerId)return;
    dx=point.dx+event.clientX-point.x;dy=point.dy+event.clientY-point.y;transform();
  });
  function done(event){if(point?.id===event.pointerId)point=null;}
  frame.addEventListener('pointerup',done);frame.addEventListener('pointercancel',done);
  frame.addEventListener('wheel',event=>{event.preventDefault();zoom=Math.max(1,Math.min(4,zoom+(event.deltaY<0?.25:-.25)));transform();},{passive:false});
  frame.insertBefore(surface,loading);root.append(frame);transform();
  if(mode==='find'){
    frame.classList.add('si-find-mode');
    if(!slide.annotations.length){
      const targets=Array.isArray(slide.landmarks)?slide.landmarks:[];
      if(!targets.length){
        root.append(e('p','si-find-hint','На данном изображении ещё нет подтверждённых координат. Режим определения органа доступен в «Самопроверке».'));
      }else{
        let at=0;const line=e('p','si-find-hint','');
        const tip=e('p','si-find-feedback','');
        const next=btn('Показать ориентир',()=>{
          if(at>=targets.length)return;
          tip.textContent='Структура №'+(at+1)+': '+targets[at].label+'. '+targets[at].note;
          next.textContent=at+1===targets.length?'Закончить разбор':'Следующая структура →';
          at++;if(at<targets.length)line.textContent='Найди структуру №'+(at+1)+': '+targets[at].label;
          else line.textContent='Разбор завершён. Координаты не оценивались, это самопроверка по описанию.';
        },'si-button secondary');
        line.textContent='Найди структуру №1: '+targets[0].label;
        root.append(line,tip,next,e('p','si-instruction','Номера 1/2/3 пока обозначают задания, а не координаты. Коснись предполагаемой области и затем открой подсказку; без утверждённой разметки баллы не начисляются.'));
      }
    }else{
      let current=0,success=0;
      const canGrade=slide.annotations.every(ann=>ann.autoGrade!==false);
      const prompt=e('div','si-find-hint','Найди: '+slide.annotations[0].label);
      const feedback=e('div','si-find-feedback','Коснись нужной области на снимке; допускается приблизительное попадание в большую структуру.');
      root.append(prompt,feedback);
      let startPoint=null;
      frame.addEventListener('pointerdown',ev=>{
        if(ev.pointerType==='mouse'&&ev.button!==0)return;
        startPoint={id:ev.pointerId,x:ev.clientX,y:ev.clientY};
      });
      // The microscope captures the pointer for panning. Handle selection on the frame,
      // because capture retargets click events away from the scaled surface.
      frame.addEventListener('pointerup',ev=>{
        if(!startPoint||startPoint.id!==ev.pointerId)return;
        const delta=Math.hypot(ev.clientX-startPoint.x,ev.clientY-startPoint.y);
        startPoint=null;
        if(delta>12||current>=slide.annotations.length)return;
        const box=surface.getBoundingClientRect();
        if(box.width<1||box.height<1)return;
        const x=100*(ev.clientX-box.left)/box.width;
        const y=100*(ev.clientY-box.top)/box.height;
        if(x<0||x>100||y<0||y>100)return;
        const target=slide.annotations[current];
        const near=Math.abs(x-target.x)<=11&&Math.abs(y-target.y)<=11;
        if(canGrade&&near)success++;
        const mark=e('span','si-pin si-pin-revealed',String(target.n));
        mark.style.left=target.x+'%';mark.style.top=target.y+'%';
        mark.title=target.label;mark.setAttribute('aria-label','Открытый ориентир: '+target.label);
        surface.append(mark);
        feedback.textContent=(canGrade?(near?'Верно! ':'Не совсем. '):'Учебная метка без автоматических баллов. ')+
          'Ориентир, область №'+target.n+': '+target.label+'. '+target.note;
        current++;
        prompt.textContent=current<slide.annotations.length?
          'Найди: '+slide.annotations[current].label:
          (canGrade?'Готово: '+success+' из '+slide.annotations.length+'.':'Все ориентиры разобраны без автоматической оценки.')+
          ' Метки показывают приблизительные области, а не границы отдельных клеток.';
      });
    }
  }
  const controls=e('div','si-choice-row');
  controls.append(btn('＋ Увеличить',()=>{zoom=Math.min(4,zoom+.5);transform();},'si-button secondary'),
     btn('－ Уменьшить',()=>{zoom=Math.max(1,zoom-.5);transform();},'si-button secondary'),
     btn('Сбросить',()=>{zoom=1;dx=0;dy=0;transform();},'si-button secondary'));
  root.append(controls);
  if(mode==='study'){
    root.append(e('p','si-instruction',slide.description));
    if(slide.annotations.length){
      const legend=e('ol','si-legend');
      slide.annotations.forEach(ann=>{const li=e('li','',ann.label+' — '+ann.note);li.value=ann.n;legend.append(li);});root.append(legend);
    }else if(slide.landmarks?.length){
      const legend=e('ol','si-legend');
      slide.landmarks.forEach((landmark,i)=>{
        const li=e('li','',landmark.label+' — '+landmark.note);li.value=i+1;legend.append(li);
      });
      root.append(e('p','si-instruction','Учебный список структур 1/2/3: ищи эти признаки самостоятельно. Номера в списке не являются метками на самой фотографии — координаты ожидают научной проверки.'),legend);
    }else root.append(e('p','si-instruction','Пока нет подписей отдельных структур, достоверно привязанных к данному кадру. Не будем придумывать их координаты.'));
  }else if(mode==='test'){
    const form=e('div','si-test-form');
    const label=e('label','si-field','Какой орган или отдел показан на препарате?');
    const identity=e('select','si-select');identity.append(e('option','','Выбери ответ'));
    identity.firstChild.value='';
    for(const pair of [...new Map(data.images.map(x=>[x.answer,[x.answer,x.title]])).values()]){
      const o=e('option','',pair[1]);o.value=pair[0];identity.append(o);
    }
    label.append(identity);form.append(label);
    const fields=[];
    for(const ann of slide.annotations){
      const row=e('label','si-field','Структура №'+ann.n);
      const input=e('select','si-select');const empty=e('option','','Выбери название');empty.value='';input.append(empty);
      for(const name of [...slide.annotations.map(x=>x.label),'Мышечная оболочка'].sort()){
        const op=e('option','',name);op.value=name;input.append(op);
      }
      fields.push([ann,input]);row.append(input);form.append(row);
    }
    const outcome=e('div','si-feedback');
    form.append(btn('Проверить препарат и подписи',()=>{
      const idok=identity.value===slide.answer;
      const got=fields.filter(([ann,input])=>input.value===ann.label).length;
      const all=fields.length;
      outcome.replaceChildren();
      add(outcome,e('strong',idok&&got===all?'si-good':'si-bad',
        (idok?'Отдел определён правильно.':'Верный отдел: '+slide.title+'.')+
        (all?' Подписи: '+got+' из '+all+'.':' У этого кадра пока нет проверенных координат структур.')),
        e('p','',slide.description));
      if(all){const ol=e('ol','si-legend');
        for(const ann of slide.annotations){const li=e('li','',ann.label+' — '+ann.note);li.value=ann.n;ol.append(li);}outcome.append(ol);
      }
    }));form.append(outcome);root.append(form);
  }
  const by=e('div','si-credit');
  add(by,e('p','','Автор: '+slide.credit+' · '+slide.license+' · '+slide.stain),
    e('p','','Оптимизированная локальная копия микрофотографии с сохранением указанной лицензии. Источник — Wikimedia Commons. Для публикации и распространения действует конкретная лицензия автора.'));
  for(const [label,url] of [['Источник снимка',slide.source],['Условия лицензии',slide.licenseUrl]]){
    const a=e('a','',label+' ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';by.append(a);
  }
  root.append(by,notes('Фотографии включены в сборку сайта и Android APK. После первой установки сайт может показывать ранее сохранённые изображения офлайн; ссылки на первоисточники требуют интернет.'));
  if(typeof onReviewed==='function'){
   const review=btn('Я разобрал этот микропрепарат',()=>{
    onReviewed();
    review.replaceWith(e('strong','si-good','✓ Разбор препарата отмечен в плане темы'));
   },'si-button secondary');
   root.append(review);
  }
  root.append(btn('← Вернуться к теме',exit,'si-button secondary'));
 }
 show();
}

/* Optional study timer, not a claim that a whole course can be learned in 30min. */
function renderFocus(host,{topicTitle='Тонкая кишка',topicKey=null}={}) {
 const root=e('section','si-focus');
 const title=e('h2','','30 минут фокуса + 5 минут отдыха');
 const hint=e('p','si-instruction','Один цикл — один фрагмент темы «'+String(topicTitle)+'». Пауза и сброс доступны всегда; таймер не ограничивает время на конспект.');
 root.append(e('div','kicker','УЧЕБНЫЙ МАРШРУТ · ПО ЖЕЛАНИЮ'),title,hint);
 const phases=[
  {s:0,name:'Подготовка',description:'Убери лишние уведомления, выбери конкретную цель, открой нужный фрагмент.'},
  {s:120,name:'Карта темы',description:'Вспомни, какие структуры и функции уже знаешь, что нужно уточнить.'},
  {s:300,name:'Активное чтение',description:'Связывай строение с функцией. Обращай внимание на NB и пояснения в скобках.'},
  {s:900,name:'Микроскопия',description:'Посмотри схему или настоящий препарат, если он доступен; попробуй назвать структуры.'},
  {s:1260,name:'Восстановление по памяти',description:'Скрой объяснение и восстанови механизмы или признаки без подсказок.'},
  {s:1620,name:'Самопроверка',description:'Ответь на вопросы или открой карточки; отметь трудные пункты.'},
  {s:1800,name:'Перерыв',description:'Пройдись, попей воды, поменяй фокус взгляда; при желании — лёгкая разминка.'},
  {s:2100,name:'Готово',description:'Отдых завершён. Можно повторить трудный фрагмент в другое время.'}
 ];
 // Time survives opening cards/tests and revisiting the chapter, with no server.
 const key=typeof topicKey==='string'&&/^[a-z0-9-]{1,60}$/.test(topicKey)?
  'med-study-focus-'+topicKey+'-v1':null;
 let saved=null;
 if(key)try{saved=JSON.parse(localStorage.getItem(key)||'null');}catch{}
 const valid=saved&&typeof saved==='object'&&Number.isInteger(saved.elapsed)&&
  saved.elapsed>=0&&saved.elapsed<=2100&&
  Number.isFinite(saved.startedAt)&&saved.startedAt>=0&&saved.startedAt<=Date.now();
 let elapsed=valid?saved.elapsed:0,baseElapsed=elapsed,
  runningSince=valid&&saved.running?saved.startedAt:0,ticker=null;
 const digital=e('div','si-focus-clock','30:00');
 digital.setAttribute('role','timer');
 const phase=e('strong','si-focus-phase','Подготовка'),description=e('p','si-instruction','');
 const timeline=e('div','si-focus-track'),fill=e('div','si-focus-fill');timeline.append(fill);
 const controls=e('div','si-choice-row');
 const start=btn('Начать',toggle),reset=btn('Сбросить',()=>{
   halt();elapsed=0;baseElapsed=0;persist();draw();
 },'si-button secondary');
 function persist(){
  if(!key)return;
  try{localStorage.setItem(key,JSON.stringify({elapsed:baseElapsed,startedAt:runningSince,
   running:Boolean(runningSince)}));}catch{}
 }
 function halt(){
  if(ticker!==null){clearInterval(ticker);ticker=null;}
  runningSince=0;baseElapsed=elapsed;start.textContent='Продолжить';persist();
 }
 function refresh(){
  if(!runningSince)return;
  elapsed=Math.min(2100,baseElapsed+Math.floor((Date.now()-runningSince)/1000));
  if(elapsed>=2100)halt();
 }
 function tick(){
  if(!root.isConnected){if(ticker!==null)clearInterval(ticker);ticker=null;return;}
  refresh();draw();
 }
 function toggle(){
  if(runningSince){refresh();halt();draw();return;}
  if(elapsed>=2100){elapsed=0;baseElapsed=0;}
  runningSince=Date.now();baseElapsed=elapsed;persist();
  if(ticker!==null)clearInterval(ticker);
  ticker=setInterval(tick,250);
  start.textContent='Пауза';draw();
 }
 function draw(){
  const breakTime=elapsed>=1800,end=breakTime?2100:1800,remaining=end-elapsed;
  digital.textContent=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0');
  const step=[...phases].reverse().find(p=>elapsed>=p.s)||phases[0];
  phase.textContent=step.name;description.textContent=step.description;
  fill.style.width=(breakTime?(elapsed-1800)/300:elapsed/1800)*100+'%';
  root.classList.toggle('si-focus-break',breakTime);
  start.textContent=runningSince?'Пауза':elapsed===2100?'Новый цикл':elapsed>0?'Продолжить':'Начать';
 }
 controls.append(start,reset);
 add(root,digital,phase,description,timeline,controls);
 host.append(root);
 refresh();draw();
 if(runningSince)ticker=setInterval(tick,250);
}

window.MedStudySI={renderQuiz,renderSlides,renderFocus,readProgress:read};
})();
