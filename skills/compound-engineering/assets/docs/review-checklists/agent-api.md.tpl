# Agent API Checklist

- Agent actions have a scoped auth model and do not reuse broad human admin sessions.
- Mutating actions are audited with actor, target, timestamp, and request context.
- Destructive or high-impact actions require confirmation, narrowing, or human review.
- Rate limits and abuse controls exist for agent-accessible endpoints.
- Agent documentation names allowed actions, forbidden actions, and expected payloads.
- Secrets and one-time credentials are never returned after initial creation.
