<p align="center">
  <a href="https://www.medusajs.com">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/59018053/229103275-b5e482bb-4601-46e6-8142-244f531cebdb.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-4970-8a1f-c6af37f087bf.svg">
    <img alt="Medusa logo" src="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-4970-8a1f-c6af37f087bf.svg">
    </picture>
  </a>
</p>
<h1 align="center">
  Medusa DTC Starter
</h1>

<h4 align="center">
  <a href="https://docs.medusajs.com">Documentation</a> |
  <a href="https://www.medusajs.com">Website</a>
</h4>

<p align="center">
  Building blocks for digital commerce
</p>
<p align="center">
  <a href="https://github.com/medusajs/medusa/blob/develop/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="Medusa is released under the MIT license." />
  </a>
  <a href="https://circleci.com/gh/medusajs/medusa">
    <img src="https://circleci.com/gh/medusajs/medusa.svg?style=shield" alt="Current CircleCI build status." />
  </a>
  <a href="https://github.com/medusajs/medusa/blob/develop/CONTRIBUTING.md">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat" alt="PRs welcome!" />
  </a>
    <a href="https://www.producthunt.com/posts/medusa"><img src="https://img.shields.io/badge/Product%20Hunt-%231%20Product%20of%20the%20Day-%23DA552E" alt="Product Hunt"></a>
  <a href="https://discord.gg/xpCwq3Kfn8">
    <img src="https://img.shields.io/badge/chat-on%20discord-7289DA.svg" alt="Discord Chat" />
  </a>
  <a href="https://twitter.com/intent/follow?screen_name=medusajs">
    <img src="https://img.shields.io/twitter/follow/medusajs.svg?label=Follow%20@medusajs" alt="Follow @medusajs" />
  </a>
</p>

# Medusa DTC Starter

A Medusa v2 backend for a direct-to-consumer ecommerce store. The maintained Nuxt storefront lives separately in the `nuxt-starter-medusa` repository. An old/template `apps/storefront` directory may also exist in this checkout; it is not the maintained storefront.

## Features

- All of [Medusa's commerce features](https://docs.medusajs.com/resources/commerce-modules)
- Multi-region support with automatic country detection
- Product catalog with variant selection
- Cart with promotion codes
- Multi-step checkout with shipping and payment
- Customer accounts with order history and address management
- Order transfer between accounts

## Getting Started

### Deploy with Medusa Cloud

The fastest way to get started is deploying with [Medusa Cloud](https://cloud.medusajs.com):

1. [Create a Medusa Cloud account](https://cloud.medusajs.com)
2. Deploy this starter directly from your dashboard

### Local Installation

> **Prerequisites:
>
> - [Node.js](https://nodejs.org/) v20+
> - [PostgreSQL](https://www.postgresql.org/) v15+ (or [Docker](https://www.docker.com/), see below)
> - [pnpm](https://pnpm.io/) v10+

1. Clone the repository and install dependencies:

```bash
git clone https://github.com/medusajs/dtc-starter.git
cd dtc-starter
pnpm install
```

2. Set up environment variables for the backend:

```bash
cp apps/backend/.env.template apps/backend/.env
```

3. Get PostgreSQL and Redis running, either:

   - **Docker** (no local install needed) - starts PostgreSQL, Redis and
     an S3-compatible MinIO for local file storage:

     ```bash
     docker compose up -d
     ```

     Then set in `apps/backend/.env`:

     ```bash
     DATABASE_URL=postgres://medusa:medusa@localhost:5432/medusa
     REDIS_URL=redis://localhost:6379
     ```

     Full details (ports, MinIO setup, resetting data): [docs/local-development.md](docs/local-development.md).

   - **Native install** - set the database URL in `apps/backend/.env`:

     ```bash
     # Replace with actual database URL, make sure the database exists.
     DATABASE_URL=postgres://postgres:@localhost:5432/medusa-dtc-starter
     ```

4. Run migrations:

```bash
cd apps/backend
pnpm medusa db:migrate
```

5. Add admin user:

```bash
cd apps/backend
pnpm medusa user -e admin@test.com -p supersecret
```

6. Start Medusa backend:

```bash
cd apps/backend
pnpm dev
```

7. Open the admin dashboard at `localhost:9000/app` and log in. Retrieve your publishable API key at Settings > Publishable API key.

8. For the storefront, clone or open the separate `nuxt-starter-medusa` repository. Follow that repository's README and agent instructions for its environment variables, development command, ports, and deployment. Do not use this repository's workspace scripts or configuration to manage the storefront, and do not mistake an old/template `apps/storefront` directory here for the maintained Nuxt application.

## Deployment

The backend (`apps/backend`) deploys as a Docker image (`Dockerfile.backend`)
to Railway - Server and Worker services from the same image, PostgreSQL,
Redis and S3-compatible storage. Full setup (required services, environment
variables, health checks, backups): [docs/deployment-railway.md](docs/deployment-railway.md).

The Nuxt storefront is maintained and deployed separately from the `nuxt-starter-medusa` repository. Follow that repository's deployment instructions.

## Resources

- [Medusa Documentation](https://docs.medusajs.com)
- [Medusa Cloud](https://cloud.medusajs.com)
