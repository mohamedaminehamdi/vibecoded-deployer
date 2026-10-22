# Security Policy

## Supported versions

`vibecoded-deployer` has no tagged releases yet. Only the latest commit on the `main` branch is supported; fixes are made there.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Use GitHub's private vulnerability reporting instead:

1. Go to the repository's **Security** tab.
2. Choose **Report a vulnerability** (or open <https://github.com/mohamedaminehamdi/vibecoded-deployer/security/advisories/new>).
3. Describe the problem, how to reproduce it, and the impact you see.

Reports are handled privately between you and the maintainers, and a fix can be prepared in a private fork before anything is disclosed. Maintainers will respond on a best-effort basis; there is no guaranteed response time. Please allow a reasonable period to investigate and release a fix before you disclose the issue publicly.

Include only what is needed to understand the problem. Never include real AWS keys, GoDaddy credentials, tokens or Terraform state files in a report.

## Scope

In scope: vulnerabilities in the workflows, Terraform and documentation of this repository, for example

- a way for workflow inputs or repository content to execute unintended commands or leak secrets,
- Terraform that creates resources more open than documented,
- documentation that instructs an insecure setup.

Out of scope: vulnerabilities in GitHub, AWS, GoDaddy, Terraform or Lovable themselves (report those to the vendor), and issues in the applications you deploy with this tool.

## Security notes for people who run it

These are properties of the current design, documented so you can decide whether they fit your threat model.

- **The site bucket is public.** The S3 module disables the public access block and attaches a policy that allows anyone to `s3:GetObject`. CloudFront reaches the bucket's website endpoint over HTTP. Anyone can read the files directly from the bucket endpoint. Deploy only content that is meant to be public.
- **Long-lived credentials.** The workflows use `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` repository secrets (and, for GoDaddy, `GODADDY_API_KEY` and `GODADDY_API_SECRET`). Give the IAM user only the permissions listed in the README, rotate the keys regularly, and treat anyone who can edit workflows or run them as holding those credentials.
- **Who can run the workflows.** Anyone with write access to your copy of this repository can dispatch the deploy and destroy workflows, and workflow edits on any branch they can push to run with your secrets. Keep write access small and protect `main`.
- **Workflow inputs go into shell commands.** The workflows interpolate inputs such as `domain_name` and `subdomain` directly into `run:` scripts. Only people you trust should be able to trigger them.
- **Private Lovable repositories.** If you set `ACCESS_GITHUB_TOKEN`, scope it to read-only access on the specific repositories you deploy.
- **Terraform state** can contain resource attributes. The bootstrap bucket blocks public access and encrypts objects, but access to it should still be limited to the deploy IAM user and administrators.
