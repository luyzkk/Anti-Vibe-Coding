<!--
Principio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisao ou
secao do PRD).
Exemplo: `// 2026-05-23 (Luiz/dev): manifest final regerado apos pedagogia ADR — CA-08`
NAO aplicar em codigo de runtime do plugin (helpers TS ja tem JSDoc, suficiente).
-->

# Plano 04: Pedagogia ADR + Validacao Final (Wave 2)

**Feature:** Agent-Skills Import — Wave 2 ([PLAN overview](../PLAN.md))
**Fases:** 2
**Sizing total:** ~2h
**Depende de:** Plano 02 fase-04 (13 agentes refinados com `contract_version: "2.0.0"`) AND Plano 03 fase-04 (3 skills novas + manifest base regerado)
**Desbloqueia:** encerra a Wave 2 — apos conclusao, libera a criacao do `PRD-WAVE-3.md` em pasta dedicada

---

## O que este plano entrega

Encerramento da Wave 2 com dois passos finais: (1) adiciona pedagogia `## When to Write an ADR` em `skills/decision-registry/SKILL.md` ANTES do CRUD existente (DT-4 do PRD), com tabela de gatilhos + lifecycle PROPOSED->ACCEPTED->SUPERSEDED + tabela "Common Rationalizations" + "Red Flags"; (2) regera o manifest pela ULTIMA vez na Wave 2 (captura o checksum atualizado de `decision-registry` apos a fase-01) e roda o pipeline canonico `bun run harness:validate && bun run test && bun run lint`, validando ponto-a-ponto os Exit Criteria do PLAN.md.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| 13 agentes refinados com `contract_version: "2.0.0"` uniforme | Plano 02 fase-04 (grep batch validou) | pendente |
| 3 skills novas existentes em `skills/source-driven-development/`, `skills/doubt-driven-development/`, `skills/git-workflow-and-versioning/` | Plano 03 fases 01/02/03 | pendente |
| `plugin-manifest.json` regerado uma vez incluindo as 3 skills novas | Plano 03 fase-04 | pendente |
| Validator anti-generico de `positive_observations` disponivel (gate para fase-04 do Plano 02) | Plano 01 fase-04 | pendente |
| `skills/decision-registry/SKILL.md` intacto (nao tocado pela Wave 2 ate aqui) | repo atual | pronto |
| PRD aprovado | `../PRD.md` (status: approved) | pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `## When to Write an ADR` em `skills/decision-registry/SKILL.md` | Usuario final do plugin / docs de orientacao para ADR |
| `plugin-manifest.json` com checksum FINAL de `decision-registry/SKILL.md` (refletindo a edicao da fase-01) | Distribuicao do plugin (release pos-Wave 2) |
| Confirmacao de CA-11 (verify-work nao tocado nesta wave) | Exit Criteria do PRD / proxima Wave 3 (consolidacoes) |
| Encerra a Wave 2 — proximo passo: criar `PRD-WAVE-3.md` em pasta dedicada | Wave 3 (fora deste plano) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | `fase-01-pedagogia-adr-decision-registry.md` | Secao `## When to Write an ADR` adicionada antes do CRUD em `skills/decision-registry/SKILL.md` (DT-4 / CA-08) | 1h | Plano 02 fase-04 + Plano 03 fase-04 |
| 02 | `fase-02-manifest-final-validacao-wave2.md` | `plugin-manifest.json` regerado capturando o delta da fase-01; pipeline `bun run harness:validate && bun run test && bun run lint` verde; Exit Criteria do PLAN.md validados ponto-a-ponto | 1h | fase-01 + Plano 02 fase-04 + Plano 03 fase-04 |

---

## Grafo de Fases

```
fase-01 (pedagogia ADR em decision-registry/SKILL.md)
    |
    v
fase-02 (manifest final + harness + test + lint + Exit Criteria Wave 2)
```

**Paralelismo possivel:** NENHUM. As fases sao sequenciais — fase-02 depende do checksum NOVO de `decision-registry/SKILL.md` que so existe apos fase-01.

---

## TDD Strategy

```
Ciclo da fase-01 (gates declarativos — skill markdown):
1. RED:   grep -c "## When to Write an ADR" skills/decision-registry/SKILL.md == 0
2. GREEN: Edit cirurgico insere o bloco ANTES de "## Comandos" -> grep retorna 1
3. REFACTOR: tabela "Common Rationalizations" tem >=5 linhas + lifecycle aparece + "Don't delete" presente
4. VERIFY: bun run harness:validate verde + grep confirma que "## Comandos" (CRUD) ainda existe

Ciclo da fase-02 (gates declarativos — manifest JSON):
1. RED:   diff plugin-manifest.json pre/pos mostra que checksum de decision-registry e o ANTIGO
          (snapshotar pre via cp plugin-manifest.json /tmp/manifest-pre.json)
2. GREEN: PLUGIN_VERSION=7.1.0 node scripts/generate-manifest.js -> checksum de decision-registry MUDOU
3. REFACTOR: validar via node inline que TODOS os 13 agentes + as 4 skills criticas (3 novas + decision-registry)
             tem checksum SHA-256 valido no manifest
4. VERIFY: bun run harness:validate && bun run test && bun run lint verdes;
           Exit Criteria do PLAN.md validados ponto-a-ponto
```

**Tracer Bullet deste plano:** N/A — o TB da Wave 2 foi feito no Plano 01 fase-03 (`security-auditor.md` refinado). Plano 04 e apenas pedagogia documental + validacao consolidada usando script de manifest ja exercitado no Plano 03 fase-04.

---

## Gotchas Conhecidos

- **G1 (pedagogia precede CRUD, NAO substitui — DT-4):** A secao `## When to Write an ADR` da fase-01 e ADICAO. O CRUD existente (`## Comandos`, `### add`, `### list`, `### query`) DEVE permanecer intacto. R-06 do PRD foi explicito: pedagogia ensina QUANDO; CRUD continua autoridade tecnica do COMO. Edit cirurgico — nunca rewrite do arquivo inteiro.

- **G2 (manifest regerado, NUNCA editado a mao):** Heranca do G4 do Plano 03. `plugin-manifest.json` so muda via `node scripts/generate-manifest.js`. Edit manual gera divergencia entre checksum no manifest e conteudo real do disco.

- **G3 (PLUGIN_VERSION=7.1.0 obrigatorio):** O script `scripts/generate-manifest.js` linha 14 tem default `'6.0.0'`. Sem exportar a env var, manifest sai com versao errada. Versao atual e `7.1.0` (de `.claude-plugin/plugin.json` linha 3). Mesmo gotcha do Plano 03 fase-04 — repetido aqui para reforco.

- **G4 (CA-11 backward-compat — verify-work intocado):** A Wave 2 NAO altera `skills/verify-work/SKILL.md`. Fase-02 valida via `git diff --name-only origin/main..HEAD -- skills/verify-work/SKILL.md` — esperado: vazio. Se aparecer diff, INVESTIGAR — fora do escopo desta Wave (algum subagente do Plano 02 pode ter editado por engano).

- **G5 (idempotencia do generate-manifest.js):** Re-rodar o script e seguro. Esta sera a SEGUNDA regeneracao da Wave 2 (primeira foi Plano 03 fase-04). A diferenca esperada vs Plano 03 fase-04: apenas o checksum de `skills/decision-registry/SKILL.md` muda. Se outros arquivos mudarem entre rodadas, investigar — pode indicar edits acidentais fora do escopo.

- **G6 (`harness:validate` e gate canonico final da Wave 2):** `bun run harness:validate` (executa `bun scripts/harness-validate.ts .`) e o gate. Se passar, plugin esta valido. Fase-02 NAO pode ser marcada como concluida com harness falhando. Mesmo principio do G5 do Plano 03.

- **G7 (Exit Criteria do PLAN.md valida toda a Wave — nao pular):** Fase-02 Passo 7 percorre literalmente cada checkpoint do `## Exit Criteria` em [PLAN.md](../PLAN.md) e marca [x] apos verificacao. Sao 8 checkpoints (CA-01..CA-12 + 5 criterios consolidados). Pular essa varredura deixa a wave em estado "aparentemente concluida mas nao auditada".

---

## CAs do PRD cobertos por este plano

| CA | Cobertura | Onde |
|----|-----------|------|
| CA-08 (decision-registry tem `## When to Write an ADR` antes do CRUD com tabela Common Rationalizations) | Integral | fase-01 |
| CA-11 (refactor nao quebra callers — `verify-work` intocado) | Integral (validacao final) | fase-02 Passo 5 (`git diff` sobre `skills/verify-work/SKILL.md`) |
| Exit Criteria do PLAN.md (toda a Wave 2 — 8 checkpoints) | Integral | fase-02 Passo 7 |
| SH-05 (manifest final com checksums regerados — agora capturando delta de fase-01) | Integral (re-regeracao) | fase-02 |

**Fora deste plano:**
- CA-01/CA-02/CA-03/CA-04/CA-09/CA-10 (refinamento dos 13 agentes) — Planos 01 + 02
- CA-05/CA-06/CA-07 (3 skills novas validadas) — Plano 03
- CA-12 (cenario clean retorna positive_observations + verdict approve) — validado em Plano 02 fase-04

---

## Riscos do PRD mitigados aqui

| Risco | Mitigacao no plano |
|-------|--------------------|
| R-06 (Media/Baixo) — Pedagogia ADR migrada colide com automacao `adr-writer.ts` em `decision-registry` (template duplicado) | G1 + DT-4: pedagogia precede o CRUD existente. CRUD continua autoridade tecnica do COMO (template Context/Decision/Alternatives/Consequences ja existe em `adr-writer.ts`). Pedagogia foca em "quando e por que" — sem duplicar o template tecnico |

---

<!-- Gerado por /plan-feature em 2026-05-23 -->
