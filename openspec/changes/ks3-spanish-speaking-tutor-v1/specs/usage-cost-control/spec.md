# Spec Delta

## Purpose

Keeps running costs low and predictable at scale by using the cheapest adequate tool for each task, reusing results, capping spend, and reporting the cost per student.

## ADDED Requirements

### Requirement: Cheapest adequate tool
Each task SHALL be handled by the cheapest tier that can do it, in this order: stored result, rule-based logic, speech recognition, small language model, large language model. A higher tier SHALL be used only when the lower tiers cannot.

#### Scenario: Repeated question
- **WHEN** a student requests audio that already exists
- **THEN** the stored clip is served and no generation call is made

### Requirement: Language model usage limits
Language models SHALL be used only for drafting answers, personalising wording, generating persona phrase banks and importing photos. Live practice loops MUST NOT call a language model.

#### Scenario: Practice round
- **WHEN** a student completes a full automatisation round
- **THEN** no language model call is made

### Requirement: Spend caps
Every paid service SHALL have a configured hard cap. When a cap is reached the related feature SHALL degrade gracefully to its fallback instead of failing or overspending.

#### Scenario: Cap reached
- **WHEN** the drafting budget is exhausted
- **THEN** students are offered model answers and the event is logged

### Requirement: Cost metering
Every external call SHALL log its service, size and estimated cost against the course and the anonymous profile.

#### Scenario: Metered draft
- **WHEN** a draft is generated
- **THEN** its token usage and estimated cost are recorded

### Requirement: Cost per student report
A report SHALL show estimated cost per student per test cycle, broken down by tier, and SHALL be viewable by the course owner.

#### Scenario: Report viewed
- **WHEN** the owner opens the cost report
- **THEN** it shows cost per student and the share from each tier

### Requirement: Rate limiting
Each profile SHALL be rate-limited on calls to paid services to prevent runaway cost from bugs or abuse.

#### Scenario: Burst of requests
- **WHEN** a profile exceeds its limit
- **THEN** further paid calls are refused with a friendly message until the window resets
