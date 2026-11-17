## Why

There is no way to leave a student profile on a device. A profile is one cookie, and the only ways out today are "Delete everything" (which erases the student's progress for good) or clearing the browser's site data by hand. That blocks two ordinary uses: a tester or teacher who needs to try the app as several students, and a shared school device that several students use in turn. The recovery code (shown once at sign-up, stored only as a hash) already lets a student get back in on any device, so a log-out that keeps all data is safe to offer, as long as the student is told plainly what it takes to return.

## What Changes

- A visible **Log out** button for a signed-in student, on the desktop beside "Privacy and your data" and on the Privacy page. It is not shown to a device with no profile.
- Tapping it asks first, in two taps: it says that this device will forget the student, that nothing is deleted, and that to come back they need their recovery code, which the app cannot show again. The choices are "Log out" and "Stay".
- Logging out clears the profile cookie and the student's device-local data (cached progress and planner settings), keeps the device's own settings (calm mode, sound, captions), and lands on the welcome screen where a new student can join or an old one can restore with a code.
- Nothing on the server is deleted or changed: the profile, answers, mastery, coins and its recovery code stay, the teacher overview still counts the student, and restoring with the code brings everything back.
- A small server route clears the cookie. It works with or without a cookie and never touches the database.

## Capabilities

### New Capabilities
- `student-log-out`: how a student leaves a profile on a device without deleting it, what the confirmation says, what is cleared on the device and what is kept, and how they return.

### Modified Capabilities
- `student-identity-privacy`: "Profile recovery" gains the case of returning to a profile after logging out on the same device. Defined in the unarchived change `ks3-spanish-speaking-tutor-v1`, so the delta is stated here as a requirement under the new capability name, as earlier changes did.

## Impact

- **Code:** a new `POST /api/profile/logout` route (`app/api/profile/logout/route.ts`) using `clearProfileCookie`; a client component (`app/components/LogOut.tsx`) with the two-tap confirmation and the device clean-up; placement in `app/components/Desktop.tsx` and `app/privacy/page.tsx`; a small shared helper for the device-local clean-up that `DeleteEverything.tsx` also uses.
- **Database:** none.
- **Docs and tests:** `docs/user-testing.md` (how to switch student), `docs/technical-documentation.md`, unit tests for the route and the helper, and an e2e spec for the whole flow.
- **Out of scope:** showing the recovery code again (the app stores only its hash, so it cannot), issuing a new recovery code, automatic log-out after inactivity, a student picker for a shared device, and any change to "Delete everything".
