# BOSQ ERP: Multi-Environment Deployment & Management Guide

This guidebook outlines the operational architecture, Git workflows, database migration rules, and hosting setups for managing **BOSQ ERP** across two environments:
1. **Beta Staging** (Hosted on **Vercel** connected to the `master` branch).
2. **Production** (Hosted on **AWS** connected to the `main` branch).

---

## 1. Environment & Architecture Overview

To ensure data integrity, prevent system outages, and maintain high performance, both environments are completely isolated.

```mermaid
graph TD
    subgraph Git Workspace
        Dev[Local Feature Branch]
        Master[master Branch]
        Main[main Branch]
    end

    subgraph Beta Environment (Vercel)
        Vercel[Vercel Hosting Engine]
        BetaDB[(Beta Database)]
        BetaSP[SharePoint Beta Folder]
    end

    subgraph Production Environment (AWS)
        AWS[AWS ECS Fargate / ALB]
        ProdDB[(AWS RDS Production DB)]
        ProdSP[SharePoint Production Folder]
    end

    Dev -->|Pull Request| Master
    Master -->|Auto Deploy| Vercel
    Vercel --> BetaDB
    Vercel --> BetaSP

    Master -->|Validated Release PR| Main
    Main -->|CI/CD Deploy Pipeline| AWS
    AWS --> ProdDB
    AWS --> ProdSP
```

---

## 2. Environment Variables & Credentials Separation

You must configure different environments variables for both platforms. Never reuse keys or URLs between environments.

### Variable Mapping Reference

| Variable Name | Beta Environment (Vercel) | Production Environment (AWS) |
| :--- | :--- | :--- |
| `NODE_ENV` | `development` (or `staging`) | `production` |
| `NEXTAUTH_URL` | `https://beta.yourdomain.com` | `https://yourdomain.com` |
| `DATABASE_URL` | `postgresql://user:pass@staging-db.neon.tech/...` | `postgresql://user:pass@production-rds.amazonaws.com/...` |
| `SHAREPOINT_FOLDER_PATH` | `/Beta/Quotations` | `/Production/Quotations` |
| `NEXT_PUBLIC_APP_ENV` | `beta` | `production` |

> [!WARNING]
> Keep your Production database credentials restricted. Only CI/CD build scripts or authorized system administrators should have access to your AWS RDS Production connection string.

---

## 3. Database Management & Prisma Schema Migrations

Prisma handles schemas differently during development and production. Violating these rules can lead to data loss.

### Workflow for Making Schema Changes

1. **Development**:
   Modify `prisma/schema.prisma` locally. Run the development migration:
   ```bash
   npx prisma migrate dev --name add_new_fields
   ```
   *This creates a new sql migration file in your `/prisma/migrations` folder and updates your local DB.*

2. **Beta / Vercel Deployment**:
   - Commit the generated migration files and push to `master`.
   - Vercel's build command should run `prisma generate`.
   - Staging migration should run as part of a post-deploy script or manually via CLI:
     ```bash
     npx prisma migrate deploy
     ```

3. **Production / AWS Deployment**:
   - Merge `master` into `main`.
   - **Never run `prisma db push` on your Production Database.** This can drop tables or overwrite columns if there is a mismatch.
   - Run the deployment pipeline. The pipeline should execute:
     ```bash
     npx prisma migrate deploy
     ```
     *This safely applies only the pending migration scripts to your production RDS database without downtime.*

---

## 4. Hosting Next.js on AWS (Production)

To achieve maximum performance and avoid cold starts, use **AWS ECS Fargate** with Docker.

### Dockerfile for Production Next.js

Create a `Dockerfile` at the root of the project to package Next.js:

```dockerfile
# 1. Install dependencies
FROM node:24-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# 2. Rebuild the source code
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# 3. Production image, copy all files and run next
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
```

> [!TIP]
> Ensure you update your `next.config.js` to enable standalone output:
> ```js
> module.exports = {
>   output: 'standalone',
> }
> ```

---

## 5. Automated CI/CD Pipeline (GitHub Actions)

Create a GitHub Actions pipeline in `.github/workflows/deploy-production.yml` to automate the deployment to AWS ECS when code is merged into `main`.

```yaml
name: Deploy Production to AWS ECS

on:
  push:
    branches:
      - main

jobs:
  deploy:
    name: Build & Deploy
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push Docker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: bosq-erp-prod
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG -t $ECR_REGISTRY/$ECR_REPOSITORY:latest .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY --all-tags

      - name: Run Prisma Database Migrations
        env:
          DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
        run: |
          npm ci
          npx prisma migrate deploy

      - name: Deploy AWS ECS Task
        uses: aws-actions/amazon-ecs-deploy-task-definition@v2
        with:
          task-definition: task-definition.json
          service: bosq-erp-service
          cluster: bosq-erp-cluster
          wait-for-service-stability: true
```

---

## 6. Verification & Rollback Plans

### Staging/Beta Verification Check
Before merging `master` into `main`:
1. Check that the Next.js Vercel build succeeded.
2. Confirm the database migration is complete on Staging.
3. Conduct end-to-end tests (quotation creation, revision, search, and dashboard loading).

### Rollback Strategy on AWS
If a bug occurs in production:
1. Revert the commit on `main` or trigger the GitHub action using the previous Git commit SHA.
2. Since RDS migrations are additive, the previous application container can run safely even if new optional database columns exist.
