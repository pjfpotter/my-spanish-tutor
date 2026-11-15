## Why

The timed round (the last phase) can only be reached today by going through the whole student journey, or by joining the testing course and finding the screen each time. There is no way to run it again and again from a known starting point, try it as different kinds of student (short answers, long answers), and write down what felt wrong while it is fresh. The owner is about to test this phase repeatedly and feed notes back, so the notes need to be captured with the numbers that explain them.

## What Changes

- A new page at `/lab/automate`, off the main site (no link from the desktop, not indexed), like the other `/lab` pages. It runs the real timed round: real microphone, real transcription, real scoring and the same screens as the phase.
- Three pre-written fake students, chosen on the page or by address (`?student=`): short answers, a mix, and long answers. Their five answers are built from the seeded model answers at different lengths, so the chunk ladder, hints and expert mode all get exercised. Nothing needs writing, understanding or memorising first.
- A round can be started again from the same place as often as wanted: a Start again button clears the lab's own ladder, response window and personal bests, and optional address values (`?startAt=`, `?expert=1`) skip setup.
- Nothing is saved to the server. No profile, no attempts, no coins, no audio. Progress lives on the device, under keys that cannot collide with the real phase.
- A notes panel stays under the round. Each note is stamped with what was on screen (fake student, question, level, window, last response time, accuracy, whether a hint or blank happened), a few one-tap tags (too fast, too hard, unfair, confusing, good) and free text. A running log of every attempt is kept. One button copies notes and log as plain text to paste back.

## Capabilities

### New Capabilities
- `automate-lab`: the lab page, the fake students, what a lab run keeps and where, starting again, and the notes and attempt log.

### Modified Capabilities
<!-- None. The real phase's behaviour does not change; the lab is a mode of the same screen that is off by default. -->

## Impact

- **Code:** `app/lab/automate/page.tsx` (new), `lib/lab/fake-students.ts` (new, pure), `lib/lab/notes.ts` (new, pure: stamp, format, storage keys), `app/phases/automate/Automate.tsx` (a `lab` mode: real capture, no server write, reports each attempt and its stamp to the page), a small notes component under `app/components/lab/`.
- **Database and API:** none. Transcription still goes through `/api/transcribe` and its cost router, with no profile.
- **Privacy:** notes and logs are written by the tester on their own device and never sent anywhere. No student data and no audio are involved.
- **Cost:** real transcription calls are paid. They go through the cost router like any other, and the page says so.
- **Out of scope:** the other phases, a server-side lab profile, sharing notes through the app, and changing any scoring or window rule. Findings from the testing become a later change.
