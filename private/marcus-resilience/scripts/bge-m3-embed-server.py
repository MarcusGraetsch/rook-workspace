"""
Minimal OpenAI-compatible embedding server for spike.
Loads BAAI/bge-m3 via sentence-transformers, exposes /v1/embeddings.
"""
import os
import sys
import time
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Union
import uvicorn
from sentence_transformers import SentenceTransformer

MODEL_NAME = os.environ.get("EMBED_MODEL", "BAAI/bge-m3")
PORT = int(os.environ.get("EMBED_PORT", "8765"))

print(f"[embed] loading {MODEL_NAME} ...", flush=True)
t0 = time.time()
model = SentenceTransformer(MODEL_NAME)
print(f"[embed] loaded in {time.time()-t0:.1f}s", flush=True)

app = FastAPI()


class EmbeddingRequest(BaseModel):
    input: Union[str, List[str]]
    model: str = MODEL_NAME
    encoding_format: str = "float"


class EmbeddingData(BaseModel):
    object: str = "embedding"
    embedding: List[float]
    index: int


class EmbeddingResponse(BaseModel):
    object: str = "list"
    data: List[EmbeddingData]
    model: str
    usage: dict


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME}


@app.post("/v1/embeddings")
def embeddings(req: EmbeddingRequest):
    texts = req.input if isinstance(req.input, list) else [req.input]
    if not texts:
        raise HTTPException(400, "input empty")
    vecs = model.encode(texts, normalize_embeddings=True).tolist()
    return EmbeddingResponse(
        data=[EmbeddingData(embedding=v, index=i) for i, v in enumerate(vecs)],
        model=MODEL_NAME,
        usage={"prompt_tokens": sum(len(t.split()) for t in texts), "total_tokens": sum(len(t.split()) for t in texts)},
    )


if __name__ == "__main__":
    print(f"[embed] starting on :{PORT}", flush=True)
    uvicorn.run(app, host="127.0.0.1", port=PORT, log_level="warning")
