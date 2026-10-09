"""
Manim Scene Renderer (Task 9C).
Renders educational visual scenes using Manim vector animation primitives.
Supports equations, physics simulations, graphs, diagrams, processes, and algorithms.
Produces verified MP4 output without crashing on unsupported types.
"""

import os
import sys
import time
import shutil
import logging
import subprocess
import tempfile
import re
from pathlib import Path
from typing import Dict, Any, Optional, List

from app.config import settings
from app.schemas.visual_scene import (
    VisualEngine,
    SceneType,
    RoutedScene,
    VisualScene,
    BackgroundStyle,
    TeacherPosition,
)
from app.schemas.render import RenderedScene
from app.services.renderers.base import SceneRenderer
from app.services.ffmpeg_service import ffmpeg_service
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
    CENTRAL_WALL_MAX_WIDTH,
    CENTRAL_WALL_SIDE_WIDTH,
)

logger = logging.getLogger(__name__)

# Quality flag mapping
QUALITY_FLAGS = {
    "low": "-ql",
    "low_quality": "-ql",
    "medium": "-qm",
    "medium_quality": "-qm",
    "high": "-qh",
    "high_quality": "-qh",
}


class ManimRenderer(SceneRenderer):
    """
    Renders RoutedScenes into MP4 videos using Manim vector animations.
    Reuses existing dynamic scene templates and vector components.
    """

    SUPPORTED_TYPES = {
        SceneType.TITLE,
        SceneType.EXPLANATION,
        SceneType.EQUATION,
        SceneType.DIAGRAM,
        SceneType.GRAPH,
        SceneType.PROCESS,
        SceneType.ALGORITHM,
        SceneType.PHYSICS_SIMULATION,
        SceneType.CHEMISTRY_VISUAL,
        SceneType.BIOLOGY_VISUAL,
        SceneType.TIMELINE,
        SceneType.COMPARISON,
        SceneType.TRANSITION,
        SceneType.CINEMATIC,
    }

    @property
    def engine_name(self) -> str:
        return "manim"

    def can_render(self, scene: RoutedScene) -> bool:
        """Checks if the scene is targeted for Manim or fallback to Manim, and has a supported scene type."""
        engine_matches = (
            scene.selected_engine in (VisualEngine.MANIM, VisualEngine.MIXED)
            or scene.fallback_engine == VisualEngine.MANIM
        )
        type_matches = scene.scene.scene_type in self.SUPPORTED_TYPES
        return engine_matches and type_matches

    def render(
        self,
        scene: RoutedScene,
        output_dir: Path,
        **kwargs: Any
    ) -> RenderedScene:
        """
        Execute Manim to render the scene and produce a real MP4.
        Saves to output_dir / "scene.mp4".
        """
        visual_scene = scene.scene
        scene_id = visual_scene.scene_id
        scene_type = visual_scene.scene_type

        output_dir.mkdir(parents=True, exist_ok=True)
        target_path = output_dir / "scene.mp4"

        quality = kwargs.get("quality", "medium_quality")
        quality_flag = QUALITY_FLAGS.get(quality, "-qm")

        # 1. Check supported types
        if visual_scene.scene_type not in self.SUPPORTED_TYPES:
            logger.warning("[ManimRenderer] Scene type '%s' is not supported by ManimRenderer.", scene_type)
            return RenderedScene(
                scene_id=scene_id,
                video_path="",
                duration_seconds=0.0,
                engine=self.engine_name,
                success=False,
                error=f"Scene type '{scene_type}' is not supported by ManimRenderer",
                metadata={"quality": quality, "requested_type": str(scene_type)},
            )

        # 2. Build Python Manim script
        script_code, scene_class_name = self._generate_script(visual_scene)

        # 3. Create isolated temp directory outside repo root to prevent uvicorn reloads
        temp_dir = Path(tempfile.mkdtemp(prefix="manim_scene_render_"))
        script_file = temp_dir / "scene_script.py"

        try:
            script_file.write_text(script_code, encoding="utf-8")
            start_time = time.perf_counter()

            is_white = (
                (visual_scene.visual_style or "").strip().lower() in ("white_background", "white", "white background")
                or getattr(visual_scene, "background_style", None) == BackgroundStyle.WHITE
                or (kwargs.get("visual_style") or "").strip().lower() in ("white_background", "white", "white background")
            )
            should_use_bg = kwargs.get("background_enabled", settings.VIDEO_BACKGROUND_ENABLED)
            if is_white:
                should_use_bg = True

            cmd = [
                sys.executable,
                "-m",
                "manim",
                "render",
                quality_flag,
            ]
            if should_use_bg:
                cmd.append("-t")
            cmd.extend([
                "--media_dir",
                str(temp_dir),
                str(script_file),
                scene_class_name,
            ])

            env = os.environ.copy()
            if "PYTHONHASHSEED" in env:
                seed_val = env.get("PYTHONHASHSEED", "")
                if seed_val != "random" and not (seed_val.isdigit() and 0 <= int(seed_val) <= 4294967295):
                    del env["PYTHONHASHSEED"]

            logger.info("[ManimRenderer] Executing Manim for scene %s (%s, transparent=%s)", scene_id, scene_type, should_use_bg)
            res = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env=env,
                cwd=str(settings.BASE_DIR),
            )

            if res.returncode != 0:
                logger.error("[ManimRenderer] Manim CLI failed for %s:\n%s", scene_id, res.stderr[-500:])
                return RenderedScene(
                    scene_id=scene_id,
                    video_path="",
                    duration_seconds=0.0,
                    engine=self.engine_name,
                    success=False,
                    error=f"Manim execution error: {res.stderr[-300:].strip()}",
                    metadata={"returncode": res.returncode},
                )

            # 4. Locate the generated output file (.mov or .mp4)
            found_videos = list(temp_dir.glob("**/*.mov")) + list(temp_dir.glob("**/*.mp4"))
            if not found_videos:
                return RenderedScene(
                    scene_id=scene_id,
                    video_path="",
                    duration_seconds=0.0,
                    engine=self.engine_name,
                    success=False,
                    error="Manim executed successfully but no video output was discovered",
                )

            # Sort by file size descending to pick the rendered output over temp clips
            found_videos.sort(key=lambda p: p.stat().st_size, reverse=True)
            rendered_source = found_videos[0]

            if rendered_source.suffix.lower() == ".mov":
                target_path = output_dir / "scene.mov"

            shutil.copy2(str(rendered_source), str(target_path))
            render_elapsed = round(time.perf_counter() - start_time, 2)

            # 5. Probe media properties
            duration_seconds = visual_scene.duration_seconds
            width, height, codec = None, None, "h264"
            if ffmpeg_service.is_available():
                try:
                    probe = ffmpeg_service.probe_media(target_path)
                    duration_seconds = probe.get("duration", duration_seconds)
                    width = probe.get("width")
                    height = probe.get("height")
                    codec = probe.get("video_codec", "h264")
                except Exception as pe:
                    logger.warning("Optional probe failed: %s", pe)

            # Compute relative path
            try:
                rel_path = str(target_path.relative_to(settings.BASE_DIR)).replace("\\", "/")
            except ValueError:
                rel_path = f"generated/rendered_scenes/{target_path.parent.name}/{target_path.name}"

            logger.info(
                "[ManimRenderer] Scene %s rendered successfully: %s (%.2fs duration, %.2fs render time)",
                scene_id, target_path.name, duration_seconds, render_elapsed
            )

            return RenderedScene(
                scene_id=scene_id,
                video_path=rel_path,
                duration_seconds=duration_seconds,
                engine=self.engine_name,
                success=True,
                error=None,
                metadata={
                    "quality": quality,
                    "resolution": f"{width}x{height}" if width and height else "720p",
                    "codec": codec,
                    "render_elapsed_seconds": render_elapsed,
                    "scene_type": str(scene_type),
                },
            )

        except Exception as e:
            logger.error("[ManimRenderer] Exception during rendering scene %s: %s", scene_id, e, exc_info=True)
            return RenderedScene(
                scene_id=scene_id,
                video_path="",
                duration_seconds=0.0,
                engine=self.engine_name,
                success=False,
                error=f"ManimRenderer exception: {str(e)}",
            )
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    def _generate_script(self, visual_scene: VisualScene) -> tuple[str, str]:
        """
        Generate Manim python script code for the given scene.
        Returns (script_code, scene_class_name).
        """
        stype = visual_scene.scene_type
        class_name = f"Generated{stype.value.title().replace('_', '')}Scene"
        desc_lower = ((visual_scene.visual_description or "") + " " + (visual_scene.narration or "")).lower()

        is_white = (
            (visual_scene.visual_style or "").strip().lower() in ("white_background", "white", "white background", "light_workspace", "light")
            or getattr(visual_scene, "background_style", None) == BackgroundStyle.WHITE
        )

        t_pos = visual_scene.teacher_position if visual_scene.teacher_enabled else TeacherPosition.NONE
        t_pos_str = t_pos.value if hasattr(t_pos, "value") else str(t_pos or "none").lower()

        # 1. Newton's 2nd Law physics simulation
        if stype in (SceneType.PHYSICS_SIMULATION, SceneType.EQUATION) and any(
            k in desc_lower for k in ("newton", "force", "f = ma", "mass m", "accelerat")
        ):
            return self._script_newton_physics(visual_scene, class_name, is_white=is_white, teacher_position=t_pos_str), class_name

        # 2. Photosynthesis / Chloroplast biology
        if (stype in (SceneType.BIOLOGY_VISUAL, SceneType.EQUATION, SceneType.PROCESS, SceneType.COMPARISON) or "photosynthesis" in desc_lower) and any(
            k in desc_lower for k in ("photosynthesis", "chloroplast", "thylakoid", "glucose", "co2", "stomata")
        ):
            return self._script_photosynthesis(visual_scene, class_name, is_white=is_white, teacher_position=t_pos_str), class_name

        # 3. Binary Search algorithm / array
        if (stype in (SceneType.ALGORITHM, SceneType.PROCESS) or "binary search" in desc_lower) and any(
            k in desc_lower for k in ("binary search", "sorted array", "divide and conquer", "pointer", "log n")
        ):
            return self._script_binary_search(visual_scene, class_name, is_white=is_white, teacher_position=t_pos_str), class_name

        # 4. OSI Reference Model / Stack
        if any(k in desc_lower for k in ("osi model", "7 layers", "seven layers", "layer 7", "physical layer", "data link", "layer hierarchy", "network layers")):
            return self._script_osi_stack(visual_scene, class_name, is_white=is_white, teacher_position=t_pos_str), class_name

        # 5. Network packet flow / transmission
        if any(k in desc_lower for k in ("packet", "router", "switch", "host a", "server b", "transmission", "signal", "routing")):
            return self._script_network_flow(visual_scene, class_name, is_white=is_white, teacher_position=t_pos_str), class_name

        # 6. Vector Diagram
        if stype == SceneType.DIAGRAM and any(k in desc_lower for k in ("vector", "free body", "force", "normal force")):
            return self._script_vector_diagram(visual_scene, class_name, is_white=is_white, teacher_position=t_pos_str), class_name

        # 7. Cinematic Fallback
        if stype == SceneType.CINEMATIC:
            return self._script_cinematic_fallback(visual_scene, class_name, is_white=is_white, teacher_position=t_pos_str), class_name

        # Standard scene primitives with strict safe-area constraints
        if stype == SceneType.TITLE:
            return self._script_title(visual_scene, class_name, is_white=is_white, teacher_position=t_pos_str), class_name
        elif stype == SceneType.EQUATION:
            return self._script_formula(visual_scene, class_name, is_white=is_white, teacher_position=t_pos_str), class_name
        elif stype in (SceneType.PROCESS, SceneType.ALGORITHM):
            return self._script_process(visual_scene, class_name, is_white=is_white, teacher_position=t_pos_str), class_name
        elif stype == SceneType.GRAPH:
            return self._script_graph(visual_scene, class_name, is_white=is_white, teacher_position=t_pos_str), class_name
        else:
            return self._script_explanation(visual_scene, class_name, is_white=is_white, teacher_position=t_pos_str), class_name

    def _script_osi_stack(self, scene: VisualScene, class_name: str, is_white: bool = False, teacher_position: str = "none") -> str:
        """High-clarity 7-layer stacked model for OSI Reference Architecture."""
        head_col = '"#172B4D"' if is_white else "GOLD"
        stroke_col = '"#D6D3D1"' if is_white else "WHITE"
        return f"""from manim import *

class {class_name}(Scene):
    def construct(self):
        head = Text("OSI Reference Model: 7 Layers", font_size=28, weight=BOLD, color={head_col}).to_edge(UP, buff=0.45)
        if head.width > 9.0:
            head.scale_to_fit_width(9.0)

        layers = [
            ("7. Application", "#38bdf8", "HTTP, DNS, SSH (User Interface)"),
            ("6. Presentation", "#60a5fa", "Data formatting & TLS encryption"),
            ("5. Session", "#818cf8", "Connection management & dialogs"),
            ("4. Transport", "#a78bfa", "TCP segments & reliable delivery"),
            ("3. Network", "#34d399", "IP packets & routing across internet"),
            ("2. Data Link", "#2dd4bf", "MAC frames & switches on local LAN"),
            ("1. Physical", "#f59e0b", "Raw electrical/optical bit signals"),
        ]

        boxes = []
        for name, col, desc in layers:
            rect = Rectangle(width=7.8, height=0.42, fill_color=col, fill_opacity=0.88 if {is_white} else 0.75, stroke_color={stroke_col}, stroke_width=1.5 if {is_white} else 1.2)
            lbl = Text(name, font_size=15, weight=BOLD, color=WHITE).move_to(rect.get_left() + RIGHT * 1.5)
            detail = Text(desc, font_size=12, color=WHITE).move_to(rect.get_right() + LEFT * 2.3)
            if detail.width > 3.8:
                detail.scale_to_fit_width(3.8)
            boxes.append(VGroup(rect, lbl, detail))

        stack = VGroup(*boxes).arrange(DOWN, buff=0.08).next_to(head, DOWN, buff=0.25)
        
        all_group = VGroup(head, stack)
        if {repr(teacher_position)} == "right":
            all_group.shift(LEFT * 1.4)
            if all_group.width > 6.0:
                all_group.scale_to_fit_width(6.0)
        elif {repr(teacher_position)} == "left":
            all_group.shift(RIGHT * 1.4)
            if all_group.width > 6.0:
                all_group.scale_to_fit_width(6.0)

        if all_group.get_bottom()[1] < -2.2:
            all_group.shift(UP * (-2.2 - all_group.get_bottom()[1] + 0.15))

        self.play(Write(head), run_time=0.6)
        self.play(LaggedStart(*[FadeIn(b, shift=DOWN * 0.1) for b in boxes], lag_ratio=0.15), run_time=1.4)
        self.wait(2.0)
        self.play(FadeOut(all_group), run_time=0.5)
"""

    def _script_network_flow(self, scene: VisualScene, class_name: str, is_white: bool = False, teacher_position: str = "none") -> str:
        """Visual packet movement between nodes (Computer -> Router -> Server)."""
        title = repr(scene.educational_goal[:40] if scene.educational_goal else "Packet Transmission")
        head_col = '"#172B4D"' if is_white else "TEAL_A"
        link_col = '"#475569"' if is_white else "GRAY_A"
        node_fill = '"#FFFFFF"' if is_white else "DARK_BLUE"
        node_border = '"#2563EB"' if is_white else "BLUE"
        lbl_col = '"#172B4D"' if is_white else "WHITE"
        return f"""from manim import *

class {class_name}(Scene):
    def construct(self):
        head = Text({title}, font_size=28, weight=BOLD, color={head_col}).to_edge(UP, buff=0.5)
        if head.width > 9.0:
            head.scale_to_fit_width(9.0)

        # 3 Nodes: Host A, Router, Server B
        node_a = RoundedRectangle(corner_radius=0.15, width=2.0, height=1.1, color={node_border}, fill_color={node_fill}, fill_opacity=0.92 if {is_white} else 0.85).shift(LEFT * 3.8 + DOWN * 0.1)
        lbl_a = Text("Host A", font_size=17, weight=BOLD, color={lbl_col}).move_to(node_a.get_center())
        group_a = VGroup(node_a, lbl_a)

        router = Circle(radius=0.65, color="#0F766E" if {is_white} else GREEN, fill_color={node_fill} if {is_white} else "#064e3b", fill_opacity=0.92 if {is_white} else 0.85).shift(DOWN * 0.1)
        lbl_r = Text("Router", font_size=15, weight=BOLD, color={lbl_col}).move_to(router.get_center())
        group_r = VGroup(router, lbl_r)

        node_b = RoundedRectangle(corner_radius=0.15, width=2.0, height=1.1, color={node_border}, fill_color={node_fill}, fill_opacity=0.92 if {is_white} else 0.85).shift(RIGHT * 3.8 + DOWN * 0.1)
        lbl_b = Text("Server B", font_size=17, weight=BOLD, color={lbl_col}).move_to(node_b.get_center())
        group_b = VGroup(node_b, lbl_b)

        link_1 = Line(node_a.get_right(), router.get_left(), color={link_col}, stroke_width=3)
        link_2 = Line(router.get_right(), node_b.get_left(), color={link_col}, stroke_width=3)

        network_group = VGroup(node_a, lbl_a, router, lbl_r, node_b, lbl_b, link_1, link_2)
        if {repr(teacher_position)} == "right":
            network_group.shift(LEFT * 1.4)
            head.shift(LEFT * 1.4)
            if network_group.width > 6.4:
                network_group.scale_to_fit_width(6.4)
        elif {repr(teacher_position)} == "left":
            network_group.shift(RIGHT * 1.4)
            head.shift(RIGHT * 1.4)
            if network_group.width > 6.4:
                network_group.scale_to_fit_width(6.4)

        self.play(Write(head), run_time=0.5)
        self.play(FadeIn(group_a), FadeIn(group_r), FadeIn(group_b), Create(link_1), Create(link_2), run_time=0.8)

        # Animated Packet
        packet = RoundedRectangle(corner_radius=0.08, width=0.8, height=0.4, color="#D97706" if {is_white} else YELLOW, fill_color="#EAF2FF" if {is_white} else GOLD, fill_opacity=0.95).move_to(node_a.get_center())
        pkt_lbl = Text("Packet", font_size=12, color="#172B4D" if {is_white} else BLACK, weight=BOLD).move_to(packet.get_center())
        pkt_group = VGroup(packet, pkt_lbl)

        self.play(FadeIn(pkt_group), run_time=0.3)
        self.play(pkt_group.animate.move_to(router.get_center()), run_time=0.9)
        self.play(pkt_group.animate.move_to(node_b.get_center()), run_time=0.9)
        self.wait(1.2)
        self.play(FadeOut(VGroup(head, group_a, group_r, group_b, link_1, link_2, pkt_group)), run_time=0.5)
"""

    def _script_title(self, scene: VisualScene, class_name: str, is_white: bool = False, teacher_position: str = "none") -> str:
        title_text = repr(scene.visual_description[:50] if scene.visual_description else "Educational Lesson")
        subtitle_text = repr(scene.narration[:70] if scene.narration else "Instructional Overview")
        t_col = '"#172B4D"' if is_white else "BLUE_B"
        line_col = '"#2563EB"' if is_white else "GOLD"
        sub_col = '"#475569"' if is_white else "GRAY_A"
        return f"""from manim import *

class {class_name}(Scene):
    def construct(self):
        title = Text({title_text}, font_size=36, weight=BOLD, color={t_col}).to_edge(UP, buff=1.0)
        if title.width > 9.2:
            title.scale_to_fit_width(9.2)
        line_w = min(title.width + 0.6, 8.8)
        underline = Line(LEFT * (line_w/2), RIGHT * (line_w/2), color={line_col}, stroke_width=3).next_to(title, DOWN, buff=0.18)
        sub = Text({subtitle_text}, font_size=22, color={sub_col}).next_to(underline, DOWN, buff=0.35)
        if sub.width > 8.5:
            sub.scale_to_fit_width(8.5)
        group = VGroup(title, underline, sub)

        if {repr(teacher_position)} == "right":
            group.shift(LEFT * 1.5)
            if group.width > 6.0:
                group.scale_to_fit_width(6.0)
        elif {repr(teacher_position)} == "left":
            group.shift(RIGHT * 1.5)
            if group.width > 6.0:
                group.scale_to_fit_width(6.0)

        if group.get_bottom()[1] < -2.2:
            group.shift(UP * (-2.2 - group.get_bottom()[1] + 0.2))

        self.play(Write(title), Create(underline), run_time=0.8)
        self.play(FadeIn(sub, shift=UP * 0.2), run_time=0.6)
        self.wait(1.5)
        self.play(FadeOut(group), run_time=0.5)
"""

    def _script_formula(self, scene: VisualScene, class_name: str, is_white: bool = False, teacher_position: str = "none") -> str:
        header = repr(scene.educational_goal[:45] if scene.educational_goal else "Mathematical Formulation")
        formula = repr(scene.visual_description[:45] if scene.visual_description else "F = m · a")
        h_col = '"#172B4D"' if is_white else "BLUE_B"
        f_col = '"#172B4D"' if is_white else "YELLOW"
        box_col = '"#2563EB"' if is_white else "GOLD"
        return f"""from manim import *

class {class_name}(Scene):
    def construct(self):
        head = Text({header}, font_size=30, weight=BOLD, color={h_col}).to_edge(UP, buff=0.6)
        if head.width > 9.0:
            head.scale_to_fit_width(9.0)
        form = Text({formula}, font_size=38, weight=BOLD, color={f_col}).next_to(head, DOWN, buff=0.5)
        if form.width > 7.6:
            form.scale_to_fit_width(7.6)
        frame = SurroundingRectangle(form, color={box_col}, buff=0.25, corner_radius=0.15, stroke_width=2.5)
        
        if {is_white}:
            card = RoundedRectangle(corner_radius=0.18, width=frame.width + 0.8, height=frame.height + 0.6, fill_color="#FFFFFF", fill_opacity=0.92, stroke_color="#D6D3D1", stroke_width=1.5).move_to(form.get_center())
            group = VGroup(card, frame, form)
        else:
            group = VGroup(frame, form)

        all_group = VGroup(head, group)
        if {repr(teacher_position)} == "right":
            all_group.shift(LEFT * 1.5)
            if all_group.width > 6.0:
                all_group.scale_to_fit_width(6.0)
        elif {repr(teacher_position)} == "left":
            all_group.shift(RIGHT * 1.5)
            if all_group.width > 6.0:
                all_group.scale_to_fit_width(6.0)

        if all_group.get_bottom()[1] < -2.2:
            all_group.shift(UP * (-2.2 - all_group.get_bottom()[1] + 0.2))

        self.play(Write(head), run_time=0.6)
        if {is_white}:
            self.play(Create(card), Create(frame), Write(form), run_time=0.9)
        else:
            self.play(Create(frame), Write(form), run_time=0.9)
        self.wait(2.0)
        self.play(FadeOut(all_group), run_time=0.5)
"""

    def _script_graph(self, scene: VisualScene, class_name: str, is_white: bool = False, teacher_position: str = "none") -> str:
        header = repr("Relationship & Proportion Graph")
        h_col = '"#172B4D"' if is_white else "TEAL_A"
        ax_col = '"#475569"' if is_white else "BLUE"
        crv_col = '"#2563EB"' if is_white else "GREEN"
        return f"""from manim import *

class {class_name}(Scene):
    def construct(self):
        head = Text({header}, font_size=30, weight=BOLD, color={h_col}).to_edge(UP, buff=0.5)
        if head.width > 9.0:
            head.scale_to_fit_width(9.0)
        axes = Axes(
            x_range=[0, 10, 2],
            y_range=[0, 10, 2],
            x_length=5.5,
            y_length=3.5,
            axis_config={{"color": {ax_col}}},
        ).move_to(DOWN * 0.2)
        curve = axes.plot(lambda x: 0.8 * x, color={crv_col})
        group = VGroup(axes, curve)

        all_group = VGroup(head, group)
        if {repr(teacher_position)} == "right":
            all_group.shift(LEFT * 1.4)
            if all_group.width > 6.0:
                all_group.scale_to_fit_width(6.0)
        elif {repr(teacher_position)} == "left":
            all_group.shift(RIGHT * 1.4)
            if all_group.width > 6.0:
                all_group.scale_to_fit_width(6.0)

        if all_group.get_bottom()[1] < -2.2:
            all_group.shift(UP * (-2.2 - all_group.get_bottom()[1] + 0.2))

        self.play(Write(head), Create(axes), run_time=0.7)
        self.play(Create(curve), run_time=1.0)
        self.wait(1.5)
        self.play(FadeOut(all_group), run_time=0.5)
"""

    def _script_process(self, scene: VisualScene, class_name: str, is_white: bool = False, teacher_position: str = "none") -> str:
        header = repr(scene.educational_goal[:45] if scene.educational_goal else "Process Progression")
        h_col = '"#172B4D"' if is_white else "TEAL_A"
        d_col = '"#D6D3D1"' if is_white else "TEAL_E"
        s1_col = '"#172B4D"' if is_white else "WHITE"
        s2_col = '"#2563EB"' if is_white else "YELLOW"
        return f"""from manim import *

class {class_name}(Scene):
    def construct(self):
        head = Text({header}, font_size=30, weight=BOLD, color={h_col}).to_edge(UP, buff=0.6)
        if head.width > 9.0:
            head.scale_to_fit_width(9.0)
        divider = Line(LEFT * 4.2, RIGHT * 4.2, color={d_col}, stroke_width=2).next_to(head, DOWN, buff=0.2)
        
        step1 = Text("1. Initialize Search Boundary", font_size=20, color={s1_col})
        step2 = Text("2. Examine Midpoint Element", font_size=20, color={s2_col})
        step3 = Text("3. Discard Subarray Halves Logarithmically", font_size=20, color={s1_col})
        for s in (step1, step2, step3):
            if s.width > 7.6:
                s.scale_to_fit_width(7.6)
        steps = VGroup(step1, step2, step3).arrange(DOWN, aligned_edge=LEFT, buff=0.3).next_to(divider, DOWN, buff=0.3)
        
        if {is_white}:
            card = RoundedRectangle(corner_radius=0.18, width=steps.width + 0.8, height=steps.height + 0.6, fill_color="#FFFFFF", fill_opacity=0.92, stroke_color="#D6D3D1", stroke_width=1.5).move_to(steps.get_center())
            content = VGroup(card, steps)
        else:
            content = steps

        all_group = VGroup(head, divider, content)
        if {repr(teacher_position)} == "right":
            all_group.shift(LEFT * 1.5)
            if all_group.width > 6.0:
                all_group.scale_to_fit_width(6.0)
        elif {repr(teacher_position)} == "left":
            all_group.shift(RIGHT * 1.5)
            if all_group.width > 6.0:
                all_group.scale_to_fit_width(6.0)

        if all_group.get_bottom()[1] < -2.2:
            all_group.shift(UP * (-2.2 - all_group.get_bottom()[1] + 0.2))

        self.play(Write(head), Create(divider), run_time=0.6)
        if {is_white}:
            self.play(Create(card), run_time=0.3)
        self.play(LaggedStart(FadeIn(step1), FadeIn(step2), FadeIn(step3), lag_ratio=0.25), run_time=1.3)
        self.wait(1.5)
        self.play(FadeOut(all_group), run_time=0.5)
"""

    def _script_explanation(self, scene: VisualScene, class_name: str, is_white: bool = False, teacher_position: str = "none") -> str:
        header = repr(scene.educational_goal[:40] if scene.educational_goal else "Key Concept Overview")
        body_raw = scene.visual_description if scene.visual_description else scene.narration
        body_words = " ".join((body_raw or "").split())[:140]
        h_col = '"#172B4D"' if is_white else "TEAL_A"
        d_col = '"#D6D3D1"' if is_white else "TEAL_E"
        txt_col = '"#172B4D"' if is_white else "WHITE"
        c_fill = '"#FFFFFF"' if is_white else "DARK_BLUE"
        c_op = 0.92 if is_white else 0.4
        c_strk = '"#D6D3D1"' if is_white else "BLUE_D"
        return f"""from manim import *

class {class_name}(Scene):
    def construct(self):
        head = Text({header}, font_size=28, weight=BOLD, color={h_col}).to_edge(UP, buff=0.55)
        if head.width > 9.0:
            head.scale_to_fit_width(9.0)
        divider = Line(LEFT * 4.2, RIGHT * 4.2, color={d_col}, stroke_width=2).next_to(head, DOWN, buff=0.2)
        
        words = {repr(body_words)}.split()
        lines = []
        cur = []
        for w in words:
            if cur and sum(len(x)+1 for x in cur) + len(w) > 42:
                lines.append(" ".join(cur))
                if len(lines) >= 4:
                    break
                cur = [w]
            else:
                cur.append(w)
        if cur and len(lines) < 4:
            lines.append(" ".join(cur))
        
        mobs = [Text(l, font_size=20, color={txt_col}) for l in lines]
        txt_group = VGroup(*mobs).arrange(DOWN, aligned_edge=LEFT, buff=0.16)
        if txt_group.width > 7.8:
            txt_group.scale_to_fit_width(7.8)
        if txt_group.height > 3.0:
            txt_group.scale_to_fit_height(3.0)
            
        card = RoundedRectangle(
            corner_radius=0.18,
            width=min(txt_group.width + 1.0, 8.6),
            height=min(txt_group.height + 0.6, 3.5),
            fill_color={c_fill},
            fill_opacity={c_op},
            stroke_color={c_strk},
            stroke_width=1.5 if {is_white} else 2,
        ).move_to(txt_group.get_center())
        
        content = VGroup(card, txt_group).next_to(divider, DOWN, buff=0.35)
        all_group = VGroup(head, divider, content)

        if {repr(teacher_position)} == "right":
            all_group.shift(LEFT * 1.5)
            if all_group.width > 6.0:
                all_group.scale_to_fit_width(6.0)
        elif {repr(teacher_position)} == "left":
            all_group.shift(RIGHT * 1.5)
            if all_group.width > 6.0:
                all_group.scale_to_fit_width(6.0)

        if all_group.get_bottom()[1] < -2.2:
            all_group.shift(UP * (-2.2 - all_group.get_bottom()[1] + 0.2))
            
        self.play(Write(head), Create(divider), run_time=0.6)
        self.play(Create(card), FadeIn(txt_group), run_time=0.9)
        self.wait(1.8)
        self.play(FadeOut(all_group), run_time=0.5)
"""

    def _script_newton_physics(self, scene: VisualScene, class_name: str, is_white: bool = False, teacher_position: str = "none") -> str:
        """Specialized high-quality educational animation for Newton's 2nd law box + arrow."""
        head_col = '"#172B4D"' if is_white else "BLUE_B"
        force_col = '"#D97706"' if is_white else "YELLOW"
        eq_col = '"#172B4D"' if is_white else "GOLD"
        box_frame_col = '"#2563EB"' if is_white else "YELLOW"
        box_fill = '"#EAF2FF"' if is_white else "TEAL_E"
        box_stroke = '"#2563EB"' if is_white else "TEAL"
        mass_col = '"#172B4D"' if is_white else "WHITE"
        return f"""from manim import *

class {class_name}(Scene):
    def construct(self):
        # 1. Header
        header = Text("Newton's Second Law: F = m · a", font_size=32, weight=BOLD, color={head_col}).to_edge(UP, buff=0.5)
        if header.width > 9.0:
            header.scale_to_fit_width(9.0)
        self.play(Write(header), run_time=0.6)

        # 2. Object block (Mass m)
        box = Square(side_length=1.4, color={box_stroke}, fill_color={box_fill}, fill_opacity=0.92 if {is_white} else 0.85)
        box.shift(LEFT * 2.8 + DOWN * 0.4)
        mass_label = Text("m = 5 kg", font_size=24, weight=BOLD, color={mass_col}).move_to(box.get_center())
        block_group = VGroup(box, mass_label)
        self.play(Create(box), Write(mass_label), run_time=0.6)

        # 3. Applied Force Arrow
        force_arrow = Arrow(
            start=box.get_left() + LEFT * 1.8,
            end=box.get_left(),
            color={force_col},
            buff=0.1,
            stroke_width=6,
            max_tip_length_to_length_ratio=0.25
        )
        force_label = Text("F = 20 N", font_size=24, weight=BOLD, color={force_col}).next_to(force_arrow, UP, buff=0.1)
        self.play(GrowArrow(force_arrow), FadeIn(force_label), run_time=0.6)

        # 4. Acceleration animation
        self.play(
            block_group.animate.shift(RIGHT * 3.8),
            force_arrow.animate.shift(RIGHT * 3.8),
            force_label.animate.shift(RIGHT * 3.8),
            run_time=1.4,
            rate_func=rate_functions.ease_in_quad
        )

        # 5. Resulting Equation Callout
        eq = Text("a = F / m = 4 m/s²", font_size=30, weight=BOLD, color={eq_col}).to_edge(DOWN, buff=0.8)
        box_frame = SurroundingRectangle(eq, color={box_frame_col}, buff=0.2, corner_radius=0.1)
        self.play(Write(eq), Create(box_frame), run_time=0.8)
        self.wait(1.0)
"""

    def _script_photosynthesis(self, scene: VisualScene, class_name: str, is_white: bool = False, teacher_position: str = "none") -> str:
        """High-impact biology visualization for Photosynthesis."""
        header_text = repr("Photosynthesis: Solar Conversion in Chloroplast")
        eq_text = repr("6CO2 + 6H2O + Light -> C6H12O6 + 6O2")
        h_col = '"#0F766E"' if is_white else "GREEN_B"
        eq_col = '"#172B4D"' if is_white else "GOLD"
        eq_box_col = '"#0F766E"' if is_white else "YELLOW_C"
        sun_col = '"#D97706"' if is_white else "YELLOW"
        return f"""from manim import *

class {class_name}(Scene):
    def construct(self):
        # 1. Header (Subtitle safe: top 15%)
        header = Text({header_text}, font_size=30, weight=BOLD, color={h_col}).to_edge(UP, buff=0.5)
        if header.width > 9.0:
            header.scale_to_fit_width(9.0)
        self.play(Write(header), run_time=0.6)

        # 2. Chloroplast outer double membrane
        outer_membrane = Ellipse(width=6.0, height=3.2, color="#0F766E" if {is_white} else GREEN_D, stroke_width=3 if {is_white} else 4, fill_color="#EAF2FF" if {is_white} else "#064e3b", fill_opacity=0.85 if {is_white} else 0.6).shift(UP * 0.2)
        inner_label = Text("Chloroplast (Stroma)", font_size=20, color="#0F766E" if {is_white} else GREEN_A).next_to(outer_membrane.get_top(), DOWN, buff=0.2)
        self.play(Create(outer_membrane), FadeIn(inner_label), run_time=0.7)

        # 3. Thylakoid Stacks (Granum)
        stack1 = VGroup(*[RoundedRectangle(corner_radius=0.1, width=1.1, height=0.25, color=TEAL_C, fill_color=TEAL_D, fill_opacity=0.9).shift(UP * 0.2 + LEFT * 1.6 + UP * (i * 0.3 - 0.3)) for i in range(3)])
        stack2 = VGroup(*[RoundedRectangle(corner_radius=0.1, width=1.1, height=0.25, color=TEAL_C, fill_color=TEAL_D, fill_opacity=0.9).shift(UP * 0.2 + RIGHT * 1.6 + UP * (i * 0.3 - 0.3)) for i in range(3)])
        thylakoid_label = Text("Thylakoid Grana", font_size=18, color="#0F766E" if {is_white} else TEAL_A).next_to(stack1, DOWN, buff=0.15)
        self.play(LaggedStart(Create(stack1), Create(stack2), run_time=0.8, lag_ratio=0.2), Write(thylakoid_label))

        # 4. Sunlight photons incoming
        sun_rays = Arrow(start=UP * 2.8 + LEFT * 3.5, end=stack1.get_top() + LEFT * 0.2, color={sun_col}, stroke_width=5)
        sun_label = Text("Photons (hv)", font_size=20, weight=BOLD, color={sun_col}).next_to(sun_rays.get_start(), DOWN, buff=0.1)
        self.play(GrowArrow(sun_rays), FadeIn(sun_label), run_time=0.6)

        # 5. Chemical Equation Callout (Safe above subtitles)
        eq = Text({eq_text}, font_size=24, weight=BOLD, color={eq_col}).move_to(DOWN * 1.6)
        eq_box = SurroundingRectangle(eq, color={eq_box_col}, buff=0.15, corner_radius=0.1)
        self.play(Write(eq), Create(eq_box), run_time=0.8)
        self.wait(1.5)
"""

    def _script_binary_search(self, scene: VisualScene, class_name: str, is_white: bool = False, teacher_position: str = "none") -> str:
        """High-impact algorithmic visualization for Binary Search."""
        header_text = repr("Binary Search: Divide & Conquer O(log N)")
        h_col = '"#172B4D"' if is_white else "BLUE_B"
        sq_fill = '"#FFFFFF"' if is_white else '"#0f172a"'
        sq_stroke = '"#D6D3D1"' if is_white else "BLUE_D"
        num_col = '"#172B4D"' if is_white else "WHITE"
        idx_col = '"#475569"' if is_white else "GRAY_B"
        target_col = '"#172B4D"' if is_white else "GOLD"
        mid_col = '"#D97706"' if is_white else "YELLOW"
        return f"""from manim import *

class {class_name}(Scene):
    def construct(self):
        # 1. Header
        header = Text({header_text}, font_size=32, weight=BOLD, color={h_col}).to_edge(UP, buff=0.5)
        if header.width > 9.0:
            header.scale_to_fit_width(9.0)
        self.play(Write(header), run_time=0.6)

        # 2. Sorted Array Boxes
        values = [2, 5, 8, 12, 16, 23, 38, 56, 72]
        boxes = VGroup()
        for i, val in enumerate(values):
            sq = Square(side_length=0.8, color={sq_stroke}, fill_color={sq_fill}, fill_opacity=0.92 if {is_white} else 0.85)
            num = Text(str(val), font_size=20, color={num_col}).move_to(sq.get_center())
            idx = Text(str(i), font_size=14, color={idx_col}).next_to(sq, UP, buff=0.1)
            boxes.add(VGroup(sq, num, idx))
        boxes.arrange(RIGHT, buff=0.1).shift(UP * 0.6)
        self.play(LaggedStart(*[FadeIn(b) for b in boxes], lag_ratio=0.1), run_time=0.8)

        # 3. Pointers: Low, Mid, High
        low_p = Arrow(start=DOWN * 0.6, end=UP * 0.1, color=GREEN, max_tip_length_to_length_ratio=0.3).next_to(boxes[0], DOWN, buff=0.1)
        low_txt = Text("Low", font_size=16, color=GREEN).next_to(low_p, DOWN, buff=0.05)
        high_p = Arrow(start=DOWN * 0.6, end=UP * 0.1, color=RED, max_tip_length_to_length_ratio=0.3).next_to(boxes[-1], DOWN, buff=0.1)
        high_txt = Text("High", font_size=16, color=RED).next_to(high_p, DOWN, buff=0.05)
        mid_p = Arrow(start=DOWN * 0.6, end=UP * 0.1, color={mid_col}, max_tip_length_to_length_ratio=0.3).next_to(boxes[4], DOWN, buff=0.1)
        mid_txt = Text("Mid=16", font_size=16, color={mid_col}).next_to(mid_p, DOWN, buff=0.05)

        self.play(
            GrowArrow(low_p), FadeIn(low_txt),
            GrowArrow(high_p), FadeIn(high_txt),
            GrowArrow(mid_p), FadeIn(mid_txt),
            run_time=0.8
        )

        # 4. Highlight target & halving space
        target_info = Text("Target = 38 > Mid (16) -> Discard Left Half", font_size=22, weight=BOLD, color={target_col}).move_to(DOWN * 1.5)
        discard_group = VGroup(*boxes[:5])
        self.play(Write(target_info), discard_group.animate.set_opacity(0.25), run_time=0.8)
        self.wait(1.5)
"""

    def _script_vector_diagram(self, scene: VisualScene, class_name: str, is_white: bool = False, teacher_position: str = "none") -> str:
        """Free-body vector breakdown diagram."""
        header_text = repr("Free-Body Force Vector Decomposition")
        h_col = '"#172B4D"' if is_white else "BLUE_B"
        box_stroke = '"#0F766E"' if is_white else "TEAL"
        box_fill = '"#EAF2FF"' if is_white else '"#134e4a"'
        mass_col = '"#172B4D"' if is_white else "WHITE"
        fn_col = '"#2563EB"' if is_white else "CYAN"
        fg_col = '"#DC2626"' if is_white else "RED_C"
        fapp_col = '"#D97706"' if is_white else "YELLOW"
        eq_col = '"#172B4D"' if is_white else "GOLD"
        return f"""from manim import *

class {class_name}(Scene):
    def construct(self):
        header = Text({header_text}, font_size=32, weight=BOLD, color={h_col}).to_edge(UP, buff=0.5)
        if header.width > 9.0:
            header.scale_to_fit_width(9.0)
        self.play(Write(header), run_time=0.6)

        # Center Mass
        box = Square(side_length=1.4, color={box_stroke}, fill_color={box_fill}, fill_opacity=0.92 if {is_white} else 0.85).shift(UP * 0.2)
        mass_txt = Text("m", font_size=28, weight=BOLD, color={mass_col}).move_to(box.get_center())
        self.play(Create(box), Write(mass_txt), run_time=0.5)

        # Normal force UP
        fn = Arrow(start=box.get_top(), end=box.get_top() + UP * 1.4, color={fn_col}, buff=0)
        fn_lbl = Text("F_N (Normal)", font_size=18, color={fn_col}).next_to(fn, UP, buff=0.1)
        # Gravity DOWN
        fg = Arrow(start=box.get_bottom(), end=box.get_bottom() + DOWN * 1.4, color={fg_col}, buff=0)
        fg_lbl = Text("F_g = m*g", font_size=18, color={fg_col}).next_to(fg, DOWN, buff=0.1)
        # Applied force RIGHT
        fapp = Arrow(start=box.get_right(), end=box.get_right() + RIGHT * 2.0, color={fapp_col}, buff=0)
        fapp_lbl = Text("F_net = m*a", font_size=20, weight=BOLD, color={fapp_col}).next_to(fapp, RIGHT, buff=0.1)

        self.play(GrowArrow(fn), FadeIn(fn_lbl), GrowArrow(fg), FadeIn(fg_lbl), run_time=0.7)
        self.play(GrowArrow(fapp), FadeIn(fapp_lbl), run_time=0.7)

        equilibrium_txt = Text("Vertical: F_N = F_g | Horizontal: F_net = m * a", font_size=22, color={eq_col}).move_to(DOWN * 1.6)
        self.play(Write(equilibrium_txt), run_time=0.7)
        self.wait(1.5)
"""

    def _script_cinematic_fallback(self, scene: VisualScene, class_name: str, is_white: bool = False, teacher_position: str = "none") -> str:
        """High-fidelity cinematic-style Manim fallback for cloud generative video scenes."""
        prompt_txt = repr(scene.visual_description[:65] if scene.visual_description else scene.narration[:65])
        goal_txt = repr(scene.educational_goal[:75] if scene.educational_goal else "Cinematic Educational Concept")
        badge_col = '"#0F766E"' if is_white else "TEAL_A"
        concept_col = '"#172B4D"' if is_white else "GOLD"
        desc_box_col = '"#D6D3D1"' if is_white else "BLUE_B"
        desc_box_fill = '"#FFFFFF"' if is_white else '"#0f172a"'
        desc_txt_col = '"#172B4D"' if is_white else "WHITE"
        p1_col = '"#2563EB"' if is_white else "YELLOW"
        p2_col = '"#0F766E"' if is_white else "CYAN"
        bg_op_val = "0.0" if is_white else "0.25"
        return f"""from manim import *

class {class_name}(Scene):
    def construct(self):
        # 1. Subtle glowing backdrop circles
        bg_glow = Annulus(inner_radius=2.0, outer_radius=4.5, color=TEAL_E, fill_opacity=0.0 if {is_white} else 0.15).move_to(ORIGIN)
        bg_circle = Circle(radius=1.8, color=BLUE_E, fill_opacity={bg_op_val}).move_to(ORIGIN)
        self.play(FadeIn(bg_glow), FadeIn(bg_circle), run_time=0.6)

        # 2. Main Title & Concept
        badge = Text("CINEMATIC VISUALIZATION", font_size=18, weight=BOLD, color={badge_col}).to_edge(UP, buff=0.8)
        concept = Text({goal_txt}, font_size=28, weight=BOLD, color={concept_col}).next_to(badge, DOWN, buff=0.3)
        self.play(FadeIn(badge, shift=DOWN*0.1), Write(concept), run_time=0.7)

        # 3. Dynamic Animated Physical Representation
        desc_box = RoundedRectangle(corner_radius=0.2, width=8.2, height=1.8, color={desc_box_col}, fill_color={desc_box_fill}, fill_opacity=0.92 if {is_white} else 0.85).move_to(DOWN * 0.2)
        desc_text = Text({prompt_txt}, font_size=18, color={desc_txt_col}).move_to(desc_box.get_center())
        
        # Kinetic particle markers
        p1 = Dot(point=LEFT * 2.2 + UP * 0.2, radius=0.12, color={p1_col})
        p2 = Dot(point=RIGHT * 2.2 + UP * 0.2, radius=0.12, color={p2_col})
        
        self.play(Create(desc_box), Write(desc_text), FadeIn(p1), FadeIn(p2), run_time=0.8)
        self.play(
            p1.animate.shift(RIGHT * 4.4),
            p2.animate.shift(LEFT * 4.4),
            run_time=1.6,
            rate_func=rate_functions.smooth
        )
        self.wait(1.2)
"""
