# Plano 05: Polish — Idempotência + Fixtures + AGENTS.md

**Feature:** /init Migration Mode ([PLAN overview](../PLAN.md))
**Fases:** 3
**Sizing total:** ~4h
**Depende de:** Plano 01 (category field + TemplateEntry type), Plano 04 (AntiVibeManifest com checksums, autoFlipIfComplete, harness-validate migration mode)
**Desbloqueia:** —  (último plano da feature; unblocks final merge)

---

## O que este plano entrega

Polish completo da feature /init Migration Mode: idempotência full re-run (preserva plans em
`active/`, skip por checksum, regenera `discovery/*`), fixtures completas de 5 repos-mock para
cobertura de testes regressivos, e extensão do template AGENTS.md para referenciar as 4 extensões
anti-vibe agrupadas dentro do limite de ≤40 linhas validado pelo harness.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| `AntiVibeManifest` type + `computeChecksum` + `readManifest` | Plano 04, fase-01 (`manifest-writer.ts`) | Bloqueador |
| `autoFlipIfComplete()` em `manifest-writer.ts` | Plano 04, fase-03 | Bloqueador |
| `harness-validate` migration mode (exit 0 com warnings) | Plano 04, fase-02 | Necessário para CI verde durante dev |
| `category: 'canon-andre' | 'anti-vibe-extension'` em `TemplateEntry` | Plano 01, fase-01 | Necessário para fixtures e idempotência |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `idempotency.ts` + full re-run logic | Feature completa — operadores do plugin |
| 5 fixtures completas em `__fixtures__/` | `discovery.ts` tests (Plano 02) + `migrate-orchestrator.ts` tests (Plano 03) + este plano |
| AGENTS.md.tpl com 4 extensões anti-vibe | Template scaffoldado em projetos dos usuários do plugin |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | `fase-01-idempotencia.md` | `idempotency.ts` — shouldSkipFile + regenerateDiscovery + integração SKILL.md | ~1.5h | Plano 04 completo |
| 02 | `fase-02-fixtures-completas.md` | `__fixtures__/` — 5 repos-mock com fixture-manifest.json | ~1.5h | fase-01 (usa idempotency em testes) |
| 03 | `fase-03-agents-md-extension.md` | AGENTS.md.tpl estendido + AGENTS_REQUIRED_LINKS atualizado | ~1h | fase-01 (conceptualmente; usa idempotência para validação CA-11) |

---

## Grafo de Fases

```
fase-01 (idempotency.ts)
    │
    ├───────────────────┐
    ▼                   ▼
fase-02 (fixtures)  fase-03 (AGENTS.md.tpl)
```

fase-02 e fase-03 são independentes entre si — ambas dependem apenas de fase-01.
Podem ser executadas em paralelo se desejado, mas fase-02 é maior (~1.5h) e deve
começar primeiro para não bloquear CI.

---

## TDD Strategy

Ciclo RED → GREEN por fase:

- **fase-01:** escreve `idempotency.test.ts` com `import { shouldSkipFile, regenerateDiscovery }` antes
  de criar o módulo → RED (ModuleNotFoundError) → implementa → GREEN. Testa os três caminhos:
  arquivo não no manifest (skip: false), checksum igual (skip: false), checksum diferente
  (skip: true, reason: 'checksum-mismatch'), plan em `active/` (skip: true, reason: 'plan-preserved').

- **fase-02:** cada fixture tem `fixture-manifest.json`. O teste de integração carrega o manifest,
  chama `detectMigrationMode(fixtureDir)` e verifica `expected_mode`. RED primeiro (fixture não
  existe) → cria fixture → GREEN. Confirma que `shouldSkipFile` retorna 'plan-preserved' para
  qualquer arquivo dentro de `docs/exec-plans/active/`.

- **fase-03:** escreve teste que conta linhas de `AGENTS.md.tpl` e verifica presença dos 4 links
  anti-vibe. RED se template ainda não foi modificado → modifica template → GREEN. Duplica a
  validação do harness (`AGENTS_MAX_LINES = 40`) em escopo de teste de unidade isolado.

Estratégia global: testes usam `fs.mkdtemp` (temp dirs) para isolamento. Fixtures são read-only
(repos-mock de entrada), nunca modificadas pelos testes.

---

## Gotchas Conhecidos

**G1 — Plans em `active/` são SEMPRE preservados, sem checar checksum:** O loop de idempotência
em `shouldSkipFile` detecta paths que começam com `docs/exec-plans/active/` e retorna
`{ skip: true, reason: 'plan-preserved' }` sem ler o arquivo. Isso evita um erro de lógica comum:
um plan recém-gerado que coincidentemente tem o mesmo checksum que uma versão editada pelo humano.
Preservação de plans é uma garantia de negócio, não uma otimização de I/O.

**G2 — `regenerateDiscovery` deleta, não trunca:** Usa `fs.unlink` em ambos os arquivos
(`discovery/inventory.json` e `discovery/semantic-inventory.json`) e ignora erros ENOENT.
Não usa `fs.writeFile('')` (trunca mas mantém checksum 0-byte no manifest anterior).

**G3 — `shouldSkipFile` é síncrona (computeChecksum é async):** A assinatura exposta no plano
usa tipos síncronos, mas internamente a função é `async`. O executor deve exportá-la como
`async function shouldSkipFile(...)` e ajustar os testes para usar `await`.

**G4 — Fixture `dogfood-anti-vibe-plugin` não copia arquivos reais do repo:** O fixture é uma
snapshot estática de estrutura de pastas com conteúdo sintético (não o conteúdo atual do repo).
Isso garante testes determinísticos independentemente do estado do repo real.

**G5 — AGENTS.md.tpl: contar linhas inclui a linha em branco final:** O arquivo atual termina
em linha 30 (linha 29 com conteúdo + 1 linha vazia de EOF). A extensão deve manter essa convenção.
O harness usa `content.split('\n').length` — linha vazia de EOF conta como linha. Verificar
contagem exata após modificar o template.

**G6 — `AGENTS_REQUIRED_LINKS` no harness é array `as const`:** Ao adicionar os 4 novos links,
manter o formato de string exato (inclui o texto âncora). Qualquer diferença de espaço ou
capitalização causa falso negativo no `content.includes(link)` check.

<!-- Gerado por /plan-feature em 2026-05-14 -->
