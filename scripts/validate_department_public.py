#!/usr/bin/env python3
"""Ensure ALL actual department microscopy files are present before publishing.
The file names and image bytes are independent of the clinical/morphological review.
"""
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'data/department-public.json').read_text('utf-8'))
assert data['version']==1 and data['release']=='1.6.0'
records=data['specimens']
assert len(records)==14 and len({r['source_filename'] for r in records})==14
assert sum(r['kind']=='photo' for r in records)==7
assert sum(r['kind']=='video-frames' for r in records)==7
assert sum(len(r['frames']) for r in records)==21
required_photos={
'12 ПЕРСТНАЯ КИШКА.jpg','ТОНКАЯ КИШКА.jpg','ПИЛОРИЧЕСКАЯ ЧАСТЬ ЖЕЛУДКА.jpg',
'ПОПЕРЕЧНЫЙ РАЗМЕР ПИЩЕВОДА.jpg','ДНО ЖЕЛУДКА.jpg','ТОЛСТАЯ КИШКА.jpg',
'ПЕРЕХОД ПИЩЕВОДА В ЖЕЛУДОК.jpg'
}
required_videos={
'ЛИСТОВИДНЫЕ СОСОЧКИ.MOV','НЕБНАЯ МИНДАЛИНА.MOV','НИТЕВИДНЫЕ СОСОЧКИ.MOV',
'ОКОЛОУШНАЯ ЖЕЛЕЗА.MOV','РАЗВИТИЕ ЗУБА, ОБРАЗОВАНИЕ ДЕНТИНА И ЭМАЛИ.MOV',
'РАЗВИТИЕ ЗУБА, ЭМАЛЕВЫЙ ОРГАН.MOV','СМЕШАННАЯ СЛЮННАЯ ЖЕЛЕЗА.MOV'
}
assert {r['source_filename'] for r in records if r['kind']=='photo'}==required_photos
assert {r['source_filename'] for r in records if r['kind']=='video-frames'}==required_videos
for item in records:
 assert item['title']==item['source_filename'].rsplit('.',1)[0]
 assert item['chapters'] and len(item['cues'])>=3
 if item['kind']=='video-frames': assert len(item['frames'])==2
 for frame in item['frames']:
  relative=Path(frame['src'])
  assert relative.parts[:2]==('photos','department')
  path=ROOT/relative
  assert path.is_file(),f'PUBLICATION BLOCKED: missing actual source image {relative}'
  content=path.read_bytes()
  assert len(content)>10000,f'Damaged/tiny file: {relative}'
  assert content[:2]==b'\xff\xd8' and content[-2:]==b'\xff\xd9', f'Not valid JPEG envelope: {relative}'
print('PASS: 14 exact departmental specimens and all 21 authentic JPG frames present on disk')
