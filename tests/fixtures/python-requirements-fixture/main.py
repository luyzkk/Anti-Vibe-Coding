# 2026-08-30 (Luiz/dev): app minima — variante requirements-only (CA-11)
# RF6 do PRD stack-knowledge-python
from fastapi import FastAPI

app = FastAPI()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
