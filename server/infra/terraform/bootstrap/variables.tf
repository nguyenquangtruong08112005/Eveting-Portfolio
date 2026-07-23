variable "project_name" {
  description = "Name of the project."
  type        = string
  default     = "eventing"
}

variable "aws_region" {
  description = "AWS region for infrastructure."
  type        = string
  default     = "ap-southeast-2"
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "staging"
}
