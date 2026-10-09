"""
Character Consistency Manager.
Tracks character descriptors, visual attributes, and seed offsets.
"""

import json
from typing import Dict, Any, List, Optional
from pathlib import Path
from app.core.config import settings
from app.core.logging import logger

class CharacterConsistencyManager:
    """Stores character appearance descriptors and seed offsets for consistency across panels."""

    def __init__(self, job_id: str = "global"):
        self.job_id = job_id
        self.char_file = settings.CHARACTERS_DIR / f"{job_id}_characters.json"
        self.characters: Dict[str, Dict[str, Any]] = {}

    def register_characters(self, characters_list: List[Dict[str, Any]]):
        """Registers characters list."""
        self.save_character_definitions(characters_list)

    def save_character_definitions(self, characters_list: List[Dict[str, Any]]):
        """Saves character definitions for job."""
        for idx, char in enumerate(characters_list):
            char_id = char.get("id", f"char_{idx+1}") if isinstance(char, dict) else f"char_{idx+1}"
            name = char.get("name", "Character") if isinstance(char, dict) else str(char)
            desc = char.get("description", "Comic character") if isinstance(char, dict) else "Educational comic character"
            role = char.get("role", "Student") if isinstance(char, dict) else "Participant"
            
            self.characters[char_id] = {
                "id": char_id,
                "name": name,
                "description": desc,
                "role": role,
                "seed_offset": idx * 100
            }

        try:
            with open(self.char_file, "w", encoding="utf-8") as f:
                json.dump(self.characters, f, indent=2)
            logger.info(f"[Character Consistency] Saved {len(self.characters)} character definitions to {self.char_file.name}")
        except Exception as e:
            logger.error(f"[Character Consistency] Error saving characters: {e}")

    def get_character_prompt_prefix(self) -> str:
        """Builds consistent visual traits string."""
        if not self.characters:
            return ""
        
        traits = [f"{c['name']}: {c['description']}" for c in self.characters.values()]
        return "Consistent Characters: " + "; ".join(traits)

# Alias class for service calls
CharacterManager = CharacterConsistencyManager
