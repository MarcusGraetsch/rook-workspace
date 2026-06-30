#!/usr/bin/env python3
"""
Build print-ready PDF for FLYERALARM Hissflagge 250×150 cm Querformat
Befestigung: LINKS

Data format: 2530 × 1550 mm (Endformat 2500×1500 + Beschnitt)
Sichtmaß: 2480 × 1500 mm (4 cm Sicherheitsabstand links/rechts/oben/unten)
Einfassband: 2 cm (wird über das Layout gelegt)
"""

import os
import sys
import time
import numpy as np
from PIL import Image, ImageCms

# ─── CONFIG ────────────────────────────────────────────────────────────
PROJECT = "/root/.openclaw/workspace/projects/anne-bonnys-ranch"
DATA_W_MM = 2530   # Datenformat Breite mm
DATA_H_MM = 1550   # Datenformat Höhe mm
END_W_MM  = 2500   # Endformat Breite mm
END_H_MM  = 1500   # Endformat Höhe mm
SAFE_W_MM = 2480   # Sichtmaß Breite mm
SAFE_H_MM = 1500   # Sichtmaß Höhe mm
BLEED_TB  = 25     # Beschnitt oben/unten mm
BLEED_LR  = 15     # Beschnitt links/rechts mm
SAFE_DIST = 40     # Sicherheitsabstand mm (vom Sichtmaß-Rand)
FAST_DPI  = 150    # Output dpi

# Farbprofil
ICC_CMYK = os.path.join(PROJECT, "profiles", "ISOcoated_v2_300_eci.icc")
ICC_SRGB = os.path.join(PROJECT, "profiles", "sRGB.icc")

def mm_to_px(mm, dpi):
    return int(round(mm * dpi / 25.4))

# Pixelgrößen
data_w = mm_to_px(DATA_W_MM, FAST_DPI)
data_h = mm_to_px(DATA_H_MM, FAST_DPI)
safe_w = mm_to_px(SAFE_W_MM, FAST_DPI)
safe_h = mm_to_px(SAFE_H_MM, FAST_DPI)
safe_dist = mm_to_px(SAFE_DIST, FAST_DPI)

print(f"Output size: {data_w} × {data_h} px @ {FAST_DPI} dpi")
print(f"Safe area: {safe_w} × {safe_h} px")

# ─── LOAD & CONVERT IMAGE ──────────────────────────────────────────────
t0 = time.time()

# Warte auf Real-ESRGAN output
upscale_path = os.path.join(PROJECT, "fahne-upscaled-4x.png")
orig_path    = os.path.join(PROJECT, "fahne-original.jpg")

if os.path.exists(upscale_path):
    img_path = upscale_path
    print(f"Using Real-ESRGAN output: {upscale_path}")
else:
    img_path = orig_path
    print(f"WARNING: Using original (no upscale yet)")

img = Image.open(img_path).convert("RGB")
src_w, src_h = img.size
print(f"Source: {src_w} × {src_h} px, took {time.time()-t0:.1f}s")

# ─── RESIZE TO FIT SAFE AREA ──────────────────────────────────────────
# Logo soll möglichst groß in den safe area, mit SAFE_DIST Abstand
avail_w = safe_w - 2 * safe_dist
avail_h = safe_h - 2 * safe_dist

scale = min(avail_w / src_w, avail_h / src_h)
logo_w = int(src_w * scale)
logo_h = int(src_h * scale)
print(f"Logo scaled to {logo_w} × {logo_h} px (scale={scale:.3f})")

# Zentriere im data format
offset_x = (data_w - logo_w) // 2
offset_y = (data_h - logo_h) // 2
print(f"Logo position: ({offset_x}, {offset_y})")

# Erstelle weißes Canvas
canvas = Image.new("RGB", (data_w, data_h), (255, 255, 255))
canvas.paste(img.resize((logo_w, logo_h), Image.LANCZOS), (offset_x, offset_y))

# Convert to CMYK via LittleCMS (littlecms2 / lcms2 via Pillow)
print("Converting to CMYK...")
try:
    src_profile = ImageCms.createProfile("sRGB")
    dst_profile = ImageCms.getOpenProfile(ICC_CMYK)
    canvas_cmyk = ImageCms.ImageCmsProfile(src_profile).convert(
        canvas, outputProfile=ICC_CMYK, outputMode="CMYK"
    )
    print(f"CMYK conversion done, mode: {canvas_cmyk.mode}")
except Exception as e:
    print(f"CMYK conversion failed: {e}")
    print("Saving RGB fallback...")
    canvas.save(os.path.join(PROJECT, "fahne-print-ready_RGB.jpg"), quality=95)
    sys.exit(1)

# ─── BUILD PDF ────────────────────────────────────────────────────────
print("Building PDF...")
from reportlab.lib.pagesizes import mm
from reportlab.lib.units import mm as mm_unit
from reportlab.pdfgen import canvas as pdf_canvas
from reportlab.lib import colors

pdf_path = os.path.join(PROJECT, "fahne-250x150_hissflagge.pdf")
c = pdf_canvas.Canvas(pdf_path, pagesize=(DATA_W_MM * mm_unit, DATA_H_MM * mm_unit))
c.setTitle("Anne Bonny's Ranch - Hissflagge 250×150 cm")
c.setAuthor("Anne Bonny's Ranch Fan Club")
c.setSubject("Hissflagge 250×150 cm Querformat, Befestigung links")

# Convert CMYK PIL image to JPEG for embedding
import io
buf = io.BytesIO()
canvas_cmyk.save(buf, format='JPEG', quality=95)
buf.seek(0)
jpg_data = buf.read()

# Embed as JPEG (reportlab supports JPEG)
from reportlab.lib.utils import ImageReader
img_reader = ImageReader(io.BytesIO(jpg_data))
c.drawImage(img_reader, 0, 0, width=DATA_W_MM * mm_unit, height=DATA_H_MM * mm_unit)
c.save()

size_mb = os.path.getsize(pdf_path) / (1024*1024)
print(f"PDF saved: {pdf_path} ({size_mb:.1f} MB)")
print(f"Took {time.time()-t0:.1f}s total")

# Also save a high-quality preview JPG (RGB for verification)
preview_path = os.path.join(PROJECT, "fahne-250x150_preview_RGB.jpg")
canvas.save(preview_path, quality=95)
print(f"Preview (RGB): {preview_path}")
