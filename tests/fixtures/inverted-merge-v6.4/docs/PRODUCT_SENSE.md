# Product Sense

Guidelines for when to push back on requirements.

## When to Push Back

### Complexity Without Clear Value
If a feature requires >3 days of implementation but the user impact is unclear,
surface the tradeoff: "This adds complexity — what decision does it enable?"

### Premature Optimization
Avoid building for scale until the problem actually exists. Don't design for
10M users when there are 100.

### Unclear Acceptance Criteria
Never start building without answerable CAs. Ask: "How do we know this is done?"

## When NOT to Push Back

- Legal/compliance requirements: implement first, optimize later
- Security fixes: no negotiation on critical vulnerabilities
- Explicit user research: if there is data, trust the data

## The Two-Question Test

Before any feature, ask:
1. What user pain does this solve?
2. How will we measure success?

If either is unanswerable, surface to stakeholders before starting.
