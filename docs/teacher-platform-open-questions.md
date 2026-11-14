# Teacher platform: open questions

Raised 13 November 2026 when the teacher flow (task 23.4) was reconsidered as a commercial subscription product, with proper teacher accounts, automatic server-side course creation, a review and edit phase, class management, homework and engagement reports. None of these are answered yet. Answer them before writing the `teacher-platform` OpenSpec proposal.

Questions marked **[B]** block everything else; answer those first. A lean in square brackets is a suggested default, not a decision. Related notes: `docs/teacher-flow.md` (how the flow works today) and `docs/case-study-ttrs-accounts.md` (how Times Tables Rock Stars does it).

## Answer first: the blocking set

1, 4, 9, 16, 27, 34, 39, 48.

## 0. The conflict with the current product rules

`CLAUDE.md` says no student accounts, no personal data, no stored audio and no public ranking. Homework tracking, per-student engagement reports and class management all need to know which student is which.

1. **[B]** Do you give up the "no personal data" promise, or keep it and build teacher features on pseudonyms (a class list of nicknames or codes the teacher maps to names offline)? [Lean: pseudonymous. A much smaller target, and an easier sale. The TTRS case study shows a middle path: real names held for the teacher, game names for peers.]
2. Is this a new product line or a replacement? [Lean: a separate OpenSpec change, `teacher-platform`. Version one stays as the demo and the free student experience.]
3. Do students still work without a teacher (for example a parent buying it), or only inside a teacher's class?

## 1. Who pays, and how

4. **[B]** Who is the customer: individual teacher, department, school or trust? Schools buy on purchase orders and annual invoices and want a DPA, a DPIA and security answers. An individual teacher with a card is a different sales motion.
5. What is the price unit: per teacher, per student, per school?
6. Is there a free tier or trial? Every free course creation costs model and speech spend, so it needs limits.
7. What is the refund, cancellation and data-export story? What happens to a school's data when it stops paying?
8. Must the first sale work in one school, or survive a trust of 20 schools with different admins?

## 2. Accounts and identity

9. **[B]** Teacher login: email and password, magic link, or school SSO (Google Workspace or Microsoft 365)? [Lean: SSO plus magic link, no passwords.]
10. Build auth or buy it (Clerk, Auth0, Descope)? Rolling your own is a liability at this stage.
11. Account recovery: what if the teacher leaves the school? Who owns the courses, and can the school admin take them over? Does recovery depend on email access they may have lost?
12. Roles: teacher, head of department, school admin, you (support). Can support staff impersonate a teacher, and is that logged and visible to the customer?
13. How do students join a class: class code (guessable at 4 to 8 characters at scale), a per-student link, or SSO? How do you stop a student joining the wrong class or a stranger guessing a code?
14. Student recovery: the current recovery code is per device. How does a 12-year-old who loses their phone get back in? Can the teacher reset it, and how is that verified?
15. MFA for teachers and admins?

## 3. Legal and data protection (UK, children aged 12 to 13)

Not legal advice. These are questions to put to a lawyer.

16. **[B]** Roles: is the school the controller and you the processor (which needs a DPA per customer, or a click-through schedule as TTRS does), or a joint controller? This shapes the contract and your liability.
17. Which standards from the ICO's Children's Code (Age Appropriate Design Code) and the DfE's guidance on generative AI and product safety expectations apply, and have you read them?
18. `docs/dpia.md` assumes no personal data. It needs rewriting if question 1 becomes "names".
19. Retention: how long is student progress kept, who deletes it, and how do you handle a subject access or deletion request that arrives via the school? (TTRS: 90 days automatic after a subscription ends, plus a 6-month leaver grace period.)
20. Sub-processors: Neon, Vercel, ElevenLabs, the transcription and language-model vendors. Where is each hosted? Do any transfers leave the UK, and under what mechanism? Schools will ask for the list and the regions.
21. Audio: browser recognition keeps audio on the device, but the fallback transcription sends clips to a vendor. Does that vendor retain or train on it? Do you have a zero-retention agreement in writing?
22. Safeguarding: if a student types or says something concerning, must you do anything? Is there any free text students can enter that others see?
23. Copyright: teachers will upload or photograph published sentence builders. Who warrants they have the right to? Do you want an indemnity clause and a takedown process?
24. Accessibility: schools often require WCAG 2.2 AA. There is no audit yet.
25. Insurance: professional indemnity and cyber cover, and the limit of liability in your terms.
26. Business basics: Ltd company, terms of service, privacy notice, VAT registration threshold, ICO registration fee.

## 4. Security

27. **[B]** Tenant isolation: every query must be scoped to a school. Is it enforced in the database (Postgres row-level security) or only in application code? One missed `where` clause is a cross-school leak. [Lean: row-level security as a backstop.]
28. The owner token is a bearer secret in a URL. That does not survive real accounts. Plan to remove it?
29. Uploaded worksheets and photos: malware scanning, type and size limits, where they are stored and deleted.
30. Prompt injection: a worksheet could contain "ignore your instructions and write something inappropriate". The current design validates every word against a word bank, which is a good defence. Keep that guarantee for uploaded content and teacher edits?
31. Rate limiting and bot protection per account, per IP and per tenant, on sign-up, upload and join.
32. Secrets, audit logs, a breach notification process (72 hours to the ICO), a penetration test before launch, dependency scanning.
33. Backups and restore: Neon point-in-time restore exists. Has restore been tested, and what is the recovery target?

## 5. Automatic server-side course creation: what breaks at scale

First define "users". 100 teachers is about 10,000 students. 100 students is one classroom. The costs and failure modes differ by about 100 times.

34. **[B]** Which unit do you mean by 100, 1,000 and 10,000: teachers, schools or students?

| Scale | What I'd expect to break or bite |
|---|---|
| **100** | Course creation is a long pipeline (model call, validation, retry, then a speech call per clip). A synchronous request will hit function timeouts and users will refresh and double-submit. You need a job queue with idempotency, status and retry even here. Current spend caps are global (£2 per 30 days for set-up), so one enthusiastic school exhausts it for everyone. |
| **1,000** | Cost caps must be per tenant, not global. Many courses created the same evening (Sunday night, start of term) hit vendor rate limits. Serverless database connections need pooling. Many schools use the same published sentence builders, so you pay to generate and voice the same text repeatedly. Support load becomes the main cost. |
| **10,000** | The audio store moves out of git and `public/` into object storage with a CDN. A single global class-code namespace gets crowded. Student traffic is bursty (a whole year group at 9am), so cold starts and database limits matter. You need monitoring, on-call, per-tenant dashboards, a status page and an SLA decision. Handling vendor outages (speech, model) becomes a real operational concern. |

35. Should the system cache and reuse generated content across schools, keyed by content hash? It cuts cost sharply, but one school's approved content reaches another, which needs a copyright and quality-control position.
36. Course quality: who is accountable when the model writes bad Spanish, a wrong gloss or an unsuitable answer? A human review step on your side, the teacher's, or both?
37. Idempotency and cost on re-edit: if a teacher changes one chunk, do you regenerate everything or only the affected clips and answers?
38. Maximum course size, and maximum courses per account per day?

## 6. Cost effectiveness

39. **[B]** What does one student cost you per month at the heaviest realistic usage? You need this before setting a price. Transcription fallback scales with students, course creation scales with teachers. What is the transcription vendor's per-minute cost?
40. Can heavy costs stay at build time and cached (as now) so student usage has near-zero marginal cost? That is your strongest margin property. What are you willing to give up to keep it?
41. The edge-tts voice is prototype only. The licensed voice you pick sets your audio cost and licence terms. Does the licence allow reselling audio inside a subscription product?
42. Hard stop or soft limit when a school passes its allowance?

## 7. Reliability and operations

43. What uptime do you promise, and what happens in the week before a school's speaking test if you are down?
44. Who is on call? If it is you alone, the contract should say so.
45. Environments: separate staging, preview data with no real student data, and a safe migration process (today migrations run during the build).
46. Monitoring and cost alerts: will you know the same day when a vendor bill spikes?
47. Poor school networks and locked-down Chromebooks (microphone permissions, blocked domains). Which domains must schools allow?

## 8. Teacher features: class management, homework and reports

48. **[B]** What is the smallest set that makes a teacher renew? My guess: create a class, set a task with a due date, see who has done it, see who is struggling. Which is the real pain point, and have you spoken to teachers about it?
49. Class lists: how do teachers add students without you storing names (see question 1)? Paste a list, import from the school's records (Wonde, Google Classroom, Microsoft), or students join by code and the teacher labels them?
50. Homework: what counts as "done"? Time spent, attempts, a score threshold, or a submission? Time can be gamed and scores penalise struggling students. The product rules say never penalise recognition failure, so "done" has to be effort-based.
51. Can teachers see a student's recording or transcript? Today nothing is stored. A yes raises the legal weight sharply.
52. Reports: engagement per student, per class and over time, exportable (CSV or PDF)? Who may see which student? How do you handle a student moving class?
53. Do reports risk making students feel monitored? The audience dislikes speaking tests. How do you keep the tone encouraging when a teacher can see who has not practised?
54. Notifications: email reminders to students (needs an email, which is personal data) or to the teacher only?
55. Parents: any access, now or later?

## 9. Content and safety

56. Do teachers get an edit step before students see a course? The spec already says nothing is used until the teacher confirms. Is the confirmation recorded, with who and when?
57. Screening of edits (length, blocklist, valid words) is stretch work today. In a commercial build it is mandatory, because a teacher-controlled text field goes in front of children.
58. How does a school report a bad course or clip, and how fast can you pull it?

## Suggested order for next time

1. Answer the blocking set: 1, 4, 9, 16, 27, 34, 39, 48.
2. Draft the `teacher-platform` OpenSpec proposal and design from those answers: data model, tenancy, the course-creation job pipeline, and a rewritten DPIA outline.
3. Put the 23.4 stub in `tasks.md` on pause, since this replaces it.
4. Optional: turn sections 3, 6 and 8 into a one-page questionnaire for a teacher, a school data protection officer and a lawyer. They can answer those better than we can.
