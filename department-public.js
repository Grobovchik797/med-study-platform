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
  if(d.version!==1||d.specimens?.length!==14||d.specimens.some(x=>!x.title||!x.frames?.length))throw Error('Некорректный список кафедральных препаратов');
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
 let active=list[0],mode='study',step=0,zoom=100;
 function redraw(){
  root.replaceChildren();
  if(onBack)root.append(btn('← Назад',onBack,'gi-back'));
  root.append(el('div','kicker','КАФЕДРАЛЬНЫЙ АТЛАС'),el('h1','','Кафедральные микропрепараты'));
  root.append(el('p','gi-lead','Названия сохранены по предоставленным кафедральным файлам. Семь исходных фотографий и семь препаратов из видео (по два реальных поля зрения). В разделе «Справочные» остаются открытые микрофотографии из Commons.'));
  const files=el('div','dept-file-grid');
  list.forEach((x,i)=>{
   const b=el('button','dept-file-card'+(x===active?' active':''));b.type='button';
   b.append(el('strong','',mode==='check'?'Препарат '+(i+1):x.title),el('small','',x.kind==='photo'?'Кафедральная фотография':'Кадры из кафедрального видео'));
   b.onclick=()=>{active=x;mode='study';step=0;zoom=100;redraw();};
   files.append(b);
  });
  root.append(files);
  const panel=el('section','dept-panel');
  panel.append(el('div','kicker',mode==='check'?'САМОПРОВЕРКА':'КАФЕДРАЛЬНЫЙ ПРЕПАРАТ'),
    el('h2','',mode==='check'?'Определи препарат по изображению':active.title));
  const modes=el('div','dept-modes');
  for(const [id,label] of [['study','Изучение'],['check','Самопроверка'],['find','Найди структуру']]){
   modes.append(btn(label,()=>{mode=id;step=0;redraw();},'gi-button'+(id===mode?' gi-active':' gi-light')));
  }
  panel.append(modes);
  const grid=el('div','dept-public-frames');
  active.frames.forEach(frame=>{
   const fig=el('figure','dept-public-figure');
   const wrap=el('div','dept-image-wrap');
   const img=el('img','dept-image');
   img.src='./'+frame.src;img.alt='Микропрепарат: '+(mode==='check'?'название скрыто':active.title);
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
   data.specimens.forEach(x=>{const opt=el('option','',x.title);opt.value=x.title;select.append(opt);});
   const feedback=el('p','dept-feedback','');
   panel.append(select,btn('Проверить ответ',()=>{
    feedback.textContent=(select.value===active.title?'Верно: ':'Правильный ответ: ')+active.title;
   }),feedback);
  }else{
   panel.append(el('p','dept-caution','На новых снимках координаты структур не подтверждены. Самостоятельно найди ориентир, затем открой описание — баллы за касание не начисляются.'));
   const question=el('p','dept-question',''),answer=el('p','dept-feedback','');
   function setPrompt(){question.textContent=step<active.cues.length?'Найди на срезе: '+active.cues[step]:'Все ориентиры разобраны.';}
   setPrompt();panel.append(question,answer,btn('Показать ориентир / следующий',()=>{
    if(step>=active.cues.length)return;
    answer.textContent='Ориентир '+(step+1)+': '+active.cues[step]+'. Сравни с тем, что реально видно на фотографии.';
    step++;setPrompt();
   }));
  }
  panel.append(el('p','dept-license','Кафедральный источник: '+active.source_filename+'. '+active.review+'. Видео представлены отдельными кадрами, без дорисовки и синтетической панорамы.'));
  root.append(panel);
 }
 redraw();
}
window.MedStudyDepartment={render,catalog};
})();
