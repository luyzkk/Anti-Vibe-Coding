# 2026-09-06 (Luiz/dev): fixture CA-08 FastAPI — Depends na assinatura, include_router com dependencies, rota sem nada.
from fastapi import Depends, FastAPI

from app.deps import get_current_user, get_locale
from app.routers import admin

app = FastAPI()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/me")
async def me(user: dict = Depends(get_current_user)) -> dict:
    return user


@app.post("/feedback")
async def feedback(payload: dict, locale: str = Depends(get_locale)) -> dict:
    return payload


app.include_router(admin.router, prefix="/api", dependencies=[Depends(get_current_user)])
