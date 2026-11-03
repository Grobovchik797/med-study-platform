#!/usr/bin/env python3
"""Read real EduBiotech microscopic specimens and exact in-image labels.

On GitHub runners this can emit base64 chunks to CI logs for transfer into GitHub
EXCLUSIVELY using the owner's verified Primary GitHub connector. The workflow
itself never commits and uses contents:read. Attribution accompanies every image.
"""
import base64
import hashlib
import io
import json
import os
import re
import time
from html.parser import HTMLParser
from urllib.parse import urljoin,urlparse
from urllib.request import Request,urlopen

BASE="https://edubiotech.ru/images/vetfac/images/ebooks/histology/histology/"
TOPICS={23:["tongue","salivary","salivary","tonsils","teeth","teeth","teeth","teeth","esophagus"],
        24:["stomach","esophagus","gastric-glands","jejunum","jejunum","duodenum"],
        25:["colon","colon","liver","liver","liver","pancreas"]}
SOURCE="С. Л. Кузнецов, Н. Н. Мушкамбаров, В. Л. Горячкина · учебный атлас на edubiotech.ru"
class Parse(HTMLParser):
 def __init__(self):
  super().__init__();self.params={};self.links=[];self.title='';self._title=False
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if tag=="title":self._title=True
  if tag=="param" and d.get("name"):self.params[d["name"].lower()]=d.get("value","")
  if tag=="a" and d.get("href"):self.links.append(d["href"])
 def handle_endtag(self,tag):
  if tag=="title":self._title=False
 def handle_data(self,data):
  if self._title:self.title+=data
def get(url,limit=600000):
 parsed=urlparse(url)
 if parsed.scheme!="https" or parsed.hostname!="edubiotech.ru" or not parsed.path.startswith("/images/vetfac/images/ebooks/histology/histology/"):
  raise ValueError("Unsafe external URL: "+url)
 error=None
 for attempt in range(3):
  try:
   req=Request(url,headers={"User-Agent":"Mozilla/5.0 (MedStudy educational atlas; original provenance retained)"})
   with urlopen(req,timeout=13) as response:
    content=response.read(limit+1)
   if len(content)>limit:raise ValueError("Source exceeds safe limit "+url)
   return content
  except Exception as ex:
   error=ex;time.sleep(1+attempt)
 raise ValueError("Source cannot be fetched: "+url+" ("+str(error)[:160]+")")
def jpg_size(data):
 if not data.startswith(b"\xff\xd8"):raise ValueError("Expected JPEG signature")
 i=2
 SOF={0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf}
 while i<len(data):
  if data[i]!=255:i+=1;continue
  while i<len(data) and data[i]==255:i+=1
  marker=data[i];i+=1
  if marker==0xd9:break
  if marker in (0x00,0x01,0xd8) or 0xd0<=marker<=0xd7:continue
  length=int.from_bytes(data[i:i+2],"big")
  if length<2:raise ValueError("Invalid JPEG segment")
  if marker in SOF:
   h=int.from_bytes(data[i+3:i+5],"big")
   w=int.from_bytes(data[i+5:i+7],"big")
   return (w,h)
  i+=length
 raise ValueError("Cannot locate JPEG dimensions")
def parse_marks(params):
 raw=params.get("marksdata","")
 n=int(params.get("markcount","0"))
 tokens=raw.split(";")
 if tokens and not tokens[-1]:tokens.pop()
 if n<1 or n>120 or len(tokens)!=n*6:
  raise ValueError("Incorrect original markcount or data: "+str((n,len(tokens),raw[:95])))
 marks=[]
 for i in range(n):
  mark_id,x1,y1,x2,y2,text=tokens[i*6:i*6+6]
  marks.append({"id":mark_id,"x1":int(x1),"y1":int(y1),"x2":int(x2),"y2":int(y2),"label":" ".join(text.split())})
 return marks
def emit(name,blob):
 encoded=base64.b64encode(blob).decode("ascii")
 digest=hashlib.sha256(blob).hexdigest()
 print("ASSET_BEGIN|"+name+"|"+str(len(blob))+"|"+digest,flush=True)
 for start in range(0,len(encoded),3000):
  print("ASSET_PART|"+encoded[start:start+3000],flush=True)
 print("ASSET_END|"+name,flush=True)
def main():
 section=int(os.environ.get("EDU_THEME","25"))
 assert section in TOPICS
 list_url=BASE+f"r5/s{section}lst.html"
 page=Parse();page.feed(get(list_url).decode("windows-1251","replace"))
 source_pages=[urljoin(list_url,href) for href in page.links if href.startswith("images/") and href.endswith(".html")]
 source_pages=list(dict.fromkeys(source_pages))
 assert len(source_pages)==len(TOPICS[section]),(section,len(source_pages))
 result=[]
 for i,url in enumerate(source_pages):
  metadata=Parse();metadata.feed(get(url).decode("windows-1251","replace"))
  relative=metadata.params.get("imgsrc","")
  if not relative.lower().endswith((".jpg",".jpeg")):raise ValueError("No real JPG on "+url)
  image_url=urljoin(url,relative)
  blob=get(image_url,limit=700000)
  width,height=jpg_size(blob)
  markers=parse_marks(metadata.params)
  if not (width>=130 and height>=180 and len(blob)>5000):
   raise ValueError("Too small or damaged photo "+url)
  local=f"photos/edubiotech/t{section}-{i+1:02d}.jpg"
  title=" ".join(metadata.title.split())
  if not title.startswith(str(i+1)) and not (section==23 and i in (6,7)):
   raise ValueError("Unexpected number/order "+title)
  entry={
   "id":f"edu-t{section}-{i+1:02d}","topic":section,"chapterId":TOPICS[section][i],
   "title":title,"kind":"light",
   "src":"./"+local,"width":width,"height":height,
   "sourcePage":url,"sourceImage":image_url,"sourceList":list_url,
   "attribution":SOURCE,"permission":"Educational re-use with source credit confirmed by project owner",
   "sourceMarkCount":len(markers),"labels":markers,"sha256":hashlib.sha256(blob).hexdigest()
  }
  if os.environ.get("EDU_EXPORT","0")=="1":
   emit(local,blob)
  result.append(entry)
  print("CHECK",entry["id"],width,height,"marks",len(markers),"bytes",len(blob),flush=True)
 metadata={"topic":section,"items":result}
 output=json.dumps(metadata,ensure_ascii=False,separators=(",",":")).encode("utf-8")
 if os.environ.get("EDU_EXPORT","0")=="1":
  emit(f"manifest/t{section}.json",output)
 else:
  print("CHECK_COMPLETE",section,"items",len(result),"marks",sum(len(e["labels"]) for e in result))
if __name__=="__main__":main()
