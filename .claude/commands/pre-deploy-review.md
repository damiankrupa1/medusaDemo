---
description: Reviews deployment readiness, environment risks, secrets, migrations and the ability to roll back. Does not deploy without approval.
disable-model-invocation: true
---

# Pre-deploy Review

## Scope
This is a readiness review, not approval to deploy. Do not deploy, run production migrations, change DNS, rotate secrets, delete data or perform any other external operations.

## Analysis
If the repository has its own deployment documentation, base the review on it. In this project that is `docs/deployment-railway.md`, especially the "Production deployment checklist" and "Troubleshooting" sections.

Check the relevant files and configuration without revealing secret values:
- environment variables required in production and whether they are set (do not print values);
- separation of development/staging/production configuration;
- build/deploy commands and ports;
- application health, logging and error handling;
- database migrations, backward compatibility and the backup/rollback plan;
- file storage, public URLs and permissions;
- Redis, queues, worker/server mode, if applicable;
- webhooks, idempotency and payment error handling, if applicable;
- CORS, cookies, HTTPS, permissions and the risk of exposing data;
- monitoring and the ability to verify after deployment.

Do not assume a service exists — mark items as "not applicable" or "unconfirmed".

## Tests and commands
Do not run linters, tests, builds or deployment commands without first agreeing on the scope with the user. Do not read or print secrets. Do not run migrations in production.

## Report
Present:
- status: ready / ready with risks / not ready / insufficient data;
- blockers and high risks;
- other risks;
- proposed verification commands;
- the deployment and rollback plan;
- items that need confirmation.

Stop before any operation that changes an external system and ask for explicit approval of that specific operation.
