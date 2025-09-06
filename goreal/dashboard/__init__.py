"""
GoREAL Project - Dashboard Module
Streamlit dashboard for admin management of challenges and player logs.
"""

from .app import main, configure_page
from .data_handlers import fetch_playerlog_data, fetch_challenges_data
from .components import display_playerlog_statistics, display_challenges_statistics

__all__ = [
    "main",
    "configure_page",
    "fetch_playerlog_data",
    "fetch_challenges_data",
    "display_playerlog_statistics",
    "display_challenges_statistics",
]
