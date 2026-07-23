output "instance_public_ip" {
  description = "Elastic public IP address of the EC2 app server."
  value       = aws_eip.app_server.public_ip
}

output "instance_id" {
  description = "AWS EC2 instance id."
  value       = aws_instance.app_server.id
}

output "security_group_id" {
  description = "Application server security group id."
  value       = aws_security_group.server.id
}

output "ecr_registry" {
  description = "AWS ECR registry host used by Docker and Ansible."
  value       = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
}

output "ecr_repository_urls" {
  description = "ECR repository URLs for application images."
  value = {
    for name, repo in aws_ecr_repository.app : name => repo.repository_url
  }
}

output "ssm_transfer_bucket" {
  description = "Name of the private S3 bucket used for SSM Ansible file transfers."
  value       = aws_s3_bucket.ssm_transfer.id
}

output "ansible_inventory" {
  description = "Ansible inventory generated from Terraform-managed EC2, using SSM connection."
  value       = <<-EOT
    [app_servers]
    ${aws_instance.app_server.id} ansible_connection=amazon.aws.aws_ssm ansible_user=ubuntu

    [all:vars]
    ansible_python_interpreter=/usr/bin/python3
    ansible_aws_ssm_bucket_name=${aws_s3_bucket.ssm_transfer.id}
    ansible_aws_ssm_bucket_sse_mode=AES256
    ansible_aws_ssm_region=${var.aws_region}
    environment=${var.environment}
    project_root=/opt/server-eventing
  EOT
}

output "cloudflare_records" {
  description = "Cloudflare DNS records created by Terraform."
  value = {
    for key, record in cloudflare_dns_record.app : key => {
      name    = record.name
      content = record.content
      proxied = record.proxied
    }
  }
}
