#!/usr/bin/env python3
"""Protect full original-source anatomy coverage and mandatory Latin in Med Study."""
import json
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
read=lambda p: json.loads((ROOT/p).read_text("utf-8"))
course=read("data/cranial-nerves.json")
library=read("data/library.json")
catalog=read("data/subjects.json")

expected=["olfactory","optic","visual-reflexes","oculomotor","trochlear",
          "trigeminal-core","ophthalmic","maxillary","mandibular","abducens",
          "facial-main","facial-intracanal","facial-extracranial"]
assert course["version"]==2 and course["courseId"]=="anatomy-cranial-nerves"
assert course["studyFormat"]=="one-full-note"
assert course["source"]["filename"]=="Черепные нервы.pdf" and course["source"]["pages"]==14
assert course["scope"]["missing"]==["VIII","IX","X","XI","XII"]
assert course["terminologyReference"]["url"].startswith("https://ifaa.net/")
chapters=course["chapters"]
assert [ch["id"] for ch in chapters]==expected
assert len(chapters)==13
minimal_paragraphs=[19,20,21,19,10,24,23,27,28,11,24,35,37]
required={
 "olfactory":["брока","подмозолист","решётчат","митральн","крючка"],
 "optic":["палочки","биполярн","хиазм","правого глаза","левого глаза","грациоли"],
 "visual-reflexes":["предпокрышеч","добавочн","ресничн","конвергенц","аккомодац"],
 "oculomotor":["верхнюю прямую","musculus obliquus inferior","ресничн","пещерист"],
 "trochlear":["дорсальн","musculus obliquus superior","пещерист"],
 "trigeminal-core":["гассера","корково-ядерн","тройничн","постцентральн"],
 "ophthalmic":["тенториальн","надглазнич","nasociliaris","подблоков"],
 "maxillary":["круглое отверстие","скуло-височ","подглазничн","plexus dentalis superior","нёбн"],
 "mandibular":["foramen ovale","восемь","нижнее зубное","ушно-височ","щёчн"],
 "abducens":["пирамид","musculus rectus lateralis","пещерист"],
 "facial-main":["промежуточн","ganglion geniculi","коленца","шилососцевидн"],
 "facial-intracanal":["каменист","крыловидно-нёбн","барабанная струна","поднижнечелюстн","стременн"],
 "facial-extracranial":["околоушн","височн","щёчн","краевая","корково-ядерн"]
}
question_ids=set()
block_count=card_count=question_count=term_count=prose_length=0
for i,ch in enumerate(chapters):
    assert ch["title"] and ch["pages"] and re.search("[A-Za-z]{3,}",ch["latinTitle"]),ch["id"]
    assert "brief" not in ch and "deep" not in ch,ch["id"]
    terms=ch["terms"]
    assert len(terms)>=8 and len({term["ru"] for term in terms})==len(terms),ch["id"]
    assert all(term["ru"].strip() and re.search("[A-Za-z]{3,}",term["la"]) for term in terms),ch["id"]
    assert len(ch["sections"])>=2 and len(ch["questions"])==4 and len(ch["cards"])>=3,ch["id"]
    all_points=[p for section in ch["sections"] for p in section["points"]]
    assert len(all_points)>=minimal_paragraphs[i],ch["id"]
    assert all(len(p.strip())>=60 for p in all_points),ch["id"]
    text=" ".join(all_points).lower()
    for word in required[ch["id"]]:
        assert word in text,(ch["id"],"Lost PDF topic",word)
    for card in ch["cards"]:
        assert len(card["front"])>10 and len(card["back"])>=9
    for q in ch["questions"]:
        assert q["id"] not in question_ids and len(q["prompt"])>22
        question_ids.add(q["id"])
        assert len(q["explanation"])>=30 and len(q["options"])==4
        assert len(set(q["options"]))==4 and isinstance(q["answer"],int) and 0<=q["answer"]<4
    block_count+=len(ch["sections"])
    card_count+=len(ch["cards"])
    question_count+=len(ch["questions"])
    term_count+=len(terms)
    prose_length+=len(text)
assert (block_count,card_count,question_count)==(49,53,52)
assert term_count>=260 and term_count==course["terminologyTotal"]
assert prose_length>=50000,("Anatomy full text was shortened",prose_length)

section=library["subjects"]["anatomy"]["sections"]
assert len(section)==1 and section[0]["id"]=="nervous"
topics=section[0]["topics"]
assert len(topics)==27 and [t["chapterId"] for t in topics[:13]]==expected
for t in topics[:-1]:
    assert t["route"]=="cranial-chapter" and t["notes"]=={"full":True}
    assert t["quiz"] and t["flashcards"] and not t["atlas"]
assert topics[-1]["route"]=="cranial-exam" and topics[-1]["quiz"] and not topics[-1]["atlas"]
anatomy=next(s for s in catalog["subjects"] if s["id"]=="anatomy")
assert anatomy["status"]=="learning-material"
assert anatomy["topics"][0]["note_status"]=="available" and anatomy["topics"][0]["latin_status"]=="complete"
assert "brief_status" not in anatomy["topics"][0]

ui=(ROOT/"cranial-nerves.js").read_text("utf-8")
assert "['notes','Конспект']" in ui and "['cards','Карточки']" in ui and "['quiz','Тест']" in ui
assert "Краткий" not in ui and "Расширенный" not in ui and "chapter.brief" not in ui
assert "renderTerminology(chapter)" in ui and "cn-latin-inline" in ui
assert "./cranial-nerves.js" in (ROOT/"index.html").read_text("utf-8")
sw=(ROOT/"sw.js").read_text("utf-8")
assert '"./cranial-nerves.js"' in sw and '"./data/cranial-nerves.json"' in sw
assert "cranial-nerves.js" in (ROOT/"scripts/package_android_assets.py").read_text("utf-8")
assert "data/cranial-nerves.json" in (ROOT/".github/workflows/deploy.yml").read_text("utf-8")

# Extension is a separate source: guard the I–VII text while adding VIII–XII, without overwriting it.
extension=read("data/cranial-nerves-viii-xii.json")
ext_expected=["vestibulocochlear-core","cochlear-pathway","vestibular-pathway",
              "glossopharyngeal-core","glossopharyngeal-branches",
              "vagus-core","vagus-topography","vagus-head-neck","vagus-thoracic","vagus-abdominal",
              "accessory","hypoglossal-main","hypoglossal-cervical"]
assert extension["version"]==1 and extension["courseId"]=="anatomy-cranial-nerves-viii-xii"
assert extension["studyFormat"]=="one-full-note"
assert extension["source"]["filename"]=="Черепные нервы (1).pdf" and extension["source"]["pages"]==13
assert extension["scope"]["included"]==["VIII","IX","X","XI","XII"]
ext=extension["chapters"]
assert len(ext)==13 and [c["id"] for c in ext]==ext_expected
assert [t["chapterId"] for t in topics[13:-1]]==ext_expected
assert len({ch["id"] for ch in chapters+ext})==26
all_ids=set(question_ids)
ext_blocks=ext_cards=ext_questions=ext_terms=ext_length=0
for ch in ext:
    assert ch["roman"] in extension["scope"]["included"] and ch["latinTitle"],ch["id"]
    assert ch["source"]["filename"]==extension["source"]["filename"] and ch["pages"]
    assert "brief" not in ch and "deep" not in ch and len(ch["sections"])>=2
    assert len(ch["cards"])>=3 and len(ch["questions"])==4 and len(ch["terms"])>=12,ch["id"]
    assert len(set(x["ru"] for x in ch["terms"]))==len(ch["terms"]),ch["id"]
    assert all(x["ru"] and re.search("[A-Za-z]{3,}",x["la"]) for x in ch["terms"])
    points=[p for block in ch["sections"] for p in block["points"]]
    assert len(points)>=6 and all(len(p)>=70 for p in points),ch["id"]
    for card in ch["cards"]:
        assert card["front"] and len(card["back"])>=45,ch["id"]
    for q in ch["questions"]:
        assert q["id"] not in all_ids and len(q["options"])==4 and len(set(q["options"]))==4
        all_ids.add(q["id"])
        assert 0<=q["answer"]<4 and len(q["explanation"])>=60,ch["id"]
    ext_blocks+=len(ch["sections"]);ext_cards+=len(ch["cards"])
    ext_questions+=len(ch["questions"]);ext_terms+=len(ch["terms"])
    ext_length+=len(" ".join(points))
assert (ext_blocks,ext_cards,ext_questions,ext_terms)==(51,51,52,223)
assert ext_length>=30000,ext_length
assert (block_count+ext_blocks,card_count+ext_cards,question_count+ext_questions,term_count+ext_terms)==(100,104,104,486)
# Critical source correction guardrails: don't teach known inaccuracies as anatomical facts.
g={ch["id"]:" ".join(p for sec in ch["sections"] for p in sec["points"]).lower() for ch in ext}
assert "foramen ovale" in g["glossopharyngeal-branches"] and "foramen rotundum" in g["glossopharyngeal-branches"]
assert "проксимальных двух третей" in g["vagus-core"] and "дистальной" in g["vagus-abdominal"]
assert "отдельной ветви" in g["hypoglossal-cervical"] and "c2–c3" in g["hypoglossal-cervical"]
assert '"./data/cranial-nerves-viii-xii.json"' in sw
assert "data/cranial-nerves-viii-xii.json" in (ROOT/"scripts/package_android_assets.py").read_text("utf-8")
assert "data/cranial-nerves-viii-xii.json" in (ROOT/".github/workflows/deploy.yml").read_text("utf-8")
assert "cranialExtended" in (ROOT/"app.js").read_text("utf-8")
print(f"PASS: full cranial I–XII {len(chapters)+len(ext)} chapters, {prose_length+ext_length} prose chars, "
      f"{term_count+ext_terms} Latin terms, {block_count+ext_blocks} blocks, {card_count+ext_cards} cards, "
      f"{question_count+ext_questions} questions; original I–VII unchanged")

