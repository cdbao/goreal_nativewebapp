"""
GoREAL Project - Data Validators
Validation functions for API requests and data integrity.
"""

import re
import html
from typing import Dict, Any, Tuple

# Security constants
MAX_TEXT_LENGTH = 10000
MAX_ID_LENGTH = 100
ALLOWED_ID_PATTERN = re.compile(r'^[a-zA-Z0-9_-]+$')
MALICIOUS_PATTERNS = [
    r'<script[^>]*>.*?</script>',  # Script tags
    r'javascript:',               # JavaScript protocol
    r'on\w+=',                   # Event handlers
    r'expression\(',             # CSS expressions
    r'eval\(',                   # JavaScript eval
]


def sanitize_input(text: str) -> str:
    """Sanitize user input to prevent XSS and injection attacks."""
    if not isinstance(text, str):
        text = str(text)
    
    # HTML escape
    text = html.escape(text)
    
    # Remove potentially malicious patterns
    for pattern in MALICIOUS_PATTERNS:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)
    
    return text.strip()


def validate_id_format(identifier: str) -> Tuple[bool, str]:
    """Validate that an ID contains only allowed characters."""
    if not identifier:
        return False, "ID cannot be empty"
    
    if len(identifier) > MAX_ID_LENGTH:
        return False, f"ID too long (max {MAX_ID_LENGTH} characters)"
    
    if not ALLOWED_ID_PATTERN.match(identifier):
        return False, "ID contains invalid characters (only alphanumeric, underscore, and dash allowed)"
    
    return True, ""


def validate_text_field(text: str, field_name: str, max_length: int = MAX_TEXT_LENGTH) -> Tuple[bool, str]:
    """Validate text field with length and content checks."""
    if not text:
        return False, f"{field_name} cannot be empty"
    
    if len(text) > max_length:
        return False, f"{field_name} too long (max {max_length} characters)"
    
    # Check for malicious patterns
    for pattern in MALICIOUS_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return False, f"{field_name} contains potentially malicious content"
    
    return True, ""


def validate_challenge_data(data: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Validates the incoming JSON data for challenge logging.
    
    Args:
        data: Dictionary containing the request data
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    required_fields = ['playerId', 'playerName', 'challengeId']
    
    if not data:
        return False, "No JSON data provided"
    
    for field in required_fields:
        if field not in data:
            return False, f"Missing required field: {field}"
        
        value = data[field]
        if not value:
            return False, f"Empty value for field: {field}"
        
        # Validate ID fields
        if field in ['playerId', 'challengeId']:
            is_valid, error = validate_id_format(str(value))
            if not is_valid:
                return False, f"{field}: {error}"
        
        # Validate text fields
        elif field == 'playerName':
            is_valid, error = validate_text_field(str(value), field, 100)
            if not is_valid:
                return False, error
    
    # Sanitize all inputs
    for field in required_fields:
        if field in data:
            data[field] = sanitize_input(str(data[field]))
    
    return True, ""


def validate_submission_data(data: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Validates the incoming JSON data for proof submission.
    
    Args:
        data: Dictionary containing the submission data
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    required_fields = ['playerId', 'challengeId', 'submissionText']
    
    if not data:
        return False, "No JSON data provided"
    
    for field in required_fields:
        if field not in data:
            return False, f"Missing required field: {field}"
        
        value = data[field]
        if not value:
            return False, f"Empty value for field: {field}"
        
        # Validate ID fields
        if field in ['playerId', 'challengeId']:
            is_valid, error = validate_id_format(str(value))
            if not is_valid:
                return False, f"{field}: {error}"
        
        # Validate submission text
        elif field == 'submissionText':
            is_valid, error = validate_text_field(str(value), field, 5000)
            if not is_valid:
                return False, error
    
    # Sanitize all inputs
    for field in required_fields:
        if field in data:
            data[field] = sanitize_input(str(data[field]))
    
    return True, ""


def validate_status_query(player_id: str, challenge_id: str) -> Tuple[bool, str]:
    """
    Validates query parameters for status requests.
    
    Args:
        player_id: Player identifier
        challenge_id: Challenge identifier
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not player_id:
        return False, "Missing required parameter: playerId"
    
    if not challenge_id:
        return False, "Missing required parameter: challengeId"
    
    # Validate player ID format
    is_valid, error = validate_id_format(player_id)
    if not is_valid:
        return False, f"playerId: {error}"
    
    # Validate challenge ID format
    is_valid, error = validate_id_format(challenge_id)
    if not is_valid:
        return False, f"challengeId: {error}"
    
    return True, ""