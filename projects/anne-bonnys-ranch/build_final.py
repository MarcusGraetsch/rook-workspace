#!/usr/bin/env python3
import os, io, time, subprocess
from PIL import Image, ImageCms
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas as pdf_canvas

PROJECT = "/root/.openclaw/workspace/projects/anne-bonnys-ranch"

# FLYERALARM Hissflagge 250×150 cm Querformat, Befestigung links
DPI = 150

DATA_W = int(2530 * DPI / 25.4)
DATA_H = int(1550 * DPI / 25.4)
SAFE_W = int(2480 * DPI / 25.4)
SAFE_H = int(1500 * DPI / 25.4)
SAFE_MARGIN_X = int(40 * DPI / 25.4)
SAFE_MARGIN_Y = int(40 * DPI / 25.4)

print(f"Canvas: {DATA_W}×{DATA_H} px @ {DPI} dpi")
print(f"Safe area: {SAFE_W}×{SAFE_H} px")

# Load upscaled image
img = Image.open(os.path.join(PROJECT, "fahne-upscaled-4x.png")).convert("RGB")
print(f"Upscaled image: {img.size}")

# Scale to fit in safe area
max_w = SAFE_W - 2*SAFE_MARGIN_X
max_h = SAFE_H - 2*SAFE_MARGIN_Y
scale = min(max_w / img.width, max_h / img.height)
logo_w = int(img.width * scale)
logo_h = int(img.height * scale)
print(f"Logo scaled to: {logo_w}×{logo_h} px")

offset_x = (DATA_W - logo_w) // 2
offset_y = (DATA_H - logo_h) // 2
print(f"Offset: ({offset_x}, {offset_y})")

# Create canvas (white bg)
canvas = Image.new("RGB", (DATA_W, DATA_H), (255, 255, 255))
logo_resized = img.resize((logo_w, logo_h), Image.LANCZOS)
canvas.paste(logo_resized, (offset_x, offset_y))

# Save RGB preview
canvas.save(os.path.join(PROJECT, "fahne_preview_RGB.jpg"), quality=95)

# CMYK conversion using ImageCms.profileToProfile
ICC_CMYK = os.path.join(PROJECT, "profiles", "ISOcoated_v2_300_eci.icc")

# Create an sRGB profile inline
src_profile = ImageCms.createProfile("sRGB")
dst_profile = ImageCms.getOpenProfile(ICC_CMYK)

t0 = time.time()
print("Converting RGB to CMYK...")
canvas_cmyk = ImageCms.profileToProfile(
    canvas, 
    src_profile, 
    dst_profile, 
    outputMode="CMYK"
)
print(f"CMYK done in {time.time()-t0:.1f}s, mode: {canvas_cmyk.mode}")

# Save as high-quality JPEG (CMYK)
print("Saving CMYK JPEG...")
canvas_cmyk.save(os.path.join(PROJECT, "fahne_250x150_CMYK.jpg"), quality=95)
print(f"CMYK JPEG saved")

# Build PDF
print("Building PDF...")
t0 = time.time()
pdf_path = os.path.join(PROJECT, "fahne-250x150_hissflagge.pdf")
c = pdf_canvas.Canvas(pdf_path, pagesize=(2530*mm, 1550*mm))
c.setTitle("Anne Bonny's Ranch - Hissflagge 250×150 cm")
c.setAuthor("Anne Bonny's Ranch Fan Club")
c.setSubject("Hissflagge 250×150 cm Querformat, Befestigung links")

c.drawImage(os.path.join(PROJECT, "fahne_250x150_CMYK.jpg"), 0, 0, width=2530*mm, height=1550*mm)
c.save()
print(f"PDF saved: {pdf_path} ({os.path.getsize(pdf_path)/(1024*1024):.1f} MB) in {time.time()-t0:.1f}s")

print("All done!")
