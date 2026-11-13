#!/usr/bin/env python3
"""Validate the isolated physiology of blood course and its three quiz pools."""
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COURSE = json.loads((ROOT/'data/physiology-blood.json').read_text('utf-8'))
EXAM = json.loads((ROOT/'data/physiology-blood-exam.json').read_text('utf-8'))
ATLAS = json.loads((ROOT/'data/physiology-blood-atlas.json').read_text('utf-8'))
assert COURSE['schemaVersion']==1 and len(COURSE['tracks'])==5
assert COURSE['studyModes']==['only_full_note'] and COURSE['flashcardsIncluded'] is False
ids=set(); prompts=set(); mini=[]; topical=[]; topics=[]; figures=set()
def check(q,kind):
    assert q['scope']==kind and q['type']=='single_choice'
    assert q['id'] not in ids and q['prompt'].casefold().strip() not in prompts,q['id']
    ids.add(q['id']);prompts.add(q['prompt'].casefold().strip())
    assert len(q['options'])==4 and len(set(q['options']))==4,q['id']
    assert 0<=q['correctIndex']<4 and q['options'][q['correctIndex']]==q['answer']
    assert len(q['explanation'])>=10
for track in COURSE['tracks']:
    assert len(track['topics']) in (6,8)
    for topic in track['topics']:
        topics.append(topic['id'])
        assert topic['mode']=='only_full_note' and len(topic['miniblocks'])==2 and len(topic['topicTest'])==3
        for block in topic['miniblocks']:
            assert len(block['text'])>160,block['id']
            assert block['check']['id']=='M-'+block['id']
            check(block['check'],'mini');mini.append(block['check']['id'])
        for q in topic['topicTest']:
            check(q,'topic');topical.append(q['id'])
        figures.update(topic.get('figures',[]))
for q in EXAM:check(q,'global')
assert len(topics)==len(set(topics))==36
assert len(mini)==72 and len(topical)==108 and len(EXAM)==30
assert len(ids)==210 and len(figures)==10
for image in figures:
    assert re.fullmatch(r'[\w-]+\.svg',image,re.UNICODE),image
    svg=(ROOT/'illustrations/blood'/image).read_text('utf-8')
    assert '<svg' in svg and '</svg>' in svg
    assert not re.search(r'<script|javascript:|onload=',svg,re.I)
assert len(ATLAS['tasks'])==27
seen=set()
for task in ATLAS['tasks']:
    assert task['id'] not in seen and task['topic'] in topics
    seen.add(task['id']);assert task['type'] in {'calculation','selection','ordering'}
    if task['type']=='calculation':
        assert isinstance(task['answer'],(int,float)) and task['tolerance']>=0
    elif task['type']=='selection':
        assert len(task['options'])==4 and task['answer'] in task['options']
    else:
        assert sorted(task['correctOrder'])==list(range(len(task['steps'])))
assert (ROOT/'blood-study.js').is_file() and (ROOT/'blood-study.css').is_file()
lectures=json.loads((ROOT/"data/physiology-blood-lectures.json").read_text("utf-8"))
assert lectures["schemaVersion"]==1
assert set(lectures["lectures"])=={"S","E","H","G"}
assert [lectures["lectures"][key]["pageCount"] for key in ("S","E","H","G")]==[12,11,10,7]
assert all(sum(len(page["text"]) for page in lecture["pages"])>5000 for lecture in lectures["lectures"].values())
assert sum(len(lecture["pages"]) for lecture in lectures["lectures"].values())==40
print('PASS: 5 tracks, 36 topics, 72 mini checks, 108 topic tests, 30 unique exam questions, 27 atlas tasks, 10 Russian SVG, no short notes or flashcards')