# vibecoded-deployer

[![Lint](https://github.com/mohamedaminehamdi/vibecoded-deployer/actions/workflows/lint.yml/badge.svg?branch=main)](https://github.com/mohamedaminehamdi/vibecoded-deployer/actions/workflows/lint.yml)
[![License: MIT](https://img.shields.io/github/license/mohamedaminehamdi/vibecoded-deployer)](LICENSE)

**Publish a [Lovable](https://lovable.dev)-generated React app on your own domain, on AWS, from one GitHub Actions form.**

`vibecoded-deployer` is a control repository. You fill in a repo name, a domain and a subdomain, and the workflow provisions an S3 bucket, an ACM certificate and a CloudFront distribution with Terraform, points DNS at it (Route 53 or GoDaddy), builds your Lovable repo, uploads the result and invalidates the CDN cache. Later runs of the same form skip Terraform and only rebuild and upload.

Documentation site: <https://mohamedaminehamdi.github.io/vibecoded-deployer/>

## Contents

- [Why use it](#why-use-it)
- [How it works](#how-it-works)
- [Prerequisites](#prerequisites)
- [Quickstart](#quickstart)
- [Reference](#reference)
  - [Deploy workflow inputs](#deploy-workflow-inputs)
  - [Destroy workflow inputs](#destroy-workflow-inputs)
  - [Repository secrets](#repository-secrets)
  - [Values that are fixed in the code](#values-that-are-fixed-in-the-code)
  - [AWS permissions](#aws-permissions)
- [DNS: Route 53 vs GoDaddy](#dns-route-53-vs-godaddy)
- [Redeploying](#redeploying)
- [Teardown](#teardown)
- [Troubleshooting](#troubleshooting)
- [Limitations](#limitations)
- [Repository layout](#repository-layout)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

## Why use it

- **One form, one site.** A `workflow_dispatch` form takes five inputs and does the rest.
- **HTTPS by default.** An ACM certificate is requested for `<subdomain>.<domain_name>` and CloudFront redirects HTTP to HTTPS.
- **Your DNS provider.** Route 53 is fully automatic (certificate validation and the CNAME). GoDaddy gets its CNAME through the GoDaddy API; certificate validation is manual.
- **Fast redeploys.** When the bucket and the distribution already exist, Terraform is skipped and the run only builds, uploads and invalidates the cache.
- **One Terraform state per project**, stored in your own S3 bucket at `projects/<repo_name>/terraform.tfstate`.
- **Clean teardown.** A separate destroy workflow, guarded by a typed confirmation, removes the AWS resources, the DNS record and the state file.
- **Plain Terraform and Actions.** No custom runtime or hosted service. Everything runs in your GitHub and AWS accounts.

## How it works

Request path, once a site is live:

```text
visitor ──HTTPS──▶ <subdomain>.<domain_name>
                        │  CNAME (Route 53 or GoDaddy)
                        ▼
                   CloudFront  ◀── ACM certificate (us-east-1)
                        │  HTTP, origin = S3 website endpoint
                        ▼
                   S3 bucket  <subdomain>.<domain_name>   (us-west-2)
```

What the **Deploy Lovable Website** workflow does when you run it:

```text
 1. Check          bucket <subdomain>.<domain_name> exists?  CloudFront distribution for it exists?
                   both yes (and force_infrastructure is false) ──▶ skip steps 2 and 5
 2. Terraform      S3 bucket + ACM certificate + CloudFront distribution
                   (state: s3://<state bucket>/projects/<repo_name>/terraform.tfstate)
 3. Build          check out <owner>/<repo_name>, npm ci, npm run build, find out/ build/ or dist/
 4. Publish        aws s3 sync <build dir> to the bucket (--delete), invalidate "/*" in CloudFront
 5. DNS            create the CNAME <subdomain>.<domain_name> ──▶ CloudFront domain (TTL 600)
```

Terraform is split into three modules under `terraform/modules/`:

| Module | Creates |
| --- | --- |
| `s3` | Bucket named `<subdomain>.<domain_name>`, static website configuration (`index.html` for index and error documents), public access block turned off, bucket policy allowing public `s3:GetObject`. |
| `acm` | DNS-validated certificate for `<subdomain>.<domain_name>` in `us-east-1` (CloudFront only accepts certificates from that region). With a Route 53 zone it also creates the validation records and waits for validation. |
| `cloudfront` | Distribution with the S3 website endpoint as a custom HTTP origin, the ACM certificate, the site alias, HTTP to HTTPS redirect, compression, and 403/404 responses rewritten to `/index.html` with status 200 (single-page-app routing). |

## Prerequisites

| You need | Why |
| --- | --- |
| An AWS account and an IAM user (or role with static keys) | The workflows authenticate with long-lived access keys stored as repository secrets. See [AWS permissions](#aws-permissions). |
| A domain whose DNS is hosted in **Route 53** or **GoDaddy** | The workflow creates a CNAME for `<subdomain>.<domain_name>`. See [DNS](#dns-route-53-vs-godaddy). |
| A GitHub account or organization that owns **both** this repository and your Lovable repository | The workflow checks out `<owner of this repo>/<repo_name>`. Private Lovable repositories also need the optional `ACCESS_GITHUB_TOKEN` secret. |
| A Lovable repository that builds with `npm ci` and `npm run build` | `package-lock.json` must be committed and a `build` script must exist. The output must land in `out/`, `build/` or `dist/`. |
| Terraform 1.3 or newer and AWS credentials on your machine | Only for the one-time state bucket bootstrap. The workflows install their own Terraform. |

Costs: you pay AWS for what the workflow creates (S3 storage and requests, CloudFront transfer, Route 53 if you use it). ACM public certificates are free.

## Quickstart

### 1. Get your own copy of this repository

Fork it (or clone it and push it to a new repository) **into the GitHub account or organization that owns your Lovable repositories**. On a fork, open the **Actions** tab and enable workflows. Forks do not receive the original repository's secrets, so you add your own in step 3.

### 2. Create the Terraform state bucket (one time)

S3 bucket names are global, so the default name `lovable-deployer-terraform-state` is almost certainly taken. Choose your own:

```bash
cd terraform/bootstrap
terraform init
terraform apply -var="state_bucket_name=<your-unique-bucket-name>"
```

This creates one S3 bucket with versioning, AES256 encryption and all public access blocked. Locking uses S3's native lock file (`use_lockfile`), so no DynamoDB table is needed. Keep the bootstrap's local state file; do not migrate it into the bucket it created. If you chose a name other than the default, set the `TERRAFORM_STATE_BUCKET` secret to it (next step).

You do **not** need to create `terraform/backend.tf` or run `terraform init -migrate-state` for the workflows: they generate `backend.tf` on every run. See [terraform/bootstrap/README.md](terraform/bootstrap/README.md) for details.

### 3. Add repository secrets

Go to **Settings, Secrets and variables, Actions** and add the secrets you need. The full list is in [Repository secrets](#repository-secrets). Minimum for Route 53:

```bash
gh secret set AWS_ACCESS_KEY_ID
gh secret set AWS_SECRET_ACCESS_KEY
gh secret set TERRAFORM_STATE_BUCKET   # only if you did not use the default bucket name
```

(The `gh` commands are optional; the web UI works as well.) For GoDaddy also add `GODADDY_API_KEY` and `GODADDY_API_SECRET`.

### 4. Run the deploy workflow

**Actions, Deploy Lovable Website, Run workflow**, then fill in the [inputs](#deploy-workflow-inputs):

| Input | Example |
| --- | --- |
| `repo_name` | `my-lovable-site` |
| `domain_name` | `example.com` |
| `subdomain` | `my-site` |
| `dns_provider` | `route53` |

Or from the command line:

```bash
gh workflow run deploy-lovable-website.yml \
  -f repo_name=my-lovable-site \
  -f domain_name=example.com \
  -f subdomain=my-site \
  -f dns_provider=route53
```

### 5. Check the result

The run summary ends with `Website URL: https://my-site.example.com`. A first deployment includes certificate validation and CloudFront propagation, so allow several minutes; the Terraform apply step has a 20 minute timeout. DNS changes may take a little longer to be visible to everyone (the CNAME has a TTL of 600 seconds).

With **GoDaddy**, the first run needs one manual step and a second run. See [GoDaddy flow](#godaddy-flow).

## Reference

### Deploy workflow inputs

Workflow: `.github/workflows/deploy-lovable-website.yml` (name: **Deploy Lovable Website**), trigger `workflow_dispatch`.

| Input | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `repo_name` | string | yes | | Name of the Lovable repository, without the owner. It is checked out from `<owner of this repo>/<repo_name>` (default branch) and also names the Terraform state key `projects/<repo_name>/terraform.tfstate`. |
| `domain_name` | string | yes | | Root domain, for example `example.com`. For Route 53 it must exactly match the name of a hosted zone in the AWS account. |
| `subdomain` | string | yes | | Label to publish on. The site is served at `<subdomain>.<domain_name>`; the same string is the S3 bucket name and the certificate name. Apex domains are not supported. |
| `dns_provider` | choice | yes | none | `godaddy` or `route53`. The form lists `godaddy` first, so double-check your selection. |
| `force_infrastructure` | boolean | no | `false` | Run the Terraform and DNS steps even when the bucket and the CloudFront distribution already exist. Terraform applies whatever differs from its state; nothing is recreated unless Terraform decides to. |

### Destroy workflow inputs

Workflow: `.github/workflows/destroy-lovable-website.yml` (name: **Destroy Lovable Website**), trigger `workflow_dispatch`.

| Input | Type | Required | Description |
| --- | --- | --- | --- |
| `repo_name` | string | yes | The `repo_name` used at deploy time. It selects the Terraform state to destroy. |
| `domain_name` | string | yes | Root domain, as used at deploy time. |
| `subdomain` | string | yes | Subdomain, as used at deploy time. |
| `confirm_destroy` | string | yes | Must be exactly `DESTROY` (case sensitive). With any other value the job is skipped. |

### Repository secrets

Add them under **Settings, Secrets and variables, Actions, Repository secrets**.

| Secret | Required | Used by | Description |
| --- | --- | --- | --- |
| `AWS_ACCESS_KEY_ID` | always | deploy, destroy | Access key ID of the IAM user the workflows run as. |
| `AWS_SECRET_ACCESS_KEY` | always | deploy, destroy | Matching secret access key. |
| `GODADDY_API_KEY` | when `dns_provider` is `godaddy` | deploy; destroy (optional) | GoDaddy API key. In the destroy workflow, if this secret is set the workflow also tries to delete the GoDaddy CNAME. |
| `GODADDY_API_SECRET` | when `dns_provider` is `godaddy` | deploy, destroy | GoDaddy API secret. |
| `ACCESS_GITHUB_TOKEN` | only for Lovable repos the default token cannot read | deploy | Personal access token with read access to the Lovable repository contents. If unset, the workflow uses the built-in `github.token`. |
| `TERRAFORM_STATE_BUCKET` | only if your state bucket is not named `lovable-deployer-terraform-state` | deploy, destroy | Name of the S3 bucket created by the bootstrap. |

### Values that are fixed in the code

These are hard-coded. Changing them means editing the workflows and Terraform.

| Value | Where |
| --- | --- |
| AWS region `us-west-2` for the S3 bucket, the Terraform backend and all AWS CLI calls | both workflows, `terraform/main.tf`, `terraform/bootstrap/variables.tf` |
| AWS region `us-east-1` for the ACM certificate (a CloudFront requirement) | `terraform/main.tf` |
| Node.js 18 for the build | deploy workflow |
| Terraform: the latest release, installed by `hashicorp/setup-terraform` | both workflows |
| AWS provider `~> 5.0` | `terraform/main.tf`, `terraform/bootstrap/main.tf`, `terraform/modules/acm/versions.tf` |
| DNS record: CNAME with TTL 600 (certificate validation records: TTL 60) | deploy workflow, `terraform/modules/acm/main.tf` |
| CloudFront: IPv6 on, SNI-only, minimum TLS `TLSv1.2_2021`, HTTP to HTTPS redirect, compression on, cache TTLs min 0 / default 3600 / max 86400 seconds, no query strings or cookies forwarded | `terraform/modules/cloudfront/main.tf` |
| Cache invalidation path `/*` after every deploy | deploy workflow |

### AWS permissions

The IAM user behind `AWS_ACCESS_KEY_ID` needs to be able to:

- **S3**: create and configure the site bucket (website configuration, public access block, bucket policy), upload and delete objects in it, and read and write objects in the Terraform state bucket (including the lock file).
- **CloudFront**: list, get, create, update and delete distributions, and create invalidations.
- **ACM** (in `us-east-1`): request, describe and delete certificates.
- **Route 53** (only if you use it): list hosted zones, list and change record sets.

This repository does not ship a tested minimal IAM policy. A scoped-down policy is strongly recommended over administrator access; build it from the list above and test it with a throwaway domain before you rely on it.

## DNS: Route 53 vs GoDaddy

|  | Route 53 | GoDaddy |
| --- | --- | --- |
| Certificate validation records | Created by Terraform, then Terraform waits for the certificate to be issued | **You** create them by hand |
| Site CNAME | Upserted with the AWS CLI | Written with the GoDaddy API (`PUT .../records/CNAME/<subdomain>`) |
| Extra secrets | none | `GODADDY_API_KEY`, `GODADDY_API_SECRET` |
| First deploy | One run | Expect two runs (see below) |
| Hosted zone lookup | Automatic, by exact `domain_name` match | Not applicable |

"Route 53" and "GoDaddy" refer to where the domain's **DNS records are hosted**, not where it is registered. A domain registered at GoDaddy whose nameservers point at Route 53 should use `route53`.

### Route 53 flow

1. Create a public hosted zone named exactly like `domain_name` in the same AWS account as your credentials, and make sure the domain's nameservers point to it.
2. Run the deploy workflow with `dns_provider = route53`.
3. The workflow looks up the zone ID with `aws route53 list-hosted-zones-by-name` and fails with `Could not find Route 53 hosted zone` if it is missing. Terraform then creates the certificate, writes its validation records into the zone, waits for issuance and creates the CloudFront distribution.
4. After the upload, the workflow upserts the CNAME `<subdomain>.<domain_name>` pointing at the CloudFront domain.

### GoDaddy flow

1. Create a GoDaddy API key and secret (production environment) and store them as `GODADDY_API_KEY` and `GODADDY_API_SECRET`. GoDaddy may limit API access depending on account type; confirm yours has it.
2. Run the deploy workflow with `dns_provider = godaddy`.
3. Terraform requests the certificate but, without a Route 53 zone, creates no validation records and does not wait for issuance. CloudFront only accepts an issued certificate, so on a first run the Terraform apply step is expected to fail when it reaches CloudFront. That step is marked `continue-on-error`, so the job keeps going and may still end green.
4. Add the certificate's validation CNAME record in GoDaddy yourself. Find the name and value in the ACM console (region `us-east-1`) or with `terraform output certificate_validation_records` using the same backend configuration. Wait until ACM shows the certificate as **Issued**.
5. Run the workflow again with the same inputs. The bucket exists but the distribution does not, so Terraform runs again, reuses the certificate from state and creates the distribution. The workflow then writes the CNAME through the GoDaddy API.

Steps 3 to 5 are derived from reading the workflow and Terraform code. They have not been exercised end to end; if your first run behaves differently, please open an issue. Moving the domain's DNS to Route 53 avoids the manual step entirely.

## Redeploying

Push your changes to the Lovable repository's default branch, then run **Deploy Lovable Website** again with the **same** inputs. If the S3 bucket `<subdomain>.<domain_name>` and a CloudFront distribution whose origin contains that bucket name both exist, the workflow skips Terraform and DNS, then builds, uploads (`aws s3 sync --delete`) and invalidates `/*`. If either one is missing, it runs the full flow. Set `force_infrastructure` to `true` to run the Terraform and DNS steps anyway, for example to repair drift.

## Teardown

1. **Actions, Destroy Lovable Website, Run workflow.**
2. Enter `repo_name`, `domain_name` and `subdomain` exactly as used at deploy time, and `DESTROY` as `confirm_destroy`.

The workflow looks for Terraform state under `projects/<repo_name>/`. When state exists it:

1. Empties the S3 bucket, including object versions and delete markers.
2. Runs `terraform destroy` (bucket, certificate, distribution, and the Route 53 certificate validation records if there were any).
3. Waits for the distribution if it is still being disabled, and tries to delete the ACM certificate if it still exists (both best effort).
4. Deletes the state file (and its `.backup`) from the state bucket.

Whether or not state exists, the workflow also tries to delete the CNAME `<subdomain>.<domain_name>`: in the Route 53 zone named `domain_name` if one is found, and at GoDaddy if `GODADDY_API_KEY` is set. Both attempts are best effort and both run regardless of which provider you used. Because of that, a mistyped `repo_name` with a correct domain and subdomain leaves the AWS resources in place but still removes the DNS record, even though the run summary says no resources were removed.

This is irreversible. It does **not** touch your Lovable repository, the state bucket created by the bootstrap, or any validation CNAME you added by hand in GoDaddy. To remove the state bucket itself, empty it and run `terraform destroy` in `terraform/bootstrap`.

## Troubleshooting

| Symptom | Likely cause and fix |
| --- | --- |
| `Could not find Route 53 hosted zone for ...` | There is no hosted zone named exactly `domain_name` in the AWS account behind your keys. Create it, or check for a typo, a trailing subdomain, or a different account. |
| Job is green but the site does not load | The Terraform apply step is `continue-on-error`. Open its log. If **Verify Infrastructure** was skipped, the apply failed. With GoDaddy this is expected on the first run; see [GoDaddy flow](#godaddy-flow). |
| Terraform init fails: bucket not found or access denied | The state bucket does not exist, is named differently from `TERRAFORM_STATE_BUCKET` (or the default), is in a region other than `us-west-2`, or your IAM user cannot read and write it. |
| `Error acquiring the state lock` | A cancelled run left a lock file next to the state object. Run `terraform force-unlock <LOCK_ID>` with the same backend configuration, or delete the `.tflock` object in the state bucket once you are sure no run is active. |
| `BucketAlreadyExists` | Bucket names are global. `<subdomain>.<domain_name>` is already used by another AWS account. Pick another subdomain. |
| `Repository not found` when checking out the Lovable repo | `repo_name` is misspelled, the repo belongs to a different owner than this control repo, or it is private and `ACCESS_GITHUB_TOKEN` is missing or lacks access. |
| `npm ci` fails | The Lovable repo has no `package-lock.json`, or it is out of sync with `package.json`. Commit an up-to-date lock file. |
| `Could not find build output directory` | `npm run build` did not produce `out/`, `build/` or `dist/`. |
| Old content after a deploy | The invalidation step is `continue-on-error`; check it. CloudFront's default TTL here is one hour, and browsers cache too. |
| The name does not resolve | DNS propagation (TTL 600), or the wrong DNS host: the CNAME was written to the provider you selected, which must be the one your nameservers point to. Check with `dig <subdomain>.<domain_name> CNAME`. |
| Destroy workflow shows the job as skipped | `confirm_destroy` was not exactly `DESTROY`. |
| Destroy fails with a non-empty bucket | The emptying step makes one `delete-objects` call, which AWS limits to 1000 keys. Empty the bucket manually and run destroy again. |

More detail and a FAQ: <https://mohamedaminehamdi.github.io/vibecoded-deployer/troubleshooting.html>

## Limitations

- **One deployment per `repo_name`.** The Terraform state key contains only the repo name. Deploying the same repo to a second subdomain or domain would plan changes to the first deployment's resources. Use a distinct repo for each site.
- **Subdomains only.** The certificate, alias and bucket are all `<subdomain>.<domain_name>`; the apex domain and `www` redirects are not handled.
- **Same owner.** The Lovable repo is read from the same GitHub owner as this repository, at its default branch. There is no branch or tag input.
- **Static output only.** The build must produce plain static files, and `npm ci` needs a committed `package-lock.json`.
- **The bucket is public** and CloudFront reaches it over HTTP through the S3 website endpoint (no origin access control). Anyone can read the objects directly from the bucket's website endpoint. Do not host private content.
- **Fixed regions** (`us-west-2`, plus `us-east-1` for the certificate) and a fixed Node.js version (18).
- **Long-lived AWS keys.** The workflows do not use GitHub OIDC.
- **GoDaddy certificate validation is manual**, so the first GoDaddy deployment takes two runs.
- **Failures can be quiet.** Terraform apply and cache invalidation are `continue-on-error`, and the run summary text is fixed, so always check the step logs.
- **Very large sites.** Teardown empties the bucket with a single `delete-objects` call, which handles at most 1000 keys.
- **No automated tests** run against a real AWS account. CI only checks formatting, `terraform validate` and workflow syntax.

## Repository layout

```text
.
├── .github/
│   ├── workflows/
│   │   ├── deploy-lovable-website.yml   # provision, build, upload, DNS
│   │   ├── destroy-lovable-website.yml  # tear everything down
│   │   ├── lint.yml                     # terraform fmt/validate, actionlint
│   │   └── pages.yml                    # publishes docs/ to GitHub Pages
│   ├── ISSUE_TEMPLATE/
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── dependabot.yml
├── docs/                                # static documentation site (no build step)
├── terraform/
│   ├── main.tf, variables.tf, outputs.tf
│   ├── backend.tf.example               # only for running Terraform locally
│   ├── bootstrap/                       # one-time state bucket
│   └── modules/
│       ├── s3/
│       ├── acm/
│       └── cloudfront/
├── CHANGELOG.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE
├── SECURITY.md
└── README.md
```

## Contributing

Issues and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first; it explains how to run the checks locally and what to include in a pull request. Everyone taking part is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Security

Please report vulnerabilities privately through GitHub's **Report a vulnerability** form, not in a public issue. See [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE), copyright (c) 2026 Mohamed Amine Hamdi.
