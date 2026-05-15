# Plano 02: /init produz capabilities.json

**Feature:** Adaptive Coaching v6.3.0 ([PLAN overview](../PLAN.md))
**Fases:** 3
**Sizing total:** ~3.5h
**Depende de:** Plano 01 (Fundação Adaptativa)
**Desbloqueia:** Plano 03, Plano 04 (indiretamente — capabilities.json disponível para skills consumidoras)

---

## O que este plano entrega

Este plano adiciona a geração de `discovery/capabilities.json` ao fluxo do `/init`. Dois perfis arquiteturais são cobertos: `nextjs-app-router` (via regex determinístico em `app/**/route.ts`) e `mvc-flat` (via regex heurístico em `routes/**`, marcado como `source: "llm"` por ser não-determinístico entre frameworks). Um audit trail completo é registrado em `discovery/agents-log.json` via `AuditLogWriter` ao final da descoberta.

---

## Análise de Dependências

### Bloqueadores

Os seguintes artefatos do Plano 01 devem existir antes de iniciar qualquer fase deste plano:

| Artefato | Produzido por | Usado em |
|---|---|---|
| `skills/lib/stale-detector.ts` | Plano 01 fase-04 | fase-01: importado em `capabilities-writer.ts` para checksum de paths descobertos |
| `discovery/_schemas/capabilities-v1.schema.json` | Plano 01 fase-02 | fase-03: validação soft do output gerado |
| `discovery/` folder structure at runtime | Plano 01 fase-02 + `/init` runtime | fase-03: escrita de `capabilities.json` pressupõe pasta já existente |
| `skills/init/lib/audit-log.ts` (`AuditLogWriter`) | Plano 01 (base existente) | fase-03: append de audit entry |
| `skills/lib/read-architecture-profile.ts` | Plano 01 fase-01 | fase-03: leitura do profile detectado para dispatcher |

### Produz para

| Artefato | Consumidores esperados |
|---|---|
| `discovery/capabilities.json` (runtime) | Plano 03 (adaptive prompting), Plano 04 (coaching feedback), qualquer skill que precise de context de rotas do projeto |
| `skills/lib/capabilities-writer.ts` | `/init` SKILL.md (fase-03), testes de integração, skills consumidoras futuras |

---

## Mapa de Fases

| Fase | Título | Arquivos tocados | Sizing | Depende de |
|---|---|---|---|---|
| fase-01 | AST Parser — Next.js App Router | `capabilities-writer.ts` (criar), `capabilities-writer.test.ts` (criar) | ~1.5h | Plano 01 completo |
| fase-02 | LLM Fallback — MVC Flat | `capabilities-writer.ts` (modificar), `capabilities-writer.test.ts` (modificar) | ~1h | fase-01 ✓ |
| fase-03 | /init Integration + Audit | `skills/init/SKILL.md` (modificar), `capabilities-writer-integration.test.ts` (criar) | ~1h | fase-02 ✓ |

---

## Grafo de Fases

```
fase-01 (AST parser nextjs)
    │
    ▼
fase-02 (LLM fallback mvc-flat + dispatcher)
    │
    ▼
fase-03 (/init SKILL.md integration + audit entry)
```

Execução estritamente sequencial. Cada fase adiciona ao mesmo arquivo `capabilities-writer.ts`; não é seguro paralelizar.

---

## TDD Strategy

Tracer bullet: **fase-01**. A função `discoverNextjsAppRouterCapabilities` é o núcleo — tudo downstream depende dela estar correta.

Ciclo por fase:
1. Escrever testes primeiro (`bun test` falhando em vermelho)
2. Implementar até todos os testes passarem
3. Rodar `bun run lint` + `bun run typecheck` (se configurado)
4. Só então avançar para a próxima fase

Framework: `bun:test`. Sem mocks — usar `tmpdir` real com arquivos criados no `beforeEach`. Ver `fase-01` para exemplos concretos.

---

## Gotchas Conhecidos

**G1 — Sem biblioteca AST**
Não existe `ts-morph`, `typescript` compiler API, ou qualquer parser AST no `package.json`. Apenas `gray-matter`, `js-yaml` e bun types. Use regex puro. Nunca tente importar `ts-morph` — vai quebrar o build.

**G2 — discovery/ já existe**
A pasta `discovery/` é criada em runtime pelo `/init` e pela Plano 01 fase-02. Não recriar, não verificar existência antes de escrever — apenas fazer `writeFile` com path completo. O `/init` garante a pasta antes deste step.

**G3 — Schema já existe (Plano 01 fase-02)**
`discovery/_schemas/capabilities-v1.schema.json` é criado pelo Plano 01 fase-02. Em fase-03, apenas validar contra ele (soft-fail) — nunca criar, sobrescrever ou referenciar como se fosse criado aqui.

**G4 — Hybrid nextjs (pages + app router)**
Projetos Next.js podem ter tanto `pages/api/` quanto `app/api/`. Este plano cobre APENAS `app/**/route.ts`. Se `app/` existir mas não tiver route files, emitir `coverage_gaps`. Se `pages/api/` existir sem `app/`, o gap deve mencionar `app/api/** — parsing não coberto nesta versão`.

**G5 — AuditLogWriter: reusar, nunca recriar**
`AuditLogWriter` está em `skills/init/lib/audit-log.ts`. Importar diretamente. Verificar a assinatura do construtor antes de usar (pode exigir `run_id` do `inventory.json`). Nunca criar abstração paralela de audit.

**G6 — schema_version é string, não número**
O JSON schema em `capabilities-v1.schema.json` define `schema_version` como `type: "string"`. O valor correto é `"1.0"` (string). Passar `1.0` (number) fará a validação falhar em fase-03.

**G7 — mvc-flat: source "llm", confidence 0.7**
O fallback MVC usa regex heurístico — não é determinístico entre frameworks Express.js, Koa, Fastify, etc. Por isso `source: "llm"` (não-determinístico) e `confidence: 0.7`. Esse valor não é configurável neste plano (RF-CH-02 é Could Have para versão futura).

**G8 — stale-detector.ts de Plano 01 fase-04**
`stale-detector.ts` deve ser importado em `capabilities-writer.ts` para checksum dos paths descobertos. A função emite apenas warning — nunca lança exceção. Se Plano 01 fase-04 ainda não existir ao executar fase-01, criar stub temporário e remover antes do merge.
