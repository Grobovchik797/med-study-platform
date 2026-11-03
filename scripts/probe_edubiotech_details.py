#!/usr/bin/env python3
from html.parser import HTMLParser
from html import unescape
from urllib.parse import urljoin
import urllib.request,re
BASE="https://edubiotech.ru/images/vetfac/images/ebooks/histology/histology/r5/"
class Parse(HTMLParser):
 def __init__(self):
  super().__init__();self.images=[];self.links=[];self.text=[]
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if tag in ("img","frame","iframe") and "src" in d:self.images.append((tag,d))
  if tag=="a" and "href" in d:self.links.append(d)
 def handle_data(self,data):
  v=data.strip()
  if v:self.text.append(v)
for path in ["images/exams188.html","images/exams81.html","images/exams278.html","images/exams18.html","t25.html"]:
 url=urljoin(BASE,path)
 try:
  req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0"})
  with urllib.request.urlopen(req,timeout=15) as response:
   raw=response.read(1000000)
   print("PAGE",url,"STATUS",response.status,"BYTES",len(raw),"TYPE",response.headers.get("Content-Type"))
  markup=raw.decode("cp1251",errors="replace")
  p=Parse();p.feed(markup)
  print("IMAGES",p.images[:20])
  print("LINKS",p.links[:45])
  print("TEXT",unescape(" ".join(p.text))[:5000])
  if path=="images/exams278.html":
   print("HTML_BEGIN",markup[:5500])
 except Exception as ex:print("FAIL",url,str(ex)[:200])
