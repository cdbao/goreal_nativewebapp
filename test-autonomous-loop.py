#!/usr/bin/env python3
"""
Test script to intentionally trigger autonomous debugging loop
Creates a simple flake8 error that should have high confidence for automatic fixing
"""

import os
import sys  # unused import to trigger F401

def test_function_with_long_line():
    # This line intentionally exceeds 88 characters to trigger E501 flake8 error for testing autonomous debugging
    result = "This is a very long line that should trigger the flake8 E501 error and test our autonomous debugging system"
    return result


class TestClass:
    def method_without_blank_lines(self):  # Should trigger E302
        pass

if __name__ == "__main__":
    print("Testing autonomous debugging system...")
    test_function_with_long_line()