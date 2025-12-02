"""
Wingman AI - Core Module
Contains the main engine and infrastructure components
"""

from .engine import WingmanEngine
from .event_bus import event_bus, Event
from .websocket_server import create_socket_app

__all__ = [
    "WingmanEngine",
    "event_bus",
    "Event",
    "create_socket_app"
]

