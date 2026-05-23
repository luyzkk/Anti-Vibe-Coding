# Plano 01: Consolidacao /anti-vibe-review -> /verify-work (Tracer Bullet)

**Feature:** Agent-Skills Import — Wave 3 ([PLAN overview](../PLAN.md))
**Fases:** 4
**Sizing total:** ~2.5h
**Depende de:** Nenhum (primeiro plano da Wave 3; Wave 2 NAO e bloqueador formal — arquivos editados aqui nao sao tocados pela Wave 2)
**Desbloqueia:** Plano 04 (flowchart de AGENTS.md referencia `/anti-vibe-review (DEPRECADO)` — requer deprecation notice ja aplicada)

---

## O que este plano entrega

Tracer Bullet da Wave 3: prova que e possivel consolidar 2 skills com grace period funcional. Entrega gap analysis explicito entre `anti-vibe-review` e `verify-work`, deprecation notice clara no `anti-vibe-review/SKILL.md`, absorcao de delta (conteudo nao-duplicado) em `verify-work/SKILL.md`, e validacao de que `anti-vibe-review` continua funcional durante grace period (CA-10 backward-compat). Cobre CA-01, CA-02 e CA-10 do PRD.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| PRD aprovado | `../PRD.md` (status: approved) | pronto |
| Wave 1 | NAO bloqueia (arquivos diferentes) | pronto |
| Wave 2 | NAO bloqueia (Wave 2 toca `tdd-verifier`, `decision-registry` e 3 skills novas; nao toca `anti-vibe-review` nem `verify-work`) | pronto |
| Templates de fase/plano/memory | `skills/plan-feature/templates/` | pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `anti-vibe-review/SKILL.md` com deprecation notice | Plano 04 fase-03 (flowchart AGENTS.md referencia "/anti-vibe-review (DEPRECADO)") |
| `verify-work/SKILL.md` com delta absorvido | Plano 04 fase-04 (manifest final regenera checksums) |
| Mapa de gap analysis (gap-analysis.md) | Plano 04 fase-04 (referencia auditavel para Exit Criteria) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | `fase-01-gap-analysis-anti-vibe-vs-verify-work.md` | `gap-analysis.md` documentando delta exato entre as 2 skills | 0.5h | — |
| 02 | `fase-02-deprecation-notice-anti-vibe-review.md` | Bloco `## ⚠️ Deprecation Notice` no topo de `anti-vibe-review/SKILL.md` | 0.5h | fase-01 |
| 03 | `fase-03-absorver-delta-verify-work.md` | Conteudo nao-duplicado absorvido em `verify-work/SKILL.md` + manifest regenerado | 1h | fase-01, fase-02 |
| 04 | `fase-04-validar-backward-compat-e-delta.md` | Validacao CA-10 (skill funcional) + CA-02 (delta absorvido) + relatorio | 0.5h | fase-03 |

---

## Grafo de Fases

```
fase-01 (gap analysis: mapa de delta)
    |
    v
fase-02 (deprecation notice em anti-vibe-review)
    |
    v
fase-03 (TRACER BULLET: absorver delta em verify-work + manifest)
    |
    v
fase-04 (validar CA-10 + CA-02 + relatorio)
```

**Paralelismo possivel:** NENHUM. Fases lineares — cada uma consome o output da anterior:
- fase-02 precisa do gap-analysis (sabe o que nao duplicar na linguagem do notice)
- fase-03 precisa do gap-analysis (sabe o que absorver) e do notice ja aplicado (referencia em verify-work)
- fase-04 valida o estado final de ambos os arquivos

---

## TDD Strategy

```
Ciclo por fase:
1. RED: para fases markdown-only, "RED" = checklist de verificacao falha (grep nao encontra padrao esperado)
2. GREEN: edicao cirurgica satisfaz checklist
3. REFACTOR: nao aplicavel a edicao markdown
4. VERIFY: bun run harness:validate + greps especificos (CA-01, CA-02, CA-10)
```

**Tracer Bullet deste plano:** fase-03 (absorcao do delta em `verify-work` — prova que consolidacao funciona end-to-end com manifest regenerado e harness verde)

**Notas TDD por fase:**
- fase-01: sem TDD codigo — output e documento markdown auditavel (gap-analysis.md). Verificacao: arquivo existe + lista todas as secoes de ambas skills + delta categorizado.
- fase-02: TDD light — grep `## ⚠️ Deprecation Notice` apos frontmatter retorna match (CA-01).
- fase-03: TDD pelos criterios de aceite (grep do conteudo absorvido em verify-work, CA-02) + harness verde apos manifest.
- fase-04: sem codigo novo — apenas validacao via greps batch e teste funcional manual de `/anti-vibe-review` (CA-10).

---

## Gotchas Conhecidos

- **G1 (R-01 PRD):** Gap analysis pode revelar conteudo difícil de absorver (ex: `anti-vibe-review` tem checklist inline detalhada com 7 secoes; `verify-work` delega tudo a auditores). Em conflito, `verify-work` e a autoridade — itens que sao "duplicacao em forma de checklist inline" NAO devem ser absorvidos (auditores ja cobrem). Itens unicos como "Estrategia Staged/Unstaged" SIM devem ser absorvidos.
- **G2 (R-06 PRD):** Linguagem do deprecation notice deve ser clara mas NAO criar urgencia artificial — Wave 4 decide delete, sem data definida. Usar "grace period" e "migre agora, sem data de remocao definida" — DT-1 + DT-6.
- **G3:** `anti-vibe-review/SKILL.md` linha 1-3 tem comentario HTML acima do frontmatter (`<!-- 2026-05-14 ... -->`). O deprecation notice deve vir APOS o frontmatter (linha 13+), NAO no topo absoluto. Estrutura: comentario HTML -> frontmatter `---...---` -> H1 -> Deprecation Notice (PRIMEIRA secao apos H1).
- **G4:** `verify-work/SKILL.md` ja tem blocos TypeScript de telemetria nas linhas 10-57 (start) e ao final (end). Absorcao de delta DEVE ser feita em secoes markdown intermediarias — NAO tocar nos blocos `typescript` de telemetria (R-NEW-03 do PLAN).
- **G5:** `anti-vibe-review` SKILL.md ja tem secao linhas 20-30 (`## Modos de Invocacao`) explicando "Automaticamente pelo `/verify-work`". Essa relacao ja existe — deprecation notice apenas formaliza a hierarquia. Texto do notice pode citar essa relacao pre-existente.
- **G6:** Regenerar manifest apos edicoes em SKILL.md e mandatorio — `plugin-manifest.json` + `.claude-plugin/plugin.json` armazenam checksums SHA-256. Sem regeneracao, harness:validate falha (mesmo erro de Wave 1/2). Comando: `bun run generate:manifest` (ou equivalente — fase-03 verifica nome real no `package.json scripts`).
- **G7:** CA-10 (backward-compat) e o criterio mais sensivel. O grace period EXIGE que a skill continue funcional. Validacao: ler `anti-vibe-review/SKILL.md` apos edicao e confirmar que todo conteudo de `<instructions>`, `<checklist>`, `<report-template>` e `<context>` esta intacto (apenas o notice foi ADICIONADO no topo, nada removido).

---

## CAs do PRD cobertos por este plano

| CA | Cobertura | Onde |
|----|-----------|------|
| CA-01 (deprecation notice como primeira secao) | Integral | fase-02 |
| CA-02 (verify-work absorve delta) | Integral | fase-03 |
| CA-10 (anti-vibe-review continua funcional — backward-compat total) | Integral | fase-04 |

CAs 03-09 e CA-11 ficam para Planos 02/03/04 desta Wave.

---

## MH/SH do PRD cobertos por este plano

| Item | Cobertura | Onde |
|------|-----------|------|
| MH-01 (deprecation notice em anti-vibe-review com mensagem + grace period) | Integral | fase-02 |
| MH-02 (verify-work absorve delta nao-duplicado) | Integral | fases 01 (analise) + 03 (absorcao) |

---

<!-- Gerado por /plan-feature em 2026-05-23 -->
