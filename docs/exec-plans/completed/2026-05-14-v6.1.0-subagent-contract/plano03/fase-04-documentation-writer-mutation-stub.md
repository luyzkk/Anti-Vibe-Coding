<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-14 (Luiz/dev): payload.mutation aceita qualquer shape em v6.1.0 — spec real fica pra v6.2 (TODO.md)`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 04: documentation-writer — envelope cosmetico (mutation stub)

**Plano:** 03 — Migracao em Escala
**Sizing:** 1h
**Depende de:** Plano 02 fase-04 (migration guide) — independente da fase-03 deste plano
**Visual:** false

---

## O que esta fase entrega

`documentation-writer.md` ganha **somente envelope cosmetico** do contrato v1 — `kind: "mutation"`, `status`, `reasoning` obrigatorios. O `payload.mutation` e **stub explicito**: aceita qualquer shape (placeholder). PRD §Won't Have ja registra que spec real do mutation payload (dry-run, diff preview, conflict resolution model) fica pra v6.2. Esta fase tambem cria entrada em `TODO.md` (raiz do projeto): `{feature:plugin} v6.2 — definir spec real do mutation payload`. Sem isso, autor futuro pode achar que stub e contrato definitivo e cristalizar shape ruim.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `agents/documentation-writer.md` | Modify | Substituir secao de output por envelope v1 cosmetico (`kind: mutation`); injetar bloco Status Mapping minimo, Reasoning guideline, Output template com `payload.mutation` STUB e comentario inline avisando que shape e placeholder |
| `TODO.md` (raiz do projeto) | Modify | Adicionar 1 linha: `{feature:plugin} v6.2 — definir spec real do mutation payload (dry-run, diff preview, conflict resolution)` |

---

## Implementacao

### Passo 1: Reler `agents/documentation-writer.md` (CLAUDE.md §Integridade)

INVENTORY diz: "markdown sem status field claro, escopo diferente (write-side, nao auditor read-only)". Confirmar com leitura. Identificar o que o prompt atual instrui o agente a fazer (provavelmente: ler arquivos, propor mudancas em markdown, talvez aplicar via Edit/Write). Esses detalhes ficam **preservados** — apenas a secao de output ganha envelope.

### Passo 2: Definir envelope v1 alvo (cosmetico — mutation stub)

```json
{
  "contract_version": "1.0",
  "agent": "documentation-writer",
  "kind": "mutation",
  "status": "complete",
  "reasoning": "Atualizei docs/PIPELINE.md adicionando step 'iterate' que estava ausente do diagrama. Tambem detectei que docs/MODEL_PROFILES.md menciona 'balanced' mas SKILL.md ja usa 'quality' como default — vale alinhar fora do escopo desta operacao.",
  "payload": {
    "mutation": "<stub — aceita qualquer shape em v6.1.0; v6.2 vai definir spec real com dry-run/diff/conflict>"
  },
  "human_readable": "<markdown opcional — resumo da mudanca para o operador>",
  "metadata": { "run_id": "<uuid>", "duration_ms": 0, "model": "<modelo>" }
}
```

**Decisoes embutidas:**
- `payload.mutation` e **STUB**. Em v6.1.0 aceita qualquer shape (string, objeto, array — schema do Plano 01 fase-03 trata como `additionalProperties: true` em `kind: mutation`).
- Nenhum orquestrador consome `documentation-writer` em v6.1.0 (PRD §Out of Scope) — envelope existe so para uniformidade quando spec real chegar em v6.2.
- `status: "complete"` e o caso comum. `status: "blocked"` se o agente nao conseguiu aplicar a mudanca (ex: conflict, arquivo inexistente). `needs_retry` para falha mecanica de JSON. `needs_human` nao se aplica (write-side decide ou bloqueia, nao escala duvida).
- `reasoning` aqui captura **o que o agente notou alem da mudanca** — uso ideal do campo (Every: "agent can say things you didn't schema").

### Passo 3: Bloco "Status Mapping" minimo

```markdown
## Status Mapping (envelope cosmetico — v6.1.0; spec real do payload.mutation vira em v6.2)

| Resultado de execucao                                 | `status` (top-level) |
|-------------------------------------------------------|----------------------|
| Mudanca aplicada com sucesso                          | `complete`           |
| LLM falhou em emitir JSON valido (parser retry)       | `needs_retry`        |
| Mudanca nao pode ser aplicada (conflict, arquivo      | `blocked`            |
| inexistente, permissao)                               |                      |

NUNCA emita enum de dominio no top-level. Em v6.1.0 nao ha `domain_status` definido para `kind: mutation` — fica para v6.2.
```

### Passo 4: Bloco "Reasoning guideline" — adaptado para write-side

```markdown
## Reasoning (obrigatorio — minimo 20 chars, ideal >50)

Use `reasoning` para **meta-observacoes sobre a mudanca**:
- coisas que voce notou no documento mas decidiu nao mudar (fora do escopo)
- inconsistencias entre documentos relacionados (ex: "PIPELINE.md atualizado, mas SKILL.md de quick-plan ainda referencia o passo antigo")
- sugestoes que o operador pode querer aplicar manualmente

NAO use `reasoning` para:
- descrever a mudanca em si (isso vai em `payload.mutation` quando spec chegar em v6.2; em v6.1.0, no `human_readable`)
- listar arquivos tocados (info redundante)

Ruim (<50, generico):
> "Documento atualizado."

Bom (>50, info nova):
> "Atualizei PIPELINE.md adicionando step 'iterate'. Tambem notei que MODEL_PROFILES.md menciona 'balanced' mas o codigo ja default 'quality' — vale alinhar em um PR separado."
```

### Passo 5: Bloco "Output template" com comentario de STUB explicito

```markdown
## Output (obrigatorio JSON — sem code fences ao redor)

Emita exatamente um objeto JSON valido. Nao envolva em ```json ... ```. Nao adicione texto antes ou depois.

```
{
  "contract_version": "1.0",
  "agent": "documentation-writer",
  "kind": "mutation",
  "status": "<complete|needs_retry|blocked>",
  "reasoning": "<prosa livre, min 20 chars>",
  "payload": {
    "mutation": "<STUB em v6.1.0 — aceita qualquer shape (string, objeto, array). Spec real (dry-run, diff preview, conflict resolution) sera definida em v6.2; ate la, descreva a mudanca de forma livre aqui ou prefira o `human_readable` para o operador.>"
  },
  "human_readable": "<markdown opcional — resumo legivel da mudanca>",
  "metadata": { "run_id": "<uuid>", "duration_ms": 0, "model": "<modelo>" }
}
```

**Aviso aos autores:** `payload.mutation` em v6.1.0 NAO tem schema rigido. Quando v6.2 chegar com spec real, este agente vai precisar de update. Veja entrada em `TODO.md` do projeto: "v6.2 — definir spec real do mutation payload".
```

### Passo 6: Adicionar entrada em `TODO.md` raiz

Verificar `TODO.md` na raiz do projeto. Adicionar 1 linha no formato do arquivo (preservar convencao existente — provavelmente `- {feature:area} descricao` ou similar):

```
- {feature:plugin} v6.2 — definir spec real do mutation payload (dry-run, diff preview, conflict resolution) — bloqueia documentation-writer ter contrato write-side completo
```

Antes de adicionar, **ler `TODO.md`** completo para entender convencao (CLAUDE.md §Integridade). Se ja existe entrada similar (ex: alguem registrou pre-emptivamente), NAO duplicar — anotar em MEMORY.md.

### Passo 7: Re-ler `agents/documentation-writer.md` e `TODO.md`

Confirmar:
- secao antiga de output (markdown puro) substituida, nao duplicada
- 4 blocos novos na ordem correta
- comentario inline em `payload.mutation` deixa claro que e STUB
- `TODO.md` tem exatamente 1 entrada nova (sem duplicacao)
- `agent: "documentation-writer"` e `kind: "mutation"` literais

---

## Gotchas

- **G1 (LLM JSON malformado):** Padrao. "Sem code fences" no template.
- **G3 (reasoning 20/50):** Critico aqui porque ha tentacao de o agente usar `reasoning` para descrever a mudanca (que e o trabalho dele) — passo 4 explicita que `reasoning` e META-observacao, nao descricao da mudanca.
- **G5 (contract_version "1.0"):** Literal.
- **G8 (Comment Provenance):** O comentario inline em `payload.mutation` (passo 5) JA tem provenance — explicita que e STUB, por que (v6.1.0 won't have), o que vira em v6.2. Manter exatamente como escrito.
- **Local (risco de cristalizacao do stub):** Maior risco desta fase. Se o aviso de STUB nao for explicito o suficiente, autor futuro pode olhar `payload.mutation` em v6.1.0 e assumir que e contrato final. Mitigacoes:
  - Comentario inline no Output template (passo 5)
  - Entrada em `TODO.md` raiz (passo 6) — visivel no fluxo de manutencao
  - PRD §Won't Have ja documenta — citar no migration guide v2 do Plano 02 (verificar se ja foi feito; se nao, MEMORY.md aponta)
- **Local (TODO.md convencao):** Se `TODO.md` do projeto usa convencao especifica (ex: prefixo `[ ]`, owner em parenteses, prioridade), seguir. Ler antes de adicionar.
- **Local (documentation-writer pode aplicar mudanca via Edit/Write tools):** Verificar se o prompt atual instrui uso de Edit/Write. Se sim, o envelope so registra resultado — o tool call em si nao muda. O agente continua usando Edit/Write conforme antes, mas EMITE envelope JSON no final.

---

## Verificacao

### TDD (simulacao — fixture concreta vem na fase-05)

- [ ] **RED:** Output do prompt atual contra `parseAndDispatch` retorna `MISSING_CONTRACT_VERSION`, `MISSING_REASONING`, `MISSING_KIND` (markdown puro, sem envelope).
  - Comando (mental): rodar output antigo string contra `parseAndDispatch`.

- [ ] **GREEN:** Output exemplo apos edicao (espelhando JSON do passo 2 com `payload.mutation: "<qualquer string descritiva>"`) contra `parseAndDispatch` retorna `{ ok: true, kind: "mutation" }` sem erros e sem warnings.
  - Comando: `bun run --eval "import { parseAndDispatch } from './skills/lib/subagent-contract'; console.log(parseAndDispatch(JSON.stringify(<output exemplo>)))"`

### Checklist

- [ ] `agents/documentation-writer.md` lido completo antes da edicao
- [ ] `TODO.md` raiz lido completo antes da edicao
- [ ] 4 blocos novos presentes no prompt: Status Mapping, Reasoning guideline, Output template, exemplo concreto
- [ ] Comentario inline em `payload.mutation` (passo 5) deixa claro que e STUB e cita `TODO.md` v6.2
- [ ] `TODO.md` tem exatamente 1 entrada nova `{feature:plugin} v6.2 — definir spec real do mutation payload` (sem duplicacao com entradas existentes)
- [ ] `agent: "documentation-writer"` e `kind: "mutation"` literais no Output template
- [ ] Schema do Plano 01 fase-03 aceita `kind: mutation` com `payload.mutation` de shape livre (verificar — se schema rejeita, e bug do Plano 01 a corrigir, anotar em MEMORY.md como BUG-N)
- [ ] `documentation-writer.md` e `TODO.md` re-lidos apos edicao
- [ ] `bun run lint` limpo

---

## Criterio de Aceite

**Por maquina:**
- `parseAndDispatch(<output exemplo>)` retorna `{ ok: true, kind: "mutation" }` sem erros e sem warnings.
- `TODO.md` contem a string `v6.2 — definir spec real do mutation payload`.

**Por humano:**
- Revisor lendo `agents/documentation-writer.md` entende em <1min que `payload.mutation` e STUB e que spec real vira em v6.2 (sem ambiguidade — comentario inline esta no Output template).
- Revisor lendo `TODO.md` encontra a entrada v6.2 e entende o escopo sem precisar abrir o PRD.

---

<!-- Gerado por /plan-feature em 2026-05-14 -->
