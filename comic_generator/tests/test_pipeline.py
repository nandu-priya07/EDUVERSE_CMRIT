"""
Comprehensive Pipeline Test Suite for Educational Comic Generator.
Tests layout calculations, Pillow speech bubble rendering, fallback image generation,
composite PNG page assembly, and PDF export.
"""

import os
import sys

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from PIL import Image
from app.core.config import settings
from app.comic.panel import PanelData, DialogueItem
from app.comic.layout import ComicLayout
from app.comic.speech_bubbles import render_panel_overlays
from app.comic.composer import assemble_comic_page
from app.image_generation.image_generator import PanelImageGenerator

def test_layout_math():
    print("[1/5] Testing Comic Layout Math...")
    layout = ComicLayout(num_panels=4, page_width=1600)
    assert layout.cols == 2
    assert layout.rows == 2
    x1, y1, x2, y2 = layout.get_panel_box(0)
    assert x1 == 30
    assert y1 == 170
    assert (x2 - x1) == (y2 - y1)  # Square panel
    print("  ✓ Layout math test passed!")

def test_speech_bubble_rendering():
    print("[2/5] Testing Pillow Speech Bubble & Caption Rendering...")
    test_img = Image.new("RGB", (768, 768), (200, 200, 220))
    panel = PanelData(
        panel_number=1,
        concept="Apache Spark Architecture",
        scene="Professor explaining Driver Node",
        dialogue=[
            DialogueItem(character="PROFESSOR AGENT", text="Spark Driver converts user code into a Logical Plan!"),
            DialogueItem(character="STUDENT ALEX", text="What role do Cluster Managers play?")
        ],
        caption="Spark Driver splits tasks across worker nodes seamlessly."
    )
    rendered = render_panel_overlays(test_img, panel)
    assert rendered is not None
    assert rendered.size == (768, 768)
    print("  ✓ Speech bubble rendering test passed!")

def test_fallback_image_generation():
    print("[3/5] Testing Vector Art Fallback Panel Generator...")
    gen = PanelImageGenerator()
    out_path = os.path.join(settings.TEMP_DIR, "test_fallback_panel.png")
    result_path = gen.generate_panel(
        prompt="Test prompt",
        output_path=out_path,
        panel_number=1,
        concept="Spark Driver Node"
    )
    assert os.path.exists(result_path)
    print(f"  ✓ Fallback image created at: {result_path}")

def test_composite_assembly_and_pdf():
    print("[4/5] Testing Composite Page Assembly & PDF Export...")
    panels = []
    for i in range(1, 5):
        p = PanelData(
            panel_number=i,
            concept=f"Concept {i}: Spark Phase {i}",
            scene=f"Scene illustration for panel {i}",
            dialogue=[DialogueItem(character="AGENT", text=f"Dialogue for panel {i}")],
            caption=f"Caption explaining educational concept {i}."
        )
        # Create temporary panel image
        img = Image.new("RGB", (768, 768), (100 + i * 30, 80 + i * 20, 150))
        img_path = os.path.join(settings.PANEL_DIR, f"test_panel_{i}.png")
        os.makedirs(os.path.dirname(img_path), exist_ok=True)
        img.save(img_path)
        p.image_path = img_path
        panels.append(p)
        
    out_png = os.path.join(settings.COMIC_DIR, "test_composite.png")
    out_pdf = os.path.join(settings.COMIC_DIR, "test_composite.pdf")
    
    png_res, pdf_res = assemble_comic_page(
        panels=panels,
        title="Apache Spark Architecture",
        output_png_path=out_png,
        output_pdf_path=out_pdf
    )
    
    assert os.path.exists(png_res), "PNG output missing!"
    assert os.path.exists(pdf_res), "PDF output missing!"
    print(f"  ✓ Composite PNG created: {png_res}")
    print(f"  ✓ Composite PDF created: {pdf_res}")

def test_all():
    print("\n==========================================")
    print("RUNNING COMIC GENERATOR PIPELINE VERIFICATION")
    print("==========================================\n")
    test_layout_math()
    test_speech_bubble_rendering()
    test_fallback_image_generation()
    test_composite_assembly_and_pdf()
    print("\n==========================================")
    print("ALL PIPELINE VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("==========================================\n")

if __name__ == "__main__":
    test_all()
