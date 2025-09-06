"""
GoREAL Project - Flask API Application
Main Flask application for handling Roblox game requests.
"""

import os
import logging
from flask import Flask
from .routes import create_api_routes
from ..config.settings import config, CREDENTIALS_FILE


def create_app(config_object=None):
    """
    Create and configure the Flask application.
    
    Args:
        config_object: Configuration object to use (defaults to current config)
        
    Returns:
        Flask application instance
    """
    app = Flask(__name__)
    
    # Use provided config or default
    cfg = config_object or config
    
    # Configure Flask app
    app.config['SECRET_KEY'] = cfg.SECRET_KEY
    app.config['DEBUG'] = cfg.DEBUG_MODE
    
    # Configure logging
    if not cfg.DEBUG_MODE:
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s %(levelname)s %(name)s %(message)s'
        )
    
    # Create API routes
    create_api_routes(app)
    
    return app


def main():
    """
    Main function to run the Flask API server.
    """
    # Configure logging for development
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s %(levelname)s %(message)s'
    )
    logger = logging.getLogger(__name__)
    
    # Check if credentials file exists before starting the server
    if not os.path.exists(CREDENTIALS_FILE):
        logger.warning(f"Credentials file {CREDENTIALS_FILE} not found. Please ensure it's configured properly.")
    
    logger.info("GoREAL API starting with the following endpoints:")
    logger.info("  POST /log_challenge - Log player challenge submissions")
    logger.info("  POST /submit_challenge - Submit proof of challenge completion")
    logger.info("  GET /get_status - Query player challenge status")
    logger.info("  GET /get_challenges - Retrieve available challenges list")
    logger.info("  GET /health - Health check")
    
    # Create and run the Flask application
    app = create_app()
    
    # Use configuration for host, port, and debug settings
    logger.info(f"Starting server on {config.API_HOST}:{config.API_PORT}")
    if config.DEBUG_MODE:
        logger.warning("Running in DEBUG mode - not suitable for production!")
    
    # For production, use a proper WSGI server like Gunicorn
    app.run(
        debug=config.DEBUG_MODE, 
        host=config.API_HOST, 
        port=config.API_PORT
    )


if __name__ == '__main__':
    main()