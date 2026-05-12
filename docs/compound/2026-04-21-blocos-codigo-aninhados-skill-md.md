---
title: "Nested code blocks in SKILL.md require quadruple backticks"
category: armadilha
tags: [skill-md, markdown, parser, fences]
created: 2026-04-21
---

## Problem

Triple backticks quebram o parser markdown quando aninhados dentro de seções de `SKILL.md` que já estão dentro de um fence. O problema ocorre apenas em `SKILL.md` com templates de código dentro de fences — `rules/*.md` diretos não precisam dessa proteção.

## Solution

Usar ```` ````markdown ```` como fence externo em seções de `SKILL.md` que contêm triple backticks internos. O fence externo com quatro backticks permite que triple backticks internos sejam tratados como conteúdo literal.

## Prevention

> _(extrapolated from rule)_

Ao adicionar exemplos de código em `SKILL.md` que contenham blocos de código, sempre usar quadruple backticks como fence externo. Revisar `SKILL.md` com preview markdown antes de commitar para detectar fences quebrados.
