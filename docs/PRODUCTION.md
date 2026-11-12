# From demo to production

This project is a working demo. Nothing below is optional before real learners and payments.

## 1. What is demo data today

| Area | Demo state | Needed |
| --- | --- | --- |
| Courses, prices, schedules | Fictional (`src/server/db/seed.ts`) | Real catalog entered in Admin |
| Instructors | Sample profiles, credentials marked "not yet verified" | Real profiles; set `verified: true` only after checking original documents |
| Exam questions | 12 sample questions per course, flagged `isSample` | Question banks written and reviewed by qualified course owners |
| Companies, learners | Fictional accounts (`is_demo`) | Remove: run with `DEMO_MODE=false` on a fresh database |
| Payments | Simulated | Real provider (below) |
| Emails | Stored in `email_outbox` | Real delivery (below) |
| Policies | Marked drafts with placeholders | Business and legal review |
| Contact details | Placeholders | Real phone, email, address |
| Accreditation | None claimed | Add only with verified authorisation |

## 2. External services and credentials

| Service | Why | Where to connect |
| --- | --- | --- |
| **PostgreSQL** (managed) | Production database | Set `DATABASE_URL`. Migrations in `drizzle/` run on start (`src/server/db/client.ts`) |
| **Payment provider** supporting the intended Saudi methods (e.g. mada, cards, Apple Pay) | Real checkout | Replace `demoPayAction` (`src/server/actions/checkout.ts`) with the provider's hosted checkout; map the provider's event to `handlePaymentEvent` in `src/app/api/webhooks/payments/route.ts`; set `PAYMENT_PROVIDER` and `PAYMENT_WEBHOOK_SECRET` |
| **Email delivery** | Confirmations, resets, invitations | Implement delivery in `src/server/services/email.ts`; set `EMAIL_FROM`; configure SPF/DKIM |
| **Hosting** with HTTPS | Serve the app | Set `APP_URL`, `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), `DEMO_MODE=false` |
| **Shared rate-limit store** (e.g. Redis) | More than one server instance | Replace the Map in `src/server/rate-limit.ts` |
| Microsoft Teams / Zoom | Meetings | No integration required: admins or instructors paste links manually |

## 3. Payments

- The only code that marks an order paid is `handlePaymentEvent`. Keep it that way: never mark an order paid
  from a browser redirect. The result page only reports the stored state.
- Verify the provider's webhook signature using the provider's own scheme (the built-in check is a generic
  HMAC-SHA256 of the raw body in `x-aman-signature`).
- Implement refunds: orders in state `refunded` mean "paid but could not be fulfilled" and currently only raise
  an admin warning and an audit entry.
- No card data may touch this application; use the provider's hosted fields or redirect.

## 4. Tax and invoicing

- VAT is configurable (`VAT_ENABLED`, `VAT_RATE_BPS`) and stored per order. The order summary is **not** a tax invoice.
- ZATCA e-invoicing (Fatoora) is **not implemented**. Do not claim tax or e-invoicing compliance until it is
  implemented and reviewed by a qualified adviser.

## 5. Security and privacy before launch

- Turn on email verification and consider two-factor authentication for admins (Better Auth supports both).
- Add a Content-Security-Policy and HSTS at the hosting layer; basic security headers are set in `next.config.ts`.
- Creating the first administrator: set `role = 'admin'` on a user row directly in the database (there is
  deliberately no UI that grants admin).
- Review data retention, PDPL obligations, a data-processing register and breach procedures with counsel.
- The audit log records important changes; decide on retention and who may read it.
- Add monitoring, error reporting (without personal data) and database backups.
- Commission an independent security review and accessibility audit.

## 6. Known limitations

- Attendance is manual. There is no automatic Teams/Zoom attendance import and the product does not claim one.
- Exams are not proctored and are not described as such.
- A user can belong to one company only.
- Admin cannot edit the course syllabus or instructor credentials in the UI yet (seeded/database only).
- Certificates confirm attendance and a passed knowledge assessment only. Any practical or regulated
  qualification needs in-person assessment and the relevant authorisation.
- Tests cover the business rules; there are no automated browser tests yet.
