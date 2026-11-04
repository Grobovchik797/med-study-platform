/* Med Study 1.9.9 — anatomy/cranial nerves; text-only, original educational adaptation.
 * Never mutates legacy Med Study localStorage keys. No network APIs or third-party media.
 */
(()=>{
'use strict';
const KEY='med-study-cranial-progress-v1';
const el=(tag,cls,txt)=>{
 const n=document.createElement(tag);if(cls)n.className=cls;
 if(txt!==undefined)n.textContent=String(txt);return n;
};
const button=(txt,fn,cls='cn-btn')=>{
 const b=el('button',cls,txt);b.type='button';b.addEventListener('click',fn);return b;
};
const add=(parent,...items)=>{items.forEach(x=>parent.append(x));return parent;};
function state(){
 try{
  const d=JSON.parse(localStorage.getItem(KEY)||'{}');
  if(d?.version===1&&d.chapters&&typeof d.chapters==='object'&&!Array.isArray(d.chapters))return d;
 }catch(_){}
 return {version:1,chapters:{}};
}
function readProgress(id){
 const item=state().chapters[id]||{};
 return {notes:item.notes===true,best:Number.isFinite(item.best)?Math.max(0,Math.min(100,item.best)):null};
}
function update(id,patch){
 const d=state();const before=readProgress(id);
 d.chapters[id]={...before,...patch};
 try{localStorage.setItem(KEY,JSON.stringify(d));}catch(_){}
 return d.chapters[id];
}
function paragraph(text,cls=''){return el('p',cls,text);}
function headline(host,kicker,title,subtitle,onBack){
 host.replaceChildren();
 host.append(button('← Нервная система',onBack,'cn-back'),el('div','kicker',kicker),el('h1','',title),paragraph(subtitle,'cn-intro'));
}
function source(host,source,pages){
 const block=el('aside','cn-source');
 block.append(el('strong','','Основа: учебный PDF «Черепные нервы» · страницы '+pages),
  paragraph('Самостоятельная редакционная структура по предоставленному 14-страничному материалу; исходный PDF не размещён на сайте. '+source.review));
 host.append(block);
}
function renderChapter(host,{chapter,course,onBack,onNext,onPrev,onExam}){
 if(!chapter||!course?.chapters)throw Error('Missing cranial chapter');
 let tab='brief',cardsIndex=0,cardOpen=false;
 const current=()=>readProgress(chapter.id);
 function draw(){
  headline(host,'АНАТОМИЯ · НЕРВНАЯ СИСТЕМА · '+chapter.roman+' ПАРА',chapter.title,
   'Один нерв — одна тема. Сначала прочитай опору, затем открой полный подробный материал. Ничего из расширенного разбора не скрывается и не урезается.',onBack);
  const p=current();
  const summary=el('div','cn-summary');
  summary.append(el('span','',chapter.sections.length+' смысловых блока'),el('span','',chapter.questions.length+' вопроса'),
   el('span','',chapter.cards.length+' карточки'));
  const status=el('span','cn-status',(p.notes?'Конспект изучен':'Конспект не отмечен')+
   ' · '+(p.best===null?'Тест не пройден':'Лучший тест: '+p.best+'%'));
  summary.append(status);host.append(summary);
  const tabs=el('nav','cn-tabs');tabs.setAttribute('aria-label','Режим изучения');
  for(const [id,label] of [['brief','Краткий'],['deep','Расширенный'],['cards','Карточки'],['quiz','Тест']]){
   const b=button(label,()=>{tab=id;cardOpen=false;cardsIndex=0;draw();},
    'cn-tab'+(id===tab?' is-active':''));
   b.setAttribute('aria-pressed',String(id===tab));tabs.append(b);
  }
  host.append(tabs);
  if(tab==='brief'){
   const section=el('section','card cn-panel');
   section.append(el('h2','','Главное за 2 минуты'));
   chapter.brief.forEach(x=>section.append(paragraph(x)));
   const list=el('ol','cn-outline');
   chapter.sections.forEach(s=>list.append(el('li','',s.title)));
   section.append(el('h3','','Полный разбор содержит'),list);
   section.append(button('Перейти к полному разбору →',()=>{tab='deep';draw();}));
   host.append(section);
  }else if(tab==='deep'){
   const intro=el('section','card cn-panel');intro.append(el('h2','','Полный конспект'));
   intro.append(paragraph('Все '+chapter.sections.length+' блоков ниже, без автоматического сокращения. Можно читать последовательно или открывать нужное место.'));host.append(intro);
   chapter.sections.forEach((block,i)=>{
    const sec=el('section','card cn-detail');sec.append(el('div','cn-block-counter','БЛОК '+(i+1)+' ИЗ '+chapter.sections.length),el('h2','',block.title));
    block.points.forEach(t=>sec.append(paragraph(t)));
    host.append(sec);
   });
   const actions=el('div','cn-actions');
   actions.append(button(p.notes?'✓ Отмечено изученным':'✓ Я изучил(а) этот конспект',()=>{
    update(chapter.id,{notes:true});draw();
   }));
   actions.append(button('Проверить себя →',()=>{tab='quiz';draw();},'cn-btn cn-secondary'));
   host.append(actions);
  }else if(tab==='cards'){
   const card=chapter.cards[cardsIndex];const section=el('section','card cn-card');
   section.append(el('div','cn-count','Карточка '+(cardsIndex+1)+' / '+chapter.cards.length),
     el('h2','',card.front));
   if(cardOpen)section.append(paragraph(card.back,'cn-card-answer'));
   section.append(button(cardOpen?'Скрыть ответ':'Показать ответ',()=>{cardOpen=!cardOpen;draw();}));
   const nav=el('div','cn-actions');
   nav.append(button('← Предыдущая',()=>{cardsIndex=(cardsIndex-1+chapter.cards.length)%chapter.cards.length;cardOpen=false;draw();},'cn-btn cn-secondary'),
    button('Следующая →',()=>{cardsIndex=(cardsIndex+1)%chapter.cards.length;cardOpen=false;draw();},'cn-btn cn-secondary'));
   section.append(nav);host.append(section);
  }else {
   startQuiz(host,chapter.questions,()=>{tab='brief';draw();},{id:chapter.id,heading:chapter.title});
   return;
  }
  const footer=el('div','cn-bottom-nav');
  if(onPrev)footer.append(button('← Предыдущая тема',onPrev,'cn-btn cn-secondary'));
  footer.append(button('Итоговый тест по разделу',onExam,'cn-btn cn-secondary'));
  if(onNext)footer.append(button('Следующая тема →',onNext,'cn-btn cn-secondary'));
  host.append(footer);
  source(host,course.source,chapter.pages);
 }
 draw();
}
function shuffled(items){
 const copy=[...items];for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
 return copy;
}
function startQuiz(host,questions,onBack,{id=null,heading='Черепные нервы',limit=null}={}){
 if(!Array.isArray(questions)||questions.length===0)throw Error('No cranial questions');
 let order=shuffled(questions).slice(0,limit||questions.length),index=0,score=0,chosen=null,checked=false;
 function draw(){
  host.replaceChildren();host.append(button('← К конспекту',onBack,'cn-back'));
  if(index>=order.length){
   const percent=Math.round(score/order.length*100);
   if(id)update(id,{best:Math.max(percent,readProgress(id).best??0)});
   const result=el('section','card cn-panel');
   result.append(el('div','kicker','ТЕСТ ЗАВЕРШЁН'),el('h1','',heading),
    el('p','cn-result',score+' из '+order.length+' · '+percent+'%'),
    paragraph('Вопросы использовали материал указанного конспекта. Для закрепления вернись к подробным блокам и повтори ошибочные места.'));
   result.append(button('Пройти ещё раз',()=>{order=shuffled(questions).slice(0,limit||questions.length);index=0;score=0;chosen=null;checked=false;draw();}),
    button('Вернуться к разделу',onBack,'cn-btn cn-secondary'));
   host.append(result);return;
  }
  const q=order[index];host.append(el('div','cn-count','ВОПРОС '+(index+1)+' / '+order.length),el('h1','',heading));
  const panel=el('section','card cn-panel');
  panel.append(el('h2','',q.prompt));
  const opts=el('div','cn-options');
  q.options.forEach((option,j)=>{
   const b=button(String(j+1)+'. '+option,()=>{
    if(checked)return;chosen=j;draw();
   },'cn-option'+(chosen===j?' is-selected':'')+(checked&&j===q.answer?' is-correct':'')+(checked&&chosen===j&&j!==q.answer?' is-incorrect':''));
   b.disabled=checked;b.setAttribute('aria-pressed',String(chosen===j));opts.append(b);
  });panel.append(opts);
  if(checked){
   const feedback=el('div','cn-feedback');feedback.append(el('strong','',chosen===q.answer?'Верно!':'Правильный ответ: '+q.options[q.answer]),paragraph(q.explanation));
   panel.append(feedback);
   panel.append(button(index===order.length-1?'Завершить тест':'Следующий вопрос →',()=>{index++;chosen=null;checked=false;draw();}));
  }else{
   panel.append(button('Проверить ответ',()=>{if(chosen===null)return;checked=true;if(chosen===q.answer)score++;draw();},'cn-btn'));
   if(chosen===null)panel.append(paragraph('Выбери один вариант ответа перед проверкой.','cn-muted'));
  }
  host.append(panel);
 }
 draw();
}
function renderExam(host,{course,onBack}){
 const all=course.chapters.flatMap(x=>x.questions);
 startQuiz(host,all,onBack,{heading:'Итоговая проверка по черепным нервам',limit:20});
}
window.MedStudyCranial={renderChapter,renderExam,readProgress};
})();
