# Contributing to SIC App

Thanks for your interest in helping build our org's central website! This guide will help you get started.

## Code of Conduct

By participating, you agree to uphold our [Code of Conduct](CODE_OF_CONDUCT.md). Please report any unacceptable behavior to [joaquinluis.guevarra.96@gmail.com](emailto:joaquinluis.guevarra.96@gmail.com).

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v22 or later)
- [Git](https://git-scm.com/)
- Corepack (included with supported Node.js distributions; used to run the pinned pnpm version)
- A code editor (VS Code recommended)

### Local Development Setup

```bash
# Clone the repository
git clone https://github.com/UMak-SIC/sic-app.git
cd sic-app

# Enter the Next.js app
cd app

# Enable Corepack and install the pinned pnpm version and dependencies
corepack enable
pnpm install

# Start the development server
pnpm dev
```

The site should now be running at `http://localhost:3000` (or whichever port
your framework uses). Use pnpm for app scripts and dependency changes; the
app pins pnpm `11.26.0` in `app/package.json` and tracks dependencies in
`app/pnpm-lock.yaml`.

## Branching Strategy

We use a four-tier branch strategy. **Never commit directly to `dev`, `staging`, or `main`.**

| Tier | Branch | Purpose | Pull Request Target |
| :--- | :----- | :------ | :------------------ |
| 1 | Feature branches (`feat/*`, `design/*`, or `**/**`) | Isolated work for features, fixes, docs, chores, and design | `dev` |
| 2 | `dev` | Reviewed development integration | `staging` |
| 3 | `staging` | QA and release validation | `main` |
| 4 | `main` | Production | None |

Branch ancestry flows from stable to active work:

```text
main (ancestor) <- staging (ancestor) <- dev <- feature branch
```

In other words, `main` is the ancestor of `staging`, and `staging` is the ancestor of `dev`. Pull requests flow in the opposite direction as changes are promoted: feature branch -> `dev` -> `staging` -> `main`.

Changes move through the tiers in order:

```text
feature branch -> dev -> staging -> main (production)
```

### Workflow

1.  **Create a branch** from `dev`:
    ```bash
    git switch dev
    git pull
    git switch -c feat/your-change
    ```

2.  **Make your changes** and commit with a clear message.

3.  **Push** your branch:
    ```bash
    git push -u origin feat/your-change
    ```

4.  **Open a Pull Request** from your feature branch into `dev` for code review. Our [PR template](.github/PULL_REQUEST_TEMPLATE.md)
    will guide you through the required information.

5.  **Request a review** from a maintainer.

6.  **Address feedback** by pushing additional commits to your branch.

7.  Once approved and checks pass, a maintainer will merge your PR into `dev`.

8.  A maintainer opens a PR from `dev` into `staging` for QA. After QA approval,
    a maintainer opens a PR from `staging` into `main` to release to production.

### Merge Rules

- Contributors without maintainer access must request a maintainer review before a PR can be merged.
- Use a merge commit for every PR and branch promotion. Do not use squash merges.
- Rebase only to update your own feature branch with its target branch before review or merge. Do not rebase shared branches: `dev`, `staging`, or `main`.
- Do not force-push shared branches.

## Commit Message Guidelines

This is an agent-first repository. Every commit MUST follow Conventional Commits 1.0.0 so its intent is clear to people and automation.

### Format

```text
<type>[optional scope][optional !]: <description>

[optional body]

[optional footer(s)]
```

- `type` is required and lowercase. Use `feat` for new functionality and `fix` for bug fixes.
- Use a scope when it adds useful context: `feat(auth): add password reset`.
- Keep the description short and imperative.
- Add a body after one blank line when the change needs context beyond the summary.
- Add footers after one blank line. Use Git trailer-style tokens such as `Refs: #123` or `Reviewed-by: Name`.
- Mark breaking changes with `!` before the colon, a `BREAKING CHANGE: <description>` footer, or both. `BREAKING CHANGE` must be uppercase.
- Other allowed types include `build`, `chore`, `ci`, `docs`, `style`, `refactor`, `perf`, `test`, and `revert`.
- Split unrelated changes into separate commits rather than assigning multiple types to one commit.

Examples:
- `feat: add events listing page`
- `fix: correct padding on contact form`
- `docs: update setup instructions in CONTRIBUTING`
- `chore: bump vite to v6`
- `feat(api)!: remove legacy event endpoint`

```text
feat: allow provided config object to extend other configs

BREAKING CHANGE: the `extends` key now references another config file.
```

## Pull Request Requirements

- Feature branch PRs must target `dev` and be up to date with `dev`.
- Promotion PRs must follow `dev` -> `staging` -> `main`.
- At least one maintainer approval is required.
- Every PR must include and pass relevant integration tests.
- Bug-fix PRs must include regression coverage and an end-to-end test for the fixed behavior.
- If your PR changes UI, include screenshots or a screen recording.

## Reporting Bugs / Requesting Features

Please use the GitHub Issues tab. Templates are available for
[bug reports](.github/ISSUE_TEMPLATE/BUG_REPORT_ISSUE_TEMPLATE.md) and
[feature requests](.github/ISSUE_TEMPLATE/FEATURE_REQUEST_ISSUE_TEMPLATE.md).

## Questions?

Ask in [your org’s Discord/Slack/chat channel] or open a
discussion on GitHub.
