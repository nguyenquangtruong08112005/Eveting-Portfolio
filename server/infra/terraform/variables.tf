variable "project_name" {
  description = "Short project name used for AWS resource names."
  type        = string
  default     = "eventing"
}

variable "aws_region" {
  description = "AWS region to deploy resources in."
  type        = string
  default     = "ap-southeast-2"
}

variable "environment" {
  description = "Deployment environment."
  type        = string
  default     = "staging"

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be staging or production."
  }
}

variable "vpc_cidr" {
  description = "CIDR block for the Eventing VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for the public subnet."
  type        = string
  default     = "10.0.1.0/24"
}

variable "availability_zone" {
  description = "Optional availability zone for the public subnet. Leave null to let AWS choose."
  type        = string
  default     = null
}

variable "instance_type" {
  description = "EC2 instance size for the one-instance portfolio deployment."
  type        = string
  default     = "t3.medium"
}

variable "root_volume_size_gb" {
  description = "EC2 root disk size in GB."
  type        = number
  default     = 40
}

variable "allowed_http_cidr" {
  description = "CIDR block allowed to reach HTTP/HTTPS."
  type        = string
  default     = "0.0.0.0/0"
}

variable "allowed_debug_cidr" {
  description = "CIDR block allowed to reach direct debug ports such as 3000/3001."
  type        = string
  default     = "127.0.0.1/32"
}

variable "expose_backend_port" {
  description = "Expose backend port 3000 directly. Prefer false when routing through 80/443."
  type        = bool
  default     = false
}

variable "expose_observability_ports" {
  description = "Expose Grafana port 3001 directly. Prefer false unless debugging from a locked CIDR."
  type        = bool
  default     = false
}

variable "ecr_image_tag_mutability" {
  description = "ECR image tag mutability."
  type        = string
  default     = "MUTABLE"

  validation {
    condition     = contains(["MUTABLE", "IMMUTABLE"], var.ecr_image_tag_mutability)
    error_message = "ecr_image_tag_mutability must be MUTABLE or IMMUTABLE."
  }
}

variable "ecr_untagged_image_retention_days" {
  description = "How long ECR keeps untagged images."
  type        = number
  default     = 14
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token for DNS automation. Prefer CLOUDFLARE_API_TOKEN env var in CI."
  type        = string
  default     = null
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone id. Leave empty to skip DNS records."
  type        = string
  default     = ""
}

variable "cloudflare_dns_records" {
  description = "Optional Cloudflare A records pointed at the EC2 Elastic IP."
  type = map(object({
    name    = string
    ttl     = number
    proxied = bool
  }))
  default = {}
}
