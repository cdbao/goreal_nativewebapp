# 🤖 Automated CI/CD Debugging System

## Overview

This system provides self-healing capabilities for the GoREAL project's CI/CD pipeline by automatically detecting failures, analyzing root causes, generating fixes, and applying them when safe to do so.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CI/CD Fails   │───▶│  Debug Trigger   │───▶│   Auto-Fix WF   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                    ┌─────────────────┐    ┌──────────────────┐
                    │  Apply & Test   │◀───│  Generate Fixes  │
                    │     Fixes       │    │    (AI Agent)    │
                    └─────────────────┘    └──────────────────┘
                              │                        ▲
                              ▼                        │
                    ┌─────────────────┐    ┌──────────────────┐
                    │ Commit Success  │    │   Analyze Logs   │
                    │  OR Create      │    │  (Log Retriever) │
                    │     Issue       │    └──────────────────┘
                    └─────────────────┘
```

## Components

### 1. Log Retriever (`log-retriever.js`)
- **Purpose**: Fetches failed workflow logs from GitHub API
- **Features**:
  - Authenticates with GitHub API
  - Identifies failed workflow runs
  - Downloads complete log files
  - Parses logs for error patterns
  - Extracts file references and line numbers

**Usage**:
```bash
GITHUB_TOKEN=your_token node log-retriever.js ci.yml
```

### 2. AI Debugging Agent (`ai-debugger.js`)
- **Purpose**: Analyzes failures and generates code fixes
- **Capabilities**:
  - Root cause analysis
  - Pattern recognition for common failures
  - Code fix generation
  - Confidence scoring

**Supported Error Types**:
- **Python**: flake8, black, pytest, import errors, attribute errors
- **JavaScript/Node**: npm errors, compilation issues, missing modules
- **Security**: vulnerability alerts, audit failures
- **Generic**: configurable pattern matching

**Usage**:
```bash
node ai-debugger.js
```

### 3. Auto-Fix Workflow (`.github/workflows/auto-fix.yml`)
- **Purpose**: Orchestrates the complete debugging process
- **Stages**:
  1. **Detection**: Identify and analyze failures
  2. **Generation**: Create AI-powered fixes
  3. **Application**: Apply fixes in isolated environment
  4. **Testing**: Verify fixes work correctly
  5. **Integration**: Commit successful fixes or create issues

### 4. Debug Trigger (`.github/workflows/debug-trigger.yml`)
- **Purpose**: Automatically triggers debugging on CI failures
- **Triggers**:
  - Immediate: When CI/CD workflows fail
  - Scheduled: Periodic checks for unaddressed failures

## Configuration

### Required Secrets
- `GITHUB_TOKEN`: Repository access token with appropriate permissions

### Permissions Required
```yaml
permissions:
  contents: write        # Read/write repository files
  actions: write         # Trigger workflows
  issues: write          # Create issues for manual review
  pull-requests: write   # Create PRs (future feature)
  security-events: write # Upload security scan results
```

### Environment Variables
- `GITHUB_TOKEN`: GitHub authentication token
- `GITHUB_REPOSITORY_OWNER`: Repository owner (auto-set in Actions)
- `GITHUB_REPOSITORY_NAME`: Repository name (auto-set in Actions)

## Usage

### Manual Trigger
```bash
# Trigger debugging workflow manually
gh workflow run auto-fix.yml
```

### Automatic Operation
The system runs automatically:
- **Immediately**: When CI/CD workflows fail
- **Scheduled**: Every 30 minutes during business hours
- **On-demand**: Via workflow dispatch

### Testing the System
```bash
# Install dependencies
cd .github/debugging-system
npm install

# Test log retrieval
GITHUB_TOKEN=your_token npm run analyze-failures

# Test fix generation
npm run generate-fixes

# Full debugging cycle
npm run debug-pipeline
```

## Fix Strategies

### Python Fixes
- **Flake8 Errors**: Automatic code style corrections
- **Black Formatting**: Auto-format with black
- **Import Errors**: Add missing dependencies
- **Test Failures**: Basic assertion fixes (limited)

### JavaScript/Node Fixes
- **Missing Modules**: Auto-install dependencies
- **Peer Dependencies**: Install missing peer deps
- **Configuration**: Fix common config issues

### Security Fixes
- **Vulnerability Alerts**: Run `npm audit fix`
- **Dependency Updates**: Suggest updates for known issues

## Confidence Scoring

Fixes are assigned confidence scores (0.0 - 1.0):
- **> 0.8**: High confidence, likely to auto-apply
- **0.6 - 0.8**: Medium confidence, apply with testing
- **< 0.6**: Low confidence, create issue for review

## Safety Mechanisms

1. **Isolated Testing**: Fixes are tested before committing
2. **Confidence Thresholds**: Low-confidence fixes trigger manual review
3. **Rollback Capability**: Failed fixes don't break main branch
4. **Human Oversight**: Complex issues create GitHub issues
5. **Rate Limiting**: Prevents excessive automation

## Monitoring and Alerts

### Success Metrics
- Successful automatic fixes applied
- CI/CD uptime improvement
- Time to resolution reduction

### Failure Handling
- Low-confidence fixes → GitHub issues
- Failed fix application → Detailed error reports
- System failures → Fallback to manual process

## File Outputs

### Analysis Files
- `latest-failure-analysis.json`: Parsed failure information
- `proposed-fixes.json`: AI-generated fix proposals

### Artifacts
- **failure-analysis**: Uploaded to GitHub Actions artifacts
- **proposed-fixes**: Available for manual review
- **trivy-sarif-results**: Security scan results

## Extensibility

### Adding New Error Patterns
1. Update `parseLogForErrors()` in `log-retriever.js`
2. Add fix strategy in `ai-debugger.js`
3. Test with representative failure logs

### Custom Fix Strategies
```javascript
// Example: Add new fix strategy
this.fixStrategies['my_error_type'] = async (error, analysisResult) => {
  // Analyze error
  // Generate fix
  return {
    filePath: 'path/to/file',
    fix: 'corrected code',
    description: 'Fix description',
    confidence: 0.8
  };
};
```

### Integration with External Tools
- **Static Analysis**: SonarQube, CodeClimate integration
- **Testing**: Custom test suite integration
- **Deployment**: Auto-deployment after successful fixes

## Troubleshooting

### Common Issues
1. **Permission Denied**: Check GITHUB_TOKEN permissions
2. **No Failures Found**: Ensure workflows are actually failing
3. **Low Fix Confidence**: Review and improve fix strategies
4. **API Rate Limits**: Implement backoff strategies

### Debug Mode
Set environment variables for verbose logging:
```bash
export DEBUG_AUTOMATED_DEBUGGING=true
export GITHUB_API_DEBUG=true
```

### Manual Intervention
When automation fails:
1. Check created GitHub issues
2. Review artifact files
3. Manually apply suggested fixes
4. Update automation rules

## Security Considerations

1. **Token Security**: Use minimal required permissions
2. **Code Injection**: Validate all generated fixes
3. **Branch Protection**: Respect branch protection rules
4. **Audit Trail**: All actions are logged and traceable

## Future Enhancements

- **Machine Learning**: Learn from fix success/failure patterns
- **Multi-Repository**: Support for monorepo scenarios
- **Custom Integrations**: Slack/Teams notifications
- **Advanced Analytics**: Failure pattern analysis
- **Proactive Fixes**: Prevent issues before they cause failures

## Contributing

To improve the automated debugging system:
1. Add new error patterns and fix strategies
2. Improve confidence scoring algorithms
3. Enhance security and safety mechanisms
4. Add support for additional languages/frameworks

---

**Maintained by**: GoREAL Development Team  
**Last Updated**: 2025-01-16  
**Version**: 1.0.0