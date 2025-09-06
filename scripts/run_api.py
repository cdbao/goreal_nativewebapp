#!/usr/bin/env python3
"""
GoREAL Project - API Runner Script
Convenient script to start the Flask API server.
"""

import sys
import os

# Add the project root to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from goreal.api.app import main

if __name__ == "__main__":
    main()