from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import setup_logging
from app.websocket.manager import ws_manager

setup_logging()

app = FastAPI(
    title="FaceGate AI Backend",
    version="1.0.0",
    description="AI-powered access control system backend",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.websocket("/ws/events")
@app.websocket(f"{settings.API_V1_STR}/recognition/ws")
async def websocket_events_endpoint(websocket: WebSocket):
    """Realtime WebSocket endpoint streaming recognition events, door states, and alerts."""
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "FaceGate AI Backend"}

