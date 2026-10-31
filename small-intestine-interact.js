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
  add(root,e('div','kicker',name),e('h1','','Результат: '+correct+' из '+questions.length),
      e('p','','Верных ответов: '+pct+'%. Ошибок на повторение: '+wrong.length+'.'),
      e('p','si-source-note','Результат сохраняется только на этом устройстве (отдельно от старого банка ВНС).'));
  root.append(btn('Новая тренировка',chooser),btn('К теме',exit,'si-button secondary'));
 }
 chooser();
}
function renderSlides(host,data,exit){
 const root=e('section','si-workspace');host.append(root);
 let slideIndex=0,mode='study',zoom=1,dx=0,dy=0,point=null;
 const results=read();
 function show(){
  const slide=data.images[slideIndex];zoom=1;dx=0;dy=0;point=null;
  root.replaceChildren();add(root,e('div','kicker','ВИРТУАЛЬНЫЕ МИКРОПРЕПАРАТЫ'),
   e('h1','','Изучение и самопроверка'),
   e('p','si-instruction','Увеличивай изображение кнопками или жестами, перемещай пальцем. Для проверки правильности пока использованы только надёжно различимые области.'));
  const selectors=e('div','si-choice-row');
  const slidesSelect=e('select','si-select');slidesSelect.setAttribute('aria-label','Выбрать препарат');
  data.images.forEach((s,i)=>{const opt=e('option','', 'Препарат '+(i+1));opt.value=String(i);slidesSelect.append(opt);});
  slidesSelect.value=String(slideIndex);
  slidesSelect.addEventListener('change',()=>{slideIndex=Number(slidesSelect.value);show();});
  const study=btn('Изучение',()=>{mode='study';show();},'si-button'+(mode==='study'?' current':' secondary'));
  const check=btn('Самопроверка',()=>{mode='test';show();},'si-button'+(mode==='test'?' current':' secondary'));
  selectors.append(slidesSelect,study,check);root.append(selectors);
  root.append(e('p','si-instruction',mode==='study'?'Подсказки включены. Все номера обозначают области, подтверждённые по конкретному снимку.':'Сначала определи отдел кишки; затем подпиши отмеченные области. Названия скрыты.'));
  if(mode==='study')root.append(e('h2','',slide.title));
  const frame=e('div','si-microscope');frame.style.aspectRatio=slide.aspect;
  const surface=e('div','si-surface');
  const photo=e('img');photo.src=slide.src;photo.alt=mode==='study'?slide.title:'Неизвестный гистологический препарат тонкой кишки';photo.loading='lazy';
  photo.addEventListener('error',()=>{
    frame.classList.add('si-image-error');
    if(!frame.querySelector('.si-fallback'))frame.append(e('p','si-fallback','Снимок не загрузился. Для изображений Commons нужен интернет; открой оригинал по ссылке ниже.'));
  });
  surface.append(photo);
  for(const ann of slide.annotations){
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
  frame.append(surface);root.append(frame);
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
    }else root.append(e('p','si-instruction','Пока нет подписей отдельных структур, достоверно привязанных к данному кадру. Не будем придумывать их координаты.'));
  }else{
    const form=e('div','si-test-form');
    const label=e('label','si-field','Какой это отдел тонкой кишки?');
    const identity=e('select','si-select');identity.append(e('option','','Выбери ответ'));
    identity.firstChild.value='';
    for(const pair of [['duodenum','Двенадцатиперстная'],['jejunum','Тощая'],['ileum','Подвздошная']]){
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
  add(by,e('p','','Автор: '+slide.credit+' · '+slide.license+' · '+slide.stain));
  for(const [label,url] of [['Источник снимка',slide.source],['Условия лицензии',slide.licenseUrl]]){
    const a=e('a','',label+' ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';by.append(a);
  }
  root.append(by,notes('Снимки из Wikimedia Commons загружаются через интернет. Сверенные учебные объяснения и тесты остаются отдельными материалами.'),
    btn('← Вернуться к теме',exit,'si-button secondary'));
 }
 show();
}
window.MedStudySI={renderQuiz,renderSlides,readProgress:read};
})();
