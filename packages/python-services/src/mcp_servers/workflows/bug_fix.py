"""Bug Fix Workflow.

Automates the process of fixing a bug:
1. Analyze GitHub issue
2. Test affected API endpoint
3. Run security validation
4. Create fix branch
5. Verify fix
"""

from typing import Dict, Any
import json


class BugFixWorkflow:
    """Automated workflow for bug fixes."""
    
    def __init__(self, issue_number: int, issue_title: str):
        self.issue_number = issue_number
        self.issue_title = issue_title
        self.branch_name = f"bugfix/issue-{issue_number}"
    
    def generate_workflow(self) -> Dict[str, Any]:
        """Generate the complete workflow."""
        workflow = {
            "name": "Bug Fix Workflow",
            "issue": self.issue_number,
            "title": self.issue_title,
            "steps": []
        }
        
        # Step 1: Get GitHub issue details
        workflow["steps"].append({
            "step": 1,
            "name": "Analyze GitHub issue",
            "mcp_server": "github",
            "tool": "get_issue",
            "params": {
                "owner": "your-org",
                "repo": "givemejobs",
                "issue_number": self.issue_number
            },
            "description": "Retrieve full issue details including description and comments"
        })
        
        # Step 2: Search Memory for related context
        workflow["steps"].append({
            "step": 2,
            "name": "Search for related context",
            "mcp_server": "memory",
            "tool": "search_nodes",
            "params": {
                "query": self.issue_title
            },
            "description": "Find related components, APIs, or previous issues"
        })
        
        # Step 3: Test affected endpoint (if API-related)
        workflow["steps"].append({
            "step": 3,
            "name": "Test affected endpoint",
            "mcp_server": "api_testing",
            "tool": "http_request",
            "params": {
                "method": "GET",
                "url": "/api/health",
                "note": "Replace with actual affected endpoint"
            },
            "description": "Reproduce the bug by testing the affected endpoint"
        })
        
        # Step 4: Check database state (if relevant)
        workflow["steps"].append({
            "step": 4,
            "name": "Check database state",
            "mcp_server": "database",
            "tool": "db_query",
            "params": {
                "database": "postgresql",
                "query": "SELECT * FROM users WHERE id = %s",
                "params": [1],
                "note": "Replace with relevant query"
            },
            "description": "Verify database state related to the bug"
        })
        
        # Step 5: Create bug fix branch
        workflow["steps"].append({
            "step": 5,
            "name": "Create bug fix branch",
            "mcp_server": "git",
            "tool": "git_checkout",
            "params": {
                "branch": self.branch_name,
                "create": True
            },
            "description": f"Create and checkout branch: {self.branch_name}"
        })
        
        # Step 6: Run security validation
        workflow["steps"].append({
            "step": 6,
            "name": "Security validation",
            "mcp_server": "snyk",
            "tool": "snyk_test",
            "params": {
                "path": "."
            },
            "description": "Ensure no security vulnerabilities introduced"
        })
        
        # Step 7: Test the fix
        workflow["steps"].append({
            "step": 7,
            "name": "Verify fix with endpoint test",
            "mcp_server": "api_testing",
            "tool": "test_batch",
            "params": {
                "tests": [
                    {
                        "name": "Bug fix verification",
                        "method": "GET",
                        "url": "/api/endpoint",
                        "expected_status": 200,
                        "note": "Replace with actual test"
                    }
                ]
            },
            "description": "Verify the bug is fixed"
        })
        
        # Step 8: Update Memory with fix
        workflow["steps"].append({
            "step": 8,
            "name": "Document fix in Memory",
            "mcp_server": "memory",
            "tool": "create_entities",
            "params": {
                "name": f"Bug Fix: Issue #{self.issue_number}",
                "type": "bugfix",
                "description": f"Fixed: {self.issue_title}. Branch: {self.branch_name}"
            },
            "description": "Track bug fix for future reference"
        })
        
        return workflow
    
    def generate_instructions(self) -> str:
        """Generate human-readable instructions."""
        workflow = self.generate_workflow()
        
        instructions = f"# Bug Fix Workflow: Issue #{self.issue_number}\n\n"
        instructions += f"**Title**: {self.issue_title}\n"
        instructions += f"**Branch**: {self.branch_name}\n\n"
        instructions += "## Workflow Steps\n\n"
        
        for step in workflow["steps"]:
            instructions += f"### Step {step['step']}: {step['name']}\n"
            instructions += f"**MCP Server**: {step['mcp_server']}\n"
            instructions += f"**Tool**: {step['tool']}\n"
            instructions += f"**Description**: {step['description']}\n\n"
        
        instructions += "## Expected Outcomes\n\n"
        instructions += "1. Issue analyzed and understood\n"
        instructions += "2. Bug reproduced and verified\n"
        instructions += f"3. Fix branch `{self.branch_name}` created\n"
        instructions += "4. Security validation passed\n"
        instructions += "5. Fix verified with tests\n"
        instructions += "6. Fix documented in Memory\n\n"
        
        instructions += "## Next Steps\n\n"
        instructions += "1. Commit the fix\n"
        instructions += "2. Push to remote\n"
        instructions += "3. Create pull request\n"
        instructions += "4. Link PR to issue\n"
        instructions += "5. Request code review\n"
        
        return instructions


def create_bugfix_workflow(issue_number: int, issue_title: str) -> Dict[str, Any]:
    """Create a new bug fix workflow."""
    workflow = BugFixWorkflow(issue_number, issue_title)
    return workflow.generate_workflow()


def main():
    """Example usage."""
    workflow_gen = BugFixWorkflow(
        issue_number=123,
        issue_title="Login endpoint returns 500 for invalid credentials"
    )
    
    workflow = workflow_gen.generate_workflow()
    instructions = workflow_gen.generate_instructions()
    
    with open("bugfix_workflow_example.json", "w", encoding="utf-8") as f:
        json.dump(workflow, f, indent=2)
    
    with open("bugfix_workflow_example.md", "w", encoding="utf-8") as f:
        f.write(instructions)
    
    print(f"[SUCCESS] Bug fix workflow generated")


if __name__ == "__main__":
    main()
