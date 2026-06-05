<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou seção do PRD).
Exemplo: `// 2026-05-29 (Luiz/dev): \d{3,} — âncora "500-file migration" do CC (D2)`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: Workflow-Advisor Detector (TRACER BULLET)

**Plano:** 01 — Núcleo (Awareness + Detector + Doc + Gate)
**Sizing:** 2h
**Depende de:** Nenhuma (primeira fase; paralela à fase-02)
**Visual:** false

**RF:** RF4 · **Decisões:** D2 (regex conservador) / D3 (independe de verbo) / D4 (só user-prompt-gate) · **Invariantes:** INV1 (suprimir, não empilhar) / INV5 (threshold só no hook) / INV7 (pre-mutation fora) · **CA:** CA-01, CA-02, CA-03, CA-06, CA-07

---

## O que esta fase entrega

Um prompt com sinal de escala produz `[WORKFLOW_ADVISOR]` (texto advisory) via `user-prompt-gate.cjs`,
provando a arquitetura de sugestão end-to-end — sem nenhum caminho emitir uma tool Workflow ou `decision:block`.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `hooks/user-prompt-gate.cjs` | Modify | `SCALE_PATTERNS` (const novo); anti-deadlock no STEP 2; branch `[WORKFLOW_ADVISOR]` independente de verbo; merge no branch `>=2 domínios`; `module.exports` + guard de I/O para testabilidade |
| `hooks/user-prompt-gate.test.cjs` | Create | Testes RED→GREEN cobrindo CA-01/02/03/06/07 (padrão de `stop-reflector.test.cjs`: `node:test` + import dos exports) |

---

## Implementacao

### Passo 0 (PRIMEIRO — decisão-chave): tornar o hook testável

**Problema (GT-2):** `processPrompt` NÃO é exportado hoje. O `user-prompt-gate.cjs` roda o bloco de
I/O no top-level (linhas 428-477: `setTimeout` + `process.stdin.on(...)`), **sem** guard
`require.main === module`. Um `require('./user-prompt-gate.cjs')` num teste penduraria no `process.stdin`.

**Decisão:** seguir o padrão dual já usado em `hooks/stop-reflector.cjs` (linhas 121-131):

```js
// hooks/stop-reflector.cjs (referência — NÃO copiar verbatim; é o molde)
if (require.main === module) {
  run().catch(() => process.exit(0))
}
module.exports = { classify, extractLastUserMessage, buildBlockOutput, CORRECTION_PATTERNS, COMPLETED_PATTERNS }
```

INSPECIONAR também `hooks/state-md-hook.test.cjs` (usa `bun:test` + `const { handle } = require('./state-md-hook.cjs')`)
para confirmar que o repo importa funções de `.cjs` direto. Os DOIS hook-tests existentes seguem o
mesmo princípio: o `.cjs` exporta funções puras e o teste as importa.

Aplicar em `user-prompt-gate.cjs`:
1. Envolver o bloco de I/O (atualmente linhas 459-461 `const safetyTimer = setTimeout(...)` e
   463-476 os `process.stdin.on(...)`) num guard `if (require.main === module) { ... }`.
2. Adicionar ao final: `module.exports = { processPrompt, SCALE_PATTERNS }`.

> **Por que (i) export e não (ii) subprocesso:** os dois hook-tests do repo usam import-de-função.
> Subprocesso só seria necessário se o I/O não pudesse ser isolado — mas pode. Manter o
> comportamento CLI intacto sob o guard (fail-open, timer de 500ms preservados — RNF do PRD).

### Passo 1: `SCALE_PATTERNS` (CONSERVADOR — D2)

Adicionar perto de `IMPLEMENTATION_PATTERNS` (hoje linha 362). Regra-mestre (D2/INV5): o número
vive SÓ aqui; a prosa das skills (Planos 02/03) usa sinais semânticos. **NÃO** disparar em `\d{2,}`
(10) nem em palavra de escopo solta.

```js
// 2026-05-29 (Luiz/dev): SCALE_PATTERNS — sinal de ESCALA (D2 conservador). Âncora do CC = "500-file migration".
// Threshold numérico vive SÓ aqui (INV5); skills usam linguagem semântica. NÃO dispara em \d{2,} (10).
const SCALE_PATTERNS = [
  // (a) verbo de volume + 100+: migrar/migrate/rename/renomear/convert/converter ... 123 (mín. 3 dígitos)
  /\b(migrar|migrate|renomear|rename|convert(?:er)?)\b[\s\S]{0,40}?\b\d{3,}\b/i,
  /\b\d{3,}\b[\s\S]{0,40}?\b(arquivos?|files?|m[oó]dulos?|componentes?|endpoints?)\b/i,
  // (b) escopo + qualificador de escopo (palavra-só SEM número, mas COM qualificador "inteiro/todo/all")
  /\b(varredura|sweep|auditar|audit|escanear|scan)\b[\s\S]{0,30}?\b(codebase|c[oó]digo|projeto|reposit[oó]rio|repo)\b[\s\S]{0,20}?\b(inteir[oa]|todo|toda|all|complet[oa])\b/i,
  /\b(codebase inteiro|todo o projeto|todo o c[oó]digo|all files|todos os arquivos|reposit[oó]rio inteiro)\b/i,
  // (c) cross-check / verificar fontes — SÓ com pluralizador (várias/several/multiple/múltiplas)
  /\b(cross[- ]?check|verificar.*fontes|checar.*fontes|confront(?:ar|o).*fontes)\b[\s\S]{0,30}?\b(v[aá]rias|several|multiple|m[uú]ltiplas|diversas)\b/i,
  /\b(v[aá]rias|several|multiple|m[uú]ltiplas|diversas)\s+fontes\b/i,
  // (d) muitos ângulos/abordagens
  /\bde\s+\d+\s+([aâ]ngulos?|abordagens?|angles?|approaches?|perspectivas?)\b/i,
  /\b(m[uú]ltipl[oa]s|v[aá]ri[oa]s)\s+([aâ]ngulos?|abordagens?|perspectivas?)\b/i,
]

function hasScaleSignal(text) {
  return SCALE_PATTERNS.some((re) => re.test(text))
}
```

> Calibração dos casos do PRD: "migrar 400 arquivos" → (a) ✅. "auditar o codebase inteiro por XSS"
> → (b) ✅ (sem verbo de impl — D3). "renomeie esses 12 arquivos" → nenhum (12 não casa `\d{3,}`) ❌
> (CA-03). "renomeie 200 arquivos" → (a) ✅. "pesquisar X em várias fontes" → (c) ✅.

### Passo 2: anti-deadlock no STEP 2 (D4 / CA-02)

O STEP 2 atual (linhas 379-380) só retorna `null` para invocações de skill/comando. Estender para
quando o humano JÁ optou por workflow:

```js
// STEP 2: Anti-deadlock — user already invoking a skill or command
if (/\/anti-vibe-coding:/i.test(text) || /^\/.+/.test(text.trim())) return null;
// 2026-05-29 (Luiz/dev): humano já optou por workflow/ultracode → não re-sugerir (D4/CA-02).
if (/\bworkflow\b/i.test(text) || /\/effort\b/i.test(text) || /\bultracode\b/i.test(text)) return null;
```

> Posicionar ANTES do branch `[WORKFLOW_ADVISOR]` para curto-circuitar a sugestão (CA-02).

### Passo 3: branch `[WORKFLOW_ADVISOR]` com PRECEDÊNCIA sobre a classificação de domínio (D3 + INV1)

**SUBTILEZA CRÍTICA verificada** (não pular): a escala precisa ter **precedência** sobre os branches
de domínio, senão CA-06 vaza. Confirmado em primeira mão contra os regexes reais:

- `"auditar o codebase inteiro por XSS"` (CA-06) → casa o domínio **Security** (por "XSS"). Domain
  count = **1**. Se a escala fosse checada só depois, o STEP 5 `matches.length === 1` **retornaria
  primeiro** (linhas 400-406) com um `[SKILL_ADVISOR]` de Security e **nunca** emitiria
  `[WORKFLOW_ADVISOR]`. ❌
- `"migrar 300 endpoints de autenticação e cache"` (CA-07) → Security + System Design = **2 domínios**
  (verificado), além de escala.

Portanto: computar `scaleHit` **logo após o STEP 3.5 (LEARN)** e, se verdadeiro, o WORKFLOW_ADVISOR
**toma precedência** — absorvendo quaisquer domínios casados como a lista de fallback in-context, numa
**única** mensagem (INV1). Só quando `scaleHit` é falso o fluxo segue para a classificação de domínio
normal (STEP 4/5/6 inalterados).

```js
// 2026-05-29 (Luiz/dev): WORKFLOW_ADVISOR — dispara em sinal de escala, INDEPENDENTE de verbo (D3).
// Texto advisory puro (mesmo canal stdout do SKILL_ADVISOR). NUNCA emite tool Workflow nem decision:block (diretriz/RF15).
function workflowAdvisorMessage(trigger, fallbackDomains) {
  let msg = `[WORKFLOW_ADVISOR] Esta tarefa tem sinal de escala (${trigger}) — pode exceder o que uma conversa coordena.\n`
    + `Considere rodá-la como um dynamic workflow: inclua a palavra "workflow" no seu pedido para optar (o plugin nao lanca nada sozinho).\n`
    + `Alternativa in-context: /verify-work | /design-twice | /deep-research (se disponivel) | /plan-feature.\n`
    + `Workflows consomem substancialmente mais tokens. Pergunte ao usuario qual prefere antes de prosseguir.`;
  if (fallbackDomains && fallbackDomains.length) {
    // INV1: domínios casados viram fallback DENTRO da mesma mensagem — nunca um segundo [..] empilhado.
    msg += `\nDominios in-context relacionados (fallback se preferir nao usar workflow):\n`
      + fallbackDomains.map(d => `  - ${d.skill} (${d.name})`).join('\n');
  }
  return msg;
}
```

Estrutura no `processPrompt` — inserir este bloco **antes** do STEP 4 (classificação) e fazer o STEP 4
rodar a classificação apenas para alimentar o fallback quando há escala:

```js
// STEP 3.6: precedência da escala (D3 — independe de verbo; INV1 — mensagem única).
const scaleHit = hasScaleSignal(text);

// STEP 4: classificar domínios (sempre — serve tanto ao SKILL_ADVISOR quanto ao fallback do WORKFLOW_ADVISOR).
const matches = [];
for (const domain of DOMAINS) {
  if (domain.pattern.test(text)) matches.push(domain);
}

// STEP 4.5: se há escala, o WORKFLOW_ADVISOR tem precedência e absorve os domínios como fallback (CA-01, CA-06, CA-07).
if (scaleHit) {
  const trigger = matches.length >= 2
    ? `multiplos dominios + escala: ${matches.map(d => d.name).join(', ')}`
    : 'volume/varredura';
  return workflowAdvisorMessage(trigger, matches);
}

// STEP 5+ (inalterado): sem escala → fluxo de SKILL_ADVISOR normal (matches.length === 1, >= 2, fallback).
```

> Resultado por caso: CA-01 (`migrar 400 arquivos`, 0 domínios) → advisor "volume/varredura" sem
> fallback. CA-06 (`auditar codebase inteiro por XSS`, 1 domínio Security) → advisor + Security como
> fallback, numa mensagem. CA-07 (2 domínios + escala) → advisor "multiplos dominios + escala" +
> ambos como fallback, **uma** mensagem (INV1).

### Passo 4: STEP 5/6 (domínio) ficam INALTERADOS

Como a escala agora curto-circuita no STEP 4.5, os branches existentes `matches.length === 1`
(linhas 400-406) e `matches.length >= 2` (linhas 408-417) e o fallback STEP 6 (419-422) **não
precisam de mudança** — só são alcançados quando `scaleHit === false`. Isso mantém o comportamento
do skill-advisor 100% intacto para prompts sem escala (regressão zero) e concentra toda a lógica
de merge num único ponto (STEP 4.5), em vez de espalhá-la pelos branches de domínio.

> Alternativa considerada e rejeitada: gatear o merge dentro de cada branch de domínio (`=== 1` e
> `>= 2`). Rejeitada porque (a) duplica a lógica de merge em 2 lugares e (b) o branch `=== 1`
> retornava cedo, exigindo um guard extra. Precedência única no STEP 4.5 é mais limpo e cobre CA-06.

---

## Gotchas

- **G2 do plano (GT-2 testabilidade):** sem o guard `require.main === module`, o `require()` do teste
  pendura no stdin. Passo 0 é pré-requisito de tudo — fazer PRIMEIRO.
- **G1 do plano (GT-1):** não confundir com o stub gutted de `populate-plan-parity.test.ts`; o teste
  desta fase é `hooks/user-prompt-gate.test.cjs`, arquivo novo, padrão `node:test`.
- **G6/G7 do plano:** `bun run test` NÃO descobre `.cjs` em `hooks/` (ver Verificação). Rodar o
  teste desta fase explicitamente. `bun run lint` não existe — usar `bun run typecheck`.
- **Local — STEP 3 (SILENT) não engole CA-06 (verificado):** o branch de escala (3.6) roda DEPOIS do
  SILENT (STEP 3), o que está OK porque `"auditar o codebase inteiro por XSS"` **não** casa
  `SILENT_PATTERNS` (confirmado em primeira mão: `audit/auditar` não está em SILENT; só `debug`,
  `investigate`, `find the bug` etc). `hasImplementation` é false, SILENT é false → o prompt passa o
  STEP 3 e alcança o STEP 3.6/4.5, emitindo o advisor. Se um futuro gatilho de escala usar uma palavra
  que TAMBÉM esteja em SILENT, mover a checagem de escala para antes do STEP 3.
- **Local — INV7:** NÃO tocar `pre-mutation-gate.cjs`. Esta fase é só `user-prompt-gate.cjs` (D4).
- **Local — diretriz:** `workflowAdvisorMessage` retorna **string** (texto stdout). NUNCA retornar
  objeto com `decision`/`block`, nem instruir a invocar a tool Workflow. Travado pela fase-04.

---

## Verificacao

### TDD

- [ ] **RED:** Testes escritos e FALHAM por assertion (não compilation error). Antes do Passo 0, o
  `require` pendura — então escrever os exports/guard primeiro, depois os testes que falham porque
  `SCALE_PATTERNS`/branch ainda não existem.
  - Comando: `bun test hooks/user-prompt-gate.test.cjs`
  - Resultado esperado: assertions falhando (ex: `expected '[WORKFLOW_ADVISOR]...' to match, got null`)

- [ ] **GREEN:** Branch + `SCALE_PATTERNS` implementados; testes PASSAM.
  - Comando: `bun test hooks/user-prompt-gate.test.cjs`
  - Resultado esperado: `N pass, 0 fail`

### Casos de teste (mapeados aos CA)

- [ ] **CA-01:** `processPrompt('migrar 400 arquivos para o novo formato')` → contém `[WORKFLOW_ADVISOR]`, cita `workflow`, cita um análogo, termina em "antes de prosseguir".
- [ ] **CA-02:** `processPrompt('rode isso como workflow')` → `null`. Idem `'/effort ultracode'` e `'use ultracode'` → `null`.
- [ ] **CA-03 (falso-positivo):** `processPrompt('renomeie esses 12 arquivos')` → **NÃO** contém `[WORKFLOW_ADVISOR]`.
- [ ] **CA-06 (sem verbo):** `processPrompt('auditar o codebase inteiro por XSS')` → contém `[WORKFLOW_ADVISOR]`.
- [ ] **CA-07 (escala + multi-domínio):** prompt com ≥2 domínios E sinal de escala (ex: `'migrar 300 endpoints de autenticação e cache para o novo padrão'`) → exatamente UMA ocorrência de `[WORKFLOW_ADVISOR]` e ZERO de `[SKILL_ADVISOR]` empilhado (assert `(out.match(/\[WORKFLOW_ADVISOR\]/g) || []).length === 1`).
- [ ] **Diretriz (apoio à fase-04):** todas as saídas do branch são `typeof === 'string'`; nenhuma contém `"decision"` nem `"block"` nem instrução de emitir tool Workflow.

### Checklist

- [ ] `module.exports = { processPrompt, SCALE_PATTERNS }` presente; `require()` do teste não pendura (I/O sob guard).
- [ ] Comportamento CLI preservado: rodar o hook manualmente com JSON no stdin ainda emite/silencia como antes para prompts sem escala.
- [ ] `bun run test` continua verde (não quebrou nenhum `.ts`/`.tsx`; o `.cjs` novo é rodado à parte — G7).
- [ ] TypeCheck: `bun run typecheck` (= `tsc --noEmit`) limpo.
- [ ] Lint (G6 — `bun run lint` não existe): `bunx biome check hooks/user-prompt-gate.cjs` sem erros novos.

---

## Criterio de Aceite

**Por maquina:**
- `bun test hooks/user-prompt-gate.test.cjs` retorna `0 fail` com os 6 casos acima verdes.
- `node -e "const {processPrompt}=require('./hooks/user-prompt-gate.cjs'); const o=processPrompt('auditar o codebase inteiro por XSS'); process.exit(typeof o==='string' && o.includes('[WORKFLOW_ADVISOR]') ? 0 : 1)"` → exit 0.
- `node -e "const {processPrompt}=require('./hooks/user-prompt-gate.cjs'); process.exit(processPrompt('renomeie esses 12 arquivos') && processPrompt('renomeie esses 12 arquivos').includes('[WORKFLOW_ADVISOR]') ? 1 : 0)"` → exit 0 (CA-03: não dispara).

---

<!-- Gerado por /plan-feature em 2026-05-29 -->
