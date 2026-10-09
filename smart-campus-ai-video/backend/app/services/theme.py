"""
Centralized Educational Theme Configuration for SmartCampus AI Video.
Provides coherent color palettes, typography tokens, and layout safe-areas
for Light (Workspace / White) and Dark (Cinematic Office / Default) visual styles.
"""

from dataclasses import dataclass
from typing import Optional


# ==============================================================================
# Light Educational Theme (Modern Workspace / Off-White Wall)
# ==============================================================================
LIGHT_PRIMARY_TEXT = "#172B4D"       # Deep Navy: authoritative, ultra-readable
LIGHT_SECONDARY_TEXT = "#475569"     # Slate: elegant subtitles and secondary points
LIGHT_ACCENT_BLUE = "#2563EB"        # Professional Blue: underlines, key verbs, primary accents
LIGHT_ACCENT_TEAL = "#0F766E"        # Muted Teal: domain badges, secondary highlights
LIGHT_DIAGRAM_OUTLINE = "#172B4D"    # Navy outline for shapes, boxes, connectors
LIGHT_DIAGRAM_SURFACE = "#FFFFFF"    # Pure White diagram surface
LIGHT_SURFACE_LIGHT = "#F8FAFC"      # Light neutral surface (slate-50)
LIGHT_HIGHLIGHT_SURFACE = "#EAF2FF"  # Pale Blue highlight surface
LIGHT_BORDER = "#D6D3D1"             # Warm Grey borders, dividers, separators
LIGHT_ACCENT_WARM = "#D97706"        # Amber-600 for callouts and formulas


# ==============================================================================
# Dark Educational Theme (Cinematic Office / Dark Navy Mode)
# ==============================================================================
DARK_PRIMARY_TEXT = "#FFFFFF"
DARK_SECONDARY_TEXT = "#94A3B8"
DARK_ACCENT_BLUE = "#38BDF8"
DARK_ACCENT_TEAL = "#2DD4BF"
DARK_DIAGRAM_OUTLINE = "#60A5FA"
DARK_DIAGRAM_SURFACE = "#0F172A"
DARK_SURFACE_LIGHT = "#1E293B"
DARK_HIGHLIGHT_SURFACE = "#1E3A8A"
DARK_BORDER = "#334155"
DARK_ACCENT_WARM = "#F59E0B"


# ==============================================================================
# Central Wall Spatial Safe Area Coordinates (Manim Units)
# Screen bounds: X in [-7.11, +7.11], Y in [-4.0, +4.0]
# Bookshelf: X < -4.5
# Window / Plant: X > +4.5
# Wooden Desk: Y < -2.6
# ==============================================================================
CENTRAL_WALL_MAX_WIDTH = 8.6
CENTRAL_WALL_SIDE_WIDTH = 5.2
WALL_TOP_BUFF = 0.65
WALL_DESK_MIN_Y = -2.2  # Strictly above wooden desk & subtitles


@dataclass
class EducationalPalette:
    """Palette container providing exact hex tokens according to the active theme."""
    is_light: bool

    @property
    def primary_text(self) -> str:
        return LIGHT_PRIMARY_TEXT if self.is_light else DARK_PRIMARY_TEXT

    @property
    def secondary_text(self) -> str:
        return LIGHT_SECONDARY_TEXT if self.is_light else DARK_SECONDARY_TEXT

    @property
    def title_text(self) -> str:
        return LIGHT_PRIMARY_TEXT if self.is_light else DARK_ACCENT_BLUE

    @property
    def accent_blue(self) -> str:
        return LIGHT_ACCENT_BLUE if self.is_light else DARK_ACCENT_BLUE

    @property
    def accent_teal(self) -> str:
        return LIGHT_ACCENT_TEAL if self.is_light else DARK_ACCENT_TEAL

    @property
    def accent_warm(self) -> str:
        return LIGHT_ACCENT_WARM if self.is_light else DARK_ACCENT_WARM

    @property
    def outline(self) -> str:
        return LIGHT_DIAGRAM_OUTLINE if self.is_light else DARK_DIAGRAM_OUTLINE

    @property
    def card_fill(self) -> str:
        return LIGHT_SURFACE if self.is_light else DARK_SURFACE_LIGHT

    @property
    def card_opacity(self) -> float:
        return 0.92 if self.is_light else 0.40

    @property
    def card_border(self) -> str:
        return LIGHT_BORDER if self.is_light else DARK_BORDER

    @property
    def highlight_surface(self) -> str:
        return LIGHT_HIGHLIGHT_SURFACE if self.is_light else DARK_HIGHLIGHT_SURFACE

    @property
    def divider(self) -> str:
        return LIGHT_BORDER if self.is_light else DARK_BORDER


def get_theme_palette(is_light: bool = False) -> EducationalPalette:
    """Returns the EducationalPalette for the specified light/dark mode."""
    return EducationalPalette(is_light=is_light)
