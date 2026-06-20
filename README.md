# BOSQ ERP - Quotation Management System

A premium, cloud-native Enterprise Resource Planning (ERP) web application tailored for **BOSQ** and **AYN Musk**, designed to build, manage, and distribute professional sales quotations.

---

## Key Features

### 1. Quotation & Revision Manager
- **Dynamic Quotation Builder**: Create quotations with standard products or custom manual items, specifying custom price margins, quantities, discounts, and tax modes (tax-inclusive or tax-exclusive).
- **Automated Revisions**: Automatically version revisions (e.g. `P2231-1`, `P2231-2`) and maintain complete transaction logs of totals and dates.
- **Access Verification**: Permissions are parsed strictly by role (e.g. Sales Executives can only view/manage their assigned clients' quotes, while Managers can approve revisions).

### 2. Premium Document Templating & PDF Generator
- **Atomic Product Rows**: Row components are guaranteed to never split across pages (`wrap={false}` logic), ensuring the description, image, and pricing always render as a single cohesive block.
- **Standardized Column Layout**: Consistent alignment between the HTML preview and the downloaded/SharePoint PDF using a rigid grid:
  - Item Description: `40%` width (HTML sanitized, Helvetica body styling)
  - Image Column: `33%` width (horizontally/vertically centered, object-fit contain, aspect-ratio preserved)
  - QTY Column: `7%` width (centered)
  - Price Column: `10%` width (right-aligned)
  - Total Column: `10%` width (right-aligned)
- **Automatic Fallbacks**: Custom images center and fit cleanly; items without images render a custom dotted placeholder without breaking cell dimensions.
- **Totals & Remarks**: Summaries, terms, and signature boxes are locked inside an atomic footer layout to prevent orphan elements.

### 3. Corporate Branding Customizer (Super Admin Only)
- **Base64 Settings Storage**: Custom header and footer logos can be uploaded directly in the **Company Details** settings panel.
- **Portability**: Branding images are stored in the database settings table, ensuring compatibility with read-only serverless nodes.
- **Fallback Chains**: If database entries are deleted, the system falls back to standard local assets (`public/assets/logo/...`).

### 4. SharePoint Document Center Integration
- **Dynamic Folder Storage**: Quotation PDFs and Client documents (Trade License, VAT Certificate) are automatically stored in customer-specific SharePoint folders.
- **Connection Diagnostics**: Live test connections and App Registration checks (including UUID client secret format alerts) are available in the SharePoint settings panel.

---

## Technology Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/) using Turbopack compiler.
- **Database**: PostgreSQL hosted via Neon, mapped using [Prisma ORM](https://www.prisma.io/).
- **PDF Engine**: [@react-pdf/renderer](https://react-pdf.org/) server-side rendering to stream buffers.
- **Authentication**: NextAuth.js (credentials and session-based role resolution).
- **Styling**: Tailwind CSS & shadcn/ui components.

---

## Getting Started

### 1. Configure Environment Variables
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
NEXTAUTH_SECRET="your_nextauth_session_secret"
NEXTAUTH_URL="http://localhost:3000"
# SharePoint integration keys:
SHAREPOINT_TENANT_ID=""
SHAREPOINT_CLIENT_ID=""
SHAREPOINT_CLIENT_SECRET=""
SHAREPOINT_SITE_ID=""
SHAREPOINT_DRIVE_ID=""
```

### 2. Install Dependencies & Generate Client
```bash
npm install
npx prisma generate
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 4. Sync Database Schema
If schema modifications are made (e.g. `prisma/schema.prisma`), apply changes to Postgres:
```bash
npx prisma db push
```

### 5. Seeding Default Super Admin
Run the helper script to seed the first `SUPER_ADMIN` profile:
```bash
node create-super-admin.js
```
- **Login Email**: `superadmin@bosq.ae`
- **Default Password**: `BosqSuper@2026`

---

## Production Build & Deploy

To generate a compiled build:
```bash
npm run build
```

This project compiles with Turbopack and type-checks all routes statically, ready to deploy to platforms like **Vercel** or **AWS Amplify**.
