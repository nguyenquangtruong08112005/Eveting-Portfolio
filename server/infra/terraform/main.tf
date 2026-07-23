terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

data "aws_caller_identity" "current" {}

locals {
  name_prefix = "${var.project_name}-${var.environment}"

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  ecr_repositories = toset([
    "${var.project_name}-api",
    "${var.project_name}-web",
  ])

  create_cloudflare_dns = var.cloudflare_zone_id != "" && length(var.cloudflare_dns_records) > 0
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(local.tags, {
    Name = "${local.name_prefix}-vpc"
  })
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidr
  map_public_ip_on_launch = true
  availability_zone       = var.availability_zone

  tags = merge(local.tags, {
    Name = "${local.name_prefix}-public-subnet"
  })
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(local.tags, {
    Name = "${local.name_prefix}-igw"
  })
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(local.tags, {
    Name = "${local.name_prefix}-public-rt"
  })
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "server" {
  name        = "${local.name_prefix}-server-sg"
  description = "Eventing demo EC2 ingress and egress"
  vpc_id      = aws_vpc.main.id

  tags = merge(local.tags, {
    Name = "${local.name_prefix}-server-sg"
  })
}

resource "aws_vpc_security_group_ingress_rule" "http" {
  security_group_id = aws_security_group.server.id
  description       = "HTTP"
  cidr_ipv4         = var.allowed_http_cidr
  from_port         = 80
  ip_protocol       = "tcp"
  to_port           = 80
}

resource "aws_vpc_security_group_ingress_rule" "https" {
  security_group_id = aws_security_group.server.id
  description       = "HTTPS"
  cidr_ipv4         = var.allowed_http_cidr
  from_port         = 443
  ip_protocol       = "tcp"
  to_port           = 443
}

resource "aws_vpc_security_group_ingress_rule" "backend_api" {
  count             = var.expose_backend_port ? 1 : 0
  security_group_id = aws_security_group.server.id
  description       = "Direct backend API access for debug only"
  cidr_ipv4         = var.allowed_debug_cidr
  from_port         = 3000
  ip_protocol       = "tcp"
  to_port           = 3000
}

resource "aws_vpc_security_group_ingress_rule" "grafana" {
  count             = var.expose_observability_ports ? 1 : 0
  security_group_id = aws_security_group.server.id
  description       = "Grafana debug access"
  cidr_ipv4         = var.allowed_debug_cidr
  from_port         = 3001
  ip_protocol       = "tcp"
  to_port           = 3001
}

resource "aws_vpc_security_group_egress_rule" "all_ipv4" {
  security_group_id = aws_security_group.server.id
  description       = "Allow all outbound IPv4"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

resource "aws_iam_role" "app_server" {
  name = "${local.name_prefix}-app-server-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(local.tags, {
    Name = "${local.name_prefix}-app-server-role"
  })
}

resource "aws_iam_role_policy_attachment" "ssm_managed" {
  role       = aws_iam_role.app_server.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "app_server" {
  name = "${local.name_prefix}-app-server-profile"
  role = aws_iam_role.app_server.name

  tags = merge(local.tags, {
    Name = "${local.name_prefix}-app-server-profile"
  })
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "app_server" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.server.id]
  iam_instance_profile   = aws_iam_instance_profile.app_server.name

  root_block_device {
    volume_size           = var.root_volume_size_gb
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = true
  }

  tags = merge(local.tags, {
    Name = "${local.name_prefix}-server"
  })
}

resource "aws_eip" "app_server" {
  domain   = "vpc"
  instance = aws_instance.app_server.id

  tags = merge(local.tags, {
    Name = "${local.name_prefix}-eip"
  })
}

resource "aws_ecr_repository" "app" {
  for_each             = local.ecr_repositories
  name                 = each.key
  image_tag_mutability = var.ecr_image_tag_mutability

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(local.tags, {
    Name = each.key
  })
}

resource "aws_ecr_lifecycle_policy" "app" {
  for_each   = aws_ecr_repository.app
  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images after ${var.ecr_untagged_image_retention_days} days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = var.ecr_untagged_image_retention_days
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

resource "cloudflare_dns_record" "app" {
  for_each = local.create_cloudflare_dns ? var.cloudflare_dns_records : {}

  zone_id = var.cloudflare_zone_id
  name    = each.value.name
  type    = "A"
  content = aws_eip.app_server.public_ip
  proxied = each.value.proxied
  ttl     = each.value.proxied ? 1 : each.value.ttl
  comment = "Managed by Terraform for ${local.name_prefix}"
}
