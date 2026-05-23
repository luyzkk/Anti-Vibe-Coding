# Fase 03: Fixtures Cobrindo 3 Estados do Prove-It Mode

**Plano:** 02 — Prove-It Mode no tdd-verifier
**Sizing:** 0.5h
**Depende de:** fase-02 (secao `## Prove-It Mode` ja documentada em `agents/tdd-verifier.md` com convencao de campos)
**Visual:** false

---

## O que esta fase entrega

3 fixtures novos em `agents/__fixtures__/tdd-verifier/prove-it/` (subdiretorio NOVO — fixture root nao e tocado). Um diretorio por estado: `red-confirmed/`, `already-green/`, `inconclusive/`. Cada diretorio contem `input.json` (com `mode: "prove-it"` + codigo) e `expected-output.json` (envelope contract v1 com `payload.test_status` correspondente). Total: 6 arquivos JSON novos. Cumpre CA-03 (todos os 3 estados representados em fixtures) e CA-04 (already-green fixture explicitamente cobre o caso onde codigo ja passa).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `agents/__fixtures__/tdd-verifier/prove-it/red-confirmed/input.json` | Create | Input com bug-de-divisao-por-zero + `mode: "prove-it"` |
| `agents/__fixtures__/tdd-verifier/prove-it/red-confirmed/expected-output.json` | Create | Envelope contract v1, `payload.test_status: "red_confirmed"` |
| `agents/__fixtures__/tdd-verifier/prove-it/already-green/input.json` | Create | Input com codigo-ja-correto + `mode: "prove-it"` |
| `agents/__fixtures__/tdd-verifier/prove-it/already-green/expected-output.json` | Create | Envelope contract v1, `payload.test_status: "already_green"` |
| `agents/__fixtures__/tdd-verifier/prove-it/inconclusive/input.json` | Create | Input com bug-ambiguo + `mode: "prove-it"` |
| `agents/__fixtures__/tdd-verifier/prove-it/inconclusive/expected-output.json` | Create | Envelope contract v1, `payload.test_status: "inconclusive"` |
| `plugin-manifest.json` + `.claude-plugin/plugin.json` | Modify (regen) | Checksums regenerados via `node scripts/generate-manifest.js` se manifest tracker incluir fixtures (verificar) |

**Nao toca:** `agents/__fixtures__/tdd-verifier/input.json` e `agents/__fixtures__/tdd-verifier/expected-output.json` (fixture root pre-existente — G6 do README).

---

## Implementacao

### Passo 1: Criar subdiretorio `prove-it/`

```bash
mkdir -p agents/__fixtures__/tdd-verifier/prove-it/red-confirmed
mkdir -p agents/__fixtures__/tdd-verifier/prove-it/already-green
mkdir -p agents/__fixtures__/tdd-verifier/prove-it/inconclusive
```

### Passo 2: Fixture `red-confirmed/`

**`red-confirmed/input.json`:**

```json
{
  "mode": "prove-it",
  "files": [
    {
      "path": "src/utils/discount.ts",
      "content": "export function calcDiscount(amount: number, rate: number): number {\n  return amount / rate\n}"
    }
  ],
  "scope": "Provar RED para divisao por zero: invocar calcDiscount(0, 0.1) deveria lancar erro especifico (divisor cannot be zero), mas implementacao atual retorna NaN silenciosamente."
}
```

**`red-confirmed/expected-output.json`:**

```json
{
  "contract_version": "1.0",
  "agent": "tdd-verifier",
  "kind": "audit",
  "status": "complete",
  "reasoning": "Bug de divisao por zero em calcDiscount nao tem teste. Escrevi teste que invoca calcDiscount(0, 0.1) e espera erro especifico 'divisor cannot be zero'. Test runner reportou assertion failure como esperado — RED confirmado, codigo nao trata divisor zero (retorna NaN). Nao sugiro fix; ciclo seguinte do dev cobre GREEN.",
  "payload": {
    "domain_status": "red_confirmed",
    "issues": [],
    "test_status": "red_confirmed",
    "failing_test_snippet": "describe('calcDiscount', () => {\n  it('throws on divisor zero', () => {\n    expect(() => calcDiscount(0, 0.1)).toThrow('divisor cannot be zero')\n  })\n})",
    "failure_message": "FAIL src/utils/discount.test.ts > calcDiscount > throws on divisor zero\n  Expected function to throw 'divisor cannot be zero'\n  Received: TypeError: Cannot read property 'amount' of NaN"
  },
  "metadata": { "run_id": "prove-it-fixture-red", "duration_ms": 0, "model": "test" }
}
```

### Passo 3: Fixture `already-green/` (CA-04 — caso critico)

**`already-green/input.json`:**

```json
{
  "mode": "prove-it",
  "files": [
    {
      "path": "src/utils/phone.ts",
      "content": "export function formatPhone(input: string | null | undefined): string {\n  if (!input) return ''\n  return input.replace(/\\D/g, '')\n}"
    }
  ],
  "scope": "Provar RED para suposto bug em formatPhone(null) — bug-report alega que deveria lancar erro. Validar reproducao escrevendo teste que espera throw."
}
```

**`already-green/expected-output.json`:**

```json
{
  "contract_version": "1.0",
  "agent": "tdd-verifier",
  "kind": "audit",
  "status": "complete",
  "reasoning": "Teste escrito para reproduzir suposto bug em formatPhone(null) esperava throw. Mas formatPhone ja retorna string vazia em null gracefully (linha 2 — guarda condicional). Teste passou na primeira execucao. Guardrail already_green ativado — retornando test_status='already_green' com diagnostico de hipoteses, NAO red_confirmed (que seria RED falso). Dev decide se atualiza bug-report, escreve outro teste, ou descarta o report.",
  "payload": {
    "domain_status": "already_green",
    "issues": [],
    "test_status": "already_green",
    "failing_test_snippet": "describe('formatPhone', () => {\n  it('throws on null input', () => {\n    expect(() => formatPhone(null)).toThrow()\n  })\n})",
    "failure_message": "Test passed unexpectedly. formatPhone(null) returned '' (string vazia) em vez de lancar erro. Hipoteses: (1) bug ja foi corrigido sem teste de regressao; (2) bug-report descreveu sintoma errado — codigo nunca quebrou neste input; (3) escopo do bug nao reproduzido com null — testar undefined, {}, [], string vazia."
  },
  "metadata": { "run_id": "prove-it-fixture-green", "duration_ms": 0, "model": "test" }
}
```

### Passo 4: Fixture `inconclusive/`

**`inconclusive/input.json`:**

```json
{
  "mode": "prove-it",
  "files": [
    {
      "path": "src/db/parse-query.ts",
      "content": "import { sql } from 'drizzle-orm'\n\nexport function parseQuery(input: string) {\n  return sql.raw(input)\n}"
    }
  ],
  "scope": "Provar RED para suposto SQL injection em parseQuery — escrever teste que injeta string maliciosa e verificar se e sanitizada."
}
```

**`inconclusive/expected-output.json`:**

```json
{
  "contract_version": "1.0",
  "agent": "tdd-verifier",
  "kind": "audit",
  "status": "complete",
  "reasoning": "Tentei escrever teste para parseQuery mas o modulo importa drizzle-orm e a dependencia nao esta instalada no contexto de execucao. Test runner falha em load do modulo (Cannot find module). Nao consigo distinguir RED de problema de infra — codigo pode ou nao ter o bug, impossivel verificar sem rodar. Retornando inconclusive com diagnostico de setup; dev resolve dep antes de re-invocar.",
  "payload": {
    "domain_status": "inconclusive",
    "issues": [],
    "test_status": "inconclusive",
    "failure_message": "Cannot run test — module load failed: Cannot find module 'drizzle-orm' from src/db/parse-query.ts. Resolucao: rodar 'bun add drizzle-orm' OU validar que o path do import esta correto (alias tsconfig? caminho relativo?). Re-invocar prove-it apos resolver. NAO posso concluir red/green sem execucao real do teste."
  },
  "metadata": { "run_id": "prove-it-fixture-inconclusive", "duration_ms": 0, "model": "test" }
}
```

(Nota: campo `failing_test_snippet` OMITIDO neste caso — secao `## Prove-It Mode` em `tdd-verifier.md` define que e obrigatorio apenas para `red_confirmed`/`already_green`.)

### Passo 5: Validacao individual de cada fixture contra contract v1

Validar manualmente que cada `expected-output.json` satisfaz `agents/_contract/v1.schema.json` (`auditVariant`):

```bash
# Sanity check rapido — JSON valido?
for f in agents/__fixtures__/tdd-verifier/prove-it/*/expected-output.json; do
  node -e "JSON.parse(require('fs').readFileSync('$f', 'utf8'))" && echo "OK: $f"
done

# Verificacao de campos obrigatorios via grep:
grep -c '"contract_version": "1.0"' agents/__fixtures__/tdd-verifier/prove-it/*/expected-output.json  # esperado: 1 cada
grep -c '"kind": "audit"' agents/__fixtures__/tdd-verifier/prove-it/*/expected-output.json  # esperado: 1 cada
grep -c '"issues":' agents/__fixtures__/tdd-verifier/prove-it/*/expected-output.json  # esperado: 1 cada (obrigatorio em auditVariant)
grep -c '"test_status":' agents/__fixtures__/tdd-verifier/prove-it/*/expected-output.json  # esperado: 1 cada
```

### Passo 6: Validacao via `parseContract` (opcional — depende de teste novo)

O teste existente `skills/lib/subagent-contract.test.ts` (linha 181) itera FIXTURE_NAMES fixo — NAO descobre subdir `prove-it/` automaticamente. Decisao: adicionar teste novo neste mesmo arquivo OU validar manualmente.

**Opcao A — adicionar teste novo no `subagent-contract.test.ts` (preferido — automatiza):**

```typescript
// 2026-05-23 (Luiz/dev): fixtures prove-it — Plano 02 fase-03 CA-03/CA-04
const PROVE_IT_STATES = ['red-confirmed', 'already-green', 'inconclusive'] as const
for (const state of PROVE_IT_STATES) {
  test(`fixture tdd-verifier/prove-it/${state}: parseContract valida envelope v1`, () => {
    const fixturePath = resolve(
      import.meta.dir,
      `../../agents/__fixtures__/tdd-verifier/prove-it/${state}/expected-output.json`
    )
    const rawOutput = readFileSync(fixturePath, 'utf8')
    const result = parseContract(rawOutput)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })
}
```

Se Opcao A escolhida, registrar em MEMORY (DI) e adicionar o bloco logo apos o `for (const fixtureName of FIXTURE_NAMES)` existente (linha ~193). Releia o arquivo antes do Edit.

**Opcao B — validacao manual via REPL (mais rapido, sem teste novo):**

```bash
bun -e "
const { readFileSync } = require('fs');
const { parseContract } = require('./skills/lib/subagent-contract.ts');
for (const s of ['red-confirmed', 'already-green', 'inconclusive']) {
  const path = \`agents/__fixtures__/tdd-verifier/prove-it/\${s}/expected-output.json\`;
  const result = parseContract(readFileSync(path, 'utf8'));
  console.log(s, result.valid, result.errors);
}
"
```

Decisao recomendada: Opcao A (test code = regressao automatica em CI futuro). Registrar como DI no MEMORY.

### Passo 7: Regenerar manifest (se aplicavel)

Verificar se `scripts/generate-manifest.js` rastreia fixtures:

```bash
grep -E "__fixtures__|\.json" scripts/generate-manifest.js | head -10
```

Se sim, rodar:

```bash
node scripts/generate-manifest.js
```

Se nao (manifest so rastreia skills/agents `.md`), pular este passo e documentar em MEMORY que regeneracao nao foi necessaria. **Decisao default:** se grep nao retorna nada relevante a fixtures, Plano 04 fase-04 cobre regeneracao final apos todos os planos.

### Passo 8: Rodar suite completa

```bash
bun run agents:contract  # se Opcao A escolhida em Passo 6, agora valida os 3 novos fixtures
bun run harness:validate
bun run test
bun run typecheck
```

Esperado: tudo VERDE. Se quebrar, investigar:
- Fixture JSON invalido (JSON.parse falha) -> corrigir sintaxe
- parseContract retorna errors -> ajustar fixture para satisfazer schema (provavelmente `payload.issues` ausente ou tipo errado)
- harness reclama de fixture nao-listado -> verificar se harness tem allowlist de paths

### Passo 9: Atualizar `MEMORY.md` do Plano 02

Registrar:
- DI: Convencao final do `mode` no input (top-level)
- DI: Opcao A vs B do Passo 6 (qual foi escolhida e por que)
- DI: Manifest regenerado ou nao (Passo 7)
- Notas para Planos Seguintes: arquivos criados (6 fixtures + opcionalmente teste novo); Plano 04 fase-04 regenera manifest consolidado final

---

## Gotchas

- **G6 do plano:** Fixture root (`agents/__fixtures__/tdd-verifier/input.json` + `expected-output.json`) NAO e tocada. Apenas subdir `prove-it/` e criada. Teste `subagent-contract.test.ts` que itera FIXTURE_NAMES (linha 172) inclui `tdd-verifier` — continua validando o fixture root sem mudanca.
- **G7 do plano:** Cada `input.json` desta fase usa campo top-level `"mode": "prove-it"` (convencao decidida em fase-02). Inputs SEM `mode:` continuariam funcionando como auditoria padrao (backward-compat).
- **Local — `payload.issues` mandatory:** Schema v1 `auditVariant` (linha 65 do v1.schema.json) tem `required: ["issues"]`. TODOS os 3 expected-output.json incluem `"issues": []` mesmo em prove-it mode. Omissao quebra `parseContract`.
- **Local — `failing_test_snippet` apenas em red/green:** Fixture `inconclusive/expected-output.json` omite `failing_test_snippet` propositalmente — agente nao escreveu teste viavel. Consumidor do payload checa `test_status` antes de ler o campo.
- **Local — `reasoning` >= 20 chars:** Schema v1 exige `reasoning.minLength: 20`. Todos os 3 fixtures tem reasoning prosa de 100+ chars — sem risco.
- **Local — strings JSON com newlines:** `failing_test_snippet` usa `\n` literal dentro de string JSON (nao newline real). Validar via `JSON.parse` no Passo 5 captura erros de escape.
- **Local — execucao real vs fixture:** Estes fixtures sao para validar SHAPE do payload (contract test). NAO sao testes funcionais de "o agente realmente escreve teste falhando". Validacao funcional fica para uso real do agente em runtime — fora do escopo desta fase.

---

## Verificacao

### TDD

- [ ] **RED:** Antes da criacao, `ls agents/__fixtures__/tdd-verifier/prove-it/ 2>/dev/null` retorna vazio
- [ ] **GREEN:** Apos a criacao, `ls agents/__fixtures__/tdd-verifier/prove-it/` lista `red-confirmed/ already-green/ inconclusive/`
- [ ] **GREEN (Opcao A do Passo 6, se escolhida):** Antes de adicionar bloco no test, rodar `bun run agents:contract --grep "prove-it"` retorna `0 tests`; depois retorna `3 tests passed`

### Checklist

- [ ] 3 subdiretorios criados: `red-confirmed/`, `already-green/`, `inconclusive/`
- [ ] 6 arquivos JSON criados (2 por subdir)
- [ ] Cada `input.json` tem `"mode": "prove-it"` no top-level
- [ ] Cada `expected-output.json` tem `"contract_version": "1.0"`, `"agent": "tdd-verifier"`, `"kind": "audit"`, `"payload.issues"` (array)
- [ ] `red-confirmed/expected-output.json` tem `payload.test_status: "red_confirmed"` + `failing_test_snippet` + `failure_message`
- [ ] `already-green/expected-output.json` tem `payload.test_status: "already_green"` + `failing_test_snippet` + `failure_message` com diagnostico
- [ ] `inconclusive/expected-output.json` tem `payload.test_status: "inconclusive"` + `failure_message` (sem `failing_test_snippet`)
- [ ] Fixture root NAO tocada: `git diff agents/__fixtures__/tdd-verifier/input.json` vazio; `git diff agents/__fixtures__/tdd-verifier/expected-output.json` vazio
- [ ] Cada `expected-output.json` e JSON valido (JSON.parse nao throws)
- [ ] Cada `expected-output.json` passa `parseContract` (Opcao A ou B do Passo 6)
- [ ] `bun run agents:contract` verde
- [ ] `bun run harness:validate` verde
- [ ] `bun run test` verde
- [ ] `bun run typecheck` verde

---

## Criterio de Aceite

**Por maquina:**
- `[ -d agents/__fixtures__/tdd-verifier/prove-it/red-confirmed ] && [ -d agents/__fixtures__/tdd-verifier/prove-it/already-green ] && [ -d agents/__fixtures__/tdd-verifier/prove-it/inconclusive ] && echo OK` retorna `OK`
- `ls agents/__fixtures__/tdd-verifier/prove-it/*/*.json | wc -l` retorna `6`
- `grep -l '"mode": "prove-it"' agents/__fixtures__/tdd-verifier/prove-it/*/input.json | wc -l` retorna `3`
- `grep -l '"test_status": "red_confirmed"' agents/__fixtures__/tdd-verifier/prove-it/red-confirmed/expected-output.json` retorna o arquivo
- `grep -l '"test_status": "already_green"' agents/__fixtures__/tdd-verifier/prove-it/already-green/expected-output.json` retorna o arquivo
- `grep -l '"test_status": "inconclusive"' agents/__fixtures__/tdd-verifier/prove-it/inconclusive/expected-output.json` retorna o arquivo
- `git diff agents/__fixtures__/tdd-verifier/input.json` vazio
- `git diff agents/__fixtures__/tdd-verifier/expected-output.json` vazio
- `bun run agents:contract` exit code 0
- `bun run harness:validate` exit code 0
- `bun run test` exit code 0

**Por humano:**
- Ler os 3 pares de fixture como auditor externo: o cenario do input justifica o `test_status` do expected-output? O `failing_test_snippet` e codigo de teste plausivel (nao placeholder)? O `failure_message` em `already-green` tem diagnostico util (nao apenas "test passed")?

---

<!-- Gerado por /plan-feature em 2026-05-23 -->
