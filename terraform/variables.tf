# Variables for GiveMeJobs Platform Infrastructure

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "production"
  
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be one of: dev, staging, production."
  }
}

variable "domain_name" {
  description = "Primary domain name for the application"
  type        = string
  default     = "givemejobs.ai"
}

variable "certificate_arn" {
  description = "ARN of the SSL certificate for HTTPS"
  type        = string
  default     = ""
}

# Database Configuration
variable "postgres_instance_class" {
  description = "RDS instance class for PostgreSQL"
  type        = string
  default     = "db.t3.micro"
}

variable "postgres_allocated_storage" {
  description = "Initial storage allocation for PostgreSQL (GB)"
  type        = number
  default     = 20
}

variable "postgres_max_allocated_storage" {
  description = "Maximum storage allocation for PostgreSQL (GB)"
  type        = number
  default     = 100
}

variable "mongodb_instance_class" {
  description = "DocumentDB instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "mongodb_cluster_size" {
  description = "Number of DocumentDB instances in cluster"
  type        = number
  default     = 1
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_cache_nodes" {
  description = "Number of Redis cache nodes"
  type        = number
  default     = 1
}

# EKS Configuration
variable "cluster_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
}

variable "node_groups" {
  description = "EKS managed node group configurations"
  type = map(object({
    instance_types = list(string)
    min_size      = number
    max_size      = number
    desired_size  = number
    capacity_type = string
    labels        = map(string)
    taints        = map(object({
      key    = string
      value  = string
      effect = string
    }))
  }))
  default = {
    general = {
      instance_types = ["t3.medium"]
      min_size      = 2
      max_size      = 10
      desired_size  = 3
      capacity_type = "ON_DEMAND"
      labels = {
        role = "general"
      }
      taints = {}
    }
    compute = {
      instance_types = ["c5.large"]
      min_size      = 1
      max_size      = 5
      desired_size  = 2
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
}

# Monitoring Configuration
variable "enable_monitoring" {
  description = "Enable comprehensive monitoring stack"
  type        = bool
  default     = true
}

variable "enable_logging" {
  description = "Enable centralized logging"
  type        = bool
  default     = true
}

# Backup Configuration
variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

variable "enable_point_in_time_recovery" {
  description = "Enable point-in-time recovery for databases"
  type        = bool
  default     = true
}

# Security Configuration
variable "enable_encryption" {
  description = "Enable encryption at rest for all services"
  type        = bool
  default     = true
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection for critical resources"
  type        = bool
  default     = true
}

# Networking Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones to use"
  type        = list(string)
  default     = []
}

# Application Configuration
variable "app_image_tag" {
  description = "Docker image tag for application deployment"
  type        = string
  default     = "latest"
}

variable "enable_auto_scaling" {
  description = "Enable auto-scaling for application services"
  type        = bool
  default     = true
}

# External Services Configuration
variable "external_secrets" {
  description = "External service API keys and secrets"
  type = object({
    openai_api_key         = string
    pinecone_api_key       = string
    linkedin_client_id     = string
    linkedin_client_secret = string
    indeed_api_key         = string
    sentry_dsn            = string
    resend_api_key        = string
  })
  default = {
    openai_api_key         = ""
    pinecone_api_key       = ""
    linkedin_client_id     = ""
    linkedin_client_secret = ""
    indeed_api_key         = ""
    sentry_dsn            = ""
    resend_api_key        = ""
  }
  sensitive = true
}

# Cost Optimization
variable "enable_spot_instances" {
  description = "Use spot instances for cost optimization"
  type        = bool
  default     = false
}

variable "enable_scheduled_scaling" {
  description = "Enable scheduled scaling for predictable workloads"
  type        = bool
  default     = false
}

# Disaster Recovery
variable "enable_cross_region_backup" {
  description = "Enable cross-region backup for disaster recovery"
  type        = bool
  default     = false
}

variable "backup_region" {
  description = "Secondary region for disaster recovery backups"
  type        = string
  default     = "us-west-2"
}