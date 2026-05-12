# Reliability Review Checklist

Use for any change to error handling, retries, or SLO-critical paths.

- [ ] All async operations have error handling; no unhandled promise rejections
- [ ] Retry logic uses exponential backoff; no tight retry loops
- [ ] External dependencies have timeouts and circuit breakers
- [ ] Graceful degradation path tested for partial failures
- [ ] Observability: errors logged with enough context to diagnose
- [ ] Database queries have appropriate indices; no missing index warnings
- [ ] Load tested for expected peak traffic (if applicable)

---

Replace this scaffold with project-specific content.
