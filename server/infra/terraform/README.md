# Terraform AWS Infrastructure

Terraform is the source of truth for cloud infrastructure. Do not create EC2,
ECR, VPC, security groups, Elastic IPs, or Cloudflare DNS records manually for
this project unless you are doing temporary debugging.

## What Terraform Creates

- AWS VPC, public subnet, internet gateway, and route table
- EC2 security group
- EC2 SSH key pair from your public key
- One Ubuntu EC2 instance for the portfolio/demo stack
- Elastic IP attached to that EC2 instance
- ECR repositories:
  - `eventing-api`
  - `eventing-web`
- ECR scan-on-push and lifecycle cleanup for untagged images
- Optional Cloudflare DNS A records pointing to the Elastic IP
- Deployment outputs for GitHub Actions and Ansible

## What Terraform Does Not Store

Runtime secrets stay out of Terraform state:

- SSH private key
- database password
- JWT secrets
- ZaloPay keys
- OneSignal REST API key
- R2/S3 secret key
- OpenWeather key

Put those in GitHub Actions secrets and local `.env` files only.

## Manual Bootstrap

You only need to prepare:

1. AWS credentials that can run Terraform.
2. An SSH key pair.
3. Optional Cloudflare API token and zone id if Terraform should manage DNS.
4. Runtime provider secrets for Ansible/GitHub Actions.

Generate an SSH key if needed:

```bash
ssh-keygen -t ed25519 -C "eventing-deployer" -f ~/.ssh/eventing_ec2
```

Use the `.pub` value as `ssh_public_key`.
Use the private key value as GitHub Actions secret `EC2_SSH_PRIVATE_KEY`.

## Local Usage

```bash
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform fmt
terraform validate
terraform plan
terraform apply
```

After apply, generate an Ansible inventory:

```bash
terraform output -raw ansible_inventory > ../ansible/inventory.ini
```

Then deploy:

```bash
cd ../ansible
ansible-playbook -i inventory.ini playbook.yml --tags common,app \
  --extra-vars "environment=staging image_tag=<image-tag> aws_region=<aws-region>"
```

## GitHub Actions Usage

The deploy workflow can run Terraform first, capture Terraform outputs, then pass
the generated inventory to Ansible. If Terraform is disabled for a run, the
workflow falls back to the `ANSIBLE_INVENTORY` GitHub secret.

Required GitHub secrets for Terraform:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `TERRAFORM_SSH_PUBLIC_KEY`
- `TERRAFORM_ALLOWED_SSH_CIDR`

Optional DNS secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ZONE_ID`

Runtime/app secrets are documented in `server/infra/ansible/README.md`.

## Local Credential Note

The AWS CLI `aws login` profile can work for AWS CLI commands while still being
unusable by the Terraform AWS provider. If `terraform plan` reports `No valid
credential sources found`, run Terraform with standard AWS environment
credentials or use the GitHub Actions workflow with the AWS secrets above.
