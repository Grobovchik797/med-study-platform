#!/usr/bin/env python3
"""Inspect exact EduBiotech source figures and their local descriptive captions.
Diagnostic only: fetch/print, do not mirror without verifying each image.
"""
import urllib.request,urllib.error
from bs4 import BeautifulSoup
from urllib.parse import urljoin
BASE="https://edubiotech.ru/images/vetfac/images/ebooks/histology/histology/"
pages=["r5/t23(1).html","r5/t24.html","r5/t25.html","r5/t25(1).html","r7/p-40.html"]
def get(url):
 req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (educational histology study; Med Study)"})
 with urllib.request.urlopen(req,timeout=13) as r:return r.read()
for page in pages:
 print("\nPAGE",page,flush=True)
 html=get(urljoin(BASE,page))
 soup=BeautifulSoup(html,"html.parser")
 images=[]
 seen=set()
 for img in soup.select("img[src]"):
  src=img.get("src","")
  if not src.lower().endswith((".jpg",".jpeg",".png")):continue
  url=urljoin(urljoin(BASE,page),src)
  if url in seen:continue
  seen.add(url)
  table=img.find_parent("tr")
  text=" ".join((table or img.parent).stripped_strings)
  text=" ".join(text.split())[:290]
  images.append((url,text))
 print("jpgs",len(images),flush=True)
 for url,text in images[:28]:print("FIG",url.split("/")[-1],repr(text),flush=True)
for page in ["r5/images/exams278.html","r5/images/exams18.html","r5/images/exams128.html","r5/images/n36.html","r5/images/n35-1.html"]:
 try:
  content=get(urljoin(BASE,page))
  soup=BeautifulSoup(content,"html.parser")
  print("FULL_PAGE",page,"images",[urljoin(urljoin(BASE,page),im.get("src")) for im in soup.select("img[src]")][:12],flush=True)
  print("FULL_TEXT",page," ".join(soup.stripped_strings)[:200],flush=True)
  print("FULL_ATTRS",page,[(n.name,n.attrs) for n in soup.select("frame[src],iframe[src],embed[src],object[data],a[href],body[background]")][:15],flush=True)
  print("FULL_HEAD",page,str(soup)[:1600],flush=True)
 except Exception as e:print("FULL_PAGE_ERROR",page,type(e).__name__,str(e)[:90],flush=True)
for key in ["r5/exams128s.jpg","r5/exams128.jpg","r5/exams216s.jpg","r5/exams216.jpg","r5/exams278s.jpg","r5/exams278.jpg","r7/exams278s.jpg"]:
 try:
  content=get(urljoin(BASE,key))
  print("IMAGE_TEST",key,len(content),content[:4].hex(),flush=True)
 except Exception as e:print("IMAGE_ERROR",key,type(e).__name__,str(e)[:65],flush=True)
