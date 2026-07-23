# Ansible Deployment Playbook

This directory contains Ansible playbooks to configure a Linux host, install Docker, copy application code, and launch the backend service alongside the observability stack.

## Directory Structure

- `inventory.ini.example`: Example inventory file listing host IPs and SSH user details.
- `playbook.yml`: Master playbook organizing the deployment process.
- `roles/`: Modular deployment tasks:
  - `common`: Installs updates, Docker, Docker Compose, Git, etc.
  - `app`: Renders app compose/env, pulls ECR images, runs migrations, restarts API/web.
  - `observability`: Sets up log paths, copies configs, and runs the observability docker-compose stack.

## Usage

1. Copy `inventory.ini.example` to `inventory.ini` and input your server IP and credentials.
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

For GitHub Actions, set `EC2_SSH_PRIVATE_KEY` to the private key that can SSH into the EC2 host, and make `ANSIBLE_INVENTORY` use:

```ini
[app_servers]
<ec2-public-ip> ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/eventing_ec2
```
