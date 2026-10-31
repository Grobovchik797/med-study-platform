#!/usr/bin/env python3
"""Check independent small intestine quiz and slide schema; not medical peer review."""
import json
from pathlib import Path
from collections import Counter
from urllib.parse import urlparse

root=Path(__file__).resolve().parents[1]
quiz=json.loads((root/'data/small-intestine-quiz.json').read_text('utf-8'))
slides=json.loads((root/'data/small-intestine-slides.json').read_text('utf-8'))
assert quiz['topicId']==slides['topicId']=='histology-small-intestine'
assert len(quiz['questions'])==30
assert Counter(q['difficulty'] for q in quiz['questions'])=={'easy':10,'medium':10,'hard':10}
ids=[q['id'] for q in quiz['questions']]
assert len(ids)==len(set(ids))
for q in quiz['questions']:
    assert len(q['options'])==4 and 0<=q['answer']<4
    assert len(q['prompt'])>15 and len(q['explanation'])>35 and len(q['sourceNote'])>12
    assert urlparse(q['reference']).scheme=='https'
assert len(slides['images'])==3
assert set(s['id'] for s in slides['images'])=={'duodenum','jejunum','ileum'}
for s in slides['images']:
    for k in ('src','source','licenseUrl'):
        assert urlparse(s[k]).scheme=='https'
    assert s['credit'] and s['license']=='CC BY-SA 4.0'
    assert s['answer']==s['id']
    assert float(s['aspect'])>0.5
    for marker in s['annotations']:
        assert 0<=marker['x']<=100 and 0<=marker['y']<=100
        assert marker['label'] and marker['note']
assert not slides['images'][1]['annotations'], 'Never invent jejunum cell landmarks'
intro=(root/'data/histology-small-intestine.json').read_text('utf-8')
material=json.loads(intro)
assert material['sourceScope']['peerReviewed'] is False
assert material['sourceScope']['departmentMapped'] is False
for variant in material['variants']:
    assert variant['originStatement']
assert (root/'docs/small-intestine-source-audit.md').exists()
print('PASS: 30 questions (3x10), 3 licensed image records, conservative labels, source audit')
