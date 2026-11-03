#!/usr/bin/env python3
"""Temporary connectivity/structure probe for permitted educational archive.
No redistribution, no asset uploads. Prints only bounded page/link metadata.
"""
from html.parser import HTMLParser
from urllib.request import urlopen,Request
from urllib.parse import urljoin,urlparse
from urllib.error import URLError
import re
BASES=[
 "https://edubiotech.ru/downloads/library/ugebnik/gistologi/index.htm",
 "https://edubiotech.ru/images/vetfac/images/ebooks/histology/index.htm",
 "https://edubiotech.ru/images/vetfac/images/ebooks/histology/histology/R5/S25lst.html",
 "http://edubiotech.ru/downloads/library/ugebnik/gistologi/index.htm"
]
class Scan(HTMLParser):
 def __init__(self): super().__init__();self.links=[];self.images=[];self.frames=[];self.text=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=="a" and a.get("href"):self.links.append(a["href"])
  if tag=="img" and a.get("src"):self.images.append(a["src"])
  if tag in ("frame","iframe") and a.get("src"):self.frames.append(a["src"])
 def handle_data(self,text):
  t=text.strip()
  if t and len(t)>3:self.text.append(t)
def fetch(url):
 req=Request(url,headers={"User-Agent":"Mozilla/5.0 (MedStudy educational archive permissions audit)","Accept":"text/html,application/xhtml+xml,*/*"})
 try:
  with urlopen(req,timeout=14) as r:
   data=r.read(450000);target=r.url;mime=r.headers.get("content-type")
  for encoding in ["utf-8","windows-1251","koi8-r"]:
   try: s=data.decode(encoding);break
   except UnicodeError:continue
  h=Scan();h.feed(s)
  print("OK",target,"bytes",len(data),"mime",mime,"text",repr(" ".join(h.text[:15])[:380]))
  print(" LINKS",len(h.links),[urljoin(target,x) for x in h.links[:20]])
  print(" IMAGES",len(h.images),[urljoin(target,x) for x in h.images[:12]])
  print(" FRAMES",len(h.frames),[urljoin(target,x) for x in h.frames[:12]])
  return h,target
 except Exception as e:
  print("FAIL",url,type(e).__name__,str(e)[:240]);return None,url
if __name__=="__main__":
 for u in BASES:
  h,url=fetch(u)
  if h:
   candidates=[urljoin(url,x) for x in (h.links+h.frames) if re.search(r"gist|hist|frame|r[0-9]|s2[3-5]|contents|atlas|start|men|left",x,re.I)][:8]
   for c in dict.fromkeys(candidates):fetch(c)
