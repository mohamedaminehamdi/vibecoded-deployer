## What and why

<!-- What does this change, and why? Link the issue it closes, if any. -->

## Type of change

- [ ] Bug fix
- [ ] New behavior in the deploy or destroy workflow
- [ ] Terraform change
- [ ] Documentation or docs site
- [ ] CI, tooling or repository housekeeping

## Checklist

- [ ] `terraform fmt -check -recursive` passes
- [ ] `terraform init -backend=false && terraform validate` passes in `terraform/` and `terraform/bootstrap/` (if Terraform changed)
- [ ] Workflow changes pass actionlint (see CONTRIBUTING.md)
- [ ] README and `docs/` are updated if behavior, inputs or secrets changed
- [ ] `CHANGELOG.md` is updated under "Unreleased"
- [ ] No secrets, account IDs, state files, `backend.tf` or `*.tfvars` are included

## How was this tested?

<!-- Describe what you ran. If you could not test against a real AWS account, say so. -->
