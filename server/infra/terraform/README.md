# Terraform Deployment Infrastructure

This directory contains the Terraform configuration to provision the cloud infrastructure (AWS EC2 instance as an example) required to deploy the Eventing Backend and its Observability Stack.

## Files

- `main.tf`: Main configuration establishing providers, VPC, security groups, and virtual machines.
- `variables.tf`: Input variables schema (no defaults containing secrets).
- `outputs.tf`: Declared output fields (e.g. Public IP address).
- `terraform.tfvars.example`: Reference file for filling out environment-specific configuration values.

## Usage

1. Copy `terraform.tfvars.example` to `terraform.tfvars` and customize your configuration.
2. Initialize Terraform:
   ```bash
   terraform init
   ```
3. Plan the deployment to verify changes:
   ```bash
   terraform plan
   ```
4. Apply the configuration to provision infrastructure:
   ```bash
   terraform apply
   ```
5. Note the output server IP for use in Ansible deployments.
