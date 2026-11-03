#!/usr/bin/env python3
"""Read-only live Pages diagnostic: pin down which published asset 404s."""
from urllib.request import urlopen,Request
from urllib.parse import quote
BASE="https://grobovchik797.github.io/med-study-platform/"
paths=[
"index.html","data/gi-edubiotech-original.json","data/gi-edubiotech-tem.json",
"photos/department/ПОДЖЕЛУДОЧНАЯ ЖЕЛЕЗА (PDF стр. 5).jpg",
"photos/liver-central-vein.jpg","photos/liver-portal-triad.jpg",
"photos/gastric-parietal-tem.jpg","photos/gastric-chief-tem.jpg",
"photos/edubiotech/t25-03.jpg","photos/edubiotech/t25-06.jpg",
"photos/edubiotech-tem/enterocyte-tem.jpg",
"photos/edubiotech-tem/bile-canaliculus-tem.jpg",
"photos/edubiotech-tem/pancreas-acinar-tem.jpg"
]
for asset in paths:
 url=BASE+quote(asset,safe="/")
 try:
  with urlopen(Request(url,headers={"User-Agent":"Mozilla/5.0 MedStudy-photo-audit","Cache-Control":"no-cache"}),timeout=14) as r:
   data=r.read(300000)
   print("LIVE",r.status,len(data),asset,"TYPE",r.headers.get("Content-Type"),flush=True)
 except Exception as e:
  print("LIVE FAIL",asset,type(e).__name__,str(e),flush=True)
