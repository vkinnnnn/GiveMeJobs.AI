"""Deployment Workflow.

Automates the deployment process:
1. Run security scan
2. Build Docker containers
3. Run database migrations
4. Deploy to staging
5. Verify deployment
"""

from typing import Dict, Any
import json


class DeploymentWorkflow:
    """Automated workflow for deployments."""
    
    def __init__(self, environment: str = "staging", version: str = "latest"):
        self.environment = environment
        self.version = version
    
    def generate_workflow(self) -> Dict[str, Any]:
        """Generate the complete workflow."""
        workflow = {
            "name": "Deployment Workflow",
            "environment": self.environment,
            "version": self.version,
            "steps": []
        }
        
        # Step 1: Check Git status
        workflow["steps"].append({
            "step": 1,
            "name": "Verify clean working tree",
            "mcp_server": "git",
            "tool": "git_status",
            "params": {},
            "description": "Ensure no uncommitted changes before deployment"
        })
        
        # Step 2: Run comprehensive security scan
        workflow["steps"].append({
            "step": 2,
            "name": "Run code security scan",
            "mcp_server": "snyk",
            "tool": "snyk_code_scan",
            "params": {
                "path": "."
            },
            "description": "Scan code for security vulnerabilities"
        })
        
        # Step 3: Scan dependencies
        workflow["steps"].append({
            "step": 3,
            "name": "Scan dependencies",
            "mcp_server": "snyk",
            "tool": "snyk_test",
            "params": {
                "path": "."
            },
            "description": "Check for vulnerable dependencies"
        })
        
        # Step 4: Scan container images
        workflow["steps"].append({
            "step": 4,
            "name": "Scan container images",
            "mcp_server": "snyk",
            "tool": "snyk_container_test",
            "params": {
                "image": f"givemejobs/backend:{self.version}"
            },
            "description": "Scan Docker images for vulnerabilities"
        })
        
        # Step 5: Stop existing containers
        workflow["steps"].append({
            "step": 5,
            "name": "List running containers",
            "mcp_server": "docker",
            "tool": "docker_ps",
            "params": {
                "all": False
            },
            "description": "Check which containers are currently running"
        })
        
        # Step 6: Run database migrations
        workflow["steps"].append({
            "step": 6,
            "name": "Run database migrations",
            "mcp_server": "database",
            "tool": "db_migrate",
            "params": {
                "migration_name": "head",
                "direction": "up"
            },
            "description": "Apply pending database migrations"
        })
        
        # Step 7: Build and start containers
        workflow["steps"].append({
            "step": 7,
            "name": "Start containers",
            "mcp_server": "docker",
            "tool": "docker_exec",
            "params": {
                "container": "deployment-manager",
                "command": f"docker-compose -f docker-compose.{self.environment}.yml up -d"
            },
            "description": f"Deploy to {self.environment} environment"
        })
        
        # Step 8: Wait and verify containers
        workflow["steps"].append({
            "step": 8,
            "name": "Verify containers started",
            "mcp_server": "docker",
            "tool": "docker_ps",
            "params": {
                "all": False
            },
            "description": "Check all containers are running"
        })
        
        # Step 9: Check container logs
        workflow["steps"].append({
            "step": 9,
            "name": "Check deployment logs",
            "mcp_server": "docker",
            "tool": "docker_logs",
            "params": {
                "container": "backend",
                "tail": 50,
                "level": "error"
            },
            "description": "Check for any errors during startup"
        })
        
        # Step 10: Test health endpoint
        workflow["steps"].append({
            "step": 10,
            "name": "Verify API health",
            "mcp_server": "api_testing",
            "tool": "http_request",
            "params": {
                "method": "GET",
                "url": "/api/health"
            },
            "description": "Verify API is responding"
        })
        
        # Step 11: Run smoke tests
        workflow["steps"].append({
            "step": 11,
            "name": "Run smoke tests",
            "mcp_server": "api_testing",
            "tool": "test_batch",
            "params": {
                "tests": [
                    {
                        "name": "Health check",
                        "method": "GET",
                        "url": "/api/health",
                        "expected_status": 200
                    },
                    {
                        "name": "Auth endpoint",
                        "method": "POST",
                        "url": "/api/auth/login",
                        "expected_status": 400,
                        "body": {}
                    },
                    {
                        "name": "Jobs endpoint",
                        "method": "GET",
                        "url": "/api/jobs",
                        "expected_status": 200
                    }
                ]
            },
            "description": "Run critical endpoint tests"
        })
        
        # Step 12: Monitor container resources
        workflow["steps"].append({
            "step": 12,
            "name": "Monitor container resources",
            "mcp_server": "docker",
            "tool": "docker_stats",
            "params": {
                "container": "backend"
            },
            "description": "Check resource usage after deployment"
        })
        
        # Step 13: Document deployment in Memory
        workflow["steps"].append({
            "step": 13,
            "name": "Document deployment",
            "mcp_server": "memory",
            "tool": "create_entities",
            "params": {
                "name": f"Deployment: {self.environment} v{self.version}",
                "type": "deployment",
                "description": f"Deployed version {self.version} to {self.environment}"
            },
            "description": "Track deployment in Memory"
        })
        
        return workflow
    
    def generate_instructions(self) -> str:
        """Generate human-readable instructions."""
        workflow = self.generate_workflow()
        
        instructions = f"# Deployment Workflow: {self.environment.upper()}\n\n"
        instructions += f"**Version**: {self.version}\n"
        instructions += f"**Environment**: {self.environment}\n\n"
        instructions += "## Workflow Steps\n\n"
        
        for step in workflow["steps"]:
            instructions += f"### Step {step['step']}: {step['name']}\n"
            instructions += f"**MCP Server**: {step['mcp_server']}\n"
            instructions += f"**Tool**: {step['tool']}\n"
            instructions += f"**Description**: {step['description']}\n\n"
        
        instructions += "## Expected Outcomes\n\n"
        instructions += "1. Security scan passed\n"
        instructions += "2. Database migrations applied\n"
        instructions += "3. Containers deployed and running\n"
        instructions += "4. Health checks passed\n"
        instructions += "5. Smoke tests passed\n"
        instructions += "6. Deployment documented\n\n"
        
        instructions += "## Rollback Procedure\n\n"
        instructions += "If deployment fails:\n"
        instructions += "1. Stop new containers\n"
        instructions += "2. Rollback database migrations\n"
        instructions += "3. Start previous version\n"
        instructions += "4. Verify rollback successful\n"
        instructions += "5. Investigate failure\n"
        
        return instructions


def create_deployment_workflow(environment: str = "staging", version: str = "latest") -> Dict[str, Any]:
    """Create a new deployment workflow."""
    workflow = DeploymentWorkflow(environment, version)
    return workflow.generate_workflow()


def main():
    """Example usage."""
    workflow_gen = DeploymentWorkflow(environment="production", version="1.2.0")
    
    workflow = workflow_gen.generate_workflow()
    instructions = workflow_gen.generate_instructions()
    
    with open("deployment_workflow_example.json", "w", encoding="utf-8") as f:
        json.dump(workflow, f, indent=2)
    
    with open("deployment_workflow_example.md", "w", encoding="utf-8") as f:
        f.write(instructions)
    
    print(f"[SUCCESS] Deployment workflow generated")


if __name__ == "__main__":
    main()
