---
mode: quick
created: 2026-05-18
owner: Luiz/dev
---

# Quick Plan: `/init` — detectar legacy em `.claude/` + headings pt-BR no extrator

## Goal

Corrigir 2 bugs do `/init` v6.4.x que fazem projetos v5 reais (com layout `.claude/*`) e CLAUDE.md em portugues serem reportados como Greenfield e/ou perderem extracao de blocos Akita.

## Scope

- **Bug 1** (`.claude/` ignorado): [skills/init/lib/detect-v5-legacy.ts](../../skills/init/lib/detect-v5-legacy.ts) so varre raiz; precisa varrer tambem `.claude/` e ler `.claude/.anti-vibe-manifest.json` para distinguir v5 de v6.
- **Bug 2** (regex inglês-only): [skills/init/lib/steps/10-apply-merge-destructive.ts:37](../../skills/init/lib/steps/10-apply-merge-destructive.ts#L37) — `AKITA_HEADING_REGEX` so casa palavras em ingles, perdendo "Codigo", "Comentarios", "Testes", "Dependencias", "Observabilidade".

Fora do escopo: migracao automatica desses artefatos (so deteccao); refactor da heuristica geral; suporte a outros idiomas.

## Execution Steps

1. Estender `AKITA_HEADING_REGEX` com keywords pt-BR (com e sem acento) e adicionar teste com CLAUDE.md pt-BR → verify: novo teste passa, extrai pelo menos 4 blocos pt-BR.
2. Estender `detectV5Legacy` com probes `.claude/` (artefatos + manifest v5) e novos `LegacyArtifact` variants → verify: testes existentes verdes, novo teste fixture `.claude/`-only acusa `isLegacy=true`.
3. Atualizar `00-detect-legacy.ts` para tratar manifest v5 dentro de `.claude/` como legacy (nao Greenfield) → verify: fixture com `.claude/.anti-vibe-manifest.json` pluginVersion 5.x emite abort code 1.
4. Atualizar goldens `__golden__/detect-legacy-legacy.txt` se mensagem mudou → verify: golden test passa byte-identical.
5. Rodar `bun run test` em `skills/init/` → verify: suite 100% verde.
6. Rodar `bun run lint` (ou equivalente) → verify: zero erros.

## Validation Log

(preenchido durante execucao)

## Compound Opportunity

Se essa categoria de bug repetir (detector estreito demais, regex monolingual), candidato a licao em `docs/compound/` apos completar.

## Lessons Captured

(preenchido apos execucao)

## Exit Criteria

- Suite `skills/init/lib/**/*.test.ts` 100% verde.
- Novo teste pt-BR de `10-apply-merge-destructive` passa.
- Novo teste `.claude/`-only de `detect-v5-legacy` passa.
- Lint sem erros.
- Bugs reproduzidos no projeto Carreirarte (fonte do report) deixam de acontecer.
