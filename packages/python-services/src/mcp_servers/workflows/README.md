## Workflow Automation for GiveMeJobs Platform

This directory contains automated workflows that integrate multiple MCP servers to streamline common development tasks.

## Available Workflows

### 1. Feature Development Workflow (`feature_development.py`)
Automates the process of starting a new feature.

**Steps**:
1. Check Git status
2. Create feature branch
3. Create Memory entity for feature tracking
4. Link feature to platform in knowledge graph
5. Run initial security scan
6. Verify development environment (Docker containers)
7. Test database connection

**Usage**:
```python
from workflows.feature_development import FeatureDevelopmentWorkflow

workflow = FeatureDevelopmentWorkflow(
    feature_name="Advanced Resume Parser",
    description="AI-powered resume parser with skill extraction"
)

# Generate workflow steps
workflow_steps = workflow.generate_workflow()

# Generate human-readable instructions
instructions = workflow.generate_instructions()
```

**When to Use**:
- Starting development of a new feature
- Need to track feature in Memory for AI context
- Want to ensure environment is ready

**Expected Time**: 5-10 minutes

---

### 2. Bug Fix Workflow (`bug_fix.py`)
Automates the bug fix process from analysis to verification.

**Steps**:
1. Analyze GitHub issue
2. Search Memory for related context
3. Test affected endpoint to reproduce bug
4. Check database state if relevant
5. Create bug fix branch
6. Run security validation
7. Verify fix with endpoint test
8. Document fix in Memory

**Usage**:
```python
from workflows.bug_fix import BugFixWorkflow

workflow = BugFixWorkflow(
    issue_number=123,
    issue_title="Login endpoint returns 500 for invalid credentials"
)

workflow_steps = workflow.generate_workflow()
instructions = workflow.generate_instructions()
```

**When to Use**:
- Fixing a reported bug from GitHub issues
- Need to reproduce and verify the bug
- Want to document the fix for future reference

**Expected Time**: 15-30 minutes

---

### 3. Deployment Workflow (`deployment.py`)
Comprehensive deployment automation with verification.

**Steps**:
1. Verify clean working tree
2. Run code security scan
3. Scan dependencies for vulnerabilities
4. Scan container images
5. List running containers
6. Run database migrations
7. Start containers in target environment
8. Verify containers started successfully
9. Check deployment logs for errors
10. Verify API health
11. Run smoke tests
12. Monitor container resources
13. Document deployment in Memory

**Usage**:
```python
from workflows.deployment import DeploymentWorkflow

workflow = DeploymentWorkflow(
    environment="production",
    version="1.2.0"
)

workflow_steps = workflow.generate_workflow()
instructions = workflow.generate_instructions()
```

**When to Use**:
- Deploying to staging or production
- Need comprehensive pre-deployment checks
- Want automated smoke testing after deployment

**Expected Time**: 20-40 minutes

**Rollback Procedure**:
If deployment fails:
1. Stop new containers
2. Rollback database migrations  
3. Start previous version
4. Verify rollback successful
5. Investigate failure

---

### 4. Security Audit Workflow (`security_audit.py`)
Comprehensive security audit across all layers.

**Steps**:
1. Scan source code (static analysis)
2. Scan dependencies for vulnerabilities
3. Scan container images
4. Scan infrastructure as code (Terraform/K8s)
5. Check database security (user permissions)
6. Test authentication endpoint security
7. Verify rate limiting
8. Check Redis security configuration
9. Review container security logs
10. Verify container security configurations
11. Test SQL injection protection
12. Test XSS protection
13. Document audit in Memory

**Usage**:
```python
from workflows.security_audit import SecurityAuditWorkflow

workflow = SecurityAuditWorkflow()

workflow_steps = workflow.generate_workflow()
instructions = workflow.generate_instructions()

# Generate report after execution
report = workflow.generate_report(results)
```

**When to Use**:
- Regular security audits (monthly recommended)
- Before major releases
- After security incident
- Compliance requirements

**Expected Time**: 30-60 minutes

**Severity Levels**:
- **CRITICAL**: Address immediately
- **HIGH**: Fix within 1 week
- **MEDIUM**: Schedule for next sprint
- **LOW**: Review quarterly

---

## MCP Server Integration

These workflows integrate the following MCP servers:

| MCP Server | Purpose | Workflows Used |
|------------|---------|----------------|
| **Git** | Version control operations | Feature, Bug Fix, Deployment |
| **Memory** | Knowledge graph and context | All workflows |
| **GitHub** | Issue management | Bug Fix |
| **Snyk** | Security scanning | Deployment, Security Audit |
| **Docker** | Container management | All workflows |
| **Database** | Database operations | Bug Fix, Deployment, Security Audit |
| **API Testing** | Endpoint testing | Bug Fix, Deployment, Security Audit |

---

## Workflow Execution

### In Kiro IDE

The workflows are designed to be executed within Kiro IDE, which will:
1. Parse the workflow steps
2. Call appropriate MCP servers
3. Handle tool execution
4. Aggregate results
5. Present findings to developer

### Manual Execution

You can also generate workflow instructions and execute them manually:

```bash
cd packages/python-services/src/mcp_servers/workflows

# Generate feature workflow
python feature_development.py

# Generate bug fix workflow  
python bug_fix.py

# Generate deployment workflow
python deployment.py

# Generate security audit workflow
python security_audit.py
```

This generates JSON workflows and Markdown instructions that can be executed step-by-step.

---

## Customization

### Creating Custom Workflows

1. **Create new workflow file**:
```python
from typing import Dict, Any
import json

class MyCustomWorkflow:
    def __init__(self, param1: str):
        self.param1 = param1
    
    def generate_workflow(self) -> Dict[str, Any]:
        workflow = {
            "name": "My Custom Workflow",
            "steps": []
        }
        
        # Add steps
        workflow["steps"].append({
            "step": 1,
            "name": "Step name",
            "mcp_server": "server_name",
            "tool": "tool_name",
            "params": {},
            "description": "What this step does"
        })
        
        return workflow
```

2. **Add workflow steps**: Each step should specify:
   - `step`: Step number
   - `name`: Descriptive name
   - `mcp_server`: MCP server to use
   - `tool`: Tool to execute
   - `params`: Tool parameters
   - `description`: What the step accomplishes

3. **Generate instructions**: Create human-readable documentation

### Modifying Existing Workflows

Edit the workflow Python files to:
- Add/remove steps
- Change parameters
- Modify tool calls
- Customize for your environment

---

## Best Practices

### 1. Run Workflows Regularly
- **Feature Workflow**: Every new feature
- **Bug Fix Workflow**: Every bug fix
- **Deployment Workflow**: Every deployment
- **Security Audit**: Monthly or before releases

### 2. Review Results
- Check each step for failures
- Address critical findings first
- Document learnings in Memory

### 3. Customize for Your Team
- Adjust parameters for your environment
- Add team-specific steps
- Modify severity thresholds

### 4. Automate CI/CD Integration
- Run workflows in CI/CD pipeline
- Fail builds on critical findings
- Generate reports automatically

---

## Troubleshooting

### Workflow Fails at Security Scan
**Issue**: Snyk scan fails
**Solution**: 
1. Check Snyk API key is configured
2. Verify network connectivity
3. Update Snyk CLI: `npm install -g snyk`

### Workflow Fails at Docker Step
**Issue**: Docker commands fail
**Solution**:
1. Check Docker daemon is running
2. Verify DOCKER_HOST environment variable
3. Check container names are correct

### Workflow Fails at Database Step
**Issue**: Database connection fails
**Solution**:
1. Verify database is running
2. Check DATABASE_URL environment variable
3. Test connection manually

### Workflow Fails at API Testing
**Issue**: HTTP requests fail
**Solution**:
1. Check API is running
2. Verify API_BASE_URL is correct
3. Check authentication credentials

---

## Examples

### Example 1: Start New Feature

```bash
# Generate workflow
python feature_development.py

# This creates:
# - feature_workflow_example.json (workflow definition)
# - feature_workflow_example.md (instructions)

# Then execute in Kiro or manually follow the instructions
```

### Example 2: Fix Bug from GitHub Issue

```python
from workflows.bug_fix import BugFixWorkflow

# Create workflow for GitHub issue #456
workflow = BugFixWorkflow(
    issue_number=456,
    issue_title="Application form validation error"
)

# Generate and execute
workflow_steps = workflow.generate_workflow()
# Execute steps in Kiro...
```

### Example 3: Deploy to Production

```python
from workflows.deployment import DeploymentWorkflow

# Create production deployment workflow
workflow = DeploymentWorkflow(
    environment="production",
    version="2.0.0"
)

# Generate workflow
workflow_steps = workflow.generate_workflow()

# Execute each step carefully, monitoring logs
# Rollback if any step fails
```

### Example 4: Monthly Security Audit

```python
from workflows.security_audit import SecurityAuditWorkflow

# Create audit workflow
workflow = SecurityAuditWorkflow()

# Execute audit
workflow_steps = workflow.generate_workflow()
results = []  # Collect results from execution

# Generate report
report = workflow.generate_report(results)

# Share report with team
# Create issues for findings
# Schedule remediation
```

---

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Security Audit
on:
  schedule:
    - cron: '0 0 1 * *'  # Monthly
  
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: pip install -r requirements.txt
      
      - name: Run Security Audit
        run: python packages/python-services/src/mcp_servers/workflows/security_audit.py
      
      - name: Upload Report
        uses: actions/upload-artifact@v2
        with:
          name: security-audit-report
          path: security_audit_report_example.md
```

---

## Future Enhancements

### Planned Features
1. **Parallel execution** of independent steps
2. **Workflow templates** for common patterns
3. **Visual workflow builder** in Kiro UI
4. **Workflow history** tracking in Memory
5. **Slack/Email notifications** on completion
6. **Rollback automation** for failed deployments
7. **Performance benchmarking** workflows
8. **Load testing** automation

### Contribution
To add new workflows or improve existing ones:
1. Create workflow class following the pattern
2. Add comprehensive documentation
3. Include example usage
4. Test thoroughly
5. Submit pull request

---

## Support

### Documentation
- **Workflow Code**: This directory
- **MCP Servers**: `../README.md`
- **Specification**: `.kiro/specs/mcp-servers-enhancement/`

### Getting Help
1. Check workflow documentation
2. Review MCP server logs
3. Test tools individually
4. Consult specification documents

---

**Version**: 1.0.0  
**Last Updated**: November 21, 2025  
**Status**: Production Ready  
**Maintainers**: GiveMeJobs Platform Team
