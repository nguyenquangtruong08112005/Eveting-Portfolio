# Task 12-T2: Terraform IaC Review Gate & Immutable Image Rollout

## 1. Goal
Enforce Terraform Infrastructure-as-Code (IaC) plan review gates, Cloudflare R2 / S3 remote backend state management, and Ansible deployment procedures over AWS SSM.

## 2. Why
Prevents unintended infrastructure destruction or configuration drift by strictly forbidding un-reviewed `terraform apply` executions.

## 3. Dependencies
- Task `12-T1` (Git Branching Strategy & GitHub Actions CI/CD Pipeline).

## 4. Preconditions
- Terraform files readable under `server/infra/terraform/`.

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - Enforcing strict policy: **NEVER execute `terraform apply` without first generating and reviewing a plan file (`terraform plan -out=tfplan`).**
  - Remote backend state configuration using Cloudflare R2 or AWS S3 with state locking via DynamoDB.
  - Ansible deployment role verification checking immutable AWS ECR image tags before container restart on EC2.
  - Infrastructure rollback execution via Ansible over AWS SSM specifying prior ECR image SHA tag.
- **Out-of-Scope:**
  - Direct execution of un-reviewed `terraform apply` commands.
  - Inventing `scripts/deploy.sh` wrapper scripts or using SSH keys.

## 6. Likely Source Modules / Files
- `server/infra/terraform/` — [Discovery Target: Terraform IaC files]
- `server/infra/ansible/` — [Discovery Target: Ansible deployment playbooks]

## 7. Contracts / Behavior to Preserve
- Terraform state backend storage location and Cloudflare / AWS provider definitions.

## 8. Ordered Implementation Steps
1. Audit Terraform files (`main.tf`, `variables.tf`, `outputs.tf`) under `server/infra/terraform/`.
2. Configure remote backend state block for Cloudflare R2 / AWS S3 with state locking.
3. Document mandatory Terraform review workflow (`terraform plan -out=tfplan` $\rightarrow$ Human Review $\rightarrow$ `terraform apply tfplan`).
4. Update Ansible deployment playbook to inspect target AWS ECR image tag.
5. Test Terraform syntax validation (`terraform fmt -check` and `terraform validate`).

## 9. Database / Migration Needs
- None.

## 10. Security Requirements
- Terraform state file containing sensitive credentials MUST be stored encrypted at rest in remote backend state bucket.
- Zero un-reviewed `terraform apply` executions in CI/CD pipelines.

## 11. Test / Build / Smoke Commands
- Test commands will be selected from Phase 00 inventory.

## 12. Acceptance Criteria
- [ ] Strict policy documented requiring reviewed `tfplan` before any `terraform apply`.
- [ ] Terraform state configured with remote backend state locking.
- [ ] Ansible deployment over AWS SSM successfully updates container tags using immutable AWS ECR image SHAs.

## 13. Rollback / Feature-Flag Strategy
- Rollback target EC2 deployment by re-running Ansible playbook over SSM with prior immutable ECR image SHA tag.

## 14. Required Artifacts / Handoff Report
- Terraform validation log and Ansible playbook execution report.

## 15. Blocker Questions
- Should Cloudflare R2 credentials be stored in AWS Secrets Manager for Terraform runner access?
