# Quality Score

Rubric for evaluating implementation quality in code reviews.

## Scoring Dimensions

### Correctness (0-25)
- Tests pass: +10
- Edge cases covered: +8
- Error handling complete: +7

### Design (0-25)
- SRP respected: +8
- No premature abstraction: +8
- Readable without comments: +9

### Security (0-25)
- No hardcoded secrets: +10
- Input validation at boundaries: +8
- Auth checks present: +7

### Observability (0-25)
- Structured logging on critical paths: +10
- Metrics/tracing hooks: +8
- Health checks: +7

## Score Thresholds

- 90-100: Ship it
- 70-89: Minor revision
- 50-69: Major revision
- Below 50: Redesign
