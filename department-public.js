/* 1.6 Public departmental atlas. Original names and real microscopy frames; no synthetic annotations. */
(() => {
'use strict';
const legacy=window.MedStudyDepartment;
const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
const btn=(label,action,cls='gi-button')=>{const b=el('button',cls,label);b.type='button';b.onclick=action;return b;};
const videoCatalog=[
 {file:'ЛИСТОВИДНЫЕ СОСОЧКИ.MOV',chapters:['tongue','taste']},
 {file:'НЕБНАЯ МИНДАЛИНА.MOV',chapters:['tonsils']},
 {file:'НИТЕВИДНЫЕ СОСОЧКИ.MOV',chapters:['tongue']},
 {file:'ОКОЛОУШНАЯ ЖЕЛЕЗА.MOV',chapters:['salivary']},
 {file:'РАЗВИТИЕ ЗУБА, ОБРАЗОВАНИЕ ДЕНТИНА И ЭМАЛИ.MOV',chapters:['teeth']},
 {file:'РАЗВИТИЕ ЗУБА, ЭМАЛЕВЫЙ ОРГАН.MOV',chapters:['teeth']},
 {file:'СМЕШАННАЯ СЛЮННАЯ ЖЕЛЕЗА.MOV',chapters:['salivary']}
];
const catalog=[...legacy.catalog,...videoCatalog];
let dataPromise=null;
function load(){
 if(!dataPromise)dataPromise=fetch('./data/department-public.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(d=>{
  if(d.version!==1||d.specimens?.length!==14||d.specimens.some(x=>!x.title||!x.displayTitle||!x.frames?.length))throw Error('Некорректный список кафедральных препаратов');
  return d;
 });
 return dataPromise;
}
async function render(host,{onBack,chapterId=null}={}){
 const root=el('section','dept-atlas');
 host.append(root,el('p','note','Загружается кафедральный атлас…'));
 let data;
 try{data=await load();}catch(e){
  root.replaceChildren(el('p','note','Публичные материалы кафедры пока не загружены. Можно пользоваться прежним локальным атласом.'));
  legacy.render(root,{onBack,chapterId});return;
 }
 const list=chapterId?data.specimens.filter(x=>x.chapters.includes(chapterId)):data.specimens;
 if(!list.length){root.replaceChildren(el('p','note','Для этой главы пока нет кафедрального препарата.'));return;}
 let active=list[0],mode='study',zoom=100;
 // The drill uses authentic published frames; the order and score are session-only.
 let drillOrder=[],drillIndex=0,drillCorrect=0,drillAnswered=false;
 function startDrill(){
  drillOrder=list.slice();
  for(let i=drillOrder.length-1;i>0;i--){
   const j=Math.floor(Math.random()*(i+1));
   [drillOrder[i],drillOrder[j]]=[drillOrder[j],drillOrder[i]];
  }
  drillIndex=0;drillCorrect=0;drillAnswered=false;zoom=100;mode='drill';redraw();
 }
 function drawDrill(){
  root.append(btn('← Вернуться к атласу',()=>{mode='study';zoom=100;redraw();},'gi-button gi-light'));
  if(drillIndex>=drillOrder.length){
   const summary=el('section','dept-panel dept-drill-summary');
   summary.append(el('div','kicker','ТРЕНИРОВКА ЗАВЕРШЕНА'),
    el('h2','','Распознано '+drillCorrect+' из '+drillOrder.length),
    el('p','','Проверялось только название препарата по фотографии, без автоматической оценки отдельных структур. Результат не сохраняется и не является оценкой коллоквиума.'));
   summary.append(btn('Пройти ещё раз',startDrill,'gi-button'));
   root.append(summary);return;
  }
  const specimen=drillOrder[drillIndex];
  const panel=el('section','dept-panel dept-drill');
  panel.append(el('div','kicker','КОЛЛОКВИУМ · РАСПОЗНАВАНИЕ'),
   el('h2','','Определи препарат по изображению'),
   el('p','dept-drill-progress','Препарат '+(drillIndex+1)+' из '+drillOrder.length+' · правильно: '+drillCorrect));
  const photos=el('div','dept-public-frames');
  specimen.frames.forEach(frame=>{
   const fig=el('figure','dept-public-figure'),wrap=el('div','dept-image-wrap'),img=el('img','dept-image');
   img.src='./'+frame.src;img.alt='Микропрепарат: название скрыто';
   img.loading='lazy';img.style.width=zoom+'%';
   img.onerror=()=>{wrap.replaceChildren(el('p','dept-image-missing','Исходное изображение пока недоступно.'));};
   wrap.append(img);fig.append(wrap,el('figcaption','dept-caption',frame.label));photos.append(fig);
  });
  panel.append(photos);
  const scale=el('input','dept-zoom');scale.type='range';scale.min='100';scale.max='300';scale.step='25';scale.value=String(zoom);
  scale.setAttribute('aria-label','Увеличение фотографии в тренировке');
  scale.oninput=()=>{zoom=Number(scale.value);photos.querySelectorAll('img').forEach(img=>img.style.width=zoom+'%');};
  panel.append(el('label','dept-zoom-label','Увеличение 100–300%'),scale);
  const question=el('label','dept-drill-question','Как называется этот препарат?');
  const select=el('select','dept-answer'),empty=el('option','','Выбери название');empty.value='';select.append(empty);
  data.specimens.forEach(x=>{const opt=el('option','',x.displayTitle);opt.value=x.title;select.append(opt);});
  question.append(select);panel.append(question);
  const feedback=el('p','dept-feedback','');feedback.setAttribute('aria-live','polite');
  const check=btn('Проверить препарат',()=>{
   if(drillAnswered)return;
   if(!select.value){feedback.textContent='Сначала выбери название препарата.';return;}
   drillAnswered=true;const correct=select.value===specimen.title;
   if(correct)drillCorrect++;
   select.disabled=true;check.disabled=true;
   feedback.textContent=(correct?'Верно. ':'Неверно. ')+'Правильный ответ: '+specimen.displayTitle+'.';
   const review=el('div','dept-drill-review');
   review.append(el('h3','','Что искать на срезе'),
    el('p','dept-caution','Это ориентиры для самостоятельной проверки, а не подтверждённые метки на данном изображении.'));
   const cues=el('ol','dept-cues');specimen.cues.forEach(cue=>cues.append(el('li','',cue)));review.append(cues);
   const advance=btn(drillIndex===drillOrder.length-1?'Посмотреть результат':'Следующий препарат →',()=>{
    drillIndex++;drillAnswered=false;zoom=100;redraw();
   },'gi-button');
   review.append(advance);panel.append(review);
  });
  panel.append(check,feedback,
   el('p','dept-license','Используются исходные кафедральные фотографии и кадры видео, без синтетических подписей. Название раскрывается только после ответа.'));
  root.append(panel);
 }
 function redraw(){
  root.replaceChildren();
  if(onBack)root.append(btn('← Назад',onBack,'gi-back'));
  root.append(el('div','kicker','КАФЕДРАЛЬНЫЙ АТЛАС'),el('h1','','Кафедральные микропрепараты'));
  root.append(el('p','gi-lead','Исходные имена кафедральных файлов сохранены без изменений; подписи оформлены единообразно. Семь исходных фотографий и семь препаратов из видео (по два реальных поля зрения). В разделе «Справочные» остаются открытые микрофотографии из Commons.'));
  if(mode==='drill'){drawDrill();return;}
  root.append(btn('Тренировка: случайные препараты',startDrill,'gi-button dept-drill-launch'));
  const files=el('div','dept-file-grid');
  list.forEach((x,i)=>{
   const b=el('button','dept-file-card'+(x===active?' active':''));b.type='button';
   b.append(el('strong','',mode==='check'?'Препарат '+(i+1):x.displayTitle),el('small','',x.kind==='photo'?'Кафедральная фотография':'Кадры из кафедрального видео'));
   b.onclick=()=>{active=x;mode='study';zoom=100;redraw();};
   files.append(b);
  });
  root.append(files);
  const panel=el('section','dept-panel');
  panel.append(el('div','kicker',mode==='check'?'САМОПРОВЕРКА':'КАФЕДРАЛЬНЫЙ ПРЕПАРАТ'),
    el('h2','',mode==='check'?'Определи препарат по изображению':active.displayTitle));
  const modes=el('div','dept-modes');
  for(const [id,label] of [['study','Изучение'],['check','Самопроверка']]){
   modes.append(btn(label,()=>{mode=id;redraw();},'gi-button'+(id===mode?' gi-active':' gi-light')));
  }
  panel.append(modes);
  const grid=el('div','dept-public-frames');
  active.frames.forEach(frame=>{
   const fig=el('figure','dept-public-figure');
   const wrap=el('div','dept-image-wrap');
   const img=el('img','dept-image');
   img.src='./'+frame.src;img.alt='Микропрепарат: '+(mode==='check'?'название скрыто':active.displayTitle);
   img.loading='lazy';img.style.width=zoom+'%';
   img.onerror=()=>{wrap.replaceChildren(el('p','dept-image-missing','Исходное изображение ещё не загружено в опубликованный набор.'));};
   wrap.append(img);fig.append(wrap,el('figcaption','dept-caption',frame.label));
   grid.append(fig);
  });
  panel.append(grid);
  const magnification=el('input','dept-zoom');magnification.type='range';
  magnification.min='100';magnification.max='300';magnification.step='25';magnification.value=String(zoom);
  magnification.setAttribute('aria-label','Увеличение кафедральной микрофотографии');
  magnification.oninput=()=>{zoom=Number(magnification.value);grid.querySelectorAll('img').forEach(img=>img.style.width=zoom+'%');};
  panel.append(el('label','dept-zoom-label','Увеличение 100–300%'),magnification);
  if(mode==='study'){
   panel.append(el('h3','','Учебные ориентиры — проверь видимость на этом поле'));
   const ol=el('ol','dept-cues');active.cues.forEach(x=>ol.append(el('li','',x)));panel.append(ol);
   panel.append(el('p','dept-caution','Это диагностические ориентиры из курса, а не координаты подтверждённых клеток или тканей на данных кадрах.'));
  } else if(mode==='check'){
   panel.append(el('h3','','Как называется препарат на кафедре?'));
   const select=el('select','dept-answer'),blank=el('option','','Выбери название');blank.value='';select.append(blank);
   data.specimens.forEach(x=>{const opt=el('option','',x.displayTitle);opt.value=x.title;select.append(opt);});
   const feedback=el('p','dept-feedback','');
   panel.append(select,btn('Проверить ответ',()=>{
    feedback.textContent=(select.value===active.title?'Верно: ':'Правильный ответ: ')+active.displayTitle;
   }),feedback);
  }
  panel.append(el('p','dept-license',mode==='check'?'Кафедральный микропрепарат. Название скрыто до проверки ответа.':'Кафедральный источник: '+active.source_filename+'. '+active.review+'. Видео представлены отдельными кадрами, без дорисовки и синтетической панорамы.'));
  root.append(panel);
 }
 redraw();
}
window.MedStudyDepartment={render,catalog};
})();
