# Kraft & Petal

The online shop for Kraft & Petal, a small handmade flower shop: a storefront for customers and a dashboard for the people who run the shop.

- **Storefront:** home, shop with category filter, product pages, cart, checkout, order history, about, contact, sign in and sign up.
- **Dashboard** (`/admin`): overview, products, orders and stock, for operators only.
- **Stack:** React, Vite and TypeScript in the browser; Supabase (Postgres, Auth, Storage) behind it; Cloudflare Pages for hosting. Everything runs on free plans.

With no configuration the app runs on **sample data kept in your browser**, so you can try every screen without a backend. Give it a Supabase URL and anon key and it uses the real database instead. No component changes between the two.

**Payment is simulated.** Checkout places real orders but takes no money. See [Payments](#payments).

## Contents

- [Run it locally](#run-it-locally)
- [Checks](#checks)
- [How the code is laid out](#how-the-code-is-laid-out)
- [Connect Supabase](#connect-supabase)
- [Deploy to Cloudflare Pages](#deploy-to-cloudflare-pages)
- [Backups](#backups)
- [Free-tier upkeep](#free-tier-upkeep)
- [Secrets](#secrets)
- [Payments](#payments)
- [Not verified yet](#not-verified-yet)

## Run it locally

You need Node 22.18 or newer (`.nvmrc` says 22).

```bash
npm install
npm run dev
```

Open <http://localhost:4387>. The dev server always uses port 4387 and stops if that port is taken.

### Sample accounts

The sign-in page lists these while the app runs on sample data. One click signs you in.

| Who | Email | Password | Sees |
|---|---|---|---|
| Maya, a customer | `maya@example.com` | `sample-petals` | Shop, checkout, her orders |
| Olive, an operator | `olive@kraftandpetal.example` | `sample-twine` | The dashboard at `/admin` |

Sample data lives in your browser's local storage. To start again, clear the site data for `localhost:4387`. Nothing is sent anywhere.

## Checks

| Command | What it does |
|---|---|
| `npm run lint` | Lints with oxlint |
| `npm run typecheck` | Type-checks the app, the tests and the scripts |
| `npm test` | Unit tests, accessibility checks on every route, and the database rule tests |
| `npm run build` | Type-checks, then builds the site into `dist` |
| `npm run check:secrets` | Scans `dist` for anything shaped like a server-side secret |
| `npm run check:secrets:history` | Scans every commit for the same |
| `npm run test:e2e` | Keyboard-only journeys and contrast checks in a real browser |
| `npm run check` | Lint, typecheck, tests, build and the `dist` scan, in that order |

`npm run test:e2e` needs a browser. Either install Playwright's (`npx playwright install chromium`) or point at one you have:

```bash
PLAYWRIGHT_EXECUTABLE_PATH=/path/to/chrome npm run test:e2e
```

The database rule tests (`tests/database/rls.test.ts`) apply the real migration files to PGlite, a Postgres that runs inside the test process, with a stand-in for Supabase's `auth` and `storage` schemas and its `anon` and `authenticated` roles. They need no Docker and no Supabase project. They do not replace a check on the hosted project; see [Not verified yet](#not-verified-yet).

CI (`.github/workflows/ci.yml`) runs all of the above on every pull request and on `main`. It needs no secret.

## How the code is laid out

```
src/
  app/          routes, guards, shells, error boundary
  components/   ui (Button, Input, Card, Modal, Toast, ...), layout, illustrations
  features/     auth, cart, catalog, checkout, dashboard, orders
  hooks/
  lib/          all data access, config, formatters, validators
  pages/        one file per route
  styles/       tokens.css (every color, size and space), global.css
  types/
supabase/
  migrations/   schema, access rules, picture storage
  seed.sql      sample catalogue (generated)
scripts/        backup, seed generator, secret scan
tests/          unit, a11y, database, e2e
```

Three rules hold the structure together, and tests enforce each:

- **Styles come from tokens.** No color, pixel or rem value appears outside `src/styles/tokens.css`. To change the look of the shop (page color, text color, button color, corner radius, shadows, typefaces), change the values there; the token test checks the contrast of every pairing the components use.
- **Data access stays in `src/lib`.** Components call `data.catalog`, `data.orders` and so on. Only `src/lib` imports the Supabase client.
- **Shop rules live in `src/lib/config.ts`:** currency, low-stock threshold (5 or fewer), earliest delivery date (tomorrow), length limits.

`supabase/seed.sql` is generated from the sample data in `src/lib/data/local/sampleData.ts`, so the sample shop and a fresh database show the same catalogue. After changing the sample data, run `npm run seed:generate`. A test fails if the two drift apart.

## Connect Supabase

Do this once, when you are ready for a real database.

### 1. Create the project

Create a free project at [supabase.com](https://supabase.com). Note its Postgres major version (Project settings > Infrastructure); the backup job needs it.

### 2. Apply the migrations, in order

Open the SQL editor and run each file in `supabase/migrations/`, oldest first:

1. `20261110000100_schema.sql`: tables and checks. Prices are whole cents. Every picture needs a description.
2. `20261110000200_access_rules.sql`: Row Level Security on every table, the `place_order` function, and the triggers.
3. `20261110000300_product_image_storage.sql`: the public `product-images` bucket, which only operators can write to.

Or, with `psql` and the connection string from Project settings > Database:

```bash
for file in supabase/migrations/*.sql; do
  psql "$SUPABASE_DB_URL" --set ON_ERROR_STOP=1 --file "$file"
done
```

### 3. Load the catalogue

Run `supabase/seed.sql` the same way. It holds categories, products and pictures, no users and no orders, and is safe to run again.

### 4. Check the access rules on the live project

The rules are what protect customer data, so check them where they run. Each rule is a named test in `tests/database/rls.test.ts` (RLS-01 to RLS-15). On the hosted project, check at least these by hand, signed in through the deployed site:

- Signed out: the shop shows products; `/account/orders` and `/admin` send you to sign in.
- As a customer: you see only your own orders, and `/admin` says you are not allowed.
- As a customer, in the browser console, try to change your own role. It must be rejected.
- As an operator: you can edit a product, change an order's status and change stock.

### 5. Make the first operator

Everyone who signs up is a customer. Nobody can change a role from the app, not even an operator. Sign up through the site, then run this in the SQL editor:

```sql
update public.profiles
set role = 'operator'
where user_id = (select id from auth.users where email = 'you@example.com');
```

Sign out and in again to pick up the new role.

### 6. Point the app at it

For local use, copy `.env.example` to `.env.local` and fill in the two values from Project settings > API:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Both are public by design and are the only configuration the browser ever receives. With either one empty, the app runs on sample data.

In Supabase, under Authentication > URL configuration, set the Site URL to your shop's address. If email confirmation is on, new customers must follow the link in their email before they can sign in; the app tells them so.

## Deploy to Cloudflare Pages

1. In Cloudflare, create a Pages project connected to this GitHub repository.
2. Production branch: `main`. Build command: `npm run build`. Output folder: `dist`.
3. Under Settings > Environment variables, in the **Production** environment only, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Leave the **Preview** environment without them. Pull-request previews then run on sample data, so a test order never reaches the live database.
5. Add your custom domain and turn on "Always Use HTTPS".

Two files in `public/` are read by Pages:

- `_redirects` serves `index.html` for every path, so a link such as `/shop/little-monstera` works when opened directly or reloaded.
- `_headers` sets the security headers, including a Content-Security-Policy that allows scripts from the site only and connections to the site and Supabase. It allows any `*.supabase.co` host. Once your project exists, replace the wildcard with your own project's host.

Environment variables are read at build time. After changing one, redeploy.

Product photos uploaded in the dashboard are shrunk in the browser first (longest edge 1600px, 300 KB at most). The storage bucket refuses anything larger.

## Backups

The free Supabase plan keeps no backups, so this repository makes its own. A backup holds customer names and addresses. It is encrypted before it leaves the job and is never committed.

### What runs

`.github/workflows/backup.yml` runs `scripts/backup.sh`:

| When | File | Kept |
|---|---|---|
| Every Monday, 03:00 UTC | weekly | 56 days (the last 8) |
| The first Monday of each month | the same export, marked monthly | 365 days (the last 12), if GitHub allows; see below |
| By hand, before a migration reaches the live database | manual | 56 days |

Each run stores one encrypted file as a workflow artifact. It contains `schema.sql`, `data.sql` (every shop table, plus the sign-in accounts that profiles and orders point to) and `manifest.txt` with checksums. A failed run emails the repository owner.

**GitHub caps how long artifacts are kept**, and the cap can be lower than 365 days (Settings > Actions > General > Artifact and log retention). When it is, GitHub keeps the monthly file only up to the cap. To really hold 12 monthly files, download each monthly artifact and store it somewhere of your own. It is already encrypted.

### Turn it on

The job stays off until the repository has a `SUPABASE_URL` variable. In GitHub, under Settings > Secrets and variables > Actions:

| Kind | Name | Value |
|---|---|---|
| Variable | `SUPABASE_URL` | Your project URL. Also used by the keep-active job. |
| Variable | `SUPABASE_ANON_KEY` | Your anon key. Used by the keep-active job. |
| Secret | `SUPABASE_DB_URL` | The database connection string, with its password. Use the session pooler string if the direct one does not connect from GitHub. |
| Secret | `BACKUP_PASSPHRASE` | A long random passphrase, at least 20 characters. |

Keep **one offline copy of the passphrase** (a password manager or paper). Without it no backup can be opened, and GitHub will not show it to you again.

In `backup.yml`, set `PG_MAJOR` to your project's Postgres major version. `pg_dump` refuses to export from a newer server.

Then run the workflow once by hand (Actions > Database backup > Run workflow) and check that an artifact appears.

### Run one by hand

You need `pg_dump` and `gpg`. Pass both values through your shell, never through a file in this repository:

```bash
SUPABASE_DB_URL='...' BACKUP_PASSPHRASE='...' npm run backup
```

The file lands in `backups/`, which Git ignores.

### Restore

Restore into a scratch project or a local Postgres, never over the live database.

```bash
# 1. Open the backup
gpg --decrypt kraft-petal-weekly-2026-11-16T030000Z.tar.gz.gpg | tar -xz
sha256sum --check <(tail -n 2 manifest.txt)

# 2. Build the schema from this repository
for file in supabase/migrations/*.sql; do
  psql "$SCRATCH_DB_URL" --set ON_ERROR_STOP=1 --file "$file"
done

# 3. Load the data with triggers off, so rows go in exactly as they were
psql "$SCRATCH_DB_URL" --set ON_ERROR_STOP=1 --single-transaction \
  --command 'set session_replication_role = replica' --file data.sql
```

Step 3 turns triggers off for that session because otherwise restoring a sign-in account would create a second profile for it. `schema.sql` in the backup records the schema as it was on the live database; compare it with the migrations if you suspect someone changed the database by hand.

Then point a local copy of the app at the scratch database and check that the shop, an order history and the dashboard look right.

### Restore tests

A backup that has never been restored is not a backup. Do a restore test **once before launch** and **every quarter**, and record it here.

| Date | Backup file | Restored into | Result | By |
|---|---|---|---|---|
| Not done yet | | | | |

### Product pictures

Pictures uploaded in the dashboard live in Supabase Storage and are **not** in the database backup. Keep the original photos in a folder of your own, or download the `product-images` bucket once a month. The sample catalogue uses illustrations built into the site, which need no backup.

## Free-tier upkeep

### Keeping Supabase awake

A free Supabase project pauses after a stretch with no activity, which takes the shop offline. `.github/workflows/keep-active.yml` reads one row through the public API each day. If the read fails, the run fails and GitHub emails the owner. It uses the two public values only, stored as the repository variables `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

GitHub can switch a scheduled workflow off after a long period with no repository activity. **Once a month**, open the Actions tab and check that both scheduled jobs still run.

Move Supabase to a paid plan before real customers depend on the shop.

### Limits to re-check

Free plans change. Check each line **before launch and every quarter**, and write down the date and what you found. None of these has been checked yet; the numbers are deliberately left blank rather than copied from memory.

| Provider | Check | Why it matters | Checked on | What we found |
|---|---|---|---|---|
| Supabase | Inactivity pause window | A paused project takes the shop offline | | |
| Supabase | Database size, Storage size, monthly bandwidth, monthly active users | Pictures and order history grow | | |
| Supabase | Backup features on the free plan | This README assumes there are none | | |
| Supabase | Free projects per account | Limits scratch databases for restore tests | | |
| Cloudflare Pages | Builds per month, files per deployment, single file size | Each push and each preview spends a build | | |
| Cloudflare Pages | Commercial-use terms of the free plan | The shop sells things | | |
| GitHub | Actions minutes, artifact retention, scheduled-workflow rules | Backups and the keep-active job run there | | |
| Fonts | Licenses of the shipped font files | See below | | |

### Fonts

Headings use Fraunces and everything else uses Figtree. Both are variable fonts under the SIL Open Font License 1.1, served from this site: the files and their licenses are in `public/fonts/`, the `@font-face` rules are in `src/styles/global.css`, and the family names are tokens (`--font-family-display`, `--font-family-primary`). No font loads from another site. To change a typeface, replace the file and its license, then update the `@font-face` rule and the token.

## Secrets

- The browser may receive exactly two values: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Both are public. Row Level Security in the database is what protects the data.
- Anything with a `VITE_` prefix is copied into the built site. Never give that prefix to a service role key, a database password, a payment secret or the backup passphrase.
- Server-side secrets live only in GitHub Actions secrets or in a provider's own settings. `.env.example` lists names, never values. `.env` files are ignored by Git.
- Tests fail if the app reads any other variable, and CI scans both the built site and the Git history for anything shaped like a secret.
- If a secret ever reaches Git or a build, rotate it first, then remove it. Deleting the commit is not enough.

## Payments

Checkout talks to a payment provider through one small interface, `src/features/checkout/payment.ts`. The only implementation today is `mockPaymentProvider.ts`, which takes no money. While it is active, checkout shows a "Payment is simulated" notice and lets you choose whether the simulated payment succeeds or is declined.

To take real payments, implement that interface for a provider, keep its secret key in a server function (never in this bundle), add payment status and reference columns to `orders` in a new migration, and mark an order paid only from the provider's server-side confirmation.

## Not verified yet

Stated plainly, so nobody assumes otherwise:

- **No Supabase project exists yet.** The migrations and access rules pass their tests on PGlite with stand-in `auth` and `storage` schemas, not on hosted Supabase. The Supabase side of the app (`src/lib/data/supabase/`) has never talked to a real project. Expect to fix small things the first time it does.
- **No real backup has been exported or restored.** `scripts/backup.sh` is tested against a stand-in for `pg_dump` (encryption, read-back and failure handling). The export options and the restore steps above have not been run against a real database.
- **The scheduled workflows have not run.** They stay off until the repository variables are set.
- **Nothing has been deployed to Cloudflare Pages.**
- **Free-tier limits have not been checked.**
