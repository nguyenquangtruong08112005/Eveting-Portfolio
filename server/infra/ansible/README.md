# Ansible Deployment Playbook

This directory contains Ansible playbooks to configure a Linux host, install Docker, copy application code, and launch the backend service alongside the observability stack.

## Directory Structure

- `inventory.ini.example`: Example inventory file listing host IPs and SSH user details.
- `playbook.yml`: Master playbook organizing the deployment process.
- `roles/`: Modular deployment tasks:
  - `common`: Installs updates, Docker, Docker Compose, Git, etc.
  - `app`: Renders app compose/env, pulls ECR images, runs migrations, restarts API/web.
  - `observability`: Sets up log paths, copies configs, and runs the observability docker-compose stack.

## Prerequisites

The Ansible controller requires `boto3`, `botocore`, and the `amazon.aws` collection:

```bash
pip install boto3 botocore ansible
ansible-galaxy collection install amazon.aws
```

The controller must have AWS credentials with permissions for SSM and the S3 transfer bucket:
- SSM: `ssm:StartSession`, `ssm:TerminateSession`, `ssm:DescribeInstanceInformation`, `ec2:DescribeInstances`
- S3 Bucket: `s3:ListBucket`, `s3:GetBucketLocation` on `arn:aws:s3:::<ssm-transfer-bucket>`
- S3 Objects: `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` on `arn:aws:s3:::<ssm-transfer-bucket>/*`

These are typically provided by the GitHub Actions OIDC role or AWS access keys.
**The target EC2 instance does not need S3 IAM credentials**, because Ansible generates presigned URLs for remote file transfers over the SSM channel.

## Usage

1. Copy `inventory.ini.example` to `inventory.ini` and input the EC2 **instance ID** (not IP) along with `ansible_aws_ssm_bucket_name`.
2. Run the playbook:
   ```bash
   ansible-playbook -i inventory.ini playbook.yml
   ```

To restrict the deployment to only the observability stack, use tags:
   ```bash
   ansible-playbook -i inventory.ini playbook.yml --tags observability
   ```

To deploy the application stack from CI, pass at least:

```bash
ansible-playbook -i inventory.ini playbook.yml --tags common,app \
  --extra-vars "environment=staging image_tag=<sha> aws_region=ap-southeast-2"
```

The GitHub workflow passes provider/runtime secrets as environment variables so shell quoting cannot corrupt secret values. Required environment variables include `ECR_REGISTRY`, `ECR_PASSWORD`, `PUBLIC_API_URL`, `POSTGRES_PASSWORD`, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, and `JWT_TICKET_SECRET`.

For GitHub Actions, the inventory is generated dynamically from Terraform output
and uses the instance ID with `ansible_connection=amazon.aws.aws_ssm` and the Terraform-created S3 transfer bucket (`ansible_aws_ssm_bucket_name`). No SSH key secrets are needed.

## Connection & Security

This playbook uses the `amazon.aws.aws_ssm` connection plugin to reach EC2
instances through AWS Systems Manager Session Manager.

Benefits & Safeguards:
- No SSH key pair to manage or store
- EC2 access is governed by IAM — the instance profile has `AmazonSSMManagedInstanceCore`
- All inbound traffic goes through AWS SSM — no public SSH port (22) in the security group
- Session activity is logged in AWS CloudTrail
- S3 transfer bucket uses default `AES256` encryption, public access block, no versioning, and auto-cleanup lifecycle policy (1 day)
- Remote host uses presigned URLs — EC2 role requires zero S3 IAM permissions

> [!WARNING]
> Module/task arguments can transiently pass runtime secrets through the S3 transfer bucket during execution. Sensitive tasks should use `no_log: true` or environment variables on the remote host.

