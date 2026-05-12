# Architecture

<!-- INIT:STACK_BLOCK -->
<!-- This block is replaced by /init after stack detection. Do not edit by hand. -->

## Overview

{{PROJECT_NAME}} — {{ONE_LINE_DESCRIPTION}}

## Stack

- Runtime: {{RUNTIME}}
- Framework: {{FRAMEWORK}}
- Database: {{DATABASE}}

## Folder layout

```
{{PROJECT_NAME}}/
├── AGENTS.md           # source of truth for agents
├── CLAUDE.md           # symlink/hardlink/copy of AGENTS.md
├── ARCHITECTURE.md     # this file
├── docs/
│   ├── PLANS.md
│   ├── QUALITY_SCORE.md
│   ├── PRODUCT_SENSE.md
│   ├── exec-plans/
│   ├── compound/
│   └── design-docs/
└── scripts/
    └── harness-validate.ts
```

## Conventions

- File naming: kebab-case
- TS strict mode, no `any`
- Tests collocated with source: `foo.ts` + `foo.test.ts`
