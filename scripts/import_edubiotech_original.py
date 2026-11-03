#!/usr/bin/env python3
"""Import only licensed-for-study digestive specimens from EduBiotech's source archive.

The owner confirmed permission to redistribute these teaching assets provided
EduBiotech is credited. Original JPEG bytes and author-provided Java applet
marksdata are preserved. No inferred annotations are added.
"""
from __future__ import annotations
from bs4 import BeautifulSoup
from collections import deque
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.parse import urljoin,urlparse
import hashlib,json,re,time,io
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
BASE="https://edubiotech.ru/images/vetfac/images/ebooks/histology/histology/"
OUTPUT=ROOT/"photos"/"edubiotech"
CATALOG=ROOT/"data"/"gi-edubiotech-original.json"
TOPICS={
 23:["tongue","salivary","salivary","tonsils","teeth","teeth","teeth","teeth","esophagus"],
 24:["stomach","esophagus","gastric-glands","jejunum","jejunum","duodenum"],
 25:["colon","colon","liver","liver","liver","pancreas"]
}
SOURCE={"name":"EduBiotech — Руководство-атлас по гистологии, цитологии и эмбриологии",
 "authors":"С. Л. Кузнецов, Н. Н. Мушкамбаров, В. Л. Горячкина",
 "credit":"Использовано с разрешения для учебных целей; источник: edubiotech.ru",
 "homepage":"https://edubiotech.ru/images/vetfac/images/ebooks/histology/index.htm"}
USER_AGENT="MedStudy/1.9.8 (educational reuse permitted, full source attribution)"
def fetch(url,max_bytes=2_000_000):
 if not url.startswith(BASE): raise ValueError("Refuse non-source URL: "+url)
 last=None
 for attempt in range(3):
  try:
   with urlopen(Request(url,headers={"User-Agent":USER_AGENT,"Accept":"*/*"}),timeout=18) as resp:
    content=resp.read(max_bytes+1)
    if len(content)>max_bytes:raise ValueError("Asset exceeds size limit")
    if not content:raise ValueError("Empty source data")
    return content
  except Exception as exc:
   last=exc
   if attempt<2:time.sleep(1.5*(attempt+1))
 raise last
def soup(url):
 raw=fetch(url)
 return BeautifulSoup(raw.decode("windows-1251",errors="replace"),"html.parser")
def title_text(node):
 return " ".join(node.get_text(" ",strip=True).split())
def marks(value,count):
 vals=value.split(";");result=[]
 for i in range(0,len(vals)-5,6):
  fields=vals[i:i+6]
  if not fields[5].strip():continue
  try:
   x1,y1,x2,y2=map(int,fields[1:5])
  except ValueError: continue
  result.append({"number":fields[0].strip(),"x":x1,"y":y1,
                 "toX":x2,"toY":y2,"label":fields[5].strip()})
 if len(result)!=count:
  print("WARNING marker mismatch: expected",count,"got",len(result),"rawLen",len(value))
 return result
def parse_viewer(url):
 doc=soup(url)
 app=doc.find("applet")
 if not app:return None
 params={e.get("name","").lower():e.get("value","") for e in app.find_all("param")}
 name=params.get("imgsrc","")
 if not name:return None
 image_url=urljoin(url,name)
 if not image_url.startswith(BASE+"samples/"):raise ValueError("Unexpected source photograph URL: "+image_url)
 w=int(app.get("width",0));h=int(app.get("height",0))
 if w<80 or h<80 or w>2500 or h>2500:
  print("SKIP nonstandard applet viewport",url,w,h,flush=True);return None
 count=int(params.get("markcount",0))
 annotations=marks(params.get("marksdata",""),count)
 page_title=title_text(doc.title) if doc.title else title_text(doc.find("b") or doc)
 variants=[]
 for a in doc.find_all("a",href=True):
  text=title_text(a).lower();href=urljoin(url,a["href"])
  if (("увеличение" in text or "поле зрения" in text or "электрон" in text) and
      href.startswith(BASE+"r5/images/") and href.endswith(".html") and href!=url):
   variants.append(href)
 return {"sourcePage":url,"imageSource":image_url,"title":page_title,
   "width":w,"height":h,"declaredMarks":count,"marks":annotations,"variants":list(dict.fromkeys(variants))}
def gallery_rows(topic):
 list_url=BASE+f"r5/s{topic}lst.html"
 page=soup(list_url);rows=[]
 for tr in (page.find("table",attrs={"border":"2"}) or page).find_all("tr"):
  link=tr.select_one('a[href^="images/"][href$=".html"]')
  if not link:continue
  detail=urljoin(list_url,link["href"])
  if not detail.startswith(BASE+"r5/images/"):continue
  name=title_text(tr.find("td") or tr)
  if not name:continue
  rows.append({"title":name,"page":detail})
 return list_url,rows
def import_all():
 OUTPUT.mkdir(parents=True,exist_ok=True)
 images=[];used=set();total=0;total_marks=0
 for topic,chapter_map in TOPICS.items():
  listing,rows=gallery_rows(topic)
  print("TOPIC",topic,"listed",len(rows),"expected",len(chapter_map),flush=True)
  if len(rows)!=len(chapter_map):raise ValueError(f"Topic {topic} has unexpectedly changed")
  for index,(item,chapter) in enumerate(zip(rows,chapter_map),start=1):
   pending=deque([(item["page"],"base",0)])
   per_base=0
   while pending:
    url,variant,depth=pending.popleft()
    if url in used:continue
    used.add(url)
    view=parse_viewer(url)
    if not view:
     print("NO APPLET",url,flush=True);continue
    key=f"t{topic}-{index:02d}" + (f"-v{per_base}" if variant!="base" else "")
    per_base+=1
    raw=fetch(view["imageSource"],max_bytes=5_000_000)
    im=Image.open(io.BytesIO(raw));im.verify()
    im=Image.open(io.BytesIO(raw))
    if im.width<300 or im.height<250:raise ValueError("Very small source image: "+url)
    if im.format not in ("JPEG","PNG","GIF"):raise ValueError("Unsupported source image: "+url)
    ext={"JPEG":"jpg","PNG":"png","GIF":"gif"}[im.format]
    if abs(im.width-view["width"])>150 or abs(im.height-view["height"])>150:
     print("WARNING image vs applet size",key,(im.width,im.height),(view["width"],view["height"]),flush=True)
    filename=f"{key}.{ext}"
    (OUTPUT/filename).write_bytes(raw)
    labels=view["marks"]
    images.append({
      "id":key,"kind":"specimen","topic":topic,"chapterId":chapter,
      "listPosition":index,"variant":variant,"title":item["title"],
      "viewerTitle":view["title"],
      "sourcePage":url,"sourceList":listing,"imageOriginal":view["imageSource"],
      "image":"./photos/edubiotech/"+filename,"imageSha256":hashlib.sha256(raw).hexdigest(),
      "width":im.width,"height":im.height,
      "appletWidth":view["width"],"appletHeight":view["height"],
      "declaredMarks":view["declaredMarks"],"marks":labels,
      "attribution":SOURCE["credit"]
    })
    total+=1;total_marks+=len(labels)
    print("PHOTO",key,im.size,"marks",len(labels),"source",view["imageSource"],flush=True)
    if depth==0:
     for variant_url in view["variants"][:2]:pending.append((variant_url,"magnified",1))
    if per_base>=3:break
 if total<21:raise ValueError(f"Only {total} specimens imported")
 catalog={"version":1,"courseId":"gi-histology","source":SOURCE,
 "rightsNote":"Владелец подтвердил разрешение на учебное размещение изображений и обозначений при обязательном указании edubiotech.ru (04.11.2026).",
 "labelType":"original-author-marksdata","sourceTopics":[23,24,25],
 "images":images}
 CATALOG.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print("SUCCESS",total,"photos",total_marks,"author marker points",flush=True)
if __name__=="__main__":import_all()
