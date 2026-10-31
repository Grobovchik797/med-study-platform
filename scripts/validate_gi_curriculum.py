#!/usr/bin/env python3
"""GI histology content structure checks. These are not a scientific peer review."""
import json
from pathlib import Path
from collections import Counter
R=Path(__file__).resolve().parents[1]
def load(n):return json.loads((R/'data'/n).read_text('utf-8'))
course=load('gi-curriculum.json')
mini=load('gi-inline-quiz.json')
exam=load('gi-final-quiz.json')
maps=load('gi-workbook.json')
library=load('library.json')
deep_a=load('gi-deep-a.json')
deep_b=load('gi-deep-b.json')
deep_blocks={**deep_a['blocks'],**deep_b['blocks']}
assert len(deep_blocks)==17
assert sum(len(items) for items in deep_blocks.values())==85
for chapter_id,sections in deep_blocks.items():
 assert len(sections)==5
 for block in sections:
  assert len(block['text'])>=280 and len(block['title'])>10, (chapter_id,block['id'])
  cp=block['checkpoint']
  assert len(cp['options'])==3 and len(set(cp['options']))==3 and cp['answer'] in range(3)
  assert len(cp['prompt'])>20 and len(cp['explanation'])>25
assert course['version']==1 and len(course['chapters'])==17
ids=[c['id'] for c in course['chapters']]
assert len(set(ids))==17
assert len(mini['chapterQuestions'])==17 and set(mini['chapterQuestions'])==set(ids)
for c in course['chapters']:
 assert all(isinstance(c[f],str) and c[f].strip() for f in ('id','title','methodPage','intro','nb'))
 assert len(c['title'])>=8 and len(c['intro'])>=35 and len(c['nb'])>=25
 assert len(c['brief'])>=2 and len(c['deep'])>=2
 assert c['methodologyPdfPages'] and len(c['methodologyPdfPages'])==2
 for q in mini['chapterQuestions'][c['id']]:
  prompt, options, answer, explanation=q
  assert len(prompt)>20 and len(options)==3 and len(set(options))==3 and answer in (0,1,2)
  assert len(explanation)>25
assert sum(len(v) for v in mini['chapterQuestions'].values())==51
assert len(exam['questions'])==24
assert Counter(q['difficulty'] for q in exam['questions'])=={'easy':8,'medium':8,'hard':8}
assert len(set(q['id'] for q in exam['questions']))==24
for q in exam['questions']:
 assert q['chapter'] in ids
 assert len(q['prompt'])>25 and len(q['explanation'])>30
 assert len(q['options'])==4 and len(set(q['options']))==4
 assert q['answer'] in range(4)
method=load('gi-department-questions.json')
assert len(method['groups'])==4 and sum(len(x['questions']) for x in method['groups'])==56
assert all(q['chapter'] in ids for g in method['groups'] for q in g['questions'])
assert len(maps['maps'])==7
for m in maps['maps']:
 assert m['chapters'] and set(m['chapters']).issubset(ids)
 assert len(m['columns'])>=3 and len(m['rows'])>=2
 assert all(len(row)==len(m['columns']) for row in m['rows'])
topics=next(s for s in library['subjects']['histology-cytology']['sections'] if s['id']=='digestive')['topics']
assert len(topics)==20
assert set('gi-'+i for i in ids).issubset(set(x['id'] for x in topics))
assert 'histology-small-intestine' in {x['id'] for x in topics}
assert {'gi-workbook','gi-final-exam'}.issubset({x['id'] for x in topics})
print('PASS: 17 mapped GI chapters, 51 distinct inline MCQs, 24 independent exam items, 7 complete methodology maps and 20 catalog entries')
