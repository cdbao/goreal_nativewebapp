#!/usr/bin/env python3
"""
GoREAL Project - Dashboard Runner Script
Convenient script to start the Streamlit dashboard.
"""

import sys
import os
import subprocess

# Add the project root to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

def main():
    """Run the Streamlit dashboard."""
    dashboard_path = os.path.join(
        os.path.dirname(__file__), 
        '..', 
        'goreal', 
        'dashboard', 
        'app.py'
    )
    
    # Run streamlit with the dashboard app
    subprocess.run([
        sys.executable, 
        '-m', 
        'streamlit', 
        'run', 
        dashboard_path
    ])

if __name__ == "__main__":
    main()