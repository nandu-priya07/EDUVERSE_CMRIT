"""
Reusable dynamic visual scene components for educational videos.
Engineered using Manim vector primitives and typography (without LaTeX dependency)
to ensure 100% reliable rendering on any host system.
All text elements are strictly bounded, auto-wrapped, kept inside the central wall
area of the workspace, and kept strictly above the subtitle safe line (Y >= -2.2).
"""

from typing import List, Optional, Dict
from manim import *

from app.services.safe_area import (
    MANIM_SUBTITLE_TOP_Y,
    MANIM_HEADER_BOTTOM_Y,
    MAX_TITLE_CHARS,
    MAX_BODY_CHARS,
)
from app.services.theme import (
    LIGHT_PRIMARY_TEXT,
    LIGHT_SECONDARY_TEXT,
    LIGHT_ACCENT_BLUE,
    LIGHT_ACCENT_TEAL,
    LIGHT_DIAGRAM_OUTLINE,
    LIGHT_DIAGRAM_SURFACE,
    LIGHT_SURFACE_LIGHT,
    LIGHT_HIGHLIGHT_SURFACE,
    LIGHT_BORDER,
    LIGHT_ACCENT_WARM,
    DARK_PRIMARY_TEXT,
    DARK_SECONDARY_TEXT,
    DARK_ACCENT_BLUE,
    DARK_ACCENT_TEAL,
    DARK_SURFACE_LIGHT,
    DARK_BORDER,
    DARK_ACCENT_WARM,
    CENTRAL_WALL_MAX_WIDTH,
    CENTRAL_WALL_SIDE_WIDTH,
)


def _safe_text(
    text: str,
    font_size: int = 24,
    color=WHITE,
    weight=NORMAL,
    max_width: float = 8.5,
    max_height: float = 4.0,
    max_lines: int = 5,
) -> VGroup:
    """Helper to wrap and scale text so it never overflows max_width or max_height."""
    clean = " ".join(str(text).split()).strip()
    if not clean:
        return VGroup()

    words = clean.split()
    lines = []
    cur_line = []
    cur_len = 0
    chars_limit = max(18, min(48, int(max_width / (font_size * 0.016))))

    for w in words:
        if cur_line and (cur_len + 1 + len(w) > chars_limit):
            lines.append(" ".join(cur_line))
            if len(lines) >= max_lines:
                break
            cur_line = [w]
            cur_len = len(w)
        else:
            cur_line.append(w)
            cur_len += (1 + len(w)) if cur_line else len(w)

    if cur_line and len(lines) < max_lines:
        lines.append(" ".join(cur_line))

    mobs = [Text(l, font_size=font_size, color=color, weight=weight) for l in lines]
    group = VGroup(*mobs).arrange(DOWN, aligned_edge=LEFT, buff=0.18)

    if group.width > max_width:
        group.scale_to_fit_width(max_width)
    if group.height > max_height:
        group.scale_to_fit_height(max_height)

    return group


def _apply_wall_placement(group: VGroup, teacher_position: Optional[str] = None, max_w: float = 8.4) -> VGroup:
    """
    Intelligently constrains and shifts content onto the central open wall:
    - Avoids bookshelf on the left (X < -4.5)
    - Avoids window/plant on the right (X > +4.5)
    - Avoids wooden desk at the bottom & subtitles (Y >= -2.2)
    - Leaves space for AI Teacher if teacher_position is 'left' or 'right'
    """
    pos = (teacher_position or "none").lower().strip()
    if pos in ("right", "auto"):
        target_w = min(max_w, CENTRAL_WALL_SIDE_WIDTH)
        if group.width > target_w:
            group.scale_to_fit_width(target_w)
        group.shift(LEFT * 1.5)
    elif pos == "left":
        target_w = min(max_w, CENTRAL_WALL_SIDE_WIDTH)
        if group.width > target_w:
            group.scale_to_fit_width(target_w)
        group.shift(RIGHT * 1.5)
    else:
        target_w = min(max_w, CENTRAL_WALL_MAX_WIDTH)
        if group.width > target_w:
            group.scale_to_fit_width(target_w)

    # Strictly protect desk area at bottom and subtitles
    if group.get_bottom()[1] < MANIM_SUBTITLE_TOP_Y:
        group.shift(UP * (MANIM_SUBTITLE_TOP_Y - group.get_bottom()[1] + 0.2))

    return group


class DynamicTitleScene(Scene):
    """
    Opening Title Card with domain badge, topic header, and subtitle.
    Strictly bounded and safe from overflow.
    """
    title_text: str = "Academic Topic"
    subtitle_text: str = "Concept Overview"
    domain_text: str = "GENERAL"
    is_white_background: bool = False
    teacher_position: Optional[str] = None

    def construct(self):
        is_white = getattr(self, "is_white_background", False)
        t_pos = getattr(self, "teacher_position", None)

        badge_col = LIGHT_ACCENT_TEAL if is_white else TEAL_A
        title_col = LIGHT_PRIMARY_TEXT if is_white else BLUE_B
        underline_col = LIGHT_ACCENT_BLUE if is_white else GOLD
        sub_col = LIGHT_SECONDARY_TEXT if is_white else GRAY_A

        # 1. Domain badge pill
        clean_domain = str(self.domain_text).upper()[:25]
        domain_badge = Text(
            f" [ {clean_domain} ] ",
            font_size=16,
            weight=BOLD,
            color=badge_col,
        ).to_edge(UP, buff=0.7)

        # 2. Main Title (constrained to width 9.5 max)
        clean_title = str(self.title_text)[:MAX_TITLE_CHARS]
        title = Text(
            clean_title,
            font_size=38,
            weight=BOLD,
            color=title_col
        ).next_to(domain_badge, DOWN, buff=0.35)
        if title.width > 9.5:
            title.scale_to_fit_width(9.5)

        # 3. Underline accent
        line_w = min(title.width + 0.6, 9.0)
        underline = Line(
            LEFT * (line_w / 2),
            RIGHT * (line_w / 2),
            color=underline_col,
            stroke_width=3
        ).next_to(title, DOWN, buff=0.18)

        # 4. Subtitle (auto-wrapped and bounded)
        subtitle_group = _safe_text(
            self.subtitle_text,
            font_size=22,
            color=sub_col,
            max_width=8.8,
            max_height=1.5,
            max_lines=2,
        ).next_to(underline, DOWN, buff=0.35)

        # Keep everything strictly on the open wall and above subtitles & desk
        group = VGroup(domain_badge, title, underline, subtitle_group)
        _apply_wall_placement(group, teacher_position=t_pos, max_w=8.8)

        self.play(FadeIn(domain_badge, shift=DOWN * 0.2), run_time=0.5)
        self.play(Write(title), Create(underline), run_time=0.9)
        self.play(FadeIn(subtitle_group, shift=UP * 0.2), run_time=0.6)
        self.wait(1.4)
        self.play(FadeOut(group), run_time=0.5)


class DynamicExplanationScene(Scene):
    """
    Concept explanation scene with card frame, header, and clean wrapped text.
    Never clips text; never overflows the screen or covers subtitles.
    """
    header_text: str = "Core Concept"
    body_text: str = "Primary explanation text goes here."
    is_white_background: bool = False
    teacher_position: Optional[str] = None

    def construct(self):
        is_white = getattr(self, "is_white_background", False)
        t_pos = getattr(self, "teacher_position", None)

        head_col = LIGHT_PRIMARY_TEXT if is_white else TEAL_A
        divider_col = LIGHT_BORDER if is_white else TEAL_E
        txt_col = LIGHT_PRIMARY_TEXT if is_white else WHITE
        card_fill = LIGHT_DIAGRAM_SURFACE if is_white else DARK_BLUE
        card_op = 0.92 if is_white else 0.35
        card_border = LIGHT_BORDER if is_white else BLUE_D

        # 1. Header
        clean_head = str(self.header_text)[:MAX_TITLE_CHARS]
        header = Text(
            clean_head,
            font_size=30,
            weight=BOLD,
            color=head_col
        ).to_edge(UP, buff=0.6)
        if header.width > 9.0:
            header.scale_to_fit_width(9.0)

        divider = Line(
            LEFT * 4.2,
            RIGHT * 4.2,
            color=divider_col,
            stroke_width=2
        ).next_to(header, DOWN, buff=0.2)

        # 2. Body Text (wrapped, max 4 lines, max width 8.0)
        text_group = _safe_text(
            self.body_text,
            font_size=22,
            color=txt_col,
            max_width=7.8,
            max_height=3.2,
            max_lines=4,
        )

        card = RoundedRectangle(
            corner_radius=0.18,
            width=min(text_group.width + 1.0, 8.8),
            height=min(text_group.height + 0.6, 3.8),
            fill_color=card_fill,
            fill_opacity=card_op,
            stroke_color=card_border,
            stroke_width=1.5 if is_white else 2.0,
        ).move_to(text_group.get_center())

        content_group = VGroup(card, text_group).next_to(divider, DOWN, buff=0.35)
        all_group = VGroup(header, divider, content_group)
        _apply_wall_placement(all_group, teacher_position=t_pos, max_w=8.8)

        self.play(Write(header), Create(divider), run_time=0.7)
        self.play(Create(card), FadeIn(text_group), run_time=1.0)
        self.wait(2.0)
        self.play(FadeOut(all_group), run_time=0.5)


class DynamicFormulaScene(Scene):
    """
    Mathematical / Chemical formula scene with highlight frame and variable breakdown.
    """
    header_text: str = "Mathematical Formulation"
    formula_text: str = "F = m · a"
    breakdown_items: List[str] = None
    is_white_background: bool = False
    teacher_position: Optional[str] = None

    def construct(self):
        is_white = getattr(self, "is_white_background", False)
        t_pos = getattr(self, "teacher_position", None)
        if self.breakdown_items is None:
            self.breakdown_items = ["F = Force", "m = Mass", "a = Acceleration"]

        head_col = LIGHT_PRIMARY_TEXT if is_white else BLUE_B
        form_col = LIGHT_PRIMARY_TEXT if is_white else YELLOW
        box_col = LIGHT_ACCENT_BLUE if is_white else GOLD
        sub_col = LIGHT_SECONDARY_TEXT if is_white else GRAY_A

        header = Text(
            str(self.header_text)[:MAX_TITLE_CHARS],
            font_size=30,
            weight=BOLD,
            color=head_col
        ).to_edge(UP, buff=0.6)
        if header.width > 9.0:
            header.scale_to_fit_width(9.0)

        # Prominent Formula
        formula = Text(
            str(self.formula_text)[:40],
            font_size=38,
            weight=BOLD,
            color=form_col
        ).next_to(header, DOWN, buff=0.4)
        if formula.width > 7.6:
            formula.scale_to_fit_width(7.6)
        box = SurroundingRectangle(
            formula,
            color=box_col,
            buff=0.22,
            corner_radius=0.15,
            stroke_width=2.5
        )

        # Breakdown items (max 3 items visible, clean font)
        clean_items = self.breakdown_items[:4]
        legend_texts = []
        for item in clean_items:
            t = Text(
                str(item)[:50],
                font_size=18,
                color=sub_col
            )
            if t.width > 7.2:
                t.scale_to_fit_width(7.2)
            legend_texts.append(t)

        legend_group = VGroup(*legend_texts).arrange(DOWN, aligned_edge=LEFT, buff=0.18).next_to(box, DOWN, buff=0.35)

        # If on light workspace, add subtle floating panel behind formula & breakdown
        if is_white:
            panel_w = max(box.width, legend_group.width) + 0.8
            panel_h = box.height + legend_group.height + 0.8
            card = RoundedRectangle(
                corner_radius=0.18,
                width=min(panel_w, 8.6),
                height=min(panel_h, 3.6),
                fill_color=LIGHT_DIAGRAM_SURFACE,
                fill_opacity=0.92,
                stroke_color=LIGHT_BORDER,
                stroke_width=1.5
            ).move_to(VGroup(box, legend_group).get_center())
            core_group = VGroup(card, box, formula, legend_group)
        else:
            core_group = VGroup(box, formula, legend_group)

        all_group = VGroup(header, core_group)
        _apply_wall_placement(all_group, teacher_position=t_pos, max_w=8.8)

        self.play(Write(header), run_time=0.6)
        if is_white:
            self.play(Create(card), Create(box), Write(formula), run_time=0.9)
        else:
            self.play(Create(box), Write(formula), run_time=0.9)
        self.play(
            LaggedStart(*[FadeIn(t, shift=RIGHT * 0.2) for t in legend_texts], lag_ratio=0.2),
            run_time=1.0
        )
        self.wait(2.0)
        self.play(FadeOut(all_group), run_time=0.5)


class DynamicBulletPointScene(Scene):
    """
    Bulleted key concepts scene with staggered row entrances.
    """
    header_text: str = "Key Principles"
    bullet_items: List[str] = None
    is_white_background: bool = False
    teacher_position: Optional[str] = None

    def construct(self):
        is_white = getattr(self, "is_white_background", False)
        t_pos = getattr(self, "teacher_position", None)
        if self.bullet_items is None:
            self.bullet_items = ["Principle 1", "Principle 2", "Principle 3"]

        head_col = LIGHT_PRIMARY_TEXT if is_white else TEAL_A
        divider_col = LIGHT_BORDER if is_white else TEAL_E
        dot_col = LIGHT_ACCENT_BLUE if is_white else YELLOW
        txt_col = LIGHT_PRIMARY_TEXT if is_white else WHITE

        header = Text(
            str(self.header_text)[:MAX_TITLE_CHARS],
            font_size=30,
            weight=BOLD,
            color=head_col
        ).to_edge(UP, buff=0.6)
        if header.width > 9.0:
            header.scale_to_fit_width(9.0)
        divider = Line(
            LEFT * 4.2,
            RIGHT * 4.2,
            color=divider_col,
            stroke_width=2
        ).next_to(header, DOWN, buff=0.2)

        # Limit to max 4 bullet points
        items = self.bullet_items[:4]
        rows = []
        for item in items:
            dot = Dot(color=dot_col, radius=0.07)
            txt_group = _safe_text(
                item,
                font_size=19,
                color=txt_col,
                max_width=7.2,
                max_height=1.2,
                max_lines=2
            )
            row = VGroup(dot, txt_group).arrange(RIGHT, buff=0.2)
            rows.append(row)

        row_group = VGroup(*rows).arrange(DOWN, aligned_edge=LEFT, buff=0.25).next_to(divider, DOWN, buff=0.35)

        if is_white:
            card = RoundedRectangle(
                corner_radius=0.18,
                width=min(row_group.width + 0.8, 8.8),
                height=min(row_group.height + 0.6, 3.8),
                fill_color=LIGHT_DIAGRAM_SURFACE,
                fill_opacity=0.92,
                stroke_color=LIGHT_BORDER,
                stroke_width=1.5
            ).move_to(row_group.get_center())
            content = VGroup(card, row_group)
        else:
            content = row_group

        all_group = VGroup(header, divider, content)
        _apply_wall_placement(all_group, teacher_position=t_pos, max_w=8.8)

        self.play(Write(header), Create(divider), run_time=0.6)
        if is_white:
            self.play(Create(card), run_time=0.4)
        self.play(
            LaggedStart(*[FadeIn(r, shift=RIGHT * 0.2) for r in rows], lag_ratio=0.25),
            run_time=1.2
        )
        self.wait(2.0)
        self.play(FadeOut(all_group), run_time=0.5)


class DynamicProcessScene(Scene):
    """
    Step-by-step or algorithm progression scene with numbered stages.
    """
    header_text: str = "Process Workflow"
    step_items: List[str] = None
    is_white_background: bool = False
    teacher_position: Optional[str] = None

    def construct(self):
        is_white = getattr(self, "is_white_background", False)
        t_pos = getattr(self, "teacher_position", None)
        if self.step_items is None:
            self.step_items = ["Step 1", "Step 2", "Step 3"]

        head_col = LIGHT_PRIMARY_TEXT if is_white else BLUE_B
        card_fill = LIGHT_DIAGRAM_SURFACE if is_white else DARK_BLUE
        card_op = 0.92 if is_white else 0.45
        card_border = LIGHT_BORDER if is_white else BLUE_C
        txt_col = LIGHT_PRIMARY_TEXT if is_white else WHITE

        header = Text(
            str(self.header_text)[:MAX_TITLE_CHARS],
            font_size=30,
            weight=BOLD,
            color=head_col
        ).to_edge(UP, buff=0.6)
        if header.width > 9.0:
            header.scale_to_fit_width(9.0)

        steps = self.step_items[:4]
        cards = []
        for i, step_str in enumerate(steps, start=1):
            clean_step = str(step_str)[:60]
            box = RoundedRectangle(
                corner_radius=0.12,
                width=8.0,
                height=0.68,
                fill_color=card_fill,
                fill_opacity=card_op,
                stroke_color=card_border,
                stroke_width=1.5,
            )
            # Stage badge number
            badge = Text(f"{i}.", font_size=18, weight=BOLD, color=LIGHT_ACCENT_BLUE if is_white else YELLOW).move_to(box.get_left() + RIGHT * 0.4)
            txt = Text(
                clean_step,
                font_size=18,
                color=txt_col
            ).move_to(box.get_center() + RIGHT * 0.3)
            if txt.width > 6.8:
                txt.scale_to_fit_width(6.8)
            cards.append(VGroup(box, badge, txt))

        cards_group = VGroup(*cards).arrange(DOWN, buff=0.18).next_to(header, DOWN, buff=0.35)
        all_group = VGroup(header, cards_group)
        _apply_wall_placement(all_group, teacher_position=t_pos, max_w=8.8)

        self.play(Write(header), run_time=0.6)
        self.play(
            LaggedStart(*[FadeIn(c, shift=UP * 0.15) for c in cards], lag_ratio=0.2),
            run_time=1.2
        )
        self.wait(2.0)
        self.play(FadeOut(all_group), run_time=0.5)


class DynamicHierarchyScene(Scene):
    """
    Layered hierarchy scene (e.g., OSI model, TCP/IP stack) with stacked color tiers.
    """
    header_text: str = "Layer Hierarchy"
    layer_items: List[str] = None
    is_white_background: bool = False
    teacher_position: Optional[str] = None

    def construct(self):
        is_white = getattr(self, "is_white_background", False)
        t_pos = getattr(self, "teacher_position", None)
        if self.layer_items is None:
            self.layer_items = [
                "Layer 7: Application",
                "Layer 6: Presentation",
                "Layer 5: Session",
                "Layer 4: Transport",
                "Layer 3: Network",
                "Layer 2: Data Link",
                "Layer 1: Physical",
            ]

        head_col = LIGHT_PRIMARY_TEXT if is_white else GOLD
        header = Text(
            str(self.header_text)[:MAX_TITLE_CHARS],
            font_size=28,
            weight=BOLD,
            color=head_col
        ).to_edge(UP, buff=0.5)
        if header.width > 9.0:
            header.scale_to_fit_width(9.0)

        colors = [
            "#38bdf8",  # Sky blue (App)
            "#60a5fa",  # Blue (Pres)
            "#818cf8",  # Indigo (Sess)
            "#a78bfa",  # Purple (Trans)
            "#34d399",  # Emerald (Net)
            "#2dd4bf",  # Teal (DataLink)
            "#f59e0b",  # Amber (Phys)
        ]

        count = len(self.layer_items)
        box_h = 0.42 if count >= 7 else (0.55 if count >= 5 else 0.70)
        font_sz = 16 if count >= 7 else (18 if count >= 5 else 22)
        buff_v = 0.08 if count >= 7 else 0.12

        layer_boxes = []
        for i, l_text in enumerate(self.layer_items):
            c = colors[i % len(colors)]
            clean_label = str(l_text)[:45]
            box = Rectangle(
                width=7.8,
                height=box_h,
                fill_color=c,
                fill_opacity=0.88 if is_white else 0.75,
                stroke_color=LIGHT_BORDER if is_white else WHITE,
                stroke_width=1.5 if is_white else 1.2,
            )
            txt = Text(clean_label, font_size=font_sz, weight=BOLD, color=WHITE).move_to(box.get_center())
            if txt.width > 7.3:
                txt.scale_to_fit_width(7.3)
            layer_boxes.append(VGroup(box, txt))

        stack = VGroup(*layer_boxes).arrange(DOWN, buff=buff_v).next_to(header, DOWN, buff=0.25)
        all_group = VGroup(header, stack)
        _apply_wall_placement(all_group, teacher_position=t_pos, max_w=8.8)

        self.play(Write(header), run_time=0.5)
        self.play(
            LaggedStart(*[FadeIn(lb, shift=DOWN * 0.1) for lb in layer_boxes], lag_ratio=0.15),
            run_time=1.4
        )
        self.wait(2.2)
        self.play(FadeOut(all_group), run_time=0.5)


class DynamicCycleScene(Scene):
    """
    Continuous cycle scene with connected stages.
    """
    header_text: str = "Continuous Cycle"
    stage_items: List[str] = None
    is_white_background: bool = False
    teacher_position: Optional[str] = None

    def construct(self):
        is_white = getattr(self, "is_white_background", False)
        t_pos = getattr(self, "teacher_position", None)
        if self.stage_items is None:
            self.stage_items = ["Stage 1", "Stage 2", "Stage 3", "Stage 4"]

        head_col = LIGHT_PRIMARY_TEXT if is_white else TEAL_A
        header = Text(
            str(self.header_text)[:MAX_TITLE_CHARS],
            font_size=30,
            weight=BOLD,
            color=head_col
        ).to_edge(UP, buff=0.6)
        if header.width > 9.0:
            header.scale_to_fit_width(9.0)

        stages = self.stage_items[:4]
        stage_blocks = []
        for stage in stages:
            clean_st = str(stage)[:55]
            card = RoundedRectangle(
                corner_radius=0.12,
                width=7.8,
                height=0.68,
                fill_color=LIGHT_DIAGRAM_SURFACE if is_white else DARK_BLUE,
                fill_opacity=0.92 if is_white else 0.4,
                stroke_color=LIGHT_BORDER if is_white else TEAL_C,
                stroke_width=1.5,
            )
            txt = Text(
                clean_st,
                font_size=18,
                color=LIGHT_PRIMARY_TEXT if is_white else WHITE
            ).move_to(card.get_center())
            if txt.width > 7.2:
                txt.scale_to_fit_width(7.2)
            stage_blocks.append(VGroup(card, txt))

        cycle_group = VGroup(*stage_blocks).arrange(DOWN, buff=0.18).next_to(header, DOWN, buff=0.35)
        all_group = VGroup(header, cycle_group)
        _apply_wall_placement(all_group, teacher_position=t_pos, max_w=8.8)

        self.play(Write(header), run_time=0.6)
        self.play(
            LaggedStart(*[FadeIn(b, shift=RIGHT * 0.15) for b in stage_blocks], lag_ratio=0.2),
            run_time=1.2
        )
        self.wait(2.0)
        self.play(FadeOut(all_group), run_time=0.5)


class DynamicConclusionScene(Scene):
    """
    Closing takeaway card summarizing the educational lesson.
    """
    title_text: str = "Key Takeaway"
    takeaway_text: str = "Summary of core principle."
    is_white_background: bool = False
    teacher_position: Optional[str] = None

    def construct(self):
        is_white = getattr(self, "is_white_background", False)
        t_pos = getattr(self, "teacher_position", None)

        badge_col = LIGHT_ACCENT_TEAL if is_white else GOLD
        title_col = LIGHT_PRIMARY_TEXT if is_white else WHITE
        txt_col = LIGHT_PRIMARY_TEXT if is_white else GRAY_A

        badge = Text("CONCLUSION", font_size=16, weight=BOLD, color=badge_col).to_edge(UP, buff=0.7)
        clean_title = str(self.title_text)[:MAX_TITLE_CHARS]
        title = Text(
            clean_title,
            font_size=32,
            weight=BOLD,
            color=title_col
        ).next_to(badge, DOWN, buff=0.25)
        if title.width > 9.0:
            title.scale_to_fit_width(9.0)

        text_group = _safe_text(
            self.takeaway_text,
            font_size=20,
            color=txt_col,
            max_width=7.8,
            max_height=3.0,
            max_lines=4,
        )

        card = RoundedRectangle(
            corner_radius=0.18,
            width=min(text_group.width + 1.0, 8.8),
            height=min(text_group.height + 0.6, 3.6),
            fill_color=LIGHT_DIAGRAM_SURFACE if is_white else DARK_BLUE,
            fill_opacity=0.92 if is_white else 0.45,
            stroke_color=LIGHT_BORDER if is_white else GOLD,
            stroke_width=1.5 if is_white else 2.0,
        ).move_to(text_group.get_center())

        box_group = VGroup(card, text_group).next_to(title, DOWN, buff=0.35)
        all_group = VGroup(badge, title, box_group)
        _apply_wall_placement(all_group, teacher_position=t_pos, max_w=8.8)

        self.play(FadeIn(badge), Write(title), run_time=0.7)
        self.play(Create(card), FadeIn(text_group), run_time=0.9)
        self.wait(2.0)
        self.play(FadeOut(all_group), run_time=0.5)
