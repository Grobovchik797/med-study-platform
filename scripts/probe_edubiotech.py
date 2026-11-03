#!/usr/bin/env python3
"""Probe EduBiotech archive from GitHub Actions network, no publishing.
Never claim a page or its photos were fetched unless HTTP and decoded image checks succeed.
"""
import urllib.request
import urllib.error
import html.parser
from urllib.parse import urljoin
import sys

BASE="https://edubiotech.ru/images/vetfac/images/ebooks/histology/histology/"
PAGES=[
"r5/t23.html","r5/t23(1).html","r5/t24.html","r5/t24(1).html",
"r5/t25.html","r5/t25(1).html","r7/p-40.html",
"R5/S23lst.html","R5/S24lst.html","R5/S25lst.html",
]
class Links(html.parser.HTMLParser):
 def __init__(self):super().__init__();self.images=[];self.anchors=[]
 def handle_starttag(self,tag,attrs):
  item=dict(attrs)
  if tag=="img" and item.get("src"):self.images.append(item["src"])
  if tag=="a" and item.get("href"):self.anchors.append(item["href"])
def fetch(url,timeout=16):
 req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (educational archival accessibility check; Med Study)","Accept":"text/html,image/*","Accept-Language":"ru,en;q=0.9"})
 with urllib.request.urlopen(req,timeout=timeout) as r:return r.status,r.read(3000000)
success=0
for path in PAGES:
 try:
  status,content=fetch(urljoin(BASE,path))
  data=content.decode("windows-1251",errors="replace")
  parser=Links();parser.feed(data)
  print(f"PASS {path}: status={status} bytes={len(content)} images={len(parser.images)} links={len(parser.anchors)}",flush=True)
  print("IMAGE_LINKS",path,[urljoin(BASE+path,img) for img in parser.images[:8]],flush=True)
  print("LINK_EXAMPLES",path,parser.anchors[:4],flush=True)
  if parser.images:success+=1
 except Exception as exc:
  print(f"FAIL {path}: {type(exc).__name__}: {str(exc)[:130]}",flush=True)
print("SUMMARY",success,"of",len(PAGES),"pages with images",flush=True)
# This is a diagnostic; network outages are not grounds to ship broken imagery.
