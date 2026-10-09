import gc
from typing import Optional, Any
from app.core.config import settings
from app.core.logging import logger
from app.core.gpu import get_gpu_info, clean_gpu_memory, is_cuda_available

class ImageModelManager:
    """Manages SDXL Turbo Diffusers pipeline loading and 6GB VRAM optimization."""
    _instance = None

    def __init__(self):
        self.pipe = None
        self.model_name = settings.IMAGE_MODEL
        self.device = "cuda" if is_cuda_available() else "cpu"

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = ImageModelManager()
        return cls._instance

    def load_pipeline(self):
        """Loads SDXL Turbo diffusers pipeline into memory with 6GB VRAM optimizations."""
        if self.pipe is not None:
            return

        logger.info(f"[Diffusers Manager] Loading SDXL Turbo model: {self.model_name} on device: {self.device}")
        clean_gpu_memory()

        try:
            import torch
            if torch.cuda.is_available():
                torch.backends.cudnn.benchmark = True
            if not hasattr(torch, "accelerator"):
                class DummyDevice:
                    type = "cuda"
                class DummyAccelerator:
                    @staticmethod
                    def is_available():
                        return torch.cuda.is_available()
                    @staticmethod
                    def current_accelerator():
                        return DummyDevice()
                torch.accelerator = DummyAccelerator()

            from diffusers import AutoPipelineForText2Image

            torch_dtype = torch.float16 if settings.USE_FP16 and self.device == "cuda" else torch.float32

            try:
                self.pipe = AutoPipelineForText2Image.from_pretrained(
                    self.model_name,
                    torch_dtype=torch_dtype,
                    use_safetensors=True,
                    variant="fp16" if settings.USE_FP16 and self.device == "cuda" else None,
                    cache_dir=str(settings.MODELS_DIR)
                )
            except Exception as load_err:
                logger.warning(f"[Diffusers Manager] fp16 variant load notice ({load_err}), retrying standard safetensors load...")
                self.pipe = AutoPipelineForText2Image.from_pretrained(
                    self.model_name,
                    torch_dtype=torch_dtype,
                    use_safetensors=True,
                    cache_dir=str(settings.MODELS_DIR)
                )

            if self.device == "cuda":
                # VRAM Optimization settings for 6 GB RTX 3050 Laptop GPU
                try:
                    if settings.USE_CPU_OFFLOAD and hasattr(self.pipe, "enable_model_cpu_offload"):
                        logger.info("[Diffusers Manager] Enabling model CPU offloading for fast 6GB VRAM execution...")
                        self.pipe.enable_model_cpu_offload()
                    else:
                        self.pipe.to("cuda")
                except Exception as offload_err:
                    logger.warning(f"[Diffusers Manager] CPU offload notice ({offload_err}), moving directly to GPU.")
                    self.pipe.to("cuda")

                if settings.ENABLE_ATTENTION_SLICING and hasattr(self.pipe, "enable_attention_slicing"):
                    logger.info("[Diffusers Manager] Enabling attention slicing for VRAM efficiency...")
                    self.pipe.enable_attention_slicing()

            logger.info(f"[Diffusers Manager] Successfully loaded {self.model_name}")
        except Exception as e:
            logger.exception(f"[Diffusers Manager] Could not load SDXL Turbo diffusers model ({e}). Operating in comic art rendering mode.")
            self.pipe = None

    def generate_image(self, prompt: str, seed: int = 42, width: int = 768, height: int = 768) -> Optional[Any]:
        """Generates a PIL image from prompt."""
        self.load_pipeline()

        if self.pipe is not None:
            try:
                import torch
                generator = torch.Generator(device="cpu").manual_seed(seed)
                
                result = self.pipe(
                    prompt=prompt,
                    num_inference_steps=settings.IMAGE_STEPS,
                    guidance_scale=settings.IMAGE_GUIDANCE_SCALE,
                    width=width,
                    height=height,
                    generator=generator
                )

                if hasattr(result, "images") and len(result.images) > 0:
                    return result.images[0]
            except Exception as e:
                logger.error(f"[Diffusers Manager] Error during image generation: {e}")
                clean_gpu_memory()

        return None

    def unload_model(self):
        """Unloads SDXL Turbo pipeline from VRAM."""
        if self.pipe is not None:
            logger.info("[Diffusers Manager] Unloading SDXL Turbo from VRAM...")
            del self.pipe
            self.pipe = None
            clean_gpu_memory()
