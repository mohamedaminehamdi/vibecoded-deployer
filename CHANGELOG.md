# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The project has not tagged a versioned release yet, so everything is listed under "Unreleased" and in the pre-release history below. Once releases are tagged, this file will follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Open-source project files: MIT `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1), `SECURITY.md`, this changelog, issue forms and a pull request template, Dependabot configuration for GitHub Actions and Terraform, and `.editorconfig`.
- `lint.yml` workflow: `terraform fmt -check`, `terraform init -backend=false` plus `terraform validate` for `terraform/` and `terraform/bootstrap/`, and actionlint for the workflow files. It needs no secrets and runs with read-only permissions.
- Documentation site in `docs/` (static HTML, CSS and JavaScript, no build step) and the `pages.yml` workflow that publishes it to GitHub Pages.

### Changed

- Redesigned the documentation site: a dark, technical look with a looping replay of a deploy run on the home page (stage names and log lines taken from the deploy workflow), flowing arrows in the architecture diagrams, terminal-style code blocks, and a reading-progress line. A header button pauses all animation, and the OS "reduce motion" setting turns it off by default; with motion off the home page shows its finished state. Oxanium and JetBrains Mono are now self-hosted in `docs/assets/fonts/` under the SIL Open Font License 1.1, so the site still makes no external requests.
- Renamed the project to `vibecoded-deployer`. The default Terraform state bucket name (`lovable-deployer-terraform-state`) is unchanged so that existing setups keep working.
- Rewrote `README.md`: architecture, prerequisites, quickstart, full input and secret reference, the Route 53 and GoDaddy flows, teardown, troubleshooting and known limitations.
- Corrected the setup documentation (`README.md`, `terraform/bootstrap/README.md`, `terraform/backend.tf.example`): the workflows write `backend.tf` themselves, so no state migration is needed for them, and the default state bucket name is unlikely to be available because S3 bucket names are global.
- Reworded workflow input descriptions and examples in the deploy and destroy workflows (text only).
- Applied `terraform fmt` (whitespace only).
- Extended `.gitignore` (plans, crash logs, override files, `.env` files, keys, `node_modules/`, `lovable-app/`).

## Pre-release history (2025-12-27 to 2026-01-02)

Summarized from the project's development history before the first public release. Dates are the original commit dates; that history is not published in this repository.

### Added

- 2025-12-28: Deploy workflow and Terraform for S3 static website hosting, with DNS through GoDaddy or Route 53.
- 2025-12-29: Optional `ACCESS_GITHUB_TOKEN` secret for checking out the Lovable repository, falling back to the default token.
- 2025-12-29: CloudFront distribution in front of S3; Terraform split into `s3` and `cloudfront` modules; the workflow invalidates the cache and points DNS at CloudFront.
- 2025-12-29: `acm` module that requests a DNS-validated certificate in `us-east-1`: validated automatically when a Route 53 zone is available, manually otherwise.
- 2026-01-02: Destroy workflow, and a bootstrap configuration for the remote Terraform state bucket with one state key per project (`projects/<repo_name>/terraform.tfstate`).
- 2026-01-02: S3 native state locking (`use_lockfile`) instead of DynamoDB in the documented backend setup; `terraform/backend.tf.example`.
- 2026-01-02: Destroy workflow `domain_name` and `subdomain` inputs, and deletion of the Route 53 and GoDaddy CNAME records.
- 2026-01-02: Automatic Route 53 hosted zone lookup in the deploy workflow (no zone ID input), plus a Terraform refresh step and an infrastructure verification step.
- 2026-01-02: Redeploy mode that skips Terraform when the bucket and the distribution already exist, and the `force_infrastructure` input.

### Changed

- 2025-12-29: Deployment region switched from `us-east-1` to `us-west-2`; the workflow now checks and configures the bucket and detects the build output directory (`out`, `build` or `dist`).
- 2025-12-29: Terraform apply made non-blocking (`continue-on-error`) with a shorter timeout.
- 2025-12-29: Allowed origin SSL protocols on the CloudFront distribution widened.
- 2026-01-02: Redeploy detection requires both the bucket and the CloudFront distribution to exist before Terraform is skipped.

### Fixed

- 2026-01-02: CloudFront now uses the S3 website endpoint as its origin instead of the regional website domain; `terraform_wrapper: false` set in both workflows.
- 2026-01-02: Destroy workflow reads resource IDs with `terraform output` instead of `terraform state show`.
- 2026-01-02: Route 53 record deletion matches the existing record's value and TTL, and GoDaddy deletion is skipped when no API key is configured.
