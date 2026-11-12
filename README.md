# Aman Academy | أكاديمية أمان

Bilingual (Arabic-first, English) platform for **live, instructor-led safety training** in Saudi Arabia:
course catalog → session booking → checkout → joining instructions → manual attendance → online exam →
verifiable digital certificate, with company seat management, instructor tools and an admin area.

> **Status: working demo, not production-ready.** All people, companies, prices, schedules, instructor
> profiles and exam questions are fictional sample data. Payments are simulated. See
> [docs/PRODUCTION.md](docs/PRODUCTION.md) for what must be connected and reviewed before launch.

## Run it

Requires Node.js 22+ (installed here with Homebrew: `brew install node`).

```bash
npm install
cp .env.example .env.local     # already present on this machine, with generated secrets
npm run dev                    # http://localhost:3000  (opens in Arabic)
```

No database setup is needed for the demo: an embedded PostgreSQL (PGlite) is created in `.data/pglite`,
migrated and seeded on first start.

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Business-rule tests (31 tests, in-memory database) |
| `npm run typecheck` | TypeScript check |
| `npm run check` | Typecheck + tests |
| `npm run db:reset` | Delete the demo database (stop the server first); it is re-seeded on next start |
| `npm run db:generate` | Generate a SQL migration after changing `src/server/db/schema.ts` |
| `npm run db:migrate` | Apply migrations (and seed when `DEMO_MODE=true` and the database is empty) |

### Demo access

With `DEMO_MODE=true`, the sign-in page shows four one-click fictional accounts:

| Persona | What to look at |
| --- | --- |
| Individual learner | An upcoming session with joining instructions, an exam that is ready to take, a sample certificate |
| Company manager | Seats purchased/assigned/remaining, employees, invitations, CSV report |
| Instructor | Assigned sessions, joining details, manual attendance |
| Administrator | Courses, sessions, question banks, enrollments, certificates (revoke/reissue), audit log, email outbox |

Demo sign-in is a server action that refuses to run unless `DEMO_MODE=true`. It signs in to seeded
accounts through the normal authentication system; it is not a role switch. Set `DEMO_MODE=false`
in production. Emails are not sent in the demo: they are stored and readable under **Admin → Email outbox**
(this is where password-reset and invitation links appear).

## What works

- **Public site** (AR/EN, RTL/LTR): home, catalog with search and filters, course detail, companies, about,
  contact, certificate verification, draft policies, 404 and error pages.
- **Accounts**: individual and company registration, sign-in/out, password reset, account settings, invitations.
- **Enrolment and checkout**: seat holds, SAR totals with configurable VAT, demo payment with success and
  declined outcomes.
- **Learner dashboard**: next-step guidance, statuses, protected joining instructions, attempts, certificates.
- **Exams**: per-course question bank, randomised questions and options, server-side eligibility and scoring,
  autosave, resume after refresh, offline retry, timer synced to the server, submit confirmation, attempt limits.
- **Certificates**: issued only when attendance and exam requirements are met; unique number; QR code;
  bilingual PDF; public verification showing minimal data; revocation and replacement with audit history.
- **Company dashboard**: seats, invitations, assignment, progress, certificate access, CSV report — isolated per company.
- **Instructor area**: only assigned sessions; joining details; manual attendance with audit trail.
- **Admin area**: courses, sessions, exams and questions, enrollments, attendance correction, certificates,
  companies, inquiries, audit log, email outbox.

## How it is organised

```
src/
  app/[locale]/…        Pages (public, dashboard, exam, checkout, company, instructor, admin)
  app/api/…             Auth handler, certificate PDF, company CSV report, payment webhook
  components/           UI kit (ui/), site shell (site/), exam runner, area components
  i18n/, proxy.ts       Locale routing (Arabic default; choice remembered in a cookie)
  messages/{ar,en}/     All translations, one JSON file per namespace
  lib/                  Formatting (SAR, Asia/Riyadh dates, Saudi mobile), validation schemas
  server/
    db/                 Drizzle schema, client, demo seed
    services/           BUSINESS RULES (seats, orders/payments, attendance, exams, certificates, company, admin)
    actions/            Thin server actions: validate → authorise viewer → call a service
    auth/               Better Auth configuration, session and role guards
tests/                  Business-rule tests
drizzle/                SQL migrations
docs/                   Production checklist, mobile app path
```

The interface never contains business rules: every rule lives in `src/server/services` and takes an explicit
database handle and the authenticated viewer. That layer is what a future mobile API would call.

## Key rules, and where they are enforced

| Rule | Where |
| --- | --- |
| Join links never appear in public data | `services/catalog.ts` selects public columns only; `getJoinDetails` authorises |
| Seat limits (including unpaid holds) | `services/orders.ts`, `services/enrollment.ts` (row lock + count) |
| An order is paid only by a trusted payment event, once | `handlePaymentEvent` (idempotent, amount-checked) |
| Exam eligibility, attempt limit, scoring | `services/exams.ts` (server only; answers never sent to the browser) |
| Certificate issue, revoke, replace | `services/certificates.ts` (+ partial unique index: one valid certificate per enrollment) |
| Company isolation | `services/company.ts` derives the organisation from the viewer, never from input |
| Role permissions | `auth/session.ts` guards per area + checks inside every service |

More: [docs/PRODUCTION.md](docs/PRODUCTION.md) · [docs/MOBILE.md](docs/MOBILE.md)
