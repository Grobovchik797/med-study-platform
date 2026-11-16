#!/usr/bin/env python3
"""Urinary histology structural audit. CI success is not faculty/scientific approval."""
from pathlib import Path
import json
import re
ROOT=Path(__file__).resolve().parents[1]
def load(name):return json.loads((ROOT/'data'/name).read_text(encoding='utf-8'))
c=load('urinary-course.json');m=load('urinary-workbook.json');e=load('urinary-exam.json');pr=load('urinary-practical.json');lib=load('library.json');
assert c['schemaVersion']==1 and c['courseId']=='urinary-histology'
assert len(c['chapters'])==15 and [x['number'] for x in c['chapters']]==list(range(1,16))
ids=[x['id'] for x in c['chapters']];assert len(set(ids))==15
minis=[]
for chapter in c['chapters']:
 assert chapter['title'] and len(chapter['goal'])>24 and len(chapter['provenance'])>15
 assert chapter['status']=='editorial-draft-not-faculty-reviewed'
 assert len(chapter['blocks'])>=1 and all(b['paragraphs'] and b['title'] for b in chapter['blocks'])
 assert sum(len(z) for block in chapter['blocks'] for z in block['paragraphs'])>=500,chapter['id']
 assert len(chapter['tables'])>=1
 for tb in chapter['tables']:
  assert len(tb['headers'])>=3 and len(tb['rows'])>=3
  assert all(len(r)==len(tb['headers']) for r in tb['rows'])
 assert len(chapter['mini'])==3
 for q in chapter['mini']:
  assert len(q['options'])==3 and 0<=q['answer']<3 and q['explanation'].strip()
  assert len(set(q['options']))==3
  minis.append((q['id'],q['prompt'].lower().strip()))
assert len(minis)==45 and len(set(minis))==45
assert m['id']=='urinary-nephron-histophysiology-1999' and m['source']['pdfPage']==114
assert len(m['columns'])==7 and [x['id'] for x in m['rows']]==['diameter','light_microscopy','electron_microscopy','function']
cols=[x['id'] for x in m['columns'][1:]]
for row in m['rows']:
 assert set(row['cells'])==set(cols) and all(len(z)>25 for z in row['cells'].values())
assert e['schemaVersion']==1 and e['courseId']=='urinary-histology' and len(e['questions'])==30
keys=set();exams=set()
for q in e['questions']:
 assert q['chapterId'] in ids and q['difficulty'] in ('easy','medium','hard')
 assert len(q['options'])==3 and 0<=q['answer']<3 and q['explanation']
 assert q['id'] not in keys;keys.add(q['id'])
 assert q['prompt'].lower().strip() not in {x[1] for x in minis}
 exams.add(q['prompt'].lower().strip())
assert len(exams)==30
assert len(pr['specimens'])==6 and {s['id'] for s in pr['specimens']}=={'kidney','renal-vessels','bladder','ureter','corpuscle-tem','glomerulus-scheme'}
for x in pr['specimens']:
 assert len(x['tasks'])>=3 and len(x['features'])>=3 and len(x['questions'])>=1
 assert 'кафедр' in pr['disclaimer'] and 'схем' in pr['disclaimer']
secs=lib['subjects']['histology-cytology']['sections'];sec=next(s for s in secs if s['id']=='urogenital')
assert len(sec['topics'])==19
assert sum(t['route']=='urinary-chapter' for t in sec['topics'])==15
assert {t['route'] for t in sec['topics']}=={'urinary-chapter','urinary-exam','urinary-workbook','urinary-practical','urinary-oral'}
assert {t['chapterId'] for t in sec['topics'] if t['route']=='urinary-chapter'}==set(ids)
index=(ROOT/'index.html').read_text(encoding='utf-8')
assert 'urinary-course.js' in index and 'urinary-course.css' in index and '1.12.0' in index
app=(ROOT/'app.js').read_text(encoding='utf-8')
assert 'window.MedStudyUrinary.validate' in app and 'showUrinaryChapter' in app
assert all('data/urinary-'+v+'.json' in app for v in ('course','exam','workbook','practical'))
sw=(ROOT/'sw.js').read_text(encoding='utf-8')
for asset in ('urinary-course.js','urinary-course.css','data/urinary-course.json','data/urinary-exam.json','data/urinary-workbook.json','data/urinary-practical.json','illustrations/urinary-nephron.svg','illustrations/urinary-barrier.svg','illustrations/urinary-urothelium.svg'):
 assert asset in sw,asset
 assert (ROOT/asset).exists(),asset
pack=(ROOT/'scripts/package_android_assets.py').read_text(encoding='utf-8')
for v in ('urinary-course.js','urinary-course.css','data/urinary-course.json','data/urinary-exam.json','data/urinary-workbook.json','data/urinary-practical.json','illustrations/urinary-nephron.svg'):
 assert v in pack,v
print('PASS: urinary histology, 15 full notes, 15 learning tables, 45 mini checks, 30 distinct exam tests, 6 practical tasks, 24 original-map cells, navigation, offline manifests')
