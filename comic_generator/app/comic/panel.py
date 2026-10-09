from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class DialogueItem(BaseModel):
    character: str
    text: str

class PanelData(BaseModel):
    panel_number: int
    concept: str
    scene: str
    dialogue: List[DialogueItem] = []
    caption: str = ""
    detailed_explanation: str = ""
    visual_prompt: str = ""
    image_path: Optional[str] = None
    processed_image_path: Optional[str] = None
