# Architecture — Fictional E-Commerce Platform

## Overview

This document describes the architecture of the Shoptastic e-commerce platform. Shoptastic
is a multi-tenant B2C marketplace serving small and medium retailers. The system processes
approximately 50,000 orders per day at peak load, with an average response time under 200ms
for product listing pages.

The platform is built as a set of loosely coupled services communicating over HTTP and an
internal event bus. Each service owns its own data store and exposes a well-defined API
contract. Services do not share databases — cross-service data access happens exclusively
through public APIs or asynchronous events.

The architecture follows the principle of progressive decoupling: core transactional flows
(checkout, payment, inventory reservation) are tightly coordinated, while non-critical flows
(recommendations, analytics, notifications) are fully async and failure-tolerant.

All external traffic enters through a managed API gateway that handles rate limiting,
authentication token validation, and request routing. Internal service-to-service calls
bypass the gateway and use mTLS with service mesh for mutual authentication.

## System Boundaries

### Frontend

The customer-facing frontend is a Next.js application deployed on Vercel. It uses
server-side rendering for product listing and detail pages to maximize SEO performance.
Client-side navigation takes over after the initial page load for a smooth SPA-like
experience on subsequent interactions.

The frontend communicates exclusively with the API gateway. It never calls internal
services directly. Authentication state is managed via JWT tokens stored in httpOnly
cookies, preventing XSS token theft.

The mobile application is a React Native app sharing core business logic via a shared
TypeScript package. The mobile app consumes the same API gateway endpoints as the web
frontend, with an additional set of mobile-specific endpoints for push notification
registration and offline sync.

### API Gateway

The API gateway is an NGINX-based proxy fronted by Cloudflare for DDoS protection and
edge caching. Static assets and product images are served directly from the CDN edge
without hitting origin servers. API responses with public cache headers are cached at
the edge for up to 60 seconds.

Rate limiting is enforced at the gateway: unauthenticated requests are limited to 30
requests per minute per IP. Authenticated requests are limited to 300 per minute per
user account. Rate limit state is shared via Redis across gateway replicas.

The gateway validates JWT tokens on every authenticated request and injects user context
headers before forwarding to downstream services. Downstream services trust these headers
and do not re-validate tokens independently.

### Core Services

The core services layer handles the primary business domains. Each service is a Node.js
application using the Fastify framework. Services run in Docker containers orchestrated
by Kubernetes. All services expose health check endpoints at `/health` consumed by
Kubernetes liveness and readiness probes.

Inter-service communication for synchronous operations uses HTTP with JSON payloads.
Services call each other using internal DNS names within the Kubernetes cluster. Circuit
breakers (implemented via the `opossum` library) protect each downstream call with a
5-second timeout and automatic fallback.

## Module Map

### Orders Service

The Orders service is the central coordinator for the purchase flow. It manages the
lifecycle of an order from cart creation through fulfillment. Orders are stored in a
dedicated PostgreSQL database using the schema defined in `orders-service/migrations/`.

Key responsibilities:
- Cart creation and item management
- Order placement and validation
- Coordination of inventory reservation, payment capture, and fulfillment handoff
- Order status tracking and history
- Refund and cancellation processing

The service exposes REST endpoints for all CRUD operations on orders and carts. It also
publishes domain events to the event bus: `order.placed`, `order.cancelled`, `order.fulfilled`.
Downstream services subscribe to these events for their own business logic.

Concurrency control uses optimistic locking with a version column. The `update_order`
stored procedure checks the version before committing and raises an exception on conflict.
The service retries conflicted operations up to 3 times before returning a 409 to callers.

### Inventory Service

The Inventory service maintains real-time stock levels for all products across all warehouse
locations. It exposes APIs for stock queries, reservations, and adjustments.

Key responsibilities:
- Real-time stock level queries by SKU and location
- Atomic stock reservation for order placement
- Stock release on order cancellation
- Low-stock alerts via event bus
- Warehouse receiving and stock adjustment workflows

Stock reservations use a two-phase approach: reserve on order placement, confirm on
fulfillment initiation. Expired reservations (unpaid orders) are released by a scheduled
job running every 15 minutes. The reservation expiry window is configurable per merchant.

The Inventory database is a PostgreSQL instance with row-level locking on stock operations
to prevent overselling. Read operations use eventual consistency via a read replica to
reduce load on the primary during high-traffic periods.

### Payments Service

The Payments service integrates with Stripe as the primary payment processor and PayPal
as a secondary option. It manages the entire payment lifecycle from authorization through
capture, refunds, and dispute handling.

Key responsibilities:
- Payment method tokenization and storage (via Stripe Customer objects)
- Authorization and capture for card payments
- PayPal order creation and capture
- Refund processing and tracking
- Dispute and chargeback handling
- Payment reconciliation reporting

The service stores no raw card data. All sensitive payment information is tokenized by
Stripe before reaching Shoptastic systems. PCI DSS compliance is scoped to SAQ A-EP
based on this architecture.

Idempotency keys are used for all Stripe API calls to prevent duplicate charges on
network retry. The idempotency key is derived from the order ID and attempt number.

### Notifications Service

The Notifications service is a pure consumer of events from the event bus. It sends
transactional emails and push notifications based on order lifecycle events.

Key responsibilities:
- Order confirmation emails
- Shipping notification emails with tracking links
- Refund confirmation emails
- Push notifications for mobile app users
- Email template management via Handlebars templates

Emails are sent via AWS SES. Push notifications use Firebase Cloud Messaging. The service
maintains a delivery log for debugging and support. Failed deliveries are retried with
exponential backoff up to 5 attempts before moving to a dead-letter topic.

The Notifications service has no database of its own. Delivery logs are written to a
shared logging infrastructure (Loki). The service is stateless and can be scaled
horizontally without coordination.

### Analytics Service

The Analytics service collects behavioral data for product discovery optimization,
merchandising reports, and business intelligence. It is a read-heavy system optimized
for aggregation queries.

Key responsibilities:
- Event ingestion from the event bus (order events, product views, search queries)
- Real-time dashboard data for merchants
- Historical reporting and export
- Product recommendation signals

Events are buffered in Kafka before being written to ClickHouse for analytical storage.
ClickHouse is optimized for column-oriented aggregation queries and handles the reporting
workload without impacting transactional databases.

## Data Flow

### Order Placement Flow

```
Client → API Gateway → Orders Service
                            ↓ reserve stock
                       Inventory Service
                            ↓ (success)
                       Orders Service
                            ↓ capture payment
                       Payments Service
                            ↓ (success)
                       Orders Service
                            ↓ publish order.placed
                       Event Bus
                    ↙          ↘
        Notifications         Analytics
        Service               Service
```

The order placement flow is synchronous through inventory reservation and payment capture.
Both must succeed for the order to be confirmed. On any failure, the Orders service rolls
back by releasing the inventory reservation and voiding any payment authorization.

### Event Bus Architecture

The event bus is implemented with Apache Kafka. Each domain service has its own topic
namespace: `orders.*`, `inventory.*`, `payments.*`. Consumers use consumer groups for
parallel processing with at-least-once delivery semantics.

Event schemas are defined using JSON Schema and validated at publish time. Schema evolution
follows backward-compatible rules: adding optional fields is allowed, removing or renaming
fields requires a versioned topic migration.

## Security Model

### Authentication

User authentication uses JWT tokens issued by a dedicated Auth service. Tokens have a
15-minute expiry with sliding refresh using refresh tokens stored as httpOnly cookies.
Refresh tokens expire after 30 days of inactivity.

The Auth service integrates with third-party identity providers via OAuth 2.0: Google,
Apple, and Facebook login are supported. For merchant admin accounts, SAML SSO is
supported for enterprise customers with their own identity provider.

Passwords are hashed using Argon2id with work factors tuned to approximately 300ms
computation time on current hardware. Password complexity requirements follow NIST 800-63B
guidelines: minimum 8 characters, no complexity rules, breach password database check.

### Authorization

Authorization uses RBAC with three top-level roles: `customer`, `merchant`, `platform-admin`.
Each role has a set of permissions defined as action-resource pairs. Permissions are checked
in the downstream services based on the injected user context from the gateway.

Merchants can access only their own data. Row-level security in PostgreSQL enforces tenant
isolation at the database level as a defense-in-depth measure, even though the application
layer already enforces it.

Platform admins have access to all merchant data for support purposes. Admin actions are
logged to an immutable audit log in a separate database that platform admins cannot modify.

### Secrets Management

All secrets (database passwords, API keys, JWT signing keys) are stored in AWS Secrets
Manager. Applications access secrets at startup via the AWS SDK; secrets are never embedded
in environment variables or configuration files in the repository.

Secret rotation is automated for database credentials using RDS integration with Secrets
Manager. Application code handles `InvalidSecretId` errors by fetching the new secret
value without requiring a restart.

## Deployment Architecture

### Container Strategy

Each service runs in Docker containers built from multi-stage Dockerfiles. The final image
uses a distroless Node.js base image to minimize attack surface. Images are scanned for
known CVEs using Trivy in the CI pipeline before push to ECR.

Container resource limits are defined in Kubernetes manifests: CPU and memory requests
and limits are set based on load testing results. Services use HorizontalPodAutoscaler
configured on CPU utilization and custom metrics from Prometheus.

### Infrastructure

Infrastructure is managed as code using Terraform with the AWS provider. All resources
are deployed to eu-west-1 (primary) with a standby region in us-east-1 for disaster
recovery. RDS uses Multi-AZ with automatic failover. S3 buckets are cross-region replicated.

The Kubernetes cluster runs on EKS with managed node groups. Node groups use On-Demand
instances for core workloads and Spot instances for non-critical services like Analytics.
Cluster autoscaler adjusts node count based on pod scheduling pressure.

Networking uses a VPC with public and private subnets. All services run in private subnets.
The API gateway load balancer is the only resource in the public subnet accepting inbound
traffic. NAT gateways provide outbound internet access from private subnets.

### CI/CD Pipeline

The CI/CD pipeline runs on GitHub Actions. Each pull request triggers: lint, type-check,
unit tests, integration tests, and a Docker build. Merges to main trigger deployment to
the staging environment. Production deployment is manual-approval-gated via GitHub
Environments.

Deployment uses a rolling update strategy with a maximum of 25% pods unavailable at any
time. Pre-deployment smoke tests validate core endpoints before traffic is shifted.
Automatic rollback is triggered if error rate exceeds 1% within 5 minutes of deployment.

Zero-downtime database migrations are enforced via a migration compatibility matrix: each
migration must be backward-compatible with the previous application version, allowing
the old application version to run against the new schema during the rolling update.

## Database Layer

### Primary Database

Each service uses a dedicated PostgreSQL 15 instance managed by AWS RDS. Databases are
not shared between services. Connection pooling uses PgBouncer in transaction mode with
a pool size calibrated to the service's concurrency requirements.

Schema migrations are managed with `node-postgres-migrate`. Migrations run automatically
as part of the deployment process, before the new application version starts receiving
traffic. Each migration is wrapped in a transaction with a rollback on error.

Long-running queries are terminated automatically after 30 seconds using
`statement_timeout`. Slow queries (over 100ms) are logged to CloudWatch Logs for
performance analysis.

### Read Replicas

Read replicas are used for the Orders and Inventory services to offload reporting queries.
The application explicitly routes read-only queries (list orders, stock reports) to the
replica connection pool and write queries to the primary.

Replica lag is monitored via CloudWatch. If replica lag exceeds 30 seconds, the application
automatically falls back to reading from the primary to prevent stale data issues.

### Cache Layer

Redis (AWS ElastiCache) is used for session storage, rate limit counters, and short-lived
cache entries. The cache is not used as a write-through database — it is a pure read cache
with explicit invalidation on write operations.

Cache keys are namespaced by service to prevent collisions. TTLs are set conservatively:
product catalog cache has a 60-second TTL, user session cache has a 15-minute TTL matching
JWT expiry.

## Message Queue

### Event Bus

Apache Kafka (AWS MSK) serves as the event bus. Each service has a dedicated Kafka producer
and consumer configured with the following defaults: `acks=all` for producers, `isolation.level=read_committed`
for consumers. This ensures exactly-once semantics for critical financial events.

Topic partitioning is based on entity ID (order ID, SKU ID) to guarantee ordering for
events related to the same entity. Each topic has a replication factor of 3.

Event schemas use JSON with mandatory `event_type`, `event_id`, `aggregate_id`, and
`timestamp` fields. `event_id` is a UUIDv4 used for consumer-side idempotency checks.

### Dead Letter Queue

Failed events are moved to a dead-letter topic after 5 retry attempts with exponential
backoff starting at 1 second. Dead-letter topics are monitored with CloudWatch alarms.
A Slack notification is sent when a dead-letter topic receives any message.

Operations staff have a runbook for each event type describing triage steps for dead-letter
events. Most dead-letter events can be replayed after the underlying issue is resolved
using the `kafka-dlq-replay` internal tool.

## Monitoring

### Metrics

Application metrics are collected using the Prometheus client library integrated into each
Fastify application. Key metrics per service:
- Request rate, error rate, and latency (p50, p95, p99) — RED metrics
- Database connection pool utilization
- Event bus consumer lag
- Cache hit/miss ratio

Custom business metrics are also exposed: orders placed per minute, payment success rate,
inventory reservation failure rate. These are displayed on Grafana dashboards accessible
to the operations team.

### Logging

Structured logs are emitted in JSON format using the `pino` logging library. Logs are
shipped to AWS CloudWatch Logs via the Kubernetes Fluent Bit DaemonSet. CloudWatch Logs
Insights is used for ad-hoc log queries during incidents.

Log levels are configurable per-service via environment variable. Production environments
run at `info` level. Debug logging can be temporarily enabled per-pod without redeployment
using a ConfigMap update.

Sensitive fields (passwords, tokens, card numbers) are automatically redacted by a Pino
serializer before logging. The serializer checks a list of known sensitive field names and
replaces values with `[REDACTED]`.

### Alerting

Alerts are configured in Grafana Alertmanager and routed to PagerDuty. Alert severity
levels: `critical` (page on-call immediately), `warning` (Slack notification, no page),
`info` (dashboard annotation, no notification).

Critical alerts: error rate > 1% for 2 minutes, p99 latency > 2000ms for 5 minutes,
payment service error rate > 0.1% for 1 minute, dead-letter topic has unprocessed events.

All alerts have runbook links in the annotation. Runbooks are stored in Confluence and
linked from each alert definition.

## ADR References

The following Architecture Decision Records document key decisions made during the design
and evolution of this platform:

- ADR-001: Use PostgreSQL over MongoDB for transactional data
- ADR-002: Adopt TypeScript across all services
- ADR-003: Use Kafka over SQS for event bus
- ADR-004: Service-per-database isolation pattern
- ADR-005: JWT authentication with httpOnly refresh tokens
- ADR-006: Stripe as primary payment processor
- ADR-007: Next.js for the customer-facing frontend
- ADR-008: Kubernetes over ECS for container orchestration
- ADR-009: Argon2id for password hashing
- ADR-010: Rolling deployment over blue-green for cost efficiency
- ADR-011: ClickHouse for analytics workloads
- ADR-012: Terraform for infrastructure as code
- ADR-013: PgBouncer for database connection pooling
- ADR-014: Cloudflare for DDoS protection and CDN
- ADR-015: Row-level security as defense-in-depth for tenant isolation

## Component Ownership

| Service | Team | On-call rotation |
|---|---|---|
| Orders Service | Checkout Team | checkout-oncall |
| Inventory Service | Fulfillment Team | fulfillment-oncall |
| Payments Service | Payments Team | payments-oncall |
| Notifications Service | Platform Team | platform-oncall |
| Analytics Service | Data Team | data-oncall |
| API Gateway | Platform Team | platform-oncall |
| Auth Service | Security Team | security-oncall |

Ownership is defined by the `CODEOWNERS` file at the repository root. Pull requests to
service directories require approval from at least one team member listed in CODEOWNERS.

## Tech Debt

Current known tech debt items tracked in JIRA:

1. **Orders Service**: Cart persistence uses in-memory storage as a temporary measure;
   migration to Redis-backed cart storage is planned for Q3.
2. **Inventory Service**: Stock adjustment endpoint lacks idempotency key support; manual
   duplicate detection is done in a scheduled reconciliation job.
3. **Notifications Service**: Email templates are hardcoded in source; a template
   management UI for merchants is planned but not scheduled.
4. **Analytics Service**: Kafka-to-ClickHouse pipeline has no schema evolution support;
   topic migrations require downtime.
5. **API Gateway**: Rate limit configuration is static in NGINX config; dynamic rate
   limiting per merchant tier is a planned improvement.
6. **Auth Service**: Refresh token rotation is not yet implemented; a compromised refresh
   token can be used until expiry. Planned for next security sprint.
7. **General**: Distributed tracing (OpenTelemetry) is partially instrumented in Orders
   and Payments services but not yet in Inventory or Notifications.

## Appendix

### Glossary

| Term | Definition |
|---|---|
| SKU | Stock Keeping Unit — unique identifier for a product variant |
| DLQ | Dead Letter Queue — queue for messages that failed processing |
| mTLS | Mutual TLS — both parties authenticate with certificates |
| RLS | Row-Level Security — PostgreSQL feature for per-row access control |
| RED metrics | Rate, Errors, Duration — standard service health metrics |
| SLA | Service Level Agreement — committed uptime/performance targets |
| RPO | Recovery Point Objective — maximum acceptable data loss |
| RTO | Recovery Time Objective — maximum acceptable downtime |

### External Links

- Stripe API Documentation: https://stripe.com/docs/api
- AWS MSK (Kafka): https://docs.aws.amazon.com/msk/
- ClickHouse Documentation: https://clickhouse.com/docs/
- NIST 800-63B (Password Guidelines): https://pages.nist.gov/800-63-3/sp800-63b.html
- PCI DSS SAQ A-EP: https://www.pcisecuritystandards.org/

### Contact

For architecture questions: architecture-council@shoptastic.example.com
For security concerns: security@shoptastic.example.com
For on-call escalations: follow the PagerDuty escalation policy in the runbook index.
