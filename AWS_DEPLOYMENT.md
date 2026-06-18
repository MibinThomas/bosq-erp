# AWS Deployment & Database Setup Guide: BOSQ ERP

This guide provides step-by-step instructions for provisioning, configuring, and deploying the **BOSQ ERP Next.js** application and **Prisma PostgreSQL** database in production on AWS.

---

## 1. Database Setup (Amazon RDS PostgreSQL)

We use Amazon RDS (Relational Database Service) with the PostgreSQL engine.

### Step-by-Step Creation:
1. Log into the **AWS Management Console**.
2. Search for **RDS** and click **Create database**.
3. Choose **Standard create**.
4. **Engine Options**: Select **PostgreSQL**.
5. **Templates**: Select **Production** (for high availability) or **Dev/Test** (to start cost-effectively).
6. **Settings**:
   * **DB instance identifier**: `bosq-erp-prod-db`
   * **Master username**: Choose a secure username (e.g., `bosqadmin`).
   * **Master password**: Generate and save a highly secure password.
7. **Instance Configuration**:
   * Choose `db.t4g.medium` or `db.m6g.large` depending on expected concurrent user load.
8. **Storage**:
   * **Storage type**: General Purpose SSD (`gp3`).
   * **Allocated storage**: `20 GiB` (minimum, auto-scaling enabled).
9. **Connectivity**:
   * **Virtual private cloud (VPC)**: Select your default VPC or create a custom one.
   * **Public access**: Select **No** (best security practice; application runs inside the same VPC).
   * **VPC security group**: Choose **Create new** and name it `bosq-db-sg`.
10. **Database port**: Default is `5432`.
11. Click **Create database**.

### Configuring Security Group (Access Rules):
1. Navigate to **EC2** -> **Security Groups** and select `bosq-db-sg`.
2. Under **Inbound rules**, click **Edit inbound rules**.
3. Add a rule:
   * **Type**: `PostgreSQL`
   * **Port range**: `5432`
   * **Source**: Custom -> Select the security group of your application containers (`bosq-ecs-sg` - to be created in Section 3) to restrict access only to the ECS cluster.

### Constructing the Prisma Connection URL:
In your environment variables, construct the `DATABASE_URL` like this:
```env
DATABASE_URL="postgresql://<master_username>:<master_password>@<db_endpoint>:5432/<database_name>?schema=public"
```
*Note: The `<db_endpoint>` can be found on the RDS console under the "Connectivity & security" tab of your database.*

---

## 2. Container Registry (Amazon ECR)

Amazon ECR (Elastic Container Registry) stores the Docker images built by your GitHub Actions workflow.

1. Go to the **ECR Console**.
2. Click **Create repository**.
3. **Visibility settings**: Private.
4. **Repository name**: `bosq-erp-prod`.
5. **Tag mutability**: Keep default (**Mutable**).
6. Click **Create repository**.
7. Copy the **URI** (looks like: `123456789012.dkr.ecr.us-east-1.amazonaws.com/bosq-erp-prod`).

---

## 3. Compute Infrastructure (AWS ECS Fargate)

We run Next.js in a Docker container using serverless containers (AWS Fargate).

### A. Create an ECS Cluster
1. Navigate to the **Elastic Container Service (ECS)** console.
2. Click **Create cluster**.
3. **Cluster name**: `bosq-erp-cluster`.
4. **Infrastructure**: Select **AWS Fargate (serverless)**.
5. Click **Create**.

### B. Define the Task Definition
The Task Definition is the blueprint for running your application containers.
1. Click **Task definitions** in the left sidebar -> **Create new task definition**.
2. **Task definition family**: `bosq-erp-task`.
3. **Infrastructure requirements**:
   * **Launch type**: AWS Fargate.
   * **Operating system/Architecture**: Linux/ARM64 or Linux/X86_64.
   * **Task size**: CPU: `0.5 vCPU`, Memory: `1 GB` (increase if rendering heavy PDFs).
   * **Task role / Task execution role**: Select the default `ecsTaskExecutionRole`.
4. **Container Details**:
   * **Name**: `nextjs-app`.
   * **Image URI**: Enter your ECR Repository URI (e.g., `123456789012.dkr.ecr.us-east-1.amazonaws.com/bosq-erp-prod:latest`).
   * **Port mappings**: Container port: `3000`, Protocol: `TCP`, Port name: `3000-tcp`.
5. **Environment variables**: Add required variables (like `DATABASE_URL`, `NEXTAUTH_SECRET`, etc.).
6. Click **Create**.

### C. Create the ECS Service
The service runs and maintains the desired number of container instances.
1. Go back to your cluster `bosq-erp-cluster` -> **Services** tab -> **Create**.
2. **Deployment configuration**:
   * **Application type**: Service.
   * **Task definition family**: `bosq-erp-task`.
   * **Service name**: `bosq-erp-service`.
   * **Desired tasks**: `2` (recommended for high availability).
3. **Networking**:
   * **VPC**: Choose the same VPC as your RDS database.
   * **Subnets**: Select at least 2 public subnets.
   * **Security group**: Create new named `bosq-ecs-sg`. Edit rules to allow inbound traffic on port `3000` from your Load Balancer (Section 4).
   * **Public IP**: Enabled.

---

## 4. Network Routing & SSL (Load Balancer & Route 53)

To handle user requests, distribute load, and encrypt connections using SSL certificates.

### A. Create Target Group
1. Open the **EC2 Console** -> **Target Groups** (left sidebar).
2. Click **Create target group**.
3. **Target type**: IP addresses.
4. **Name**: `bosq-erp-tg`.
5. **Protocol/Port**: HTTP / 3000.
6. **VPC**: Select your VPC.
7. **Health checks**: Path: `/` or `/api/health` (if implemented).
8. Click **Next** and then **Create target group** (without registering targets yet; ECS handles this).

### B. Create Application Load Balancer (ALB)
1. Navigate to **EC2 Console** -> **Load Balancers**.
2. Click **Create load balancer** -> **Application Load Balancer**.
3. **Load balancer name**: `bosq-erp-alb`.
4. **Scheme**: Internet-facing.
5. **IP address type**: IPv4.
6. **Network mapping**: Select VPC and choose your public subnets.
7. **Security groups**: Create `bosq-alb-sg` allowing HTTP (`80`) and HTTPS (`443`) from anywhere (`0.0.0.0/0`).
8. **Listeners and routing**:
   * Add Listener: HTTP / Port 80 -> Forward to Target Group `bosq-erp-tg`.
   * Add Listener: HTTPS / Port 443 -> Forward to Target Group `bosq-erp-tg`.
   * **Secure listener settings**: Select your SSL certificate from ACM (AWS Certificate Manager).

### C. Route 53 Setup
1. Open **Route 53** -> **Hosted zones**.
2. Select your domain (e.g., `bosq.ae`).
3. Click **Create record**.
4. **Record name**: `erp` (or leave empty for root domain).
5. **Type**: A - Routes traffic to an IPv4 address.
6. **Alias**: Enable.
7. **Route traffic to**: Alias to Application Load Balancer -> Select Region -> Select Load Balancer (`bosq-erp-alb`).
8. Click **Create records**.

---

## 5. Automated CI/CD Pipeline (GitHub Actions)

Add this YAML workflow inside your project at `.github/workflows/deploy-production.yml`.

Whenever code is pushed or merged to `main`, this workflow will build the Docker image, run migrations, push the container image to ECR, and update the ECS Service automatically.

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
          aws-region: us-east-1  # Set your AWS region

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

### GitHub Repository Secrets Checklist:
Add these secrets in GitHub under **Settings** -> **Secrets and variables** -> **Actions**:
* `AWS_ACCESS_KEY_ID`: IAM user access key with ECR, ECS, and migration execute privileges.
* `AWS_SECRET_ACCESS_KEY`: IAM user secret key.
* `PROD_DATABASE_URL`: Connection string to the production AWS RDS PostgreSQL database.

---

## 6. Maintenance & Disaster Recovery

### Manual Data Backups (RDS Snapshots):
RDS automatically backs up database records daily. To trigger a manual snapshot before a major update:
1. Go to **RDS Console** -> **Databases** -> Select `bosq-erp-prod-db`.
2. Click **Actions** -> **Take snapshot**.
3. Provide a name and save.

### Zero-Downtime Migration Rules:
* When running migrations during deployment (`npx prisma migrate deploy`), ensure all database edits are additive (adding optional fields/tables).
* Avoid renaming fields directly; instead, create a new field, copy data via a background task, switch application code, and then drop the old field in the next deployment.
* This ensures that while containers are being replaced by AWS ECS, both the old and new instances continue running side-by-side without crashing.
