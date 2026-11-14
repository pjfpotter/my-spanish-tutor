# User testing plan (task 16.2)

Optional manual check. Skip it if there is no time; nothing else depends on it.

## Before

- Parental consent for each child, in writing. Explain what is recorded (your notes only: no audio, no video, no names).
- Use the live preview on the child's own phone. Create a fresh profile for each child with a class code (see the next section).
- Sessions of 15 to 20 minutes. Dolores first, then two or three other 13-year-olds.
- Sit beside them, say little, and do not rescue them. Write down what they do, not what they say they do.

## Which class code to use

| Code | What it is | Use it for |
|---|---|---|
| `TELE8` | The real class. The learning path is gated, exactly as for students. | Tasks 1 and 2: joining, the notice and Tele. |
| `PRBA7K3M` | The testing course: the same questions and sentence builder, with every step open. A "Testing course" label shows on the desktop. | Tasks 3 to 5: hearing a question, the timed round and the shop. |

A profile belongs to one course. After tasks 1 and 2, open **Privacy** and use **Delete everything**, then join again with `PRBA7K3M`. If time is short, use `PRBA7K3M` from the start (joining works the same way).

- **The seeded course has one sentence builder, for free time (question 5).** Questions 1 to 4 are about films, the cinema and clothes, and there is no going-out sentence builder yet. On the write screen those four say "There is no sentence builder for this question yet", and in the testing course a **Skip this question** button moves on. Only question 5 can be built and confirmed. This is intended: a sentence builder is never offered for a question it was not written for.
- The testing course also opens the gates inside the steps: expert mode in the timed round is available straight away, and **Settings** on the memorise screen opens any step of any answer.
- In the testing course the child has not written any answers, so the memorise and timed-round steps use the model answers. Their own answers are never needed. Read findings about "saying my answer" with that in mind.
- Attempts in the testing course are real attempts: they earn coins and count towards that profile's mastery. Treat every tester profile as throwaway and delete it afterwards.
- Do not give `PRBA7K3M` to students. It opens every step early. Nothing is lost, but the class would skip the gated order.

## Tasks to watch

1. Join from the class code (`TELE8`), read the notice, pick a nickname. Do they read the notice? Do they understand the recovery code?
2. Poke Tele. What do they say or do?
3. (`PRBA7K3M`) Write one answer, then hear one question. Do they know what to do next without being told?
4. (`PRBA7K3M`) One timed round. Do they notice the clock? Does it feel fair?
5. (`PRBA7K3M`) Open the shop. Do they come back to practice, or stay on the desktop?

## Testing the timed round on its own (the automate lab)

Open `/lab/automate` on the site (there is no link to it). It runs the real timed round on a made-up student, so nothing needs writing or memorising first, and nothing is saved to the server.

- Pick a fake student: short answers, a mix, or long answers. **Start again** returns the level, response window and personal bests to their start, as often as you like.
- Skip setup with the address: `?student=long&startAt=2&expert=1`.
- Tap **Notes** at any moment. The note is stamped with the question, level, window, response time and accuracy on screen, so you only need to say what you noticed. Every attempt is also logged without typing.
- **Copy notes** gives plain text to paste back. Notes and the log stay on that device until cleared.
- It uses real speech recognition, which costs a little each time, through the cost router.

## Questions afterwards (ask, then be quiet)

- Would you open this on your own? When?
- What was the most annoying thing?
- Did the score feel fair? Was there a time it was wrong?
- Do Tele and the look work for you, or put you off?
- Did you spend more time playing around than practising?

## Notes template (one per child, no names: use a letter)

| | Child A |
|---|---|
| Age / year | |
| Enjoyment (1 to 5, their own words) | |
| Scores felt fair? | |
| Tele and the look | |
| Play vs practice | |
| Where they got stuck | |
| Anything they asked for | |

## After

Save the filled-in notes in this folder as `docs/user-testing-notes.md` (it already holds the notes from the memorise lab session). Pick the top three issues, fix them, and tick 16.2.
