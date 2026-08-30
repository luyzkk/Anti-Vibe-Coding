# Plano 02: Atoms T1 + Verifier + Rastreio ECC

**Feature:** Stack Knowledge Python ([PLAN overview](../PLAN.md))
**Fases:** 6 (fase-01 a fase-06)
**Sizing total:** ~9h nominal (~9-11h com ciclos extras de verifier)
**Depende de:** Plano 01 (scaffold `knowledge/python/`, validador `python_versions`, piloto `async-and-concurrency`, protocolo extrator+verifier calibrado)
**Desbloqueia:** Plano 03 (Atoms T2), e transitivamente Plano 04

---

## O que este plano entrega

Os 5 átomos T1 restantes em `knowledge/python/atoms/` (idioms, typing, errors/observability,
pytest, security) — todos PT-BR (D1), ≤200 linhas, frontmatter schema Rails +
`python_versions`, com `sources:` apontando `Infos/knowledge/Python/` (RF13). O batch fecha
com o verifier refined ≥80% sobre os 5 átomos (relatório commitado) e com a tentativa de
rastreio da origem/licença "ECC" (RF12, mitigação não-bloqueante do risco D5). Ao fim, o T1
completo (6/6 com o piloto) está no repo, verificado e pronto para roteamento no INDEX final.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| `knowledge/python/atoms/` existente com piloto `async-and-concurrency.md` commitado | Plano 01 fase-01 + fase-03 | pendente (verificar com `ls knowledge/python/atoms/` + `git log`) |
| Validador aceitando `python_versions` (array semver) | Plano 01 fase-02 | pendente |
| Protocolo extrator + verifier calibrado no piloto (ajustes de prompt, se houver) | Plano 01 fase-03 → `plano01/MEMORY.md` seção "Notas para Planos Seguintes" | pendente |
| Fontes T1 congeladas em `Infos/knowledge/Python/` (gitignored) | Triagem do PRD | pronto |
| Compound lessons anti-drift + verifier refined | `docs/compound/2026-05-16-*.md` | pronto (regression obrigatória) |

**Pré-flight obrigatório** (lição `feedback_verify_memory_vs_code`): antes da Wave 1,
verificar NO CÓDIGO que as precondições do Plano 01 foram commitadas — `git log --oneline`
na branch base + `ls knowledge/python/atoms/` (piloto presente) + rodar
`bun test atoms-frontmatter-validator` (verde com `python_versions`). Não confiar apenas no
MEMORY do Plano 01.

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| 5 átomos T1 (`python-idioms-and-antipatterns`, `typing-and-static-analysis`, `errors-logging-observability`, `pytest-and-testing-strategy`, `security-fastapi-owasp`) | Plano 04 fase-04 (INDEX final roteia) + fase-07 (e2e full 18/18) |
| `security-fastapi-owasp` flagged para audit humano | Plano 04 fase-06 (audit D11) |
| Resultado do rastreio ECC (RF12) documentado no MEMORY | Plano 03 fase-05 (dependencies cita compass 0e7023f8) + closeout do Plano 04 |
| `verifier-report-plano02.md` (calibração de batch em wave) | Planos 03-04 (verifier batches seguintes reusam formato) |
| Eventuais excedentes de cap 200 registrados no `TODO.md` | Backlog pós-feature (precedente R8 Next) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-python-idioms-and-antipatterns.md | Átomo T1 idioms/anti-padrões (fonte PT-BR + ECC ES) | 1.5h | Plano 01 (independente das fases 02-05) |
| 02 | fase-02-typing-and-static-analysis.md | Átomo T1 tipagem sênior + mypy strict | 1.5h | Plano 01 (independente das fases 01, 03-05) |
| 03 | fase-03-errors-logging-observability.md | Átomo T1 erros/logging/observabilidade | 1h | Plano 01 (independente das fases 01-02, 04-05) |
| 04 | fase-04-pytest-and-testing-strategy.md | Átomo T1 pytest/estratégia de testes (fonte PT-BR + ECC ES) | 1.5h | Plano 01 (independente das fases 01-03, 05) |
| 05 | fase-05-security-fastapi-owasp.md | Átomo T1 security FastAPI/OWASP (**flagged audit D11**, R4 cap vigiado) | 1.5h | Plano 01 (independente das fases 01-04) |
| 06 | fase-06-verifier-batch-t1-e-rastreio-ecc.md | Verifier refined 5/5 ≥80% + relatório + rastreio ECC (RF12) | 2h | fases 01-05 (fan-in) |

Sizing nominal: 9h. Reserva ~1-2h para ciclos extras de verifier (precedente Node: ~30min/ciclo
extra) — dentro do envelope ~9-11h do PLAN.

---

## Grafo de Fases

```
            Plano 01 completo (piloto + validador + protocolo calibrado)
                                    |
        +----------------+----------+----------------+
        |                |                           |
        v                v                           v
    fase-01          fase-02                     fase-03        <-- WAVE 1 (paralela)
   (idioms)         (typing)                 (errors/obs)           commit 1
        |                |                           |
        +----------------+----------+----------------+
                                    |
                     +--------------+--------------+
                     |                             |
                     v                             v
                 fase-04                       fase-05          <-- WAVE 2 (paralela)
                (pytest)                 (security, audit D11)      commit 2
                     |                             |
                     +--------------+--------------+
                                    |
                                    v
                                fase-06                         <-- FAN-IN sequencial
                    (verifier batch T1 + rastreio ECC)              commit 3
```

**Paralelismo possivel:**
- **Wave 1 = fases 01-03** rodando em paralelo via subagentes extratores — cada fase escreve
  exatamente 1 arquivo próprio em `knowledge/python/atoms/` (categoria "seguro paralelizar";
  nenhum contrato compartilhado, nenhuma toca o INDEX.md).
- **Wave 2 = fases 04-05** em paralelo, mesma regra.
- **fase-06 é fan-in sequencial** — só inicia com os 5 átomos escritos e commitados.
- Waves de ~3 (não 5 de uma vez) seguem o precedente Next: lote menor facilita o gate G12
  (parar e revisar prompt se ≥2 falharem no verifier).

---

## TDD Strategy

```
Ciclo por fase de átomo (test-after com gate próprio — conteúdo, não código):
1. EXTRAIR: subagente com anti-drift clause VERBATIM escreve o átomo
2. CHECK ESTRUTURAL: cap 200, 4 seções, frontmatter, zero placeholders (por máquina, na fase)
3. GATE DE FIDELIDADE: verifier refined batch na fase-06 (≥80% por átomo)
4. VERIFY: bun run harness:validate após cada wave, antes do commit
```

- **Nenhuma fase deste plano escreve código de runtime** — não há RED/GREEN clássico. O "RED"
  equivalente é o verifier reprovar claim não-rastreável; o "GREEN" é o rework cirúrgico.
- **Tracer Bullet deste plano:** N/A (tracer foi Plano 01; o protocolo já chega calibrado).

---

## Gotchas Conhecidos

Indexados — as fases referenciam por ID. G1-G2 e G9-G10 herdados do Plano 01.

- **G1 — `Infos/` é gitignored (herda G2 do Plano 01):** as fontes ficam locais; só o átomo
  destilado vai ao repo. Nunca `git add Infos/` (lição feedback_git_repo_scope). Os paths em
  `sources:` referenciam arquivos gitignored de propósito — audit trail local (RF13).
- **G2 — Anti-drift + verifier VERBATIM (herda G8 do Plano 01, R8):** os textos das duas
  compound lessons entram copiados literalmente em TODOS os prompts de extrator (fases 01-05)
  e no prompt do verifier (fase-06) — não parafrasear. Fontes canônicas:
  `docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` +
  `docs/compound/2026-05-16-verifier-protocol-technical-sections-only.md`. O plan-verifier
  confirma a presença da cláusula antes de aceitar o batch.
- **G3 — Claims "contestado" nunca viram regra dura:** as fontes têm campo de confiança
  (consenso/contestado, ~21 claims contestadas no corpus). Claim contestada vira nota em
  Critérios de decisão ("fonte marca como contestado") ou é omitida — NUNCA entra como padrão
  ou anti-padrão prescritivo.
- **G4 — Normalização de versões entre fontes:** divergência entre relatórios (ex: FastAPI
  0.136 vs 0.141; Ruff 0.15 vs 0.16) → usar a mais recente citada nas fontes do átomo.
  Conflito real de recomendação (não só de versão) → nota em Critérios de decisão.
- **G5 — Cap 200 hard (R4):** verifier rejeita átomo >200 linhas de corpo. Excedente relevante
  NÃO se espreme — vira item de backlog no `TODO.md` da raiz (precedente R8 Next). A fase-05
  (security, 20 seções) é o maior risco — priorização explícita no corpo da fase.
- **G6 — Tradução ES→PT-BR sem drift (D1/D5):** `python-patterns/SKILL.md` e
  `python-testing/SKILL.md` (origem "ECC") estão em espanhol e são source normal (D5).
  Traduzir na destilação SEM adicionar conteúdo: a claim em PT-BR deve permanecer rastreável à
  passagem ES original (o verifier rastreia parafraseável cross-idioma).
- **G7 — `updated:` com data real de execução:** não copiar `2026-08-30` do planejamento se a
  fase executar em outro dia. Vale para os 5 frontmatters.
- **G8 — Campo extra `flagged_for_human_audit` passa no validador:** pelo G3 do Plano 01,
  `validateAtomFrontmatter` ignora campos desconhecidos. A fase-05 usa o campo no frontmatter
  (precedente Next) + nota no corpo. Confirmar com o validador rodando verde mesmo assim.
- **G9 — Branch + PR sempre (herda G9 do Plano 01):** todo o plano roda em
  `feat/stack-knowledge-python-plano02`; nunca commit direto na main
  (lição feedback_branch-pr-never-main). PR ao final da fase-06.
- **G10 — `bun run harness:validate` após cada wave, antes do commit (herda G10 do Plano 01):**
  `atoms/` já contém o piloto — a regra `[knowledge-presence]` está satisfeita, então NÃO há
  necessidade de bundle como no Plano 01: cada wave pode ser 1 commit próprio.
- **G11 — Nenhuma fase toca o INDEX.md:** o INDEX skeleton do Plano 01 fica intacto; o INDEX
  consolidado com roteamento dos 18 átomos é o Plano 04 fase-04. Subagente extrator que
  "aproveitar para atualizar o INDEX" está fora de escopo — rejeitar no review da wave.
- **G12 — Gate de loop do verifier (compound verifier-protocol, Prevention #3):** se ≥2 átomos
  do batch falharem a v1 do verifier, PARAR e revisar o prompt do verifier (e/ou suspeitar de
  drift sistemático de extrator — compound anti-drift, Prevention #4) antes de rodar v2. Não
  entrar em loop de rework cego.
- **G13 — Rastreio ECC é não-bloqueante (D5/RF12):** a fase-06 TENTA rastrear a origem do
  material "ECC"; não achar licença NÃO bloqueia o plano — registra-se a tentativa no MEMORY
  e segue (risco aceito pelo dev). Achando licença → entrada no `THIRD-PARTY-NOTICES.md`.

---

## Commits deste plano

| Commit | Conteúdo | Pré-condição |
|--------|----------|--------------|
| 1 | Wave 1: átomos das fases 01-03 | `bun run harness:validate` verde + checks estruturais das 3 fases |
| 2 | Wave 2: átomos das fases 04-05 | `bun run harness:validate` verde + checks estruturais das 2 fases |
| 3 | fase-06: `verifier-report-plano02.md` + MEMORY atualizado (+ NOTICES se ECC rastreada) (+ TODO.md se houver excedente de cap) | verifier 5/5 ≥80% |

Rework de átomo pós-verifier entra no commit 3 (ou commit dedicado `fix(knowledge):` se o
diff for grande). Branch única `feat/stack-knowledge-python-plano02` → PR ao final.

---

<!-- Gerado por /plan-feature em 2026-08-30 -->
