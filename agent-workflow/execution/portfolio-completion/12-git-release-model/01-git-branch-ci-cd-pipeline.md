# Task 12-T1: Git Branching Strategy & GitHub Actions CI/CD Pipeline

## 1. Goal
Establish the Git branching strategy (`staging` $\rightarrow$ `main`), safely create the production `main` branch from `staging`, and configure GitHub Actions CI/CD workflows utilizing AWS ECR container image tags, protected production environment approvals, and Ansible deployment over AWS SSM.

## 2. Why
Enforces staging-grade software release practices with automated integration tests, protected production deployment environments, and reproducible container deployment over AWS SSM without exposing direct SSH ports.

## 3. Dependencies
- Phase 11 (Documentation & Portfolio Showcase).

## 4. Preconditions
- AWS ECR repositories and AWS SSM IAM permissions configured.

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - Git release model: Working branch `staging` $\rightarrow$ Production release branch `main`.
  - Creating `main` safely from `staging` when all verification gates pass.
  - `.github/workflows/ci.yml` — Runs linting, type checks, and unit tests on pull requests.
  - `.github/workflows/cd.yml` — Builds container images, pushes to AWS ECR tagged with immutable Git commit SHAs (`<aws_account_id>.dkr.ecr.ap-southeast-2.amazonaws.com/eventing-web:<sha>`), requires GitHub Protected Environment manual approval, and triggers Ansible container deployment over AWS SSM.
  - Single EC2 topology acknowledgment: Deployment performs container replacement via Docker Compose on target EC2 instance, undergoing a brief, expected service restart window (zero-downtime claims are explicitly avoided).
  - Rollback strategy: Re-deploying prior immutable image SHA tag from AWS ECR via Ansible over AWS SSM.
- **Out-of-Scope:**
  - Using GHCR container registry (AWS ECR is the sole container registry).
  - Using SSH key credentials for host access (AWS SSM is the sole remote access protocol).
  - Inventing `scripts/deploy.sh` wrapper scripts.

## 6. Likely Source Modules / Files
- `.github/workflows/` — [Discovery Target: CI/CD workflow definitions]
- `server/infra/ansible/` — [Discovery Target: Ansible deployment playbooks]

## 7. Contracts / Behavior to Preserve
- Conventional Commit message rules (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`).

## 8. Ordered Implementation Steps
1. Document Git branching policy in `RELEASE_MODEL.md`.
2. Update `.github/workflows/ci.yml` to run test suites in parallel for `server` and `web`.
3. Update `.github/workflows/cd.yml` specifying GitHub Protected Environment (`environment: production`) requiring manual reviewer sign-off.
4. Define immutable AWS ECR image tagging convention: `<ecr_repo>:<commit_sha>` and `<ecr_repo>:latest`.
5. Configure Ansible task execution over AWS SSM (`aws ssm send-command`).

## 9. Database / Migration Needs
- None.

## 10. Security Requirements
- AWS IAM credentials stored strictly in GitHub Encrypted Secrets.
- Enforce branch protection on `main` requiring passing CI status checks and protected environment approval.

## 11. Test / Build / Smoke Commands
- Test commands will be selected from Phase 00 inventory.

## 12. Acceptance Criteria
- [ ] CI workflow passes on pull requests against `staging` and `main`.
- [ ] Merge to `main` builds container images pushed to AWS ECR with immutable commit SHA tags.
- [ ] Protected GitHub environment requires manual approval before triggering Ansible deployment over AWS SSM.
- [ ] NO SSH keys or GHCR registries referenced in deployment pipeline.

## 13. Rollback / Feature-Flag Strategy
- Rollback via Ansible over SSM specifying previous immutable ECR image SHA tag (`-e image_tag=<previous_sha>`).

## 14. Required Artifacts / Handoff Report
- GitHub Actions CI/CD workflow configuration files and release strategy doc.

## 15. Blocker Questions
- Should staging environment deployments automatically trigger on push to `staging`?
