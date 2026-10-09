"""
LLM & Gemini API Model Manager.
Handles server-side calls to Google Gemini API (gemini-3.5-flash / gemini-3.1-flash-lite)
to generate structured educational comic storyboards in JSON, with an automatic
local fallback engine when Gemini quota or API limits are reached.
"""

import json
import os
import re
import requests
from typing import Dict, Any, Optional
from app.core.config import settings
from app.core.logging import logger

class LLMManager:
    """Manages Gemini API calls and server-side storyboarding with local fallback."""
    _instance = None

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.models = ["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemma-4-26b-a4b-it", "gemini-3.7-flash"]

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = LLMManager()
        return cls._instance

    def generate_response(self, system_prompt: str, user_prompt: str, llm_provider: str = "gemini") -> str:
        """
        Calls Gemini API server-side to generate comic storyboard script.
        If Gemini API quota is reached (HTTP 429), or Gemini fails, or provider is 'local',
        seamlessly switches to local storyboard engine.
        """
        if llm_provider == "local" or not self.api_key:
            logger.info("[LLM Manager] Using Local Storyboard Engine (Offline / Local Mode).")
            return self._rule_based_scene_fallback(user_prompt)

        full_prompt = f"{system_prompt}\n\n{user_prompt}"

        for model_name in self.models:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={self.api_key}"
                payload = {
                    "contents": [{"parts": [{"text": full_prompt}]}]
                }
                logger.info(f"[LLM Manager] Sending request to Gemini API ({model_name})...")
                res = requests.post(url, json=payload, timeout=8)

                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates and len(candidates) > 0:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            text_output = parts[0].get("text", "").strip()
                            logger.info(f"[LLM Manager] Gemini ({model_name}) generated {len(text_output)} chars.")
                            return text_output
                else:
                    logger.warning(f"[LLM Manager] Gemini API {model_name} HTTP {res.status_code}: {res.text[:120]}")
            except Exception as e:
                logger.error(f"[LLM Manager] Gemini API error ({model_name}): {e}")

        logger.warning("[LLM Manager] Gemini API quota reached or unavailable. Seamlessly switching to Local Storyboard Engine!")
        return self._rule_based_scene_fallback(user_prompt)

    def _rule_based_scene_fallback(self, user_prompt: str) -> str:
        """Dynamic local multi-panel storyboard generator for offline execution and quota fallback."""
        topic = "Educational Topic"
        panel_count = 6
        style = "educational comic book"
        
        if "TOPIC:" in user_prompt:
            topic = user_prompt.split("TOPIC:")[1].split("\n")[0].strip()
        if "PANEL COUNT:" in user_prompt:
            try:
                panel_count = int(user_prompt.split("PANEL COUNT:")[1].split("\n")[0].strip())
            except Exception:
                panel_count = 6

        characters = [
            {
                "id": "professor",
                "name": "Prof. Spark",
                "description": "Friendly college professor, 40s, glasses, short dark hair, blue shirt, white lab coat"
            },
            {
                "id": "student",
                "name": "Arun",
                "description": "College student, 20s, young male, black hair, green hoodie, casual college clothing, backpack"
            }
        ]

        # Concept breakdowns based on requested panel count
        concepts = [
            (
                f"Core Overview of {topic}",
                f"Let's explore the fundamental architecture and principles of {topic}!",
                "I'm eager to learn how this system functions under the hood, Professor!",
                f"Introduction and high-level architectural overview of {topic}.",
                f"The core design of {topic} emphasizes scalable computation, high throughput, and modular resource management across distributed computing nodes."
            ),
            (
                f"Data Processing Engine of {topic}",
                f"At the heart of {topic} is a high-speed execution engine designed for parallel workloads.",
                "How does the execution engine handle distributed data partitions in memory?",
                f"Execution engine mechanics and partition handling in {topic}.",
                f"The execution engine breaks complex user jobs into execution stages and coordinates task scheduling to maximize parallel CPU utilization and minimize network latency."
            ),
            (
                f"Resource & Cluster Management in {topic}",
                f"Resource managers dynamically allocate CPU cores and RAM executors across worker nodes in {topic}.",
                "So worker nodes execute isolated tasks concurrently within their allocated memory containers?",
                f"Resource allocation and cluster manager coordination in {topic}.",
                f"Cluster managers coordinate memory and compute isolation, ensuring tasks run concurrently across worker nodes without memory overflow or resource contention."
            ),
            (
                f"Optimization & Performance Metrics of {topic}",
                f"In-memory caching and optimized DAG scheduling eliminate disk bottlenecks in {topic}!",
                "That explains why processing iterative queries is orders of magnitude faster!",
                f"Performance optimization strategies and in-memory execution in {topic}.",
                f"In-memory data structures and Directed Acyclic Graph (DAG) optimization reduce disk serialization and network shuffling, dramatically accelerating analytical queries."
            ),
            (
                f"Fault Tolerance & Lineage in {topic}",
                f"If a node fails, {topic} reconstructs lost data partitions using lineage graphs!",
                "So failure recovery is completely automatic without restarting the entire job?",
                f"Fault tolerance mechanisms and lineage recovery in {topic}.",
                f"Fault tolerance is guaranteed through deterministic lineage tracking, allowing any lost partition to be recomputed independently without re-running the entire dataset pipeline."
            ),
            (
                f"Real-World Applications of {topic}",
                f"Mastering {topic} allows building enterprise-grade data platforms and real-time AI pipelines!",
                "Thank you, Professor! This visual breakdown made the entire architecture crystal clear!",
                f"Practical deployment and enterprise use cases of {topic}.",
                f"Real-world deployments leverage {topic} for large-scale data analytics, streaming telemetry, machine learning pipelines, and distributed data processing."
            ),
            (
                f"Advanced Storage Integration in {topic}",
                f"{topic} seamlessly integrates with distributed filesystems and cloud object stores!",
                "So data can be ingested from HDFS, S3, or Kafka without manual schema conversion?",
                f"Storage integration and data ingestion pipelines in {topic}.",
                f"Integrated connectors allow {topic} to read from diverse distributed data sources with schema inference and optimized columnar pushdown filters."
            ),
            (
                f"Summary & Architectural Best Practices",
                f"Remember to optimize partition sizing and monitor executor memory when deploying {topic}!",
                "Got it! Proper partitioning keeps all CPU cores saturated without garbage collection pauses.",
                f"Summary of architectural best practices for {topic}.",
                f"Deploying {topic} efficiently requires tuning memory overhead, partition counts, and network shuffle parameters to maintain high system throughput."
            )
        ]

        panels = []
        for i in range(min(panel_count, len(concepts))):
            c_title, prof_talk, arun_talk, narration_str, detailed_exp = concepts[i]
            panels.append({
                "panel_number": i + 1,
                "layout": "wide" if i == 0 else "square",
                "scene": "Modern college computer laboratory with server racks, glowing screens, and interactive displays",
                "action": f"Prof. Spark explains {c_title} while student Arun listens attentively.",
                "expressions": {"professor": "enthusiastic and confident", "student": "focused and curious"},
                "camera": "medium wide shot",
                "educational_concept": c_title,
                "dialogue": [
                    {"character": "Prof. Spark", "text": prof_talk},
                    {"character": "Arun", "text": arun_talk}
                ],
                "narration": narration_str,
                "detailed_explanation": detailed_exp,
                "image_prompt": f"Professional educational comic book panel. Wide shot of Prof. Spark (male professor, glasses, white lab coat) and student Arun (young male in green hoodie) in a modern computer science laboratory. Expressive faces, detailed environment, clean comic line art."
            })

        return json.dumps({
            "title": topic,
            "style": style,
            "characters": characters,
            "panels": panels
        })
