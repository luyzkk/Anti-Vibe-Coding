# Plano 01: Tracer Bullet — Minimal `/init` + Validator E2E

**Feature:** Anti-Vibe Coding v6.0.0 — Harness + Compound Fusion ([PLAN overview](../PLAN.md))
**Fases:** 5
**Sizing total:** ~7h
**Depende de:** Nenhum (primeiro plano — tracer bullet)
**Desbloqueia:** Plano 02 (Full Scaffold), Plano 03 (Migration), Plano 04 (Validators Full), Plano 05 (Skills + Hooks)

---

## O que este plano entrega

Fatia mais fina possivel que prova a arquitetura end-to-end: templates minimos em ingles (AGENTS.md + ARCHITECTURE.md), skill `/init` esqueleto que copia esses templates para um diretorio vazio, fallback 3-tier para symlink em Windows (D16) e validador inicial em TypeScript+bun (D13). Ao fim do plano sabemos que: templates em EN renderizam, symlink funciona em Windows 11 sem developer mode, validator existe e roda, e o fluxo fixture-vazia → `/init` → `bun run harness:validate` retorna exit 0 em <30s.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| PRD com decisoes D2, D13, D16 confirmadas | `../PRD.md` | pronto |
| CONTEXT com Open Question 1 (symlink Windows) sinalizada | `../CONTEXT.md` | pronto |
| Referencia do harness-validate.mjs original do Andre | `f:/Projetos/Claude code/V6.0.0/package/skills/harness-engineering/assets/harness-template/scripts/harness-validate.mjs` | pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|--------------|
| Templates AGENTS.md + ARCHITECTURE.md em EN | Plano 02 (expande para 14+ docs) |
| Skill `/init` esqueleto com copy + symlink fallback | Plano 02 (scaffold full), Plano 03 (migracao) |
| Helper `lib/symlink-fallback.ts` (3-tier) | Plano 02, Plano 05 (hooks PostToolUse) |
| `scripts/harness-validate.ts` minimal | Plano 02 fase-04 (GH Actions), Plano 04 (validators full) |
| Fixture `tests/fixtures/empty-dir/` + E2E test base | Plano 03 fase-07 (E2E migration), Plano 04 fase-04 (perf bench) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-templates-base.md | Templates minimos AGENTS.md + ARCHITECTURE.md em EN | 1.5h | — |
| 02 | fase-02-init-skeleton.md | Skill `/init` esqueleto que copia templates | 2h | fase-01 |
| 03 | fase-03-symlink-fallback.md | Fallback 3-tier `ln -s` → `mklink /H` → `copy + hook` | 1.5h | fase-02 |
| 04 | fase-04-validator-minimal.md | `scripts/harness-validate.ts` (TS+bun) — checks essenciais | 1h | — (paralela com 01-03) |
| 05 | fase-05-e2e-test.md | Tracer bullet: fixture vazia → /init → validate exit 0 | 1h | fase-02, 03, 04 |

---

## Grafo de Fases

```
fase-01 (templates-base)         fase-04 (validator-minimal)
    │                                    │
    v                                    │
fase-02 (init-skeleton)                  │
    │                                    │
    v                                    │
fase-03 (symlink-fallback)               │
    │                                    │
    +-----------------+------------------+
                      │
                      v
              fase-05 (e2e-test)  ← TRACER BULLET
```

**Paralelismo possivel:** fase-01/02/03 (caminho dos templates + init) e fase-04 (caminho do validator) sao independentes. Um dev pode escrever o validator em paralelo enquanto outro monta `/init`. Fase-05 conecta os dois caminhos e prova o end-to-end.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

**TDD natural neste plano:**
- fase-04 (validator) — RED: teste espera exit 1 quando AGENTS.md tem 50 linhas. GREEN: implementar countLines + threshold.
- fase-05 (e2e) — RED: spawn `/init` em fixture vazia, esperar exit 0 do `harness-validate`. GREEN: amarrar fase-01..04.

Fases 01-03 sao "estruturais" (criar templates, helpers) — TDD aplica-se ao symlink fallback (fase-03) com fixture de Windows sem developer mode.

**Tracer Bullet deste plano:** fase-05-e2e-test (prova D2, D13, D16 funcionando juntos)

---

## Gotchas Conhecidos

- **G1 (D16 / R1):** No Windows 11, `ln -s` (Bash) so funciona com developer mode ON ou shell elevado. `mklink /H` (hard link NTFS) **nao exige admin** — eh a primeira opcao de fallback antes de cair para copia + hook.
- **G2 (D2):** AGENTS.md em ingles. Erro comum: redator escreve em PT durante prototipo e esquece de traduzir. Lock no template: header em EN, comentarios em EN, sem PT.
- **G3 (perf):** Validator em bun precisa rodar <2s mesmo na versao minimal — fase-04 usa `fs.promises.stat` paralelizado com `Promise.all`, nao loop sequencial.
- **G4 (cross-platform):** Sempre `path.join` / `path.resolve`, nunca string concat com `/` ou `\`. Templates referenciam paths com forward slash apenas em links markdown (renderizado pelo VS Code/GitHub).
- **G5 (fixture limpa):** `tests/fixtures/empty-dir/` precisa ser literalmente vazia (sem `.gitkeep`). Adicionar `.gitignore` na fixture para nao commitar artefatos gerados por `/init` durante runs locais.

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
