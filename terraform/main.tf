# Main Terraform configuration for GiveMeJobs Platform
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "s3" {
    bucket         = "givemejobs-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "givemejobs-terraform-locks"
  }
}

# Configure AWS Provider
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "GiveMeJobs"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = "DevOps"
    }
  }
}

# Configure Kubernetes Provider
provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
  }
}

# Configure Helm Provider
provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
    
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

data "aws_caller_identity" "current" {}

# Local values
locals {
  name            = "givemejobs-${var.environment}"
  cluster_version = "1.28"
  
  vpc_cidr = "10.0.0.0/16"
  azs      = slice(data.aws_availability_zones.available.names, 0, 3)
  
  tags = {
    Project     = "GiveMeJobs"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"
  
  name = local.name
  cidr = local.vpc_cidr
  azs  = local.azs
  
  private_subnets = [for k, v in local.azs : cidrsubnet(local.vpc_cidr, 4, k)]
  public_subnets  = [for k, v in local.azs : cidrsubnet(local.vpc_cidr, 8, k + 48)]
  intra_subnets   = [for k, v in local.azs : cidrsubnet(local.vpc_cidr, 8, k + 52)]
  
  enable_nat_gateway   = true
  single_nat_gateway   = false
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  # VPC Flow Logs
  enable_flow_log                      = true
  create_flow_log_cloudwatch_log_group = true
  create_flow_log_cloudwatch_iam_role  = true
  flow_log_max_aggregation_interval    = 60
  
  tags = local.tags
}

# EKS Cluster Module
module "eks" {
  source = "./modules/eks"
  
  cluster_name                   = local.name
  cluster_version                = local.cluster_version
  cluster_endpoint_public_access = true
  
  vpc_id                         = module.vpc.vpc_id
  subnet_ids                     = module.vpc.private_subnets
  control_plane_subnet_ids       = module.vpc.intra_subnets
  
  # EKS Managed Node Groups
  eks_managed_node_groups = {
    general = {
      name           = "general"
      instance_types = ["t3.medium"]
      
      min_size     = 2
      max_size     = 10
      desired_size = 3
      
      capacity_type = "ON_DEMAND"
      
      labels = {
        role = "general"
      }
      
      taints = {}
    }
    
    compute_optimized = {
      name           = "compute-optimized"
      instance_types = ["c5.large", "c5.xlarge"]
      
      min_size     = 1
      max_size     = 5
      desired_size = 2
      
      capacity_type = "SPOT"
      
      labels = {
        role = "compute"
      }
      
      taints = {
        compute = {
          key    = "compute"
          value  = "true"
          effect = "NO_SCHEDULE"
        }
      }
    }
  }
  
  tags = local.tags
}

# RDS Module for PostgreSQL
module "rds" {
  source = "./modules/rds"
  
  identifier = "${local.name}-postgres"
  
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.micro"
  
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_encrypted     = true
  
  db_name  = "givemejobs_db"
  username = "givemejobs"
  port     = 5432
  
  vpc_security_group_ids = [module.security_groups.rds_security_group_id]
  db_subnet_group_name   = module.vpc.database_subnet_group
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  deletion_protection = var.environment == "production"
  skip_final_snapshot = var.environment != "production"
  
  performance_insights_enabled = true
  monitoring_interval         = 60
  
  tags = local.tags
}

# DocumentDB Module for MongoDB
module "documentdb" {
  source = "./modules/documentdb"
  
  cluster_identifier = "${local.name}-docdb"
  
  engine         = "docdb"
  engine_version = "5.0.0"
  
  master_username = "givemejobs"
  
  backup_retention_period = 7
  preferred_backup_window = "03:00-04:00"
  
  skip_final_snapshot = var.environment != "production"
  
  vpc_security_group_ids = [module.security_groups.documentdb_security_group_id]
  db_subnet_group_name   = module.vpc.database_subnet_group
  
  cluster_size          = var.environment == "production" ? 3 : 1
  instance_class        = "db.t3.medium"
  
  storage_encrypted = true
  
  tags = local.tags
}

# ElastiCache Module for Redis
module "elasticache" {
  source = "./modules/elasticache"
  
  cluster_id = "${local.name}-redis"
  
  engine         = "redis"
  engine_version = "7.0"
  node_type      = "cache.t3.micro"
  
  num_cache_nodes = 1
  port            = 6379
  
  subnet_group_name  = module.vpc.elasticache_subnet_group
  security_group_ids = [module.security_groups.elasticache_security_group_id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  
  tags = local.tags
}

# Security Groups Module
module "security_groups" {
  source = "./modules/security-groups"
  
  name   = local.name
  vpc_id = module.vpc.vpc_id
  
  tags = local.tags
}

# Load Balancer Module
module "alb" {
  source = "./modules/alb"
  
  name = local.name
  
  vpc_id  = module.vpc.vpc_id
  subnets = module.vpc.public_subnets
  
  security_groups = [module.security_groups.alb_security_group_id]
  
  tags = local.tags
}

# CloudFront CDN Module
module "cloudfront" {
  source = "./modules/cloudfront"
  
  domain_name = var.domain_name
  
  origin_domain_name = module.alb.dns_name
  
  tags = local.tags
}

# S3 Buckets Module
module "s3" {
  source = "./modules/s3"
  
  name_prefix = local.name
  
  tags = local.tags
}

# Secrets Manager
resource "aws_secretsmanager_secret" "app_secrets" {
  name        = "${local.name}-secrets"
  description = "Application secrets for GiveMeJobs platform"
  
  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    postgres_password = random_password.postgres_password.result
    mongodb_password  = random_password.mongodb_password.result
    redis_password    = random_password.redis_password.result
    jwt_secret        = random_password.jwt_secret.result
  })
}

# Random passwords
resource "random_password" "postgres_password" {
  length  = 32
  special = true
}

resource "random_password" "mongodb_password" {
  length  = 32
  special = true
}

resource "random_password" "redis_password" {
  length  = 32
  special = true
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}