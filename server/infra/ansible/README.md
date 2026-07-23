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

The `amazon.aws` collection must be installed on the Ansible controller:

```bash
ansible-galaxy collection install amazon.aws
```

The controller must have AWS credentials with `ssm:StartSession`,
`ssm:TerminateSession`, `ssm:DescribeInstanceInformation`, and
`ec2:DescribeInstances` permissions. These are typically provided by the
GitHub Actions OIDC role or AWS access keys.

## Usage

1. Copy `inventory.ini.example` to `inventory.ini` and input the EC2 **instance ID** (not IP).
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
  --extra-vars "environment=staging image_tag=<sha> aws_region=ap-southeast-1"
```

The GitHub workflow passes provider/runtime secrets as environment variables so shell quoting cannot corrupt secret values. Required environment variables include `ECR_REGISTRY`, `ECR_PASSWORD`, `PUBLIC_API_URL`, `POSTGRES_PASSWORD`, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, and `JWT_TICKET_SECRET`.

For GitHub Actions, the inventory is generated dynamically from Terraform output
and uses the instance ID with `ansible_connection=amazon.aws.aws_ssm`. No SSH
key secrets are needed.

## Connection

This playbook uses the `amazon.aws.aws_ssm` connection plugin to reach EC2
instances through AWS Systems Manager Session Manager. Benefits:

- No SSH key pair to manage or store
- Access is governed by IAM — the instance profile has `AmazonSSMManagedInstanceCore`
- All traffic goes through AWS SSM — no public SSH port required in the security group
- Session activity is logged in AWS CloudTrail
