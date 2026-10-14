# Production Readiness Checklist

- Environment variables and credentials are listed with owner and environment.
- Database migrations, backfills, queue/cache schemas, and rollback risks are explicit.
- Web, worker, scheduler, and one-off job processes are accounted for.
- Storage buckets, CORS, lifecycle, and access policies are ready.
- Email domains, sender identity, webhook secrets, and provider settings are configured.
- Security headers, SSL/HSTS, rate limits, and token peppers are ready where applicable.
- Smoke tests, monitoring, logs, alerting, replay, and rollback steps are known.
