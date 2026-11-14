# Data protection impact assessment

My Spanish Tutor, version 1. About one page, for the school and for parents. The student-facing version is the privacy notice in the app (`/privacy`).

## Purpose

Help Year 8 students (age 12 to 13) revise for a KS3 Spanish speaking test. Students join with a class code. There are no accounts. The school or department is the customer and decides whether its students use the app.

## Data we hold

- **Profile:** a random id, a nickname picked from a generated list, and a hash of the recovery code. No name, email, phone number or school identifier. No free-text field exists in sign-up.
- **Practice:** the answers a student writes (limited to the course vocabulary), attempts with scores, response times, mastery, coins and purchases. There is no mood check-in; the table that held it is no longer written to or read from.
- **Never held:** audio recordings, photographs, location, or contact details. A student's own drawing, if added later, stays on their device.
- **On the device:** a session id, display settings, plan and reminder settings. Reminders are off until the student turns them on.

## Who else sees data

- **Speech recognition.** The browser's built-in recogniser may send the student's voice to the browser maker (for example Google or Apple). The app does not control this and says so in the notice. If the browser cannot recognise speech, a short clip may be sent once to a transcription service (OpenAI) and is processed in memory only. The clip is never stored by us. The vendor's retention settings must be checked and set to no retention before launch (not yet verified).
- **Hosting.** Vercel (application) and Neon (database), in the region chosen at set-up. Both act as processors.
- **Language models** read and interpret a teacher's uploaded sentence builder and draft course content, at upload time only. What they receive is teacher content (a document, treated as quoted data). They never see student data: no names, answers, recordings, interests or session ids are in any model call. The practice loop and the writing screen make no model calls, and the interpretation stored with a course holds nothing about a student.

## Risks and what reduces them

- **A student types something personal into an answer.** This is the one place a student can type free text. A confirmed answer must use only the course vocabulary, but an unconfirmed draft is saved as typed (up to 1,500 characters). Mitigations: the notice asks students to keep private things out, drafts are deleted by Delete everything, and nothing is shown to other students or sent to a model. Open item: reject out-of-vocabulary drafts on save (needs a design decision, see the change tasks).
- **A recovery code is shared or guessed.** Codes are long and random, stored only as a hash, and give access to nothing but a nickname and practice history.
- **A class code is guessed.** A code only lets someone make an anonymous profile in that course. Class totals show counts, never names.
- **Pressure or comparison.** There is no public ranking and no hearts or lives. Students compare only with their own earlier results.
- **Voice leaves the device.** This is the main residual risk. It is stated plainly in the notice and no recording is kept by us. A typed fallback exists when recognition fails, but students are not offered a way to avoid speaking, which is the point of the app.

## Retention

Data is kept while the course runs and is deleted by the student at any time with one action. The school can ask for a whole course to be deleted at the end of the year. Spend logs keep amounts only, with no link to a profile.

## Rights

Because nothing identifies a student, the school cannot be asked to find one. Access and erasure work through the student: they can see their own history in the app and press Delete everything, which removes all of their server-side data at once.

## Decision

Low to medium residual risk for version 1 once the notice is shown and acknowledged before joining, and the open draft-text item and the vendor retention check are closed. Review again before adding any feature that stores new kinds of data, such as photo import or any account system.
