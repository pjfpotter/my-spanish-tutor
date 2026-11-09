# Spec Delta

## Purpose

Makes revising feel like progress and play for teenagers who dislike speaking tests, rewarding effort and speed improvement without punishing mistakes or shaming anyone.

## ADDED Requirements

### Requirement: Coins for effort
Students SHALL earn coins for speaking attempts, completing sessions and personal improvements, and not only for correct answers.

#### Scenario: Wrong answer still earns
- **WHEN** a student makes a speaking attempt that scores low
- **THEN** coins are still awarded for the attempt

### Requirement: Response-time rank
Students SHALL have a rank that rises as their recent average response time falls, shown with their own history.

#### Scenario: Faster average
- **WHEN** a student's average response time drops below a rank boundary
- **THEN** their rank increases and the change is celebrated

### Requirement: Desktop unlocks
Coins SHALL buy fixed-price items for the student's desktop and sticker collection, such as wallpapers and objects. There SHALL be no random draws. No real money SHALL be accepted anywhere in the app.

#### Scenario: Item bought
- **WHEN** a student spends coins on a wallpaper
- **THEN** they receive exactly that item and no payment screen is shown

### Requirement: Play earns nothing
Coins and progress SHALL come only from practice. Exploring the desktop and poking the character SHALL NOT earn coins or progress, and SHALL have no timer or penalty.

#### Scenario: Exploring
- **WHEN** a student spends a session tapping around the desktop without practising
- **THEN** no coins or progress are awarded and nothing is lost

### Requirement: Progress shown in the world
Phase progress SHALL be shown in the character's world without changing the gated order. Each question's channel SHALL clear from static as comprehension mastery rises and lock only after mastery has held across separate sessions, locked phases SHALL appear as static, and the response-time rank SHALL be shown as a ladder of named steps.

#### Scenario: Mastery rises
- **WHEN** a student's comprehension mastery of a question increases
- **THEN** that question's channel shows a clearer picture

#### Scenario: Locked phase
- **WHEN** a student has not yet unlocked a phase
- **THEN** it appears as static and cannot be opened

### Requirement: Streaks without punishment
The app SHALL show a daily streak with a freeze that protects it on a missed day. There SHALL be no lives, hearts or loss of progress for mistakes.

#### Scenario: Missed day with freeze
- **WHEN** a student misses a day and has a freeze
- **THEN** the streak continues and the freeze is consumed

### Requirement: No public ranking
The app SHALL NOT rank students against named peers. Competition SHALL be against one's own earlier results, and class-wide goals SHALL be shown only as combined totals.

#### Scenario: Class goal
- **WHEN** a class goal is shown
- **THEN** it displays combined progress and no individual names or positions

### Requirement: Cheeky content pool
A hand-curated pool of mildly cheeky Spanish phrases SHALL be unlockable as a reward, and the course owner SHALL be able to switch the pool off.

#### Scenario: Pool off
- **WHEN** the pool is disabled for a course
- **THEN** no cheeky phrases appear for its students

### Requirement: Rewarding repetition requests
Using the repeat-the-question phrase and asking for help SHALL earn coins like any other effort.

#### Scenario: Help earns coins
- **WHEN** a student asks for a hint
- **THEN** it does not reduce their coins or rank

### Requirement: Sound and animation rewards
Correct answers, combos, personal bests and completed sections SHALL be celebrated with a short sound and an animation as defined in practice-session-feel. These SHALL respect reduced motion, the sound setting and the calm switch.

#### Scenario: Personal best
- **WHEN** a student sets a personal best
- **THEN** a larger celebration plays than for an ordinary correct answer

### Requirement: No loss framing
The app SHALL NOT use hearts, lives, league demotion, accuracy shaming or streak-loss warnings that threaten loss. Streak messages SHALL describe what the student has, not what they could lose.

#### Scenario: Streak message
- **WHEN** a student has a streak
- **THEN** the message celebrates it and does not warn that it will be reset
