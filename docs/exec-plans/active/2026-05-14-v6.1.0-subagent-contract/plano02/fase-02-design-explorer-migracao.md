<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 02: Migracao do `design-explorer` (markdown 8 secoes → `kind: proposal` + `human_readable`)

**Plano:** 02 — Migracao Piloto (3 padroes)
**Sizing:** 1.5h
**Depende de:** Plano 01 fase-05 (envelope v1 template). Independente de fase-01 deste plano (rodam em paralelo)
**Visual:** false

---

## O que esta fase entrega

`agents/design-explorer.md` emitindo `kind: "proposal"` com envelope v1 completo. As 8 secoes ricas existentes hoje (Context, Constraints, Alternatives, Tradeoffs, Recommendation, Risks, OpenQuestions, References) **preservam-se integralmente em `human_readable`** — markdown nao e descartado, e apresentacao valiosa para o operador. `payload.proposal` carrega 5 campos chave estruturados que o handler generico do `/design-twice` (Plano 04 fase-02) consome para consolidar 3 variantes em paralelo sem regex.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `agents/design-explorer.md` | Modify | Substituir instrucao "output 8 secoes markdown" por instrucao "output JSON envelope v1 com markdown das 8 secoes dentro de `human_readable`" |

---

## Implementacao

### Passo 1: Reler estado atual de `design-explorer.md`

INVENTORY linha `design-explorer` afirma:
- Output: markdown rigido com 8 secoes.
- Status: nenhum field.
- Reasoning: ausente.
- Caso especial: payload rico, nao auditoria binaria (`kind` correto = `proposal`).

Releia integralmente antes de editar — confirmar nomes exatos das 8 secoes (pode variar versus INVENTORY).

### Passo 2: Definir o envelope v1 alvo (formato exato)

Output esperado depois da migracao:

```json
{
  "contract_version": "1.0",
  "agent": "design-explorer",
  "kind": "proposal",
  "status": "complete",
  "reasoning": "Explorei 3 abordagens. A constraint 'sem novas deps' do input conflita com a Recommendation natural (usar lib X) — sinalizo como tradeoff #2. Tambem notei que o problema admite solucao serverless que voce nao mencionou; incluida como Alternative B.",
  "payload": {
    "proposal": {
      "title": "Cache via Redis com TTL adaptativo",
      "summary": "Cache de leitura com TTL ajustado pela latencia do upstream. Falha aberta se Redis cair.",
      "constraints": [
        "Latencia P99 <100ms",
        "Sem novas deps de runtime (Redis ja existe)",
        "Compativel com horizontal scaling"
      ],
      "tradeoffs": [
        { "axis": "consistencia x latencia", "choice": "TTL 30s favorece latencia; staleness aceitavel" },
        { "axis": "complexidade x deps", "choice": "Redis ja existe — reuso vence opcao serverless de Alternative B" }
      ],
      "recommendation": "Redis com TTL adaptativo (Alternative A). Implementacao em <1 dia.",
      "alternatives": [
        { "id": "B", "title": "Cache serverless (Cloudflare KV)", "rejected_because": "introduz dep nova" },
        { "id": "C", "title": "Sem cache, otimizar query", "rejected_because": "nao resolve P99" }
      ]
    }
  },
  "human_readable": "## Context\n...\n## Constraints\n...\n## Alternatives\n### A — Redis\n...\n### B — Serverless KV\n...\n## Tradeoffs\n...\n## Recommendation\n...\n## Risks\n...\n## Open Questions\n...\n## References\n...",
  "metadata": { "run_id": "uuid", "duration_ms": 0, "model": "sonnet" }
}
```

**Decisoes chave embutidas:**
- `kind: "proposal"` — PRD §Decisoes #4 ja prevista.
- `status: "complete"` por padrao. **Proposta nunca e `needs_retry`** (G-P02-04) — se JSON malformou, retry mecanico do parser cuida; se constraint do input e impossivel, `needs_human`.
- `payload.proposal` tem 5 campos estruturados: handler do `/design-twice` consolida `title/summary/recommendation` em tabela comparativa das 3 variantes, e `alternatives[]` vira input de revisao cruzada. **Estruturado para consumo automatico**.
- `human_readable` mantem as 8 secoes integrais — operador humano le markdown formatado, nao tem perda visual versus formato antigo. G-P02-02.
- `reasoning` e meta: "o que vi fora do schema do input" (constraint conflita, problema admite outra solucao). NAO repete o que `human_readable` ja diz. G-P02-03.

### Passo 3: Bloco "Output kind = proposal" a injetar

```markdown
## Kind: proposal (proposicao arquitetural — NAO auditoria)

Voce nao audita codigo. Voce **propoe** uma abordagem para um problema.
Lifecycle status sempre `complete` na pratica:
- `complete`: proposta entregue (caso ~100%)
- `needs_human`: constraint do input e contraditoria/impossivel, peca esclarecimento antes
- `needs_retry`: NUNCA use — se JSON falhar, e erro mecanico (parser cuida)
- `blocked`: NUNCA use — voce nao depende de recursos externos

Domain_status NAO se aplica a `kind: proposal`. Nao inclua o campo.
```

### Passo 4: Bloco "Payload.proposal — campos obrigatorios"

```markdown
## Payload (obrigatorio — 5 campos minimos)

`payload.proposal` DEVE conter:

| Campo            | Tipo               | Propósito                                                             |
|------------------|--------------------|-----------------------------------------------------------------------|
| `title`          | string             | Nome curto da proposta (max 80 chars). Usado pelo /design-twice em tabela comparativa de 3 variantes. |
| `summary`        | string             | 1-2 frases. O **o que** + **por que** condensado.                     |
| `constraints[]`  | string[]           | Lista de constraints respeitadas (do input + descobertas).            |
| `tradeoffs[]`    | `{axis, choice}[]` | Cada par axis (ex: "consistencia x latencia") + choice ("favorece X"). Min 1, ideal 2-3. |
| `recommendation` | string             | Qual alternativa voce recomenda + 1 razao.                            |
| `alternatives[]` | `{id, title, rejected_because}[]` | Min 1 alternativa rejeitada (a justificativa da escolha). |
```

### Passo 5: Bloco "Human_readable — 8 secoes preservadas"

```markdown
## Human Readable (markdown — 8 secoes obrigatorias)

`human_readable` DEVE conter, em markdown, as 8 secoes abaixo. Estas sao apresentacao para humano — `payload.proposal` ja carrega o estruturado para consumo automatico. NAO duplique informacao desnecessariamente; pode referenciar (ex: "ver `payload.proposal.tradeoffs`").

1. `## Context` — entendimento do problema (3-5 frases)
2. `## Constraints` — bullets, espelha `payload.proposal.constraints` mas pode adicionar nuance
3. `## Alternatives` — A, B, C (min 2, ideal 3). Cada uma: 1 paragrafo + bullets.
4. `## Tradeoffs` — narrativa por eixo, espelha `payload.proposal.tradeoffs`
5. `## Recommendation` — qual e por que (mais detalhe que `payload.proposal.recommendation`)
6. `## Risks` — bullets, max 5
7. `## Open Questions` — perguntas pro operador
8. `## References` — links/arquivos consultados
```

### Passo 6: Bloco "Reasoning — meta-observacao"

```markdown
## Reasoning (obrigatorio — minimo 20 chars, ideal >50)

`reasoning` e **meta**: o que voce notou que o input NAO previu.
NAO repete `human_readable`. NAO repete `payload.proposal`.

Ruim (passa min mas warning, copia summary):
> "Recomendo Redis com TTL adaptativo."

Bom (>50 chars, info nova fora do schema):
> "A constraint 'sem novas deps' do input conflita com a Recommendation natural (lib X). Tambem o problema admite solucao serverless que voce nao mencionou — incluida como Alternative B."
```

### Passo 7: Bloco "Output template" final

```markdown
## Output (obrigatorio JSON — sem code fences ao redor)

Emita exatamente um objeto JSON valido. NAO envolva em ```json ... ```. NAO adicione texto antes ou depois.

```
{
  "contract_version": "1.0",
  "agent": "design-explorer",
  "kind": "proposal",
  "status": "complete",
  "reasoning": "<meta-observacao, min 20 chars>",
  "payload": {
    "proposal": {
      "title": "<max 80 chars>",
      "summary": "<1-2 frases>",
      "constraints": ["..."],
      "tradeoffs": [{ "axis": "...", "choice": "..." }],
      "recommendation": "<qual + por que curto>",
      "alternatives": [{ "id": "B", "title": "...", "rejected_because": "..." }]
    }
  },
  "human_readable": "## Context\n...\n## Constraints\n...\n## Alternatives\n...\n## Tradeoffs\n...\n## Recommendation\n...\n## Risks\n...\n## Open Questions\n...\n## References\n...",
  "metadata": { "run_id": "<uuid>", "duration_ms": 0, "model": "<modelo>" }
}
```
```

### Passo 8: Re-ler `design-explorer.md` apos edicao

Confirmar:
- secao antiga "emita 8 secoes markdown" substituida (nao duplicada) pelo novo template JSON
- as 8 secoes seguem listadas mas agora dentro do bloco `human_readable`
- nao sobrou referencia a "status" ou "domain_status" no contexto de proposal

---

## Gotchas

- **G1 do plano (LLM malformado):** Critico — `design-explorer` hoje emite markdown puro. Passar para JSON com markdown embutido em `human_readable` exige escapar quebras de linha (`\n`). Instrucao no passo 7 e explicita. Se LLM falhar consistente, ajustar prompt para usar template literal com `\n` ao inves de quebra real.
- **G3 do plano (threshold reasoning):** Risco alto aqui de o LLM copiar `payload.proposal.summary` para `reasoning`. Passo 6 da exemplo ruim explicito justamente disso.
- **G-P02-02 (markdown e apresentacao valiosa):** As 8 secoes nao sao redundantes com `payload.proposal`. Sao **representacao paralela** para humano. Operador ainda quer ler "Context + Alternatives + Risks" formatado.
- **G-P02-03 (reasoning vs human_readable):** Confundir = perda do escape hatch. Documentar em fase-04 (migration guide) com exemplo contrastante.
- **G-P02-04 (proposal nunca needs_retry):** Documentado no passo 3.
- **Local (8 secoes podem variar nominalmente):** Nomes exatos das secoes hoje podem diferir do INVENTORY (ex: "Context" vs "Background"). Passo 1 instrui releitura para confirmar. Se diferentes, manter os nomes atuais — nao introduzir mudanca de UX no operador junto com mudanca de contrato.

---

## Verificacao

### TDD (simulacao — fixture concreta em fase-03)

- [ ] **RED:** Output atual (markdown puro 8 secoes) contra `parseAndDispatch()` → falha `INVALID_JSON` (parser tenta JSON, recebe markdown).
- [ ] **GREEN:** Output exemplo do passo 2 contra `parseAndDispatch()` → `{ ok: true, kind: "proposal" }`, sem warnings.

### Checklist

- [ ] `agents/design-explorer.md` lido completo ANTES da edicao
- [ ] 5 blocos novos presentes: Kind proposal, Payload campos obrigatorios, Human_readable 8 secoes, Reasoning meta-observacao, Output template
- [ ] 8 secoes do markdown preservadas integralmente em `human_readable` (sem perda de UX)
- [ ] `payload.proposal` tem os 5 campos minimos especificados (title, summary, constraints, tradeoffs, recommendation, alternatives)
- [ ] Exemplo de reasoning bom contrasta com ruim (copia summary)
- [ ] Nenhuma referencia residual a `domain_status` em contexto de proposal
- [ ] `agents/design-explorer.md` re-lido APOS edicao
- [ ] Anotacao em `MEMORY.md` se nomes das 8 secoes divergem do INVENTORY (registrar nomes reais)
- [ ] `bun run lint` limpo

---

## Criterio de Aceite

**Por maquina:**
- Output exemplo (passo 2) injetado em `parseAndDispatch()` retorna `{ ok: true, kind: "proposal" }` com `payload.proposal.alternatives.length >= 1`, sem warning de reasoning fraco.

**Por humano:**
- Operador lendo apenas `human_readable` (sem parsear JSON) recebe a mesma experiencia que tinha com markdown puro antigo — 8 secoes, mesmo nivel de detalhe.
- Revisor consegue prever quando `status` seria `needs_human` em vez de `complete` (resposta: input contradicente). Se nao conseguir, passo 3 nao foi claro o suficiente.

---

<!-- Gerado por /plan-feature em 2026-05-14 -->
