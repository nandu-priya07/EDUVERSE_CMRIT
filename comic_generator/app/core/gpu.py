import gc
from typing import Dict, Any
from app.core.logging import logger
from app.core.config import settings

def is_cuda_available() -> bool:
    try:
        import torch
        return torch.cuda.is_available() and settings.USE_CUDA
    except ImportError:
        return False

def get_gpu_info() -> Dict[str, Any]:
    """Retrieve CUDA device information and memory state."""
    if not is_cuda_available():
        return {
            "cuda_available": False,
            "device_name": "CPU",
            "total_vram_gb": 0.0,
            "allocated_vram_gb": 0.0,
            "reserved_vram_gb": 0.0,
            "free_vram_gb": 0.0
        }

    try:
        import torch
        device = torch.cuda.current_device()
        device_name = torch.cuda.get_device_name(device)
        total_mem = torch.cuda.get_device_properties(device).total_memory / (1024 ** 3)
        allocated_mem = torch.cuda.memory_allocated(device) / (1024 ** 3)
        reserved_mem = torch.cuda.memory_reserved(device) / (1024 ** 3)
        free_mem = total_mem - reserved_mem

        return {
            "cuda_available": True,
            "device_name": device_name,
            "total_vram_gb": round(total_mem, 2),
            "allocated_vram_gb": round(allocated_mem, 2),
            "reserved_vram_gb": round(reserved_mem, 2),
            "free_vram_gb": round(free_mem, 2)
        }
    except Exception as e:
        logger.error(f"[GPU] Error fetching GPU info: {e}")
        return {
            "cuda_available": False,
            "error": str(e)
        }

def clean_gpu_memory():
    """Explicitly clean Python Garbage Collection & CUDA VRAM cache."""
    gc.collect()
    try:
        import torch
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.ipc_collect()
            gpu_info = get_gpu_info()
            logger.info(f"[GPU] Memory cleaned. Free VRAM: {gpu_info.get('free_vram_gb', 0)} GB")
    except Exception as e:
        logger.warning(f"[GPU] Could not execute CUDA cache clean: {e}")

def check_vram_safety(required_vram_gb: float = 3.5) -> bool:
    """Warn if free VRAM is lower than required for model load."""
    info = get_gpu_info()
    if not info.get("cuda_available"):
        logger.warning("[GPU] CUDA not available. Running on CPU mode.")
        return True

    free_vram = info.get("free_vram_gb", 0)
    total_vram = info.get("total_vram_gb", 0)
    logger.info(f"[GPU] Status check: Device={info.get('device_name')}, Total={total_vram} GB, Free={free_vram} GB")

    if free_vram < required_vram_gb:
        logger.warning(
            f"[GPU Warning] Free VRAM ({free_vram} GB) is below recommended threshold ({required_vram_gb} GB). "
            f"VRAM offloading / lower image resolution will be enforced."
        )
        return False
    return True
