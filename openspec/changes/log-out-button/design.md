# Design

## Context

See `proposal.md` for why. Observed today: the signed-in profile is the httpOnly cookie `profile` (`lib/server/session.ts`, with `setProfileCookie` and `clearProfileCookie` already there); `DELETE /api/profile` deletes the data and clears the cookie; the recovery code is shown once at sign-up and only its hash is stored (`recovery_code_hash`), so it cannot be shown again. The desktop (`Desktop.tsx`) shows the join and restore links when there is no profile, and a "Privacy and your data" link when there is. `DeleteEverything.tsx` clears all of `localStorage` and `sessionStorage` on success. The device holds some per-student cache in `localStorage` (the memorise ladder, automate rows, planner preferences and the reminder flag, the dreamcore save) and three device settings: `calm`, `subtitles` and the sound key.

## Goals / Non-Goals

**Goals:** a one-step-plus-confirm log out that deletes nothing, tells a 12 year old plainly what returning takes, leaves the device clean for the next student, and keeps the device's own settings.

**Non-Goals:** showing or reissuing a recovery code, automatic or timed log-out, a student switcher, and any change to Delete everything.

## Decisions

### D1. A server route that only clears the cookie
`POST /api/profile/logout` calls `clearProfileCookie()` and returns `{ ok: true }` with `Cache-Control: no-store`. It reads no body, does not need a valid profile, and writes nothing to the database, so it is idempotent and safe if the cookie is missing or the profile was deleted. The cookie is httpOnly, so only the server can clear it; that is why this needs a route and not client code.
- **Alternative: a server action.** Equivalent. A route is used because `DELETE /api/profile` already sets the pattern and is covered by the same tests and helpers.

### D2. Two taps, with the recovery-code warning
The control reveals an inline confirmation (the pattern `DeleteEverything.tsx` uses: `role="alertdialog"`, "Log out" and "Stay") with the text: this device will forget you; nothing is deleted; to come back you will need your recovery code, which cannot be shown again. A single tap that signs a student out with no way to see their code again is the main hazard of this feature, so the confirmation is required and not optional.
- **Alternative: no confirmation.** Faster for a tester, but one stray tap on a phone could lock a student out of their own progress. Rejected.
- **Alternative: also store the code on the device so it can be shown.** Defeats the point of storing only a hash and puts a credential in `localStorage` on a shared device. Rejected.

### D3. What the device clears and keeps
A shared helper `clearStudentDeviceData()` (new, `lib/profile/device.ts`) removes every `localStorage` and `sessionStorage` key except an explicit allowlist of device settings: `calm`, `subtitles` and the sound key. Keeping an allowlist, not a list of keys to clear, means a new per-student cache added later is cleared by default, which is the safe direction on a shared device. `DeleteEverything.tsx` keeps clearing everything as now (it is a full reset), or uses the helper with an option to also clear the settings; the choice is left to the implementation, with a test either way.
- **Alternative: clear nothing, only the cookie.** The next student on the device would inherit cached ladder progress and planner settings keyed by the same device. Rejected.

### D4. After logging out
On success the client calls the helper, then `router.replace('/welcome')` and `router.refresh()`, so the desktop re-renders as signed out. `/welcome` already offers joining and a link to restore. If the request fails, the student sees "That did not work. Try again in a moment." and stays signed in; the helper runs only after success.

### D5. Where it sits
A "Log out" button next to the Privacy link on the desktop, and on the Privacy page above "Delete everything" (it is the gentle option, so it comes first). Neither is shown when `currentProfile()` is null, as now for Delete everything. The component is small and shared.

## Risks / Trade-offs

- **A student who did not note their recovery code is locked out of that profile** and must start fresh. The confirmation is the mitigation; the only full cure (showing or re-issuing a code) is a separate change.
- **Shared devices:** the cookie is the only link to a profile, so logging out is real privacy for the next student; the allowlist makes the local clean-up fail safe.
- **A tester logging out and in repeatedly** creates many profiles in a testing course. They stay in the database until deleted with Delete everything; that is existing behaviour.
