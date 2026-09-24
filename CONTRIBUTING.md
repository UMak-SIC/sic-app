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

We use short-lived branches off `main`. **Never commit directly to `main`.**

| Branch Prefix | Purpose                                 | Example                     |
| :------------ | :-------------------------------------- | :-------------------------- |
| `feature/`    | New pages, components, or functionality | `feature/events-page`       |
| `fix/`        | Bug fixes                               | `fix/mobile-nav-overflow`   |
| `hotfix/`     | Urgent fixes for production             | `hotfix/broken-signup-link` |
| `chore/`      | Tooling, dependencies, config           | `chore/update-deps`         |
| `docs/`       | Documentation changes                   | `docs/contributing`         |
| `design/`     | UI/UX experiments (may not merge)       | `design/homepage-v2`        |

### Workflow

1.  **Create a branch** from `main`:
    ```bash
    git switch main
    git pull
    git switch -c feature/your-change
    ```

2.  **Make your changes** and commit with a clear message.

3.  **Push** your branch:
    ```bash
    git push -u origin feature/your-change
    ```

4.  **Open a Pull Request** against `main`. Our [PR template](.github/PULL_REQUEST_TEMPLATE.md)
    will guide you through the required information.

5.  **Request a review** from a maintainer.

6.  **Address feedback** by pushing additional commits to your branch.

7.  Once approved and checks pass, a maintainer will merge your PR.

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/).

Format: `<type>: <short description>`

Examples:
- `feat: add events listing page`
- `fix: correct padding on contact form`
- `docs: update setup instructions in CONTRIBUTING`
- `chore: bump vite to v6`

## Pull Request Requirements

- Your branch must be up to date with `main`.
- At least one maintainer approval is required.
- If your PR changes UI, include screenshots or a screen recording.

## Reporting Bugs / Requesting Features

Please use the GitHub Issues tab. Templates are available for
[bug reports](.github/ISSUE_TEMPLATE/BUG_REPORT_ISSUE_TEMPLATE.md) and
[feature requests](.github/ISSUE_TEMPLATE/FEATURE_REQUEST_ISSUE_TEMPLATE.md).

## Questions?

Ask in [your org’s Discord/Slack/chat channel] or open a
discussion on GitHub.
