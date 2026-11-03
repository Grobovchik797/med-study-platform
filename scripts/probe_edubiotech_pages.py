#!/usr/bin/env python3
"""Read three genuine EduBiotech digestive atlas chapters."""
from html.parser import HTMLParser
from html import unescape
import re
import urllib.request
from urllib.parse import urljoin

base="https://edubiotech.ru/images/vetfac/images/ebooks/histology/histology/"
class Parse(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links=[]
        self.images=[]
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if tag=="a" and d.get("href"):
            self.links.append(d["href"])
        if tag in ("img","frame","iframe") and d.get("src"):
            self.images.append((tag,d["src"],d.get("alt"),d.get("width"),d.get("height")))
for path in ["r5/s23lst.html","r5/s24lst.html","r5/s25lst.html"]:
    url=urljoin(base,path)
    try:
        req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 MedStudy source audit"})
        with urllib.request.urlopen(req,timeout=12) as response:
            raw=response.read(1200000)
            print("URL",url,"STATUS",response.status,"BYTES",len(raw),"TYPE",response.headers.get("Content-Type"))
        markup=raw.decode("windows-1251",errors="replace")
        p=Parse()
        p.feed(markup)
        print("IMAGES",len(p.images),p.images[:60])
        print("LINKS",len(p.links),p.links[:85])
        print("TITLE",re.findall(r"<title[^>]*>([^<]+)</title>",markup,re.I)[:3])
        print("HEAD",unescape(" ".join(re.sub(r"<[^>]*>"," ",markup).split()))[:2400])
    except Exception as ex:
        print("FAIL",url,type(ex).__name__,str(ex)[:240])
