/* Med Study: licensed EduBiotech microscopy with source-authored marker positions.
 * Original annotated positions are read from Java applet marksdata, never generated
 * from guesses or derived from other organs. No progress keys are changed here.
 */
(()=>{
"use strict";
const make=(tag,cls,text)=>{
 const n=document.createElement(tag);if(cls)n.className=cls;
 if(text!==undefined)n.textContent=String(text);return n;
};
const add=(el,...kids)=>{kids.forEach(k=>el.append(k));return el;};
const control=(label,fn,cls="gi-button gi-light")=>{
 const n=make("button",cls,label);n.type="button";n.addEventListener("click",fn);return n;
};
const sourceLink=(href,label)=>{
 const a=make("a","edu-original-link",label);a.href=href;a.target="_blank";a.rel="noopener noreferrer";return a;
};
function render(host,{data,course,onBack,onChapter,onLegacy,selectedChapter=null}={}){
 if(data?.version!==1||!Array.isArray(data.images)||!Array.isArray(course?.chapters))throw Error("Invalid original photo catalog");
 const byChapter=new Map(course.chapters.map(c=>[c.id,c]));
 let selected=selectedChapter&&byChapter.has(selectedChapter)?selectedChapter:"all";
 let active=data.images.find(i=>selected==="all"||i.chapterId===selected)?.id||data.images[0]?.id;
 let mode="study",shown=false,result="",targetIndex=0;
 const getItems=()=>data.images.filter(i=>selected==="all"||i.chapterId===selected);
 function setActive(id){active=id;mode="study";shown=false;result="";targetIndex=0;draw();}
 function draw(){
  host.replaceChildren();
  host.append(control("← В библиотеку атласов",onBack,"gi-back"),
   make("div","kicker","ОРИГИНАЛЬНЫЕ ПРЕПАРАТЫ · EDUBIOTECH"),
   make("h1","","Препараты и обозначения EduBiotech"),
   make("p","gi-lead","Фотографии и точные обозначения структур перенесены из учебного атласа с разрешения владельца, с обязательной атрибуцией каждого изображения."));
  const header=make("section","card edu-original-attribution");
  header.append(make("strong","",data.source.name),
   make("p","", "Авторы атласа: "+data.source.authors),
   make("p","",data.rightsNote));
  header.append(sourceLink(data.source.homepage,"Первоисточник: edubiotech.ru"));
  host.append(header);
  const controls=make("div","edu-original-controls");
  const filter=make("select","edu-original-chapter-filter");
  filter.setAttribute("aria-label","Выбери главу");
  const all=make("option","","Все препараты ЖКТ");all.value="all";filter.append(all);
  course.chapters.forEach(c=>{const o=make("option","",c.title);o.value=c.id;filter.append(o);});
  filter.value=selected;
  filter.addEventListener("change",()=>{
   selected=filter.value;active=getItems()[0]?.id||null;mode="study";shown=false;result="";targetIndex=0;draw();
  });
  controls.append(filter,control("К обзору и электронограммам",onLegacy));
  host.append(controls);
  const items=getItems();
  if(!items.length){host.append(make("p","edu-original-notice","Для этой обзорной главы в исходном атласе нет отдельного препарата. Можно открыть конспект или другой раздел."));return;}
  const current=items.find(i=>i.id===active)||items[0];
  const layout=make("div","edu-original-layout");
  const listing=make("section","edu-original-list");
  listing.append(make("h2","","Микропрепараты · "+items.length));
  for(const item of items){
   const card=make("button","edu-original-tile"+(item.id===current.id?" is-selected":""));
   card.type="button";card.setAttribute("aria-pressed",String(item.id===current.id));
   const thumb=make("img");thumb.src=item.image;thumb.alt="Микрофотография: "+item.title;thumb.loading="lazy";
   const label=make("span","",item.title);
   const count=make("small","",item.marks.length+" обозначений"+(item.variant==="base"?"":" · другое поле"));
   card.append(thumb,add(make("span","edu-original-tile-text"),label,count));
   card.addEventListener("click",()=>setActive(item.id));listing.append(card);
  }
  layout.append(listing);
  const study=make("section","card edu-original-study");
  study.dataset.eduImage=current.id;
  study.append(make("div","kicker","ТЕМА "+current.topic+" · "+(byChapter.get(current.chapterId)?.title||"Гистология")),
    make("h2","",current.viewerTitle),
    make("p","edu-original-filename","Оригинальный снимок · "+current.width+" × "+current.height+" · "+current.marks.length+" авторских обозначений"));
  const modes=make("div","edu-original-modes");
  for(const [value,label] of [["study","Изучение"],["check","Самопроверка"],["find","Найди структуру"]]){
   const b=control(label,()=>{mode=value;shown=false;result="";targetIndex=0;draw();},"gi-button"+(mode===value?"":" gi-light"));
   b.setAttribute("aria-pressed",String(mode===value));modes.append(b);
  }
  study.append(modes);
  const figure=make("figure","edu-original-figure");
  const image=make("img");image.src=current.image;image.alt=current.viewerTitle;
  image.width=current.width;image.height=current.height;
  image.decoding="async";
  figure.append(image);
  const markers=make("div","edu-original-markers");markers.setAttribute("aria-hidden","true");
  // Source Java applet's specified coordinate plane, converted to responsive percentages.
  const showMarkers=(mode==="study"||shown);
  if(showMarkers){
   current.marks.forEach((m,index)=>{
    const pin=make("span","edu-original-pin",String(index+1));
    pin.style.left=(m.x/current.width*100).toFixed(3)+"%";
    pin.style.top=(m.y/current.height*100).toFixed(3)+"%";
    pin.title=m.label;markers.append(pin);
   });
  }
  figure.append(markers);
  const labels=make("div","edu-original-labels");
  const sectionTitle=make("h3","","Обозначения на препарате");
  labels.append(sectionTitle);
  const list=make("ol","edu-original-structure-list");
  const hasVisible=mode==="study"||shown;
  for(const m of current.marks){
   list.append(make("li","",hasVisible?m.label:"Структура скрыта — попробуй назвать самостоятельно"));
  }
  if(current.marks.length===0)labels.append(make("p","edu-muted","В оригинальном Java-апплете обозначения для этого поля не указаны; выдумывать координаты нельзя."));
  else labels.append(list);
  if(mode==="check"){
   labels.append(control(shown?"Скрыть подписи":"Показать оригинальные обозначения",()=>{shown=!shown;draw();}));
  }
  if(mode==="find"){
   if(!current.marks.length){labels.append(make("p","edu-muted","Нечего искать: у снимка нет исходной разметки."));}
   else{
    const needle=current.marks[targetIndex%current.marks.length];
    labels.prepend(make("p","edu-original-target","Найди на снимке: "+needle.label));
    figure.classList.add("is-finding");
    image.setAttribute("role","button");
    image.setAttribute("tabindex","0");
    image.setAttribute("aria-label","Указать место структуры на микрофотографии");
    image.addEventListener("click",ev=>{
     const rect=image.getBoundingClientRect();
     if(!rect.width||!rect.height)return;
     const sx=(ev.clientX-rect.left)/rect.width*current.width;
     const sy=(ev.clientY-rect.top)/rect.height*current.height;
     const dist=Math.hypot(sx-needle.x,sy-needle.y);
     const tolerance=Math.max(40,Math.min(current.width,current.height)*.09);
     result=dist<=tolerance?"Верно, структура найдена!":"Не совпало с исходной отметкой — попробуй ещё.";
     if(dist<=tolerance){shown=true;}
     draw();
    });
    image.addEventListener("keydown",ev=>{
     if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();shown=true;result="Исходная отметка показана, попробуй найти следующую.";draw();}
    });
    labels.append(make("p","edu-original-feedback",result));
    labels.append(control("Следующая структура",()=>{
     targetIndex=(targetIndex+1)%current.marks.length;shown=false;result="";draw();
    }));
   }
  }
  study.append(figure,labels);
  const attr=make("div","edu-original-credit");
  attr.append(make("strong","","Источник: EduBiotech · "+data.source.authors),
   make("p","",current.attribution));
  attr.append(sourceLink(current.sourcePage,"Открыть оригинал с Java-разметкой"),
    sourceLink(current.sourceList,"Список препаратов темы "+current.topic));
  study.append(attr);
  if(onChapter)study.append(control("Конспект Med Study: "+(byChapter.get(current.chapterId)?.title||"тема"),()=>onChapter(current.chapterId)));
  layout.append(study);host.append(layout);
 }
 draw();
}
window.MedStudyEduBiotechOriginal={render};
})();
