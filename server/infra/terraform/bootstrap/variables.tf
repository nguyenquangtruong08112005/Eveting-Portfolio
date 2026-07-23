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
  description = "Scope or environment tag for shared bootstrap resources."
  type        = string
  default     = "shared"
}
