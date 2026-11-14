#!/usr/bin/env python3
"""Builds the single-file writing-sheet prototype.

usage: python3 build.py --sheets <folder with the .docx sentence builders> [--out dist/prototype.html]

The sheets are teachers' own documents and are NOT kept in the repo. The page reads them in the
browser; without them the four reviewed sheets are simply missing and only the free-time builder loads.
"""
import argparse, base64, glob, json, os

FIND = {"wear": "Que_vas_a_llevar", "tech": "tecnolog", "trip": "fuiste_el_a", "bed": "dormitorio"}
here = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument("--sheets", required=True)
ap.add_argument("--out", default=os.path.join(here, "dist", "prototype.html"))
a = ap.parse_args()
data = {}
for key, frag in FIND.items():
    hits = [f for f in glob.glob(os.path.join(a.sheets, "*.docx")) if frag in os.path.basename(f)]
    if hits:
        data[key] = base64.b64encode(open(hits[0], "rb").read()).decode()
tpl = open(os.path.join(here, "template.html"), encoding="utf-8").read()
eng = open(os.path.join(here, "engine.js"), encoding="utf-8").read()
out = tpl.replace("<!--DOCX_DATA-->", "<script>window.__DOCX=" + json.dumps(data) + ";</script>").replace("/*ENGINE*/", eng)
os.makedirs(os.path.dirname(a.out), exist_ok=True)
open(a.out, "w", encoding="utf-8").write(out)
print("built", a.out, len(out), "bytes;", len(data), "of 4 sheets embedded")
