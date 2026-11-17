## 1. Server

- [ ] 1.1 Add `POST /api/profile/logout` (`app/api/profile/logout/route.ts`): clear the cookie, return `{ ok: true }` with `no-store`, touch no database. Test that it works with a valid cookie, with none and with a deleted profile's, and that the profile and its answers are unchanged afterwards.

## 2. Device clean-up

- [ ] 2.1 Add `clearStudentDeviceData()` (`lib/profile/device.ts`) with the allowlist `calm`, `subtitles` and the sound key; tolerate blocked storage. Unit tests: per-student keys go (ladder, automate rows, planner, dreamcore), the three settings stay, and an unknown new key goes.
- [ ] 2.2 Make `DeleteEverything.tsx` use the helper or leave it as it is, whichever is simpler, with a test that Delete everything still returns the device to first-use state.

## 3. Interface

- [ ] 3.1 Add `app/components/LogOut.tsx`: a button, the inline two-tap confirmation with the recovery-code warning and "Log out" and "Stay", the failure message, focus handling and phone-sized targets. Invoke the `frontend-design` skill first and reuse the tokens in `docs/design-direction.md`; respect reduced motion and light and dark themes.
- [ ] 3.2 Show it on the desktop beside the Privacy link and on the Privacy page above Delete everything, only when signed in.

## 4. Verify and document

- [ ] 4.1 e2e spec: log out from the desktop (confirmation shown, Stay changes nothing), land on the welcome screen, join as a new student, then restore the first student with their recovery code and see their data; calm mode stays on across it; the Privacy page also has the control; there is no control when signed out.
- [ ] 4.2 Accessibility pass: keyboard path, focus after open and close, reduced motion, 375 px wide.
- [ ] 4.3 Update `docs/user-testing.md` (how to switch student) and `docs/technical-documentation.md`; add the change to `ks3-spanish-speaking-tutor-v1/tasks.md`.
