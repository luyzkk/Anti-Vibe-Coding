---
title: "anti-vibe-coding/ is an independent git repository inside the parent repo"
category: architecture
tags: [git, monorepo, repo-structure]
created: 2026-04-21
---

## Problem

`anti-vibe-coding/` parece um subdiretório normal do repo pai, mas tem próprio `.git/`. Commits feitos no diretório pai não registram mudanças no plugin; o histórico fica separado por design. Confundir os dois contextos resulta em commits perdidos ou histórico incorreto no plugin.

## Solution

Executar `git add/commit` de dentro de `anti-vibe-coding/` — nunca do diretório pai. Ao trabalhar no plugin, sempre verificar em qual repo o shell está operando antes de commitar.

## Prevention

> _(extrapolated from rule)_

Ao iniciar qualquer sessão de trabalho no plugin, verificar `git -C anti-vibe-coding/ status` explicitamente. Nunca usar `git add .` do repo pai esperando que afete o subdiretório do plugin.
