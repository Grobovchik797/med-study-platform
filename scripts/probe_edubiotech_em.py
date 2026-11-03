#!/usr/bin/env python3
"""Find *actual* EM photo mentions in three original digestive chapters."""
import re,urllib.request
from html import unescape
from html.parser import HTMLParser
from urllib.parse import urljoin
ROOT="https://edubiotech.ru/images/vetfac/images/ebooks/histology/histology/r5/"
class P(HTMLParser):
 def __init__(self):super().__init__();self.links=[];self.images=[]
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if tag=='a' and d.get("href"):self.links.append(d["href"])
  if tag=='img' and d.get("src"):self.images.append(d["src"])
for path in ["t23.html","t23(1).html","t24.html","t24(1).html","t25.html","t25(1).html"]:
 url=urljoin(ROOT,path)
 try:
  req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 MedStudy educational atlas source audit"})
  with urllib.request.urlopen(req,timeout=14) as r:raw=r.read(900000)
  page=raw.decode("cp1251",errors="replace")
  p=P();p.feed(page)
  print("PAGE",path,"bytes",len(raw),"links",len(p.links),"images",len(p.images))
  for word in (r"электронограм",r"электронн\w*\s+микрофотограф",r"ультраструктур",r"электронно-микроскоп"):
   matches=list(re.finditer(word,page,re.I))
   print("TERM",word,len(matches))
   for m in matches[:9]:
    near=page[max(0,m.start()-500):m.end()+320]
    near=re.sub(r"<[^>]*>"," ",near,flags=re.S)
    near=unescape(" ".join(near.split()))
    print("CONTEXT",near[:600])
  linked=[x for x in p.links if x.startswith("images/") and x.endswith(".html")]
  print("FIGURE_LINKS",len(linked),linked[:100])
 except Exception as ex: print("FAIL",path,type(ex).__name__,str(ex)[:150])
