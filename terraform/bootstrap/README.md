# Bootstrap: Terraform remote state bucket

This directory creates the S3 bucket that holds the Terraform state of every site deployed by the workflows. Run it **once**, with local state, before the first deployment.

## What this creates

- **S3 bucket** for state files, with versioning enabled.
- **Encryption** at rest (AES256).
- **Public access fully blocked.**

Locking is done by Terraform's S3 backend itself (`use_lockfile = true`, a lock object next to the state file), so no DynamoDB table is created. `use_lockfile` needs Terraform 1.10 or newer; the workflows install the latest Terraform, so this only matters if you run Terraform against the backend on your own machine.

## Prerequisites

- Terraform 1.3.0 or newer (this directory's own requirement)
- AWS credentials in your environment with permission to create S3 buckets

## Usage

### 1. Choose a bucket name

S3 bucket names are global across all AWS accounts, and the default `lovable-deployer-terraform-state` is almost certainly taken. Pick a unique name. Variables:

| Variable | Default | Description |
| --- | --- | --- |
| `state_bucket_name` | `lovable-deployer-terraform-state` | Name of the state bucket. Must be globally unique. |
| `aws_region` | `us-west-2` | Region of the bucket. The workflows hard-code `us-west-2` for the backend, so keep the default unless you also edit them. |

### 2. Apply

```bash
cd terraform/bootstrap
terraform init
terraform plan -var="state_bucket_name=<your-unique-bucket-name>"
terraform apply -var="state_bucket_name=<your-unique-bucket-name>"
```

Type `yes` when prompted. Afterwards, `terraform output` shows `s3_bucket_name` and `s3_bucket_arn`.

### 3. Tell the workflows which bucket to use

If you used a name other than the default, add a repository secret named `TERRAFORM_STATE_BUCKET` with the bucket name (Settings, Secrets and variables, Actions). If you kept the default, no secret is needed.

That is all the deploy and destroy workflows need. They write `terraform/backend.tf` themselves on every run, using the key `projects/<repo_name>/terraform.tfstate`, so you do not create `backend.tf` and you do not migrate any state.

> `terraform apply` also prints a `next_steps` output that mentions copying `backend.tf.example` and running `terraform init -migrate-state`. That describes the optional case below; you can ignore it when using only the workflows.

## Optional: run the main Terraform locally against a project's state

Only needed if you want to inspect a site's state or outputs from your machine (for example `terraform output certificate_validation_records` for a GoDaddy deployment):

```bash
cd terraform
cp backend.tf.example backend.tf
# edit backend.tf: bucket = your bucket, key = projects/<repo_name>/terraform.tfstate
terraform init -reconfigure
terraform output
```

`backend.tf` is listed in `.gitignore`; do not commit it.

## Notes

- **Run this once.** The bootstrap state stays on your machine (`terraform.tfstate` in this directory, also git-ignored). Do not migrate it into the bucket it created; that would be circular. Back it up if you want to be able to manage or destroy the bucket later.
- **Name collisions.** If `apply` reports that the bucket already exists, choose a different `state_bucket_name`.

## Cleanup

Destroying the bootstrap deletes the state backend. Make sure no site still depends on it (run the destroy workflow for each site first), and note that Terraform cannot delete a bucket that still contains objects or versions, so empty it first.

```bash
cd terraform/bootstrap
terraform destroy -var="state_bucket_name=<your-unique-bucket-name>"
```
