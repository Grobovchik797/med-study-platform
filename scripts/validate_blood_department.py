#!/usr/bin/env python3
"""Consistency checks for the independent departmental physiology module.
Add as scripts/validate_blood_department.py in med-study-platform.
"""
import json, re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DEPT=json.loads((ROOT/'data/physiology-blood-department.json').read_text('utf8'))
COURSE=json.loads((ROOT/'data/physiology-blood.json').read_text('utf8'))
EXAM=json.loads((ROOT/'data/physiology-blood-exam.json').read_text('utf8'))
assert DEPT['schemaVersion']==1 and DEPT['courseId']=='normal-physiology-blood-department'
assert DEPT['questionCount']==25 and len(DEPT['questions'])==25
assert [q['number'] for q in DEPT['questions']]==list(range(1,26))
ids={x['id'] for track in COURSE['tracks'] for x in track['topics']}
assert len(ids)==36
for q in DEPT['questions']:
    assert q['id']==f'blood-dept-q{q["number"]:02}'
    assert len(q['answerMarkdown'])>700 and len(q['additionalMarkdown'])>100 and q['selfCheckMarkdown'].strip()
    assert q['existingBloodTopicIds'] and set(q['existingBloodTopicIds'])<=ids
    assert q['departmentListPage'] in (148,149)
    assert q['sourceNotes'] and q['newMaterialNeeds']
assert [q['departmentListPage'] for q in DEPT['questions']]==[148]*14+[149]*11
assert DEPT['practiceQuestionCount']==50 and DEPT['finalQuestionCount']==25
assert set(DEPT['practiceQuestions'])==set(map(str,range(1,26)))
seen_ids=set();seen_prompts=set()
all_question_ids=[]
for pool in list(DEPT['practiceQuestions'].values())+[DEPT['finalQuestions']]:
    for q in pool:
        prompt=re.sub(r'\s+',' ',q['prompt'].casefold()).strip()
        assert q['id'] not in seen_ids and prompt not in seen_prompts, q['id']
        seen_ids.add(q['id']);seen_prompts.add(prompt)
        assert len(q['options'])==4 and len({o['id'] for o in q['options']})==4
        assert q['correct'] in [o['id'] for o in q['options']]
        assert all(len(o['text'])>1 for o in q['options']) and len(q['explanation'])>15
        all_question_ids.append(q['id'])
assert len(all_question_ids)==75 and len(DEPT['finalQuestions'])==25
for i in range(1,26):
    qs=DEPT['practiceQuestions'][str(i)];assert len(qs)==2 and all(q['departmentNumber']==i for q in qs)
assert all(q['departmentNumber']==i for i,q in enumerate(DEPT['finalQuestions'],start=1))
# Confirm no question text/id overlaps with the 210 existing blood questions.
old_questions=[]
for track in COURSE['tracks']:
    for topic in track['topics']:
        old_questions.extend(block['check'] for block in topic['miniblocks'])
        old_questions.extend(topic['topicTest'])
old_questions.extend(EXAM if isinstance(EXAM,list) else EXAM['questions'])
old_prompts={re.sub(r'\s+',' ',q['prompt'].casefold()).strip() for q in old_questions}
old_ids={q['id'] for q in old_questions}
assert seen_prompts.isdisjoint(old_prompts) and seen_ids.isdisjoint(old_ids)
assert len(old_questions)==210
assert len(DEPT['practicals'])==8 and len(DEPT['pediatric'])==3
assert [q['id'] for q in DEPT['practicals']]==[f'pr{i:02}' for i in range(1,9)]
for p in DEPT['practicals']:
    assert len(p['principle'])>90 and len(p['keyPoints'])>=3 and len(p['task']['explanation'])>15
    if p['task']['type']=='choice':assert p['task']['answer'] in p['task']['options']
    else:assert p['task']['type']=='number' and isinstance(p['task']['answer'],(float,int))
for p in DEPT['pediatric']:
    assert len(p['answerMarkdown'])>350 and p['sourceUrl'].startswith('https://')
assert (ROOT/'blood-department.js').is_file() and (ROOT/'blood-department.css').is_file()
print('PASS: 25 full departmental answers, 50 topic-check questions, 25 disjoint final checks, 8 practical skills, 3 pediatrics; no overlap with existing 210 items')