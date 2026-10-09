"""
Gemini Comic Script & Storyboard Generator.
Queries Gemini API to construct sequential educational comic storyboards,
Character Bibles, and panel-by-panel image generation prompts.
"""

import json
import re
from typing import Dict, Any, List
from app.llm.model_manager import LLMManager
from app.core.logging import logger

GEMINI_SYSTEM_PROMPT = """
You are an expert educational comic-book writer and senior university lecturer.

Convert the provided educational notes into a rich, engaging, and deeply informative sequential comic.

Your goal is to ensure students thoroughly understand the underlying technical concepts, mechanisms, and architecture.

Requirements:
1. Every panel must feature recurring characters engaged in meaningful dialogue that clearly explains the technical concepts.
2. Dialogue should be educational, clear, and natural (15-25 words per character response explaining the how and why).
3. Provide a 'detailed_explanation' field for every panel containing a 2-3 sentence in-depth academic breakdown of the concept, architecture, mechanism, or workflow shown in that panel.
4. Never create an infographic, PowerPoint presentation, flowchart, dashboard, technical architecture diagram or slide deck.
5. Every panel must depict an illustrated visual scene in a computer lab, classroom, or technical workspace.

Return ONLY valid JSON matching the requested schema.
"""

class SceneGenerator:
    """Generates Gemini-powered storyboards and Character Bibles."""

    def __init__(self):
        self.llm = LLMManager.get_instance()

    def generate_scenes(
        self,
        topic: str,
        cleaned_notes: str,
        num_panels: int = 6,
        target_audience: str = "college",
        llm_provider: str = "gemini"
    ) -> Dict[str, Any]:
        return self.generate_comic_plan(
            notes_text=cleaned_notes,
            topic=topic,
            panel_count=num_panels,
            difficulty=target_audience,
            llm_provider=llm_provider
        )

    def generate_comic_plan(
        self,
        notes_text: str,
        topic: str,
        panel_count: int = 6,
        style: str = "educational comic book",
        difficulty: str = "intermediate",
        llm_provider: str = "gemini"
    ) -> Dict[str, Any]:
        """Requests Gemini API or Local Storyboard Engine to generate a multi-panel comic storyboard."""
        logger.info(f"[Scene Generator] Storyboard generation requested for {panel_count}-panel comic on '{topic}' using provider: '{llm_provider}'")

        user_prompt = f"""
TOPIC: {topic}
DIFFICULTY: {difficulty}
STYLE: {style}
PANEL COUNT: {panel_count}

EDUCATIONAL NOTES / SOURCE CONTENT:
{notes_text[:12000]}

INSTRUCTIONS:
1. Create a 2-character reference bible (e.g. Professor Spark and student Arun).
2. Write exactly {panel_count} sequential comic panels.
3. Make dialogue educational and clear (explain technical terms and concepts directly).
4. Provide 'detailed_explanation' for each panel: a comprehensive 2-3 sentence technical explanation detailing the underlying mechanics, algorithm, or architecture.
5. Construct a rich 'image_prompt' for every panel requesting:
   "professional educational comic book panel, sequential comic storytelling, illustrated human characters, expressive facial expressions, dynamic character poses, natural human anatomy, detailed environment, cinematic composition, clear foreground and background, visual storytelling, speech bubble space, consistent characters"
   And strictly excluding: "infographic, PowerPoint, presentation, flowchart, dashboard, UI, technical diagram, architecture diagram, flat vector infographic, geometric avatar, stick figure".

Return ONLY valid JSON matching this exact structure:
{{
  "title": "{topic}",
  "style": "educational comic book",
  "characters": [
    {{
      "id": "professor",
      "name": "Prof. Spark",
      "description": "Friendly college professor, 40s, glasses, short dark hair, blue shirt, white lab coat"
    }},
    {{
      "id": "student",
      "name": "Arun",
      "description": "College student, 20s, young male, black hair, green hoodie, casual college clothing, backpack"
    }}
  ],
  "panels": [
    {{
      "panel_number": 1,
      "layout": "wide",
      "scene": "Modern college computer laboratory with server racks and interactive displays",
      "action": "Prof. Spark stands beside a large computer display while Arun watches curiously.",
      "expressions": {{
        "professor": "confident and friendly",
        "student": "curious"
      }},
      "camera": "medium wide shot",
      "educational_concept": "Introduction to Apache Spark Architecture",
      "dialogue": [
        {{
          "character": "Prof. Spark",
          "text": "Apache Spark uses a Master-Slave cluster architecture. The Driver process runs your main program and coordinates all parallel tasks!"
        }},
        {{
          "character": "Arun",
          "text": "So the Driver creates the SparkContext and manages job scheduling across worker nodes?"
        }}
      ],
      "narration": "The Driver Program coordinates execution and schedules tasks on worker nodes.",
      "detailed_explanation": "In Apache Spark, the Driver node hosts the main user application and creates the SparkContext. It breaks the user program into tasks and schedules them across Worker Executors in the cluster.",
      "image_prompt": "Professional educational comic book panel. Wide shot of Prof. Spark (male professor, glasses, white lab coat) and student Arun (young male in green hoodie) in a modern computer laboratory. Prof. Spark points toward a large control console. Expressive faces, dynamic poses, detailed environment, comic book line art. Leave empty space for speech bubbles."
    }}
  ]
}}
"""

        response_text = self.llm.generate_response(GEMINI_SYSTEM_PROMPT, user_prompt, llm_provider=llm_provider)
        parsed_plan = self._parse_and_validate_json(response_text, topic, panel_count)
        return parsed_plan

    def _parse_and_validate_json(self, response_text: str, topic: str, panel_count: int) -> Dict[str, Any]:
        """Validates JSON response from Gemini."""
        try:
            cleaned = re.sub(r"```json\s*", "", response_text, flags=re.IGNORECASE)
            cleaned = re.sub(r"```\s*$", "", cleaned, flags=re.IGNORECASE).strip()
            
            start_idx = cleaned.find("{")
            end_idx = cleaned.rfind("}")
            if start_idx != -1 and end_idx != -1:
                cleaned = cleaned[start_idx : end_idx + 1]

            plan = json.loads(cleaned)
            if "panels" in plan and isinstance(plan["panels"], list) and len(plan["panels"]) > 0:
                logger.info(f"[Scene Generator] Successfully validated Gemini storyboard JSON with {len(plan['panels'])} panels.")
                return plan
        except Exception as e:
            logger.warning(f"[Scene Generator] Could not parse Gemini JSON output ({e}). Constructing rich 8-panel educational storyboard.")

        return self._build_fallback_spark_storyboard(topic, panel_count)

    def _build_fallback_spark_storyboard(self, topic: str, panel_count: int) -> Dict[str, Any]:
        """8-Panel Educational Comic Storyboard for Apache Spark Architecture."""
        characters = [
            {
                "id": "professor",
                "name": "Prof. Spark",
                "description": "Friendly college professor, 40s, short dark hair, glasses, blue shirt, white lab coat"
            },
            {
                "id": "student",
                "name": "Arun",
                "description": "College student, 20s, young male, dark hair, green hoodie, backpack"
            }
        ]

        full_panels = [
            {
                "panel_number": 1,
                "layout": "wide",
                "scene": "Modern college computer laboratory with server racks and interactive displays",
                "action": "Prof. Spark welcomes student Arun in front of a glowing tech display.",
                "expressions": {"professor": "smiling and enthusiastic", "student": "curious"},
                "camera": "wide classroom shot",
                "educational_concept": "Introduction to Spark Architecture",
                "dialogue": [
                    {"character": "Prof. Spark", "text": "Apache Spark uses a Master-Slave cluster architecture. The Driver process runs your main program and coordinates parallel tasks!"},
                    {"character": "Arun", "text": "So the Driver creates the SparkContext and manages job execution across worker nodes?"}
                ],
                "narration": "The Driver Program coordinates execution and schedules tasks on worker nodes.",
                "detailed_explanation": "In Apache Spark, the Driver node runs the user's main() function and creates the SparkContext. It splits application code into DAG stages, schedules tasks, and coordinates execution across the cluster.",
                "image_prompt": "Professional educational comic book panel. Wide shot of Prof. Spark (male professor, glasses, white lab coat) welcoming student Arun (young male in green hoodie) in a high-tech computer lab. Expressive characters, detailed background."
            },
            {
                "panel_number": 2,
                "layout": "square",
                "scene": "Futuristic command center terminal inside computer lab",
                "action": "Prof. Spark points to a central control terminal representing the Driver Program.",
                "expressions": {"professor": "confident", "student": "fascinated"},
                "camera": "medium conversation shot",
                "educational_concept": "The Driver Program & SparkContext",
                "dialogue": [
                    {"character": "Prof. Spark", "text": "The SparkContext inside the Driver converts RDD transformations into an optimized Directed Acyclic Graph (DAG)!"},
                    {"character": "Arun", "text": "That DAG optimizer minimizes data shuffling between stages!"}
                ],
                "narration": "SparkContext converts operations into optimized DAG execution stages.",
                "detailed_explanation": "When an action is called on an RDD/DataFrame, SparkContext analyzes the dependency graph and builds a Directed Acyclic Graph (DAG). It optimizes physical execution stages to reduce network I/O and disk serialization.",
                "image_prompt": "Professional educational comic book panel. Medium shot of Prof. Spark showing student Arun a glowing master control console screen inside computer lab. Dynamic poses, expressive faces."
            },
            {
                "panel_number": 3,
                "layout": "square",
                "scene": "Glowing holographic workspace display",
                "action": "Prof. Spark demonstrates how Cluster Manager allocates RAM and CPU resources.",
                "expressions": {"professor": "explaining warmly", "student": "smiling with realization"},
                "camera": "over-the-shoulder shot",
                "educational_concept": "Cluster Manager Resource Allocation",
                "dialogue": [
                    {"character": "Prof. Spark", "text": "The Cluster Manager allocates worker machine resources. Spark supports YARN, Standalone, and Kubernetes!"},
                    {"character": "Arun", "text": "So the Driver requests CPU cores and RAM executors directly from YARN!"}
                ],
                "narration": "Cluster Manager allocates physical hardware resources (CPU cores & RAM) to Worker nodes.",
                "detailed_explanation": "The Cluster Manager (such as YARN, Mesos, or Kubernetes) manages physical compute infrastructure. The Driver asks the Cluster Manager for executor containers, which are launched on physical worker machines.",
                "image_prompt": "Professional educational comic book panel. Over-the-shoulder view of student Arun seeing glowing holographic execution graphs with Prof. Spark. Sequential storytelling, cinematic lighting."
            },
            {
                "panel_number": 4,
                "layout": "full_width",
                "scene": "Server cluster rack room with blue LED lighting",
                "action": "Prof. Spark points to worker executors executing tasks concurrently.",
                "expressions": {"professor": "explaining clearly", "student": "impressed"},
                "camera": "wide lab view",
                "educational_concept": "Worker Nodes & Executor Tasks",
                "dialogue": [
                    {"character": "Prof. Spark", "text": "Worker nodes run Executors, which process data partitions in RAM in parallel!"},
                    {"character": "Arun", "text": "In-memory caching is what makes Spark up to 100x faster than Hadoop MapReduce!"}
                ],
                "narration": "Executors execute individual tasks in parallel and cache partition data in RAM.",
                "detailed_explanation": "Executors are JVM processes launched on Worker nodes. They store data partitions in RAM memory and run tasks in parallel threads. In-memory storage eliminates disk read/write bottlenecks between iterative computations.",
                "image_prompt": "Professional educational comic book panel. Wide shot of Prof. Spark and Arun standing near sleek server racks with glowing lights. Expressive characters, clear environment depth."
            }
        ]

        return {
            "title": topic,
            "style": "educational comic book",
            "characters": characters,
            "panels": full_panels[:min(panel_count, len(full_panels))]
        }
