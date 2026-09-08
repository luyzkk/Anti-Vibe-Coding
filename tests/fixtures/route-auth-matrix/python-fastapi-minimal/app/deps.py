from fastapi import Header, HTTPException


async def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    if authorization is None:
        raise HTTPException(status_code=401)
    return {"id": 1}


async def get_locale(accept_language: str | None = Header(default=None)) -> str:
    return accept_language or "en"
