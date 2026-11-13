# Case study: how Times Tables Rock Stars handles accounts

Research note for the teacher platform decision (see `docs/teacher-flow.md` and the open question under task 23.4). It records how one successful UK school product, Times Tables Rock Stars (TTRS, by Maths Circle Ltd), handles teacher accounts, pupil accounts, recovery, data protection, retention and pricing, and what that suggests for this app.

- **Researched:** 13 November 2026, from public pages only.
- **Not legal advice.** The contract and data-protection points are a reading of a competitor's public documents. A lawyer should review anything adapted from them.
- **Not read:** the child-friendly privacy notice (extracted but not reviewed), the cookie policy, the full Intercom help centre. Prices for the school subscription are not public on the pages read.

## Summary

TTRS is pseudonymous, not anonymous. The school creates every pupil account from its own records, pupils appear to each other under a chosen game name, and teachers always see real names and full stats. The school is the data controller and TTRS the processor, under a schedule inside the standard terms that is accepted by continuing to use the product. Lost passwords are the school's job, not TTRS's. Retention is short and explicit. Homework and in-depth reports are paid add-ons.

## Accounts and identity

**Teachers**
- An existing teacher invites a new one (name and email); the invitee sets their own password from an emailed link. There is no self-sign-up for teachers inside a school.
- Teacher accounts lock after too many wrong passwords and do not unlock themselves. The teacher resets by email. TTRS gives the difference in data sensitivity as the reason pupil and teacher accounts are treated differently.
- TTRS advises schools to remove staff promptly when they leave.

**Pupils**
- Children cannot register themselves. A teacher, tutor or parent creates the account.
- Two routes for schools: sync from the school's records through Wonde (recommended, free, updated daily), or spreadsheet upload (joiners, leavers and year-group moves are then manual).
- Pupils log in with a username and a password. Default passwords are three random letters. Teachers can set custom passwords in bulk, and printable username labels and parent letters hand credentials home without needing an email address.
- Each pupil picks a game name ("Rock Name") and an avatar. Game names are shown on leaderboards and in multiplayer games by default. Pupils can choose "Hide me" so classmates don't see their scores. Teachers still see the real name and all stats.

**Recovery**
- Pupils: ask the teacher. Too many wrong attempts locks the account for about 8 hours, or a teacher unlocks it sooner. Teachers are not notified of pupil lockouts, but failed attempts are logged.
- Teachers: reset by email.
- Families are told to contact the school for login problems in the school case. Family-account recovery was not found.
- Lockout cannot be turned off by schools. TTRS ties it to its security certifications.

**Leaving and deletion**
- A teacher can delete a pupil immediately and permanently, or send them to a Leavers Group.
- The Leavers Group keeps the account for 6 months (not adjustable), then deletes it. During that time the pupil can be moved to another school or a family account ("teleport"). Pupils who drop off the Wonde roll are moved there automatically.

## Data protection and legal

**Roles.** For school and tutor subscriptions the school is the controller and Maths Circle the processor. For family subscriptions the schedule does not apply and Maths Circle's privacy notice governs.

**Contract.** The "Data Protection with Schools" schedule sits inside the standard terms. Continued use means acceptance, so no separate agreement is signed. It covers processing on the school's documented instructions, confidentiality, security, pre-authorised sub-processors (Annex B) with notification and a right to object, help with data subject requests (at the school's expense), breach notice "without undue delay", deletion on written request, one audit a year, and mutual indemnities. The school warrants it has a lawful basis for supplying the data and indemnifies TTRS if not. Indirect and reputational loss is excluded. No financial liability cap was seen in the schedule.

**Data collected (schools).** Required: pupil name, year group and class; teacher name and email; school name and address. Optional, for impact reporting: pupil date of birth and gender. Learning data: answers and time taken. Automatic: IP address, device and browser details, country or city-level location, pages and clicks. Not mentioned: pupil email, UPN, audio, images.

**Sub-processors.** Only a few are marked as handling child data: Hetzner (Germany), AWS (EU, backups), Heroku (EU), contracted developers, and Wonde (UK, optional). Everything else is marked as holding no child data, including support, email, billing, internal tools and Google Analytics (US). Standard contractual clauses (SCCs) are named for the US processors.

**Retention.**
- All pupil data is deleted automatically 90 days after a subscription or trial lapses without renewal, with warnings to the main contact beforehand. Backups clear within about 10 days.
- Individual leavers are handled through the Leavers Group (6 months).
- No fixed period is stated for teacher data.

**Compliance claims.** ICO registered, Cyber Essentials and Cyber Essentials Plus, claimed compliance with UK GDPR and the ICO Age Appropriate Design Code, internal DPIAs held and available on request, an EU and Swiss representative. They state no DPO is legally required and that a named staff member handles data protection. Safety design claims: no chat, no advertising, no in-app purchases, no location features, high privacy settings by default.

**Rights requests.** For schools, requests from pupils or parents are routed through the school. Maths Circle helps and passes on anything it receives directly.

## Commercial model

- A basic school subscription, plus two optional paid add-ons: **Sessions** (set homework) and **Stats** (in-depth reports and rewards). Add-ons can be bought part-way through and are pro-rated.
- Discounts: 20% for schools with 100 or fewer pupils, 40% for 50 or fewer, 10% for groups of schools (stackable). A discount on renewal for schools that also buy their sister product.
- Families pay separately. A search snippet gave about £7.20 a year for up to three children; this was not confirmed on a primary page.
- The product is sold on a subscription that does not renew automatically.

## What this suggests for My Spanish Tutor

1. **Pseudonymous accounts are a workable middle path** between today's no-personal-data rule and full named accounts. A game name for peers, a real or class-list identity only for the teacher.
2. **Let the school carry identity and recovery.** Class-list import or teacher-created pupils, teacher-reset passwords. We never run a child identity service.
3. **Treat teacher accounts as more sensitive than pupil accounts.** Stricter lockout, email-based reset, prompt removal when staff leave.
4. **Make retention a visible feature.** A short automatic expiry after a subscription ends, and a leaver grace period schools can see.
5. **Separate pricing of the core from teacher analytics.** Homework and reports as add-ons keeps the base price low.
6. **Click-through processing terms** remove a procurement step. School as controller, us as processor, one published schedule, one published sub-processor list.
7. **Keep child data in as few processors as possible and publish the list.** This is where we differ most: the speech-recognition fallback and any language-model vendor would handle children's voices or text, so they would sit in the "child data: yes" column and need their own contracts and retention terms. Avoiding the transcription fallback, or making it opt-in per school, would keep the list short.
8. **Avoid US analytics on a children's product**, or any analytics that sees pupil activity.
9. **Close two gaps they leave open:** a fixed breach-notice window (for example 24 or 48 hours) and a stated liability position.
10. **Family accounts are a separate legal case.** Selling to parents makes us the controller. Decide whether that is in scope before building it.

## Sources

- Maths Circle terms and conditions, with the Data Protection with Schools schedule and Annexes A and B (November 2024): https://mathscircle.com/uploads/Maths_Circle_Ltd_Terms_and_Conditions.pdf
- Maths Circle GDPR and Data Protection FAQ (October 2024): https://mathscircle.com/uploads/Maths_Circle_GDPR_and_Data_Protection_FAQs.pdf
- Maths Circle privacy notice (March 2024): https://mathscircle.com/privacy-notice/
- Is Maths Circle compliant with UK GDPR: https://intercom.help/times-tables-rock-stars/en/articles/1562961-is-maths-circle-ltd-gdpr-compliant
- How do I unlock a locked account (Schools): https://intercom.help/times-tables-rock-stars/en/articles/9547765-how-do-i-unlock-a-locked-account-schools-ttrs
- I'm a teacher but I don't have a log in: https://intercom.help/times-tables-rock-stars/en/articles/3061346-i-m-a-teacher-but-i-don-t-have-a-log-in-how-do-i-get-access
- How much does TTRS cost: https://intercom.help/times-tables-rock-stars/en/articles/1563137-how-much-does-ttrs-cost
- User management collection (article titles only): https://intercom.help/times-tables-rock-stars/en/collections/938040-user-management-for-times-tables-rock-stars-and-numbots
- Four tips for staying safe on TTRS: https://ttrockstars.com/4-tips-for-staying-safe-on-times-tables-rock-stars/
- Family pricing snippet (unverified): https://www.bigmaths.com/pricing/
