# Phase 12: Git Flow, Release Model & Infrastructure Gates

## Overview
Phase 12 establishes the formal Git branching model, safe creation of the production `main` branch from `staging`, automated GitHub Actions CI/CD pipelines, immutable Docker image tagging, manual environment approval gates, rollback procedures, and the strict enforcement rule: **No Terraform apply without a reviewed plan file.**

## Deliverables
- Branch strategy blueprint (`main`, `staging`, `feature/*`) and safe release sync workflow.
- GitHub Actions CI/CD workflow updates (`.github/workflows/ci.yml`, `.github/workflows/cd.yml`).
- Infrastructure approval rules enforcing `terraform plan -out=tfplan` review prior to execution.
- Automated Docker image tagging strategy using Git commit SHAs and version tags (`v1.0.0`).

## Tasks
1. [`01-git-branch-ci-cd-pipeline.md`](01-git-branch-ci-cd-pipeline.md) — Git Branching Strategy & GitHub Actions CI/CD Pipeline
2. [`02-terraform-iac-environment-approvals.md`](02-terraform-iac-environment-approvals.md) — Terraform IaC Review Gate & Immutable Image Rollout
