/* Med Study 1.9.3 — local search and version/source-aware update journal.
 * Searches only existing loaded academic material. Nothing leaves the device.
 */
(() => {
'use strict';
const el=(tag,cls,text)=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(text!==undefined)node.textContent=String(text);
 return node;
};
const btn=(label,fn,cls='gi-button')=>{
 const node=el('button',cls,label);node.type='button';node.addEventListener('click',fn);return node;
};
const normalized=value=>String(value||'').toLocaleLowerCase('ru-RU').replace(/ё/g,'е').replace(/\s+/g,' ').trim();
const excerpt=(text,query)=>{
 const source=String(text||'').replace(/\s+/g,' ').trim();
 if(source.length<=180)return source;
 const pos=normalized(source).indexOf(normalized(query));
 const start=Math.max(0,Math.min(source.length-175,pos<0?0:pos-50));
 return (start?'…':'')+source.slice(start,start+175)+(start+175<source.length?'…':'');
};
const knownAliases={
 duodenum:'дуоденум двенадцатиперстная',
 jejunum:'тощая еюнум',
 ileum:'подвздошная илеум',
 colon:'ободочная толстая',
 stomach:'желудок',
 'gastric-glands':'фундальные железы желудка'
};
function buildSearchRecords({course,blocks,atlas,departmentCatalog}){
 const records=[];
 const add=(kind,title,text,go,id,aliases='')=>{
  if(typeof text!=='string'||!text.trim())return;
  records.push({kind,title,text,go,id,aliases,haystack:normalized([title,text,aliases].join(' '))});
 };
 for(const chapter of (course?.chapters||[])){
  const go={kind:'chapter',id:chapter.id};
  const aliases=knownAliases[chapter.id]||'';
  add('Глава',chapter.title,chapter.intro,go,chapter.id,aliases);
  for(const [name,items] of [['Краткий конспект',chapter.brief||[]],['Расширенный конспект',chapter.deep||[]]]){
   items.forEach(text=>add(name,chapter.title,text,go,chapter.id,aliases));
  }
  add('NB · обратить внимание',chapter.title,chapter.nb,go,chapter.id,aliases);
  for(const block of (blocks?.[chapter.id]||[])){
   add('Углублённый блок',chapter.title+' · '+block.title,block.text,go,chapter.id,aliases);
  }
 }
 for(const slide of (atlas?.images||[])){
  const description=[slide.title,slide.departmentTitle,slide.description,slide.diagnosticCues,slide.focus].filter(Boolean);
  const text=description.map(x=>typeof x==='string'?x:Array.isArray(x)?x.map(y=>typeof y==='string'?y:'').join(' '):'').join(' · ');
  add('Справочный препарат',slide.title,text,{kind:'atlas',id:slide.id},slide.id);
 }
 for(const spec of (departmentCatalog||[])){
  const name=String(spec.file||'').replace(/\.(mov|jpe?g)$/i,'');
  add('Кафедральный препарат',name,name,{kind:'department',id:spec.chapters?.[0]||null},name);
 }
 return records;
}
function renderSearch(host,{course,blocks,atlas,departmentCatalog,onBack,onChapter,onAtlas,onDepartment}){
 host.replaceChildren();
 host.append(btn('← К библиотеке',onBack,'gi-back'),
  el('div','kicker','ПОИСК ПО УЧЕБНЫМ МАТЕРИАЛАМ'),
  el('h1','','Найти термин или препарат'),
  el('p','gi-lead','Поиск по имеющимся 17 главам пищеварительной системы, углублённым блокам и атласам. Совпадения текстовые, не диагноз и не научная оценка; запрос никуда не отправляется.'));
 const records=buildSearchRecords({course,blocks,atlas,departmentCatalog});
 const label=el('label','study-search-label','Термин, структура или название препарата');
 const input=el('input','study-search-input');
 input.type='search';input.placeholder='Например: крипты, дуоденум, париетальные клетки';
 input.maxLength=90;input.autocomplete='off';input.setAttribute('aria-label','Поиск по учебнику');
 label.append(input);host.append(label);
 const status=el('p','study-search-status','Введите не меньше двух символов для поиска.');
 status.setAttribute('aria-live','polite');
 const results=el('div','study-search-results');
 host.append(status,results);
 function open(record){
  if(record.go.kind==='chapter')onChapter(record.go.id);
  else if(record.go.kind==='atlas')onAtlas(record.go.id);
  else onDepartment(record.go.id);
 }
 function update(){
  const query=normalized(input.value);results.replaceChildren();
  if(query.length<2){status.textContent='Введите не меньше двух символов для поиска.';return;}
  const tokens=query.split(' ').filter(Boolean);
  const matches=records.filter(record=>tokens.every(token=>record.haystack.includes(token)));
  matches.sort((a,b)=>{
   const rank=x=>normalized(x.title).includes(query)?0:x.kind==='Глава'?1:x.kind.includes('препарат')?2:3;
   return rank(a)-rank(b);
  });
  status.textContent='Найдено совпадений: '+matches.length+(matches.length>40?'. Показаны первые 40, уточни запрос.':'');
  if(!matches.length){results.append(el('p','note','По этому запросу в доступных материалах совпадений нет. Попробуй другой термин.'));return;}
  matches.slice(0,40).forEach(item=>{
   const card=el('article','card study-search-result');
   card.dataset.searchKind=item.go.kind;
   card.append(el('div','kicker',item.kind),el('h2','',item.title),el('p','',excerpt(item.text,query)),
     btn(item.go.kind==='chapter'?'Открыть главу →':item.go.kind==='atlas'?'Открыть препарат →':'Открыть кафедральный атлас →',
      ()=>open(item),'gi-button gi-light'));
   results.append(card);
  });
 }
 input.addEventListener('input',update);
 input.focus();
}
function renderJournal(host,{journal,onBack}){
 host.replaceChildren();
 host.append(btn('← На главную',onBack,'gi-back'),
  el('div','kicker','ПРОЗРАЧНОСТЬ РАЗРАБОТКИ'),
  el('h1','','Что нового в Med Study'),
  el('p','gi-lead','Здесь отдельно учитываются изменения функций и научные дополнения. Отсутствие нового материала в лекции само по себе не означает ошибку курса.'));
 const controls=el('div','study-journal-filters');
 const list=el('div','study-journal-entries');
 const note=el('p','note',journal.scientificNote||'');
 let filter='all';
 for(const [key,label] of [['all','Все изменения'],['feature','Функции и интерфейс'],['science','Научные дополнения']]){
  const b=btn(label,()=>{filter=key;draw();},'gi-button gi-light');
  b.dataset.journalFilter=key;
  controls.append(b);
 }
 function draw(){
  for(const b of controls.querySelectorAll('button')){
   b.classList.toggle('gi-active',b.dataset.journalFilter===filter);
   b.setAttribute('aria-pressed',String(b.dataset.journalFilter===filter));
  }
  list.replaceChildren();
  const rows=(journal.entries||[]).filter(x=>filter==='all'||x.category===filter);
  const science=(journal.scientificChanges||[]).map(x=>({...x,category:'science'}));
  const entries=filter==='science'?science:filter==='feature'?rows:[...rows,...science];
  if(!entries.length){list.append(el('p','note','Проверенных научных дополнений пока нет. После сверки лекций они появятся здесь с указанием источников и даты.'));return;}
  for(const item of entries){
   const card=el('article','card study-journal-item');
   const date=item.date+' · '+(item.version||'Учебные материалы');
   card.append(el('div','kicker',item.category==='science'?'НАУЧНЫЙ МАТЕРИАЛ':'ФУНКЦИОНАЛЬНОСТЬ'),
    el('h2','',item.title),el('p','study-journal-date',date));
   const changes=el('ul');
   (item.changes||[]).forEach(change=>changes.append(el('li','',change)));
   card.append(changes,el('p','study-journal-review',item.verification||item.reviewStatus||'Не указано'));
   if(typeof item.source==='string'&&/^https:\/\/github\.com\/Grobovchik797\//.test(item.source)){
    const link=el('a','study-journal-source','История изменения в GitHub');
    link.href=item.source;link.target='_blank';link.rel='noopener noreferrer';card.append(link);
   }
   list.append(card);
  }
 }
 host.append(controls,list,note);draw();
}
window.MedStudyTools={renderSearch,renderJournal,buildSearchRecords};
})();