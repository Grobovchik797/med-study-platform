#!/usr/bin/env python3
"""Import owner-authorized EduBiotech GI micrographs and ORIGINAL Java applet marks.

Run once from controlled GitHub Actions. The author/title and original source URL
remain attached to EVERY copied illustration. Do not scrape the whole website.
Import only a manually reviewed filename allowlist, never Java classes or scripts.
"""
from __future__ import annotations
import hashlib, io, json, re, time
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen
from bs4 import BeautifulSoup
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
BASE="https://edubiotech.ru/images/vetfac/images/ebooks/histology/histology/"
DEST=ROOT/"photos"/"edubiotech"
DEST.mkdir(parents=True,exist_ok=True)
AUTHORS="С. Л. Кузнецов, Н. Н. Мушкамбаров, В. Л. Горячкина"
CREDIT="Источник: edubiotech.ru; «Руководство-атлас по гистологии, цитологии и эмбриологии», "+AUTHORS
# Use only figures that appear in the original GI topic pages; no inferred files.
# id, topic source, thumbnail basename, mapped Med Study chapter, image type
FIGURES=[
 ("salivary-serous-mixed","r5/t23(1).html","exams128s.jpg","salivary","микропрепарат"),
 ("tonsil-small","r5/t23(1).html","exams181s.jpg","tonsils","микропрепарат"),
 ("tonsil-detail","r5/t23(1).html","exams183s.jpg","tonsils","микропрепарат"),
 ("teeth-forming","r5/t23(1).html","exams93s.jpg","teeth","микропрепарат"),
 ("esophagus-low","r5/t23(1).html","exams84ps.jpg","esophagus","микропрепарат"),
 ("esophagus-muscular","r5/t23(1).html","exams90s.jpg","esophagus","микропрепарат"),
 ("stomach-fundus","r5/t24.html","exams81s.jpg","stomach","микропрепарат"),
 ("stomach-glands","r5/t24.html","exams82s.jpg","gastric-glands","микропрепарат"),
 ("stomach-surface","r5/t24.html","exams316s.jpg","stomach","микропрепарат"),
 ("stomach-chief-parietal","r5/t24.html","exams317s.jpg","gastric-glands","микропрепарат"),
 ("esophagogastric-junction","r5/t24.html","exams24s.jpg","esophagus","микропрепарат"),
 ("stomach-pylorus","r5/t24.html","exams232s.jpg","gastric-glands","микропрепарат"),
 ("intestinal-villi","r5/t24.html","exams239s.jpg","jejunum","микропрепарат"),
 ("intestinal-epithelium","r5/t24.html","exams240s.jpg","jejunum","микропрепарат"),
 ("intestinal-mucosa","r5/t24.html","exams242s.jpg","duodenum","микропрепарат"),
 ("intestinal-submucosa","r5/t24.html","exams256s.jpg","ileum","микропрепарат"),
 ("colon-low","r5/t25.html","exams216s.jpg","colon","микропрепарат"),
 ("liver-lobules","r5/t25(1).html","exams278s.jpg","liver","микропрепарат"),
 ("liver-central-vein","r5/t25(1).html","exams274s.jpg","liver","микропрепарат"),
 ("liver-hepatocytes","r5/t25(1).html","exams279s.jpg","liver","микропрепарат"),
 ("liver-ducts","r5/t25(1).html","exams275s.jpg","liver","микропрепарат"),
 ("liver-triad","r5/t25(1).html","exams276s.jpg","liver","микропрепарат"),
 ("pancreas-overview","r5/t25(1).html","exams18s.jpg","pancreas","микропрепарат"),
 ("pancreas-islet","r5/t25(1).html","exams23s.jpg","pancreas","микропрепарат"),
 ("pancreas-centroacinar","r5/t25(1).html","exams21s.jpg","pancreas","микропрепарат"),
 ("pancreas-endocrine","r5/t25(1).html","exams19s.jpg","pancreas","микропрепарат"),
 # Ultrastructure plates are source images, not the general histology chapter's schematics.
 ("bile-canaliculus-ultrastructure","r5/t25(1).html","n35-1.jpg","liver","электронная микрофотография"),
 ("pancreatic-acinar-ultrastructure","r5/t25(1).html","n36.jpg","pancreas","электронная микрофотография"),
]
assert len({row[0] for row in FIGURES})==len(FIGURES)
def request(url,limit=5_000_000):
 if not url.startswith(BASE) or ".." in urlsplit(url).path:
  raise ValueError("External URL not on approved source "+url)
 req=Request(url,headers={"User-Agent":"Mozilla/5.0 (Med Study authorized academic teaching copy)","Accept":"text/html,image/jpeg,image/png,*/*"})
 err=None
 for i in range(3):
  try:
   with urlopen(req,timeout=18) as resp:
    if resp.status!=200:raise IOError("HTTP "+str(resp.status))
    bits=resp.read(limit+1)
    if len(bits)>limit:raise IOError("Source larger than "+str(limit))
    return bits
  except Exception as e:
   err=e
   time.sleep((i+1)*0.6)
 raise err
def soup_for(path):
 url=urljoin(BASE,path)
 return BeautifulSoup(request(url,limit=3_000_000),"html.parser")
def param(app,key):
 tag=next((x for x in app.select("param[name]") if x.get("name","").lower()==key),None)
 return tag.get("value") if tag else None
def marks(raw,count,width,height):
 fields=(raw or "").strip(";").split(";")
 if not raw or len(fields)!=count*6:return [],False
 output=[]
 for i in range(count):
  key,x1,y1,x2,y2,label=fields[i*6:(i+1)*6]
  try:coords=[int(x1),int(y1),int(x2),int(y2)]
  except ValueError:return [],False
  if not label.strip() or any(v<0 or v>3000 for v in coords):return [],False
  output.append({"mark":key,"label":label,"start":{"x":coords[0],"y":coords[1]},"end":{"x":coords[2],"y":coords[3]}})
 # These are original Java-applet pixels. Only allow overlay if all native
 # coordinates match the dimensions of the ORIGINAL image (no scaling guess).
 return output, all(0<=m["start"]["x"]<width and 0<=m["start"]["y"]<height for m in output)
pages={name:soup_for(name) for name in sorted({row[1] for row in FIGURES})}
viewer_cache={}
records=[]
errors=[]
for slug,page_name,thumb,chapter_id,kind in FIGURES:
 try:
  page=pages[page_name]
  found=next((tag for tag in page.select("img[src]") if urlsplit(tag.get("src","")).path.split("/")[-1].lower()==thumb.lower()),None)
  if not found:raise ValueError("Thumbnail not on the allowed source page "+thumb)
  source_page=urljoin(BASE,page_name)
  anchor=found.find_parent("a",href=True)
  if not anchor:
   # Some figures are inline TEM JPGs with no Java viewer.
   image_url=urljoin(source_page,found["src"])
   source_viewer=source_page
   raw_marks=[];overlay=False
   title=kind+" — "+chapter_id
  else:
   viewer_url=urljoin(source_page,anchor["href"])
   if not viewer_url.startswith(BASE):raise ValueError("Viewer outside approved origin")
   if viewer_url not in viewer_cache:viewer_cache[viewer_url]=soup_for(viewer_url[len(BASE):])
   viewer=viewer_cache[viewer_url]
   app=viewer.select_one("applet")
   if not app:
    image_url=urljoin(source_page,found["src"])
    raw_marks=[];overlay=False
   else:
    src=param(app,"imgsrc")
    if not src:raise ValueError("Original applet image param missing")
    image_url=urljoin(viewer_url,src)
   source_viewer=viewer_url
   title=viewer.title.get_text(" ",strip=True) if viewer.title else slug
  binary=request(image_url)
  with Image.open(io.BytesIO(binary)) as im:
   im.verify()
  with Image.open(io.BytesIO(binary)) as im:
   width,height=im.size
   if min(width,height)<170:raise ValueError("Original photo too small")
   if im.format not in {"JPEG","PNG"}:raise ValueError("Unsupported image type")
   im=im.convert("RGB")
   out=io.BytesIO()
   im.save(out,format="JPEG",quality=91,optimize=True)
   jpg=out.getvalue()
  if anchor and viewer.select_one("applet"):
   app=viewer.select_one("applet")
   count=int(param(app,"markcount") or 0)
   raw_marks,overlay=marks(param(app,"marksdata"),count,width,height)
   if len(raw_marks)!=count:raise ValueError("Original marker count differs from parsed labels "+str(count))
  row=found.find_parent("tr")
  caption=" ".join((row or found.parent).stripped_strings)
  caption=" ".join(caption.split())
  # Captions from the same original source TABLE ROW. Preserve numbers verbatim;
  # do not fabricate or normalize anatomical labels.
  if len(caption)<45:
   neighbor=row.find_previous("tr") if row else None
   if neighbor:caption=" ".join(neighbor.stripped_strings)+" "+caption
  caption=caption[:5500]
  filename=slug+".jpg"
  asset=DEST/filename
  asset.write_bytes(jpg)
  digest=hashlib.sha256(jpg).hexdigest()
  records.append({
   "id":slug,"title":title,"chapterId":chapter_id,
   "kind":kind,"src":"./photos/edubiotech/"+filename,
   "width":width,"height":height,"sha256":digest,
   "caption":caption,"annotations":raw_marks,
   "overlayNativeCoordinates":overlay,
   "sourcePage":source_page,"sourceViewer":source_viewer,"sourceImage":image_url,
   "credit":CREDIT,"rights":"Право учебного использования с атрибуцией подтверждено владельцем Med Study 04.11.2026.",
   "referenceOnly":True,
  })
  print("IMPORT",slug,kind,(width,height),"marks",len(raw_marks),"overlay",overlay,"bytes",len(jpg),flush=True)
 except Exception as exc:
  errors.append({"id":slug,"reason":type(exc).__name__+": "+str(exc)[:180]})
  print("SKIP",slug,errors[-1]["reason"],flush=True)
if len(records)<19:
 raise SystemExit("ABORT: only "+str(len(records))+" approved originals decoded; expected >=19. Errors="+json.dumps(errors,ensure_ascii=False))
if not any(r["id"]=="liver-lobules" and r["annotations"] for r in records):raise SystemExit("No labeled original liver image")
if not any(r["id"]=="pancreas-overview" and r["annotations"] for r in records):raise SystemExit("No labeled original pancreas image")
if not any(r["kind"].startswith("электрон") for r in records):raise SystemExit("No source ultrastructure figures")
catalog={
 "version":1,"course":"gi-histology","origin":"edubiotech.ru",
 "title":"Учебные микропрепараты и электронограммы EduBiotech",
 "source":BASE,
 "sourceAuthors":AUTHORS,
 "sourceTitle":"Руководство-атлас по гистологии, цитологии и эмбриологии",
 "permission":"Разрешение на учебное использование с обязательной атрибуцией сообщено пользователем 04.11.2026; не распространяется автоматически на другие материалы.",
 "notes":"Каждая маркировка, если она есть, извлечена из исходных параметров Java-апплета автора; это не новая разметка Med Study. Фото с непроверенной геометрией отображаются без наложения меток, но с исходным перечнем.",
 "plates":records,
 "skipped":errors,
}
(ROOT/"data"/"gi-edubiotech-plates.json").write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("PASS: imported",len(records),"image cards; labels",sum(len(r["annotations"]) for r in records),"EM",sum("электрон" in r["kind"] for r in records),"skipped",len(errors),flush=True)
