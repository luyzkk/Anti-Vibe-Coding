# Plano 03: Skills Novas (source-driven, doubt-driven, git-workflow)

**Feature:** Agent-Skills Import — Wave 2 ([PLAN overview](../PLAN.md))
**Fases:** 4
**Sizing total:** ~4h
**Depende de:** Plano 01 fase-02 (schema doc v2.0.0 bumpado — gate conceitual para skills novas referenciarem contract atualizado; bloqueio frouxo: skills novas nao consomem JSON contract diretamente)
**Independente do Plano 02:** sim — Planos 02 e 03 podem rodar em paralelo
**Desbloqueia:** Plano 04 (manifest final + validacao consolidada)

---

## O que este plano entrega

3 skills novas portadas de `Infos/agent-skills-main/` com copy-then-improve: `source-driven-development` (citacao de fontes oficiais com hierarquia), `doubt-driven-development` (CLAIM->EXTRACT->DOUBT->RECONCILE->STOP + cross-model opcional), `git-workflow-and-versioning` (conventional commits + atomicidade + integracao com `/iterate` e `/incident-response`). Cada skill recebe frontmatter padrao do plugin (`name`, `description` PT-BR diferenciadora, `user-invocable`, `disable-model-invocation`, `allowed-tools`), bloco de telemetria passiva no topo e final, cross-references para skills existentes, e passa `bun run harness:validate`. Manifest e plugin.json atualizados na fase-04.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| PRD aprovado | `../PRD.md` (status: approved) | pronto |
| Templates de fase/plano/memory | `skills/plan-feature/templates/` | pronto |
| Schema doc v2.0.0 (gate conceitual — skills novas nao consomem direto) | Plano 01 fase-02 | pendente |
| Lib `lib/telemetry-utils` | Existe no plugin (usado por todas skills) | pronto |
| Arquivos fonte das 3 skills | `Infos/agent-skills-main/skills/{source,doubt,git}-*/SKILL.md` | pronto |
| References da Wave 1 (citacao em fase-01 — fallback TODO se ainda nao mergeada) | `docs/references/` | pronto (accessibility-checklist.md, security-checklist.md, testing-patterns.md) |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `skills/source-driven-development/SKILL.md` validada | Plano 04 (manifest com checksum SHA-256) |
| `skills/doubt-driven-development/SKILL.md` validada | Plano 04 (manifest com checksum SHA-256) |
| `skills/git-workflow-and-versioning/SKILL.md` validada | Plano 04 (manifest com checksum SHA-256) |
| Padrao de copy-then-improve documentado em MEMORY | Plano 04 (se houver decisao reaproveitavel), Wave 3 (ports futuros) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | `fase-01-portar-source-driven-development.md` | `skills/source-driven-development/SKILL.md` com frontmatter + telemetria + cross-ref `references/` + UNVERIFIED pattern | 1.5h | — (apenas Plano 01 fase-02 conceitualmente) |
| 02 | `fase-02-portar-doubt-driven-development.md` | `skills/doubt-driven-development/SKILL.md` com sequencia CLAIM->EXTRACT->DOUBT->RECONCILE->STOP + cross-model opcional documentado | 1.5h | — (independente de fase-01) |
| 03 | `fase-03-portar-git-workflow-and-versioning.md` | `skills/git-workflow-and-versioning/SKILL.md` com conventional commits + integracao `/iterate` e `/incident-response` | 1h | — (independente de fase-01 e fase-02) |
| 04 | `fase-04-regenerar-manifest-e-plugin-json.md` | `.claude-plugin/plugin.json` + `plugin-manifest.json` atualizados com 3 skills novas e checksums SHA-256 | 0.5h | fase-01, fase-02, fase-03 |

---

## Grafo de Fases

```
fase-01 (source-driven)   fase-02 (doubt-driven)   fase-03 (git-workflow)
       \                        |                        /
        \                       |                       /
         +----------------------+----------------------+
                                |
                                v
                          fase-04 (manifest + plugin.json)
```

**Paralelismo possivel:** Fases 01, 02 e 03 sao INDEPENDENTES entre si — cada uma cria um diretorio + arquivo distinto, sem dependencia cruzada. Podem ser executadas em paralelo via 3 subagentes Fork (cache-otimizado). **Decisao do plano:** se rodar sequencial, ordem livre — mas executar fase-04 SOMENTE apos as 3 fases anteriores commitadas, pois o manifest depende do estado final do disco.

---

## TDD Strategy (gates declarativos)

SKILL.md e artefato declarativo (markdown + frontmatter YAML + bloco TS de telemetria). TDD reduz-se a:

```
Ciclo por fase (01/02/03):
1. RED:   skills/<nome>/SKILL.md nao existe -> harness:validate falha
          (ou existe sem frontmatter completo -> harness:validate aponta missing fields)
2. GREEN: cp do arquivo fonte + frontmatter + telemetria injetados ->
          harness:validate verde para a skill alvo
3. REFACTOR: cross-refs apontam para arquivos existentes (grep -F),
             secoes obrigatorias presentes (Overview, When to Use, Common
             Rationalizations, Red Flags, Verification), description PT-BR
             menciona diferenciacao
4. VERIFY: bun run harness:validate && bun run test && bun run lint verdes

Ciclo fase-04 (manifest):
1. RED:   plugin-manifest.json NAO contem entry para a skill nova
          (grep -F "source-driven-development" plugin-manifest.json -> 0 hits)
2. GREEN: node scripts/generate-manifest.js -> regenera manifest com 3 entries novas + checksums
3. REFACTOR: validar que checksums SHA-256 sao nao-vazios e correspondem ao conteudo real
4. VERIFY: harness:validate + test + lint verdes
```

**Tracer Bullet deste plano:** N/A — TB da Wave 2 foi feito no Plano 01 fase-03 (`security-auditor.md` refinado provou o template de agente). Skills novas usam fonte ja validada em producao no `agent-skills-main` (copy-then-improve), portanto nao precisam de TB proprio: o "tracer" e o proprio arquivo fonte testado em campo pelo Andre.

---

## Gotchas Conhecidos

- **G1 (copy-then-improve obrigatorio):** As fases 01/02/03 DEVEM comecar com `cp` literal do arquivo fonte em `Infos/agent-skills-main/skills/<nome>/SKILL.md` para `skills/<nome>/SKILL.md`. NUNCA reescrever do zero, NUNCA adaptar para baixo (resumir, omitir secoes, simplificar exemplos). Feedback do MEMORY global: "Ao portar de skill validada, COPIE LITERALMENTE e melhore em cima — NUNCA adapte para baixo". Melhorias = frontmatter padrao do plugin + telemetria + cross-refs PT-BR. NAO mexer no conteudo tecnico do corpo da skill.

- **G2 (cross-references explicitas):** R-04 do PRD: skills novas sobrepoem com `consultant`, `design-twice`, `iterate`. Cada SKILL.md DEVE ter secao "Differs from / Compose with" logo apos o frontmatter, listando 2-3 skills existentes e como elas diferem. Exemplos: SDD cita docs vs `consultant` ensina trade-offs; DDD ataca UMA escolha vs `design-twice` gera N alternativas; `git-workflow` ensina disciplina vs `/iterate` aplica disciplina pos-deploy. Sem isso, o usuario nao sabe quando invocar qual.

- **G3 (telemetria padrao plugin):** Blocos TS no topo e final do SKILL.md SEMPRE no padrao `code-simplification` (`writeTelemetryStart("<nome>")` + `writeTelemetryEnd("<nome>")` importados de `../../lib/telemetry-utils`). NAO copiar o padrao mais complexo do `plan-feature` (com TelemetryStart/End objects detalhados) — isso e overkill para skills declarativas e pode dispensar harness:validate por incompatibilidade.

- **G4 (manifest checksums DEVE ser regerado):** Adicionar entry manual em `plugin-manifest.json` E PROIBIDO. Sempre rodar `node scripts/generate-manifest.js` apos as 3 skills serem criadas. O script escaneia `skills/*/SKILL.md` automaticamente e calcula SHA-256. CA-09 do PRD exige checksums regenerados. fase-04 valida via grep dos 3 names + checksum nao-vazio.

- **G5 (harness:validate e gate):** `bun run harness:validate` (que executa `bun scripts/harness-validate.ts .`) e o gate canonico. Se passar, a skill esta valida pelo plugin. Cada fase termina com `harness:validate` verde antes de marcar como concluida. NUNCA reportar fase como "feita" com harness falhando.

- **G6 (PT-BR no `description`, EN no corpo tecnico):** Frontmatter `description` deve ser PT-BR (padrao do plugin — ver `code-simplification`, `plan-feature`, `incremental-implementation`). Corpo da skill mantem termos tecnicos em ingles quando padrao da industria (CLAIM/EXTRACT/DOUBT/RECONCILE/STOP, conventional commits, trunk-based development, atomic commits). Traducao "para baixo" do corpo destroi precisao — preserve.

- **G7 (DT-5 cross-model nao implementar):** fase-02 (DDD) documenta cross-model escalation (Gemini/Codex) como pattern OPCIONAL. NAO implementar wrapper shell, NAO assumir CLI instalado. Snippet shell-escape (heredoc, stdin) e exemplo DOCUMENTAL — usuario que tiver CLI configurado segue manualmente. R-05 do PRD reforca.

- **G8 (DT-6 commit-msg hook opt-in):** fase-03 (git-workflow) documenta hook commit-msg como APENDICE OPCIONAL (nao obrigatorio, nao bloqueante). CLAUDE.md global menciona conventional commits — skill complementa, NAO diverge. R-09 do PRD reforca.

- **G9 (CH-03 reference real obrigatoria em SDD):** fase-01 cita pelo menos 1 reference REAL em `docs/references/` (testing-patterns.md, accessibility-checklist.md, security-checklist.md ja existem da Wave 1). NAO usar TODO placeholder — `docs/references/` ja foi bootstrapado.

---

## CAs do PRD cobertos por este plano

| CA | Cobertura | Onde |
|----|-----------|------|
| CA-05 (skill `source-driven-development` valida) | Integral | fase-01 + fase-04 (manifest) |
| CA-06 (skill `doubt-driven-development` valida) | Integral | fase-02 + fase-04 |
| CA-07 (skill `git-workflow-and-versioning` valida) | Integral | fase-03 + fase-04 |
| SH-05 (3 skills em plugin.json + plugin-manifest.json com SHA-256) | Integral | fase-04 |
| CH-02 (cross-references entre skills novas e existentes documentadas) | Integral | fase-01, 02, 03 (cada uma documenta) |
| CH-03 (SDD cita >=1 reference em `docs/references/`) | Integral | fase-01 |
| CH-04 (DDD documenta cross-model + shell-escape seguro) | Integral (apenas docs, DT-5 confirma) | fase-02 |

**Fora deste plano:**
- CA-01/CA-10 (refinamento dos 13 agentes) — Planos 01 e 02
- CA-08 (decision-registry pedagogia) — Plano 04
- CA-09 (contract_version bump v2.0.0 + migration guide) — Plano 01
- CH-05 (migration guide bump 1.0 -> 2.0.0) — Plano 01, nao deste plano

---

## Riscos do PRD mitigados aqui

| Risco | Mitigacao no plano |
|-------|--------------------|
| R-04 (Media/Medio) — Skills novas sobrepoem com consultant/design-twice/iterate | G2 (cross-refs obrigatorias); fases 01/02/03 incluem passo "documentar diferenciacao" |
| R-05 (Baixa/Medio) — Cross-model introduz dependencia externa | G7 + DT-5: documentar como OPCIONAL desde inicio; pattern "fresh-context reviewer" funciona com mesmo modelo se cross-model indisponivel |
| R-09 (Baixa/Baixo) — `git-workflow` colide com Conventional Commits do CLAUDE.md global | G8 + DT-6: skill usa CLAUDE.md como fonte de verdade; complementa sem divergir |
| R-10 (Media/Medio) — SDD introduz overhead em cada geracao | Documentado no "When NOT to use" do proprio SKILL.md (codigo nao framework-especifico nao dispara busca de docs) |

---

<!-- Gerado por /plan-feature em 2026-05-22 -->
