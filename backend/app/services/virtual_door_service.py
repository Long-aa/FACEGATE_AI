"""
Virtual Door State Machine Service for FaceGate AI.
Provides complete software-only access control simulation without requiring physical relays or sensors:
- Multi-state door state machine (LOCKED, UNLOCKING, OPEN, HELD_OPEN_WARNING, FORCED_OPEN_ALARM, EMERGENCY_UNLOCKED, EMERGENCY_LOCKED)
- Sensor event simulation (DOOR_OPEN, DOOR_CLOSE, DOOR_HELD, DOOR_FORCE, RESET_ALARM)
- Auto-relock timers and held-open duration tracking
- Real-time WebSocket broadcasting and automatic DB Alert generation on breach
"""
import asyncio
from datetime import datetime, timezone
from enum import Enum
import logging
from typing import Any, Dict, Optional

from app.websocket.manager import ws_manager

logger = logging.getLogger(__name__)


class VirtualDoorState(str, Enum):
    LOCKED = "LOCKED"
    UNLOCKING = "UNLOCKING"
    OPEN = "OPEN"
    HELD_OPEN_WARNING = "HELD_OPEN_WARNING"
    FORCED_OPEN_ALARM = "FORCED_OPEN_ALARM"
    EMERGENCY_UNLOCKED = "EMERGENCY_UNLOCKED"
    EMERGENCY_LOCKED = "EMERGENCY_LOCKED"


class VirtualDoorManager:
    """In-memory state machine manager for all virtual doors."""

    def __init__(self):
        # door_id -> dict of state info
        self._doors: Dict[str, Dict[str, Any]] = {}
        # door_id -> running asyncio.Task
        self._tasks: Dict[str, asyncio.Task] = {}

    def _ensure_door_init(self, door_id: str, door_name: str = "Cửa", unlock_duration: int = 5) -> Dict[str, Any]:
        if door_id not in self._doors:
            self._doors[door_id] = {
                "door_id": door_id,
                "door_name": door_name,
                "state": VirtualDoorState.LOCKED.value,
                "contact_sensor": "CLOSED",
                "lock_bolt": "LOCKED",
                "alarm_active": False,
                "alarm_message": None,
                "countdown_seconds": 0,
                "unlock_duration": unlock_duration,
                "last_event": "INITIALIZED",
                "last_updated": datetime.now(timezone.utc).isoformat(),
            }
        return self._doors[door_id]

    def get_state(self, door_id: str, door_name: str = "Cửa", unlock_duration: int = 5) -> Dict[str, Any]:
        """Get the current virtual state of a door."""
        d = self._ensure_door_init(door_id, door_name, unlock_duration)
        return {k: v for k, v in d.items()}

    def get_all_states(self) -> Dict[str, Dict[str, Any]]:
        """Get states for all initialized doors."""
        return {k: {k2: v2 for k2, v2 in v.items()} for k, v in self._doors.items()}

    async def _broadcast_state(self, door_id: str):
        """Broadcast state update to all WebSocket clients."""
        door_info = self._doors.get(door_id)
        if not door_info:
            return
        try:
            await ws_manager.broadcast({
                "type": "VIRTUAL_DOOR_STATE_CHANGE",
                "data": door_info,
            })
            # Also broadcast classic DOOR_UPDATE for legacy widgets
            is_unlocked = door_info["state"] in (
                VirtualDoorState.UNLOCKING.value,
                VirtualDoorState.OPEN.value,
                VirtualDoorState.HELD_OPEN_WARNING.value,
                VirtualDoorState.EMERGENCY_UNLOCKED.value,
            )
            await ws_manager.broadcast({
                "type": "DOOR_UPDATE",
                "data": {
                    "door_id": door_id,
                    "door_name": door_info["door_name"],
                    "lock_status": "Unlocked" if is_unlocked else "Locked",
                    "duration": door_info["countdown_seconds"],
                    "action": door_info["last_event"],
                    "state": door_info["state"],
                }
            })
        except Exception as e:
            logger.debug(f"Broadcast failed: {e}")

    async def unlock(self, door_id: str, door_name: str = "Cửa", duration: int = 10, user_name: str = "Hệ thống") -> Dict[str, Any]:
        """Trigger timed unlock sequence (e.g. from face recognition or manual unlock)."""
        d = self._ensure_door_init(door_id, door_name, duration)
        
        # Cancel previous timer if any
        if door_id in self._tasks and not self._tasks[door_id].done():
            self._tasks[door_id].cancel()

        d["state"] = VirtualDoorState.UNLOCKING.value
        d["lock_bolt"] = "UNLOCKED"
        d["alarm_active"] = False
        d["alarm_message"] = None
        d["countdown_seconds"] = duration
        d["last_event"] = f"UNLOCK_REQUEST ({user_name})"
        d["last_updated"] = datetime.now(timezone.utc).isoformat()

        # Update database
        self._sync_db_lock_status(door_id, "Unlocked", user_name)
        await self._broadcast_state(door_id)

        # Start countdown background task
        async def _countdown_and_relock():
            try:
                for rem in range(duration, 0, -1):
                    d["countdown_seconds"] = rem
                    await asyncio.sleep(1)
                # If door was never opened, or finished, auto-lock
                if d["state"] == VirtualDoorState.UNLOCKING.value:
                    d["state"] = VirtualDoorState.LOCKED.value
                    d["lock_bolt"] = "LOCKED"
                    d["countdown_seconds"] = 0
                    d["last_event"] = "AUTO_RELOCK"
                    d["last_updated"] = datetime.now(timezone.utc).isoformat()
                    self._sync_db_lock_status(door_id, "Locked", "Hệ thống tự động")
                    await self._broadcast_state(door_id)
            except asyncio.CancelledError:
                pass

        task = asyncio.create_task(_countdown_and_relock())
        self._tasks[door_id] = task
        return d

    async def lock(self, door_id: str, door_name: str = "Cửa", user_name: str = "Hệ thống") -> Dict[str, Any]:
        """Immediately force lock the door."""
        d = self._ensure_door_init(door_id, door_name)
        if door_id in self._tasks and not self._tasks[door_id].done():
            self._tasks[door_id].cancel()

        d["state"] = VirtualDoorState.LOCKED.value
        d["lock_bolt"] = "LOCKED"
        d["contact_sensor"] = "CLOSED"
        d["alarm_active"] = False
        d["alarm_message"] = None
        d["countdown_seconds"] = 0
        d["last_event"] = f"MANUAL_LOCK ({user_name})"
        d["last_updated"] = datetime.now(timezone.utc).isoformat()

        self._sync_db_lock_status(door_id, "Locked", user_name)
        await self._broadcast_state(door_id)
        return d

    async def simulate_event(self, door_id: str, event: str, door_name: str = "Cửa", user_name: str = "Admin") -> Dict[str, Any]:
        """
        Simulate hardware sensor and tamper events:
        - DOOR_OPEN (or OPEN): Door physically opened.
        - DOOR_CLOSE (or CLOSE): Door physically closed.
        - DOOR_HELD (or HELD): Door propped/held open past threshold.
        - DOOR_FORCE (or FORCE): Physical break-in without unlock!
        - RESET_ALARM: Reset alarm and lock.
        """
        d = self._ensure_door_init(door_id, door_name)
        evt = event.upper().strip()

        if evt in ("DOOR_OPEN", "OPEN"):
            # If door was locked, this is an UNAUTHORIZED FORCED ENTRY!
            if d["lock_bolt"] == "LOCKED":
                d["state"] = VirtualDoorState.FORCED_OPEN_ALARM.value
                d["contact_sensor"] = "OPEN"
                d["alarm_active"] = True
                d["alarm_message"] = f"CẢNH BÁO: Phát hiện mở cửa trái phép khi chốt đang khóa tại {d['door_name']}!"
                d["last_event"] = "SENSOR: FORCED_ENTRY_DETECTED"
                self._create_security_alert(
                    door_id=door_id,
                    door_name=d["door_name"],
                    alert_type="Cạy cửa trái phép (Forced Entry)",
                    description=d["alarm_message"],
                    severity="CRITICAL",
                )
            else:
                # Authorized passage
                d["state"] = VirtualDoorState.OPEN.value
                d["contact_sensor"] = "OPEN"
                d["last_event"] = "SENSOR: DOOR_OPENED"

        elif evt in ("DOOR_CLOSE", "CLOSE"):
            # Door closed -> bolt locks immediately
            if door_id in self._tasks and not self._tasks[door_id].done():
                self._tasks[door_id].cancel()
            d["state"] = VirtualDoorState.LOCKED.value
            d["contact_sensor"] = "CLOSED"
            d["lock_bolt"] = "LOCKED"
            d["countdown_seconds"] = 0
            d["alarm_active"] = False
            d["alarm_message"] = None
            d["last_event"] = "SENSOR: DOOR_CLOSED"
            self._sync_db_lock_status(door_id, "Locked", "Cảm biến tiếp điểm đóng")

        elif evt in ("DOOR_HELD", "HELD"):
            # Door held open too long
            d["state"] = VirtualDoorState.HELD_OPEN_WARNING.value
            d["contact_sensor"] = "OPEN"
            d["alarm_active"] = True
            d["alarm_message"] = f"CẢNH BÁO: Cửa {d['door_name']} bị giữ mở quá thời gian quy định!"
            d["last_event"] = "SENSOR: DOOR_HELD_OPEN_WARNING"
            self._create_security_alert(
                door_id=door_id,
                door_name=d["door_name"],
                alert_type="Giữ cửa quá lâu (Door Held Open)",
                description=d["alarm_message"],
                severity="WARNING",
            )

        elif evt in ("DOOR_FORCE", "FORCE"):
            # Force simulated alarm
            d["state"] = VirtualDoorState.FORCED_OPEN_ALARM.value
            d["contact_sensor"] = "OPEN"
            d["alarm_active"] = True
            d["alarm_message"] = f"BÁO ĐỘNG ĐỎ: Phá khóa/Cạy cửa trái phép tại {d['door_name']}!"
            d["last_event"] = "SENSOR: TAMPER_FORCE_ALARM"
            self._create_security_alert(
                door_id=door_id,
                door_name=d["door_name"],
                alert_type="Báo động phá khóa (Door Forced)",
                description=d["alarm_message"],
                severity="CRITICAL",
            )

        elif evt in ("RESET_ALARM", "RESET"):
            # Reset alarm
            d["state"] = VirtualDoorState.LOCKED.value
            d["contact_sensor"] = "CLOSED"
            d["lock_bolt"] = "LOCKED"
            d["alarm_active"] = False
            d["alarm_message"] = None
            d["countdown_seconds"] = 0
            d["last_event"] = f"ALARM_RESET ({user_name})"
            self._sync_db_lock_status(door_id, "Locked", user_name)

        else:
            d["last_event"] = f"UNKNOWN_SIMULATION_EVENT ({evt})"

        d["last_updated"] = datetime.now(timezone.utc).isoformat()
        await self._broadcast_state(door_id)
        return d

    async def emergency_evacuate(self, user_name: str = "Admin") -> Dict[str, Any]:
        """Release all doors for fire / emergency evacuation."""
        for door_id, d in self._doors.items():
            if door_id in self._tasks and not self._tasks[door_id].done():
                self._tasks[door_id].cancel()
            d["state"] = VirtualDoorState.EMERGENCY_UNLOCKED.value
            d["lock_bolt"] = "UNLOCKED"
            d["alarm_active"] = True
            d["alarm_message"] = "CHẾ ĐỘ SƠ TÁN KHẨN CẤP: Toàn bộ cửa đã mở khóa tự do!"
            d["last_event"] = f"EMERGENCY_EVACUATE ({user_name})"
            d["last_updated"] = datetime.now(timezone.utc).isoformat()
            self._sync_db_lock_status(door_id, "Unlocked", user_name)
            await self._broadcast_state(door_id)

        self._create_security_alert(
            door_id=None,
            door_name="Toàn hệ thống",
            alert_type="Kích hoạt sơ tán khẩn cấp",
            description=f"Toàn bộ hệ thống cửa đã được mở khóa bởi {user_name} để phục vụ sơ tán.",
            severity="CRITICAL",
        )
        return {"success": True, "action": "EMERGENCY_EVACUATE", "affected_doors": len(self._doors)}

    async def emergency_lockdown(self, user_name: str = "Admin") -> Dict[str, Any]:
        """Strict security lockdown of all doors."""
        for door_id, d in self._doors.items():
            if door_id in self._tasks and not self._tasks[door_id].done():
                self._tasks[door_id].cancel()
            d["state"] = VirtualDoorState.EMERGENCY_LOCKED.value
            d["lock_bolt"] = "LOCKED"
            d["contact_sensor"] = "CLOSED"
            d["alarm_active"] = True
            d["alarm_message"] = "CHẾ ĐỘ PHONG TỎA KHẨN CẤP: Toàn bộ cửa bị khóa cứng!"
            d["last_event"] = f"EMERGENCY_LOCKDOWN ({user_name})"
            d["last_updated"] = datetime.now(timezone.utc).isoformat()
            self._sync_db_lock_status(door_id, "Locked", user_name)
            await self._broadcast_state(door_id)

        self._create_security_alert(
            door_id=None,
            door_name="Toàn hệ thống",
            alert_type="Kích hoạt phong tỏa khẩn cấp",
            description=f"Phong tỏa khẩn cấp toàn bộ cửa bởi {user_name}. Mọi quyền ra vào tạm thời ngưng hiệu lực.",
            severity="CRITICAL",
        )
        return {"success": True, "action": "EMERGENCY_LOCKDOWN", "affected_doors": len(self._doors)}

    async def emergency_reset(self, user_name: str = "Admin") -> Dict[str, Any]:
        """Reset emergency modes and return all doors to normal LOCKED."""
        for door_id, d in self._doors.items():
            if door_id in self._tasks and not self._tasks[door_id].done():
                self._tasks[door_id].cancel()
            d["state"] = VirtualDoorState.LOCKED.value
            d["lock_bolt"] = "LOCKED"
            d["contact_sensor"] = "CLOSED"
            d["alarm_active"] = False
            d["alarm_message"] = None
            d["countdown_seconds"] = 0
            d["last_event"] = f"EMERGENCY_RESET ({user_name})"
            d["last_updated"] = datetime.now(timezone.utc).isoformat()
            self._sync_db_lock_status(door_id, "Locked", user_name)
            await self._broadcast_state(door_id)

        return {"success": True, "action": "EMERGENCY_RESET", "affected_doors": len(self._doors)}

    def _sync_db_lock_status(self, door_id: str, lock_status: str, user_name: str):
        """Update Door lock_status in PostgreSQL database."""
        try:
            from app.database.session import SessionLocal
            from app.models.door import Door
            db = SessionLocal()
            try:
                door = db.query(Door).filter((Door.id == door_id) | (Door.door_code == door_id)).first()
                if door:
                    door.lock_status = lock_status
                    door.last_activity = datetime.now(timezone.utc)
                    door.last_user_name = user_name
                    db.commit()
            finally:
                db.close()
        except Exception as e:
            logger.debug(f"DB sync lock_status error: {e}")

    def _create_security_alert(self, door_id: Optional[str], door_name: str, alert_type: str, description: str, severity: str):
        """Record an alert in the PostgreSQL database and broadcast ALERT_NEW."""
        try:
            from app.database.session import SessionLocal
            from app.models.alert import Alert
            db = SessionLocal()
            try:
                alert = Alert(
                    door_id=door_id,
                    door_name=door_name,
                    alert_type=alert_type,
                    description=description,
                    severity=severity,
                    status="UNRESOLVED",
                    location=door_name,
                    timestamp=datetime.now(timezone.utc),
                )
                db.add(alert)
                db.commit()
                db.refresh(alert)

                asyncio.create_task(
                    ws_manager.broadcast({
                        "type": "ALERT_NEW",
                        "data": {
                            "id": alert.id,
                            "title": alert_type,
                            "alert_type": alert_type,
                            "description": description,
                            "severity": severity,
                            "door_name": door_name,
                            "timestamp": alert.timestamp.isoformat(),
                        }
                    })
                )
            finally:
                db.close()
        except Exception as e:
            logger.debug(f"Failed to create alert in DB: {e}")


# Singleton instance
virtual_door_manager = VirtualDoorManager()

