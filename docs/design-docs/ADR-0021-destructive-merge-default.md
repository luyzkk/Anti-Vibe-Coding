---
adr-id: 0021
title: "Default Destrutivo do /init com Backup Recuperavel + Aprovacao Explicita"
date: 2026-05-18
status: active
tags: [init, merge, breaking-behavior, backup, rollback, v6.4.0]
---

# ADR-0021: Default Destrutivo do /init com Backup Recuperavel

## Context

Ate v6.3.x, o `/anti-vibe-coding:init` aplicava merge **aditivo** sobre `CLAUDE.md`
pre-existente: preservava o arquivo original intacto e adicionava blocos Anti-Vibe ao
redor. Resultado em projetos com CLAUDE.md trabalhado (regras Akita/Senior, padroes de
stack): violacao silenciosa de **D16 do v6.0.0** (AGENTS.md = single source of truth,
CLAUDE.md = espelho <=40 linhas) e IA consultando dois documentos divergentes.

O SKILL.md v6.3.x carregava a regra literal "**NUNCA sobrescrever** — o merge deve ser
**aditivo**", que era seguranca conservadora mas mantinha o projeto fora do estado
canonico que o proprio plugin define como ideal.

Sintese do problema do PRD `2026-05-17-refactor-init-harness-populate-merge`: o init
"parece instalado mas nao funciona" porque o agente continua lendo o CLAUDE.md antigo
em vez do harness.

## Decision

A partir de **v6.4.0**, o comportamento default do `/init` em projetos com `CLAUDE.md`
pre-existente passa a ser **destrutivo controlado**:

1. Step 09 (`propose-merge-batch`) interrompe via contrato `needsUser` e apresenta diff
   agregado de TODAS as transformacoes propostas (extracao de blocos para `docs/`,
   reducao do `CLAUDE.md` a espelho <=40 linhas, mapeamento de docs estruturais).
2. Apos aprovacao explicita do dev, Step 10 (`apply-merge-destructive`) cria backup
   completo em `.anti-vibe/backup/{timestamp}/` com `manifest.json` checksum-validado e
   so entao aplica as transformacoes.
3. Para reverter, dev executa `/anti-vibe-coding:init --rollback` que restaura o
   backup byte-a-byte com validacao de integridade.

Para devs que precisam preservar o comportamento v6.3.x (transicao gradual, repos
externos), introduzimos a flag opt-in `--additive-merge` que pula Steps 09/10 e
mantem a logica de merge aditivo do legado.

## Specific Decisions

| # | Decision | Choice | Rejected Alternative | Reason |
|---|----------|--------|----------------------|--------|
| 1 | Default merge strategy | Destrutivo com backup + aprovacao (D2) | Modo dual (mantem ambos) | Modo dual viola D16 indefinidamente. Backup + rollback cobrem o risco. |
| 2 | Resolucao da regra "merge aditivo" do SKILL.md | Substituir (D26) | Manter regra antiga + flag destrutivo opt-in | Plugin precisa guiar o dev para o estado correto por default; aditivo vira opcao conservadora. |
| 3 | Reformulacao da regra "NUNCA sobrescrever" | "NUNCA sobrescrever sem aprovacao explicita + backup recuperavel" (D28) | Manter literal "NUNCA sobrescrever" + documentar excecao | Regra ganha qualificadores que refletem o sistema real (Step 09 + Step 10 + backup). |
| 4 | Backup location | `.anti-vibe/backup/{YYYY-MM-DD-HHMMSS}/` (D9) | `.claude/archive/` ou inline `.backup` | Pasta dedicada fora do dominio Claude Code; multiplos backups; gitignore. |
| 5 | Rollback mechanism | Flag `--rollback` no proprio /init (D10, D24) | Skill separada `/init-rollback`; doc manual | Padrao git-like; reusa dispatcher imutavel via early-return. |
| 6 | Approval granularity | Batch agregado com diff consolidado (D4) | File-by-file (15+ prompts); tiered | Dev ve mapa completo em uma tela; cancelar+re-rodar mais rapido. |
| 7 | Versionamento | v6.4.0 minor (D20) | v7.0.0 major; v6.4.0-rc.1 | Mudancas aditivas ao registry; interface publica preservada; backup+rollback+dry-run cobrem reversibilidade. |
| 8 | Comunicacao do default novo | ADR + CHANGELOG + warning runtime cross-upgrade (D30) | Apenas CHANGELOG | Tres camadas garantem que dev nao perde — warning so aparece quando relevante. |

## Alternatives Considered

1. **Modo dual** (manter `CLAUDE.md` original + criar `AGENTS.md`/docs novos paralelos)
   - Rejeitado: viola D16 indefinidamente; IA consulta dois documentos divergentes ate
     dev fazer cleanup manual; nunca alcanca estado canonico.

2. **Merge inteligente bloco-a-bloco** (hibrido — preserva regras Akita inline, extrai
   apenas blocos genericos)
   - Rejeitado: complexidade de classificacao bloco-a-bloco eh alta E nao resolve a
     violacao de D16 quando blocos preservados somam >40 linhas. D8 ja faz hibrido na
     classificacao, mas o destino sempre eh `docs/` extraido.

3. **Manter aditivo + adicionar warning "estado nao-ideal"** sem mudar default
   - Rejeitado: warning sem acao corretiva eh ruido; D16 continua violado por inercia
     em ~100% dos projetos com CLAUDE.md preexistente.

4. **`/init` interativo no primeiro run pos-upgrade** perguntando "destrutivo ou
   aditivo?"
   - Rejeitado: friccao em greenfield (95% dos cenarios futuros). D30 ja garante
     warning amarelo quando cross-upgrade eh detectado em projetos com CLAUDE.md
     inflado — friccao so onde eh relevante.

5. **Destrutivo escolhido** (esta ADR) ✓

## Consequences

Positivas:
- Projetos pos-init v6.4.0 alcancam estado canonico D16 (AGENTS.md unica source of
  truth, CLAUDE.md espelho <=40 linhas) sem cleanup manual.
- Regras Akita preservadas em `docs/DESIGN.md` (D17 + SH-08) — IA carrega sob demanda
  em vez de inflar contexto.
- Backup `.anti-vibe/backup/{ts}/` permite reversibilidade trivial via `--rollback`.
- Aprovacao em batch (D4) elimina friccao de 15+ prompts file-by-file.
- Devs que rejeitam o novo default tem escape hatch documentado (`--additive-merge`).

Negativas:
- **Breaking-comportamental** para usuarios v6.3.x — default mudou silenciosamente entre
  patch (6.3.2) e minor (6.4.0). Mitigacoes: D30 warning runtime amarelo quando relevante
  + CHANGELOG `### Breaking Changes (Behavior)` + esta ADR.
- Tamanho do backup `.anti-vibe/backup/` cresce a cada run — limpeza manual ate
  v6.5+ entregar `--prune-backups` (registrado em backlog).
- Stubs de redirect em paths antigos (Step 11) duplicam arquivos no `git history` —
  aceitavel, dev pode `git rm` depois.
- `--additive-merge` opt-in vira surface de manutencao paralela que precisa ser
  testada e documentada ate ser deprecada (v7.x?).

## Reversibility

Totalmente reversivel:
- **No nivel do projeto-alvo:** `/anti-vibe-coding:init --rollback` restaura backup
  byte-a-byte (validacao por checksum no manifest D29).
- **No nivel do plugin:** dev pode rodar `/init --additive-merge` em todos os
  projetos futuros para preservar v6.3.x behavior sem precisar fazer downgrade.
- **No nivel do release:** se feedback for catastrofico, v6.5.0 pode reverter default
  para aditivo + manter `--destructive-merge` como opt-in. A infraestrutura de
  backup/rollback/approval permanece util independentemente.

## Referencias

- PRD: `docs/exec-plans/active/2026-05-17-refactor-init-harness-populate-merge/PRD.md`
- CONTEXT (30 decisoes): `docs/exec-plans/active/2026-05-17-refactor-init-harness-populate-merge/CONTEXT.md`
- CHANGELOG seccao v6.4.0 `### Breaking Changes (Behavior)`
- Decisoes do PRD: D2, D4, D9, D10, D17, D20, D24, D26, D28, D29, D30
- SKILL.md regra reescrita: `skills/init/SKILL.md` (entregue por Plano 04 fase-07)
- Warning runtime: `skills/init/lib/cross-upgrade-detector.ts` (entregue por Plano 06 fase-02)
