# Pull Request

## Description

Please include a summary of the changes and the related issue. Please also include relevant motivation and context.

Fixes # (issue)

## Type of Change

Please delete options that are not relevant.

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🔧 Configuration change
- [ ] 🧹 Code cleanup/refactoring
- [ ] ⚡ Performance improvement
- [ ] 🔒 Security improvement

## Components Changed

Please check all components that were modified:

- [ ] API Server (`goreal/api/`)
- [ ] Dashboard (`goreal/dashboard/`)
- [ ] Core Logic (`goreal/core/`)
- [ ] Database (`goreal/core/database.py`, `database/`)
- [ ] Configuration (`goreal/config/`)
- [ ] Tests (`tests/`)
- [ ] Documentation (`docs/`, `README.md`)
- [ ] CI/CD (`.github/workflows/`)
- [ ] Docker (`Dockerfile`, `docker-compose.yml`)
- [ ] Scripts (`scripts/`)

## Testing

Please describe the tests that you ran to verify your changes:

- [ ] Unit tests pass (`pytest tests/`)
- [ ] Integration tests pass (`pytest tests/integration/`)
- [ ] API tests pass (`scripts/test-api.sh`)
- [ ] Code quality checks pass (`flake8`, `black`, `mypy`)
- [ ] Manual testing completed

### Test Configuration
- Python version:
- Database: PostgreSQL/SQLite
- Environment: Docker/Local

## Checklist

Please check all boxes that apply:

### Code Quality
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes

### Security
- [ ] I have checked for security vulnerabilities
- [ ] No sensitive information (passwords, keys, tokens) is exposed
- [ ] Input validation is properly implemented
- [ ] Authentication/authorization is correctly handled

### Database Changes
- [ ] Database schema changes are backwards compatible
- [ ] Migration scripts are provided (if applicable)
- [ ] Sample data is updated (if applicable)

### API Changes
- [ ] API changes are backwards compatible
- [ ] API documentation is updated
- [ ] OpenAPI/Swagger spec is updated (if applicable)
- [ ] Version compatibility is maintained

### Frontend Changes
- [ ] UI/UX changes are consistent with design guidelines
- [ ] Responsive design is maintained
- [ ] Accessibility standards are met
- [ ] Cross-browser compatibility is verified

## Screenshots

If applicable, add screenshots to help explain your changes:

| Before | After |
|--------|-------|
| (screenshot) | (screenshot) |

## Performance Impact

Please describe any performance implications:

- [ ] No performance impact
- [ ] Performance improved
- [ ] Performance may be impacted (please explain)
- [ ] Performance testing completed

## Breaking Changes

If this is a breaking change, please describe:

1. What breaks:
2. How to migrate:
3. Deprecation timeline (if applicable):

## Additional Notes

Add any other notes about the implementation, decisions made, or future considerations:

## Related Issues

- Closes #
- Related to #
- Depends on #

---

## For Reviewers

### Review Checklist
- [ ] Code quality and style
- [ ] Test coverage and quality
- [ ] Documentation completeness
- [ ] Security considerations
- [ ] Performance implications
- [ ] API compatibility
- [ ] Database schema compatibility

### Deployment Notes
- [ ] Safe to deploy to staging
- [ ] Safe to deploy to production
- [ ] Requires configuration changes
- [ ] Requires database migrations
- [ ] Requires service restarts

Thank you for your contribution! 🎉