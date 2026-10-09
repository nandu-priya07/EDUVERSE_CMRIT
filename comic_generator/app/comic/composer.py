"""
Comic Composer module.
Assembles panel images, speech bubbles, overlays, title banners, and margins
into final composite PNG images and multi-page or single-page PDFs.
"""

import os
from typing import List, Optional, Tuple
from PIL import Image, ImageDraw
from app.comic.panel import PanelData
from app.comic.speech_bubbles import render_panel_overlays, get_font
from app.comic.layout import ComicLayout
from app.core.logging import logger

def assemble_comic_page(
    panels: List[PanelData],
    title: str,
    output_png_path: str,
    output_pdf_path: Optional[str] = None,
    page_width: int = 1600
) -> Tuple[str, Optional[str]]:
    """
    Assembles panel images into a single composite comic page.
    Renders overlays (bubbles/captions), title header, borders, and footer.
    Exports to PNG and optionally PDF.
    """
    layout = ComicLayout(num_panels=len(panels), page_width=page_width)
    
    # Create background image with dark modern background
    bg_color = (15, 23, 42)  # Dark slate background #0F172A
    canvas = Image.new("RGB", (layout.page_width, layout.page_height), bg_color)
    draw = ImageDraw.Draw(canvas)
    
    # 1. Header Banner
    header_rect = [0, 0, layout.page_width, layout.header_height]
    # Gradient/Accent top line
    draw.rectangle(header_rect, fill=(30, 41, 59))
    draw.line([(0, layout.header_height), (layout.page_width, layout.header_height)], fill=(124, 58, 237), width=4)
    
    brand_font = get_font(max(14, int(page_width * 0.012)), bold=True)
    draw.text((30, 18), "SMARTCAMPUS EDUCATIONAL COMICS", fill=(168, 85, 247), font=brand_font)
    
    title_font = get_font(max(24, int(page_width * 0.024)), bold=True)
    draw.text((30, 48), title.upper(), fill=(255, 255, 255), font=title_font)
    
    sub_font = get_font(max(14, int(page_width * 0.013)))
    draw.text((30, 96), "AI Visual Learning Series • Generated for SmartCampus LMS", fill=(148, 163, 184), font=sub_font)
    
    # 2. Render & Place Panels
    for idx, panel in enumerate(panels):
        x1, y1, x2, y2 = layout.get_panel_box(idx)
        pw = x2 - x1
        ph = y2 - y1
        
        # Load panel image (or fallback empty canvas)
        if panel.image_path and os.path.exists(panel.image_path):
            panel_img = Image.open(panel.image_path).convert("RGB")
        else:
            # Fallback gray box
            panel_img = Image.new("RGB", (pw, ph), (51, 65, 85))
            pdraw = ImageDraw.Draw(panel_img)
            pdraw.text((pw // 4, ph // 2), f"Panel {panel.panel_number}", fill=(255, 255, 255))
            
        # Resize to grid panel dimensions
        panel_img = panel_img.resize((pw, ph), Image.Resampling.LANCZOS)
        
        # Add overlays (dialogue bubbles, captions, badge)
        processed_img = render_panel_overlays(panel_img, panel)
        
        # Paste onto main canvas
        canvas.paste(processed_img, (x1, y1))
        
        # Draw sleek border around panel
        draw.rectangle([x1, y1, x2, y2], outline=(124, 58, 237), width=3)
        
        # Save processed single panel if requested
        if panel.processed_image_path:
            os.makedirs(os.path.dirname(panel.processed_image_path), exist_ok=True)
            processed_img.save(panel.processed_image_path, format="PNG")

    # 3. Footer
    footer_y = layout.page_height - layout.footer_height
    footer_font = get_font(max(12, int(page_width * 0.011)))
    footer_text = "Generated using local Qwen2.5 & Stable Diffusion Turbo • SmartCampus AI Engine"
    draw.text((30, footer_y + 20), footer_text, fill=(100, 116, 139), font=footer_font)
    
    # Save composite PNG
    os.makedirs(os.path.dirname(output_png_path), exist_ok=True)
    canvas.save(output_png_path, format="PNG")
    logger.info(f"Comic composite PNG saved to: {output_png_path}")
    
    # Save PDF if requested
    actual_pdf_path = None
    if output_pdf_path:
        os.makedirs(os.path.dirname(output_pdf_path), exist_ok=True)
        # Convert RGB canvas to PDF
        canvas.save(output_pdf_path, format="PDF", resolution=100.0)
        actual_pdf_path = output_pdf_path
        logger.info(f"Comic PDF saved to: {output_pdf_path}")
        
    return output_png_path, actual_pdf_path
