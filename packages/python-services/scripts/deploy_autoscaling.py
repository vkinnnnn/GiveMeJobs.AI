#!/usr/bin/env python3
"""
Auto-scaling deployment script for GiveMeJobs Python services.

This script deploys Kubernetes resources for auto-scaling FastAPI services.
"""

import asyncio
import subprocess
import sys
import time
from pathlib import Path
from typing import List, Dict, Any

import click
import yaml
import structlog

logger = structlog.get_logger(__name__)


class KubernetesDeployer:
    """Kubernetes deployment manager for auto-scaling."""
    
    def __init__(self, namespace: str = "givemejobs", kubeconfig: str = None):
        self.namespace = namespace
        self.kubeconfig = kubeconfig
        self.k8s_dir = Path(__file__).parent.parent / "k8s"
    
    def _run_kubectl(self, args: List[str], check: bool = True) -> subprocess.CompletedProcess:
        """Run kubectl command."""
        cmd = ["kubectl"]
        
        if self.kubeconfig:
            cmd.extend(["--kubeconfig", self.kubeconfig])
        
        cmd.extend(args)
        
        logger.info("Running kubectl command", command=" ".join(cmd))
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=check
        )
        
        if result.returncode != 0:
            logger.error(
                "kubectl command failed",
                command=" ".join(cmd),
                stdout=result.stdout,
                stderr=result.stderr,
                returncode=result.returncode
            )
            if check:
                raise subprocess.CalledProcessError(result.returncode, cmd)
        
        return result
    
    def create_namespace(self) -> bool:
        """Create namespace if it doesn't exist."""
        try:
            # Check if namespace exists
            result = self._run_kubectl(
                ["get", "namespace", self.namespace],
                check=False
            )
            
            if result.returncode == 0:
                logger.info("Namespace already exists", namespace=self.namespace)
                return True
            
            # Create namespace
            self._run_kubectl([
                "create", "namespace", self.namespace
            ])
            
            logger.info("Namespace created", namespace=self.namespace)
            return True
            
        except Exception as e:
            logger.error("Failed to create namespace", error=str(e))
            return False
    
    def deploy_secrets(self) -> bool:
        """Deploy secrets (placeholder - should be done securely)."""
        try:
            # This is a placeholder - in production, secrets should be managed
            # through secure methods like Kubernetes secrets, Vault, etc.
            
            secrets_yaml = f"""
apiVersion: v1
kind: Secret
metadata:
  name: database-secret
  namespace: {self.namespace}
type: Opaque
stringData:
  url: "postgresql+asyncpg://postgres:password@postgres:5432/givemejobs_db"
---
apiVersion: v1
kind: Secret
metadata:
  name: redis-secret
  namespace: {self.namespace}
type: Opaque
stringData:
  url: "redis://redis:6379/0"
  celery-broker-url: "redis://redis:6379/1"
  celery-result-backend: "redis://redis:6379/2"
---
apiVersion: v1
kind: Secret
metadata:
  name: ai-secret
  namespace: {self.namespace}
type: Opaque
stringData:
  openai-api-key: "your-openai-api-key"
  pinecone-api-key: "your-pinecone-api-key"
  pinecone-environment: "your-pinecone-environment"
---
apiVersion: v1
kind: Secret
metadata:
  name: monitoring-secret
  namespace: {self.namespace}
type: Opaque
stringData:
  sentry-dsn: "your-sentry-dsn"
---
apiVersion: v1
kind: Secret
metadata:
  name: cdn-secret
  namespace: {self.namespace}
type: Opaque
stringData:
  api-key: "your-cdn-api-key"
---
apiVersion: v1
kind: Secret
metadata:
  name: registry-secret
  namespace: {self.namespace}
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: eyJhdXRocyI6e319  # Empty auth for now
"""
            
            # Apply secrets
            process = subprocess.Popen(
                ["kubectl", "apply", "-f", "-"],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            stdout, stderr = process.communicate(input=secrets_yaml)
            
            if process.returncode != 0:
                logger.error("Failed to deploy secrets", stderr=stderr)
                return False
            
            logger.info("Secrets deployed successfully")
            return True
            
        except Exception as e:
            logger.error("Failed to deploy secrets", error=str(e))
            return False
    
    def deploy_manifests(self) -> bool:
        """Deploy Kubernetes manifests."""
        try:
            manifest_files = [
                "deployment.yaml",
                "celery-worker.yaml",
                "hpa.yaml",
                "servicemonitor.yaml"
            ]
            
            for manifest_file in manifest_files:
                manifest_path = self.k8s_dir / manifest_file
                
                if not manifest_path.exists():
                    logger.warning("Manifest file not found", file=manifest_file)
                    continue
                
                logger.info("Deploying manifest", file=manifest_file)
                
                self._run_kubectl([
                    "apply", "-f", str(manifest_path)
                ])
                
                logger.info("Manifest deployed successfully", file=manifest_file)
            
            return True
            
        except Exception as e:
            logger.error("Failed to deploy manifests", error=str(e))
            return False
    
    def wait_for_deployment(self, deployment_name: str, timeout: int = 300) -> bool:
        """Wait for deployment to be ready."""
        try:
            logger.info("Waiting for deployment", deployment=deployment_name)
            
            self._run_kubectl([
                "wait", "--for=condition=available",
                f"deployment/{deployment_name}",
                f"--namespace={self.namespace}",
                f"--timeout={timeout}s"
            ])
            
            logger.info("Deployment is ready", deployment=deployment_name)
            return True
            
        except Exception as e:
            logger.error("Deployment failed to become ready", deployment=deployment_name, error=str(e))
            return False
    
    def check_hpa_status(self) -> Dict[str, Any]:
        """Check HPA status."""
        try:
            result = self._run_kubectl([
                "get", "hpa",
                f"--namespace={self.namespace}",
                "-o", "json"
            ])
            
            import json
            hpa_data = json.loads(result.stdout)
            
            status = {}
            for item in hpa_data.get("items", []):
                name = item["metadata"]["name"]
                spec = item["spec"]
                status_info = item.get("status", {})
                
                status[name] = {
                    "min_replicas": spec.get("minReplicas"),
                    "max_replicas": spec.get("maxReplicas"),
                    "current_replicas": status_info.get("currentReplicas"),
                    "desired_replicas": status_info.get("desiredReplicas"),
                    "metrics": status_info.get("currentMetrics", [])
                }
            
            return status
            
        except Exception as e:
            logger.error("Failed to check HPA status", error=str(e))
            return {}
    
    def scale_deployment(self, deployment_name: str, replicas: int) -> bool:
        """Manually scale a deployment."""
        try:
            self._run_kubectl([
                "scale", f"deployment/{deployment_name}",
                f"--replicas={replicas}",
                f"--namespace={self.namespace}"
            ])
            
            logger.info("Deployment scaled", deployment=deployment_name, replicas=replicas)
            return True
            
        except Exception as e:
            logger.error("Failed to scale deployment", deployment=deployment_name, error=str(e))
            return False


@click.group()
def cli():
    """Auto-scaling deployment CLI."""
    pass


@cli.command()
@click.option('--namespace', default='givemejobs', help='Kubernetes namespace')
@click.option('--kubeconfig', help='Path to kubeconfig file')
def deploy(namespace: str, kubeconfig: str):
    """Deploy auto-scaling infrastructure."""
    
    deployer = KubernetesDeployer(namespace, kubeconfig)
    
    click.echo("🚀 Deploying auto-scaling infrastructure...")
    
    # Create namespace
    if not deployer.create_namespace():
        click.echo("❌ Failed to create namespace")
        sys.exit(1)
    
    # Deploy secrets
    if not deployer.deploy_secrets():
        click.echo("❌ Failed to deploy secrets")
        sys.exit(1)
    
    # Deploy manifests
    if not deployer.deploy_manifests():
        click.echo("❌ Failed to deploy manifests")
        sys.exit(1)
    
    # Wait for deployments
    deployments = [
        "givemejobs-python-backend",
        "givemejobs-celery-worker"
    ]
    
    for deployment in deployments:
        if not deployer.wait_for_deployment(deployment):
            click.echo(f"❌ Deployment {deployment} failed to become ready")
            sys.exit(1)
    
    click.echo("✅ Auto-scaling infrastructure deployed successfully!")
    
    # Show HPA status
    hpa_status = deployer.check_hpa_status()
    if hpa_status:
        click.echo("\n📊 HPA Status:")
        for name, status in hpa_status.items():
            click.echo(f"  {name}:")
            click.echo(f"    Min/Max Replicas: {status['min_replicas']}/{status['max_replicas']}")
            click.echo(f"    Current/Desired: {status['current_replicas']}/{status['desired_replicas']}")


@cli.command()
@click.option('--namespace', default='givemejobs', help='Kubernetes namespace')
@click.option('--kubeconfig', help='Path to kubeconfig file')
def status(namespace: str, kubeconfig: str):
    """Check auto-scaling status."""
    
    deployer = KubernetesDeployer(namespace, kubeconfig)
    
    # Check HPA status
    hpa_status = deployer.check_hpa_status()
    
    if not hpa_status:
        click.echo("❌ No HPA found or failed to get status")
        return
    
    click.echo("📊 Auto-scaling Status:")
    click.echo("-" * 50)
    
    for name, status in hpa_status.items():
        click.echo(f"\n🎯 {name}:")
        click.echo(f"  Min Replicas: {status['min_replicas']}")
        click.echo(f"  Max Replicas: {status['max_replicas']}")
        click.echo(f"  Current Replicas: {status['current_replicas']}")
        click.echo(f"  Desired Replicas: {status['desired_replicas']}")
        
        if status['metrics']:
            click.echo("  Current Metrics:")
            for metric in status['metrics']:
                metric_type = metric.get('type', 'Unknown')
                if metric_type == 'Resource':
                    resource = metric.get('resource', {})
                    click.echo(f"    {resource.get('name', 'Unknown')}: {resource.get('current', {}).get('averageUtilization', 'N/A')}%")
                elif metric_type == 'Pods':
                    pods = metric.get('pods', {})
                    click.echo(f"    {pods.get('metric', {}).get('name', 'Unknown')}: {pods.get('current', {}).get('averageValue', 'N/A')}")


@cli.command()
@click.option('--namespace', default='givemejobs', help='Kubernetes namespace')
@click.option('--kubeconfig', help='Path to kubeconfig file')
@click.argument('deployment')
@click.argument('replicas', type=int)
def scale(namespace: str, kubeconfig: str, deployment: str, replicas: int):
    """Manually scale a deployment."""
    
    deployer = KubernetesDeployer(namespace, kubeconfig)
    
    if deployer.scale_deployment(deployment, replicas):
        click.echo(f"✅ Scaled {deployment} to {replicas} replicas")
    else:
        click.echo(f"❌ Failed to scale {deployment}")
        sys.exit(1)


@cli.command()
@click.option('--namespace', default='givemejobs', help='Kubernetes namespace')
@click.option('--kubeconfig', help='Path to kubeconfig file')
def test_scaling(namespace: str, kubeconfig: str):
    """Test auto-scaling by generating load."""
    
    click.echo("🧪 Testing auto-scaling...")
    click.echo("This would typically generate load to test HPA behavior")
    click.echo("You can use tools like:")
    click.echo("  - Apache Bench (ab)")
    click.echo("  - wrk")
    click.echo("  - Locust")
    click.echo("  - Custom load testing scripts")
    
    # Example load generation command
    click.echo("\nExample load generation:")
    click.echo("ab -n 10000 -c 100 http://your-service-url/api/v1/health")


if __name__ == '__main__':
    cli()