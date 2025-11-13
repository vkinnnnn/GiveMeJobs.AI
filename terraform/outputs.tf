# Outputs for GiveMeJobs Platform Infrastructure

# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "private_subnets" {
  description = "List of IDs of private subnets"
  value       = module.vpc.private_subnets
}

output "public_subnets" {
  description = "List of IDs of public subnets"
  value       = module.vpc.public_subnets
}

# EKS Outputs
output "cluster_name" {
  description = "Name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = module.eks.cluster_security_group_id
}

output "cluster_iam_role_arn" {
  description = "IAM role ARN associated with EKS cluster"
  value       = module.eks.cluster_iam_role_arn
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = module.eks.cluster_certificate_authority_data
}

output "cluster_version" {
  description = "The Kubernetes version for the EKS cluster"
  value       = module.eks.cluster_version
}

output "node_groups" {
  description = "EKS node groups"
  value       = module.eks.eks_managed_node_groups
}

# Database Outputs
output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = module.rds.db_instance_endpoint
  sensitive   = true
}

output "rds_port" {
  description = "RDS instance port"
  value       = module.rds.db_instance_port
}

output "documentdb_endpoint" {
  description = "DocumentDB cluster endpoint"
  value       = module.documentdb.cluster_endpoint
  sensitive   = true
}

output "documentdb_port" {
  description = "DocumentDB cluster port"
  value       = module.documentdb.cluster_port
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = module.elasticache.cache_nodes[0].address
  sensitive   = true
}

output "redis_port" {
  description = "ElastiCache Redis port"
  value       = module.elasticache.port
}

# Load Balancer Outputs
output "alb_dns_name" {
  description = "DNS name of the load balancer"
  value       = module.alb.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the load balancer"
  value       = module.alb.zone_id
}

output "alb_arn" {
  description = "ARN of the load balancer"
  value       = module.alb.arn
}

# CloudFront Outputs
output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = module.cloudfront.distribution_id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = module.cloudfront.domain_name
}

# S3 Outputs
output "s3_bucket_names" {
  description = "Names of created S3 buckets"
  value       = module.s3.bucket_names
}

output "s3_bucket_arns" {
  description = "ARNs of created S3 buckets"
  value       = module.s3.bucket_arns
}

# Security Outputs
output "security_group_ids" {
  description = "Security group IDs"
  value = {
    alb         = module.security_groups.alb_security_group_id
    eks         = module.security_groups.eks_security_group_id
    rds         = module.security_groups.rds_security_group_id
    documentdb  = module.security_groups.documentdb_security_group_id
    elasticache = module.security_groups.elasticache_security_group_id
  }
}

# Secrets Manager Outputs
output "secrets_manager_arn" {
  description = "ARN of the Secrets Manager secret"
  value       = aws_secretsmanager_secret.app_secrets.arn
}

output "secrets_manager_name" {
  description = "Name of the Secrets Manager secret"
  value       = aws_secretsmanager_secret.app_secrets.name
}

# Connection Information for Applications
output "database_connection_info" {
  description = "Database connection information"
  value = {
    postgres = {
      host     = module.rds.db_instance_endpoint
      port     = module.rds.db_instance_port
      database = module.rds.db_instance_name
      username = module.rds.db_instance_username
    }
    mongodb = {
      host     = module.documentdb.cluster_endpoint
      port     = module.documentdb.cluster_port
      username = module.documentdb.master_username
    }
    redis = {
      host = module.elasticache.cache_nodes[0].address
      port = module.elasticache.port
    }
  }
  sensitive = true
}

# Kubernetes Configuration
output "kubectl_config" {
  description = "kubectl configuration for accessing the cluster"
  value = {
    cluster_name = module.eks.cluster_name
    region       = var.aws_region
    endpoint     = module.eks.cluster_endpoint
  }
}

# Monitoring Endpoints
output "monitoring_endpoints" {
  description = "Monitoring service endpoints"
  value = {
    prometheus = "http://${module.alb.dns_name}:9090"
    grafana    = "http://${module.alb.dns_name}:3001"
    kibana     = "http://${module.alb.dns_name}:5601"
  }
}

# Application URLs
output "application_urls" {
  description = "Application access URLs"
  value = {
    frontend      = "https://${var.domain_name}"
    backend_api   = "https://api.${var.domain_name}"
    python_ai     = "https://ai.${var.domain_name}"
    admin_panel   = "https://admin.${var.domain_name}"
  }
}

# Resource Tags
output "common_tags" {
  description = "Common tags applied to all resources"
  value       = local.tags
}

# Cost Optimization Information
output "cost_optimization" {
  description = "Cost optimization recommendations"
  value = {
    spot_instances_enabled = var.enable_spot_instances
    scheduled_scaling      = var.enable_scheduled_scaling
    storage_classes       = ["gp3", "io2"]
    reserved_instances    = "Consider for production workloads"
  }
}