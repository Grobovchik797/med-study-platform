#!/usr/bin/env python3
"""Enumerate exact specimen IDs, applet photos, source labels and images."""
from html.parser import HTMLParser
from urllib.parse import urljoin
from urllib.request import Request,urlopen
import re,io
ROOT="https://edubiotech.ru/images/vetfac/images/ebooks/histology/histology/"
class P(HTMLParser):
 def __init__(self):
  super().__init__();self.params={};self.links=[];self.img=[];self.title='';self._intitle=False
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if tag=='title':self._intitle=True
  if tag=='param' and 'name' in d:self.params[d['name'].lower()]=d.get('value','')
  if tag=='a' and 'href' in d:self.links.append(d['href'])
  if tag=='img' and 'src' in d:self.img.append(d['src'])
 def handle_endtag(self,tag):
  if tag=='title':self._intitle=False
 def handle_data(self,x):
  if self._intitle:self.title+=x
def get(url):
 req=Request(url,headers={'User-Agent':'Mozilla/5.0 MedStudy Educational Atlas import with user confirmed permission'})
 with urlopen(req,timeout=11) as r:return r.read()
for theme in [23,24,25]:
 listing=f'{ROOT}r5/s{theme}lst.html'
 p=P();p.feed(get(listing).decode('cp1251','replace'))
 pages=[urljoin(listing,href) for href in p.links if href.startswith('images/') and href.endswith('.html')]
 pages=list(dict.fromkeys(pages))
 print('SECTION',theme,'SLIDES',len(pages))
 for i,page in enumerate(pages):
  try:
   q=P();q.feed(get(page).decode('cp1251','replace'))
   raw=q.params.get('marksdata','')
   imgsrc=q.params.get('imgsrc','')
   marks=raw.split(';')
   print('SLIDE',theme,i+1,q.title.strip()[:85],'IMG',imgsrc,'MARKS',raw[:360],'MCOUNT',q.params.get('markcount'), 'NEXT',q.links[:5])
   if not imgsrc:print('ERROR-NO-IMAGE',page)
   if theme==25 and i in (2,5):
    url=urljoin(page,imgsrc)
    binary=get(url)
    print('IMAGE-DATA',url,'LEN',len(binary),'MAGIC',binary[:8].hex())
  except Exception as ex:print('ERROR-SLIDE',page,type(ex).__name__,str(ex)[:140])
