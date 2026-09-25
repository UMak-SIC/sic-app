TEST

# sic-app

SIC App (pronounced “Sikap”) is the central website for all things SIC.

## Getting Started

The Next.js application lives in [`app/`](app/). Use **pnpm** for dependency
management; the app pins pnpm `11.26.0` in `app/package.json`.

### Prerequisites

- Node.js 22 or later
- Corepack (included with supported Node.js distributions)

### Run locally

```bash
git clone https://github.com/UMak-SIC/sic-app.git
cd sic-app/app
corepack enable
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the development workflow and
branching guidelines.
