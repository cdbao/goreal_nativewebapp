# GoREAL - Roblox Challenge Management System

GoREAL is a comprehensive challenge management system designed for Roblox game integration, featuring a Flask API backend and Streamlit dashboard for administration.

## 🚀 Features

- **RESTful API**: Flask-based API for challenge management and user interactions
- **Admin Dashboard**: Streamlit-powered web interface for system administration
- **Google Sheets Integration**: Seamless data synchronization with Google Sheets
- **Roblox Integration**: Built-in support for Roblox game mechanics
- **Production Ready**: Complete Docker-based deployment with monitoring
- **Security First**: Comprehensive security controls and monitoring

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Development Setup](#development-setup)
- [Production Deployment](#production-deployment)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Monitoring](#monitoring)
- [Contributing](#contributing)

## 🏃 Quick Start

### Prerequisites

- Docker and Docker Compose
- Python 3.11+
- Git

### Development Environment

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd goreal-project
   ```

2. **Set up development environment**
   ```bash
   ./scripts/setup-dev.sh
   ```

3. **Start development services**
   ```bash
   docker-compose up -d
   ```

4. **Access the services**
   - API: http://localhost:8000
   - Dashboard: http://localhost:8501
   - Jupyter Lab: http://localhost:8888

## 🔧 Development Setup

### Local Development

1. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   pip install -r requirements-dev.txt
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Initialize database**
   ```bash
   python -c "from goreal.core.database import create_tables; create_tables()"
   ```

5. **Run development server**
   ```bash
   # API server
   flask --app goreal.api.app:create_app() run --debug

   # Dashboard
   streamlit run goreal/dashboard/app.py
   ```

### Development Tools

- **Code Quality**: Black, flake8, mypy, isort
- **Testing**: pytest with coverage
- **Security**: bandit for security linting
- **Documentation**: Sphinx for API docs

```bash
# Run code quality checks
./scripts/quality-check.sh

# Run tests
pytest --cov=goreal

# Build documentation
cd docs && make html
```

## 🚀 Production Deployment

### Quick Production Setup

1. **Prepare the environment**
   ```bash
   # Set up environment variables and secrets
   ./deploy/scripts/setup-env.sh
   
   # Configure monitoring
   ./deploy/scripts/monitoring-setup.sh
   ```

2. **Deploy the application**
   ```bash
   ./deploy/scripts/deploy.sh
   ```

3. **Verify deployment**
   ```bash
   # Check service health
   curl http://localhost/health
   
   # Access monitoring
   # Grafana: http://localhost:3000
   # Prometheus: http://localhost:9090
   ```

For detailed deployment instructions, see [Production Deployment Guide](docs/deployment/PRODUCTION_DEPLOYMENT.md).

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                 Nginx Reverse Proxy                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
┌─────────▼─────────┐     ┌───────▼──────────┐
│     API-1         │     │      API-2       │
│   (Flask)         │     │    (Flask)       │
└─────────┬─────────┘     └───────┬──────────┘
          │                       │
          └───────────┬───────────┘
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
┌───▼────┐    ┌──────▼──────┐    ┌─────▼─────┐
│PostgreSQL│   │    Redis    │    │Dashboard  │
│Database  │   │   Cache     │    │(Streamlit)│
└─────────┘   └─────────────┘    └───────────┘
```

## 📚 API Documentation

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check endpoint |
| `/api/challenges` | GET | List all challenges |
| `/api/challenges` | POST | Create new challenge |
| `/api/challenges/{id}` | GET | Get specific challenge |
| `/api/challenges/{id}` | PUT | Update challenge |
| `/api/challenges/{id}` | DELETE | Delete challenge |
| `/api/users/{id}/progress` | GET | Get user progress |

### Authentication

The API uses JWT token-based authentication:

```bash
# Get authentication token
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'

# Use token in requests
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/challenges
```

### Example API Usage

```python
import requests

# API client example
class GoRealAPI:
    def __init__(self, base_url, token=None):
        self.base_url = base_url
        self.headers = {}
        if token:
            self.headers['Authorization'] = f'Bearer {token}'
    
    def get_challenges(self):
        response = requests.get(f'{self.base_url}/api/challenges', 
                              headers=self.headers)
        return response.json()
    
    def create_challenge(self, challenge_data):
        response = requests.post(f'{self.base_url}/api/challenges',
                               json=challenge_data,
                               headers=self.headers)
        return response.json()

# Usage
api = GoRealAPI('http://localhost:8000', token='your-jwt-token')
challenges = api.get_challenges()
```

## 🔐 Security

GoREAL implements comprehensive security measures:

- **Authentication**: JWT tokens with expiration
- **Authorization**: Role-based access control (RBAC)
- **Input Validation**: Marshmallow schema validation
- **Rate Limiting**: Per-endpoint rate limits
- **HTTPS**: SSL/TLS encryption in transit
- **Security Headers**: HSTS, CSRF protection, etc.
- **Container Security**: Non-root users, read-only filesystems

For detailed security information, see [Security Guide](docs/deployment/SECURITY_GUIDE.md).

### Security Best Practices

1. **Environment Variables**: Never commit secrets to version control
2. **Regular Updates**: Keep all dependencies updated
3. **Monitoring**: Continuous security monitoring and alerting
4. **Access Control**: Principle of least privilege
5. **Audit Logging**: Comprehensive audit trails

## 📊 Monitoring

### Monitoring Stack

- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization dashboards
- **Alertmanager**: Alert routing and management
- **Loki**: Log aggregation and analysis

### Key Metrics

- **Performance**: Response times, request rates, error rates
- **Resources**: CPU, memory, disk usage
- **Business**: User activity, challenge completion rates
- **Security**: Failed logins, suspicious activity

### Alerts

Predefined alerts for:
- Service downtime
- High error rates
- Performance degradation
- Security incidents
- Resource exhaustion

Access monitoring dashboards at:
- Grafana: http://localhost:3000
- Prometheus: http://localhost:9090

## 🧪 Testing

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=goreal --cov-report=html

# Run specific test categories
pytest tests/unit/
pytest tests/integration/
pytest -m "not slow"  # Skip slow tests
```

### Test Categories

- **Unit Tests**: Individual component testing
- **Integration Tests**: Service integration testing
- **API Tests**: Endpoint testing with real requests
- **Security Tests**: Security vulnerability testing

### CI/CD Pipeline

GitHub Actions workflow includes:
- Code quality checks (Black, flake8, mypy)
- Security scanning (bandit, safety)
- Multi-Python version testing (3.10, 3.11, 3.12)
- Docker image building and scanning
- Automated deployment to staging

## 📂 Project Structure

```
goreal-project/
├── goreal/                    # Main application package
│   ├── api/                   # Flask API application
│   ├── dashboard/             # Streamlit dashboard
│   ├── core/                  # Core business logic
│   ├── models/                # Data models
│   └── utils/                 # Utility functions
├── tests/                     # Test suite
├── docs/                      # Documentation
├── deploy/                    # Deployment configurations
│   ├── scripts/              # Deployment scripts
│   └── monitoring/           # Monitoring configurations
├── docker/                   # Docker configurations
├── scripts/                  # Development scripts
└── notebooks/               # Jupyter notebooks
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and quality checks
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Standards

- **Python**: PEP 8 compliance via Black formatting
- **Type Hints**: Full type annotations required
- **Documentation**: Docstrings for all public functions
- **Testing**: Minimum 80% code coverage
- **Security**: Security review for all changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-org/goreal-project/issues)
- **Security**: For security issues, email security@yourdomain.com
- **Community**: [Discord/Slack Channel]

## 🗺️ Roadmap

### Current Version (v1.0)
- ✅ Core API functionality
- ✅ Admin dashboard
- ✅ Google Sheets integration
- ✅ Production deployment
- ✅ Monitoring and alerting

### Upcoming Features (v2.0)
- [ ] Advanced analytics and reporting
- [ ] Multi-tenant support
- [ ] Enhanced Roblox integration
- [ ] Mobile app API endpoints
- [ ] Advanced challenge types
- [ ] Real-time notifications

### Future Enhancements (v3.0)
- [ ] Machine learning recommendations
- [ ] Advanced user progression systems
- [ ] Integration with additional game platforms
- [ ] Marketplace for user-generated challenges

## 📈 Performance

### Benchmarks

- **API Response Time**: < 200ms (95th percentile)
- **Throughput**: 1000+ requests/second
- **Database Queries**: < 50ms average
- **Memory Usage**: < 512MB per service
- **Startup Time**: < 30 seconds

### Optimization Features

- **Caching**: Redis-based caching for frequent queries
- **Database**: Optimized PostgreSQL with proper indexing
- **CDN**: Static asset delivery via CDN
- **Load Balancing**: Multiple API instances
- **Connection Pooling**: Efficient database connections

---

**Built with ❤️ for the Roblox community**