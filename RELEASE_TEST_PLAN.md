# AIF Starter — release test plan

## Local smoke tests
- [ ] `npm install` completes without errors.
- [ ] `npm run build` completes without TypeScript errors.
- [ ] App opens at the Vite local URL.
- [ ] Demo login works for each of the four roles.
- [ ] Student can complete sample practice and see a score.
- [ ] Student recent-history table shows only the logged-in demo ID's attempts.
- [ ] Teacher can save a local question draft.
- [ ] Admin demo screen shows demo account list but cannot create real accounts.
- [ ] Export backup creates a JSON file; restore accepts a valid backup and rejects malformed JSON.
- [ ] Browser offline after first load: cached shell can reopen. Do not assume the whole app or cloud features work offline.
- [ ] Bengali text displays correctly on Android and desktop.

## Production security tests required before launch
- [ ] Student A cannot read Student B's profiles, attempts, answers or rewards through UI or direct API.
- [ ] Centre A cannot read Centre B's data.
- [ ] Teacher can only edit assigned board/medium/class/subject and only permitted draft statuses.
- [ ] Centre head cannot modify question answer keys, exam marks or account roles.
- [ ] Only admin server functions can create/deactivate privileged accounts.
- [ ] Direct client attempt inserts are rejected; only the reviewed server endpoint can submit/mark.
- [ ] Answer keys are never exposed before permitted release.
- [ ] Weekly and monthly limits are enforced on the server, including concurrent submissions.
- [ ] Duplicate network retries do not create duplicate attempts.
- [ ] Offline submissions with old assessment versions are rejected or routed for review.
- [ ] Audit events are generated for account termination, publication, score override and exports.
- [ ] Backup restore is verified on a separate test project.
