# Telemetry

## What is collected

The plugin writes local-only telemetry to `.claude/metrics/YYYY-MM.jsonl` when skills run. Each
file covers one calendar month. The data includes: which skill ran, start/end timestamps, duration,
approximate token counts, success/failure, and stack detection events from `/init`.

**No data ever leaves your project.** All `.jsonl` files live inside `.claude/metrics/` and are
never sent anywhere.

## Opting out

Set `ANTI_VIBE_TELEMETRY=off` before running any skill:

```sh
export ANTI_VIBE_TELEMETRY=off
```

When this variable is `off`, the `writeTelemetryStart`, `writeTelemetryEnd`, and
`writeTelemetryDomainEvent` functions return immediately without writing anything. The default
(variable absent or any value other than `off`) is telemetry **on**.

To disable permanently, add the export to your shell profile or to a `.env` file that your
workflow sources before invoking Claude Code.

## Retention policy (manual)

`.claude/metrics/` files accumulate indefinitely — there is no automatic rotation or deletion in
v6.3.2. The data is purely local; you can delete old files at any time without loss of plugin
functionality.

Recommended: periodically remove `.jsonl` files older than 6 months.

```sh
# Example: delete files older than 180 days
find .claude/metrics -name '*.jsonl' -mtime +180 -delete
```

Files with `.jsonl` names follow the pattern `YYYY-MM.jsonl`. Any month file more than 6 months
old can be safely deleted. Rotation with automatic cleanup is planned for v6.3.3+.
