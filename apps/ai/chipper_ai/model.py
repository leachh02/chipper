"""The embedding model, loaded on the first request and let go after a while
unused, so the service sits at a few tens of MB between groupings."""

import os
import threading
import time
from collections.abc import Sequence

import numpy as np

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
# Where the Docker image keeps the model, so nothing is downloaded at runtime
CACHE_DIR = os.environ.get("CHIPPER_AI_MODEL_DIR")
IDLE_SECONDS = float(os.environ.get("CHIPPER_AI_IDLE_MINUTES", "10")) * 60

_lock = threading.Lock()
_model = None
_last_used = 0.0


def load():
    from fastembed import TextEmbedding

    return TextEmbedding(MODEL_NAME, cache_dir=CACHE_DIR)


def embed(texts: Sequence[str]) -> np.ndarray:
    global _model, _last_used
    with _lock:
        if _model is None:
            _model = load()
        _last_used = time.monotonic()
        return np.array(list(_model.embed(list(texts))))


def _unload_when_idle():
    global _model
    while True:
        time.sleep(60)
        with _lock:
            if _model is not None and time.monotonic() - _last_used > IDLE_SECONDS:
                _model = None


threading.Thread(target=_unload_when_idle, daemon=True).start()
