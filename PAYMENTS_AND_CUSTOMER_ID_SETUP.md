# Kraft & Petal — this update

The uploaded `kraft-and-petal-main.zip` was used as the sole source. It already had Supabase order placement, stock validation, customer accounts, and idempotency protections. This update adds manual payment methods, customer numbers, and a customer-only organized Orders page. No unrelated pages were intentionally modified.

## 1. Supabase migration (required for real accounts)

Open Supabase → SQL Editor and run **only** `supabase/migrations/20261112000400_customer_ids_manual_payments.sql` **after** the existing `20261110000100_schema.sql` and `20261110000200_access_rules.sql` were applied. **Do not rerun the original CREATE TABLE scripts on an existing production database.** The new migration retains existing customer numbers, backfills missing ones, and leaves historical orders/payment methods unchanged.

Check existing numbers:

```sql
select user_id, 'CUST-' || lpad(customer_number::text,6,'0') as customer_id
from public.profiles order by customer_number;
```

The migration adds `orders.payment_method`, `payment_status`, `payment_reference`, `payment_proof_path`, a private `payment-proofs` Storage bucket and Row Level Security policies. It adds `place_manual_order`, which calls the original `place_order` function to preserve server-side prices, atomic stock management, and duplicate-request protection.

**Important:** Existing `place_order()` remains callable for compatibility with old clients, so do not deploy any older checkout builds to production after switching over. Review/retire obsolete API access if payment selection must be mandatory across ALL external clients. Database installation and access policies should be checked in staging before production.

## 2. QR images

Put actual QR images at exactly:

- `public/payment-qr/gcash.png`
- `public/payment-qr/maya.png`
- `public/payment-qr/gotyme.png`

A clear text-only `qr-placeholder.svg` appears until an image is supplied. **It is NOT a QR code** and cannot accept payments. Never publish the QR-payment options to real buyers until all three official codes are configured and tested. The code deliberately does not generate payment codes or account details.

For GCash, Maya, and GoTyme, checkout accepts an optional screenshot (up to 5 MB, PNG/JPEG/WebP) and/or a reference; one is required. Screenshots are uploaded to a private bucket under the signed-in user's ID. All such orders start `pending_verification`. They are never automatically marked paid. COD skips payment upload/reference and starts `unpaid_cod`.

Payment verification must be performed by an authorized operator after checking the actual merchant account. No admin verification UI has been added, to preserve the existing admin pages. An authorized shop operator with database access can confirm a specific validated order using a carefully scoped database update, for example (replace the UUID after verifying funds):

```sql
update public.orders set payment_status='paid'
where id='REPLACE-WITH-VERIFIED-ORDER-UUID'
  and payment_status='pending_verification';
```

This action must be done **only after independently confirming money was received**, not from a screenshot alone.

## 3. Customer ID and Orders page

`profiles.customer_number` is a permanent sequence-backed number. Customer display is `CUST-000001`, etc. Internal order UUIDs are preserved. Order confirmation uses the customer's ID; the customer Orders page now separates delivery, products, notes and payment details and keeps per-order expand/collapse. Administrative order views keep their internal Order IDs.

Note: the original database stores recipient, address and phone in one multiline `delivery_address` field. The customer Orders UI parses the original format for display; no schema rewrite was performed. Historic addresses in another format are displayed intact.

## 4. Running / checking

Use Node.js version compatible with `package.json` (the installed React Router requires a recent Node 22), then:

```sh
npm ci
npm run typecheck
npm run dev
```

Verify one COD order, one QR/reference order, a QR/proof upload, two orders from the same signed-in user, a different user's Customer ID, and access controls. Check on mobile. **This environment could not complete `npm ci` offline**, so a full project build, real Supabase migration, and live integration testing were not performed. TypeScript/TSX syntax was checked on modified modules.

The original project has a sample-data mode when Supabase environment variables are absent. That mode does not receive real payments or securely store proof files. Use Supabase mode for production checkout.
