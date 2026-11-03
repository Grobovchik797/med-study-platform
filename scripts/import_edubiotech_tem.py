#!/usr/bin/env python3
"""Collect three original EduBiotech digestive electron micrographs and the
numbered structures explicitly described by their surrounding author text.
For authorized educational distribution with EduBiotech attribution.
"""
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.parse import urljoin
import io,json,hashlib,time
from bs4 import BeautifulSoup
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"photos"/"edubiotech-tem"
DEST=ROOT/"data"/"gi-edubiotech-tem.json"
BASE="https://edubiotech.ru/images/vetfac/images/ebooks/histology/histology/"
SOURCE={"name":"Руководство-атлас по гистологии, цитологии и эмбриологии",
"authors":"С. Л. Кузнецов, Н. Н. Мушкамбаров, В. Л. Горячкина",
"site":"https://edubiotech.ru/images/vetfac/images/ebooks/histology/index.htm",
"credit":"Источник: edubiotech.ru. Используется с разрешения владельца для учебных целей."}
records=[
 {"id":"enterocyte-tem","chapterId":"jejunum","topic":24,"page":"r5/t24.html","imagePath":"r7/n33-1.jpg",
 "title":"Электронная микрофотография — тонкая кишка",
 "labels":[{"number":"1","label":"Щёточная каёмка (микроворсинки)"},{"number":"2","label":"Межклеточные контакты в апикальной области"},{"number":"3","label":"Кровеносный капилляр"}],
 "annotationStatus":"Текстовая легенда по исходному параграфу; координатная разметка не доступна."},
 {"id":"bile-canaliculus-tem","chapterId":"liver","topic":25,"page":"r5/t25(1).html","imagePath":"r7/n35-1.jpg",
 "title":"Электронная микрофотография — желчный капилляр",
 "labels":[{"number":"1","label":"Просвет желчного капилляра"},{"number":"2","label":"Микроворсинки"},{"number":"3","label":"Плотные (запирающие) межклеточные контакты"},{"number":"5","label":"Гранулы гликогена"}],
 "annotationStatus":"Оригинальная текстовая легенда к изображению, без новых пространственных стрелок."}
]
def fetch(relative):
 url=urljoin(BASE,relative)
 if not url.startswith(BASE):raise ValueError(url)
 for attempt in range(3):
  try:
   with urlopen(Request(url,headers={"User-Agent":"Mozilla/5.0 (Med Study attributed education)"}),timeout=18) as resp:
    b=resp.read(3000000)
   if not b:raise ValueError("Empty "+url)
   return b,url
  except Exception:
   if attempt==2:raise
   time.sleep(attempt+1)
def pancreas_record():
 page="r5/t25(1).html"
 raw,url=fetch(page)
 soup=BeautifulSoup(raw.decode("windows-1251",errors="replace"),"html.parser")
 head=next((x for x in soup.find_all(["strong","b"]) if "Электронная" in x.get_text(" ",strip=True) and "Поджелудочная" in x.get_text(" ",strip=True)),None)
 if head is None:raise ValueError("Missing original pancreatic TEM heading")
 table=head.find_parent("table")
 if table is None:raise ValueError("No image table near pancreas TEM heading")
 images=[x for x in table.find_all("img") if "r7/" in x.get("src","")]
 if not images:raise ValueError("No original pancreatic TEM image inside matching table")
 path=urljoin(url,images[0]["src"])
 if not path.startswith(BASE+"r7/"):raise ValueError("Image path unexpected: "+path)
 return {"id":"pancreas-acinar-tem","chapterId":"pancreas","topic":25,"page":page,
 "imagePath":path.removeprefix(BASE),
 "title":"Электронная микрофотография — ацинус экзокринной поджелудочной железы",
 "labels":[{"number":"1","label":"Секреторные гранулы"},{"number":"2","label":"Просвет секреторного отдела"},{"number":"3","label":"Центроацинарные клетки вставочного протока"},{"number":"4","label":"Гранулярная эндоплазматическая сеть"}],
 "annotationStatus":"Текстовая легенда оригинального учебника, точные новые координаты не задавались."}
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 rows=records+[pancreas_record()]
 for item in rows:
  raw,url=fetch(item["imagePath"])
  im=Image.open(io.BytesIO(raw)); im.verify()
  im=Image.open(io.BytesIO(raw))
  if im.format not in ("JPEG","PNG") or im.width<200 or im.height<200:raise ValueError("Source image not plausible TEM "+url)
  ext="jpg" if im.format=="JPEG" else "png"
  path=OUT/(item["id"]+"."+ext)
  path.write_bytes(raw)
  item.update({"image":"./photos/edubiotech-tem/"+path.name,
   "imageOriginal":url,"sourcePage":urljoin(BASE,item["page"]),
   "width":im.width,"height":im.height,"sha256":hashlib.sha256(raw).hexdigest(),
   "attribution":SOURCE["credit"]})
  print("TEM",item["id"],"image",url,"dimensions",im.size,"labels",len(item["labels"]),flush=True)
 output={"version":1,"courseId":"gi-histology","source":SOURCE,
  "rightsNote":"Авторские изображения размещены с заявленного владельцем разрешения при обязательном указании сайта edubiotech.ru.",
  "images":rows}
 DEST.write_text(json.dumps(output,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print("PASS: three original digestive electron micrographs imported with source-attributed legends",flush=True)
if __name__=="__main__":main()
