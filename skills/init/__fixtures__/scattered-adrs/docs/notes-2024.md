# Engineering Notes 2024

## Q1 Notes

- Migrated authentication to JWT tokens.
- Removed legacy SOAP endpoints.
- Added Redis cache layer for session management.

## Q2 Notes

- Introduced feature flags via LaunchDarkly.
- Performance audit: reduced API p99 from 800ms to 120ms.
- Added distributed tracing with OpenTelemetry.

## Decisions Pending

- Evaluate GraphQL federation for API gateway.
- Consider replacing Redis with Memcached for cache tier.
