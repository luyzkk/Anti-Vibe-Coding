---
title: "Licao de determinismo resolvida dentro de um adaptador nao sobe sozinha para o helper compartilhado"
category: armadilha
tags: [determinismo, ci, cross-platform, helper-compartilhado, filesystem-order, route-auth-matrix]
created: 2026-09-08
---

## Problem

Feature inteira verde no Windows: **2143 pass / 0 fail**, 22 mutacoes de RED-check provadas, typecheck
e gates limpos. A **primeira execucao do CI (Linux)** reprovou:

```
Expected to contain: "middlewares contados como auth: requireAuth, requireAdmin"
Received:            "middlewares contados como auth: requireAdmin, requireAuth"
```

So a ORDEM. `splitByAuthName` preservava a ordem de insercao dos nomes, e essa ordem vinha da
**varredura de arquivos** — que difere entre Windows e Linux. A nota do relatorio de seguranca mudava
de conteudo conforme o SO.

**O que incomoda nao e o bug — e a genealogia dele.** O adaptador Rails, escrito na PRIMEIRA fase do
mesmo plano, ja tinha topado com isso e resolvido: `readRailsCoverage` processa handlers em ordem
alfabetica **exatamente** para ser deterministico, e isso esta registrado como decisao de implementacao.

A licao ficou **dentro do adaptador**. O helper compartilhado (`splitByAuthName`, usado pelos quatro
adaptadores) nunca foi revisitado. Express, Python e Next herdaram o problema, e ele so apareceu tres
fases depois, numa plataforma diferente.

## Solution

Ordenacao estavel no **helper compartilhado**, nao no adaptador que reclamou:

```ts
export function splitByAuthName(names: string[]) {
  const unique = [...new Set(names)].sort()   // <- ordem estavel, independente do SO
  return { auth: unique.filter(isAuthName), other: unique.filter((n) => !isAuthName(n)) }
}
```

Um `.sort()` conserta os quatro adaptadores de uma vez. A ordem nao carrega significado (e lista
legivel numa nota), entao ordenar nao muda semantica.

Teste que trava: chamar com as **mesmas** entradas em **ordens diferentes** e afirmar saida identica.

## Prevention

**Regra: quando um adaptador resolve um problema de determinismo, perguntar se o helper compartilhado
tambem precisa.** A correcao local funciona e some do radar — o proximo consumidor repete o bug. A
pergunta e "de onde essa ordem veio?", nao "esse arquivo esta certo agora?".

**Regra: toda lista derivada de leitura de diretorio precisa de ordem estavel ANTES de virar texto de
relatorio, golden ou nota.** Ordem de `readdir` e detalhe de sistema de arquivos, nao contrato. Saida
que muda por SO e instavel para diff, para golden e para revisao humana.

**Sinal de alerta:** `[...new Set(x)]`, `Object.keys()`, `.map()` sobre resultado de scan — qualquer um
alimentando string que vai para relatorio ou assercao.

**E o meta-ponto:** verificacao local numa plataforma so **nao substitui o CI**. 2143 testes e 22
mutacoes numa plataforma nao acharam o que o primeiro run em Linux achou. Isso e primo de
[2026-08-13-suite-verde-nao-exercita-validador-distribuido.md](./2026-08-13-suite-verde-nao-exercita-validador-distribuido.md)
— la o eixo e repo vs. artefato distribuido; aqui e SO vs. SO. A familia e a mesma: **verde aqui nao
quer dizer verde onde roda de verdade.**

## Affected files

- `skills/security/lib/route-auth-heuristics.ts` (`.sort()` em `splitByAuthName`; commit `42d16c8`)
- `skills/security/lib/route-auth-rails.ts` — onde a licao tinha sido aprendida e ficado presa
- Descoberto por: primeira execucao do CI no PR #77 (nao pela sessao de desenvolvimento)
- Registrado em: `docs/exec-plans/completed/2026-09-02-route-auth-matrix-audit/plano04/MEMORY.md`
  (GT-fase05-2; a origem esta em DI-fase01-2)
