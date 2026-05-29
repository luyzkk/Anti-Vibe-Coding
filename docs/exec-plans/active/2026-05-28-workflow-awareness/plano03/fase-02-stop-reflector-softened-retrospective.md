<!--
Princípio universal #5 — Comment Provenance.
Esta fase modifica CÓDIGO DE RUNTIME (hooks/stop-reflector.cjs). O novo helper recebe JSDoc;
comentários inline (se houver) carregam linhagem: autor/data/decisão.
Exemplo: `// 2026-05-29 (Luiz/dev): default OFF — anti-nag, fail-open (D5/RF14)`.
Provenance da decisão: PRD RF14; CONTEXT D5/INV6; PLAN R3. O SINAL (sweep/migração/muitos Agent calls)
foi pré-decidido em D5; o MECANISMO (helper + threshold) é decisão de design desta fase → registrar em MEMORY.
-->

# Fase 02: stop-reflector — Retrospectivo Suavizado (linha no FEATURE_COMPLETED, gated por sinal forte)

**Plano:** 03 — Cobertura (grill-me + consultant + retrospectivo)
**Sizing:** 1h
**Depende de:** Nenhuma (independente da fase-01; toca só `hooks/stop-reflector.cjs` + seu test)
**Visual:** false

---

## O que esta fase entrega

`hooks/stop-reflector.cjs` ganha um helper puro `detectStrongScaleSignal(transcriptPath)` e uma
assinatura `buildBlockOutput(kind, opts)` (default OFF) que, SÓ quando há sinal forte de escala,
appenda UMA linha de sugestão de workflow DENTRO do menu `FEATURE_COMPLETED` já existente — nunca um
novo `decision:block`, nunca a tool Workflow (D5/INV6). Acompanhado de TDD inline em
`hooks/stop-reflector.test.cjs`.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `hooks/stop-reflector.cjs` | Modify | Adicionar helper `detectStrongScaleSignal(transcriptPath)`; mudar `buildBlockOutput(kind)` → `buildBlockOutput(kind, opts = {})`; appendar 1 bullet de workflow ao `reason` do `FEATURE_COMPLETED` quando `opts.strongScaleSignal`; passar o sinal no `run()`; exportar o novo helper. |
| `hooks/stop-reflector.test.cjs` | Modify | ADICIONAR testes (não gutted stub — irmão saudável): bullet presente com `strongScaleSignal:true` + `decision==='block'` no MESMO bloco + sem segundo bloco + sem `Workflow(`; bullet AUSENTE com default/false (backward-compat com testes das linhas 83-88). |

> **Ground truth confirmado (Read 2026-05-29):**
> - `buildBlockOutput(kind)` linhas 81-97; case `FEATURE_COMPLETED` 89-95 já retorna `{ decision:'block', reason: '[FEATURE_COMPLETED] ...menu com bullets...' }` (bullets: security-auditor/code-smell-detector RECOMENDADO, OPCIONAL auditores, QA VISUAL, DOCUMENTACAO, REVISAO).
> - `run()` 99-119: lê stdin JSON, tem `input.transcript_path`, chama `extractLastUserMessage(transcript_path)` → `classify` → `buildBlockOutput`.
> - `module.exports` 125-131: `{ classify, extractLastUserMessage, buildBlockOutput, CORRECTION_PATTERNS, COMPLETED_PATTERNS }`.
> - `extractLastUserMessage` 44-72: lê JSONL, itera do fim p/ começo, parse tolerante (try/catch por linha) — modelo a espelhar no novo helper.
> - test.cjs (130 linhas): `node:test` + `node:assert/strict`, `require('./stop-reflector.cjs')`, helper `writeFixtureTranscript(messages)`. Testes 83-88 asseram `buildBlockOutput('FEATURE_COMPLETED')` → `decision==='block'` + `/FEATURE_COMPLETED/` + `/security-auditor/`.
> - **G7:** `bun run test` NÃO pega `*.test.cjs` — rodar `bun test hooks/stop-reflector.test.cjs` explicitamente.

---

## Implementacao

### Passo 1 — Adicionar `detectStrongScaleSignal(transcriptPath)` (helper puro, fail-open, default OFF)

O MECANISMO é decisão de design desta fase (D5 só fixou o SINAL e o "nunca decision:block novo").
Mecanismo recomendado: varrer a CAUDA do transcript desde a última mensagem `type:'user'` e contar
entradas `tool_use` cujo `name` seja `Agent` ou `Task`. Sinal forte = contagem `>= THRESHOLD`
(proposta conservadora: **5**). Espelhar o padrão tolerante de `extractLastUserMessage` (parse por
linha em try/catch; ler do fim para o começo). Qualquer erro de IO/parse → `false` (fail-open: sem
sugestão). Registrar o threshold final em MEMORY (DI-Plano03-fase02-detectStrongScaleSignal).

```javascript
/**
 * Detecta sinal FORTE de escala no turno atual: varre as entradas do transcript desde a
 * ultima mensagem do usuario e conta chamadas de tool sequenciais de coordenacao de agentes
 * (Agent/Task). Retorna true so acima de um limiar conservador. Fail-open: qualquer erro de
 * IO/parse retorna false (sem sugestao). Implementa D5 (apenas o SINAL foi pre-decidido; o
 * MECANISMO/limiar e decisao desta fase — RF14).
 * @param {string} transcriptPath
 * @returns {boolean}
 */
function detectStrongScaleSignal(transcriptPath) {
  // 2026-05-29 (Luiz/dev): limiar 5 — conservador, anti-nag (D5/RF14). Ajustar em MEMORY se nag aparecer.
  const THRESHOLD = 5
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return false
  let raw
  try {
    raw = fs.readFileSync(transcriptPath, 'utf-8')
  } catch {
    return false
  }
  const lines = raw.split(/\r?\n/).filter(Boolean)
  let agentToolCalls = 0
  for (let i = lines.length - 1; i >= 0; i--) {
    let entry
    try {
      entry = JSON.parse(lines[i])
    } catch {
      continue
    }
    if (!entry) continue
    if (entry.type === 'user') break // chegamos ao inicio do turno atual
    const content = entry.message && entry.message.content
    if (Array.isArray(content)) {
      for (const block of content) {
        if (
          block &&
          block.type === 'tool_use' &&
          (block.name === 'Agent' || block.name === 'Task')
        ) {
          agentToolCalls++
        }
      }
    }
  }
  return agentToolCalls >= THRESHOLD
}
```

### Passo 2 — Mudar `buildBlockOutput(kind)` → `buildBlockOutput(kind, opts = {})` e appendar o bullet

A trava-mor (G3): a linha de workflow é UM bullet `- ` extra DENTRO do MESMO `reason` string do
`FEATURE_COMPLETED`. A forma do retorno NÃO muda (`{ decision:'block', reason }`). O bullet só é
appendado se `opts.strongScaleSignal === true` (default ausente → menu original, backward-compat).

```javascript
function buildBlockOutput(kind, opts = {}) {
  if (kind === 'CORRECTION') {
    // ...inalterado (linhas 82-88)...
  }
  if (kind === 'FEATURE_COMPLETED') {
    let reason =
      '[FEATURE_COMPLETED] Implementacao concluida! Apresente ao dev as opcoes abaixo e PERGUNTE quais deseja executar (nao execute automaticamente):\n- RECOMENDADO: Rodar agente security-auditor e code-smell-detector?\n- OPCIONAL: solid-auditor, react-auditor, api-auditor, database-analyzer, infrastructure-auditor?\n- QA VISUAL: Se arquivos .tsx/.jsx/.css/.html foram modificados, sugerir /anti-vibe-coding:qa-visual para verificacao no browser\n- DOCUMENTACAO: Criar subagente documentation-writer?\n- REVISAO: Invocar /anti-vibe-coding:verify-work ou /anti-vibe-coding:anti-vibe-review?'
    if (opts.strongScaleSignal) {
      // 2026-05-29 (Luiz/dev): linha retrospectiva suavizada (D5/RF14). DENTRO do menu existente,
      // nunca um decision:block novo. Suggest-only (INV6); pareada com fallback de skill in-context.
      reason +=
        '\n- WORKFLOW (opcional): Esta tarefa coordenou muitos agentes/arquivos sequencialmente — da proxima vez considere re-rodar incluindo a palavra "workflow" para coordena-los em paralelo (ver docs/WORKFLOWS.md). O plugin nao executa nem lanca workflow; o opt-in e do humano. Alternativa in-context: /verify-work, /design-twice, /deep-research (se disponivel) ou /plan-feature.'
    }
    return { decision: 'block', reason }
  }
  return null
}
```

Regras desta inserção:
- **G3/RF14 (trava-mor):** o bullet vive no MESMO `reason`. NUNCA um segundo objeto, NUNCA um segundo
  `decision`. A função continua retornando UM `{ decision:'block', reason }`.
- **INV6 (marcadores):** "nao executa", "nao lanca", "opt-in e do humano", "considere".
- **D5 (copy suavizada):** tom de "da proxima vez considere", não imperativo; é a 6ª opção do menu, não
  o foco.
- **G1:** `docs/WORKFLOWS.md` por menção de caminho (no `.cjs` não há link markdown de qualquer forma).
- **NFR degradação:** o fallback in-context (`/verify-work, /design-twice, /deep-research, /plan-feature`)
  é a MESMA lista do hook/skills e funciona com workflows desabilitados.
- **D7/G4:** `/deep-research (se disponivel)` com hedge (pode haver caso de pesquisa).

### Passo 3 — Passar o sinal no `run()` e exportar o helper

No `run()` (99-119), após `classify`, computar o sinal e passar ao `buildBlockOutput` SÓ para
`FEATURE_COMPLETED` (CORRECTION não recebe sugestão de workflow):

```javascript
const kind = classify(userText)
if (!kind) process.exit(0)

const strongScaleSignal =
  kind === 'FEATURE_COMPLETED' && detectStrongScaleSignal(input.transcript_path)
const output = buildBlockOutput(kind, { strongScaleSignal })
process.stdout.write(JSON.stringify(output))
process.exit(0)
```

Adicionar `detectStrongScaleSignal` ao `module.exports` (linhas 125-131):

```javascript
module.exports = {
  classify,
  extractLastUserMessage,
  detectStrongScaleSignal,
  buildBlockOutput,
  CORRECTION_PATTERNS,
  COMPLETED_PATTERNS,
}
```

### Passo 4 — TDD inline em `hooks/stop-reflector.test.cjs` (RED primeiro)

Adicionar testes ao arquivo existente (irmão saudável; não criar arquivo novo). Reutilizar o helper
`writeFixtureTranscript(messages)` já presente e o import (adicionar `detectStrongScaleSignal` ao
destructuring da linha 11). Fixture de sinal forte: 5+ entradas assistant com `content` contendo
`{ type:'tool_use', name:'Agent' }` (ou `'Task'`) após a última mensagem `user`.

```javascript
// no destructuring (linha 11):
const { classify, extractLastUserMessage, detectStrongScaleSignal, buildBlockOutput } = require('./stop-reflector.cjs')

// helper local para fixture de sinal forte (N tool_use Agent/Task no turno atual):
function writeStrongScaleTranscript(toolCallCount) {
  const messages = [{ type: 'user', message: { content: 'faca a migracao' } }]
  for (let i = 0; i < toolCallCount; i++) {
    messages.push({
      type: 'assistant',
      message: { content: [{ type: 'tool_use', name: 'Agent', input: {} }] },
    })
  }
  return writeFixtureTranscript(messages)
}

test('detectStrongScaleSignal returns true above threshold of sequential Agent/Task calls', () => {
  const file = writeStrongScaleTranscript(5)
  assert.equal(detectStrongScaleSignal(file), true)
})

test('detectStrongScaleSignal returns false below threshold', () => {
  const file = writeStrongScaleTranscript(2)
  assert.equal(detectStrongScaleSignal(file), false)
})

test('detectStrongScaleSignal fails open (false) on missing transcript', () => {
  assert.equal(detectStrongScaleSignal('/nonexistent/path.jsonl'), false)
  assert.equal(detectStrongScaleSignal(''), false)
})

test('buildBlockOutput appends workflow bullet only with strongScaleSignal true, in the same block', () => {
  const out = buildBlockOutput('FEATURE_COMPLETED', { strongScaleSignal: true })
  assert.equal(out.decision, 'block')
  assert.match(out.reason, /FEATURE_COMPLETED/) // menu original preservado
  assert.match(out.reason, /security-auditor/)  // bullets originais preservados
  assert.match(out.reason, /workflow/i)          // bullet novo presente
  assert.match(out.reason, /nao lanca|nao executa/i) // marcador suggest-only (INV6)
})

test('buildBlockOutput omits workflow bullet by default (backward-compat)', () => {
  const out = buildBlockOutput('FEATURE_COMPLETED')
  assert.equal(out.decision, 'block')
  assert.match(out.reason, /security-auditor/)
  assert.ok(!/da proxima vez considere/i.test(out.reason)) // bullet de workflow AUSENTE
})

test('FEATURE_COMPLETED never produces a second decision:block (D5/RF14 — single block invariant)', () => {
  const out = buildBlockOutput('FEATURE_COMPLETED', { strongScaleSignal: true })
  // exatamente UMA chave decision; reason e string unica; sem segundo objeto block.
  assert.deepEqual(Object.keys(out).sort(), ['decision', 'reason'])
  // a string nunca emite a tool Workflow:
  assert.ok(!/Workflow\s*\(/.test(out.reason))
})
```

RED esperado: antes do Passo 1-3, `detectStrongScaleSignal` não existe (`TypeError: ... is not a
function`) e o bullet de workflow está ausente quando `strongScaleSignal:true`. GREEN após implementar.
Os testes 83-88 (existentes) continuam verdes porque chamam `buildBlockOutput('FEATURE_COMPLETED')`
sem 2º arg (default OFF → menu sem o bullet).

---

## Gotchas

- **G1 do plano (uma fonte de verdade):** a linha appendada REFERENCIA `docs/WORKFLOWS.md` e usa a
  MESMA lista de fallback do hook/skills — não reproduz a tabela comparativa.
- **G3 do plano (trava-mor RF14):** o bullet vive DENTRO do `reason` existente. Tem que ser IMPOSSÍVEL
  criar um segundo `decision:block`. O teste "single block invariant" assere `Object.keys(out)` ==
  `['decision','reason']` e zero `Workflow(`.
- **G4 do plano (backward-compat):** `buildBlockOutput(kind, opts = {})` com default OFF; testes 83-88
  inalterados e verdes. NÃO mudar a forma do retorno nem a ordem dos bullets originais.
- **G2 do plano (D5 mecanismo aberto):** o threshold (5) e a varredura `tool_use` Agent/Task são DECISÃO
  desta fase — registrar em MEMORY como DI. Só o SINAL foi pré-decidido.
- **G7 do plano (test.cjs não entra em `bun run test`):** rodar EXPLICITAMENTE
  `bun test hooks/stop-reflector.test.cjs`. Não confiar no `bun run test` para este RED/GREEN.
- **Local — CORRECTION não recebe workflow:** só `FEATURE_COMPLETED` computa/recebe `strongScaleSignal`.
  O case CORRECTION (82-88) fica intacto.
- **Local — fail-open obrigatório:** qualquer erro em `detectStrongScaleSignal` → `false`. O hook é
  fail-open por design (NFR); uma sugestão extra nunca pode quebrar o Stop hook.
- **Local — reler antes de editar:** reler `stop-reflector.cjs` 81-131 imediatamente antes do Edit.

---

## Verificacao

### TDD

- [ ] **RED:** com os Passos 1-3 ainda NÃO aplicados, os testes novos falham — `detectStrongScaleSignal`
  inexistente (TypeError) e bullet de workflow ausente com `strongScaleSignal:true`.
  - Comando: `bun test hooks/stop-reflector.test.cjs`
  - Resultado esperado: assertion/TypeError failure nos testes novos; testes 83-88 ainda passam.

- [ ] **GREEN:** após implementar helper + opts + wiring, TODOS passam (novos + existentes).
  - Comando: `bun test hooks/stop-reflector.test.cjs`
  - Resultado esperado: `N pass, 0 fail`.

### Checklist

- [ ] `detectStrongScaleSignal(transcriptPath)` adicionado, com JSDoc, fail-open, default conservador.
- [ ] `buildBlockOutput(kind, opts = {})` — bullet de workflow appendado SÓ com `opts.strongScaleSignal`.
- [ ] Forma do retorno inalterada: `{ decision:'block', reason }` (uma chave `decision`, um `reason`).
- [ ] `run()` passa `{ strongScaleSignal }` só para `FEATURE_COMPLETED`; CORRECTION intacto.
- [ ] `detectStrongScaleSignal` exportado em `module.exports`.
- [ ] Testes novos cobrem: sinal acima/abaixo do threshold, fail-open, bullet presente (true)/ausente (default), single-block invariant, zero `Workflow(`.
- [ ] Testes existentes (linhas 83-88) continuam verdes (backward-compat).
- [ ] `bun test hooks/stop-reflector.test.cjs` verde (explícito — G7).
- [ ] `bun run typecheck` sem novos erros (GT-01 inalterado).
- [ ] `bunx biome check hooks/stop-reflector.cjs hooks/stop-reflector.test.cjs` limpo (opcional).

---

## Criterio de Aceite

**Por maquina:**
- `bun test hooks/stop-reflector.test.cjs` verde (novos + existentes).
- `buildBlockOutput('FEATURE_COMPLETED', { strongScaleSignal: true })` retorna UM objeto com chaves
  exatamente `['decision','reason']`; `reason` casa `/workflow/i` e NÃO casa `/Workflow\s*\(/`.
- `buildBlockOutput('FEATURE_COMPLETED')` (default) NÃO contém o bullet de workflow.

**Por humano:**
- Leitura fresca do `reason` com sinal forte: a linha de workflow lê como SUGESTÃO suave (6ª opção do
  menu), não afoga o menu de segurança, e é impossível interpretá-la como "o hook pode lançar um workflow".

---

<!-- Gerado por /plan-feature em 2026-05-29 -->
