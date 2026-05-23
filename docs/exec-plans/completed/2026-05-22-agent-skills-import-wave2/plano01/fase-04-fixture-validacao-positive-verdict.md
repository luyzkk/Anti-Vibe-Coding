<!--
Princípio universal #5 — Comment Provenance.
Comentários inline em código devem ter linhagem: autor + papel + data + razão.
Exemplo: `// 2026-05-22 (Luiz/dev): regex blacklist tautologia — PRD DC-5 / fase-04`
-->

# Fase 04: Fixture + Validador Anti-Generico de `positive_observations` (CA-02)

**Plano:** 01 — Tracer Bullet Schema v2.0.0 + Gold Standard
**Sizing:** 0.5h (XS)
**Depende de:** fase-03 (gold standard existe — fixture valida contra ele)
**Visual:** false

---

## O que esta fase entrega

Fixture + validador TS que enforce os 4 testes anti-generico do PRD (DC-5) sobre `positive_observations[i]`: rejeita tautologias via regex blacklist, exige citacao de arquivo/simbolo, e e invocavel em batch para validar os 12 agentes que o Plano 02 vai refinar.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `f:/Projetos/Anti-Vibe-Coding/agents/_contract/positive-observations-validator.ts` | Create | Validator com regex blacklist + heuristica de citacao |
| `f:/Projetos/Anti-Vibe-Coding/agents/_contract/positive-observations-validator.test.ts` | Create | Testes RED/GREEN dos 4 testes anti-generico + casos VALIDOS/INVALIDOS |
| `f:/Projetos/Anti-Vibe-Coding/agents/_contract/__fixtures__/positive-observations.fixture.ts` | Create | Fixture com lista de casos VALIDOS e INVALIDOS rotulados |

> Caminho final pode mudar baseado na convencao descoberta em `ls agents/_contract/` (fase-01 ou inspecao direta). Se a convencao for `lib/_contract/` ou outro, ajustar — registrar como DI no MEMORY. Os exemplos abaixo assumem `agents/_contract/` (confirmado por `ls agents/` na geracao deste plano).

---

## Implementacao

### Passo 1: Inspecionar convencao existente

```bash
ls f:/Projetos/Anti-Vibe-Coding/agents/_contract/
ls f:/Projetos/Anti-Vibe-Coding/agents/__fixtures__/
```

Decidir:
- Se ja existe `subagent-contract-validator.ts` ou similar — ESTENDER em vez de criar do zero.
- Se ja existe convencao de fixtures (`.fixture.ts` vs `__fixtures__/`) — seguir.
- Se nao existe nenhum validator — criar conforme exemplo abaixo.

Registrar a decisao como **DI** no `MEMORY.md` do plano: caminho canonico do validator e convencao usada.

### Passo 2: Escrever testes primeiro (RED)

Criar `positive-observations-validator.test.ts` com os 4 testes anti-generico + smoke tests:

```typescript
// 2026-05-22 (Luiz/dev): testes anti-generico — PRD DC-5 / Wave 2 Plano 01 fase-04
import { describe, expect, test } from 'bun:test'
import { validatePositiveObservation } from './positive-observations-validator'

describe('validatePositiveObservation — testes anti-generico (DC-5)', () => {
  describe('rejeita tautologias (regex blacklist)', () => {
    const tautologias = [
      'no issues found',
      'looks fine',
      'everything is ok',
      'tudo certo',
      'codigo limpo',
      'tudo ok',
      'No Issues Found.',
      'Looks fine to me',
      'Everything is fine',
    ]
    test.each(tautologias)('rejeita "%s"', (input) => {
      const result = validatePositiveObservation(input)
      expect(result.valid).toBe(false)
      expect(result.reason).toMatch(/tautologia|generic/i)
    })
  })

  describe('aceita observacoes com citacao de arquivo:linha', () => {
    const validas = [
      'src/auth/middleware.ts:42 usa bcrypt com saltRounds=12',
      'src/api/users/route.ts:88 valida payload com zod antes de tocar DB',
      'lib/jwt.ts:15 verifica assinatura JWT (nao apenas decode)',
      'scripts/build.py:120 escapa input antes do shell subprocess',
    ]
    test.each(validas)('aceita "%s"', (input) => {
      const result = validatePositiveObservation(input)
      expect(result.valid).toBe(true)
    })
  })

  describe('aceita observacoes com citacao de simbolo/funcao', () => {
    const validas = [
      'A funcao `hashPassword` em auth.ts usa bcrypt com saltRounds=12 (acima do minimo OWASP)',
      'O middleware `requireAdmin` valida role antes de cada rota /api/admin',
      'Class `JwtVerifier` rejeita tokens com alg=none corretamente',
    ]
    test.each(validas)('aceita "%s"', (input) => {
      const result = validatePositiveObservation(input)
      expect(result.valid).toBe(true)
    })
  })

  describe('rejeita strings vazias ou banais', () => {
    test('rejeita string vazia', () => {
      expect(validatePositiveObservation('').valid).toBe(false)
    })
    test('rejeita string curta sem citacao', () => {
      expect(validatePositiveObservation('ok').valid).toBe(false)
    })
    test('rejeita afirmacao generica sem citacao', () => {
      expect(validatePositiveObservation('a aplicacao parece segura').valid).toBe(false)
    })
  })
})

describe('validatePositiveObservations (array) — enforce length >= 1', () => {
  test('rejeita array vazio', () => {
    const { validatePositiveObservations } = require('./positive-observations-validator')
    const result = validatePositiveObservations([])
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/length|empty|>=\s*1/i)
  })
  test('rejeita array com 1 item invalido', () => {
    const { validatePositiveObservations } = require('./positive-observations-validator')
    const result = validatePositiveObservations(['no issues found'])
    expect(result.valid).toBe(false)
  })
  test('aceita array com >= 1 item valido', () => {
    const { validatePositiveObservations } = require('./positive-observations-validator')
    const result = validatePositiveObservations([
      'src/auth/middleware.ts:42 usa bcrypt com saltRounds=12',
    ])
    expect(result.valid).toBe(true)
  })
})
```

### Passo 3: Implementar validator (GREEN)

```typescript
// 2026-05-22 (Luiz/dev): validator de positive_observations — PRD DC-5 / Wave 2 Plano 01 fase-04
// Enforce dos 4 testes anti-generico:
// 1. Cita arquivo especifico (regex de path com extensao + opcional :linha)
// 2. Nao e tautologia (regex blacklist)
// 3. Verificavel por terceiro (cita arquivo OU simbolo identificavel)
// 4. Nao-banal (length minima + nao reduzivel a tautologia)

export type ValidationResult =
  | { valid: true }
  | { valid: false; reason: string }

const TAUTOLOGY_BLACKLIST: RegExp[] = [
  /\bno issues?\s+(found|present|detected)?\b/i,
  /\blooks\s+(fine|good|ok)\b/i,
  /\beverything\s+(is\s+)?(fine|ok|good)\b/i,
  /\btudo\s+(certo|ok|bem)\b/i,
  /\bcodigo\s+(limpo|ok|bom)\b/i,
  /\bsem\s+(problemas?|issues?)\b/i,
  /^\s*ok\.?\s*$/i,
  /^\s*(parece|seems?)\s+(bem|ok|fine|good|seguro)\b/i,
]

// Regex que detecta citacao de arquivo:linha (com extensoes comuns)
// Aceita src/foo/bar.ts:42, lib/auth.py:120, scripts/build.go:7, etc.
const FILE_PATH_REGEX = /(\.(ts|tsx|js|jsx|py|go|rs|java|sql|rb|php|cs|kt|swift|c|cpp|h|hpp)):?\d*/

// Regex que detecta citacao de simbolo (backticks ou nome com camelCase/PascalCase)
const SYMBOL_REGEX = /(`[a-zA-Z_$][\w$]*`|class\s+[A-Z]\w+|function\s+[a-zA-Z_$][\w$]*|middleware\s+`[\w$]+`|\b[a-z][a-zA-Z0-9]+[A-Z]\w+\b)/

const MIN_LENGTH = 15 // observacoes uteis tem pelo menos 15 chars

export function validatePositiveObservation(text: string): ValidationResult {
  if (typeof text !== 'string') {
    return { valid: false, reason: 'positive_observation deve ser string' }
  }
  const trimmed = text.trim()
  if (trimmed.length === 0) {
    return { valid: false, reason: 'positive_observation vazia' }
  }
  if (trimmed.length < MIN_LENGTH) {
    return { valid: false, reason: `positive_observation curta demais (<${MIN_LENGTH} chars) — provavelmente generica` }
  }

  for (const pattern of TAUTOLOGY_BLACKLIST) {
    if (pattern.test(trimmed)) {
      return { valid: false, reason: `tautologia detectada (regex: ${pattern})` }
    }
  }

  const hasFileRef = FILE_PATH_REGEX.test(trimmed)
  const hasSymbolRef = SYMBOL_REGEX.test(trimmed)
  if (!hasFileRef && !hasSymbolRef) {
    return {
      valid: false,
      reason: 'positive_observation generica — sem citacao de arquivo (com extensao) nem simbolo identificavel',
    }
  }

  return { valid: true }
}

export function validatePositiveObservations(items: unknown): ValidationResult {
  if (!Array.isArray(items)) {
    return { valid: false, reason: 'positive_observations deve ser array' }
  }
  if (items.length < 1) {
    return { valid: false, reason: 'positive_observations deve ter length >= 1 (DT-7 do PRD)' }
  }
  for (let i = 0; i < items.length; i++) {
    const result = validatePositiveObservation(items[i] as string)
    if (!result.valid) {
      return { valid: false, reason: `positive_observations[${i}] invalido: ${result.reason}` }
    }
  }
  return { valid: true }
}
```

### Passo 4: Criar fixture com casos rotulados

```typescript
// 2026-05-22 (Luiz/dev): fixture de positive_observations — PRD DC-5 / Wave 2 Plano 01 fase-04
// Casos VALIDOS e INVALIDOS para uso em testes e como referencia humana

export const POSITIVE_OBSERVATIONS_FIXTURE = {
  valid: [
    'src/auth/middleware.ts:42 usa bcrypt com saltRounds=12 (acima do minimo OWASP)',
    'src/api/users/route.ts:88 valida payload com zod antes de tocar DB',
    'lib/jwt.ts:15 verifica assinatura JWT (nao apenas decode)',
    'A funcao `hashPassword` em auth.ts:120 usa bcrypt — implementacao correta',
    'O middleware `requireAdmin` em src/middleware/admin.ts:23 valida role antes de cada rota /api/admin',
    'Class `JwtVerifier` em lib/security/jwt.ts:5 rejeita tokens com alg=none corretamente',
  ] as const,
  invalid: [
    { input: '', reason: 'vazia' },
    { input: 'ok', reason: 'curta demais' },
    { input: 'no issues found', reason: 'tautologia blacklist' },
    { input: 'looks fine', reason: 'tautologia blacklist' },
    { input: 'tudo certo', reason: 'tautologia blacklist (pt-BR)' },
    { input: 'codigo limpo', reason: 'tautologia blacklist (pt-BR)' },
    { input: 'a aplicacao parece segura', reason: 'sem citacao de arquivo ou simbolo' },
    { input: 'auth e implementado corretamente', reason: 'sem citacao de arquivo ou simbolo' },
    { input: 'everything is fine', reason: 'tautologia blacklist' },
  ] as const,
} as const
```

### Passo 5: Documentar uso em batch para Plano 02

Adicionar bloco no `MEMORY.md` do plano (secao "Notas para Planos Seguintes"):

```markdown
- **Validator localizado em:** `f:/Projetos/Anti-Vibe-Coding/agents/_contract/positive-observations-validator.ts`
- **API:** `validatePositiveObservations(items: unknown): ValidationResult`
- **Uso em Plano 02 (validacao batch dos 12 agentes):**
  ```ts
  import { validatePositiveObservations } from 'agents/_contract/positive-observations-validator'
  for (const agentPath of agentFiles) {
    // 1. Localizar bloco JSON de exemplo no .md do agente
    // 2. Extrair positive_observations[]
    // 3. validatePositiveObservations(observations)
    // 4. Reportar agentes com observacoes invalidas (rejeitar antes de merge)
  }
  ```
- **Fixture e arquivo de referencia humana:** `f:/Projetos/Anti-Vibe-Coding/agents/_contract/__fixtures__/positive-observations.fixture.ts`
```

### Passo 6: Smoke run e verificar harness

```bash
bun run test -- agents/_contract/positive-observations-validator.test.ts
# Esperado: todos os testes verdes

bun run harness:validate
# Esperado: validacao do plugin passa

bun run lint
# Esperado: zero erros
```

---

## Gotchas

- **G4 do plano:** `positive_observations` precisa ter `length >= 1` MESMO em auditoria limpa. Se um agente nao consegue gerar 1 observacao especifica, suspeitar de "auditoria fake" — o agente deve verbalizar pelo menos o que verificou.
- **G5 do plano:** Os 4 testes anti-generico do PRD (DC-5):
  1. Cita arquivo especifico — coberto por `FILE_PATH_REGEX`.
  2. Nao e tautologia — coberto por `TAUTOLOGY_BLACKLIST`.
  3. Verificavel por terceiro — coberto por OR de file/symbol regex.
  4. Nao-banal — coberto por `MIN_LENGTH` (15 chars) + blacklist.
- **Local:** Regex de simbolo (`SYMBOL_REGEX`) pode dar falso-positivo para strings com camelCase generico (ex: `"someThing aconteceu"`). Aceitavel — preferimos falso-positivo (passa observacao fraca) a falso-negativo (rejeita observacao boa). Reviews humanos pegam o resto.
- **Local:** `agents/_contract/` pode nao ter `tsconfig` proprio. Verificar que o validator e importavel do harness root antes de declarar GREEN. Se nao for, ajustar `tsconfig.json` includes.
- **Local:** Bun resolve `require('./positive-observations-validator')` mas pode preferir `import`. Usar `await import(...)` se require quebrar nos testes.

---

## Verificacao

### TDD

- [ ] **RED:** Escrever os testes (Passo 2) ANTES de implementar o validator. Rodar `bun run test agents/_contract/positive-observations-validator.test.ts`.
  - Resultado esperado: falha com `Cannot find module './positive-observations-validator'` ou erros de import — assertion failure ainda nao acontece porque o arquivo nao existe. Confirmar que o teste FOI ESCRITO e que `bun` tenta executa-lo.

- [ ] **GREEN:** Implementar `positive-observations-validator.ts` (Passo 3). Rodar testes novamente.
  - Resultado esperado: `N passed, 0 failed` para todos os blocos `describe`.

- [ ] **REFACTOR:** Avaliar simplificacoes. Possivel ponto: extrair regex blacklist para `const` exportada (reutilizavel em outros validators).

- [ ] **VERIFY:** `bun run test && bun run lint && bun run harness:validate` — tudo verde.

### Checklist

- [ ] Convencao de caminho confirmada via `ls agents/_contract/` antes de criar arquivos
- [ ] Validator implementa as 4 verificacoes (cita arquivo, nao-tautologia, verificavel, nao-banal)
- [ ] Validator de array enforce `length >= 1`
- [ ] Fixture lista >= 6 casos VALIDOS e >= 8 casos INVALIDOS com motivo
- [ ] Testes cobrem cada item da fixture (test.each)
- [ ] Testes verdes localmente: `bun run test agents/_contract/`
- [ ] `bun run lint` verde
- [ ] `bun run harness:validate` verde
- [ ] `MEMORY.md` do plano atualizado com caminho canonico do validator + uso para Plano 02
- [ ] Validator NAO importa nada fora do escopo do plugin (sem dep externa)

---

## Criterio de Aceite

**Por maquina (todos devem passar):**
- `test -f f:/Projetos/Anti-Vibe-Coding/agents/_contract/positive-observations-validator.ts && echo OK`
- `test -f f:/Projetos/Anti-Vibe-Coding/agents/_contract/positive-observations-validator.test.ts && echo OK`
- `test -f f:/Projetos/Anti-Vibe-Coding/agents/_contract/__fixtures__/positive-observations.fixture.ts && echo OK`
- `bun run test agents/_contract/positive-observations-validator.test.ts` exit code 0
- Validator rejeita `"no issues found"`: `bun -e "import {validatePositiveObservation} from './agents/_contract/positive-observations-validator'; console.log(validatePositiveObservation('no issues found').valid)"` retorna `false`
- Validator aceita `"src/auth/middleware.ts:42 usa bcrypt com saltRounds=12"`: mesma chamada com este input retorna `true`
- `bun run harness:validate` exit code 0
- `bun run test` (suite completa) exit code 0
- `bun run lint` exit code 0

**Por humano:**
- Fixture e legivel — qualquer reviewer entende por que cada caso e VALIDO/INVALIDO sem rodar codigo
- API do validator e clara (nome da funcao + tipo de retorno autoexplicativos)

---

<!-- Gerado por /plan-feature em 2026-05-22 -->
