/* Med Study 1.9.7: source-linked EduBiotech histology guide.
 * Protected third-party microscopy, electron micrographs and labels remain on
 * the original site. The brief diagnostic cues are authored in Med Study.
 * Never hotlink/mirror external images or mark unverified pixel coordinates.
 */
(()=>{
'use strict';
const BASE='https://edubiotech.ru/images/vetfac/images/ebooks/histology/';
function el(tag,cls,txt){const node=document.createElement(tag);if(cls)node.className=cls;if(txt!==undefined)node.textContent=String(txt);return node;}
function append(node,...items){items.forEach(item=>node.append(item));return node;}
function button(text,handler,cls='gi-button gi-light'){const node=el('button',cls,text);node.type='button';node.addEventListener('click',handler);return node;}
function externalLink(url,label){
 if(typeof url!=='string'||!url.startsWith(BASE)||url.includes('..'))throw Error('Unexpected external atlas link');
 const a=el('a','edu-external-link',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;
}
function render(host,{data,plates=null,course,guide,onBack,onChapter,onReference,selectedChapter=null}={}){
 if(!data||data.version!==1||!course?.chapters?.length||!guide?.cues)throw Error('Incomplete EduBiotech guide');
 const chapters=course.chapters,byId=new Map(chapters.map(ch=>[ch.id,ch])),byTopic=new Map(data.topics.map(x=>[x.id,x]));
 let activeMode=plates?.plates?.length?'originals':'slides',filter=selectedChapter&&byId.has(selectedChapter)?selectedChapter:'all';
 function renderAll(){
  host.replaceChildren();
  host.append(button('← К библиотеке атласов',onBack,'gi-back'),
    el('div','kicker','ВНЕШНИЙ ИСТОЧНИК · ГИСТОЛОГИЯ'),
    el('h1','','Атлас EduBiotech — пищеварительная система'),
    el('p','gi-lead','Навигатор по темам 23, 24 и 25 руководства-атласа Кузнецова, Мушкамбарова и Горячкиной, связанным с 17 главами Med Study.'));
  const notice=el('section','card edu-source-notice');
  notice.append(el('h2','','Источник: edubiotech.ru · учебное разрешение с атрибуцией'),
    el('p','',plates?.permission||data.source.rights),
    el('p','',plates?.plates?.length?'Загружены исходные проверенные JPG и авторские обозначения Java-атласа; в нашей разметке обозначения не придумываются.':data.source.chapterPathStatus),
    el('p','edu-source-credit','Издание: '+data.source.name+'. Авторы: '+data.source.authors+'.'));
  const index=el('div','edu-links');
  index.append(externalLink(data.source.index,'Открыть исходное руководство-атлас'),
    externalLink(data.source.contents,'Оглавление тем 23–25 (архив)'));
  notice.append(index);host.append(notice);
  const toolbar=el('section','edu-controls');
  const modes=el('div','edu-modes');
  for(const [id,title] of [['originals','Препараты с фото и обозначениями'],['slides','Карта тем'],['ultrastructure','Электронограммы и ультраструктура']]){
    const control=button(title,()=>{activeMode=id;renderAll();},'gi-button'+(id===activeMode?'':' gi-light'));
    control.setAttribute('aria-pressed',String(activeMode===id));modes.append(control);
  }
  toolbar.append(modes);
  const label=el('label','edu-filter-label','Учебная глава');
  const select=el('select','edu-chapter-filter');select.setAttribute('aria-label','Фильтр по учебной главе');
  const none=el('option','','Все 17 глав');none.value='all';select.append(none);
  for(const chapter of chapters){const o=el('option','',chapter.title);o.value=chapter.id;select.append(o);}
  select.value=filter;
  select.addEventListener('change',()=>{filter=select.value;renderAll();});
  label.append(select);toolbar.append(label);
  host.append(toolbar);
  if(activeMode==='originals')renderGallery(false);else if(activeMode==='slides')renderSlideList();else renderUltrastructure();
  host.append(el('p','edu-footer-note',data.methodology));
 }
 function matches(ids){return filter==='all'||ids.includes(filter);}
 function sourceRow(topic){
  const links=el('div','edu-links');
  links.append(externalLink(topic.url,'Перейти к теме '+topic.number+' на EduBiotech'),
    externalLink(data.source.index,'Если ссылка недоступна — открыть каталог атласа'));
  return links;
 }
 function renderSlideList(){
  const root=el('section','edu-topic-grid');
  for(const topic of data.topics){
   const ids=topic.chapterIds.filter(id=>matches([id]));
   if(!ids.length)continue;
   const card=el('section','card edu-topic-card');
   card.dataset.eduTopic=topic.id;
   card.append(el('div','kicker','ОРИГИНАЛ · ТЕМА '+topic.number),
     el('h2','',topic.title),el('p','',topic.scope),sourceRow(topic));
   const chaptersWrap=el('div','edu-chapters');
   for(const id of ids){
    const chapter=byId.get(id),cue=guide.cues[id];
    if(!chapter||!cue)continue;
    const item=el('article','edu-chapter-item');item.dataset.chapterId=id;
    item.append(el('h3','',chapter.title),
      el('p','',cue.primary));
    const details=el('details','edu-cues');
    details.append(el('summary','','Что проверять при распознавании — ориентиры Med Study'),
      el('p','','Дополнительные признаки: '+cue.supporting),
      el('p','edu-muted','Ограничение: '+cue.notProof));
    item.append(details,button('Открыть конспект Med Study',()=>onChapter(id),'gi-button gi-light'));
    chaptersWrap.append(item);
   }
   card.append(chaptersWrap);root.append(card);
  }
  if(!root.childElementCount)root.append(el('p','edu-muted','Для выбранной темы подходящего раздела не найдено.'));
  host.append(root);
 }
 function renderUltrastructure(){
  renderGallery(true);
  const root=el('section','edu-electron-list');
  root.append(el('h2','','Электронограммы: проверенные изображения'),
    el('p','edu-muted','Эти два настоящих TEM-снимка уже размещены в обычном атласе Med Study по лицензии CC BY 4.0. Они не скопированы с EduBiotech и выполнены на материале европейского бобра.'));
  let visible=0;
  for(const rec of data.electronograms){
   if(!matches([rec.chapterId]))continue;
   visible++;
   const item=el('article','card edu-electron-card');item.dataset.electronId=rec.id;
   const topic=data.topics.find(t=>t.chapterIds.includes(rec.chapterId));
   item.append(el('h3','',rec.title),el('p','',rec.note),
     button('Открыть настоящую электронограмму в Med Study',()=>onReference(rec.referenceId),'gi-button'));
   if(topic)item.append(sourceRow(topic));
   root.append(item);
  }
  root.append(el('h2','','Ультраструктура пищеварительной системы — что искать'),
    el('p','edu-muted','Это авторские учебные ориентиры Med Study для поиска соответствующих иллюстраций. Наличие отдельной электронной микрофотографии по каждому пункту на EduBiotech не проверено.'));
  let focus=0;
  for(const entry of data.ultrastructureStudy){
   if(!matches(entry.chapterIds))continue;focus++;
   const topic=byTopic.get(entry.sourceTopic);
   const item=el('article','card edu-ultra-card');item.dataset.ultraId=entry.id;
   item.append(el('h3','',entry.title));
   const list=el('ul','edu-ultra-cues');
   entry.cues.forEach(c=>list.append(el('li','',c)));
   item.append(list,sourceRow(topic));root.append(item);
  }
  if(!visible&&!focus)root.append(el('p','edu-muted','Для выбранной главы электронные микрофотографии не подтверждены. Открой страницу источника в разделе препаратов.'));
  host.append(root);
 }
 renderAll();
}
window.MedStudyEduBiotech={render};
})();
