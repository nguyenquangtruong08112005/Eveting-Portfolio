output "state_r2_bucket_name" {
  description = "Dedicated Cloudflare R2 bucket name created for Terraform remote state."
  value       = cloudflare_r2_bucket.tf_state.name
}

output "cloudflare_account_id" {
  description = "Cloudflare Account ID hosting the R2 state bucket."
  value       = var.cloudflare_account_id
}
