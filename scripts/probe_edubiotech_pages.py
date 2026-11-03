#!/usr/bin/env python3
"""Discovery of actual paths in EduBiotech historic source archive."""
import urllib.request,urllib.error,re
from html import unescape
from urllib.parse import urljoin
base="https://edubiotech.ru/images/vetfac/images/ebooks/histology/"
paths=["histology/r5frames.htm","histology/r0/contents.htm","histology/r5frames.htm#Раздел_5_Список","histology/r5/"]
for path in paths:
 url=urljoin(base,path)
 try:
  req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 MedStudy scholarly source audit"})
  with urllib.request.urlopen(req,timeout=11) as req:
   html=req.read(300000).decode("cp1251",errors="replace")
  print("\nURL",url,"LENGTH",len(html))
  for key in ["Тема 23","Тема 24","Тема 25","S23","S24","S25","Пищеварительная"]:
   positions=[m.start() for m in re.finditer(re.escape(key),html,re.I)][:6]
   for k in positions:
    fragment=re.sub("<[^>]*>"," ",html[max(0,k-240):k+250])
    print("MATCH",key,unescape(" ".join(fragment.split()))[:420])
  links=re.findall(r'(?:href|src)\s*=\s*["\']?([^"\' >]+)',html,re.I)
  print("ALL_LINKS",len(links))
  print("INTERESTING",[(link) for link in links if re.search(r'23|24|25|/r5/|s2[345]|list|lst',link,re.I)][:100])
 except Exception as ex: print("FAIL",url,type(ex).__name__,str(ex)[:170])
