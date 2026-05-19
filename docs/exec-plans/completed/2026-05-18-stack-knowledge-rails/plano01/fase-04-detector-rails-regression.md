<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado nesta fase deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou seção do PRD).
Exemplo: `// 2026-05-18 (Luiz/dev): regression test detector Rails — alinhado com D10 + RF3 + CA-03 + CA-06`
-->

# Fase 04: Regression test do detector Rails (fallback Sinatra + Rails legado) — sobre contrato multi-stack D22

**Plano:** 01 — Tracer Bullet
**Sizing:** 1h
**Depende de:** fase-03 (contrato multi-stack `{ primary, secondary, signalSource, anchorFiles }` ja refatorado)
**Visual:** false

---

## O que esta fase entrega

Regression test sobre o detector Rails (regex `/^\s*gem\s+["']rails["']/m` em `skills/init/lib/detect-stack.ts:72`) cobrindo: (a) **fallback Sinatra** — Gemfile sem `gem 'rails'` retorna `unknown`; telemetria ainda emite `anchor_files: ['Gemfile']` para visibilidade (CA-06); (b) **Rails legado** — Gemfile com `gem 'rails', '~> 7.0'` ainda classifica como rails (CA-04 piloto — warning de versão fica em Plano 03 fase-09). RF3 + CA-03 + CA-06 do PRD. **Nenhum código novo no `detect-stack.ts`** — apenas valida o comportamento existente via test.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/detect-stack.test.ts` | Modify | Adicionar os casos faltantes para regex Rails (fallback Sinatra, Rails legado, variações de aspas) |
| `skills/init/lib/detect-stack.ts` | Read-only | Confirmar que regex `/^\s*gem\s+["']rails["']/m` está em linha 72 (G1 do plano) — NÃO modificar |

---

## Implementacao

### Passo 1: confirmar estado atual do `detect-stack.test.ts`

Antes de adicionar test cases, `Read` o arquivo para identificar o que já está coberto e o que falta. Casos atuais conhecidos (auditoria do file em 2026-05-18):

| Test case existente | Cobre | Falta |
|---|---|---|
| `CA-08: detects rails from Gemfile` | Gemfile com `gem "rails", "~> 7.1"` → `id: 'rails'` | — (happy path coberto) |
| `G6: monorepo with both package.json{next} and Gemfile picks nextjs` | Tie-break com Next.js | — (cross-stack precedence coberto) |
| `CA-21: returns unknown when no signal present` | Sem arquivos → `unknown` | — (vazio coberto) |

**O que falta cobrir (Plano01 fase-03 adiciona):**

1. **Fallback Sinatra (CA-03 + CA-06):** Gemfile presente mas sem `gem 'rails'` → `unknown` E `signalSource` deve continuar registrando o Gemfile encontrado para que telemetria emita `anchor_files: ['Gemfile']` (CA-06).
2. **Rails legado (CA-04 piloto):** Gemfile com `gem 'rails', '~> 7.0'` ainda classifica como `rails` — comportamento confirma que a regex não filtra versão; warning de versão fica para Plano 03 fase-09 (RF11), aqui apenas valida que detector NÃO falha.
3. **Variações de aspas (robustez D10):** Gemfile com `gem 'rails'` (single quote) e `gem "rails"` (double quote) ambos devem classificar como rails — regex é genérica mas test torna explícito.
4. **Whitespace before `gem`:** Gemfile com `  gem 'rails'` indentado (válido em Ruby) deve classificar — regex usa `\s*` no início.
5. **`gem 'railsx'` (substring) NÃO deve matchear:** regex exige aspas fechando — confirmar via test que `gem 'railsx'` ou `gem 'rails-something'` NÃO bate (zero falso-positivo).

### Passo 2 (RED): escrever os test cases novos

```typescript
// Adicionar no final de skills/init/lib/detect-stack.test.ts dentro do mesmo describe('detectStack', ...):

  // 2026-05-18 (Luiz/dev): Plano01 fase-03 — fallback Sinatra/Hanami/Roda — alinhado com CA-03 + CA-06 + D10
  it('CA-03: Gemfile sem gem rails retorna unknown (Sinatra/Hanami/Roda fallback)', async () => {
    await fs.writeFile(
      path.join(FIXTURE, 'Gemfile'),
      "source 'https://rubygems.org'\ngem 'sinatra', '~> 3.0'\ngem 'puma'\n",
      'utf8'
    )
    const result = await detectStack(FIXTURE)
    expect(result.primary).toBeNull()
  })

  // 2026-05-18 (Luiz/dev): CA-06 — telemetria visibility mesmo no fallback
  // detectStack retorna signalSource='no signal' para unknown, mas a infra de telemetria upstream
  // (detect-multi-stack + emit-stack-knowledge-events) registra anchor_files com base em arquivos encontrados.
  // Aqui validamos apenas que detectStack NÃO crashea e retorna unknown — telemetria cobre integration test em Plano03.
  it('CA-06: Gemfile vazio sem gem rails ainda retorna unknown sem crash', async () => {
    await fs.writeFile(path.join(FIXTURE, 'Gemfile'), '', 'utf8')
    const result = await detectStack(FIXTURE)
    expect(result.primary).toBeNull()
  })

  // 2026-05-18 (Luiz/dev): Plano01 fase-03 — Rails legado 7.0 — alinhado com CA-04 (warning em Plano03 fase-09)
  it('Rails legado: Gemfile com gem "rails", "~> 7.0" ainda classifica como rails', async () => {
    await fs.writeFile(
      path.join(FIXTURE, 'Gemfile'),
      "source 'https://rubygems.org'\ngem 'rails', '~> 7.0'\n",
      'utf8'
    )
    const result = await detectStack(FIXTURE)
    expect(result.primary).toBe('rails')
    // warning de versão (RF11) é responsabilidade da camada acima (Plano03 fase-09)
  })

  // 2026-05-18 (Luiz/dev): Plano01 fase-03 — robustez D10 (variação de aspas + indentação)
  it('robustez: gem rails com single quote ou indentação ainda matcha', async () => {
    await fs.writeFile(
      path.join(FIXTURE, 'Gemfile'),
      "source 'https://rubygems.org'\ngroup :default do\n  gem 'rails', '~> 8.0'\nend\n",
      'utf8'
    )
    const result = await detectStack(FIXTURE)
    expect(result.primary).toBe('rails')
  })

  // 2026-05-18 (Luiz/dev): Plano01 fase-03 — zero falso-positivo em substring
  it('zero falso-positivo: gem "rails-something" (substring) NÃO classifica como rails', async () => {
    await fs.writeFile(
      path.join(FIXTURE, 'Gemfile'),
      "source 'https://rubygems.org'\ngem 'rails-erb', '~> 1.0'\ngem 'sinatra'\n",
      'utf8'
    )
    const result = await detectStack(FIXTURE)
    expect(result.primary).toBeNull()
  })
```

Comando RED: `bun run test -- detect-stack` → executar e CONFIRMAR quais testes já passam. Tabela esperada:

| Test case novo | Esperado RED ou pass-direto? |
|---|---|
| CA-03 Sinatra fallback | Provavelmente já passa (regex não bate, retorna null no probe, cai para `unknown`). VERIFICAR. |
| CA-06 Gemfile vazio | Provavelmente já passa. VERIFICAR. |
| Rails legado 7.0 | Provavelmente já passa (regex aceita `gem 'rails'` independente de versão). VERIFICAR. |
| Robustez (indentação) | Provavelmente já passa (regex usa `\s*` no início). VERIFICAR. |
| Zero falso-positivo `rails-erb` | **RISCO:** se regex for permissiva demais, pode matchar. CONFIRMAR resultado real. |

**Importante (G1 do plano):** se ALGUM test já passa, ótimo — documentar em STATE.md como "regression coverage adicionada, comportamento confirmado". Se algum FALHAR, é bug latente no detector — abrir conversa com dev antes de modificar `detect-stack.ts` (fase muda escopo).

### Passo 3 (GREEN): garantir que todos passam

Se Passo 2 mostrou test FALHANDO, três caminhos possíveis:

(a) **Regex precisa de ajuste para zero falso-positivo:** atualizar `detect-stack.ts:72` para regex mais estrita (ex: `/^\s*gem\s+["']rails["']\s*(,|$)/m` — exige separador após `'rails'`). Documentar mudança em MEMORY.md como DI-1.

(b) **Fixture do test está malformada:** revisar test case, corrigir.

(c) **Comportamento desejado é o que o detector já faz:** ajustar expectation do test (rar).

Comando GREEN: `bun run test -- detect-stack` → todos os 12-13 cases (7-8 existentes + 5 novos) passam.

### Passo 4: confirmar G1 do plano em STATE.md

Adicionar nota no STATE.md da feature:

```markdown
## Detector Rails — regression coverage (Plano 01 fase-03)

Confirmado em 2026-05-18: regex `/^\s*gem\s+["']rails["']/m` em `skills/init/lib/detect-stack.ts:72` está presente desde Plano 02 fase-06 do projeto (commit anterior à v6.3.3). RF3 do PRD vira REGRESSION TEST conforme PLAN.md `Assumptions` linha 35.

Cobertura adicionada nesta fase:
- CA-03 fallback Sinatra (Gemfile sem gem rails → unknown)
- CA-06 Gemfile vazio (sem crash, retorna unknown)
- CA-04 piloto: Rails legado 7.0 classifica como rails (warning fica em Plano03 fase-09 RF11)
- Robustez: indentação + single/double quote
- Zero falso-positivo: substring `rails-erb` não matcha

Nenhuma mudança em `detect-stack.ts` foi necessária.
```

---

## Gotchas

- **G1 do plano (detector já existe):** o objetivo desta fase é REGRESSION COVERAGE, não nova implementação. Antes de QUALQUER mudança em `detect-stack.ts`, parar e perguntar ao dev. Se algum test falhar de forma inesperada (ex: zero falso-positivo realmente falha), é decisão consciente, não improviso.

- **Local — `signalSource` no fallback:** o probe Rails retorna `null` quando regex não bate, e o orquestrador `detectStack` cai para `'unknown'` com `signalSource: 'no signal'`. CA-06 do PRD pede que telemetria emita `anchor_files: ['Gemfile']` mesmo no fallback — isso é responsabilidade da camada `detect-multi-stack` ou `emit-stack-knowledge-events`, não do `detect-stack.ts`. Aqui testamos apenas a camada baixa; integration test de telemetria fica para Plano 03 fase-08.

- **Local — sequencial com fase-03:** apos D22 (multi-stack contract), esta fase depende de fase-03 (refactor). Antes era paralelizavel com fase-02; agora aguarda fase-03 concluir para que os tests usem `result.primary` ao inves de `result.id`. Trade-off aceito: +1 fase sequencial em troca de cobertura correta do novo contrato.

- **D22 (CONTEXT.md) — `'unknown'` virou `null`:** tests novos usam `expect(result.primary).toBeNull()` ao inves de `expect(result.id).toBe('unknown')`. Atualizar tests existentes do detector (CA-21) tambem como parte desta fase.

- **Local — corner case "gem 'rails-something'":** se zero-falso-positivo falhar, considerar trade-off: regex mais estrita (`/^\s*gem\s+["']rails["']\s*(,|$)/m`) cobre `gem 'rails'` e `gem 'rails', ...` mas falha se alguém usa `gem  'rails'  ` (dois espaços + trailing). Aceitar essa edge case rara em troca de zero falso-positivo robusto. Discutir com dev antes de decidir.

---

## Verificacao

### TDD

- [ ] **RED (parcial):** 5 test cases novos escritos; rodar e ver quantos passam direto vs falham
  - Comando: `bun run test -- detect-stack`
  - Resultado esperado: pelo menos 1 falha (provavelmente `zero falso-positivo`) OU todos passam direto (documentar comportamento confirmado)

- [ ] **GREEN:** Após resolução (ajuste regex se necessário OU confirmação que comportamento existente está correto), todos os tests passam
  - Comando: `bun run test -- detect-stack`
  - Resultado esperado: `N passed, 0 failed` (N = 7-8 existentes + 5 novos = 12-13)

### Checklist

- [ ] `bun run test -- detect-stack` retorna 0 falhas
- [ ] 5 test cases novos adicionados: CA-03 Sinatra, CA-06 Gemfile vazio, Rails legado 7.0, robustez (indentação + single quote), zero falso-positivo (`rails-erb`)
- [ ] `git diff skills/init/lib/detect-stack.ts` vazio (nenhuma mudança no probe — apenas test) — OU mudança documentada como DI-1 em MEMORY.md se regex precisou ajuste
- [ ] STATE.md tem nota "Detector Rails — regression coverage" confirmando G1 do plano
- [ ] `bun run lint` limpo
- [ ] `bun run typecheck` limpo

---

## Criterio de Aceite

**Por maquina:**
- `bun run test -- detect-stack` retorna `12-13 passed, 0 failed`
- `bun run test` global continua verde (sem regressão em outras suites)

**Por humano:**
- STATE.md confirma G1 do plano: regex já existia, RF3 foi regression coverage não nova implementação
- Se houve ajuste em `detect-stack.ts`, motivo documentado em MEMORY.md como DI-1

---

<!-- Gerado por /plan-feature (sub-agente isolado) em 2026-05-18 -->
