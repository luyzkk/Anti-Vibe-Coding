---
title: "Detector/parser limitado ao caminho-feliz é detector mal calibrado"
category: bug
tags: [detector, regex, i18n, legacy-layout, init, false-negative]
created: 2026-05-18
referenced-by: [docs/references/init-step-contract.md]
---

## Problem

Dois bugs no `/init` v6.4.x — mesma raiz causal — tornavam projetos reais invisíveis para o pipeline:

**Caso 1**: [skills/init/lib/detect-v5-legacy.ts](../../skills/init/lib/detect-v5-legacy.ts) varria apenas a raiz do projeto procurando artefatos v5 (`.planning/`, `decisions.md`, `senior-principles.md`, `lessons-learned.md`). Mas projetos v5 reais em campo (ex: Carreirarte) viviam dentro de `.claude/` desde sempre — pastas como `.claude/plans/`, `.claude/tasks/`, `.claude/knowledge/`, arquivos como `.claude/decisions.md`, `.claude/.anti-vibe-manifest.json` (com pluginVersion 5.x e `.backup-v5.*`). O detector ignorava tudo isso e reportava **"Greenfield project — proceeding with scaffold."** — o que poderia destruir o install v5 existente.

**Caso 2**: [skills/init/lib/steps/10-apply-merge-destructive.ts:37](../../skills/init/lib/steps/10-apply-merge-destructive.ts#L37) usava o regex `/code.?style|comments?|tests?|dependenc|logging|observability/i` para extrair blocos Akita do `CLAUDE.md`. Em projetos pt-BR (headings "Código", "Comentários", "Testes", "Dependências", "Observabilidade") o regex casava zero — `DESIGN.md` saía sem extensões do projeto, perdendo silenciosamente todo o conteúdo customizado.

Sinal comum dos 2 bugs: o pipeline **declara sucesso falso** ("Greenfield" / "0 blocos extraídos") em projetos que claramente não são vazios. O usuário só descobre se conferir o output.

## Solution

**Caso 1**: Adicionar probes explícitos para `.claude/` na lista de candidatos, incluindo:
- 4 arquivos: `decisions.md`, `senior-principles.md`, `architecture-profile.md`, `PROJECT_MAP.md`
- 5 diretórios (com `entries.length > 0`): `plans/`, `tasks/`, `knowledge/`, `rules/`, `prompts/`
- Manifest v5 live (ler `.claude/.anti-vibe-manifest.json` e verificar `!pluginVersion.startsWith('6.')`)
- Manifest v5 backup (`.claude/.anti-vibe-manifest.json.backup-v5.*` — sinal mais forte)

Cada um vira um novo `LegacyArtifact` variant (`claude-decisions`, `claude-manifest-v5-backup`, etc.) para que a mensagem de abort liste exatamente o que foi encontrado.

**Caso 2**: Estender o regex com variantes pt-BR (com e sem acento, porque ambas aparecem em campo): `c[óo]digo|coment[áa]rios?|testes?|depend[êe]ncias?|observabilidade`.

Commit: `b8995d3` (6 novos testes + 1 fixture `claude-legacy/`).

## Prevention

- **Quando escrever detector ou extrator, listar explicitamente todas as variantes de campo conhecidas** antes de fechar o regex/probe-list:
  - i18n: para um projeto pt-BR, qual é o heading equivalente? E es-ES? E zh-CN?
  - Layout legado: onde os artefatos viviam em versões anteriores? Onde vivem hoje?
  - Convenções alternativas: `.config/`, `.claude/`, raiz, `docs/`?
- **Se o detector cobre apenas o caminho-feliz canônico, é detector mal calibrado** — não detector "simples". Detector simples cobre todas as formas conhecidas e é honesto sobre o que NÃO cobre (retorna `unknown` em vez de `greenfield`).
- **Suspeitar de "sucesso silencioso"**: quando um detector reporta "vazio/zero/nenhum" em situação onde o usuário esperava conteúdo, o primeiro hipótese deve ser "o detector é estreito demais", não "o input está vazio".
- **Hardening regressivo**: adicionar fixture com layout `.claude/` + CLAUDE.md pt-BR no smoke test do `/init`. Bug que ficou em produção até relato de campo deve virar teste antes de ser fechado.

## Affected files

- [skills/init/lib/detect-v5-legacy.ts](../../skills/init/lib/detect-v5-legacy.ts) — 11 novos `LegacyArtifact` variants + probes `.claude/`
- [skills/init/lib/detect-v5-legacy.test.ts](../../skills/init/lib/detect-v5-legacy.test.ts) — 6 testes novos
- [skills/init/lib/steps/10-apply-merge-destructive.ts:37-41](../../skills/init/lib/steps/10-apply-merge-destructive.ts#L37-L41) — regex pt-BR
- [skills/init/lib/steps/10-apply-merge-destructive.test.ts](../../skills/init/lib/steps/10-apply-merge-destructive.test.ts) — teste headings pt-BR
- [skills/init/lib/steps/00-detect-legacy.test.ts](../../skills/init/lib/steps/00-detect-legacy.test.ts) — teste `claude-legacy`
- [skills/init/lib/steps/__fixtures__/claude-legacy/](../../skills/init/lib/steps/__fixtures__/claude-legacy/) — nova fixture
- Padrão relacionado: [2026-05-12-validator-regex-hits-comments.md](./2026-05-12-validator-regex-hits-comments.md) (regex naive + false-positive)
- Padrão relacionado: [2026-05-12-dog-food-reveals-strict-validators.md](./2026-05-12-dog-food-reveals-strict-validators.md) (dogfood expõe heurísticas frágeis)
