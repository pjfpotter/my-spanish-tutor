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

### Requirement: Collectibles
Coins SHALL buy items for the student's avatar and sticker collection, including random-draw packs that use only in-app coins. No real money SHALL be accepted anywhere in the app.

#### Scenario: Pack opened
- **WHEN** a student spends coins on a pack
- **THEN** they receive items and no payment screen is shown

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
