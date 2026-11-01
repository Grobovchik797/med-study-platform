/* Med Study 1.5: private, browser-local departmental histology specimens.
 * Exact filenames are the owner's departmental labels. No user images are uploaded.
 * Histological cues below come from the curriculum, not verified spatial annotations.
 */
(() => {
'use strict';
const DB_NAME='medstudy-department-specimens-v1';
const STORE='images';
const MAX_BYTES=20*1024*1024;
const specimens=[
 {file:'12 ПЕРСТНАЯ КИШКА.jpg',chapters:['duodenum'],focus:['Ворсинки слизистой оболочки','Кишечные крипты','Дуоденальные железы подслизистой основы'],notice:'Железы Бруннера — важный признак двенадцатиперстной кишки. Их наличие именно в кадре следует проверить отдельно.'},
 {file:'ТОНКАЯ КИШКА.jpg',chapters:['duodenum','jejunum','ileum'],focus:['Ворсинки слизистой оболочки','Кишечные крипты','Однослойный призматический эпителий'],notice:'В кафедральном имени не указан конкретный отдел. Не называем этот снимок тощей или подвздошной кишкой без дополнительных признаков.'},
 {file:'ПИЛОРИЧЕСКАЯ ЧАСТЬ ЖЕЛУДКА.jpg',chapters:['stomach'],focus:['Желудочные ямки','Пилорические железы','Мышечная оболочка'],notice:'В выбранном поле зрения могут преобладать мышцы. Если ямки или железы не различимы, не нужно искать их угадыванием.'},
 {file:'ПОПЕРЕЧНЫЙ РАЗМЕР ПИЩЕВОДА.jpg',chapters:['esophagus'],focus:['Многослойный плоский эпителий','Слизистые железы пищевода','Мышечная оболочка'],notice:'Имя «ПОПЕРЕЧНЫЙ РАЗМЕР ПИЩЕВОДА» сохраняем дословно, как на кафедре; состав слоёв оцениваем по реально попавшему в кадр полю.'},
 {file:'ДНО ЖЕЛУДКА.jpg',chapters:['stomach','gastric-glands'],focus:['Желудочные ямки','Собственные (фундальные) железы','Главные и париетальные клетки'],notice:'Отдельные типы железистых клеток требуют достаточного увеличения. Без него не приписываем клеткам точные координаты.'},
 {file:'ТОЛСТАЯ КИШКА.jpg',chapters:['colon'],focus:['Прямые кишечные крипты','Бокаловидные клетки эпителия','Отсутствие типичных ворсинок'],notice:'Название «ТОЛСТАЯ КИШКА» — кафедральное. Детальную локализацию и клеточный состав надо проверить на самой фотографии.'},
 {file:'ПЕРЕХОД ПИЩЕВОДА В ЖЕЛУДОК.jpg',chapters:['esophagus','stomach'],focus:['Многослойный эпителий пищевода','Однослойный железистый эпителий желудка','Зона смены типа эпителия'],notice:'Переход может не помещаться целиком в одно поле зрения. Не ставим метку границы, пока она не различима достоверно.'}
];
const byName=new Map(specimens.map(x=>[x.file,x]));
const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
const btn=(txt,cb,cls='gi-button')=>{const b=el('button',cls,txt);b.type='button';b.addEventListener('click',cb);return b;};
let dbPromise;
const session=new Map();
function db(){
 if(!('indexedDB' in window))return Promise.reject(new Error('IndexedDB не поддерживается'));
 if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB_NAME,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:'name'});};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||new Error('Не удалось открыть хранилище'));
 });
 return dbPromise;
}
async function getAll(){
 try{
  const database=await db();
  const persisted=await new Promise((resolve,reject)=>{
   const tx=database.transaction(STORE,'readonly');
   const q=tx.objectStore(STORE).getAll();
   q.onsuccess=()=>resolve(q.result||[]);
   q.onerror=()=>reject(q.error);
  });
  const combined=new Map(persisted.map(x=>[x.name,x.blob]));
  for(const [name,blob] of session)combined.set(name,blob);
  return [...combined].map(([name,blob])=>({name,blob}));
 }catch{return [...session].map(([name,blob])=>({name,blob}));}
}
async function put(name,blob){
 session.set(name,blob);
 try{
  const database=await db();
  await new Promise((resolve,reject)=>{
   const tx=database.transaction(STORE,'readwrite');
   tx.objectStore(STORE).put({name,blob});
   tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });
  return true;
 }catch{return false;}
}
async function remove(name){
 session.delete(name);
 try{
  const database=await db();
  await new Promise((resolve,reject)=>{
   const tx=database.transaction(STORE,'readwrite');
   tx.objectStore(STORE).delete(name);
   tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
  });
 }catch{}
}
function render(host,{onBack,chapterId=null}={}){
 const section=el('section','dept-atlas');
 host.append(section);
 let selected=specimens.find(x=>x.chapters.includes(chapterId))?.file||specimens[0].file;
 let mode='study',records=new Map(),objectUrl=null,notice='';
 function release(){if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null;}}
 const scope=chapterId?specimens.filter(x=>x.chapters.includes(chapterId)):specimens;
 async function refresh(){const list=await getAll();records=new Map(list.map(x=>[x.name,x.blob]));paint();}
 function paint(){
  release();section.replaceChildren();
  if(onBack)section.append(btn('← Назад',onBack,'gi-back'));
  section.append(el('div','kicker','АТЛАС · КАФЕДРАЛЬНЫЕ ПРЕПАРАТЫ'),el('h1','','Кафедральные микропрепараты'));
  section.append(el('p','gi-lead','Семь названий сохранены дословно по кафедральным файлам. Снимки хранятся только в этом браузере: сайт их не отправляет и не публикует. Рядом со справочными фото из Commons эта коллекция остаётся отдельной.'));
  const privacy=el('p','dept-privacy','Можно выбрать сразу все 7 исходных JPG. Повторный выбор файла с тем же именем заменяет сохранённую в этом браузере копию. При очистке данных браузера фотографии удалятся — сохрани оригиналы.');
  section.append(privacy);
  const importer=el('div','dept-import');
  const input=el('input','dept-file-input');
  input.type='file';input.accept='.jpg,.jpeg,image/jpeg';input.multiple=true;
  input.setAttribute('aria-label','Выбрать кафедральные фотографии с исходными именами');
  input.addEventListener('change',async ()=>{
   const files=[...input.files];const messages=[];let persistent=true;
   for(const file of files){
    const name=file.name.normalize('NFC');
    if(!byName.has(name)){messages.push('Неизвестное имя: '+name);continue;}
    if(file.size>MAX_BYTES||file.size<1024||!(file.type==='image/jpeg'||/\.jpe?g$/i.test(name))){messages.push('Проверь формат или размер: '+name);continue;}
    persistent=(await put(name,file))&&persistent;
    messages.push('Добавлено: '+name);
   }
   notice=(messages.join(' · ')||'Файл не выбран')+(persistent?'':' · В этом браузере постоянное хранилище недоступно — фото останутся лишь до обновления вкладки.');
   await refresh();
  });
  importer.append(input,el('p','dept-import-hint','Выбери снимки под их исходными именами; никакие файлы не отправляются на сервер.'));
  section.append(importer);
  if(notice)section.append(el('p','dept-message',notice));
  const grid=el('div','dept-file-grid');
  for(const [i,spec] of scope.entries()){
   const card=el('button','dept-file-card'+(selected===spec.file?' active':''));card.type='button';
   card.append(el('strong','',mode==='check'?'Препарат '+(i+1):spec.file),el('small','',records.has(spec.file)?'Фото сохранено в браузере':'Фото ещё не добавлено'));
   card.addEventListener('click',()=>{selected=spec.file;mode='study';paint();});
   grid.append(card);
  }
  section.append(grid);
  const spec=byName.get(selected);
  if(!scope.includes(spec))return;
  const panel=el('section','dept-panel');
  panel.append(el('div','kicker',mode==='check'?'САМОПРОВЕРКА ПО КАФЕДРАЛЬНОМУ ПРЕПАРАТУ':'КАФЕДРАЛЬНОЕ НАЗВАНИЕ ИЗ ФАЙЛА'),el('h2','',mode==='check'?'Определи препарат по фотографии':spec.file));
  const controls=el('div','dept-modes');
  for(const [key,title] of [['study','Изучение'],['check','Самопроверка']]){
   controls.append(btn(title,()=>{mode=key;paint();},'gi-button'+(mode===key?' gi-active':' gi-light')));
  }
  panel.append(controls);
  if(records.has(selected)){
   const box=el('div','dept-image-wrap'),img=el('img','dept-image');
   objectUrl=URL.createObjectURL(records.get(selected));
   img.src=objectUrl;img.alt=mode==='check'?'Кафедральный препарат: название скрыто':'Кафедральный препарат: '+selected;img.loading='eager';
   box.append(img);panel.append(box);
   const zoom=el('input','dept-zoom');zoom.type='range';zoom.min='100';zoom.max='300';zoom.step='25';zoom.value='100';
   zoom.setAttribute('aria-label','Масштаб фотографии');
   zoom.addEventListener('input',()=>{img.style.width=zoom.value+'%';});
   panel.append(el('label','dept-zoom-label','Увеличение фото: от 100 до 300%'),zoom);
  }else{
   panel.append(el('p','dept-placeholder','Фотография ещё не выбрана в этом браузере. Нажми «Выбрать файлы» выше и выбери исходный «'+selected+'».'));
  }
  if(mode==='study'){
   panel.append(el('h3','','Что необходимо проверить на срезе по гистологии'));
   const list=el('ol','dept-cues');
   spec.focus.forEach(x=>list.append(el('li','',x)));panel.append(list);
   panel.append(el('p','dept-caution','Важно: это ориентиры из учебной гистологии, а не уже подтверждённые метки на конкретном фото. '+spec.notice));
  }else if(mode==='check'){
   const question=el('p','dept-question','Как называется этот кафедральный препарат?');
   const select=el('select','dept-answer');select.setAttribute('aria-label','Выбери название препарата');
   const empty=el('option','','Выбери название');empty.value='';select.append(empty);
   specimens.forEach(x=>{const opt=el('option','',x.file);opt.value=x.file;select.append(opt);});
   const answer=el('p','dept-feedback','');
   panel.append(question,select,btn('Проверить название',()=>{
    answer.textContent=select.value===selected?'Верно: '+selected:'Кафедральное название этого препарата: '+selected+'.';
   }),answer);
  }
  const note=el('p','dept-license',mode==='check'?'Кафедральный микропрепарат. Название скрыто до проверки ответа.':'Происхождение: кафедральный препарат по сообщению владельца. Публичное размещение исходного фото не выполняется. Формальное подтверждение права публикации и окончательная научная разметка — отдельные этапы.');
  panel.append(note);
  if(records.has(selected))panel.append(btn('Удалить локальную копию',async()=>{
   if(!window.confirm('Удалить локальную копию «'+selected+'» из этого браузера?'))return;
   await remove(selected);notice='Локальная копия удалена: '+selected;await refresh();
  },'gi-button gi-light'));
  section.append(panel);
 }
 refresh();
}
window.MedStudyDepartment={render,catalog:specimens.map(x=>({file:x.file,chapters:[...x.chapters]}))};
})();
