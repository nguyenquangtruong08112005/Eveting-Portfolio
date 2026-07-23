# Terraform AWS Infrastructure

Terraform is the source of truth for cloud infrastructure. Do not create EC2,
ECR, VPC, security groups, Elastic IPs, or Cloudflare DNS records manually for
this project unless you are doing temporary debugging.

## What Terraform Creates

- AWS VPC, public subnet, internet gateway, and route table
- EC2 security group
- EC2 IAM role + instance profile with `AmazonSSMManagedInstanceCore` for SSM access
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

- database password
- JWT secrets
- ZaloPay keys
- OneSignal REST API key
- R2/S3 secret key
- OpenWeather key

Put those in GitHub Actions secrets and local `.env` files only.

SSM does not require any secrets in Terraform — instance access is granted via the
IAM instance profile (AWS-managed `AmazonSSMManagedInstanceCore` policy). No SSH
key pair or private key is managed or stored by Terraform.

## Manual Bootstrap

You only need to prepare:

1. AWS credentials that can run Terraform.
2. Optional Cloudflare API token and zone id if Terraform should manage DNS.
3. Runtime provider secrets for Ansible/GitHub Actions.

No SSH key pair is needed — EC2 access is managed through AWS Systems Manager
(SSM) via the IAM instance profile attached by Terraform. Ansible connects
using the `amazon.aws.aws_ssm` connection plugin, which requires AWS credentials
with `ssm:StartSession` permission on the controller (e.g., GitHub Actions).

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

Then deploy (the controller must have AWS credentials with `ssm:StartSession`):

```bash
cd ../ansible
ansible-galaxy collection install amazon.aws
ansible-playbook -i inventory.ini playbook.yml --tags common,app \
  --extra-vars "environment=staging image_tag=<image-tag> aws_region=<aws-region>"
```

The SSM connection plugin uses your local AWS credentials (same as those used
for Terraform) to start a Session Manager session. No SSH key is required.

## GitHub Actions Usage

The deploy workflow can run Terraform first, capture Terraform outputs, then pass
the generated inventory to Ansible. If Terraform is disabled for a run, the
workflow falls back to the `ANSIBLE_INVENTORY` GitHub secret.

Required GitHub secrets for Terraform:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`

Optional DNS secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ZONE_ID`

Runtime/app secrets are documented in `server/infra/ansible/README.md`.

Ansible connects via the `amazon.aws.aws_ssm` plugin using the same AWS
credentials. No SSH key secrets are needed. The deploy credential must have
`ssm:StartSession`, `ssm:TerminateSession`, `ssm:DescribeInstanceInformation`,
and `ec2:DescribeInstances` permissions to use SSM.

## Required Deploy Credential Permissions

The IAM user or role used for deployment (e.g., GitHub Actions OIDC or access
keys) needs these permissions in addition to Terraform and ECR permissions:

| Action | Reason |
|--------|--------|
| `ssm:StartSession` | Initiate SSM session for Ansible |
| `ssm:TerminateSession` | Clean up SSM sessions |
| `ssm:DescribeInstanceInformation` | Discover managed instances |
| `ec2:DescribeInstances` | Resolve instance metadata |

These are not managed by this Terraform configuration — they must be attached to
the deploy principal outside of this project's Terraform (e.g., an IAM user or
GitHub OIDC role).

## Local Credential Note

The AWS CLI `aws login` profile can work for AWS CLI commands while still being
unusable by the Terraform AWS provider. If `terraform plan` reports `No valid
credential sources found`, run Terraform with standard AWS environment
credentials or use the GitHub Actions workflow with the AWS secrets above.
