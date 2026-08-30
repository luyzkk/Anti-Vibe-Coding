# Plano 01: Infra + Validador + Piloto + Tracer Bullet

**Feature:** Stack Knowledge Python ([PLAN overview](../PLAN.md))
**Fases:** 6 (fase-00 a fase-05)
**Sizing total:** ~9.5h nominal (~10-12h com ciclos de verifier/retrabalho)
**Depende de:** Nenhum (primeiro plano)
**Desbloqueia:** Plano 02 (Atoms T1), e transitivamente Planos 03-04

---

## O que este plano entrega

Slice end-to-end mínimo que **mata o AbortError** do `/init` em projeto Python: a matrix
`knowledge/python/` passa a existir (INDEX skeleton + átomo piloto `async-and-concurrency`),
o validador de frontmatter reconhece `python_versions`, e o tracer e2e prova
`primary='python'` → cópia sem abort (CA-02/CA-11). O piloto calibra o gate de qualidade
(anti-drift + verifier refined ≥80%) ANTES de investir nos 17 átomos restantes.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| `probePython` (pyproject.toml → requirements.txt) | `skills/init/lib/detect-stack.ts:147` | pronto (não mexer) |
| `STACK_ID_TO_MATRIX_FOLDER['python'] = 'python'` | `skills/init/lib/stack-id-map.ts:55` | pronto (já mapeado) |
| `copyKnowledge` + `runStackKnowledgeInit` + telemetria | libs existentes, stack-agnostic | pronto (zero mudança) |
| Fonte do piloto (compass 63884763, ~506 linhas) | `Infos/knowledge/Python/` (gitignored, congelada) | pronto |
| Compound lessons anti-drift + verifier refined | `docs/compound/2026-05-16-*.md` | pronto (regression obrigatória) |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `knowledge/python/` scaffold + INDEX skeleton | Planos 02-04 (todos os átomos entram em `atoms/`) |
| Validador com `python_versions` | Planos 02-04 (frontmatter de 17 átomos) + e2e full (Plano 04) |
| Protocolo extrator+verifier calibrado no piloto | Planos 02-04 (prompts de todas as waves) |
| Fixture `python-fastapi-fixture` + variante requirements-only | Plano 04 fase-07 (e2e full reusa) |
| Tracer e2e verde (prova Premissa 1 do PRD) | Decisão go/no-go de investir nos 17 átomos |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 00 | fase-00-pre-red-audit.md | Audit-report de testes/goldens afetados + baseline verde | 1h | — |
| 01 | fase-01-scaffold-knowledge-python.md | `knowledge/python/` + INDEX.md skeleton PT-BR | 0.5h | fase-00 |
| 02 | fase-02-tdd-python-versions-validator.md | Validador aceita `python_versions` (TDD, CA-03) | 1.5h | fase-00 |
| 03 | fase-03-atomo-piloto-async-and-concurrency.md | Átomo piloto ≥80% rastreável + commit bundle 01+02+03 | 2h | fase-01, fase-02 |
| 04 | fase-04-fixture-e-tracer-e2e.md | Fixtures FastAPI/requirements-only + tracer e2e (CA-02, CA-11) | 2h | fase-03 |
| 05 | fase-05-warning-legado-e-telemetria.md | Warning `requires-python` <3.11 (TDD, CA-04) + confirmação RF10 | 1.5h | fase-04 |

Sizing nominal: 8.5h. Reserva de ~1-3h para ciclos extras de verifier no piloto (precedente:
Plano 04 Node gastou ~30min/ciclo extra) e rework de goldens se a fase-00 encontrar afetados.

---

## Grafo de Fases

```
fase-00 (pré-RED audit)
    |
    v
fase-01 (scaffold)      fase-02 (validador TDD)
    |                        |
    +-----------+------------+
                |
                v
    fase-03 (átomo piloto)          <-- COMMIT BUNDLE: fases 01+02+03 juntas (G1)
                |
                v
    fase-04 (fixture + tracer e2e)  <-- commit próprio
                |
                v
    fase-05 (warning + telemetria)  <-- commit próprio
```

**Paralelismo possivel:** fase-01 e fase-02 tocam arquivos disjuntos (`knowledge/` vs
`skills/init/lib/`) e podem executar em paralelo após a fase-00. As demais são sequenciais:
fase-03 precisa do scaffold (destino do átomo) E do validador (frontmatter com
`python_versions` só é de fato validado após fase-02 — ver G3); fase-04 asserta o piloto
copiado; fase-05 reusa a fixture da fase-04 nos testes de integração.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun test && bun run typecheck && bun run harness:validate
```

- **TDD estrito:** fase-02 (validador) e fase-05 (warning) — RED e GREEN explicitados no corpo.
- **Test-after com gate próprio:** fase-03 (átomo é conteúdo — o "teste" é o verifier refined ≥80%).
- **Tracer Bullet deste plano:** fases 00→04 formam o slice end-to-end (pré-RED → scaffold →
  validador → piloto → prova e2e sem AbortError).

---

## Gotchas Conhecidos

Indexados — as fases referenciam por ID.

- **G1 — Commit bundle obrigatório (R1):** `bun run harness:validate` REGRIDE com
  `knowledge/python/atoms/` vazia (regra `[knowledge-presence]` em
  `scripts/harness-validate.ts:704-722`: exige INDEX.md E ≥1 `.md` em `atoms/`). Fases 01+02+03
  são BUNDLADAS num único commit; fase-00 é commit separado (só docs de audit); fases 04 e 05
  têm commits próprios. NUNCA commitar entre fase-01 e fase-03.
- **G2 — `Infos/` é gitignored:** a fonte compass fica local; só o átomo destilado vai ao repo.
  Nunca `git add Infos/` (lição feedback_git_repo_scope). Os paths em `sources:` referenciam
  arquivos gitignored de propósito — são audit trail local (RF13).
- **G3 — Campo desconhecido passa silencioso:** `validateAtomFrontmatter` só valida
  `REQUIRED_FIELDS` + `rails_versions`; um átomo com `python_versions` malformado passaria HOJE
  sem erro. Por isso a fase-02 entra no mesmo bundle do piloto — o campo do piloto nasce validado.
- **G4 — CRLF (compound 2026-05-19):** a normalização `\r\n → \n` vive DENTRO de
  `extractFrontmatter` (validator linha 34). Não tocar nessa função na fase-02; testes CRLF de
  `python_versions` cobrem a regressão.
- **G5 — Não hardcodear `atom_count: 18` neste plano:** ao fim do Plano 01 a matrix tem 1 átomo.
  Tracer (fase-04) e telemetria (fase-05) assertam contra `copyResult.atomCount` dinâmico ou ≥1.
  O 18/18 é responsabilidade do e2e full (Plano 04 fase-07).
- **G6 — Fixture imutável:** o `/init` grava `.claude/` no target. Os testes SEMPRE copiam
  `tests/fixtures/python-*` para tmpdir (`cpSync`) antes de rodar init — nunca rodar init
  direto na pasta da fixture (poluiria o repo).
- **G7 — Parse conservador de `requires-python` (R7):** formato não reconhecido = SEM warning
  (nunca falso-positivo). `^3.10` (poetry legacy, não é PEP 440) NÃO gera warning por design.
- **G8 — Anti-drift + verifier VERBATIM (R8):** os textos das duas compound lessons entram
  copiados literalmente nos prompts de extrator/verifier da fase-03 — não parafrasear. Fonte:
  `docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` +
  `docs/compound/2026-05-16-verifier-protocol-technical-sections-only.md`.
- **G9 — Branch + PR sempre:** todo o plano roda numa branch (`feat/stack-knowledge-python-plano01`);
  nunca commit direto na main (lição feedback_branch-pr-never-main).
- **G10 — `bun run harness:validate` antes de qualquer commit que toque `docs/`** (inclui o
  commit da fase-00, que grava o audit-report dentro de `docs/exec-plans/`).

---

<!-- Gerado por /plan-feature em 2026-08-30 -->
