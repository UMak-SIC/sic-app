This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## CI and Deployments

GitHub Actions runs `pnpm lint` and `pnpm build` for changes to this app. The workflow is defined in [`../.github/workflows/ci.yml`](../.github/workflows/ci.yml).

Vercel handles deployments through its Git integration; no GitHub CD workflow is required. Configure the Vercel project with `app` as its Root Directory and `main` as its Production Branch.

- Pushes to `main` create production deployments.
- Pushes to `staging` create Vercel Preview deployments for the staging environment.
- Pull requests create their own Vercel Preview deployments.

Set production secrets in Vercel's Production environment and staging or PR secrets in its Preview environment. A `staging` deployment is a Preview deployment by default. If it must instead be a separate production deployment, add an explicit Vercel CLI/API CD workflow.

### Staging Services

Staging is viable on the free tiers for internal QA and light traffic, but it must not share production identities, data, or storage:

- **Clerk:** use a separate development instance for staging. Staging users and webhook configuration must be isolated from production.
- **Neon:** use a separate staging database branch or project. Never connect staging to the production database.
- **Filebase:** use a separate staging bucket. If that is not possible, use a dedicated `staging/` prefix and credentials limited to that prefix.

Configure the staging service credentials as Vercel Preview environment variables and production credentials as Production variables. Free tiers make this setup practical for a small team, but their deployment, database, identity, storage, and request quotas are capacity limits rather than an isolation boundary.
