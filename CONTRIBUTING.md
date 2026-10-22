# Contributing to vibecoded-deployer

Thanks for your interest in improving `vibecoded-deployer`. Bug reports, documentation fixes and focused pull requests are all welcome.

By participating you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md). By contributing you agree that your contributions are licensed under the [MIT License](LICENSE).

## Before you start

- **Bugs and ideas:** search [existing issues](https://github.com/mohamedaminehamdi/vibecoded-deployer/issues) first, then open one with the matching template. For anything non-trivial, please open an issue and agree on the approach before writing a large pull request.
- **Security problems:** do not open a public issue. Follow [SECURITY.md](SECURITY.md).
- **Questions about using the project:** read the [README](README.md) and the [troubleshooting guide](https://mohamedaminehamdi.github.io/vibecoded-deployer/troubleshooting.html) first.

Never paste secrets, state files or unredacted AWS account details into issues or pull requests.

## What is in the repository

| Path | What it is |
| --- | --- |
| `.github/workflows/deploy-lovable-website.yml`, `destroy-lovable-website.yml` | The product: provisioning, build, upload, DNS and teardown. |
| `terraform/` and `terraform/modules/` | S3, ACM and CloudFront infrastructure. |
| `terraform/bootstrap/` | One-time state bucket. |
| `.github/workflows/lint.yml`, `pages.yml` | CI and docs publishing. |
| `docs/` | Static documentation site, plain HTML, CSS and a little JavaScript. No build step. |

## Development setup

You need Git and, depending on what you change:

- **Terraform** (any recent 1.x release; CI uses 1.12.2) for `terraform/`.
- **Docker** (or a local [actionlint](https://github.com/rhysd/actionlint) binary) for checking workflows.
- **Python 3** (or any static file server) to preview the docs site.

### Checks to run before you open a pull request

These are the same checks CI runs. None of them needs AWS credentials.

```bash
# Terraform formatting (from the repository root)
terraform fmt -check -recursive

# Terraform validation, once per root module
for dir in terraform terraform/bootstrap; do
  (cd "$dir" && terraform init -backend=false -input=false && terraform validate)
done

# Workflow linting (the image is the one pinned in lint.yml)
docker run --rm -v "$PWD:/repo" --workdir /repo \
  rhysd/actionlint:1.7.7@sha256:887a259a5a534f3c4f36cb02dca341673c6089431057242cdc931e9f133147e9 \
  -ignore 'SC2002:style' -ignore 'SC2086:info' -ignore 'SC2129:style'
```

`terraform init` creates a `.terraform/` directory (and possibly a lock file) that is git-ignored. Do not commit them.

### Previewing the docs

```bash
python3 -m http.server 8000 --directory docs
# open http://localhost:8000/
```

Each page is a standalone HTML file; the header, navigation and footer are repeated in every page, so a change to them has to be made in all of them.

The site is deployed to GitHub Pages under a sub-path (`/vibecoded-deployer/`), so it must only use **relative** URLs. Do not add root-relative links (`/assets/...`) or an external CSS/JS dependency.

### Testing deploy and destroy changes

There are no automated end-to-end tests: the workflows create real AWS resources. If you change workflow or Terraform behavior, test it in a throwaway AWS account with a domain you control, and say in the pull request what you ran and what you could not test. Change one thing at a time; a failed apply can leave partial infrastructure behind.

## Pull request guidelines

1. Branch from `main`. Existing branches use prefixes such as `feature/`, `fix/` and `feat/`.
2. Keep the change focused. Unrelated cleanups belong in their own pull request.
3. Update the [README](README.md), the matching page in `docs/` and the [CHANGELOG](CHANGELOG.md) (under "Unreleased") whenever behavior, inputs, secrets or defaults change. Documentation that disagrees with the code is a bug.
4. Write commit messages as a short imperative summary, for example `Add Route 53 zone lookup`, with details in the body if needed.
5. Fill in the pull request template, and make sure CI is green.

### Style

- Terraform: run `terraform fmt`; keep variable and output descriptions accurate; avoid hard-coding values that already have a variable.
- Workflows: pin third-party actions (a full commit SHA with a version comment is preferred for new workflows), declare the least `permissions:` the job needs, and never echo secrets.
- Markdown and HTML: plain, accurate, no marketing claims the code does not back up.
- Follow [`.editorconfig`](.editorconfig).

## Reviews

Maintainers review pull requests on a best-effort basis. Expect questions about edge cases, backward compatibility for people with existing deployments, and what happens when a step fails halfway.
