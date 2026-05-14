<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 04: Fixtures Regression em CI

**Plano:** 05 — Validacao Final + Harness + Unlock /init
**Sizing:** 1h
**Depende de:** fase-01 (CI ja vai validar contratos via `harness:validate` extendido); externamente Plano 03 fase-05 (13 fixtures commitadas)
**Visual:** false

---

## O que esta fase entrega

`.github/workflows/harness.yml` (ou novo workflow dedicado) roda `bun test agents:contract` apos `bun run harness:validate` + script `agents:contract` adicionado ao `package.json` mapeando para `bun test tests/agents-contract/`. 13 fixtures do Plano 03 fase-05 verdes em CI. Cumpre **CA-07** end-to-end (CA-07 ja exigia 13 fixtures verdes; aqui amarra ao CI).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `package.json` | Modify | adicionar script `"agents:contract": "bun test tests/agents-contract/"` |
| `.github/workflows/harness.yml` | Modify | adicionar step `- run: bun run agents:contract` apos `bun run compound:check` |
| `tests/agents-contract/` | Verify | pasta com runner que itera `agents/__fixtures__/*/` — possivelmente ja criada no Plano 03 fase-05; esta fase apenas amarra ao CI |

---

## Implementacao

### Passo 1: Verificar estrutura existente

```bash
ls -la tests/agents-contract/ 2>/dev/null
ls agents/__fixtures__/
# Esperado (do Plano 03 fase-05): 13 pastas, cada uma com input.json + expected-output.json
```

Se `tests/agents-contract/` nao existe (Plano 03 deixou suite em outro nome — ex: `tests/agent-fixtures.test.ts`), ajustar comando de teste no script abaixo para apontar onde realmente esta. **Nao recriar suite** — Plano 03 fase-05 ja entregou.

### Passo 2: Adicionar script em package.json

```json
{
  "scripts": {
    "test": "bun run scripts/run-tests.ts",
    "typecheck": "tsc --noEmit",
    "test:e2e": "bun test tests/e2e/",
    "test:tracer": "bun test tests/e2e/init-tracer-bullet.test.ts",
    "harness:validate": "bun scripts/harness-validate.ts .",
    "compound:check": "bun scripts/compound-check.ts .",
    "new-plan": "bun run scripts/new-plan.ts",
    "state:regenerate": "bun run skills/lib/state-md-generator.ts $PWD",
    "prepare": "husky",
    "agents:contract": "bun test tests/agents-contract/"
  }
}
```

Confirmar nome real do diretorio de testes; ajustar se diferente.

### Passo 3: Estender .github/workflows/harness.yml

Edicao via `Edit`:

```yaml
name: Harness Validation

on:
  push:
    branches: [main]
  pull_request:

jobs:
  validate:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4
      - uses: oven-sh/setup-bun@f4d14e03ff726c06358e5557344e1da148b56cf7 # v1
      - run: bun install
      - run: bun run harness:validate
      - run: bun run compound:check
      - run: bun run agents:contract  # 2026-05-14 (Luiz/dev): CA-07 — 13 fixtures contrato v1
```

### Passo 4: Rodar local antes de push

```bash
bun run agents:contract
# Esperado: 13 passed, 0 failed
```

Se falhar:
- Causa A: fixture nova ainda nao foi commitada ou input/expected-output divergem do prompt atualizado (regressao no Plano 03 fase-05)
- Causa B: validator do Plano 01 fase-04 mudou criterio entre Plano 03 fase-05 e agora (improvavel mas possivel — regressar para o helper)
- Causa C: script aponta para diretorio errado — ajustar `agents:contract` em package.json

### Passo 5: Push e ver CI verde

```bash
git add package.json .github/workflows/harness.yml
git commit -m "ci(agents): add agents:contract step to harness workflow (CA-07)"
git push
# Aguardar workflow no GitHub. Step "Run bun run agents:contract" deve passar.
```

---

## Gotchas

- **G-P05-01 corolario:** `agents:contract` roda apos `harness:validate` no workflow. Se algum agent regredir prompt (perdeu `contract_version`), `harness:validate` ja falha **antes** de chegar aqui — fail-fast. Ordem dos steps no YAML importa.
- **G1 do Plano 01 (LLM emite JSON malformado):** As fixtures comitadas sao **snapshots determinos** (input.json + expected-output.json fixos). Nao envolvem LLM em runtime. Se Plano 04 introduziu helper de parse tolerante e isso mudou a saida normalizada, snapshots podem divergir. Resolucao: aceitar regenerar fixtures (commando especifico do Plano 03 fase-05, se houver) e re-commit.
- **G-P05-06 (gate pre-merge):** Esta fase **e** parte do gate pre-merge. CI verde aqui = sinal verde para fase-05 cravar tag. Se falhar, fase-05 espera.
- **Local:** Workflow ja roda em `push: branches: [main]` + `pull_request`. Como estamos em branch isolada, o push do PR vai disparar via `pull_request` — confirmar PR aberto contra `main`.
- **Local:** **NAO criar workflow novo separado** (`agents-contract.yml`). Reusar `harness.yml` mantem 1 entrada de status no PR, fail-fast, e menos manutencao. Workflows separados sao justificaveis quando rodam em triggers/branches/runners distintos — nao e o caso aqui.

---

## Verificacao

### TDD

- [ ] **RED:** Antes desta fase, CI nao roda agents:contract
  - Comando: ver step list em `.github/workflows/harness.yml`
  - Resultado esperado: 4 steps (checkout, setup-bun, install, harness:validate, compound:check) — sem agents:contract

- [ ] **GREEN:** Apos esta fase, CI tem step novo + passa
  - Comando: rodar workflow no PR + ver logs
  - Resultado esperado: step "Run bun run agents:contract" exit 0, fixtures 13/13 passed

### Checklist

- [ ] Script `agents:contract` em `package.json`
- [ ] Step `bun run agents:contract` adicionado em `harness.yml` apos `compound:check`
- [ ] Local: `bun run agents:contract` => 13 passed
- [ ] CI: workflow verde no PR atual (ou commit em branch)
- [ ] Adicionar fixture nova de teste (ex: copia de outra com 1 campo invalido) faz CI falhar — sanity check de que pipeline esta vivo
- [ ] Reverter teste de quebra acima, CI verde de novo
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`

---

## Criterio de Aceite

**Por maquina:**
- `bun run agents:contract` local => `13 passed, 0 failed`
- CI step "Run bun run agents:contract" presente no workflow log e exit 0
- `cat package.json | jq '.scripts."agents:contract"'` retorna string nao-nula

**Por humano:**
- No GitHub PR, status check "Harness Validation" cobre os 3 gates (validate + compound + agents:contract) e todos verdes

---

<!-- Gerado por /plan-feature subagente em 2026-05-14 -->
