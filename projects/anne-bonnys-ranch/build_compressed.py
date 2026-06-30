#!/usr/bin/env python3
import os
from PIL import Image
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas as pdf_canvas

PROJECT = "/root/.openclaw/workspace/projects/anne-bonnys-ranch"
DPI = 150

DATA_W = int(2530 * DPI / 25.4)
DATA_H = int(1550 * DPI / 25.4)

# Load existing CMYK JPEG
cmyk_img = Image.open(os.path.join(PROJECT, "fahne_250x150_CMYK.jpg"))
print(f"CMYK image: {cmyk_img.size}, mode: {cmyk_img.mode}")

# Re-save with lower quality for smaller PDF
compressed_jpg = os.path.join(PROJECT, "fahne_250x150_CMYK_compressed.jpg")
cmyk_img.save(compressed_jpg, quality=70)
print(f"Compressed JPEG: {os.path.getsize(compressed_jpg)/(1024*1024):.1f} MB")

# Build compressed PDF
pdf_path = os.path.join(PROJECT, "fahne-250x150_compressed.pdf")
c = pdf_canvas.Canvas(pdf_path, pagesize=(2530*mm, 1550*mm))
c.setTitle("Anne Bonny's Ranch - Hissflagge 250x150 cm")
c.setAuthor("Anne Bonny's Ranch Fan Club")
c.setSubject("Hissflagge 250x150 cm Querformat, Befestigung links")

c.drawImage(compressed_jpg, 0, 0, width=2530*mm, height=1550*mm)
c.save()
print(f"Compressed PDF: {pdf_path}, {os.path.getsize(pdf_path)/(1024*1024):.1f} MB")
