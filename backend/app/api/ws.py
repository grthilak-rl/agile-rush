from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.core.websocket import manager
from app.core.security import verify_token
from app.core.project_access import get_project_with_access
from app.database import SessionLocal
from app.models.user import User

router = APIRouter()


@router.websocket("/api/ws/projects/{project_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    project_id: str,
    token: str = Query(...),
):
    # Authenticate via JWT token in query param
    try:
        payload = verify_token(token)
    except Exception:
        await websocket.close(code=4001, reason="Invalid token")
        return

    user_id = payload.get("sub")
    if not user_id:
        await websocket.close(code=4001, reason="Invalid token")
        return

    # Verify project access
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            await websocket.close(code=4001, reason="User not found")
            return

        try:
            get_project_with_access(project_id, user, db, "viewer")
        except Exception:
            await websocket.close(code=4003, reason="No access to project")
            return

        user_info = {"id": str(user.id), "full_name": user.full_name}
    finally:
        db.close()

    await manager.connect(websocket, project_id, user_info)

    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await manager.disconnect(websocket, project_id)
    except Exception:
        await manager.disconnect(websocket, project_id)
