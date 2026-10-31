#!/usr/bin/env python3
"""Check structural integrity of the Med Study VNS learning module.

Passing validation does not establish clinical or academic correctness.
"""
import json
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
ERRORS = []


def load(name):
    try:
        return json.loads((ROOT / "data" / name).read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        ERRORS.append(f"{name}: cannot parse JSON: {exc}")
        return {}


def required_text(obj, keys, context):
    for key in keys:
        if not isinstance(obj.get(key), str) or not obj[key].strip():
            ERRORS.append(f"{context}: missing or empty {key}")


def ncbi_link(url):
    try:
        p = urlparse(url)
        return p.scheme == "https" and p.netloc == "www.ncbi.nlm.nih.gov" and p.path.startswith("/books/NBK")
    except (ValueError, TypeError):
        return False


def check_questions(data):
    if data.get("version") != 1:
        ERRORS.append("questions.json: version must be 1")
    required_text(data, ("subject", "topic", "status", "description"), "question bank")
    questions = data.get("questions", [])
    if not isinstance(questions, list) or len(questions) != 20:
        ERRORS.append("questions.json: expected exactly 20 questions")
        return
    seen_ids, seen_stems = set(), set()
    for index, q in enumerate(questions, 1):
        tag = f"question {index}"
        if not isinstance(q, dict):
            ERRORS.append(f"{tag}: expected object")
            continue
        required_text(q, ("id", "topic", "question", "correct_answer", "explanation", "source"), tag)
        if q.get("id") in seen_ids:
            ERRORS.append(f"{tag}: duplicate id")
        seen_ids.add(q.get("id"))
        stem = " ".join(q.get("question", "").casefold().split())
        if stem in seen_stems:
            ERRORS.append(f"{tag}: duplicate wording")
        seen_stems.add(stem)
        if not ncbi_link(q.get("source", "")):
            ERRORS.append(f"{tag}: source must link to NCBI Bookshelf")
        options = q.get("options", [])
        if not isinstance(options, list) or len(options) != 4:
            ERRORS.append(f"{tag}: expected exactly 4 options")
            continue
        if any(not isinstance(opt, dict) for opt in options):
            ERRORS.append(f"{tag}: malformed option")
            continue
        ids = [opt.get("id") for opt in options]
        texts = [opt.get("text") for opt in options]
        if sorted(ids) != ["A", "B", "C", "D"]:
            ERRORS.append(f"{tag}: option IDs must be A–D once")
        if not all(isinstance(t, str) and t.strip() for t in texts):
            ERRORS.append(f"{tag}: option text is empty")
        if len({" ".join(t.casefold().split()) for t in texts if isinstance(t, str)}) != 4:
            ERRORS.append(f"{tag}: duplicate answer choice")
        if q.get("correct_answer") not in ids:
            ERRORS.append(f"{tag}: answer key not among choices")


def check_lesson(data):
    if data.get("version") != 1:
        ERRORS.append("lesson.json: version must be 1")
    required_text(data, ("subject", "topic", "subtitle", "intro", "disclaimer"), "lesson")
    sections = data.get("sections", [])
    if not isinstance(sections, list) or len(sections) != 5:
        ERRORS.append("lesson.json: expected five sections")
        return
    for n, section in enumerate(sections, 1):
        required_text(section, ("title", "lead", "takeaway"), f"section {n}")
        facts = section.get("facts", [])
        if not isinstance(facts, list) or len(facts) < 2:
            ERRORS.append(f"section {n}: not enough facts")
            continue
        for f in facts:
            required_text(f, ("term", "body"), f"section {n} fact")
    sources = data.get("sources", [])
    if not isinstance(sources, list) or len(sources) < 2:
        ERRORS.append("lesson.json: expected authoritative sources")
    else:
        for source in sources:
            required_text(source, ("title", "url"), "lesson source")
            if not ncbi_link(source.get("url", "")):
                ERRORS.append("lesson.json: invalid source link")
    plan = data.get("plan", {})
    if not isinstance(plan, dict) or not isinstance(plan.get("steps"), list) or len(plan["steps"]) != 4:
        ERRORS.append("lesson.json: expected four study steps")


if __name__ == "__main__":
    questions = load("questions.json")
    lesson = load("lesson.json")
    check_questions(questions)
    check_lesson(lesson)
    if ERRORS:
        print("VALIDATION FAILED")
        for issue in ERRORS:
            print(" -", issue)
        sys.exit(1)
    print("VALIDATION OK: 20 questions and 5 lesson sections (structural checks only)")
