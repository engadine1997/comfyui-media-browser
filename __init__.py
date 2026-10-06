"""
Media Browser: an explorer-style browser for ComfyUI's input and output folders.

All functionality lives in the web extension and the HTTP routes registered by
``media_browser``; no graph nodes are added.
"""

from . import media_browser  # noqa: F401  (registers routes)

NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}
WEB_DIRECTORY = "./web"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
