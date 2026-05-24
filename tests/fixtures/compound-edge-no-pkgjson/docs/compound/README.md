# Compound Notes

Use this directory for durable lessons that should influence future work. Prefer a short note here when the learning is broader than a single execution plan.

Compound notes use Markdown with YAML frontmatter so humans and agents can search by title, category, tag, and creation date.

## Note Template

```md
---
title: "CORS Issue with Cross-Origin Credentials"
category: debugging
tags: [cors, production, nginx]
created: 2026-04-20
---

# CORS Issue with Cross-Origin Credentials

## Problem

Requests to `/api/auth` failed with CORS errors in production only.

## Solution

Add `credentials: include` to fetch requests and configure production CORS headers.

## Prevention

Always smoke test authenticated cross-origin flows with production-like CORS settings before launch.
```

## Categories

Use one of these categories unless a new category is clearly needed:

- `debugging`: root causes and permanent prevention for defects that took meaningful investigation.
- `pattern`: implementation, product, or design decisions that should become defaults.
- `review`: repeated review findings and the standard answer.
- `operations`: production, deploy, migration, worker, storage, provider, and monitoring lessons.
- `security`: auth, permission, token, webhook, upload, CSP, and data-access lessons.
- `reliability`: retry, job, provider, storage, email, video, and rollback lessons.
