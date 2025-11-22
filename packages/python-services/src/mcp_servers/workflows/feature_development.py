"""Feature Development Workflow.

Automates the process of starting a new feature:
1. Create Git branch
2. Create Memory entity for feature tracking
3. Run security scan
4. Set up development environment
"""

from typing import Dict, Any
import json


class FeatureDevelopmentWorkflow:
    """Automated workflow for feature development."""
    
    def __init__(self, feature_name: str, description: str):
        self.feature_name = feature_name
        self.description = description
        self.branch_name = f"feature/{feature_name.lower().replace(' ', '-')}"
        self.steps = []
        self.results = {}
    
    def add_step(self, step_name: str, mcp_server: str, tool: str, params: Dict[str, Any]):
        """Add a workflow step."""
        self.steps.append({
            "step": step_name,
            "mcp_server": mcp_server,
            "tool": tool,
            "params": params
        })
    
    def generate_workflow(self) -> Dict[str, Any]:
        """Generate the complete workflow."""
        workflow = {
            "name": "Feature Development Workflow",
            "feature": self.feature_name,
            "description": self.description,
            "steps": []
        }
        
        # Step 1: Check Git status
        workflow["steps"].append({
            "step": 1,
            "name": "Check Git status",
            "mcp_server": "git",
            "tool": "git_status",
            "params": {},
            "description": "Verify working tree is clean before creating feature branch"
        })
        
        # Step 2: Create feature branch
        workflow["steps"].append({
            "step": 2,
            "name": "Create feature branch",
            "mcp_server": "git",
            "tool": "git_checkout",
            "params": {
                "branch": self.branch_name,
                "create": True
            },
            "description": f"Create and checkout new branch: {self.branch_name}"
        })
        
        # Step 3: Create Memory entity for feature
        workflow["steps"].append({
            "step": 3,
            "name": "Create feature entity in Memory",
            "mcp_server": "memory",
            "tool": "create_entities",
            "params": {
                "name": f"Feature: {self.feature_name}",
                "type": "feature",
                "description": f"{self.description}. Branch: {self.branch_name}. Status: In Development"
            },
            "description": "Track feature in Memory for AI context"
        })
        
        # Step 4: Create relation to platform
        workflow["steps"].append({
            "step": 4,
            "name": "Link feature to platform",
            "mcp_server": "memory",
            "tool": "create_relations",
            "params": {
                "from_entity": "GiveMeJobs Platform",
                "relation": "has-feature",
                "to_entity": f"Feature: {self.feature_name}"
            },
            "description": "Create relationship in knowledge graph"
        })
        
        # Step 5: Run security scan
        workflow["steps"].append({
            "step": 5,
            "name": "Run initial security scan",
            "mcp_server": "snyk",
            "tool": "snyk_code_scan",
            "params": {
                "path": "."
            },
            "description": "Baseline security scan before feature development"
        })
        
        # Step 6: Check Docker containers
        workflow["steps"].append({
            "step": 6,
            "name": "Verify development environment",
            "mcp_server": "docker",
            "tool": "docker_ps",
            "params": {
                "all": False
            },
            "description": "Check that required containers are running"
        })
        
        # Step 7: Test database connection
        workflow["steps"].append({
            "step": 7,
            "name": "Test database connection",
            "mcp_server": "database",
            "tool": "db_query",
            "params": {
                "database": "postgresql",
                "query": "SELECT 1 as health_check"
            },
            "description": "Verify database connectivity"
        })
        
        return workflow
    
    def generate_instructions(self) -> str:
        """Generate human-readable instructions."""
        workflow = self.generate_workflow()
        
        instructions = f"# Feature Development Workflow: {self.feature_name}\n\n"
        instructions += f"**Description**: {self.description}\n"
        instructions += f"**Branch**: {self.branch_name}\n\n"
        instructions += "## Workflow Steps\n\n"
        
        for step in workflow["steps"]:
            instructions += f"### Step {step['step']}: {step['name']}\n"
            instructions += f"**MCP Server**: {step['mcp_server']}\n"
            instructions += f"**Tool**: {step['tool']}\n"
            instructions += f"**Description**: {step['description']}\n"
            instructions += f"**Params**: `{json.dumps(step['params'], indent=2)}`\n\n"
        
        instructions += "## Expected Outcomes\n\n"
        instructions += f"1. Feature branch `{self.branch_name}` created\n"
        instructions += f"2. Feature tracked in Memory MCP\n"
        instructions += "3. Security baseline established\n"
        instructions += "4. Development environment verified\n"
        instructions += "5. Ready to start coding\n\n"
        
        instructions += "## Next Steps\n\n"
        instructions += "1. Implement the feature\n"
        instructions += "2. Write tests\n"
        instructions += "3. Run tests and security scan\n"
        instructions += "4. Commit changes\n"
        instructions += "5. Create pull request\n"
        
        return instructions


def create_feature_workflow(feature_name: str, description: str) -> Dict[str, Any]:
    """Create a new feature development workflow."""
    workflow = FeatureDevelopmentWorkflow(feature_name, description)
    return workflow.generate_workflow()


def main():
    """Example usage."""
    # Example: Create workflow for resume parsing feature
    workflow_gen = FeatureDevelopmentWorkflow(
        feature_name="Advanced Resume Parser",
        description="Implement AI-powered resume parser that extracts skills, experience, and education"
    )
    
    # Generate workflow
    workflow = workflow_gen.generate_workflow()
    
    # Generate instructions
    instructions = workflow_gen.generate_instructions()
    
    # Save to file
    with open("feature_workflow_example.json", "w", encoding="utf-8") as f:
        json.dump(workflow, f, indent=2)
    
    with open("feature_workflow_example.md", "w", encoding="utf-8") as f:
        f.write(instructions)
    
    print(f"[SUCCESS] Feature workflow generated")
    print(f"  - JSON: feature_workflow_example.json")
    print(f"  - Instructions: feature_workflow_example.md")


if __name__ == "__main__":
    main()
