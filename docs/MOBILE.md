# Path to iOS and Android apps

The web platform is responsive and installable to a phone's home screen (web app manifest and icons).
**That does not make it an App Store or Google Play app.** No service worker is registered, so nothing —
in particular no authenticated page, exam, joining link or certificate — is cached for offline use.

## Recommended path

1. **Expose the backend as an API.** The business rules already live in `src/server/services` with explicit
   viewer and database arguments. Add versioned JSON route handlers (`/api/v1/...`) that authenticate, then call
   the same services. Do not duplicate rules in the app.
2. **Mobile authentication.** Better Auth supports bearer tokens and has an Expo integration; use secure device
   storage for tokens, not web cookies.
3. **Build with React Native (Expo).** It shares TypeScript types, the Zod validation schemas in
   `src/lib/validation.ts`, the formatting helpers and the translation JSON files in `src/messages`, and
   supports RTL layouts.
4. **First release scope:** catalog and booking, dashboard, joining links (deep-link into Teams/Zoom), exam,
   certificates, push reminders before a session.
5. **Store requirements to plan for:** developer accounts, privacy disclosures, account deletion inside the app,
   review of how course purchases are paid for under each store's rules (seek advice early), Arabic store
   listings and screenshots, accessibility checks on real devices.
6. **Exams on mobile:** keep scoring and deadlines on the server exactly as now; handle app backgrounding and
   connection loss with the same save-and-retry approach as the web exam.
