# Implementation Plan - Duplicate / Copy Quotations Feature

Provide functionality to create sequential copies of existing quotations (e.g. `P1001 Copy 1`, `P1001 Copy 2`, `P1001-1 Copy 1`) while retaining the original quotation number.

## User Review Required

> [!IMPORTANT]
> - **Naming Convention**: Copied quotations retain the source quotation number and append `Copy 1`, `Copy 2`, `Copy 3` sequentially based on existing copies in the system.
> - **Initial Status**: Copied quotations start in `DRAFT` status so users can inspect or modify line items before submitting.
> - **Access Points**: Users can copy quotations with one click from the Quotation Table (`/quotations`), the Quotation Preview page, or via the Quotation Form (`/quotations/new?copyId=...`).

## Proposed Changes

### 1. API Layer

#### [NEW] [route.ts](file:///c:/MIB/bosq-erp/src/app/api/quotations/%5Bid%5D/copy/route.ts)
- Implement `POST /api/quotations/[id]/copy` endpoint.
- Fetch source quotation and all its items.
- Calculate the next copy sequence number for the target quotation number (checking for existing quotes matching `${sourceQuoteNumber} Copy N`).
- Generate new `quotationNumber` (e.g., `P1001-1 Copy 1`).
- Duplicate the quotation record and all associated `QuotationItem` rows in database with initial `DRAFT` status.
- Log activity entry `COPIED_QUOTATION`.

#### [MODIFY] [route.ts](file:///c:/MIB/bosq-erp/src/app/api/quotations/route.ts)
- Update GET route to properly filter/search copied quotation numbers when searching or sorting.

---

### 2. Quotation Creation & Edit Page

#### [MODIFY] [page.tsx](file:///c:/MIB/bosq-erp/src/app/%28dashboard%29/quotations/new/page.tsx)
- Support `copyId` query parameter (`/quotations/new?copyId=xxx`).
- When `copyId` is provided:
  - Fetch source quotation details and pre-fill form items, client, segment, discounts, payment terms, and notes.
  - Automatically calculate and display next copy label (e.g., `P1001 Copy 1`).
  - Display informative banner: `Creating Copy of Quotation P1001 (Copy 1)`.

---

### 3. Quotation List & Preview Pages

#### [MODIFY] [page.tsx](file:///c:/MIB/bosq-erp/src/app/%28dashboard%29/quotations/page.tsx)
- Add "Make a Copy" / "Duplicate" action to the Quotation Table row action buttons and dropdown menu.
- Trigger one-click copy API call with toast notification and table refresh.

#### [MODIFY] [page.tsx](file:///c:/MIB/bosq-erp/src/app/%28dashboard%29/quotations/%5Bid%5D/preview/page.tsx)
- Add a "Copy Quotation" button to the top action header bar.

## Verification Plan

### Automated / Build Verification
- Execute `npm run build` or `npx tsc --noEmit` to verify type safety and build integrity.

### Manual Verification
1. Open the Quotations page (`/quotations`).
2. Click "Copy" on an existing quotation (e.g., `P1001-1`).
3. Verify that a new quotation is created named `P1001-1 Copy 1` in `DRAFT` status with identical line items and metadata.
4. Click "Copy" again on `P1001-1` or `P1001-1 Copy 1`.
5. Verify that the subsequent copy is named `P1001-1 Copy 2`.
6. Open `/quotations/new?copyId=...` and verify form pre-filling works as expected.
