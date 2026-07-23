output "state_bucket_name" {
  description = "Deterministic name of the private S3 bucket created for Terraform remote state."
  value       = aws_s3_bucket.tf_state.id
}

output "aws_account_id" {
  description = "AWS Account ID hosting the state bucket."
  value       = data.aws_caller_identity.current.account_id
}
