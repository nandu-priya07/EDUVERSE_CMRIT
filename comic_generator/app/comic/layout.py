"""
Grid layout math and positioning for assembling comic strips and full pages.
"""

from typing import List, Tuple, Dict, Any

class ComicLayout:
    """Calculates grid dimensions, panel bounds, and header/footer margins."""

    def __init__(
        self,
        num_panels: int,
        page_width: int = 1600,
        margin: int = 30,
        gap: int = 20,
        header_height: int = 140,
        footer_height: int = 60
    ):
        self.num_panels = num_panels
        self.page_width = page_width
        self.margin = margin
        self.gap = gap
        self.header_height = header_height
        self.footer_height = footer_height
        
        self.cols, self.rows = self._determine_grid(num_panels)
        self.panel_width = (self.page_width - (2 * margin) - ((self.cols - 1) * gap)) // self.cols
        # Panels are square (1:1 ratio)
        self.panel_height = self.panel_width
        
        self.page_height = (
            header_height +
            (2 * margin) +
            (self.rows * self.panel_height) +
            ((self.rows - 1) * gap) +
            footer_height
        )

    def _determine_grid(self, n: int) -> Tuple[int, int]:
        """Returns (cols, rows) for given panel count."""
        if n <= 1:
            return (1, 1)
        elif n == 2:
            return (2, 1)
        elif n <= 4:
            return (2, 2)
        elif n <= 6:
            return (2, 3)
        elif n <= 9:
            return (3, 3)
        else:
            rows = (n + 2) // 3
            return (3, rows)

    def get_panel_box(self, index: int) -> Tuple[int, int, int, int]:
        """Returns (x1, y1, x2, y2) bounds for panel at 0-based index."""
        col = index % self.cols
        row = index // self.cols
        
        x1 = self.margin + col * (self.panel_width + self.gap)
        y1 = self.header_height + self.margin + row * (self.panel_height + self.gap)
        x2 = x1 + self.panel_width
        y2 = y1 + self.panel_height
        
        return (x1, y1, x2, y2)
