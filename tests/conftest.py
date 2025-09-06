"""
GoREAL Project - Test Configuration
Pytest configuration and fixtures for testing.
"""

import os
import pytest
import tempfile
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import MagicMock, patch

# Import GoREAL modules
from goreal.core.database import Base, get_db
from goreal.api.app import create_app
from goreal.core.sheets_client import GoogleSheetsClient


@pytest.fixture(scope="session")
def test_database_url():
    """Get test database URL from environment or use in-memory SQLite."""
    return os.getenv(
        "TEST_DATABASE_URL",
        "sqlite:///./test_goreal.db"
    )


@pytest.fixture(scope="session")
def test_engine(test_database_url):
    """Create test database engine."""
    engine = create_engine(
        test_database_url,
        echo=False,
        # SQLite specific settings
        connect_args={"check_same_thread": False} if "sqlite" in test_database_url else {}
    )
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)


@pytest.fixture(scope="function")
def test_session(test_engine):
    """Create test database session with automatic rollback."""
    TestingSessionLocal = sessionmaker(
        autocommit=False, 
        autoflush=False, 
        bind=test_engine
    )
    
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture(scope="function")
def test_app(test_session):
    """Create test Flask application with overridden database session."""
    app = create_app()
    app.config.update({
        "TESTING": True,
        "WTF_CSRF_ENABLED": False,
        "DATABASE_URL": "sqlite:///./test_goreal.db",
        "REDIS_URL": "redis://localhost:6379/1",
        "GOOGLE_CREDENTIALS_FILE": "test_credentials.json"
    })
    
    # Override database dependency
    def override_get_db():
        try:
            yield test_session
        finally:
            pass
    
    app.dependency_overrides = getattr(app, 'dependency_overrides', {})
    app.dependency_overrides[get_db] = override_get_db
    
    with app.app_context():
        yield app


@pytest.fixture(scope="function")
def client(test_app):
    """Create test client for API testing."""
    return test_app.test_client()


@pytest.fixture(scope="function")
def mock_sheets_client():
    """Mock Google Sheets client for testing without actual Google Sheets API calls."""
    with patch('goreal.core.sheets_client.GoogleSheetsClient') as mock_client:
        # Configure mock methods
        mock_instance = MagicMock()
        mock_client.return_value = mock_instance
        
        # Mock successful connection
        mock_instance.connect.return_value = (MagicMock(), MagicMock())
        
        # Mock successful operations
        mock_instance.log_challenge.return_value = True
        mock_instance.update_submission.return_value = True
        mock_instance.get_player_status.return_value = {
            'status': 'completed',
            'timestamp': '2023-01-01 12:00:00',
            'playerName': 'TestPlayer',
            'submissionText': 'Test submission'
        }
        mock_instance.get_challenges.return_value = [
            {
                'ChallengeID': 'C01',
                'Title': 'Test Challenge',
                'Description': 'Test Description',
                'RewardPoints': 100
            }
        ]
        
        yield mock_instance


@pytest.fixture
def sample_player_data():
    """Sample player data for testing."""
    return {
        "playerId": "TEST123",
        "playerName": "TestPlayer",
        "challengeId": "C01"
    }


@pytest.fixture
def sample_submission_data():
    """Sample submission data for testing."""
    return {
        "playerId": "TEST123",
        "challengeId": "C01",
        "submissionText": "I completed the test challenge successfully!"
    }


@pytest.fixture
def sample_challenge_data():
    """Sample challenge data for testing."""
    return {
        "challenge_id": "C01",
        "title": "Test Challenge",
        "description": "This is a test challenge for unit testing",
        "reward_points": 100,
        "difficulty_level": "easy",
        "category": "test"
    }


@pytest.fixture(scope="function")
def temp_credentials_file():
    """Create temporary credentials file for testing."""
    credentials_data = {
        "type": "service_account",
        "project_id": "test-project",
        "private_key_id": "test-key-id",
        "private_key": "-----BEGIN PRIVATE KEY-----\nTEST_KEY\n-----END PRIVATE KEY-----\n",
        "client_email": "test@test-project.iam.gserviceaccount.com",
        "client_id": "123456789",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token"
    }
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        import json
        json.dump(credentials_data, f)
        temp_file_path = f.name
    
    yield temp_file_path
    
    # Cleanup
    try:
        os.unlink(temp_file_path)
    except FileNotFoundError:
        pass


@pytest.fixture(autouse=True)
def setup_test_environment():
    """Set up test environment variables."""
    test_env = {
        "FLASK_ENV": "testing",
        "DATABASE_URL": "sqlite:///./test_goreal.db",
        "REDIS_URL": "redis://localhost:6379/1",
        "GOOGLE_CREDENTIALS_FILE": "test_credentials.json"
    }
    
    # Store original values
    original_env = {}
    for key, value in test_env.items():
        original_env[key] = os.environ.get(key)
        os.environ[key] = value
    
    yield
    
    # Restore original values
    for key, value in original_env.items():
        if value is None:
            os.environ.pop(key, None)
        else:
            os.environ[key] = value


@pytest.fixture
def mock_redis():
    """Mock Redis client for testing."""
    with patch('redis.Redis') as mock_redis_class:
        mock_redis_instance = MagicMock()
        mock_redis_class.return_value = mock_redis_instance
        
        # Mock Redis operations
        mock_redis_instance.ping.return_value = True
        mock_redis_instance.get.return_value = None
        mock_redis_instance.set.return_value = True
        mock_redis_instance.delete.return_value = 1
        mock_redis_instance.exists.return_value = 0
        
        yield mock_redis_instance


# Pytest configuration
def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line("markers", "unit: mark test as a unit test")
    config.addinivalue_line("markers", "integration: mark test as an integration test")
    config.addinivalue_line("markers", "slow: mark test as slow running")
    config.addinivalue_line("markers", "api: mark test as an API test")
    config.addinivalue_line("markers", "database: mark test as a database test")


def pytest_collection_modifyitems(config, items):
    """Automatically mark tests based on their location."""
    for item in items:
        # Mark integration tests
        if "integration" in str(item.fspath):
            item.add_marker(pytest.mark.integration)
        
        # Mark API tests
        if "api" in str(item.fspath) or "test_api" in item.name:
            item.add_marker(pytest.mark.api)
        
        # Mark database tests
        if "database" in str(item.fspath) or "test_database" in item.name:
            item.add_marker(pytest.mark.database)
        
        # Mark unit tests (default)
        if not any(marker.name in ["integration", "slow"] for marker in item.iter_markers()):
            item.add_marker(pytest.mark.unit)


# Custom pytest plugins
class TestMetrics:
    """Custom plugin to collect test metrics."""
    
    def __init__(self):
        self.test_results = []
    
    def pytest_runtest_logreport(self, report):
        """Collect test results."""
        if report.when == "call":
            self.test_results.append({
                'test': report.nodeid,
                'outcome': report.outcome,
                'duration': report.duration,
            })
    
    def pytest_sessionfinish(self, session):
        """Print test metrics summary."""
        if self.test_results:
            total_tests = len(self.test_results)
            passed = len([r for r in self.test_results if r['outcome'] == 'passed'])
            failed = len([r for r in self.test_results if r['outcome'] == 'failed'])
            total_duration = sum(r['duration'] for r in self.test_results)
            
            print(f"\n📊 Test Metrics Summary:")
            print(f"   Total Tests: {total_tests}")
            print(f"   Passed: {passed}")
            print(f"   Failed: {failed}")
            print(f"   Total Duration: {total_duration:.2f}s")
            print(f"   Average Duration: {total_duration/total_tests:.3f}s")


def pytest_configure(config):
    """Register custom plugins."""
    config.pluginmanager.register(TestMetrics(), "test_metrics")