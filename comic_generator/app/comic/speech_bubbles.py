"""
Speech bubble and text overlay renderer using Pillow (PIL).
Renders dialogues, narrator captions, and panel badges over generated panel images.
"""

import os
from typing import List, Tuple, Optional
from PIL import Image, ImageDraw, ImageFont
from app.comic.panel import PanelData, DialogueItem
from app.core.logging import logger

def get_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    """Attempt to load standard system fonts, falling back to default PIL font."""
    font_names = [
        "arialbd.ttf" if bold else "arial.ttf",
        "segoeui.ttf",
        "calibri.ttf",
        "DejaVuSans.ttf"
    ]
    for font_name in font_names:
        try:
            return ImageFont.truetype(font_name, size)
        except OSError:
            continue
    return ImageFont.load_default()

def wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_width: int) -> List[str]:
    """Wrap text into multiple lines fitting within max_width pixels."""
    words = text.split()
    if not words:
        return []
    
    lines = []
    current_line = words[0]
    
    for word in words[1:]:
        test_line = f"{current_line} {word}"
        bbox = draw.textbbox((0, 0), test_line, font=font)
        w = bbox[2] - bbox[0]
        if w <= max_width:
            current_line = test_line
        else:
            lines.append(current_line)
            current_line = word
    lines.append(current_line)
    return lines

def render_panel_overlays(
    image: Image.Image,
    panel: PanelData,
    badge_text: Optional[str] = None
) -> Image.Image:
    """
    Renders speech bubbles for dialogues, caption boxes for notes/narrator text,
    and panel number badges directly onto the given PIL Image.
    """
    img = image.copy().convert("RGBA")
    w, h = img.size
    
    # Overlay layer for alpha drawing
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # 1. Draw Panel Badge (Top Left)
    panel_title = badge_text or f"PANEL {panel.panel_number}"
    badge_font = get_font(max(14, int(w * 0.022)), bold=True)
    bbox = draw.textbbox((0, 0), panel_title, font=badge_font)
    bw, bh = bbox[2] - bbox[0], bbox[3] - bbox[1]
    
    badge_padding = 8
    badge_rect = [12, 12, 12 + bw + badge_padding * 2, 12 + bh + badge_padding * 2]
    draw.rounded_rectangle(badge_rect, radius=6, fill=(15, 23, 42, 220), outline=(124, 58, 237, 255), width=2)
    draw.text((12 + badge_padding, 12 + badge_padding - 2), panel_title, fill=(255, 255, 255, 255), font=badge_font)

    # 2. Draw Dialogues (Speech Bubbles at Top/Middle region)
    if panel.dialogue:
        num_dialogues = len(panel.dialogue)
        bubble_y = 50  # Start below panel badge
        
        for idx, item in enumerate(panel.dialogue):
            if bubble_y >= h - 120:
                break  # Don't overlap bottom caption
                
            speaker = item.character.upper()
            text = item.text
            
            speaker_font = get_font(max(12, int(w * 0.02)), bold=True)
            text_font = get_font(max(12, int(w * 0.02)))
            
            max_bubble_w = int(w * 0.65)
            lines = wrap_text(draw, text, text_font, max_bubble_w - 20)
            
            # Compute bubble height
            line_height = int(w * 0.026)
            text_block_h = len(lines) * line_height
            speaker_h = int(w * 0.022) + 4
            bubble_h = text_block_h + speaker_h + 16
            
            # Calculate actual text max line width
            max_line_w = 0
            for l in lines:
                b = draw.textbbox((0, 0), l, font=text_font)
                max_line_w = max(max_line_w, b[2] - b[0])
            
            speaker_b = draw.textbbox((0, 0), speaker, font=speaker_font)
            speaker_w = speaker_b[2] - speaker_b[0]
            
            bubble_w = max(max_line_w, speaker_w) + 24
            bubble_w = min(bubble_w, max_bubble_w)
            
            # Position bubbles alternating left/right
            if idx % 2 == 0:
                bubble_x = 20
                tail_point = (bubble_x + 30, bubble_y + bubble_h + 12)
                tail_base1 = (bubble_x + 20, bubble_y + bubble_h)
                tail_base2 = (bubble_x + 40, bubble_y + bubble_h)
            else:
                bubble_x = w - bubble_w - 20
                tail_point = (bubble_x + bubble_w - 30, bubble_y + bubble_h + 12)
                tail_base1 = (bubble_x + bubble_w - 40, bubble_y + bubble_h)
                tail_base2 = (bubble_x + bubble_w - 20, bubble_y + bubble_h)
                
            bubble_rect = [bubble_x, bubble_y, bubble_x + bubble_w, bubble_y + bubble_h]
            
            # Draw tail
            draw.polygon([tail_base1, tail_point, tail_base2], fill=(255, 255, 255, 240), outline=(30, 41, 59, 255))
            
            # Draw speech bubble box
            draw.rounded_rectangle(bubble_rect, radius=12, fill=(255, 255, 255, 245), outline=(30, 41, 59, 255), width=2)
            
            # Speaker header
            draw.text((bubble_x + 12, bubble_y + 8), speaker, fill=(124, 58, 237, 255), font=speaker_font)
            
            # Dialogue lines
            curr_line_y = bubble_y + speaker_h + 8
            for line in lines:
                draw.text((bubble_x + 12, curr_line_y), line, fill=(15, 23, 42, 255), font=text_font)
                curr_line_y += line_height
                
            bubble_y += bubble_h + 20

    # 3. Draw Caption Overlay (Bottom Banner)
    if panel.caption or panel.concept:
        caption_text = panel.caption if panel.caption else panel.concept
        caption_font = get_font(max(12, int(w * 0.021)))
        
        cap_lines = wrap_text(draw, caption_text, caption_font, w - 40)
        cap_line_h = int(w * 0.028)
        cap_box_h = len(cap_lines) * cap_line_h + 20
        
        cap_rect = [0, h - cap_box_h, w, h]
        draw.rectangle(cap_rect, fill=(15, 23, 42, 215))
        draw.line([(0, h - cap_box_h), (w, h - cap_box_h)], fill=(124, 58, 237, 255), width=2)
        
        curr_y = h - cap_box_h + 10
        for l in cap_lines:
            lb = draw.textbbox((0, 0), l, font=caption_font)
            lw = lb[2] - lb[0]
            lx = (w - lw) // 2  # centered text
            draw.text((lx, curr_y), l, fill=(241, 245, 249, 255), font=caption_font)
            curr_y += cap_line_h

    # Composite image and return RGB
    final_img = Image.alpha_composite(img, overlay)
    return final_img.convert("RGB")
