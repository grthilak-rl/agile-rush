from fastapi import WebSocket
from typing import Dict, Optional
import asyncio
import json


class ConnectionManager:
    def __init__(self):
        # project_id -> {websocket: user_info}
        self.connections: Dict[str, Dict[WebSocket, dict]] = {}

    async def connect(self, websocket: WebSocket, project_id: str, user: dict):
        await websocket.accept()
        if project_id not in self.connections:
            self.connections[project_id] = {}
        self.connections[project_id][websocket] = user

        # Notify others that this user came online
        await self.broadcast_to_project(project_id, {
            "type": "member:online",
            "data": {"user_id": user["id"], "user_name": user["full_name"]}
        }, exclude_ws=websocket)

        # Send current online members to the new connection
        online = [
            {"user_id": info["id"], "user_name": info["full_name"]}
            for ws, info in self.connections[project_id].items()
            if ws != websocket
        ]
        await websocket.send_json({"type": "members:online_list", "data": online})

    async def disconnect(self, websocket: WebSocket, project_id: str):
        user = self.connections.get(project_id, {}).pop(websocket, None)
        if user:
            await self.broadcast_to_project(project_id, {
                "type": "member:offline",
                "data": {"user_id": user["id"]}
            })
        # Clean up empty project entry
        if project_id in self.connections and not self.connections[project_id]:
            del self.connections[project_id]

    async def broadcast_to_project(
        self, project_id: str, event: dict, exclude_ws: Optional[WebSocket] = None
    ):
        dead_connections = []
        for ws in list(self.connections.get(project_id, {})):
            if ws != exclude_ws:
                try:
                    await ws.send_json(event)
                except Exception:
                    dead_connections.append(ws)
        for ws in dead_connections:
            await self.disconnect(ws, project_id)


manager = ConnectionManager()

# Reference to the main event loop, set during app startup
_main_loop: Optional[asyncio.AbstractEventLoop] = None


def set_event_loop(loop: asyncio.AbstractEventLoop):
    global _main_loop
    _main_loop = loop


def broadcast_event(project_id: str, event: dict):
    """Fire-and-forget broadcast from sync endpoints.

    Safe to call from synchronous FastAPI route handlers which run in
    a threadpool. Schedules the coroutine on the main event loop.
    Silently ignores errors so it never breaks API responses.
    """
    try:
        if _main_loop is not None and _main_loop.is_running():
            asyncio.run_coroutine_threadsafe(
                manager.broadcast_to_project(project_id, event),
                _main_loop,
            )
    except Exception:
        pass
