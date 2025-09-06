# Branch Protection Rules Configuration

This document outlines the recommended branch protection rules for the GoREAL repository.

## Main Branch Protection

Configure the following settings for the `main` branch:

### General Settings
- ✅ **Restrict pushes that create files larger than 100MB**
- ✅ **Restrict pushes that contain private email addresses**

### Branch Protection Rules for `main`

#### Protect matching branches
- Branch name pattern: `main`

#### Settings:
- ✅ **Require a pull request before merging**
  - ✅ Require approvals: **2**
  - ✅ Dismiss stale PR approvals when new commits are pushed
  - ✅ Require review from code owners
  - ✅ Restrict reviews to users with write access
  - ✅ Allow specified actors to bypass required pull requests: *Repository admins only*

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - **Required status checks:**
    - `Code Quality`
    - `Unit Tests (3.10)`
    - `Unit Tests (3.11)` 
    - `Unit Tests (3.12)`
    - `Integration Tests`
    - `Security Scan`

- ✅ **Require conversation resolution before merging**

- ✅ **Require signed commits**

- ✅ **Require linear history**

- ✅ **Include administrators**

- ❌ Allow force pushes (disabled for security)

- ❌ Allow deletions (disabled for safety)

## Develop Branch Protection

Configure the following settings for the `develop` branch:

### Branch Protection Rules for `develop`

#### Settings:
- ✅ **Require a pull request before merging**
  - ✅ Require approvals: **1**
  - ✅ Dismiss stale PR approvals when new commits are pushed
  - ❌ Require review from code owners (more flexible for development)

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - **Required status checks:**
    - `Code Quality`
    - `Unit Tests (3.11)` (at least one Python version)
    - `Integration Tests`

- ✅ **Require conversation resolution before merging**

- ❌ Require signed commits (optional for development)

- ❌ Require linear history (more flexible)

- ✅ **Include administrators**

- ❌ Allow force pushes (disabled)

- ❌ Allow deletions (disabled)

## Feature Branch Rules

For feature branches (`feature/*`, `bugfix/*`, `hotfix/*`):

- No branch protection rules required
- Developers can work freely
- Must create PR to merge into `develop`

## Release Branch Rules

For release branches (`release/*`):

### Settings:
- ✅ **Require a pull request before merging**
  - ✅ Require approvals: **2**
  - ✅ Require review from code owners

- ✅ **Require status checks to pass before merging**
  - All CI checks must pass

- ✅ **Require conversation resolution before merging**

- ✅ **Include administrators**

## Repository Settings

### General Repository Settings:
- ✅ **Default branch:** `main`
- ✅ **Allow merge commits**
- ✅ **Allow squash merging** (recommended for feature branches)
- ✅ **Allow rebase merging**
- ✅ **Automatically delete head branches** (clean up after PR merge)

### Merge Button Settings:
- ✅ **Allow merge commits**
- ✅ **Allow squash merging** ← Recommended default
- ✅ **Allow rebase merging**

### Pull Request Settings:
- ✅ **Allow auto-merge**
- ✅ **Automatically delete head branches**
- ✅ **Use branch protection rules to restrict pushes**

## Code Owners

Create a `.github/CODEOWNERS` file with the following structure:

```
# Global owners
* @repo-admin @lead-developer

# API code
goreal/api/ @api-team @backend-team
goreal/core/ @api-team @backend-team

# Dashboard code  
goreal/dashboard/ @frontend-team @ui-team

# Database and migrations
database/ @database-team @backend-team
goreal/core/database.py @database-team

# Documentation
docs/ @documentation-team
*.md @documentation-team

# CI/CD and DevOps
.github/ @devops-team @repo-admin
Dockerfile* @devops-team
docker-compose* @devops-team
scripts/ @devops-team

# Configuration
goreal/config/ @devops-team @backend-team
requirements*.txt @devops-team @backend-team
```

## Secrets Configuration

Add the following secrets to the repository:

### Required Secrets:
- `DOCKER_USERNAME` - Docker Hub username for image publishing
- `DOCKER_PASSWORD` - Docker Hub password/token
- `CODECOV_TOKEN` - Codecov token for coverage reporting

### Optional Secrets:
- `SLACK_WEBHOOK` - For deployment notifications
- `SENTRY_DSN` - For error monitoring
- `STAGING_DEPLOY_KEY` - For staging deployment

## Implementation Steps

1. **Create Repository:**
   ```bash
   # Create new repository on GitHub
   # Clone locally
   git clone https://github.com/your-username/goreal-project.git
   cd goreal-project
   ```

2. **Set up branches:**
   ```bash
   git checkout -b develop
   git push -u origin develop
   ```

3. **Configure branch protection via GitHub UI:**
   - Go to Settings → Branches
   - Add protection rules for `main` and `develop`
   - Configure as specified above

4. **Add team permissions:**
   - Go to Settings → Manage access
   - Add teams with appropriate permissions
   - Configure CODEOWNERS file

5. **Configure repository settings:**
   - Go to Settings → General
   - Configure merge settings as specified
   - Set default branch to `main`

6. **Add secrets:**
   - Go to Settings → Secrets and variables → Actions
   - Add required secrets for CI/CD

## Testing Branch Protection

After setup, test the configuration:

1. **Test PR requirements:**
   - Create a feature branch
   - Make changes and create PR to `main`
   - Verify all checks are required
   - Verify approval requirements

2. **Test status checks:**
   - Push changes that should fail CI
   - Verify PR cannot be merged until fixed

3. **Test code owners:**
   - Make changes to protected files
   - Verify appropriate reviewers are requested

This configuration ensures code quality, security, and proper review processes while maintaining development velocity.