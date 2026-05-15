# Plano 02: Discovery TS — Fase 0 + Audit Log

**Feature:** /init Migration Mode ([PLAN overview](../PLAN.md))
**Fases:** 3
**Sizing total:** ~4h
**Depende de:** Plano 01 (migration-mode-detector.ts + conceito de InitMode)
**Desbloqueia:** Plano 03 (Explorer subagents consomem inventory.json), Plano 04 (agents-log.json como evidência de execução)

---

## O que este plano entrega

Implementa o componente TypeScript **determinístico** da Fase 0 do pipeline de migration mode:
o walker que percorre o sistema de arquivos do projeto-alvo, extrai metadata de cada arquivo `.md`
e produz `discovery/inventory.json` sem jamais envolver LLM. Inclui exclusão de secrets, testes
com fixtures de diretório temporário, e o writer de audit log (`agents-log.json`) que todas as
fases LLM seguintes usarão para deixar evidência auditável de suas decisões.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| Dependência | O que usa |
|-------------|-----------|
| Plano 01 — fase-01 (`TemplateEntry.category`) | Plano 02 não consome diretamente, mas consolida a terminologia: `discovery.ts` opera *antes* dos slots canônicos (Fase 0 é pré-LLM) |
| Plano 01 — fase-02 (`migration-mode-detector.ts`) | `runDiscovery` só é chamado quando `detectInitMode` retorna `mode === 'migration'` |

### Produz para (outros planos que dependem deste)

| Plano | O que usa deste plano |
|-------|----------------------|
| Plano 03 | `discovery/inventory.json` como input do Explorer subagent; `audit-log.ts` para registrar saída do Explorer/Reconciler/Compound |
| Plano 04 | `AgentsLog` como evidência de execução para harness-validate; `run_id` do discovery para correlacionar plans gerados |
| Plano 05 | Fixtures criadas aqui como base para testes de idempotência (re-run preserva inventory shape) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | `fase-01-discovery-ts.md` | `skills/init/lib/discovery.ts` — walk + inventory.json + secret exclusion | ~1.5h | Plano 01 completo |
| 02 | `fase-02-discovery-tests-fixtures.md` | Testes para discovery.ts + 2 fixtures de repo-mock em `skills/init/__fixtures__/` | ~1.5h | fase-01 |
| 03 | `fase-03-audit-log.md` | `skills/init/lib/audit-log.ts` — writer de agents-log.json + integração com stub do orchestrator | ~1h | fase-01 |

---

## Grafo de Fases

```
fase-01 (discovery.ts — walk + inventory)
    │
    ├──────────────────────────┐
    ▼                          ▼
fase-02 (testes + fixtures)  fase-03 (audit-log.ts)
```

fase-02 e fase-03 são independentes entre si — ambas dependem apenas de fase-01.
Podem ser executadas em paralelo se desejado.

---

## TDD Strategy

Ciclo RED → GREEN por fase:
- **fase-01:** escreve `discovery.test.ts` básico com `import { runDiscovery }` antes de criar o módulo → RED (ModuleNotFoundError) → implementa → GREEN
- **fase-02:** expande os testes com fixtures de diretório temporário (greenfield e scattered-adrs) → RED por assertions → implementa fixtures → GREEN
- **fase-03:** escreve `audit-log.test.ts` verificando append de entry antes de criar o módulo → RED → implementa → GREEN

---

## Gotchas Conhecidos

**G1 — Heading extraction: ATX only, não setext:** O PRD pede `h1_h2_headings[]`. Usar regex `^#{1,2}\s+(.+)` (ATX: `# Title`, `## Section`), não setext (`===`, `---`). Documentação do plugin usa ATX exclusivamente.

**G2 — `first_500_chars` usa string slice, não buffer slice:** `content.slice(0, 500)` corta em boundary de caractere Unicode (correto para PT-BR com acentos). `Buffer.slice(0, 500)` pode cortar multibyte no meio — evitar.

**G3 — `discovery/` não existe no projeto-alvo:** `runDiscovery` deve criar `targetDir/discovery/` com `fs.mkdir({ recursive: true })` antes de escrever `inventory.json`. Não assumir que o diretório pré-existe.

**G4 — `.claude/**` pode ter subdiretórios profundos:** Walk recursivo cobre — o padrão do `collectNonHarnessDocsMd` de fase-02 do Plano 01 é reutilizável aqui com escopo ampliado.

**G5 — `mtime` deve ser ISO string, não epoch:** `stat.mtime.toISOString()` é o formato esperado pelos consumers do inventory. Não usar `stat.mtimeMs` (número).

**G6 — audit-log.json é gitignored no template:** O template `.gitignore.tpl` deve incluir `discovery/agents-log.json`. Verificar no plano de fixtures (Plano 05 fase-02) — mas a fase-03 deste plano documenta esse requisito.

<!-- Gerado por /plan-feature em 2026-05-14 -->
