# AIF Academic Platform Starter — v0.1.0

A developer-ready **starter** for the AIF Classes 1–6 multi-centre academic platform. It includes a responsive React/Vite PWA shell, sample bilingual questions, demo role dashboards, local result storage, a local question-draft screen, a local backup/export flow, a service worker, and an initial Supabase schema with Row Level Security policies.

## Honest status: what this is and is not

**Working locally:** demo sign-in, role-specific navigation, sample practice/exam flow, client-side sample marking, local attempt history, device-local question drafts, local JSON backup/restore, PWA shell caching after a production build.

**Not production-ready yet:** no live user provisioning, no secure server-side marking/submission endpoint, no implemented cloud result sync, no published-question approval service, no complete centre analytics, no quarterly award engine, no verified complete syllabus, and no hardened exam anti-cheat. The sample demo passwords are public in the code. Never use demo accounts for real student records.

This starter intentionally refuses to pretend that local browser checks are secure cloud authorization. The Supabase schema is a foundation to review and test, not a certification of production security.

## Requirements

- Node.js 20 LTS or newer
- npm
- A modern browser
- Optional: a Supabase project for the next backend phase

## Run locally

1. Extract the ZIP.
2. Open a terminal in this folder.
3. Run:

   ```bash
   npm install
   npm run dev
   ```

4. Open the URL printed by Vite (usually `http://localhost:5173`).
5. Use one of the demo accounts listed on the login page.

Demo accounts:
- Student: `AIF-STU-0001` / `student123`
- Teacher: `AIF-TCH-0001` / `teacher123`
- Centre Head: `AIF-CEN-0001` / `centre123`
- Super Admin: `AIF-ADM-0001` / `admin123`

These credentials are only for the local prototype. They are not secure.

## Production build check

```bash
npm run build
npm run preview
```

Open the preview URL and verify login, sample practice, result history, offline shell reopening and local backup export.

## Deploy static PWA to GitHub Pages

1. Create a GitHub repository, for example `aif-academic-platform`.
2. Upload the project files (do not upload `.env` files or credentials).
3. In `package.json`, add a deployment script only if you choose to use a GitHub Pages deploy action. The simplest path is to use GitHub Actions with `npm ci`, `npm run build`, and publish the `dist/` folder.
4. In repository Settings → Pages, select **GitHub Actions** as the source.
5. The deploy workflow is already included at `.github/workflows/deploy.yml`; commit and push it with the project.
6. In repository Settings → Pages, select **GitHub Actions** as the source.
7. Because this Vite config uses `base: './'`, it is intended to work under a repository subpath; still test the final repository URL carefully.
8. HTTPS is required for reliable PWA service-worker installation. GitHub Pages provides HTTPS on its hosted address.
9. Share the resulting GitHub Pages URL. Users install it from the browser; no app-store listing is required.

A copy of the workflow is also included in `docs/github-pages-workflow.yml`.

## Configure Supabase (backend phase)

1. Create a Supabase project and keep its database password safe.
2. In the Supabase SQL editor, review and apply `supabase/migrations/001_initial_schema.sql` to a **new test project** first.
3. Add the public project URL and **anon/public key only** to a local `.env` file using `.env.example` as a template.
4. Never put the `service_role` key in browser code, a public repository, or a client `.env` variable.
5. The current login UI only demonstrates a limited auth/profile lookup path for email-based users. It does not implement account provisioning or result submission. AIF student IDs will need a secure server-side mapping or a supported email/username login design.
6. Before real users are added, implement and test:
   - Admin-only server-side account provisioning and termination
   - Student ID to authentication identity mapping
   - Server-side attempt submission, marking and idempotency
   - Assessment schedule and attempt-limit enforcement
   - Teacher question review/publish workflow
   - Centre-scoped reports and audit logging
   - Offline submission queue with conflict handling
   - Password recovery and privileged-staff MFA
7. Use Supabase Auth with RLS. Test every policy using at least two students in different centres, two teachers with different assignments, a centre head, and an admin.

## Curriculum and sample content

The question set is intentionally tiny and illustrative. It is not a verified CBSE, CISCE/ICSE, or West Bengal Board question bank. ISC is a senior-secondary CISCE examination; for Classes 1–6, map content to the relevant ICSE/CISCE curriculum instead. Build a syllabus register with academic year, official source, class, subject, chapter, medium and review status before bulk content entry.

## Offline behavior and limitations

- The service worker caches the app shell and same-origin assets; this is not a full offline database sync implementation.
- Attempts and question drafts in demo mode are stored in browser local storage, not IndexedDB. Browser data can be cleared and does not follow the user to another device.
- A local “queued” marker is not a working cloud-sync implementation.
- An offline exam can be manipulated on a compromised device. Use connected, server-timed assessments for high-stakes exams or define a controlled offline protocol.
- A service worker cannot make first-time installation happen without a network connection.
- iOS and desktop installation steps differ by browser and operating system.

## Security release checklist

- [ ] Remove/disable all demo credentials in production build.
- [ ] Complete and penetration-test RLS policies.
- [ ] Implement a server-only marking endpoint/RPC and validate submitted answers against server-owned answer keys.
- [ ] Enforce weekly practice and monthly examination limits on the server using authoritative timestamps.
- [ ] Never return answer keys before the assessment's configured release time.
- [ ] Verify cross-student and cross-centre isolation with direct API tests.
- [ ] Add privileged staff MFA, rate limits, account recovery and session revocation.
- [ ] Create backup schedule and perform a restore drill.
- [ ] Add data-retention, parent-consent and child-privacy procedures.
- [ ] Obtain curriculum review and independent QA before academic use.
- [ ] Configure monitoring, incident response, and dependency updates.
- [ ] Have a qualified developer review the code and schema before storing real child data.

## Suggested next implementation milestones

1. Replace demo authentication with secure student-ID sign-in backed by Supabase Auth.
2. Add server-side admin functions to create/deactivate accounts.
3. Add secure exam submission + marking endpoint and server-enforced scheduling.
4. Migrate local storage to IndexedDB and implement an idempotent sync queue.
5. Complete role-scoped dashboards, question approval and curriculum import.
6. Add rewards, report exports, monitoring and operational backups.
