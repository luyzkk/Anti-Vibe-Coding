# Architecture Notes — Fictional B2B SaaS Platform

This document captures the full architecture of Nexlify, a B2B SaaS platform for
enterprise workflow automation. Nexlify serves mid-to-large enterprises integrating
internal tools, external APIs, and approval workflows into automated pipelines.

---

## 1. API Design

### 1.1 REST API Guidelines

All REST endpoints follow the Richardson Maturity Model Level 2. Resources are named
as plural nouns: `/workflows`, `/executions`, `/integrations`. Actions that do not map
naturally to CRUD operations use sub-resources or action endpoints: `POST /workflows/{id}/trigger`.

HTTP status codes are used semantically. 200 for success, 201 for resource creation,
204 for deletions without response body, 400 for client errors with a structured error
body, 401 for authentication failures, 403 for authorization failures, 404 for missing
resources, 422 for validation errors, and 429 for rate limiting. 500 is used only for
genuine server errors with an opaque error ID for support lookup.

Request and response bodies use JSON with camelCase field names. Pagination uses
cursor-based pagination: `GET /workflows?after=cursor123&limit=50`. Total count is not
returned in paginated responses for performance reasons.

### 1.2 GraphQL Gateway

A GraphQL gateway aggregates the REST APIs of internal services for the frontend
application. The gateway is built with Apollo Federation, allowing each service to
own its own GraphQL subgraph schema. The frontend queries the federated gateway and
never calls REST services directly.

The GraphQL gateway enforces a complexity limit of 1000 per query and a depth limit of
10 levels. Queries exceeding these limits are rejected with a 400 response before
reaching any resolver. Persisted queries are used in production to prevent arbitrary
query injection from compromised clients.

Schema changes follow additive-only rules in non-breaking releases. Deprecation of
fields uses the `@deprecated` directive with a migration message. Deprecated fields
are kept for at least 2 minor releases before removal in a major version.

### 1.3 Versioning Strategy

The API uses URL-based versioning: `/v1/`, `/v2/`. A new major version is created only
for breaking changes. Non-breaking additions (new optional fields, new endpoints) are
added to the current version without creating a new version.

Older API versions are supported for 18 months after the release of a superseding
version. Sunset dates are communicated via the `Sunset` response header and published
in the changelog 6 months before deprecation.

API version negotiation is handled at the gateway. Requests to deprecated endpoints
receive a `Deprecation` response header indicating the sunset date and a link to the
migration guide in the `Link` header.

### 1.4 Rate Limiting

Rate limits are enforced per API key (tenant) and per endpoint category. Read endpoints
are limited to 1000 requests per minute per tenant. Write endpoints are limited to 100
requests per minute. Webhook delivery endpoints have a separate limit of 500 per minute.

Rate limit state is stored in Redis using a sliding window counter with a 1-minute
expiry. The remaining quota and reset timestamp are returned in every response via
`X-RateLimit-Remaining` and `X-RateLimit-Reset` headers.

Tenants exceeding their limits receive a 429 response with a `Retry-After` header.
Enterprise tenants can negotiate custom rate limits as part of their contract. Burst
allowance of 2x the base limit is permitted for up to 10 seconds before throttling.

---

## 2. Database Layer

### 2.1 Primary Datastore

The primary datastore for all transactional data is PostgreSQL 15. Each service has its
own logical database within a shared RDS cluster. Logical separation prevents cross-service
joins while sharing the operational overhead of a single cluster.

Connection management uses PgBouncer in transaction pooling mode. Each service configures
a maximum pool size proportional to its expected concurrency. Idle connections are
released after 60 seconds to prevent connection exhaustion during traffic spikes.

The `pgcrypto` extension provides UUID generation and AES encryption for fields containing
personally identifiable information. The encryption key is stored in AWS Secrets Manager
and rotated quarterly.

### 2.2 Schema Migrations

Database schema migrations are managed with Flyway. Migrations are versioned sequentially
and stored in `db/migrations/` within each service's repository. Migrations are applied
automatically as part of the Kubernetes deployment using an init container that runs before
the application container starts.

All migrations must be backward-compatible with the previous application version to support
rolling deployments. Operations that break backward compatibility — such as removing a
column or changing a data type — require a multi-step process: add new column, migrate data,
deploy, then remove the old column in a subsequent release.

Migration files are immutable once merged. If a migration contains an error, a corrective
migration is added rather than modifying the original. This ensures the migration history
is an accurate audit trail of all schema changes.

### 2.3 Read Replicas

Each primary database has two read replicas provisioned in separate availability zones.
Read replicas serve reporting queries, audit log exports, and dashboard aggregations.
Application code uses separate connection strings for read and write operations.

The application uses a read replica connection automatically for all queries annotated
with `@ReadOnly()` decorator in the data access layer. Write queries always go to the
primary. If the replica lag exceeds a configured threshold (default: 5 seconds), the
read replica connection automatically falls back to the primary connection.

Replica lag is monitored via CloudWatch and triggers a PagerDuty alert if it exceeds
30 seconds. Elevated replica lag typically indicates a long-running transaction on the
primary and is investigated immediately.

### 2.4 Data Archival

Records older than 2 years are archived to Amazon S3 in Parquet format. The archival
process runs weekly as a Kubernetes CronJob. Archived records are deleted from the
primary database after a 30-day grace period, during which they can be restored on demand.

The Parquet files are partitioned by year and month for efficient querying via Athena.
Archived data is still accessible through the API via a separate `archived=true` query
parameter, which routes the query to Athena instead of PostgreSQL.

Data retention policies are configurable per tenant. Enterprise tenants can negotiate
longer retention periods. The default retention is 2 years for transactional data and
7 years for financial records in compliance with typical audit requirements.

---

## 3. Caching Strategy

### 3.1 Application Cache

Redis (AWS ElastiCache) provides the application cache layer. Cache entries are organized
by key prefix per service: `workflows:`, `integrations:`, `users:`. Each prefix maps to
a separate Redis logical database for isolation and independent flushing.

The cache pattern is cache-aside (lazy loading). The application checks the cache before
querying the database. On a cache miss, the data is fetched from the database and written
to the cache with an appropriate TTL. Cache entries are explicitly invalidated on write
operations via cache busting.

Cache TTLs are set conservatively: frequently-changing data (execution status) uses a
30-second TTL; slowly-changing data (workflow definitions, integration configs) uses a
5-minute TTL; reference data (feature flags, system config) uses a 15-minute TTL.

### 3.2 HTTP Cache

Public API responses include appropriate `Cache-Control` headers for downstream caching
by the CDN (Cloudflare). Read-only endpoints returning stable data use `max-age=60` for
edge caching. Authenticated endpoints use `private, no-store` to prevent caching of
tenant-specific data at the edge.

ETag-based conditional requests are supported for all collection endpoints. The server
computes a hash of the response body and returns it in the `ETag` header. Subsequent
requests with `If-None-Match` receive a 304 Not Modified if the data has not changed,
reducing bandwidth for polling clients.

The CDN cache is purged on deployment to prevent stale public documentation or marketing
pages being served during a release. Cache purge is triggered automatically by the
deployment pipeline via the Cloudflare API.

### 3.3 Database Query Cache

Frequently executed queries with high computational cost are cached at the query result
level using a custom cache decorator. The cache key is derived from the query parameters
using a deterministic hash. This layer is separate from the application cache and is
managed by the data access layer.

Query result caching is enabled selectively — only for queries that are expensive (>50ms)
and read-only. The cache is backed by the same Redis cluster as the application cache
but uses a dedicated key namespace `qc:` to prevent key collisions.

Invalidation for query result cache entries is coarser than for entity-level caches.
Any write to a table invalidates all query cache entries referencing that table. This
coarse invalidation avoids the complexity of dependency tracking at the cost of some
cache churn on write-heavy tables.

### 3.4 Cache Coherency

Cache coherency across multiple application instances is ensured by Redis Pub/Sub for
cache invalidation events. When an instance writes a new value and invalidates a cache
entry, it publishes an invalidation message to a Redis channel. All instances subscribed
to the channel evict the corresponding key from any local in-process cache.

The in-process cache (using `node-cache`) is the L1 cache with a 5-second TTL and a
maximum of 10,000 entries. Redis is the L2 cache. Database is the source of truth. This
three-tier caching architecture minimizes round-trip latency for hot read paths while
maintaining correctness.

Cache stampede protection uses probabilistic early expiration (jitter on TTL) and a
distributed lock (via `redlock`) to allow only one request to regenerate a cache entry
while other requests wait for the lock to be released.

---

## 4. Message Queue

### 4.1 Kafka Configuration

Apache Kafka (AWS MSK) is the event streaming backbone. Topics are created per domain
entity with a naming convention: `{service}.{entity}.{event}`. For example:
`workflows.execution.started`, `integrations.connection.failed`.

Kafka is configured with `min.insync.replicas=2` and `acks=all` for all producer writes,
ensuring durability even if one replica fails. Consumer groups are named after the
consuming service: `notifications-service`, `analytics-service`.

Topic retention is set to 7 days by default. The `audit-log` topic retains events for
365 days. Compacted topics are used for entity state snapshots to support rebuilding
consumer state without replaying the full history.

### 4.2 Event Schema Registry

All Kafka events are registered in Confluent Schema Registry. Producers validate events
against the registered schema before publishing. Consumers use schema IDs embedded in
the event header to deserialize with the correct schema version.

Schema evolution rules enforce backward compatibility for events shared between multiple
consumers. New required fields are not allowed; new optional fields must have a defined
default. Removing fields requires marking them deprecated first and waiting one release
cycle.

The schema registry is backed up daily to S3. In a disaster recovery scenario, the
registry can be restored from the backup, allowing consumers to process historical events
from Kafka after the registry is rebuilt.

### 4.3 Consumer Group Management

Consumer groups use static membership (configurable via `group.instance.id`) to minimize
rebalancing during rolling deployments. A Kubernetes pod uses its pod name as the
instance ID, ensuring the same pod reacquires its previously assigned partitions after
a restart.

Consumer lag is monitored per consumer group and topic partition using a dedicated lag
exporter that publishes metrics to Prometheus. CloudWatch alarms trigger if any consumer
group falls more than 10,000 messages behind on a critical topic.

Slow consumers are identified by their lag growth rate. If a consumer group's lag is
growing faster than it is being consumed, an automated alert is sent to the owning team.
The alert includes the partition with the highest lag and the current processing rate.

### 4.4 Dead Letter Handling

Messages that fail processing after 5 retry attempts are written to a dead-letter topic
(`{original-topic}.dlq`). Dead-letter messages include the original message, the error
that caused the failure, and the number of retry attempts.

A dead-letter dashboard in Grafana shows the count of messages per dead-letter topic.
Each dead-letter topic is paired with a runbook describing the expected failure modes and
the replay procedure. Replay is performed using an internal CLI tool that re-publishes
dead-letter messages to the original topic with a new timestamp.

Messages in dead-letter topics are retained for 30 days. After 30 days, they are archived
to S3 for long-term storage. The archival process preserves the original message content,
error details, and timestamp for audit purposes.

---

## 5. Service Discovery

### 5.1 Kubernetes DNS

Internal service-to-service communication uses Kubernetes DNS. Services are addressed by
their fully qualified domain name within the cluster: `{service}.{namespace}.svc.cluster.local`.
Short names within the same namespace are resolved by the kubelet DNS configuration.

Service discovery does not use any external registry. Kubernetes services act as stable
virtual IPs that front a set of pods selected by label selector. The kube-proxy ensures
that requests to the service IP are load-balanced across healthy pods.

DNS TTLs in Kubernetes are set to 5 seconds to ensure rapid propagation of service
endpoint changes. Clients are expected to re-resolve DNS on each connection attempt
for long-lived connection pools.

### 5.2 Service Mesh

Istio provides the service mesh layer for mTLS, traffic management, and observability.
All pod-to-pod traffic is automatically encrypted by Envoy sidecar proxies. Service
certificates are issued by the Istio CA (istiod) and rotated every 24 hours.

Traffic splitting for canary deployments is configured via Istio `VirtualService` and
`DestinationRule` resources. Canary pods receive a configurable percentage of traffic
(default: 5%) while the stable version handles the remainder. Traffic split is adjusted
manually by the deployment team based on error rate and latency metrics.

Circuit breakers are implemented at the service mesh level using Istio's `OutlierDetection`
policy. A host is ejected from the load balancing pool after 5 consecutive 5xx errors
within 30 seconds. The ejection lasts 30 seconds before the host is considered again.

### 5.3 External Service Registry

Third-party integrations (Slack, Salesforce, HubSpot) use a configuration-driven service
registry stored in PostgreSQL. Each integration type has a record with its API base URL,
authentication mechanism, and capability flags. This registry is cached in Redis and
refreshed every 5 minutes.

Integration instances (per-tenant configuration) reference the integration type and
store tenant-specific credentials encrypted at rest. The credentials are decrypted
at runtime using the tenant's encryption key, which is fetched from Secrets Manager.

New integration types are added by inserting a registry record and deploying an
integration driver plugin. Driver plugins are loaded at startup via a plugin registry
pattern, avoiding hardcoded switch statements in the integration engine.

### 5.4 Health Checks

Every service exposes `/health/live` and `/health/ready` endpoints. The liveness probe
returns 200 if the process is alive. The readiness probe returns 200 if the service has
completed startup, established database connections, and is ready to handle traffic.

Readiness checks include: database connection pool connectivity, Redis connectivity,
Kafka producer connectivity, and any startup data loading (e.g., feature flag cache warm-up).
A service that fails readiness is removed from the load balancer pool but is not restarted
(unlike a liveness failure).

Custom health metrics are exposed at `/health/metrics` for operational dashboards. This
endpoint returns JSON with connection pool utilization, cache hit rate, and queue depth.
It is accessible only from within the cluster network.

---

## 6. Security Architecture

### 6.1 Authentication Flow

Authentication uses OAuth 2.0 with PKCE for web and CLI clients. The authorization server
is implemented using the `node-oidc-provider` library. Tenants can configure their own
identity provider (SAML 2.0 or OIDC) for SSO, which is proxied through the Nexlify
authorization server to maintain a consistent token format.

Access tokens are short-lived JWTs (15 minutes). Refresh tokens are opaque random strings
stored in a database table with a 90-day expiry. Refresh token rotation is enabled:
each use of a refresh token issues a new refresh token and invalidates the old one.
Detection of refresh token reuse (indicating theft) revokes the entire token family.

Service-to-service authentication uses Kubernetes projected service account tokens bound
to a specific audience. Tokens are injected as environment variables via a Kubernetes
secret and are valid for 24 hours. Services validate tokens using the Kubernetes token
review API.

### 6.2 Authorization Model

The authorization model is role-based with attribute-based overrides. Each tenant has
a set of roles: `owner`, `admin`, `member`, `viewer`. Roles carry a set of permissions
for each resource type. Permissions follow the format `{action}:{resource}`: `read:workflows`,
`write:integrations`, `admin:users`.

Attribute-based rules allow fine-grained control: a user may have `read:executions`
globally but be restricted to executions belonging to their team via a data scope policy.
Scopes are attached to roles and evaluated at the query layer using row-level security
in PostgreSQL.

Permission changes take effect within 60 seconds. The authorization cache TTL is set to
60 seconds, matching this expectation. Critical permission changes (e.g., revoking admin
access) can be forced immediately via a cache invalidation API available to tenant owners.

### 6.3 Input Validation and Sanitization

All API inputs are validated using JSON Schema at the gateway before reaching any service.
Schemas are generated from TypeScript types using `ts-json-schema-generator` at build time.
Invalid inputs are rejected with a 422 response listing all validation errors.

HTML content submitted by users is sanitized using DOMPurify on the server side before
storage. The allowed HTML tag set is minimal: `<b>`, `<i>`, `<a>`, `<ul>`, `<li>`.
All other tags are stripped. URL sanitization prevents `javascript:` protocol in href
attributes.

SQL injection is prevented by the exclusive use of parameterized queries via the `pg`
library. No dynamic SQL construction is used in the application layer. ORM query builders
are also prohibited from building WHERE clauses from unvalidated user input.

### 6.4 Penetration Testing and Audits

External penetration testing is conducted twice per year by a certified third party.
Findings are triaged by severity: critical issues are patched within 24 hours, high
severity within 7 days, medium within 30 days, low in the next scheduled release.

Bug bounty program via HackerOne accepts reports for the production API and web application.
The scope excludes third-party integrations and social engineering. Rewards range from
$100 for low-severity findings to $10,000 for critical RCE or authentication bypass.

Internal security reviews are performed for every new feature that introduces a new data
model, authentication mechanism, or third-party integration. The security team is listed
as a required reviewer in CODEOWNERS for security-sensitive code paths.

---

## 7. Frontend Architecture

### 7.1 Application Shell

The web application is a Next.js 14 application using the App Router. The application
shell provides authentication, navigation, theming, and error boundaries. Feature areas
are implemented as independent route segments with their own layout components.

Server Components are used for data-fetching pages to reduce client-side JavaScript.
Client Components are restricted to interactive elements: forms, modals, real-time
updates. The boundary between Server and Client is enforced via a custom ESLint rule
that warns when data fetching is performed inside a Client Component.

The application bundle is code-split per route segment. Dynamic imports are used for
heavy third-party libraries (chart library, code editor) to defer their loading until
the corresponding route is visited.

### 7.2 State Management

Global state is managed with Zustand for client-side UI state (sidebar open/closed,
selected filters, modal state). Server state (fetched data) is managed entirely by
TanStack Query. The two state systems are kept separate: Zustand never stores server
data, and TanStack Query never stores UI state.

Optimistic updates are implemented for write operations using TanStack Query's
`onMutate` callback. The UI reflects the expected post-write state immediately while
the actual API request is in flight. On error, the state is rolled back automatically.

Form state is managed with React Hook Form. Form validation runs on the client using Zod
schemas that are shared with the API validation layer. Sharing the schema prevents drift
between client and server validation logic.

### 7.3 Accessibility

The application targets WCAG 2.1 Level AA compliance. All interactive elements have
accessible names provided via `aria-label` or associated `<label>` elements. Color
contrast ratios meet the 4.5:1 minimum for normal text and 3:1 for large text.

Focus management is implemented for all modal and drawer components. Opening a modal
moves focus to the first focusable element inside it. Closing a modal returns focus to
the trigger element. This behavior is tested in Playwright end-to-end tests.

Keyboard navigation is supported for all interactive components. Custom components that
do not use native HTML elements (e.g., virtualized lists, custom dropdowns) implement
full keyboard support following WAI-ARIA Authoring Practices patterns.

### 7.4 Performance Monitoring

Real User Monitoring (RUM) is implemented using the Web Vitals library. LCP, FID, CLS,
TTFB, and FCP are collected on every page load and sent to a custom analytics endpoint.
P75 and P95 values are tracked in a Grafana dashboard and compared week-over-week.

A performance budget is enforced in CI: the main JavaScript bundle must not exceed 200KB
gzipped. Component-level performance is monitored using the React Profiler in development
mode. Components with render times exceeding 16ms trigger a warning in the console.

Lighthouse CI runs on every pull request targeting main. Scores below 80 for Performance,
Accessibility, or Best Practices fail the CI check. The Lighthouse results are posted as
a pull request comment for review.

---

## 8. Deployment

### 8.1 Continuous Delivery

Deployments to the staging environment are triggered automatically on every merge to
the main branch. The staging environment is identical to production in terms of
infrastructure configuration but uses a smaller instance size.

Production deployments are triggered by a release tag following semantic versioning.
The deployment workflow includes: build Docker image, push to ECR, update Kubernetes
manifests in the GitOps repository, wait for Argo CD sync, run smoke tests.

If smoke tests fail after deployment, the deployment is automatically rolled back by
updating the manifest to the previous image digest. The rollback is completed within
3 minutes of failure detection.

### 8.2 GitOps with Argo CD

Infrastructure state is declared in a separate GitOps repository (`nexlify-infra`). Argo CD
watches the repository and reconciles the cluster state to match the declared state. Manual
changes to the cluster (via `kubectl apply`) are overwritten by Argo CD on the next sync cycle.

Each service has its own Argo CD application resource. Applications are organized into
app-of-apps hierarchy: a root application manages individual service applications.
Sync policies are set to automated with self-healing for staging and manual-approval for production.

Secrets in the GitOps repository are encrypted using Sealed Secrets. The Sealed Secrets
controller decrypts them at runtime using a cluster-private key. The key is backed up
weekly to AWS Secrets Manager.

### 8.3 Feature Flags

Feature flags are managed using LaunchDarkly. Flags are evaluated server-side in the API
layer. Client-side flag evaluation is available for frontend-specific flags to avoid an
extra round-trip for UI behavior changes.

Flags follow a naming convention: `{team}-{feature}-{variant}`. Example:
`workflows-team-parallel-execution-enabled`. Flags are documented in a shared Notion
database with the owning team, purpose, and planned removal date.

Flag evaluation is cached per-request to avoid multiple network calls to LaunchDarkly
within a single request lifecycle. The streaming SDK is used in the API layer to receive
real-time flag updates without polling.

### 8.4 Canary Releases

New features are released via canary deployments. The canary receives 5% of production
traffic initially. Traffic is increased in 10% increments over 24 hours if error rates
and latency remain within baseline. The full rollout completes after 3-5 days.

Canary analysis is automated using Argo Rollouts with a Prometheus analysis template.
The analysis checks: HTTP error rate < 1%, p99 latency < 2000ms, business metric
(executions per minute) within 10% of baseline. Failing analysis pauses the rollout.

Rollback from a canary is manual but can be performed in under 2 minutes by a team member
with deployment access. A runbook guides on-call engineers through the rollback procedure.

---

## 9. Monitoring

### 9.1 Metrics Collection

Application metrics are collected using the Prometheus client for Node.js. Default
Node.js runtime metrics (event loop lag, heap size, active handles) are collected
automatically. Service-specific metrics are instrumented using counters, gauges,
histograms, and summaries.

Custom business metrics collected per service:
- `workflow_executions_total` — counter by status (success, failed, timeout)
- `integration_api_calls_total` — counter by integration type and status code
- `queue_depth_gauge` — current depth of each work queue
- `execution_duration_seconds` — histogram of execution completion time by workflow type

Metrics are scraped by Prometheus via the standard `/metrics` endpoint. Prometheus
configuration uses service discovery from Kubernetes to automatically detect new pods.

### 9.2 Distributed Tracing

OpenTelemetry (OTEL) is used for distributed tracing. All services are instrumented with
the OTEL Node.js SDK. Traces are exported to Grafana Tempo via the OTEL collector.
The collector runs as a Kubernetes DaemonSet to minimize egress per pod.

Traces are sampled at 10% in production to control cost. The sampling rate is increased
to 100% for error traces via a tail-based sampling rule in the OTEL collector. This
ensures full traces are captured for all failed requests regardless of the base sampling rate.

Trace context is propagated across service boundaries using W3C Trace Context headers.
Kafka event messages include trace context in the message header for tracing async flows
across service boundaries.

### 9.3 Dashboards

Grafana is the primary dashboarding tool. Dashboards are managed as code using Grafonnet
(a Jsonnet library for Grafana). Dashboard definitions are stored in the GitOps repository
and applied automatically by a Grafana provisioning sidecar.

Standard dashboards available for every service:
- RED metrics dashboard (Rate, Errors, Duration)
- Saturation dashboard (CPU, memory, connection pool)
- Business metrics dashboard (domain-specific KPIs)
- SLO compliance dashboard (error budget burn rate)

Dashboard access is controlled via Grafana teams mapped to LDAP groups. Developers have
read access to all dashboards. Dashboard editing requires membership in the SRE team.

### 9.4 Log Aggregation

Structured logs are emitted as JSON using Pino. Logs are shipped to Grafana Loki via
the Fluent Bit DaemonSet. Fluent Bit adds Kubernetes metadata (pod name, namespace, node)
to each log entry before forwarding.

Log retention in Loki is 30 days. Older logs are archived to S3 in compressed form.
Loki log labels are kept minimal (service name, environment, log level) to control
cardinality. High-cardinality values (user IDs, request IDs) are included in log fields,
not labels.

Alerting on log content is done via Loki recording rules. Rules count log entries matching
error patterns and feed the counts into Prometheus for alerting via the standard alert
routing.

---

## 10. Alerting

### 10.1 Alert Routing

Alerts are routed via Alertmanager to different receivers based on severity and owning
team. Critical alerts go to PagerDuty. Warning alerts go to Slack. Info-level alerts
are only visible in the Grafana alert history.

Alertmanager grouping aggregates multiple alerts from the same service into a single
notification during an outage to reduce notification fatigue. Alerts are grouped by
`service` and `environment` labels. A 5-minute wait-to-group interval allows related
alerts to be collected before sending.

Inhibition rules prevent low-level alerts from firing when a higher-level alert is
already active. For example, individual endpoint latency alerts are inhibited when a
service-level availability alert is firing, preventing alert spam.

### 10.2 SLO and Error Budgets

Service Level Objectives are defined for the following services:
- API Gateway: 99.9% availability, p99 latency < 500ms
- Workflow Execution Engine: 99.5% success rate for workflow executions
- Integration Engine: 99% success rate for outbound API calls

Error budgets are tracked monthly. Burn rate alerts fire when the error budget will be
exhausted in less than 5 days at the current rate. The on-call team is expected to
initiate an incident review when burn rate exceeds 5x the baseline.

SLO compliance is reported in weekly engineering standups and monthly to stakeholders.
The report includes: actual SLO performance, budget consumed, and any incidents affecting
the SLO.

### 10.3 On-Call Rotation

On-call rotations are managed in PagerDuty. Each team has a primary and secondary on-call
engineer on a weekly rotation. The primary is responsible for initial response within 5
minutes for critical alerts.

Escalation policy: alert fires → primary on-call (5 min) → secondary on-call (10 min) →
engineering manager (20 min) → VP Engineering (30 min). Escalations beyond secondary are
rare and indicate a multi-team incident.

Post-incident reviews (PIRs) are required for all P1 and P2 incidents. PIR documents are
stored in Confluence and linked from the incident record in PagerDuty. PIR action items
are tracked in JIRA with due dates.

### 10.4 Alert Runbooks

Every alert has a linked runbook describing: what the alert means, likely root causes,
diagnostic steps, and mitigation actions. Runbooks are stored in Confluence under the
SRE space and linked from alert annotations.

Runbooks are reviewed quarterly by the owning team. Outdated runbooks (not reviewed in
6 months) are flagged in a Confluence audit report. Stale runbooks are a reliability
risk because they lead engineers to apply incorrect mitigations under pressure.

New alerts added to the system must be accompanied by a runbook pull request. The alert
PR is blocked from merging until the corresponding runbook is created and the link is
added to the alert annotation.

---

## 11. Incident Response

### 11.1 Incident Declaration

An incident is declared when: a P1 alert fires without automated resolution within 5
minutes, a customer reports service degradation confirmed by internal monitoring, or
a team member identifies an active data integrity issue.

Incidents are managed in a dedicated Slack channel created automatically by the PagerDuty
Slack integration: `#incident-{timestamp}-{service}`. The channel is used for real-time
communication during the incident. All decisions and timeline events are recorded in
the channel for the post-incident review.

The incident commander role is assigned to the on-call engineer who acknowledged the
alert. The incident commander coordinates communication, delegates investigation tasks,
and makes the call on mitigations. Technical investigation is delegated to subject matter
experts.

### 11.2 Severity Classification

P1 (Critical): Complete service outage, data loss, or security breach. Customer-facing
impact affecting all tenants or a single major enterprise tenant. Revenue impact is
immediate. All-hands response required within 5 minutes.

P2 (High): Significant degradation affecting >20% of tenants or a critical feature.
Workaround exists but is not acceptable long-term. Response required within 30 minutes.

P3 (Medium): Partial feature degradation, isolated to a non-critical path. Workaround
exists and is communicated to affected users. Response within 4 hours during business hours.

P4 (Low): Minor degradation, cosmetic issues, or single-tenant impact with a workaround.
Tracked in JIRA without an active incident. Addressed in the next sprint.

### 11.3 Communication

Customer communication during incidents is handled by the Customer Success team. They
send status page updates and proactive emails to affected tenants. Engineers focus on
resolution; Customer Success handles external communication.

The status page (Statuspage.io) is updated within 15 minutes of incident declaration.
Updates are posted every 30 minutes during active incidents. A final resolution update
is posted within 1 hour of incident resolution.

Internal communication uses the incident Slack channel. A shared incident doc is created
in Confluence for the timeline and notes. The doc is linked in the Slack channel and
updated in real time by the scribe (typically the secondary on-call).

### 11.4 Post-Incident Review

PIRs are blameless. The goal is to understand what happened, why, and how to prevent
recurrence — not to assign blame. The PIR is facilitated by the incident commander and
attended by all team members involved in the response.

The PIR document includes: incident timeline, root cause analysis, contributing factors,
impact summary, action items. Action items have owners and due dates. High-priority action
items are expected to be completed within 2 sprints.

PIR learnings that apply broadly are added to the architecture decision log as new ADRs
or appended to existing ADRs. This ensures institutional knowledge is captured in the
same location as other architectural decisions.

---

## 12. Data Pipeline

### 12.1 Event Ingestion

The data pipeline begins with event ingestion from Kafka. The pipeline consumer reads
from all domain topics and normalizes events to a canonical schema before processing.
Normalization includes: timestamp standardization to UTC, field name standardization
to snake_case, and addition of pipeline metadata (ingestion timestamp, consumer version).

Ingestion throughput is monitored via the consumer lag metric. The pipeline is designed
to handle 100,000 events per minute at peak. Horizontal scaling is achieved by adding
consumer instances to the consumer group; Kafka redistributes partition assignments.

Event deduplication is performed at ingestion using a Bloom filter keyed on `event_id`.
The Bloom filter has a false positive rate of 0.1% at 10 million events. The filter is
rebuilt weekly from the canonical event store to reclaim memory.

### 12.2 Stream Processing

Real-time aggregations are computed using Apache Flink running on AWS EMR. Flink jobs
process the event stream with tumbling windows for per-minute aggregations and sliding
windows for rolling 24-hour metrics.

Flink state is backed by RocksDB with checkpointing to S3 every 5 minutes. In case of
job failure, Flink restarts from the last checkpoint with exactly-once processing semantics
ensured by Kafka transaction coordination.

Stream processing results are written to ClickHouse for analytical query serving. Flink
writes to ClickHouse via the native TCP protocol using batch inserts of 10,000 records.
Write buffering is tuned to achieve an end-to-end latency of under 60 seconds from event
production to query availability.

### 12.3 Batch Processing

Nightly batch jobs run on AWS Glue to compute aggregations that are too expensive for
streaming: cohort analysis, LTV calculations, churn predictions. Glue jobs read from
S3 (raw event archive) and write results to Redshift for BI tool consumption.

Batch job scheduling is managed by Apache Airflow on AWS MWAA. DAGs are stored in the
`nexlify-data` repository and synced to MWAA via S3. DAG authoring follows the
TaskFlow API for clean dependency declaration.

Batch job SLAs are defined per DAG. MWAA sends Slack notifications if a DAG misses its
SLA. Critical DAGs (overnight financial reconciliation) also trigger PagerDuty alerts on
SLA miss.

### 12.4 Data Quality

Data quality checks run after each pipeline stage using Great Expectations. Expectations
are defined as YAML documents versioned in the repository. Checks include: null counts,
value range validation, referential integrity between tables, row count thresholds.

Failed data quality checks halt the pipeline for the affected date partition. An alert
is sent to the data engineering team. Downstream BI dashboards display a data quality
warning banner until the partition is reprocessed and validated.

A data lineage graph is maintained using Apache Atlas. The lineage graph tracks data from
source event through all transformations to the final dashboard metric. This is used for
impact analysis when a source table schema changes.

---

## 13. ML Platform

### 13.1 Model Training

Machine learning models are trained on AWS SageMaker. Training jobs are triggered by
the data pipeline when a new monthly dataset is available. Training scripts are versioned
in the `nexlify-ml` repository and run as SageMaker Training Jobs using Docker containers.

Hyperparameter tuning uses SageMaker Automatic Model Tuning (Bayesian optimization).
The best model from each tuning job is registered in the SageMaker Model Registry with
its performance metrics (F1, precision, recall) and training dataset version.

Experiment tracking uses MLflow. All training runs log parameters, metrics, and artifacts
to the MLflow tracking server. The tracking server is backed by a dedicated PostgreSQL
database and S3 artifact store.

### 13.2 Model Serving

Trained models are served via SageMaker Endpoints. The prediction API is a thin proxy
service (`ml-gateway`) that routes requests to the appropriate SageMaker endpoint based
on model type and tenant configuration. This indirection allows model swaps without
changing calling services.

The `ml-gateway` caches predictions with a 10-minute TTL for deterministic inputs (same
input should yield same output). Cache keys are derived from a hash of the input features.
Caching reduces SageMaker endpoint invocation costs significantly for repeated predictions.

Model latency SLO is p99 < 200ms for synchronous predictions. Predictions that exceed
this budget are flagged in the monitoring dashboard. Batch prediction endpoints without
latency SLOs use asynchronous inference for cost efficiency.

### 13.3 Feature Store

Features are computed offline in the data pipeline and served from a Feast feature store.
Online feature serving uses Redis (Feast online store). Offline feature retrieval for
training uses a Parquet-based Feast offline store on S3.

Feature definitions are declared in Python code versioned in the `nexlify-ml` repository.
Feature computation is implemented as Flink streaming jobs or Glue batch jobs depending
on the freshness requirement. Online features are updated every 15 minutes via a
materialization job.

Feature drift is monitored by comparing the statistical distribution of features in
production against the training data distribution. A drift alert fires when the population
stability index exceeds 0.2 for any critical feature.

### 13.4 Model Governance

All models in production require an approval record in the ML Model Registry. The record
includes: model card (purpose, training data, evaluation results, known limitations),
approval sign-off from the data science lead and a business stakeholder, and a planned
review date (maximum 6 months).

Models processing personal data are subject to a privacy impact assessment before
deployment. The assessment documents: what personal data is used, the legal basis for
processing, data retention in model artifacts, and the right-to-erasure procedure.

Bias and fairness evaluations are run on models used for decisions affecting individual
users (e.g., risk scoring). The evaluation checks for disparate impact across demographic
groups using the 4/5ths rule. Models with disparate impact are not deployed without
documented mitigation.

---

## 14. Auth and AuthZ

### 14.1 Token Lifecycle

JWT access tokens are issued with a 15-minute expiry and signed with RS256. The signing
key is stored in AWS Secrets Manager. The public key is exposed at `/.well-known/jwks.json`
for client-side token verification.

Refresh tokens are 256-bit random values stored in a `refresh_tokens` table with the
columns: `token_hash`, `user_id`, `tenant_id`, `expires_at`, `revoked`, `family_id`.
The `family_id` links a chain of refresh tokens from the same original login event for
theft detection.

Token introspection is available for resource servers that cannot validate JWTs locally
(e.g., third-party integrations). The introspection endpoint returns the token's active
status, subject, and scope. Introspection responses are cached for 30 seconds.

### 14.2 Multi-Factor Authentication

MFA is required for all admin accounts and optional for standard accounts. Supported MFA
factors: TOTP authenticator apps (RFC 6238), hardware security keys (FIDO2/WebAuthn),
and SMS OTP (not recommended, available for legacy compatibility only).

TOTP secrets are generated using `speakeasy` and stored encrypted in the user table. The
encryption key is the user's account-specific key derived from the master key using HKDF.
This ensures that compromising the master key requires per-user decryption.

WebAuthn registration and authentication use the `@simplewebauthn/server` library.
Passkey credentials are stored with the credential public key, sign count, and metadata.
The sign count is validated on every authentication to detect credential cloning.

### 14.3 Session Management

Sessions are tracked in a `sessions` table for audit purposes. Each session record
includes: session ID, user ID, tenant ID, IP address, user agent, creation timestamp,
last activity timestamp, and revocation status.

Concurrent session limits are configurable per tenant. Enterprise tenants can restrict
users to a single active session. Standard tenants allow up to 10 concurrent sessions.
Exceeding the limit revokes the oldest session automatically.

Session activity is updated on every authenticated request (maximum once per minute to
reduce write amplification). Sessions inactive for 30 days are automatically revoked
by a nightly cleanup job.

### 14.4 API Key Management

API keys provide programmatic access without user interaction. Keys are 512-bit random
values prefixed with `nlk_` for easy identification in logs and configuration files.
Only the hash of the key is stored; the plaintext is shown once at creation.

API keys have optional expiry dates. Expired keys are rejected at the gateway. Keys are
scoped to specific permissions at creation and cannot be granted more permissions after
issuance. Key usage is logged in the audit log with the request timestamp, IP, and endpoint.

Organizations can create up to 50 API keys. Keys can be labelled and tagged for
organizational purposes. A key rotation workflow is supported: create a new key, update
configurations, then revoke the old key. The audit log records both the old and new key
ID (not the plaintext) during rotation.

---

## 15. Multi-tenancy

### 15.1 Tenant Isolation Model

Tenant data is isolated at the row level using a `tenant_id` column on all tables. Row-level
security (RLS) in PostgreSQL enforces isolation by applying a `WHERE tenant_id = current_setting('app.tenant_id')` 
policy on all SELECT, INSERT, UPDATE, and DELETE operations.

The `app.tenant_id` session variable is set at the start of every database transaction
by a middleware layer. The middleware reads the tenant ID from the JWT token, validates it,
and sets the session variable before the first query is executed.

Physical isolation (separate database per tenant) is available for enterprise tenants
with a contractual requirement. Physical isolation tenants use the same application code
but with a different connection string that routes to their dedicated database instance.

### 15.2 Tenant Configuration

Tenant-specific configuration is stored in a `tenant_settings` JSONB column. Settings
include: feature flag overrides, custom branding, rate limit overrides, notification
preferences, and SSO configuration. Settings are cached per tenant with a 5-minute TTL.

A tenant settings API allows admins to view and modify their own settings. Platform admins
can modify settings for any tenant. Setting changes are logged in the audit log with the
previous and new values.

New tenants are provisioned via an automated workflow: create tenant record, provision
dedicated S3 prefix, configure Kafka consumer group, seed default role and permission
records, send onboarding email. Provisioning completes within 60 seconds.

### 15.3 Resource Quotas

Tenants have configurable resource quotas: maximum active workflows, maximum concurrent
executions, maximum integration connections, maximum API calls per month. Quotas are
enforced in the application layer before the resource is created or the action is performed.

Quota usage is tracked in a `tenant_quota_usage` table updated in near-real-time.
Approaching quota limits (>80% used) trigger a notification email to the tenant admin.
Quota exhaustion blocks the action and returns a 429 with a `Quota-Exceeded` header.

Enterprise tenants can negotiate custom quota limits. The sales engineering team maintains
a quota request process that includes capacity planning validation before approving.

### 15.4 Data Portability

Tenants can export all their data in JSON format via the export API. The export is
generated asynchronously and delivered via a pre-signed S3 URL emailed to the tenant
admin. Export generation time depends on data volume: small tenants complete within 5
minutes, large tenants within 60 minutes.

The export format follows the Nexlify Data Export Schema v2. The schema is documented
and versioned in the developer documentation. Each export file includes a manifest
listing all included resources and the schema version used.

Account deletion triggers a data erasure workflow. All tenant data is deleted within 30
days. The erasure is confirmed with a deletion certificate emailed to the former tenant
admin. Audit log records are pseudonymized rather than deleted for legal compliance.

---

## 16. Circuit Breakers

### 16.1 Configuration

Circuit breakers are configured per downstream dependency using `opossum`. Each circuit
breaker has: error threshold percentage (default: 50%), timeout (default: 5 seconds),
rolling window duration (default: 10 seconds), volume threshold (minimum 20 requests
before the circuit can open).

Circuit state transitions: CLOSED (normal) → OPEN (failing) → HALF-OPEN (probe) → CLOSED.
The circuit opens when the error threshold is exceeded in the rolling window. After the
reset timeout (default: 30 seconds), the circuit transitions to HALF-OPEN and allows a
single probe request. If the probe succeeds, the circuit closes; if it fails, it reopens.

Circuit breaker metrics are exposed to Prometheus: `circuit_breaker_state` (gauge),
`circuit_breaker_requests_total` (counter by state), `circuit_breaker_fallback_total`.
Grafana dashboards visualize circuit state history and transition frequency.

### 16.2 Fallback Strategies

Every circuit breaker is configured with a fallback function. Fallback strategies vary
by dependency type: cache fallback (return cached stale data), degraded mode (return
partial result), fail-fast (immediately return an error to the caller).

Integration API circuit breakers use a cache fallback returning the last successful
response with a `X-Stale-Data` response header indicating the cache age. This allows
workflow executions to continue with stale integration data rather than failing completely.

Payment processing circuit breakers use fail-fast with no fallback, as partial payment
data is worse than a clear error. Callers receive a 503 response with a retry timestamp.

### 16.3 Bulkheads

Bulkhead isolation prevents one failing downstream dependency from exhausting the thread
pool for all requests. Each downstream dependency has a dedicated connection pool with a
maximum concurrency limit. Requests that cannot acquire a connection from the pool are
rejected with a 429 response.

Bulkhead limits are tuned based on the downstream SLA and the expected concurrency.
For high-latency integrations (p99 > 1 second), the bulkhead limit is set conservatively
(20 concurrent requests) to prevent timeout saturation.

Bulkhead usage metrics are collected alongside circuit breaker metrics. High bulkhead
rejection rates indicate either under-provisioned limits or a degraded downstream that
is not being caught by the circuit breaker.

### 16.4 Retry Policies

Retry policies are configured per operation type. Idempotent read operations retry up to
3 times with exponential backoff starting at 100ms. Write operations are not retried
automatically due to the risk of duplicate execution; the caller is responsible for
implementing idempotency at the business logic level.

Retryable error codes: 429 (rate limit, uses `Retry-After` header), 503 (service unavailable),
connection timeouts. Non-retryable error codes: 400 (bad request), 401 (unauthorized),
403 (forbidden), 404 (not found), 422 (validation error), 500 (server error — ambiguous
idempotency).

Retry jitter is applied to prevent thundering herd after a service recovers. The jitter
is a random delay between 0 and the base backoff value. Full jitter is preferred over
equal jitter for wide concurrency scenarios.

---

## 17. Feature Flags

### 17.1 Flag Lifecycle

Feature flags follow a four-phase lifecycle: development (flag in code, off in all
environments), testing (flag on in staging, off in production), rollout (gradual
percentage-based rollout in production), cleanup (flag removed from code and LaunchDarkly).

Flags that have been fully rolled out (100% of users) for more than 2 sprints are
flagged for cleanup. A CI check detects flags that are always true or always false
in the codebase and fails the build with a list of flags to clean up.

Each flag has a planned removal sprint documented in the LaunchDarkly description field.
The flag owner receives a Slack reminder 1 sprint before the planned removal date.

### 17.2 Targeting Rules

Flags support multiple targeting rules evaluated in order: specific user IDs, user
attributes (role, plan), percentage rollout. The fallback rule applies when no targeting
rule matches. Rules are defined in LaunchDarkly and do not require a code deployment
to change.

Tenant-level targeting allows enabling a feature for a specific enterprise tenant before
general rollout. This is used for early access programs and tenant-specific feature
enablement negotiated in contracts.

Targeting rules are audited: LaunchDarkly logs every rule change with the user who made
the change and the before/after state. Audit logs are exported to CloudWatch for retention
beyond LaunchDarkly's default.

### 17.3 Experimentation

A/B experiments are run using LaunchDarkly experimentation. Each experiment defines a
control and treatment variation, a primary metric, and a sample size target. Experiments
run until statistical significance is reached or the maximum duration (21 days) expires.

Experiment results are reviewed in a weekly product review meeting. Winning variants are
shipped to 100% of users. Losing variants are rolled back and the insights documented.
Inconclusive experiments are extended if the effect is within the minimum detectable effect.

Experiments are logged in an experiment registry (Confluence) with: hypothesis, methodology,
results, and decision. The registry allows product and data science teams to search past
experiments to avoid repeating them.

### 17.4 Emergency Flags

Kill switches are a special category of flags that disable a feature immediately in case
of an incident. Kill switches are pre-created for every major feature before launch. They
are always checked by the feature code even if the feature is 100% rolled out.

Kill switch evaluation is done synchronously with a local SDK flag cache to avoid
LaunchDarkly latency during incident response. The local cache is updated every 5 seconds
via the streaming connection. In case of LaunchDarkly unavailability, the last cached
state is used.

Kill switch invocation is documented in the incident record. The postmortem evaluates
whether the kill switch worked as expected and whether the scope was appropriate.

---

## 18. Migration Strategy

### 18.1 Strangler Fig Pattern

Legacy system migrations use the Strangler Fig pattern. New functionality is built in
the new system behind the API gateway. The gateway routes requests to old or new system
based on the feature flag controlling the migration. Traffic is shifted gradually as the
new system is validated.

Each migration is tracked in a migration registry documenting: legacy endpoint, new
endpoint, migration status (planned, in-progress, validated, legacy-deprecated),
traffic split, and target completion date.

The migration gateway configuration is stored in the GitOps repository. Changes to traffic
routing are applied via standard pull request and deployment process, providing an audit
trail for all routing decisions.

### 18.2 Database Migration Approach

Schema migrations use the expand-contract pattern. The expand phase adds new tables and
columns. Both old and new code are deployed and run against the expanded schema. The
contract phase removes old tables and columns after all code using them is retired.

Large table migrations (>10M rows) use online schema change tools (pg-online-schema-change)
to avoid locking. These tools create a shadow table, copy data in batches, and swap the
table atomically. The migration runs in the background without impacting query performance.

Data migrations that change data format (not schema) are implemented as background jobs
running in the application. The job processes records in batches with rate limiting to
avoid impacting database performance. Progress is tracked in a migration status table.

### 18.3 API Version Migration

When a new API version is released, the migration guide is published simultaneously.
The guide covers: all breaking changes, migration examples for each change, and a
migration checklist. SDKs are updated in parallel with the API release.

API client libraries support automatic version negotiation: the client sends the preferred
API version in the `API-Version` header. If the requested version is not supported,
the gateway returns the nearest supported version and includes a `X-API-Version-Used`
header.

A migration assistant tool is available in the developer portal. The tool accepts an
API request example using the old version and generates the equivalent request for the
new version. The tool is used during support cases to help customers migrate faster.

### 18.4 Infrastructure Migration

Infrastructure migrations between AWS services are performed using the lift-and-shift
followed by optimize approach. The service is first migrated with minimal changes to
validate in production. Optimization (cost, performance) is a separate step after
validation.

Infrastructure migrations are tested in staging for a minimum of 2 weeks before
production cutover. Cutover is performed during low-traffic windows (Sunday 2-4am UTC).
A rollback plan is documented and tested before cutover.

Post-migration validation compares key metrics (latency, error rate, cost) between
pre-migration baseline and post-migration steady state. Validation runs for 1 week
before the migration is considered complete.

---

## 19. Tech Debt Registry

### 19.1 Classification Framework

Tech debt is classified on two axes: impact and effort. Impact covers: reliability risk
(causes incidents), velocity tax (slows down development), security risk, user experience
degradation. Effort is estimated in person-weeks.

High impact, low effort items are addressed immediately in the current sprint. High impact,
high effort items are broken into phases and scheduled across multiple quarters. Low impact
items are addressed opportunistically when working in the same code area.

The tech debt registry is a living document reviewed in the monthly architecture meeting.
New items are added by any engineer via a standard form. Items are removed when addressed
or when conditions change and the debt is no longer relevant.

### 19.2 Current Registry

High Priority (P1):
1. Orders Service cart persistence uses in-memory storage — data loss on pod restart.
   Effort: 2 weeks. Owner: Checkout Team. Target: Q3.
2. Refresh token rotation is not implemented — security risk. Effort: 1 week. Owner:
   Security Team. Target: current sprint.
3. Analytics Kafka consumer uses deprecated consumer API — will break in next Kafka
   major version. Effort: 3 days. Owner: Data Team. Target: Q2.

Medium Priority (P2):
4. API gateway rate limit config is static NGINX — no tenant-level overrides. Effort:
   3 weeks. Owner: Platform Team. Target: Q4.
5. Notification templates are hardcoded — no tenant customization. Effort: 4 weeks.
   Owner: Platform Team. Not scheduled.
6. OpenTelemetry not instrumented in Inventory and Notifications services. Effort: 1 week.
   Owner: SRE Team. Target: Q3.

### 19.3 Debt Prevention

New code is reviewed against a tech debt checklist: are all edge cases handled, is the
implementation testable, does it introduce implicit coupling, are there hardcoded limits
or values that should be configurable.

The architectural fitness functions (automated tests of architectural properties) are run
in CI. Fitness functions check: no circular module dependencies, no direct cross-service
database access, all new APIs have OpenAPI specs, all new services have a CODEOWNERS entry.

Time-boxed refactoring sprints are scheduled quarterly. Each team allocates 20% of sprint
capacity to tech debt work. The selection of items for refactoring sprints is driven by
the priority matrix in the registry.

### 19.4 Measurement

Technical debt is measured using SonarQube. The debt ratio (debt / development cost)
is tracked over time. The target is to keep the debt ratio below 5%. Exceeding 10% for
a service triggers a mandatory refactoring sprint for that service.

Code coverage is tracked as a proxy for test-suite debt. Services below 70% coverage
are flagged in the SonarQube dashboard. Coverage regressions (PRs that reduce coverage)
are blocked from merging unless the PR author provides a waiver approved by the tech lead.

Cyclomatic complexity is limited to 10 per function. Functions exceeding this limit are
flagged by SonarQube and must be refactored before the PR is merged. High-complexity
code is strongly correlated with bugs and is treated as a reliability risk.

---

## 20. Appendix

### 20.1 Glossary

| Term | Definition |
|---|---|
| SLO | Service Level Objective — measurable target for service reliability |
| SLA | Service Level Agreement — contractual commitment to SLO |
| RTO | Recovery Time Objective — maximum acceptable downtime |
| RPO | Recovery Point Objective — maximum acceptable data loss |
| PIR | Post-Incident Review — blameless analysis of what went wrong |
| RLS | Row-Level Security — PostgreSQL policy for per-row access control |
| PII | Personally Identifiable Information |
| PKCE | Proof Key for Code Exchange — OAuth 2.0 extension for public clients |
| TOTP | Time-based One-Time Password |
| FIDO2 | Fast Identity Online 2 — standard for hardware security keys |
| DLQ | Dead Letter Queue |
| OTEL | OpenTelemetry |
| RED | Rate, Errors, Duration — standard service monitoring metrics |
| RUM | Real User Monitoring |
| LCP | Largest Contentful Paint — Core Web Vital |
| FID | First Input Delay — Core Web Vital |
| CLS | Cumulative Layout Shift — Core Web Vital |

### 20.2 Reference Documents

Architecture Decision Records: see `docs/design-docs/ADR-*.md` for all decisions with
rationale and consequences. ADRs are the authoritative source for why architectural
choices were made.

Runbooks: see `docs/runbooks/` for operational procedures. Each runbook is linked from
the corresponding alert definition in Grafana.

API Documentation: OpenAPI specs for all services are published at
`https://api.nexlify.example.com/docs`. The specs are generated from code annotations and
are always in sync with the deployed version.

### 20.3 Team Contacts

| Area | Team | Slack Channel | On-Call |
|---|---|---|---|
| Workflow Engine | Workflows Team | #team-workflows | PagerDuty: workflows-oncall |
| Integration Engine | Integrations Team | #team-integrations | PagerDuty: integrations-oncall |
| Platform / Infra | SRE Team | #team-sre | PagerDuty: sre-oncall |
| Security | Security Team | #team-security | PagerDuty: security-oncall |
| Data Platform | Data Team | #team-data | PagerDuty: data-oncall |
| Frontend | Frontend Team | #team-frontend | No on-call rotation |
| ML Platform | ML Team | #team-ml | PagerDuty: ml-oncall |

### 20.4 Change Log

This document is updated when significant architectural decisions are made or when the
described architecture diverges from the implementation. Trivial updates (typos, link
fixes) are not logged. Significant updates should be summarized here.

| Date | Section | Change | Author |
|---|---|---|---|
| 2025-01-15 | Section 6 | Added WebAuthn MFA documentation | Security Team |
| 2025-02-01 | Section 13 | Added ML Platform section | ML Team |
| 2025-03-10 | Section 3 | Documented three-tier cache architecture | Platform Team |
| 2025-04-05 | Section 16 | Added bulkhead and retry policy documentation | SRE Team |
| 2025-05-01 | Section 14 | Documented API key management workflow | Security Team |
| 2026-01-20 | Section 17 | Updated feature flag lifecycle — added cleanup CI check | Platform Team |
| 2026-03-15 | Section 12 | Added data quality and lineage sections | Data Team |
| 2026-04-30 | Section 19 | Updated tech debt registry with Q2 items | Architecture Council |
