# Ansible Deployment Playbook

This directory contains Ansible playbooks to configure a Linux host, install Docker, copy application code, and launch the backend service alongside the observability stack.

## Directory Structure

- `inventory.ini.example`: Example inventory file listing host IPs and SSH user details.
- `playbook.yml`: Master playbook organizing the deployment process.
- `roles/`: Modular deployment tasks:
  - `common`: Installs updates, Docker, Docker Compose, Git, etc.
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
