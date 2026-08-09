#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
המרת דף מהמאגר שבדרייב לתמונות שהאפליקציה מגישה.

למה בכלל להמיר ולא לטעון מהדרייב ישירות
---------------------------------------
הסטודיו קורא פיקסלים מהתמונה כדי לזהות טורים ושורות. דפדפן חוסם
קריאת פיקסלים מתמונה שהגיעה מדומיין אחר (canvas מזוהם), ודרייב
אינו שולח כותרות שמתירות זאת. בנוסף, מה שיושב שם הוא PDF, ודפדפן
אינו יודע לצייר PDF לקנבס בלי ספרייה כבדה. לכן ההמרה נעשית כאן,
פעם אחת לדף, והאפליקציה מגישה תמונות.

מה מיוצר לכל דף
---------------
  daf/<מסכת>/<דף>-gemara-a.webp     צורת הדף, עמוד א׳
  daf/<מסכת>/<דף>-gemara-b.webp     צורת הדף, עמוד ב׳
  daf/<מסכת>/<דף>-chavruta-01.webp  חברותא, עמוד אחר עמוד
  daf/index.json                    מה קיים, לבורר שבסטודיו

הרוחב
-----
2000px לצורת הדף. במדידה על תענית ב׳/ה׳/י׳/כ׳ מרווח השורה שם הוא
33px ברוחב 2539; ב-2000 הוא 26px, ועדיין מעל הרעש בהפרש נוח.
מתחת ל-1600 השכבות מתחילות להתקרב וזיהוי הטורים נעשה שביר.
החברותא היא A4 בטור אחד ומרווחת, ולכן 1400px מספיקים לה בשפע.

שימוש
-----
    python3 tools/build-daf.py taanit ב gemara.pdf chavruta.pdf

קבצי ה-PDF נמשכים מהדרייב של הרכז דרך המחבר, ומועברים לכאן.
"""
import json
import os
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'daf')
INDEX = os.path.join(OUT, 'index.json')

W_GEMARA = 2000
W_CHAVRUTA = 1400
DPI = 200

AMUD = ['a', 'b']


def render(pdf, dpi=DPI):
    """PDF → רשימת קבצי PNG, עמוד אחר עמוד."""
    tmp = tempfile.mkdtemp()
    base = os.path.join(tmp, 'p')
    subprocess.run(['pdftoppm', '-r', str(dpi), '-png', pdf, base], check=True)
    return sorted(os.path.join(tmp, f) for f in os.listdir(tmp) if f.endswith('.png'))


def to_webp(src, dst, width, quality=80):
    from PIL import Image
    im = Image.open(src)
    if im.width != width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    # גווני אפור: הדפים שחור-לבן, וצבע רק מנפח את הקובץ
    im.convert('L').save(dst, 'WEBP', quality=quality, method=6)
    return os.path.getsize(dst)


def build(masechet, daf, gemara_pdf, chavruta_pdf):
    d = os.path.join(OUT, masechet)
    os.makedirs(d, exist_ok=True)
    made, total = [], 0

    pages = render(gemara_pdf)
    if len(pages) > 2:
        print(f'  אזהרה: צורת הדף ב-{len(pages)} עמודים, ציפיתי לשניים')
    for i, p in enumerate(pages[:2]):
        name = f'{daf}-gemara-{AMUD[i]}.webp'
        total += to_webp(p, os.path.join(d, name), W_GEMARA)
        made.append(name)

    chav = []
    if chavruta_pdf:
        for i, p in enumerate(render(chavruta_pdf), 1):
            name = f'{daf}-chavruta-{i:02d}.webp'
            total += to_webp(p, os.path.join(d, name), W_CHAVRUTA)
            chav.append(name)
        made += chav

    idx = {}
    if os.path.exists(INDEX):
        idx = json.load(open(INDEX, encoding='utf-8'))
    idx.setdefault(masechet, {})[daf] = {
        'gemara': [f'{daf}-gemara-{a}.webp' for a in AMUD[:len(pages[:2])]],
        'chavruta': chav
    }
    os.makedirs(OUT, exist_ok=True)
    json.dump(idx, open(INDEX, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    print(f'  {masechet} דף {daf}: {len(made)} עמודים · {total/1e6:.2f}MB')
    return made


if __name__ == '__main__':
    if len(sys.argv) < 4:
        print(__doc__); sys.exit(1)
    build(sys.argv[1], sys.argv[2], sys.argv[3],
          sys.argv[4] if len(sys.argv) > 4 else None)
