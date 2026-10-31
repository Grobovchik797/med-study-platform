#!/usr/bin/env python3
"""Validate the demonstration question bank (format only, not medical accuracy)."""
import json
import sys
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "data" / "questions.json"
errors = []
try:
    bank = json.loads(path.read_text(encoding="utf-8"))
except (ValueError, OSError) as error:
    raise SystemExit(f"Question file could not be read: {error}")

if bank.get("version") != 1:
    errors.append("Unsupported version")
questions = bank.get("questions", [])
if not isinstance(questions, list) or not questions:
    errors.append("Question list is empty")
    questions = []

seen = set()
for n, q in enumerate(questions, 1):
    if not isinstance(q, dict):
        errors.append(f"Question {n} not an object")
        continue
    for field in ("id", "question", "correct_answer", "explanation", "source"):
        if not isinstance(q.get(field), str) or not q[field].strip():
            errors.append(f"Question {n}: missing {field}")
    ident = q.get("id")
    if ident in seen:
        errors.append(f"Duplicate question ID {ident}")
    seen.add(ident)
    options = q.get("options", [])
    if not isinstance(options, list) or len(options) != 4:
        errors.append(f"Question {n}: must have exactly four options")
        continue
    letters = [o.get("id") for o in options if isinstance(o, dict)]
    texts = [o.get("text") for o in options if isinstance(o, dict)]
    if sorted(letters) != ["A", "B", "C", "D"]:
        errors.append(f"Question {n}: invalid option letters")
    if any(not isinstance(t, str) or not t.strip() for t in texts):
        errors.append(f"Question {n}: empty option")
    if q.get("correct_answer") not in letters:
        errors.append(f"Question {n}: correct_answer is not an option")

if errors:
    print("Validation errors:\n" + "\n".join(errors))
    sys.exit(1)
print(f"Validated {len(questions)} demo questions (structure only)")
