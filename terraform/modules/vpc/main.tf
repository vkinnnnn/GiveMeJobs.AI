# VPC Module for GiveMeJobs Platform

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.cidr
  enable_dns_hostnames = var.enable_dns_hostnames
  enable_dns_support   = var.enable_dns_support

  tags = merge(
    var.tags,
    {
      Name = var.name
    }
  )
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-igw"
    }
  )
}

# Public Subnets
resource "aws_subnet" "public" {
  count = length(var.public_subnets)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnets[count.index]
  availability_zone       = var.azs[count.index]
  map_public_ip_on_launch = true

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-public-${var.azs[count.index]}"
      Type = "Public"
      "kubernetes.io/role/elb" = "1"
    }
  )
}

# Private Subnets
resource "aws_subnet" "private" {
  count = length(var.private_subnets)

  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnets[count.index]
  availability_zone = var.azs[count.index]

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-private-${var.azs[count.index]}"
      Type = "Private"
      "kubernetes.io/role/internal-elb" = "1"
    }
  )
}

# Intra Subnets (for control plane)
resource "aws_subnet" "intra" {
  count = length(var.intra_subnets)

  vpc_id            = aws_vpc.main.id
  cidr_block        = var.intra_subnets[count.index]
  availability_zone = var.azs[count.index]

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-intra-${var.azs[count.index]}"
      Type = "Intra"
    }
  )
}

# Elastic IPs for NAT Gateways
resource "aws_eip" "nat" {
  count = var.single_nat_gateway ? 1 : length(var.public_subnets)

  domain = "vpc"

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-nat-${count.index + 1}"
    }
  )

  depends_on = [aws_internet_gateway.main]
}

# NAT Gateways
resource "aws_nat_gateway" "main" {
  count = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : length(var.public_subnets)) : 0

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-nat-${count.index + 1}"
    }
  )

  depends_on = [aws_internet_gateway.main]
}

# Route Tables - Public
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-public"
      Type = "Public"
    }
  )
}

# Route Tables - Private
resource "aws_route_table" "private" {
  count = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : length(var.private_subnets)) : length(var.private_subnets)

  vpc_id = aws_vpc.main.id

  dynamic "route" {
    for_each = var.enable_nat_gateway ? [1] : []
    content {
      cidr_block     = "0.0.0.0/0"
      nat_gateway_id = aws_nat_gateway.main[var.single_nat_gateway ? 0 : count.index].id
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-private-${count.index + 1}"
      Type = "Private"
    }
  )
}

# Route Tables - Intra
resource "aws_route_table" "intra" {
  count = length(var.intra_subnets) > 0 ? 1 : 0

  vpc_id = aws_vpc.main.id

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-intra"
      Type = "Intra"
    }
  )
}

# Route Table Associations - Public
resource "aws_route_table_association" "public" {
  count = length(var.public_subnets)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Route Table Associations - Private
resource "aws_route_table_association" "private" {
  count = length(var.private_subnets)

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[var.single_nat_gateway ? 0 : count.index].id
}

# Route Table Associations - Intra
resource "aws_route_table_association" "intra" {
  count = length(var.intra_subnets)

  subnet_id      = aws_subnet.intra[count.index].id
  route_table_id = aws_route_table.intra[0].id
}

# Database Subnet Group
resource "aws_db_subnet_group" "database" {
  count = length(var.private_subnets) >= 2 ? 1 : 0

  name       = "${var.name}-database"
  subnet_ids = aws_subnet.private[*].id

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-database"
    }
  )
}

# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "elasticache" {
  count = length(var.private_subnets) >= 2 ? 1 : 0

  name       = "${var.name}-elasticache"
  subnet_ids = aws_subnet.private[*].id

  tags = var.tags
}

# VPC Flow Logs
resource "aws_cloudwatch_log_group" "vpc_flow_log" {
  count = var.enable_flow_log && var.create_flow_log_cloudwatch_log_group ? 1 : 0

  name              = "/aws/vpc/flow-logs/${var.name}"
  retention_in_days = 14

  tags = var.tags
}

resource "aws_iam_role" "vpc_flow_log" {
  count = var.enable_flow_log && var.create_flow_log_cloudwatch_iam_role ? 1 : 0

  name = "${var.name}-vpc-flow-log"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "vpc_flow_log" {
  count = var.enable_flow_log && var.create_flow_log_cloudwatch_iam_role ? 1 : 0

  name = "${var.name}-vpc-flow-log"
  role = aws_iam_role.vpc_flow_log[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

resource "aws_flow_log" "vpc" {
  count = var.enable_flow_log ? 1 : 0

  iam_role_arn    = var.create_flow_log_cloudwatch_iam_role ? aws_iam_role.vpc_flow_log[0].arn : var.flow_log_cloudwatch_iam_role_arn
  log_destination = var.create_flow_log_cloudwatch_log_group ? aws_cloudwatch_log_group.vpc_flow_log[0].arn : var.flow_log_cloudwatch_log_group_arn
  traffic_type    = "ALL"
  vpc_id          = aws_vpc.main.id

  max_aggregation_interval = var.flow_log_max_aggregation_interval

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-flow-log"
    }
  )
}