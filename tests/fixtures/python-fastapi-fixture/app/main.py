# 2026-08-30 (Luiz/dev): app minima — so precisa existir como arquivo-fonte .py
# para contagem multi-stack (CA-07 herdado) — RF6 do PRD stack-knowledge-python
from fastapi import FastAPI

app = FastAPI()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
