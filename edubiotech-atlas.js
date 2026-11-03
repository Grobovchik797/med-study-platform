/* Med Study 1.9.8: original EduBiotech microphotographs with author-supplied
 * pixel markers, obtained from the source Java applet with educational-use
 * permission confirmed by the project owner. Every slide retains attribution.
 * The existing licensed TEM illustrations are identified separately.
 */
(()=>{
'use strict';
const BASE='https://edubiotech.ru/images/vetfac/images/ebooks/histology/';
function el(tag,cls,txt){const node=document.createElement(tag);if(cls)node.className=cls;if(txt!==undefined)node.textContent=String(txt);return node;}
function append(node,...items){items.forEach(item=>node.append(item));return node;}
function button(text,handler,cls='gi-button gi-light'){const n=el('button',cls,text);n.type='button';n.addEventListener('click',handler);return n;}
function externalLink(url,label){
 if(typeof url!=='string'||!url.startsWith(BASE)||url.includes('..'))throw Error('Unexpected EduBiotech URL');
 const a=el('a','edu-external-link',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;
}
function localLink(url,label){
 if(!/^\.\/*photos\/edubiotech\/t(?:23|24|25)-\d{2}\.jpg$/.test(url))throw Error('Unexpected local image source');
 const a=el('a','edu-external-link',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;
}
function render(host,{data,images,course,guide,onBack,onChapter,onReference,selectedChapter=null}={}){
 if(!data||data.version!==1||!course?.chapters?.length||!guide?.cues)throw Error('Incomplete EduBiotech guide');
 const chapters=course.chapters,byId=new Map(chapters.map(c=>[c.id,c])),byTopic=new Map(data.topics.map(x=>[x.id,x]));
 const validPhotos=images?.version===1&&images.count===21&&images.labelCount===143&&Array.isArray(images.items)&&images.items.length===21;
 const photos=validPhotos?images.items:[];
 let activeMode=validPhotos?'photos':'topics',filter=selectedChapter&&byId.has(selectedChapter)?selectedChapter:'all';
 let selectedId=photos[0]?.id||null,showLabels=true,selectedMark=0;
 function matches(ids){return filter==='all'||ids.includes(filter);}
 function sourceRow(topic){
  const links=el('div','edu-links');
  links.append(externalLink(topic.url,'Открыть оригинальную тему '+topic.number+' EduBiotech'),
   externalLink(data.source.index,'Каталог источника'));
  return links;
 }
 function renderAll(){
  host.replaceChildren();
  host.append(button('← К библиотеке атласов',onBack,'gi-back'),
   el('div','kicker','МЕДИЦИНСКАЯ ГИСТОЛОГИЯ · ФОТОАТЛАС'),
   el('h1','','Препараты EduBiotech — пищеварительная система'),
   el('p','gi-lead',validPhotos?'21 оригинальная микрофотография с 143 авторскими обозначениями. Открой препарат, изучай метки и скрывай их для самопроверки.':'Архивный атлас временно показывает каталог источников — локальные фотографии недоступны.'));
  const notice=el('section','card edu-source-notice');
  notice.append(el('h2','','Источник и разрешение на учебное использование'),
   el('p','',data.source.rights),
   el('p','edu-source-credit','Авторы оригинальных изображений и обозначений: '+data.source.authors+'. Источник: '+data.source.provider+'.'));
  notice.append(externalLink(data.source.index,'Перейти к сайту EduBiotech'));host.append(notice);
  const toolbar=el('section','edu-controls');const modes=el('div','edu-modes');
  for(const [id,title] of [['photos','Препараты · 21'],['ultrastructure','Электронограммы'],['topics','Темы и источники']]){
   if(id==='photos'&&!validPhotos)continue;
   const control=button(title,()=>{activeMode=id;renderAll();},'gi-button'+(id===activeMode?'':' gi-light'));
   control.setAttribute('aria-pressed',String(activeMode===id));modes.append(control);
  }
  toolbar.append(modes);
  const label=el('label','edu-filter-label','Учебная глава');
  const select=el('select','edu-chapter-filter');select.setAttribute('aria-label','Фильтр по учебной главе');
  const all=el('option','','Все главы');all.value='all';select.append(all);
  for(const c of chapters){const opt=el('option','',c.title);opt.value=c.id;select.append(opt);}
  select.value=filter;select.addEventListener('change',()=>{filter=select.value;renderAll();});
  label.append(select);toolbar.append(label);host.append(toolbar);
  if(activeMode==='photos')renderGallery();else if(activeMode==='ultrastructure')renderUltrastructure();else renderTopicList();
  host.append(el('p','edu-footer-note',data.methodology));
 }
 function matchingPhotos(){return photos.filter(x=>matches(x.chapterIds||[x.chapterId]));}
 function renderGallery(){
  const visible=matchingPhotos();
  if(!visible.length){host.append(el('p','edu-muted','Для этой главы микрофотографии в данном источнике нет. Используй обычный атлас и конспект Med Study.'));return;}
  if(!visible.some(x=>x.id===selectedId))selectedId=visible[0].id;
  const viewerMount=el('section','edu-viewer-mount');
  host.append(viewerMount);
  function setPhoto(id,scroll=false){selectedId=id;showLabels=true;selectedMark=0;paintPhoto();if(scroll&&viewerMount.scrollIntoView)viewerMount.scrollIntoView({behavior:'smooth',block:'start'});}
  function paintPhoto(){
   viewerMount.replaceChildren();
   const item=visible.find(x=>x.id===selectedId)||visible[0];
   if(!item)return;
   const card=el('article','card edu-photo-viewer');card.dataset.photoId=item.id;
   card.append(el('div','kicker','ИСТОЧНИК · ТЕМА '+item.topic+' · '+item.width+' × '+item.height),
    el('h2','',item.title));
   const controls=el('div','edu-viewer-actions');
   controls.append(button(showLabels?'Скрыть обозначения':'Показать обозначения',()=>{showLabels=!showLabels;paintPhoto();},'gi-button'),
    button('Случайный препарат',()=>setPhoto(visible[Math.floor(Math.random()*visible.length)].id),'gi-button gi-light'));
   card.append(controls);
   const split=el('div','edu-photo-split');
   const imageBox=el('div','edu-photo-stage');
   imageBox.style.aspectRatio=item.width+' / '+item.height;
   const img=el('img','edu-original-image');img.src=item.src;img.alt='Оригинальная микрофотография EduBiotech: '+item.title;
   img.loading='eager';img.width=item.width;img.height=item.height;
   img.addEventListener('error',()=>{const warn=el('p','edu-photo-error','Изображение не загрузилось. Проверить сборку или открыть оригинал по ссылке.');imageBox.append(warn);});
   imageBox.append(img);
   if(showLabels){
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('class','edu-marker-lines');svg.setAttribute('viewBox','0 0 '+item.width+' '+item.height);
    svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
    const dots=el('div','edu-marker-layer');
    for(const [index,mark] of item.labels.entries()){
     if(mark.x2<0||mark.y2<0||mark.x2>item.width||mark.y2>item.height)continue;
     if(mark.x1!==mark.x2||mark.y1!==mark.y2){
      const line=document.createElementNS('http://www.w3.org/2000/svg','line');
      line.setAttribute('x1',mark.x1);line.setAttribute('y1',mark.y1);
      line.setAttribute('x2',mark.x2);line.setAttribute('y2',mark.y2);
      line.setAttribute('class',selectedMark===index?'is-selected':'');
      svg.append(line);
     }
     const dot=button(mark.id,()=>{selectedMark=index;paintPhoto();},'edu-marker'+(selectedMark===index?' is-selected':''));
     dot.style.left=(100*mark.x2/item.width).toFixed(3)+'%';
     dot.style.top=(100*mark.y2/item.height).toFixed(3)+'%';
     dot.title=mark.id+' — '+mark.label;dot.setAttribute('aria-label','Метка '+mark.id+': '+mark.label);
     dots.append(dot);
    }
    imageBox.append(svg,dots);
   }
   split.append(imageBox);
   const legend=el('section','edu-original-legend');
   legend.append(el('h3','','Обозначения с оригинального препарата'),
    el('p','edu-muted',showLabels?'Выбери обозначение в списке или на изображении.':'Обозначения скрыты для самопроверки. Нажми «Показать обозначения».'));
   if(showLabels){
    const list=el('ol','edu-legend-list');
    for(const [i,mark] of item.labels.entries()){
     const li=el('li','edu-legend-item');
     const b=button(mark.id+' — '+mark.label,()=>{selectedMark=i;paintPhoto();},'edu-legend-select'+(selectedMark===i?' is-selected':''));
     li.append(b);list.append(li);
    }
    legend.append(list);
    const active=item.labels[selectedMark];
    if(active)legend.append(el('p','edu-active-label','Выбрано: '+active.id+' — '+active.label));
   }
   split.append(legend);card.append(split);
   const credit=el('footer','edu-image-credit');
   credit.append(el('p','',item.sourceCredit||item.attribution));
   credit.append(externalLink(item.sourcePage,'Оригинальный препарат и обозначения на EduBiotech'),
    localLink(item.src,'Открыть фотографию в полном размере'));
   credit.append(el('p','edu-muted','Обозначения и координаты извлечены из данных авторского Java-апплета без добавления вымышленных меток.'));
   card.append(credit);viewerMount.append(card);
  }
  paintPhoto();
  const gallery=el('section','edu-photo-gallery');
  gallery.append(el('h2','','Галерея препаратов · '+visible.length));
  const cards=el('div','edu-photo-grid');
  for(const item of visible){
   const card=el('article','card edu-photo-card');card.dataset.photoId=item.id;
   const img=el('img','edu-photo-thumb');
   img.src=item.src;img.alt='Микропрепарат: '+item.title;img.loading='lazy';
   img.width=item.width;img.height=item.height;card.append(img);
   card.append(el('div','kicker','ТЕМА '+item.topic+' · '+item.labels.length+' обозначений'),el('h3','',item.title),
    button('Изучить с обозначениями',()=>setPhoto(item.id,true),'gi-button gi-light'));
   cards.append(card);
  }
  gallery.append(cards);host.append(gallery);
 }
 function renderTopicList(){
  const root=el('section','edu-topic-grid');
  for(const topic of data.topics){
   const ids=topic.chapterIds.filter(id=>matches([id]));
   if(!ids.length)continue;
   const card=el('section','card edu-topic-card');card.dataset.eduTopic=topic.id;
   card.append(el('div','kicker','АТЛАС · ТЕМА '+topic.number),el('h2','',topic.title),el('p','',topic.scope),sourceRow(topic));
   const list=el('div','edu-chapters');
   for(const id of ids){
    const chapter=byId.get(id),cue=guide.cues[id];if(!chapter||!cue)continue;
    const item=el('article','edu-chapter-item');item.dataset.chapterId=id;
    item.append(el('h3','',chapter.title),el('p','',cue.primary));
    const details=el('details','edu-cues');
    details.append(el('summary','','Диагностические признаки Med Study'),el('p','','Подтверждают: '+cue.supporting),el('p','edu-muted','Ограничение: '+cue.notProof));
    item.append(details,button('Конспект Med Study',()=>onChapter(id),'gi-button gi-light'));list.append(item);
   }
   card.append(list);root.append(card);
  }
  host.append(root);
 }
 function renderUltrastructure(){
  const root=el('section','edu-electron-list');
  root.append(el('h2','','Электронограммы и ультраструктура'),
   el('p','edu-muted','Две настоящие TEM-фотографии желудочных клеток из предыдущей версии Med Study лицензированы CC BY 4.0. Они относятся к европейскому бобру и не выдаются за снимки EduBiotech.'));
  for(const rec of data.electronograms){
   if(!matches([rec.chapterId]))continue;
   const card=el('article','card edu-electron-card');card.dataset.electronId=rec.id;
   card.append(el('h3','',rec.title),el('p','',rec.note),
    button('Открыть электронограмму в Med Study',()=>onReference(rec.referenceId),'gi-button'));
   root.append(card);
  }
  root.append(el('h2','','Учебные ориентиры по ультраструктуре'));
  for(const entry of data.ultrastructureStudy){
   if(!matches(entry.chapterIds))continue;
   const card=el('article','card edu-ultra-card');card.dataset.ultraId=entry.id;
   card.append(el('h3','',entry.title));
   const list=el('ul','edu-ultra-cues');entry.cues.forEach(s=>list.append(el('li','',s)));
   card.append(list,sourceRow(byTopic.get(entry.sourceTopic)));root.append(card);
  }
  host.append(root);
 }
 renderAll();
}
window.MedStudyEduBiotech={render};
})();
