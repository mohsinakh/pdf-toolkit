#!/usr/bin/env python3
"""Generate Product Hunt launch images for the PDF Toolkit.

- 240x240 thumbnail
- 1270x760 gallery image(s)
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

OUT = os.path.join(
    "/Users/mohsin/Downloads/code/app income/pdf-toolkit", "launch-assets"
)
os.makedirs(OUT, exist_ok=True)

# Palette
BG = (18, 22, 32)          # dark navy
CARD = (30, 36, 52)
ACCENT = (255, 87, 34)     # orange highlight
ACCENT2 = (244, 196, 92)   # soft yellow
WHITE = (245, 245, 245)
GREY = (150, 160, 175)

def font(size, bold=False):
    paths = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold
        else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Helvetica.ttc",
    ]
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()

def rounded_rect(draw, box, radius, fill):
    draw.rounded_rectangle(box, radius=radius, fill=fill)

def chip(draw, x, y, text, f, fill, txt_col):
    w = draw.textlength(text, font=f) + 24
    draw.rounded_rectangle([x, y, x + w, y + f.size + 16], radius=8, fill=fill)
    draw.text((x + 12, y + 8), text, font=f, fill=txt_col)
    return w

def make_thumbnail():
    S = 240
    img = Image.new("RGB", (S, S), BG)
    d = ImageDraw.Draw(img)
    # subtle accent bar bottom-left
    d.rectangle([0, S - 18, S, S], fill=ACCENT)
    d.rectangle([0, 0, 10, S], fill=ACCENT)
    title = font(30, bold=True)
    sub = font(13)
    # "PDF" big
    d.text((28, 66), "PDF", font=title, fill=WHITE)
    # toolkit pill
    p = d.textlength("TOOLKIT", font=font(20, bold=True))
    d.rounded_rectangle([28, 108, 28 + p + 16, 138], radius=8, fill=CARD)
    d.text((36, 112), "TOOLKIT", font=font(20, bold=True), fill=ACCENT2)
    # features row-down
    d.text((30, 158), "Merge  Split  Compress", font=sub, fill=GREY)
    img.save(os.path.join(OUT, "ph-thumbnail-240x240.png"))
    print("saved ph-thumbnail-240x240.png")

def make_gallery(fname, headline, sublines):
    W, H = 1270, 760
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    # top accent bar
    d.rectangle([0, 0, W, 8], fill=ACCENT)
    # Left: text block
    lx = 90
    d.text((lx, 90), "PDF Toolkit", font=font(64, bold=True), fill=WHITE)
    y = 210
    for line in sublines:
        col = ACCENT2 if line[1] else GREY
        d.text((lx, y), line[0], font=font(30, bold=True) if line[1] else font(30), fill=col)
        y += 56
    # feature chips
    cy = 520
    fx = lx
    for feat in ["Merge", "Split", "Compress", "In-browser"]:
        w = chip(d, fx, cy, feat, font(24, bold=True), CARD, WHITE)
        fx += w + 18
    # privacy line
    d.text((lx, 640), "100% in your browser · your files never leave your device",
           font=font(24), fill=GREY)
    # Right: tool card mockup
    mx, my, mw, mh = 780, 150, 400, 460
    d.rounded_rectangle([mx, my, mx + mw, my + mh], radius=20, fill=CARD)
    d.text((mx + 24, my + 28), "Merge PDF", font=font(28, bold=True), fill=WHITE)
    # two fake file rows
    for i in range(3):
        ry = my + 90 + i * 70
        d.rounded_rectangle([mx + 24, ry, mx + mw - 24, ry + 46], radius=10, fill=BG)
        d.rounded_rectangle([mx + 36, ry + 13, mx + 66, ry + 33], radius=4, fill=ACCENT)
        d.text((mx + 78, ry + 12), "document-%d.pdf" % (i + 1), font=font(20), fill=WHITE)
    # merge button
    d.rounded_rectangle([mx + 24, my + mh - 70, mx + mw - 24, my + mh - 24],
                        radius=10, fill=ACCENT)
    d.text((mx + mw // 2 - 60, my + mh - 62), "Merge →", font=font(26, bold=True), fill=WHITE)
    img.save(os.path.join(OUT, fname))
    print("saved", fname)

make_thumbnail()
make_gallery(
    "ph-gallery-1-1270x760.png",
    "PDF Toolkit",
    [("Merge, split & compress PDFs", True),
     ("in your browser — no uploads,", False),
     ("no signup, totally free.", False)]
)
make_gallery(
    "ph-gallery-2-1270x760.png",
    "PDF Toolkit",
    [("Convert images & delete pages", True),
     ("Everything is 100% private.", False),
     ("Open source and free forever.", False)]
)
print("All images generated in", OUT)
