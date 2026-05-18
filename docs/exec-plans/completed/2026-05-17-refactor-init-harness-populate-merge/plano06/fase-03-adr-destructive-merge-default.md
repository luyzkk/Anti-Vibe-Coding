<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 03: ADR — Default Destrutivo do /init com Backup Recuperavel

**Plano:** 06 — Comunicacao + Observabilidade
**Sizing:** 0.5h
**Depende de:** Nenhuma dentro do plano (paralelizavel com fases 02/04/05).
**Visual:** false

---

## O que esta fase entrega

Conforme **SH-11** e **D30** do PRD: ADR formal em `docs/design-docs/ADR-NNNN-destructive-merge-default.md` documentando a mudanca breaking-comportamental do `/init` v6.4.0 (default passa de aditivo → destrutivo com backup + aprovacao explicita). Cita rationale ancorado nas decisoes **D2** (estrategia destrutiva), **D26** (resolucao do conflito "merge aditivo" do SKILL.md), **D28** (reformulacao da regra "NUNCA sobrescrever") e o sistema de mitigacao (D9 backup, D10 rollback, D18 dry-run, D4 batch approval).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/design-docs/ADR-NNNN-destructive-merge-default.md` | Create | ADR completo com frontmatter + 6 secoes (Context / Decision / Specific Decisions / Alternatives Considered / Consequences / Reversibility). **NNNN inferido em runtime** — ver G1 |

**Total:** 1 arquivo novo. **Dentro do limite de 5/fase**.

---

## Implementacao

### Passo 1: Inferir o numero do proximo ADR

Conforme **G2 do README**: nao pre-escolher numero. Executar **antes** de criar o arquivo:

```bash
ls docs/design-docs/ADR-*.md | sed -E 's/.*ADR-([0-9]+)-.*/\1/' | sort -n | tail -1
# Atualmente retorna 0020. Proximo = 0021.
# MAS: se Plano 05 fase-06 (rollback-adr-template-snippet) ja foi mergeado e criou ADR-0021,
# este sera 0022. Sempre consultar no momento da execucao.
```

Resultado vai para `MEMORY.md` deste plano em `Notas para Planos Seguintes` para que fase-04 (CHANGELOG) consiga referenciar corretamente.

### Passo 2: Esqueleto do ADR

Seguir formato dos ADRs existentes (referencia: `docs/design-docs/ADR-0001-manifest-checksums.md` e `ADR-0002-subagent-contract.md`).

```markdown
---
adr-id: NNNN
title: "Default Destrutivo do /init com Backup Recuperavel + Aprovacao Explicita"
date: 2026-05-18
status: active
tags: [init, merge, breaking-behavior, backup, rollback, v6.4.0]
---

# ADR-NNNN: Default Destrutivo do /init com Backup Recuperavel

## Context

Ate v6.3.x, o `/anti-vibe-coding:init` aplicava merge **aditivo** sobre `CLAUDE.md`
pre-existente: preservava o arquivo original intacto e adicionava blocos Anti-Vibe ao
redor. Resultado em projetos com CLAUDE.md trabalhado (regras Akita/Senio, padroes de
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
- Decisoes do PRD: D2, D9, D10, D17, D20, D26, D28, D29, D30
- SKILL.md regra reescrita: `skills/init/SKILL.md` (entregue por Plano 04 fase-07)
- Warning runtime: `skills/init/lib/cross-upgrade-detector.ts` (entregue por Plano 06 fase-02)
```

### Passo 3: Validar formato

Apos criar o arquivo:

```bash
# Frontmatter valido (8+ campos esperados pelos ADRs existentes)
head -7 docs/design-docs/ADR-NNNN-destructive-merge-default.md
# Esperado: ---\n adr-id: NNNN\n title: "..."\n date: ...\n status: active\n tags: [...]\n ---

# Secoes presentes
grep -c '^## ' docs/design-docs/ADR-NNNN-destructive-merge-default.md
# Esperado: 6 (Context, Decision, Specific Decisions, Alternatives Considered, Consequences, Reversibility)
# (Referencias eh nivel "##" → soma 7 se incluida; tolerar)

# Cita as decisoes corretas do PRD
grep -E '\(D[0-9]+\)' docs/design-docs/ADR-NNNN-destructive-merge-default.md | wc -l
# Esperado: >= 8 ocorrencias (D2, D4, D9, D10, D17, D20, D26, D28, D29, D30)
```

### Passo 4: Atualizar `MEMORY.md` com ADR-ID definitivo

```markdown
## Notas para Planos Seguintes

### Para Plano 07 (Aceitacao E2E + Release v6.4.0)

- ADR-ID definitivo escolhido em runtime: **ADR-NNNN** (substituir NNNN pelo numero real).
  Release notes da fase-06 do Plano 07 referencia por numero real.

### Para fase-04 deste plano (CHANGELOG)

- Substituir placeholder `ADR-NNNN-destructive-merge-default.md` na linha do
  `### Breaking Changes (Behavior)` pelo numero real escolhido aqui.

### Para fase-02 deste plano (warning runtime)

- Substituir placeholder `ADR-NNNN` na mensagem de warning do `cross-upgrade-detector.ts`
  pelo numero real escolhido aqui.
```

---

## Gotchas

- **G1 herdado (G2 do README) — Numero do ADR NUNCA pre-escolhido:** Sempre rodar
  `ls docs/design-docs/ADR-*.md` no momento da execucao. Atualmente max=0020, mas
  Plano 05 fase-06 (`rollback-adr-template-snippet`) ou outros features paralelos
  podem ter consumido 0021 entre o planejamento e a execucao desta fase.
- **G2 herdado (G9 do README) — Cross-reference com fase-04:** Apos esta fase entregar
  o ADR com numero definitivo, fase-04 (CHANGELOG) e fase-02 (cross-upgrade-detector)
  precisam substituir o placeholder `NNNN`. Coordenacao: registrar o numero no
  `MEMORY.md > Notas para Planos Seguintes` ANTES do orchestrador disparar fase-04 ou
  fazer o pass posterior.
- **Local — Frontmatter `status: active`:** ADRs existentes (`ADR-0001`, `ADR-0002`)
  usam `status: active`. NAO usar `status: accepted` (formato MADR diferente) nem
  `status: proposed` (ADR ja entra ativo porque a feature ja foi decidida e esta sendo
  implementada).
- **Local — Tags consistentes com ADRs existentes:** Tags em ADRs existentes sao
  array de strings lowercase com hifen (ex: `[versioning, manifest, checksums]`).
  Usar `[init, merge, breaking-behavior, backup, rollback, v6.4.0]` — adicionar
  `v6.4.0` para permitir busca por versao.
- **Local — "Verbatim original" opcional:** `ADR-0001` tem secao "Verbatim original"
  preservando o markdown da decisao original em portugues. Para esta ADR nao se
  aplica (decisao foi formalizada diretamente em ingles no contexto do PRD); secao
  ausente eh aceitavel.

---

## Verificacao

### TDD

N/A — content authoring puro. Sem testes de codigo, apenas grep validations e revisao
humana.

### Checklist

- [ ] Arquivo existe em `docs/design-docs/ADR-NNNN-destructive-merge-default.md` com
      NNNN substituido pelo numero real inferido em runtime.
- [ ] Frontmatter contem todos os 6 campos: `adr-id` (numerico), `title` (string),
      `date` (YYYY-MM-DD), `status: active`, `tags` (array com pelo menos 4 tags
      incluindo `v6.4.0`).
- [ ] Secoes presentes (verificavel por `grep -c '^## '`): Context, Decision,
      Specific Decisions, Alternatives Considered, Consequences, Reversibility
      (>=6 ocorrencias).
- [ ] Pelo menos 8 referencias `(D{N})` no corpo do ADR (verificavel por
      `grep -cE '\(D[0-9]+\)' ADR-NNNN-destructive-merge-default.md`).
- [ ] Referencia explicita ao path do PRD e CONTEXT.md na secao Referencias.
- [ ] Referencia ao SKILL.md regra reescrita (entregue por Plano 04 fase-07) e ao
      warning runtime (entregue por fase-02 deste plano).
- [ ] `MEMORY.md` deste plano atualizado com ADR-ID definitivo em "Notas para Planos
      Seguintes" (consumido por fase-02 e fase-04).
- [ ] `bun run harness:validate` continua verde — ADR nao introduz violacao estrutural.

---

## Criterio de Aceite

**Por maquina:**
- `test -f docs/design-docs/ADR-NNNN-destructive-merge-default.md` retorna 0 (NNNN
  substituido pelo numero real).
- `head -7 docs/design-docs/ADR-NNNN-*.md | grep -E '(adr-id|title|date|status|tags)' | wc -l` retorna `>= 5`.
- `grep -c '^## ' docs/design-docs/ADR-NNNN-*.md` retorna `>= 6`.
- `grep -cE '\(D[0-9]+\)' docs/design-docs/ADR-NNNN-*.md` retorna `>= 8`.
- `bun run harness:validate` exit 0.

**Por humano:**
- Spot-check de coerencia: a secao "Alternatives Considered" lista pelo menos 4
  alternativas rejeitadas com razao explicita (modo dual, merge bloco-a-bloco,
  aditivo+warning, interativo).
- Tom alinhado com ADR-0001/ADR-0002 (declarativo, decisivo, sem hedge desnecessario).

---

<!-- Gerado por /plan-feature em 2026-05-18 -->
