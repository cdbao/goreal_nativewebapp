# GitHub Repository Setup Guide

This guide walks you through setting up the complete GitHub repository for the GoREAL project with all CI/CD, code quality, and collaboration features.

## 📋 Quick Setup Checklist

- [ ] Create GitHub repository
- [ ] Configure repository settings
- [ ] Set up branch protection rules
- [ ] Add repository secrets
- [ ] Configure code quality tools
- [ ] Set up team permissions
- [ ] Test CI/CD pipeline
- [ ] Create initial release

## 🚀 Step 1: Create Repository

### Option A: GitHub CLI (Recommended)
```bash
# Install GitHub CLI if not already installed
# https://cli.github.com/

# Create repository
gh repo create your-username/goreal-project --public --description "Roblox-integrated challenge management system"

# Clone locally
git clone https://github.com/your-username/goreal-project.git
cd goreal-project

# Copy all files from your local goreal-project directory
cp -r /path/to/your/goreal-project/* .

# Add and commit files
git add .
git commit -m "Initial commit: Complete GoREAL project setup

🎮 Features:
- Flask API with comprehensive endpoints
- Streamlit admin dashboard
- PostgreSQL database with sample data
- Docker development environment
- Jupyter notebooks for analytics
- Complete CI/CD pipeline
- Code quality tools integration

🚀 Ready for development and deployment!"

# Push to GitHub
git push origin main
```

### Option B: GitHub Web Interface
1. Go to https://github.com/new
2. Repository name: `goreal-project`
3. Description: `Roblox-integrated challenge management system`
4. Make it **Public** (or Private if preferred)
5. Initialize with README: **No** (we have our own)
6. Click "Create repository"

Then follow the commands to push your existing code.

## ⚙️ Step 2: Configure Repository Settings

### General Settings
Go to **Settings** → **General**:

- [ ] **Default branch**: Set to `main`
- [ ] **Features**:
  - ✅ Issues
  - ✅ Projects
  - ✅ Wiki (optional)
  - ✅ Discussions (recommended)
- [ ] **Pull Requests**:
  - ✅ Allow merge commits
  - ✅ Allow squash merging (default)
  - ✅ Allow rebase merging
  - ✅ Always suggest updating pull request branches
  - ✅ Automatically delete head branches

### Pages (Optional)
Go to **Settings** → **Pages**:
- Source: **GitHub Actions**
- This will allow documentation deployment

## 🔒 Step 3: Set Up Branch Protection

Go to **Settings** → **Branches** → **Add rule**:

### Main Branch Protection
Branch name pattern: `main`

#### Settings:
- ✅ **Require a pull request before merging**
  - Required approvals: **2**
  - ✅ Dismiss stale PR approvals when new commits are pushed
  - ✅ Require review from code owners
  - ✅ Restrict reviews to users with write access

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - **Required status checks** (add after first CI run):
    - `Code Quality`
    - `Unit Tests (3.10)`
    - `Unit Tests (3.11)`
    - `Unit Tests (3.12)`
    - `Integration Tests`
    - `Security Scan`

- ✅ **Require conversation resolution before merging**
- ✅ **Require signed commits** (recommended)
- ✅ **Require linear history**
- ✅ **Include administrators**
- ❌ Allow force pushes
- ❌ Allow deletions

### Develop Branch Protection
Create branch first:
```bash
git checkout -b develop
git push -u origin develop
```

Then add protection rule with relaxed settings (see [branch-protection.md](branch-protection.md)).

## 🔑 Step 4: Add Repository Secrets

Go to **Settings** → **Secrets and variables** → **Actions**:

### Required Secrets:
```bash
# Add these secrets for CI/CD to work
DOCKER_USERNAME=your-dockerhub-username
DOCKER_PASSWORD=your-dockerhub-token
CODECOV_TOKEN=your-codecov-token
```

### Optional Secrets:
```bash
# For notifications and deployment
SLACK_WEBHOOK=your-slack-webhook-url
SENTRY_DSN=your-sentry-dsn
STAGING_DEPLOY_KEY=your-staging-deploy-key
```

To add secrets:
1. Click "New repository secret"
2. Enter name and value
3. Click "Add secret"

## 🛠️ Step 5: Configure Code Quality Tools

### Pre-commit Hooks
Install and set up pre-commit:
```bash
# Install pre-commit
pip install pre-commit

# Install the git hook scripts
pre-commit install

# Optional: run against all files
pre-commit run --all-files
```

### Local Development Setup
```bash
# Install development dependencies
pip install -r requirements-dev.txt

# Run code quality checks manually
black goreal/ tests/ scripts/
flake8 goreal/ tests/ scripts/
mypy goreal/
isort goreal/ tests/ scripts/
```

## 👥 Step 6: Set Up Team Permissions

Go to **Settings** → **Manage access**:

### Team Structure (if using GitHub Teams):
- **@goreal/admin**: Admin access
- **@goreal/maintainers**: Maintain access
- **@goreal/developers**: Write access
- **@goreal/contributors**: Triage access

### Individual Collaborators:
Add collaborators with appropriate permission levels:
- **Admin**: Full access
- **Maintain**: Manage settings, no admin access
- **Write**: Push to repository, create releases
- **Triage**: Manage issues and PRs, no code push
- **Read**: View and clone repository

## 🧪 Step 7: Test CI/CD Pipeline

### Trigger First CI Run
```bash
# Make a small change to trigger CI
echo "# GoREAL Project - CI/CD Test" >> CI_TEST.md
git add CI_TEST.md
git commit -m "ci: trigger initial CI/CD pipeline test"
git push origin main
```

### Monitor Pipeline
1. Go to **Actions** tab
2. Watch the "CI/CD Pipeline" workflow
3. Ensure all jobs complete successfully
4. Fix any issues that arise

### Common First-Run Issues:
- **Missing secrets**: Add Docker Hub credentials
- **Branch protection conflicts**: Adjust required status checks
- **Test failures**: Ensure database is properly configured

## 📊 Step 8: Set Up External Integrations

### Codecov (Code Coverage)
1. Go to https://codecov.io/
2. Sign up with GitHub
3. Add your repository
4. Copy the token to GitHub Secrets as `CODECOV_TOKEN`

### Docker Hub (Container Registry)
1. Create Docker Hub account
2. Create access token
3. Add credentials to GitHub Secrets

### Optional Integrations:
- **Sentry**: Error monitoring
- **Dependabot**: Dependency updates
- **CodeQL**: Security analysis

## 🏷️ Step 9: Create Initial Release

### Create First Release
```bash
# Tag the initial version
git tag -a v1.0.0 -m "GoREAL v1.0.0 - Initial Release

🎮 Complete Roblox-integrated challenge management system
✨ Features: API, Dashboard, Database, Docker, CI/CD
🚀 Ready for production deployment"

# Push tag
git push origin v1.0.0
```

This will trigger the release workflow and create a GitHub release.

## 📋 Step 10: Verification Checklist

After setup, verify everything works:

### Repository Health
- [ ] All GitHub Actions workflows pass
- [ ] Branch protection rules are active
- [ ] Code quality checks pass
- [ ] Docker images build successfully
- [ ] Tests have good coverage (>80%)

### Development Workflow
- [ ] Pre-commit hooks work locally
- [ ] PRs require proper reviews
- [ ] Status checks block merging when failing
- [ ] Documentation builds correctly

### Security
- [ ] Secrets are properly configured
- [ ] Dependencies are scanned for vulnerabilities
- [ ] Code scanning is active
- [ ] No sensitive data in repository

## 🎯 Next Steps

### For Contributors:
1. Read [CONTRIBUTING.md](../docs/CONTRIBUTING.md)
2. Check out [DEVELOPMENT.md](../docs/DEVELOPMENT.md)
3. Join project discussions
4. Start with "good first issue" labels

### For Maintainers:
1. Set up monitoring and alerting
2. Configure deployment pipelines
3. Create project roadmap
4. Set up documentation site

## 🆘 Troubleshooting

### Common Issues:

**CI failing on first run:**
- Check that all secrets are added correctly
- Verify Docker Hub credentials
- Ensure branch protection doesn't block admin merges initially

**Pre-commit hooks failing:**
```bash
# Reset and reinstall
pre-commit clean
pre-commit install
pre-commit run --all-files
```

**Permission denied on protected branch:**
- Temporarily disable "Include administrators" 
- Make necessary fixes
- Re-enable protection

**Docker build failures:**
- Check Dockerfile syntax
- Verify all dependencies in requirements.txt
- Test build locally first

### Getting Help:
- Check [Issues](https://github.com/your-username/goreal-project/issues)
- Start a [Discussion](https://github.com/your-username/goreal-project/discussions)
- Review [Documentation](../docs/)

---

## 🎉 Success!

Your GoREAL repository is now fully configured with:
- ✅ Professional CI/CD pipeline
- ✅ Automated code quality enforcement  
- ✅ Comprehensive testing framework
- ✅ Security scanning and monitoring
- ✅ Professional collaboration features
- ✅ Production-ready deployment setup

The repository is ready for team collaboration and production use! 🚀

---

**Repository URL**: https://github.com/your-username/goreal-project
**Docker Images**: https://hub.docker.com/r/your-username/goreal
**Coverage Reports**: https://codecov.io/gh/your-username/goreal-project