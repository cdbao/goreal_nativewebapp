"""
GoREAL Project - API Module
Flask API for handling Roblox game requests.
"""

from .app import create_app, main
from .routes import create_api_routes

__all__ = [
    'create_app',
    'main',
    'create_api_routes'
]