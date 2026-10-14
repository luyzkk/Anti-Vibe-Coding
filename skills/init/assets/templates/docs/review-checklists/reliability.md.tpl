# Reliability Checklist

- Background work is idempotent or has clear retry behavior.
- Provider calls handle timeouts, duplicate events, and partial failure.
- Database migrations have safe defaults and rollback expectations.
- Storage, email, queue, cache, and webhook dependencies are explicit before launch.
- User-visible failure states have clear recovery or support paths.
- Monitoring, logs, and replay steps exist for new critical flows.
