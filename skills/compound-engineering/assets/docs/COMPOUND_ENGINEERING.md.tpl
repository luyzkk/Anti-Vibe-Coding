# Compound Engineering

## When to Capture a Lesson

Capture a compound note when:
- A bug or unexpected behavior reveals a non-obvious system property.
- A design decision closes off a future option — future-you needs to know why.
- A pattern emerges that applies across more than one feature.

Do not capture lessons for straightforward bugs or routine refactors.

## Compound Decision Gate

Before starting substantial work, answer:
1. Does this decision close off a future architectural option?
2. Is there a simpler path that achieves the same outcome?
3. Does this create a new dependency that affects reliability?

If any answer is "yes", document the trade-off in a compound note under `docs/compound/`.

## Note Format

See `docs/compound/README.md` for the frontmatter schema.

---

Replace this scaffold with project-specific content.
