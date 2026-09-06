from fastapi import APIRouter

router = APIRouter(prefix="/admin")


@router.get("/users")
async def list_users() -> list[dict]:
    return []


@router.delete("/users/{user_id}")
async def delete_user(user_id: int) -> None:
    return None
