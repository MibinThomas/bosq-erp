# 🏢 BOSQ ERP — Next-Generation Cloud ERP & Quotation Management System

[![Next.js](https://img.shields.io/badge/Next.js_16-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript_5-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma_7.8-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Microsoft SharePoint](https://img.shields.io/badge/SharePoint_Graph_API-0078D4?style=for-the-badge&logo=microsoft&logoColor=white)](https://learn.microsoft.com/en-us/graph/)

A state-of-the-art, cloud-native Enterprise Resource Planning (ERP) and Sales Management web platform engineered specifically for **BOSQ** and **AYN Musk**. Designed to streamline the complete commercial lifecycle—from CRM and client segmentation to complex Bill of Quantities (BOQ) cost estimation, dynamic quotation building, atomic PDF document generation, and automated cloud storage via Microsoft SharePoint.

---

## 📋 Table of Contents

- [🌟 Key Capabilities & Features](#-key-capabilities--features)
- [🏗️ System Architecture & Tech Stack](#-system-architecture--tech-stack)
- [📁 Project Directory Structure](#-project-directory-structure)
- [🔐 Role-Based Access Control (RBAC) Matrix](#-role-based-access-control-rbac-matrix)
- [⚡ Getting Started Guide (Local Development)](#-getting-started-guide-local-development)
- [🛠️ Helper & Maintenance Scripts](#️-helper--maintenance-scripts)
- [☁️ Production Build & Deployment](#️-production-build--deployment)
- [📄 License & Compliance](#-license--compliance)

---

## 🌟 Key Capabilities & Features

### 1. Dynamic Quotation & Revision Engine
- **Multi-Tier Segmentation & Pricing**: Build quotations tailored to specific customer segments (**Direct**, **Interior**, **Dealer**, **Online**), automatically applying segment-specific catalog pricing and profit margins.
- **Flexible Tax & Discount Modeling**: Supports both **VAT Inclusive** and **VAT Exclusive** calculations (5% standard UAE VAT), custom line-item discounts, overall special discounts (`PERCENTAGE` or `FIXED`), and additional custom charges (shipping, installation, packaging).
- **Automated Version Tracking**: Implements intelligent parent-child revision tracking. Modifying an approved or sent quote automatically generates a versioned revision (e.g., `I1951` → `I1951-1`), maintaining an immutable transaction log of previous totals, timestamps, and revision notes in [schema.prisma](file:///d:/MIBIN/bosq-erp/prisma/schema.prisma#L232).

### 2. Atomic PDF Document Engine & Templating
- **Unbroken Row Rendering**: Powered by [@react-pdf/renderer](file:///d:/MIBIN/bosq-erp/package.json#L23) in [QuotationDocument.tsx](file:///d:/MIBIN/bosq-erp/src/lib/pdf/QuotationDocument.tsx). Enforces strict `wrap={false}` logic on product item rows to guarantee that descriptions, thumbnails, and pricing always render together as a cohesive block without breaking across pages.
- **Rigid Standardized Grid Layout**: Consistent pixel-perfect alignment between web HTML previews and exported PDFs:
  - **Item Description**: `40%` width (HTML sanitized, professional Helvetica typography).
  - **Image Thumbnail**: `33%` width (centered, aspect-ratio preserved with clean fallback placeholders via [resolveImage.ts](file:///d:/MIBIN/bosq-erp/src/lib/pdf/resolveImage.ts)).
  - **Quantity**: `7%` width (centered).
  - **Unit Price & Total**: `10%` width each (right-aligned, formatted currency).
- **Dynamic Corporate Branding**: Configurable Base64 header and footer logos managed via system settings and cached efficiently in [logoCache.ts](file:///d:/MIBIN/bosq-erp/src/lib/pdf/logoCache.ts) for instant serverless execution.

### 3. Interactive E-Commerce Product Modal
- **Two-Column Technical Layout**: Expanding a product card opens a premium e-commerce modal displaying full specifications, dimensions, available colors, and dynamic highlight boxes (Warranty, Best For, Assembly).
- **Interactive Lightbox Gallery**: Full-screen image zoom overlay with multi-image thumbnail slider navigation.
- **Segment Price Calculator**: Real-time price adjustments and margin visibility based on the selected customer account type.

### 4. Bill of Quantities (BOQ) & Estimator Workflow
- **Granular Cost Estimation**: Dedicated workflow for estimators to break down product manufacturing and project costs in [Boq](file:///d:/MIBIN/bosq-erp/prisma/schema.prisma#L292) and [BoqItem](file:///d:/MIBIN/bosq-erp/prisma/schema.prisma#L337).
- **Multi-Variable Cost Tracking**: Track and calculate **Material Cost**, **Labor Cost**, **Installation Cost**, **Transport**, and **Overheads** per item.
- **Seamless Quotation Conversion**: Once an estimator completes costing and defines profit margins, sales managers can convert the BOQ directly into a formal customer quotation with one click.

### 5. Deep Microsoft SharePoint Integration
- **Automated Document Center Provisioning**: Configured via [sharepoint.ts](file:///d:/MIBIN/bosq-erp/src/lib/sharepoint.ts) using the Microsoft Graph SDK. When a new client is approved, the system automatically provisions dedicated customer folders in your corporate SharePoint Drive.
- **Real-Time Document Archiving**: All generated Quotation PDFs, BOQs, and compliance documents (Trade License, VAT Certificates) are automatically uploaded and linked to the database.
- **Connection Diagnostics**: Built-in admin settings panel to test Azure App Registration connectivity, token grants, and client secret UUID validation.

---

## 🏗️ System Architecture & Tech Stack

The application follows a modern serverless monolith architecture built on **Next.js 16 App Router**, leveraging server actions, static typing, and relational cloud data.

| Layer | Technologies Used | Key Purpose & Highlights |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 16 (App Router), React 19, TypeScript 5 | Server-side rendering, routing, static optimization, and Turbopack compiler. |
| **Styling & UI Design** | Tailwind CSS v4, shadcn/ui, Radix UI Primitives | Responsive layouts, glassmorphism UI, accessible modals, and micro-animations ([tw-animate-css](file:///d:/MIBIN/bosq-erp/package.json#L52)). |
| **State & Forms** | React Hook Form, Zod v4, Lucide React Icons | Strongly-typed form validation, schema verification, and intuitive iconography. |
| **Database & ORM** | PostgreSQL (Neon Cloud), Prisma ORM v7.8 | Relational data modeling, connection pooling (`pg` & `better-sqlite3` adapters). |
| **Authentication & RBAC** | NextAuth.js v4, Custom RBAC Engine ([rbac.ts](file:///d:/MIBIN/bosq-erp/src/lib/rbac.ts)) | Secure session management, role resolution, and granular permission overrides. |
| **Document & Cloud Engine** | `@react-pdf/renderer`, Microsoft Graph SDK, Vercel Blob | Server-side PDF streaming, SharePoint cloud storage, and Excel/CSV data exports. |

---

## 📁 Project Directory Structure

```text
bosq-erp/
├── prisma/
│   ├── schema.prisma              # Complete database schema (Users, Roles, Clients, Products, Quotes, BOQs)
│   ├── prisma.config.ts           # Prisma 7.8 configuration and datasource bindings
│   └── seed.ts                    # Database seed scripts for default roles and catalog items
├── src/
│   ├── app/
│   │   ├── (dashboard)/           # Protected dashboard view routes
│   │   │   ├── clients/           # CRM, client onboarding, and SharePoint folder views
│   │   │   ├── quotations/        # Quotation builder, revision history, and PDF previewer
│   │   │   ├── boq/               # Bill of Quantities estimation and costing table
│   │   │   ├── products/          # Catalog management and e-commerce specification modals
│   │   │   ├── reports/           # Analytics, sales performance, and export tools
│   │   │   └── settings/          # Corporate branding, SharePoint diagnostics, and RBAC matrix
│   │   ├── api/                   # RESTful API endpoints (/api/quotations, /api/boq, /api/clients, etc.)
│   │   ├── login/                 # NextAuth authentication and credential verification
│   │   └── layout.tsx             # Root application layout and theme providers
│   ├── components/                # Modular, reusable UI components
│   │   ├── quotations/            # Quotation tables, item row editors, and discount modals
│   │   ├── clients/               # Client forms, document uploaders, and assignment pickers
│   │   ├── products/              # Product grid cards, lightbox gallery, and detail popups
│   │   ├── layout/                # Sidebar navigation, header breadcrumbs, and user menus
│   │   └── ui/                    # shadcn/ui primitives (Dialog, Select, Switch, Table, Toast)
│   └── lib/                       # Core business logic, helpers, and integration drivers
│       ├── pdf/                   # PDF generation engine (QuotationDocument, resolveImage, logoCache)
│       ├── rbac.ts                # Permission evaluation engine and role override resolver
│       ├── sharepoint.ts          # Microsoft Graph API driver for SharePoint folder/file management
│       ├── settings.ts            # System settings loader and Base64 branding processor
│       └── auth.ts                # NextAuth configuration and session serialization
├── public/assets/                 # Static fallback assets, default corporate logos, and watermarks
├── create-super-admin.js          # CLI helper to seed the initial Super Admin account
└── package.json                   # Project dependencies and script definitions
```

---

## 🔐 Role-Based Access Control (RBAC) Matrix

The system implements a multi-layered security model in [rbac.ts](file:///d:/MIBIN/bosq-erp/src/lib/rbac.ts). Access is evaluated by checking standard role capabilities first, followed by individual user permission overrides ([UserPermissionOverride](file:///d:/MIBIN/bosq-erp/prisma/schema.prisma#L411)) and explicit client/quotation assignment records.

| System Role | Dashboard & CRM | Quotation Management | BOQ & Costing | Pricing Visibility | System Settings |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`SUPER_ADMIN` / `ADMIN`** | 🟢 Full Access (All Clients) | 🟢 Create, Edit, Approve, Delete | 🟢 Full Access & Conversion | 🟢 Unit, Cost, Dealer, Margin | 🟢 Full Control (Branding, SharePoint) |
| **`SALES_MANAGER`** | 🟢 Full Access (All Clients) | 🟢 Create, Edit, Approve Revisions | 🟢 Review & Convert BOQs | 🟢 Unit, Cost, Dealer, Margin | 🟡 View Only |
| **`SALES_EXECUTIVE`** | 🟡 Assigned Clients Only | 🟡 Create/Edit Assigned Quotes | 🔴 No Access | 🟡 Unit & Segment Selling Price Only | 🔴 No Access |
| **`ESTIMATOR`** | 🟡 Assigned Clients Only | 🔴 Read-Only on Linked Quotes | 🟢 Cost Estimation & Markup | 🟢 Material, Labor, Overhead, Cost | 🔴 No Access |
| **`INTERIOR_DESIGN_CONSULTANT`** | 🟡 Assigned Clients Only | 🟡 Create Draft Quotes | 🟡 View Assigned BOQs | 🟡 Unit Selling Price Only | 🔴 No Access |
| **`ACCOUNTS` / `PRODUCTION`** | 🟡 View Approved Clients | 🟡 View Approved Quotes & POs | 🔴 No Access | 🟡 Unit Price & Total Amount | 🔴 No Access |

> [!IMPORTANT]
> **Permission Overrides**: Administrators can grant specific Sales Executives permission to view internal cost prices, exceed maximum discount percentages, or override VAT calculations on a per-user basis without altering global role definitions.

---

## ⚡ Getting Started Guide (Local Development)

Follow this guide to set up, configure, and run **BOSQ ERP** locally on your workstation.

### Prerequisites
- **Node.js**: Version `20.x` or higher installed.
- **Database**: An active PostgreSQL instance (e.g., [Neon Cloud Postgres](https://neon.tech/) or local PostgreSQL server).
- **Package Manager**: `npm` (bundled with Node.js).

### Step 1: Clone & Install Dependencies
Open your terminal in the workspace directory and install all required packages:
```bash
git clone <repository_url> bosq-erp
cd bosq-erp
npm install
```

### Step 2: Configure Environment Variables
Create a `.env` file in the root directory (`d:\MIBIN\bosq-erp\.env`) and configure the following parameters:
```env
# 1. Database Configuration (PostgreSQL Connection String with SSL)
DATABASE_URL="postgresql://username:password@your-neon-hostname.neon.tech/dbname?sslmode=require"

# 2. NextAuth Authentication Settings
NEXTAUTH_SECRET="generate_a_strong_random_secret_key_here_32_chars"
NEXTAUTH_URL="http://localhost:3000"

# 3. Microsoft SharePoint Graph API (Optional for Local Testing)
SHAREPOINT_TENANT_ID="your-azure-tenant-id"
SHAREPOINT_CLIENT_ID="your-azure-app-client-id"
SHAREPOINT_CLIENT_SECRET="your-azure-client-secret-value"
SHAREPOINT_SITE_ID="your-sharepoint-site-id"
SHAREPOINT_DRIVE_ID="your-sharepoint-document-library-drive-id"
```

> [!TIP]
> To generate a secure `NEXTAUTH_SECRET`, you can run `openssl rand -base64 32` in your terminal or use any secure 32-character random string.

### Step 3: Generate Prisma Client & Sync Schema
Generate the Prisma ORM database client and push the schema to your PostgreSQL database:
```bash
npx prisma generate
npx prisma db push
```

### Step 4: Seed the Default Super Admin Account
Run the automated initialization script to seed the primary administration account:
```bash
node create-super-admin.js
```
Upon successful execution, you can log in with the following default credentials:
- **Email**: `superadmin@bosq.ae`
- **Password**: `BosqSuper@2026`

> [!CAUTION]
> Please change the default Super Admin password immediately after your first login in a production or staging environment!

### Step 5: Start the Development Server
Launch the Next.js development server with Turbopack acceleration enabled:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser to access the BOSQ ERP login portal and dashboard.

---

## 🛠️ Helper & Maintenance Scripts

The repository includes several command-line utilities in the root directory for database maintenance, migration, and diagnostic testing:

| Script Name | Command | Description & Usage |
| :--- | :--- | :--- |
| **Admin Initialization** | `node create-super-admin.js` | Creates or resets the primary `superadmin@bosq.ae` account with full system permissions. |
| **Database Diagnostics** | `node test-db.js` | Validates PostgreSQL database connectivity and prints current table counts and schema status. |
| **SharePoint Diagnostics** | `node check-sp.js` / `node test-sp.js` | Tests Azure App Registration authentication tokens, Graph API permissions, and folder access. |
| **RBAC Migration** | `node migrate-access-control.js` | Upgrades existing database users to the latest modular permission scheme defined in `rbac.ts`. |
| **Product Data Migration** | `node migrate-product-descriptions.js` | Normalizes and formats legacy product specification strings and HTML descriptions. |

---

## ☁️ Production Build & Deployment

BOSQ ERP is optimized for static type-checking and high-performance compilation using Next.js Turbopack.

### Generating a Production Build
To verify type safety, compile server components, and build the production bundle, run:
```bash
npm run build
```

### Starting the Production Server
To run the compiled production build locally or on a VPS container:
```bash
npm start
```

### Deployment Recommendations
- **Vercel / AWS Amplify**: Connect your Git repository directly. Ensure all environment variables from `.env` are added to the cloud project settings. Set the build command to `prisma generate && next build` as configured in [package.json](file:///d:/MIBIN/bosq-erp/package.json#L7).
- **Docker / Containerization**: The application can be containerized using a standard Next.js multi-stage Dockerfile running on Node.js 20 Alpine, connecting to your cloud PostgreSQL database.

---

## 📄 License & Compliance

**Proprietary & Confidential**  
Copyright © 2026 **BOSQ** and **AYN Musk**. All Rights Reserved.  
This software, including all associated source code, database designs, PDF rendering algorithms, and UI components, is the exclusive proprietary property of BOSQ and AYN Musk. Unauthorized copying, distribution, modification, or deployment of this repository is strictly prohibited.
