---
title: "grep -c returns exit 1 when count is zero"
category: armadilha
tags: [bash, grep, exit-code, scripts]
created: 2026-04-21
---

## Problem

`grep -c` retorna exit 1 quando o padrão não é encontrado (count=0). Verificações de `$?` causam falso positivo de erro em código que funciona corretamente. Scripts que tratam qualquer exit code != 0 como falha quebram silenciosamente quando o resultado legítimo é "nenhuma ocorrência".

## Solution

Em scripts que usam `grep -c`, tratar exit code 1 + output "0" como resultado válido — não como falha do script. Usar `grep -c padrão arquivo || true` quando zero é resultado esperado, ou verificar explicitamente o output numérico em vez do exit code.

## Prevention

> _(extrapolated from rule)_

Ao escrever scripts bash com `grep -c`, sempre documentar que count=0 retorna exit 1. Preferir padrão:

```bash
count=$(grep -c 'padrao' arquivo || true)
if [ "$count" -eq 0 ]; then ...
```
