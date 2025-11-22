"""Integration tests for MCP servers and workflows."""

import pytest
from unittest.mock import Mock, AsyncMock, patch
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from workflows.feature_development import FeatureDevelopmentWorkflow
from workflows.bug_fix import BugFixWorkflow
from workflows.deployment import DeploymentWorkflow
from workflows.security_audit import SecurityAuditWorkflow


@pytest.mark.integration
class TestWorkflowIntegration:
    """Integration tests for automated workflows."""
    
    def test_feature_workflow_generation(self):
        """Test feature development workflow generation."""
        workflow = FeatureDevelopmentWorkflow(
            feature_name="Test Feature",
            description="Test description"
        )
        
        result = workflow.generate_workflow()
        
        assert result["name"] == "Feature Development Workflow"
        assert result["feature"] == "Test Feature"
        assert len(result["steps"]) == 7
        
        # Verify critical steps
        step_names = [step["name"] for step in result["steps"]]
        assert "Check Git status" in step_names
        assert "Create feature branch" in step_names
        assert "Run initial security scan" in step_names
    
    def test_bugfix_workflow_generation(self):
        """Test bug fix workflow generation."""
        workflow = BugFixWorkflow(
            issue_number=123,
            issue_title="Test Bug"
        )
        
        result = workflow.generate_workflow()
        
        assert result["name"] == "Bug Fix Workflow"
        assert result["issue"] == 123
        assert len(result["steps"]) == 8
        
        # Verify critical steps
        step_names = [step["name"] for step in result["steps"]]
        assert "Analyze GitHub issue" in step_names
        assert "Test affected endpoint" in step_names
        assert "Security validation" in step_names
    
    def test_deployment_workflow_generation(self):
        """Test deployment workflow generation."""
        workflow = DeploymentWorkflow(
            environment="staging",
            version="1.0.0"
        )
        
        result = workflow.generate_workflow()
        
        assert result["name"] == "Deployment Workflow"
        assert result["environment"] == "staging"
        assert result["version"] == "1.0.0"
        assert len(result["steps"]) == 13
        
        # Verify critical steps
        step_names = [step["name"] for step in result["steps"]]
        assert "Run code security scan" in step_names
        assert "Run database migrations" in step_names
        assert "Run smoke tests" in step_names
    
    def test_security_audit_workflow_generation(self):
        """Test security audit workflow generation."""
        workflow = SecurityAuditWorkflow()
        
        result = workflow.generate_workflow()
        
        assert result["name"] == "Security Audit Workflow"
        assert len(result["steps"]) == 13
        
        # Verify critical steps
        step_names = [step["name"] for step in result["steps"]]
        assert "Scan source code" in step_names
        assert "Scan dependencies" in step_names
        assert "Test authentication security" in step_names
    
    def test_workflow_instructions_generation(self):
        """Test that all workflows generate human-readable instructions."""
        workflows = [
            FeatureDevelopmentWorkflow("Test", "Desc"),
            BugFixWorkflow(1, "Bug"),
            DeploymentWorkflow("staging", "1.0"),
            SecurityAuditWorkflow()
        ]
        
        for workflow in workflows:
            instructions = workflow.generate_instructions()
            
            assert len(instructions) > 0
            assert "Workflow" in instructions
            assert "Step" in instructions
    
    def test_feature_workflow_branch_name(self):
        """Test feature branch name generation."""
        workflow = FeatureDevelopmentWorkflow(
            "Advanced Search Feature",
            "Description"
        )
        
        assert workflow.branch_name == "feature/advanced-search-feature"
    
    def test_security_audit_report_generation(self):
        """Test security audit report generation."""
        workflow = SecurityAuditWorkflow()
        
        results = [
            {"step": 1, "passed": True, "severity": "critical"},
            {"step": 2, "passed": False, "severity": "high", 
             "description": "Vulnerability found", "details": "CVE-123"}
        ]
        
        report = workflow.generate_report(results)
        
        assert "Security Audit Report" in report
        assert "CRITICAL" in report or "HIGH" in report
        assert "Passed" in report
        assert "Failed" in report


@pytest.mark.integration
class TestMCPServersIntegration:
    """Integration tests for MCP server interactions."""
    
    @pytest.mark.asyncio
    async def test_database_to_api_integration(self):
        """Test Database MCP and API Testing MCP working together."""
        from database_mcp import DatabaseMCPServer
        from api_testing_mcp import APITestingMCPServer
        
        db_server = DatabaseMCPServer()
        api_server = APITestingMCPServer()
        
        # Both servers should initialize without errors
        assert db_server.name == "Database"
        assert api_server.name == "API Testing"
        
        # Both should have tools registered
        assert len(db_server.tools) > 0
        assert len(api_server.tools) > 0
    
    @pytest.mark.asyncio
    async def test_docker_to_database_integration(self):
        """Test Docker MCP and Database MCP working together."""
        from docker_mcp import DockerMCPServer
        from database_mcp import DatabaseMCPServer
        
        docker_server = DockerMCPServer()
        db_server = DatabaseMCPServer()
        
        # Both servers should be independent
        assert docker_server.name == "Docker"
        assert db_server.name == "Database"
        
        # Verify no conflicts
        docker_tools = {tool["name"] for tool in docker_server.tools}
        db_tools = {tool["name"] for tool in db_server.tools}
        
        # No tool name conflicts
        assert len(docker_tools & db_tools) == 0
    
    @pytest.mark.asyncio
    async def test_all_servers_coexist(self):
        """Test all MCP servers can coexist."""
        from database_mcp import DatabaseMCPServer
        from docker_mcp import DockerMCPServer
        from api_testing_mcp import APITestingMCPServer
        
        servers = [
            DatabaseMCPServer(),
            DockerMCPServer(),
            APITestingMCPServer()
        ]
        
        # All servers initialize
        assert all(server.name for server in servers)
        
        # All tools are unique
        all_tools = []
        for server in servers:
            all_tools.extend([tool["name"] for tool in server.tools])
        
        assert len(all_tools) == len(set(all_tools))  # No duplicates


@pytest.mark.integration
@pytest.mark.slow
class TestEndToEndWorkflows:
    """End-to-end workflow tests (slow)."""
    
    def test_complete_feature_workflow(self):
        """Test complete feature development workflow."""
        workflow = FeatureDevelopmentWorkflow(
            "User Profile Page",
            "Add user profile viewing and editing"
        )
        
        # Generate workflow
        result = workflow.generate_workflow()
        instructions = workflow.generate_instructions()
        
        # Verify workflow completeness
        assert len(result["steps"]) == 7
        assert len(instructions) > 500  # Substantial documentation
        
        # Verify all MCP servers are used
        mcp_servers_used = {step["mcp_server"] for step in result["steps"]}
        assert "git" in mcp_servers_used
        assert "memory" in mcp_servers_used
        assert "snyk" in mcp_servers_used or "docker" in mcp_servers_used
    
    def test_complete_deployment_workflow(self):
        """Test complete deployment workflow."""
        workflow = DeploymentWorkflow("production", "2.0.0")
        
        result = workflow.generate_workflow()
        
        # Verify critical deployment steps
        steps = result["steps"]
        
        # Security scans come first
        assert any("security" in step["name"].lower() for step in steps[:5])
        
        # Migrations before deployment
        migration_step = next(i for i, s in enumerate(steps) 
                            if "migration" in s["name"].lower())
        deploy_step = next(i for i, s in enumerate(steps) 
                          if "start containers" in s["name"].lower())
        assert migration_step < deploy_step
        
        # Verification after deployment
        verify_steps = [s for s in steps if "verify" in s["name"].lower() 
                       or "test" in s["name"].lower()]
        assert len(verify_steps) > 0
