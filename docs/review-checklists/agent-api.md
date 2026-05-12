# Agent API Review Checklist

Mirrored from `agents/api-auditor.md`. Verify before merging API endpoint changes.

## Idempotency
- [ ] POST endpoints that create resources have an idempotency key
- [ ] Financial operations require UUID per request
- [ ] Duplicate detection implemented server-side

## DTOs and Validation
- [ ] Endpoints use DTOs for input and output
- [ ] `request.body` not used directly without validation (Zod, Yup, etc.)
- [ ] Input DTO: no ID or sensitive fields
- [ ] Output DTO: no password or internal tokens
- [ ] Back-end validation exists (not only front-end)

## REST Design
- [ ] Correct HTTP verbs (GET/POST/PUT/PATCH/DELETE)
- [ ] Correct status codes: 201 (created), 204 (no content), 400, 401/403, 404, 422
- [ ] Consistent error format across all endpoints
- [ ] No internal info in error messages
- [ ] Responses include pagination metadata where applicable

## Controllers
- [ ] No fat controllers (>100 lines): split into service layer
- [ ] Controller pattern: receive → validate → delegate → return
- [ ] Business logic not in controller

## Endpoint Security
- [ ] Protected routes have auth middleware
- [ ] Rate limiting on public endpoints
- [ ] CORS configured appropriately
- [ ] Input sanitization present

## Logging and Observability
- [ ] Requests logged (method, path, status, duration)
- [ ] Structured logging (JSON), not `console.log`
- [ ] Error stack traces server-side only (never in response)
- [ ] `request_id` propagated

## Pagination
- [ ] GET endpoints returning arrays have `limit`/`offset`/`page`/`cursor`
- [ ] No unbounded queries (`findAll`, `SELECT *` without `LIMIT`)
- [ ] Response includes pagination metadata (`total`, `page`, `pageSize`, `hasNext`)
- [ ] Maximum `pageSize` enforced

## URL Design
- [ ] No verbs in URLs (`/get`, `/create`, `/update`, `/delete`)
- [ ] Collection routes use plural nouns
- [ ] Nesting ≤3 levels deep
- [ ] API versioned (`/api/v1/`)
- [ ] kebab-case in URLs
