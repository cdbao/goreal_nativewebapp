# Mock Python file for testing
import os
import datetime
from typing import Optional

def test_function():
    # This line is intentionally too long to trigger E501 flake8 error for testing purposes
    result = some_very_long_function_name_that_exceeds_the_line_length_limit()
    return result

def unused_function():
    pass
