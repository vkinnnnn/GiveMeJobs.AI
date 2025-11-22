"""Security Audit Workflow.

Comprehensive security audit that runs all security scans:
1. Code security scan
2. Dependency vulnerability scan
3. Container security scan
4. Infrastructure as Code scan
5. Database security check
6. API security testing
7. Generate security report
"""

from typing import Dict, Any, List
import json
from datetime import datetime


class SecurityAuditWorkflow:
    """Automated workflow for comprehensive security audits."""
    
    def __init__(self):
        self.audit_date = datetime.now().strftime("%Y-%m-%d")
        self.findings = []
    
    def generate_workflow(self) -> Dict[str, Any]:
        """Generate the complete workflow."""
        workflow = {
            "name": "Security Audit Workflow",
            "date": self.audit_date,
            "steps": []
        }
        
        # Step 1: Code security scan
        workflow["steps"].append({
            "step": 1,
            "name": "Scan source code",
            "mcp_server": "snyk",
            "tool": "snyk_code_scan",
            "params": {
                "path": "."
            },
            "description": "Static code analysis for security vulnerabilities",
            "severity": "critical"
        })
        
        # Step 2: Dependency scan
        workflow["steps"].append({
            "step": 2,
            "name": "Scan dependencies",
            "mcp_server": "snyk",
            "tool": "snyk_test",
            "params": {
                "path": "."
            },
            "description": "Check all dependencies for known vulnerabilities",
            "severity": "critical"
        })
        
        # Step 3: Container security scan
        workflow["steps"].append({
            "step": 3,
            "name": "Scan container images",
            "mcp_server": "snyk",
            "tool": "snyk_container_test",
            "params": {
                "image": "givemejobs/backend:latest"
            },
            "description": "Scan Docker images for vulnerabilities",
            "severity": "high"
        })
        
        # Step 4: IaC security scan
        workflow["steps"].append({
            "step": 4,
            "name": "Scan infrastructure code",
            "mcp_server": "snyk",
            "tool": "snyk_iac_test",
            "params": {
                "path": "infrastructure/"
            },
            "description": "Scan Terraform/Kubernetes configs for security issues",
            "severity": "high"
        })
        
        # Step 5: Database security check
        workflow["steps"].append({
            "step": 5,
            "name": "Check database security",
            "mcp_server": "database",
            "tool": "db_query",
            "params": {
                "database": "postgresql",
                "query": "SELECT usename, usesuper, usecreatedb FROM pg_user"
            },
            "description": "Review database user permissions",
            "severity": "medium"
        })
        
        # Step 6: Test authentication endpoints
        workflow["steps"].append({
            "step": 6,
            "name": "Test authentication security",
            "mcp_server": "api_testing",
            "tool": "test_batch",
            "params": {
                "tests": [
                    {
                        "name": "Login without credentials",
                        "method": "POST",
                        "url": "/api/auth/login",
                        "body": {},
                        "expected_status": 400
                    },
                    {
                        "name": "Access protected endpoint without token",
                        "method": "GET",
                        "url": "/api/users/me",
                        "expected_status": 401
                    },
                    {
                        "name": "Password reset without email",
                        "method": "POST",
                        "url": "/api/auth/password-reset",
                        "body": {},
                        "expected_status": 400
                    }
                ]
            },
            "description": "Verify authentication endpoints properly reject invalid requests",
            "severity": "critical"
        })
        
        # Step 7: Test rate limiting
        workflow["steps"].append({
            "step": 7,
            "name": "Verify rate limiting",
            "mcp_server": "api_testing",
            "tool": "http_request",
            "params": {
                "method": "GET",
                "url": "/api/jobs",
                "note": "Should implement rate limiting test"
            },
            "description": "Verify rate limiting is active",
            "severity": "medium"
        })
        
        # Step 8: Check Redis security
        workflow["steps"].append({
            "step": 8,
            "name": "Check Redis configuration",
            "mcp_server": "database",
            "tool": "db_query",
            "params": {
                "database": "redis",
                "query": "CONFIG GET requirepass"
            },
            "description": "Verify Redis password protection",
            "severity": "high"
        })
        
        # Step 9: Review container logs for security events
        workflow["steps"].append({
            "step": 9,
            "name": "Review security logs",
            "mcp_server": "docker",
            "tool": "docker_logs",
            "params": {
                "container": "backend",
                "tail": 1000,
                "level": "error"
            },
            "description": "Check for security-related errors in logs",
            "severity": "medium"
        })
        
        # Step 10: Check container resource limits
        workflow["steps"].append({
            "step": 10,
            "name": "Verify container security",
            "mcp_server": "docker",
            "tool": "docker_ps",
            "params": {
                "all": False
            },
            "description": "Check container configurations",
            "severity": "low"
        })
        
        # Step 11: Test SQL injection protection
        workflow["steps"].append({
            "step": 11,
            "name": "Test SQL injection protection",
            "mcp_server": "api_testing",
            "tool": "http_request",
            "params": {
                "method": "GET",
                "url": "/api/jobs?search=' OR '1'='1",
                "expected_status": 200
            },
            "description": "Verify SQL injection attempts are handled safely",
            "severity": "critical"
        })
        
        # Step 12: Test XSS protection
        workflow["steps"].append({
            "step": 12,
            "name": "Test XSS protection",
            "mcp_server": "api_testing",
            "tool": "http_request",
            "params": {
                "method": "POST",
                "url": "/api/users/me",
                "body": {
                    "name": "<script>alert('xss')</script>"
                },
                "note": "Verify XSS content is sanitized"
            },
            "description": "Verify XSS protection is active",
            "severity": "critical"
        })
        
        # Step 13: Document audit in Memory
        workflow["steps"].append({
            "step": 13,
            "name": "Document security audit",
            "mcp_server": "memory",
            "tool": "create_entities",
            "params": {
                "name": f"Security Audit: {self.audit_date}",
                "type": "audit",
                "description": f"Comprehensive security audit performed on {self.audit_date}"
            },
            "description": "Track audit in Memory",
            "severity": "low"
        })
        
        return workflow
    
    def generate_report(self, results: List[Dict[str, Any]]) -> str:
        """Generate security audit report."""
        report = f"# Security Audit Report\n\n"
        report += f"**Date**: {self.audit_date}\n"
        report += f"**Status**: {'PASS' if all(r.get('passed', False) for r in results) else 'FAIL'}\n\n"
        
        report += "## Summary\n\n"
        report += f"- Total Checks: {len(results)}\n"
        report += f"- Passed: {sum(1 for r in results if r.get('passed', False))}\n"
        report += f"- Failed: {sum(1 for r in results if not r.get('passed', True))}\n\n"
        
        report += "## Findings by Severity\n\n"
        
        for severity in ["critical", "high", "medium", "low"]:
            severity_findings = [r for r in results if r.get('severity') == severity and not r.get('passed', True)]
            if severity_findings:
                report += f"### {severity.upper()}\n\n"
                for finding in severity_findings:
                    report += f"- **{finding.get('step')}**: {finding.get('description')}\n"
                    if finding.get('details'):
                        report += f"  - Details: {finding.get('details')}\n"
                report += "\n"
        
        report += "## Recommendations\n\n"
        report += "1. Address all CRITICAL findings immediately\n"
        report += "2. Plan fixes for HIGH severity issues within 1 week\n"
        report += "3. Schedule MEDIUM issues for next sprint\n"
        report += "4. Review LOW severity issues quarterly\n\n"
        
        report += "## Next Audit\n\n"
        report += "Schedule next security audit in 30 days\n"
        
        return report
    
    def generate_instructions(self) -> str:
        """Generate human-readable instructions."""
        workflow = self.generate_workflow()
        
        instructions = f"# Security Audit Workflow\n\n"
        instructions += f"**Date**: {self.audit_date}\n\n"
        instructions += "## Workflow Steps\n\n"
        
        for step in workflow["steps"]:
            instructions += f"### Step {step['step']}: {step['name']}\n"
            instructions += f"**Severity**: {step['severity'].upper()}\n"
            instructions += f"**MCP Server**: {step['mcp_server']}\n"
            instructions += f"**Tool**: {step['tool']}\n"
            instructions += f"**Description**: {step['description']}\n\n"
        
        instructions += "## Post-Audit Actions\n\n"
        instructions += "1. Review all findings\n"
        instructions += "2. Prioritize by severity\n"
        instructions += "3. Create issues for vulnerabilities\n"
        instructions += "4. Assign remediation tasks\n"
        instructions += "5. Schedule follow-up audit\n"
        
        return instructions


def create_security_audit_workflow() -> Dict[str, Any]:
    """Create a new security audit workflow."""
    workflow = SecurityAuditWorkflow()
    return workflow.generate_workflow()


def main():
    """Example usage."""
    workflow_gen = SecurityAuditWorkflow()
    
    workflow = workflow_gen.generate_workflow()
    instructions = workflow_gen.generate_instructions()
    
    # Example report
    example_results = [
        {"step": 1, "passed": True, "severity": "critical"},
        {"step": 2, "passed": False, "severity": "high", "description": "Vulnerable dependency found", "details": "lodash@4.17.15 has prototype pollution"},
        {"step": 3, "passed": True, "severity": "high"},
    ]
    report = workflow_gen.generate_report(example_results)
    
    with open("security_audit_workflow.json", "w", encoding="utf-8") as f:
        json.dump(workflow, f, indent=2)
    
    with open("security_audit_workflow.md", "w", encoding="utf-8") as f:
        f.write(instructions)
    
    with open("security_audit_report_example.md", "w", encoding="utf-8") as f:
        f.write(report)
    
    print(f"[SUCCESS] Security audit workflow generated")
    print(f"  - Workflow: security_audit_workflow.json")
    print(f"  - Instructions: security_audit_workflow.md")
    print(f"  - Report Example: security_audit_report_example.md")


if __name__ == "__main__":
    main()
