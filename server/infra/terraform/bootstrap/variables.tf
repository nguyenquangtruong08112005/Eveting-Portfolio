variable "cloudflare_api_token" {
  description = "Cloudflare API token with R2 bucket provision permissions."
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare Account ID hosting the dedicated R2 state bucket."
  type        = string
}

variable "state_r2_bucket_name" {
  description = "Name of the dedicated Cloudflare R2 bucket for Terraform remote state."
  type        = string
  default     = "eventing-tfstate"
}
