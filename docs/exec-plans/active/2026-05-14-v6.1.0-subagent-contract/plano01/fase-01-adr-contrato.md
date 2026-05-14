<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: ADR-0002 — Contrato de Subagentes v1

**Plano:** 01 — Fundacao do Contrato
**Sizing:** 0.5h
**Depende de:** Nenhuma (primeira fase, paralela com fase-02)
**Visual:** false

---

## O que esta fase entrega

ADR-0002 documentando as 10 decisoes tecnicas do PRD com alternativas rejeitadas e contexto. Vira referencia canonica de "por que o contrato e assim" para qualquer um que conteste o design no futuro.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/design-docs/ADR-0002-subagent-contract.md` | Create | ADR cobrindo as 10 decisoes do PRD (formato output, lifecycle, reasoning, kind enum, payload shape, big-bang, versionamento, localizacao, retry, reasoning threshold) |
| `docs/design-docs/index.md` | Modify | Adicionar entrada para ADR-0002 |

---

## Implementacao

### Passo 1: Confirmar numero do ADR

ADR mais recente em `docs/design-docs/` e `ADR-0001-manifest-checksums.md`. Proximo numero: **ADR-0002**.

```bash
ls docs/design-docs/ADR-*.md | sort | tail -5
# Esperado: ADR-0001-manifest-checksums.md
```

Se aparecer outro ADR-NNNN mais alto, ajustar para o proximo livre.

### Passo 2: Criar `docs/design-docs/ADR-0002-subagent-contract.md`

Estrutura ADR padrao do plugin (mesma do ADR-0001 — ler antes para casar tom/formato):

```markdown
# ADR-0002: Contrato de Subagentes v1

**Status:** Accepted
**Date:** 2026-05-14
**Deciders:** Luiz + AI
**Context:** Migracao agent-native v6.1.0, Eixo 1
**Related:** PRD `docs/exec-plans/active/2026-05-14-v6.1.0-subagent-contract/PRD.md`

---

## Contexto

11 dos 13 subagentes hoje retornam markdown com enum de dominio proprio (`SECURE/VULNERABILITIES_FOUND` vs `OPTIMIZED/ISSUES_FOUND` vs `COMPLIANT/NON-COMPLIANT`). Orquestrador generico e impossivel — cada skill consumidora precisa de regex+mapeamento custom. Decisao em dominio (severidade absoluta) cozida dentro da tool, sem espaco para `reasoning` livre, sem completion signal explicito de lifecycle.

Detalhes completos em `../exec-plans/active/2026-05-14-v6.1.0-subagent-contract/INVENTORY.md` e §Problema do PRD.

---

## Decisao

Adotar contrato canonico v1 com shape JSON unificado, lifecycle padronizado e `reasoning` obrigatorio. Migracao big-bang em 5 ondas dentro de branch isolado.

### Decisoes Especificas

| # | Decisao | Escolha | Alternativa Rejeitada | Razao |
|---|---------|---------|----------------------|-------|
| 1 | Formato de output | JSON estruturado + `human_readable` opcional | Markdown puro | Markdown nao parseavel sem regex; opcional preserva apresentacao sem custo |
| 2 | Granularidade do `status` | Lifecycle (4 valores) + `payload.domain_status` separado | Eixo unico de dominio | Eixo unico forca confusao; separacao permite handler generico mantendo expressividade |
| 3 | Campo `reasoning` | Obrigatorio, nao-vazio, prosa livre | Opcional / estruturado | Escape hatch destrava granularity (Every: "agent can say things you didn't schema") |
| 4 | `kind` enum | `audit \| mutation \| proposal \| verification` | Sem kind / por agente | 4 valores cobrem os 13 agentes; extensivel por v2 |
| 5 | Shape do `payload` por kind | Schema em `agents/_contract/v1.schema.json` (oneOf por kind) | Payload livre / schema por agente | oneOf permite handler generico sem reintroduzir parsing N |
| 6 | Estrategia de migracao | Big-bang, 5 ondas sequenciais, branch isolado ate Onda 5 verde | Incremental com backwards-compat | 13 agentes e pequeno; manter parser velho = debito permanente |
| 7 | Versionamento | `contract_version: "1.0"` literal fixo em v1 | Sem versao / semver completo | Campo declarativo permite v2 coexistir quando hora vier; custo zero hoje |
| 8 | Localizacao do schema | `agents/_contract/v1.schema.json` + doc em `docs/design-docs/subagent-contract-v1.md` | Inline no AGENTS_LIST.md | Schema proximo dos agentes facilita autoria; doc em design-docs e canonica |
| 9 | Retry policy default | 1 retry em `needs_retry`, depois escala para `needs_human` | Sem retry / infinito | 1 retry cobre flakes; mais vira loop ruim |
| 10 | Reasoning curto/vazio | Rejeita `<20` chars (erro `REASONING_TOO_SHORT`); warn `<50` chars (`REASONING_LIKELY_WEAK`) | Permitir vazio / apenas warn | 2 niveis distinguem "quebrou contrato" (rejeita) de "esta usando mal" (warning) |

---

## Consequencias

### Positivas

- Orquestrador generico passa a existir: `parseAndDispatch(output, kindHandlers)` substitui regex por agente.
- Adicionar auditor novo = zero mudanca em orquestradores (entra via `kind: audit`).
- `reasoning` obrigatorio forca agentes a sinalizar achados fora do schema.
- Lifecycle separado de dominio elimina ambiguidade `needs_retry` vs `VULNERABILITIES_FOUND`.

### Negativas

- Migracao big-bang exige janela curta dedicada (estimativa 2-3 dias, branch isolado).
- LLM nem sempre emite JSON valido — parser tolerante + retry mecanico mitiga, mas adiciona complexidade.
- Autores de subagente precisam aprender distincao lifecycle vs domain_status — migration guide cobre.

### Neutras

- Tamanho de payload JSON similar a markdown — sem impacto perceptivel de custo (PRD §Custo).
- `metadata.duration_ms` em todo output — telemetria fica em log local, sem dashboard.

---

## Alternativas Consideradas (rejeitadas)

1. **Manter markdown + padronizar enum de dominio.** Rejeitado: ainda exige regex; nao resolve falta de `reasoning`; nao acomoda `kind: mutation`.
2. **Backwards-compat com contrato antigo (dual-parser).** Rejeitado: 13 agentes e pequeno demais para justificar debito permanente; complica orquestradores.
3. **Schema por agente em vez de oneOf por kind.** Rejeitado: reintroduz parsing N (N agentes = N shapes); contraria objetivo de handler generico.
4. **`reasoning` opcional.** Rejeitado: opcional = sempre vazio na pratica; perde o escape hatch.
5. **Sem versionamento (`contract_version`).** Rejeitado: campo custa 0 hoje e destrava v2 sem refactor; trade-off favoravel.

---

## Referencias

- PRD: `docs/exec-plans/active/2026-05-14-v6.1.0-subagent-contract/PRD.md`
- Inventory: `docs/exec-plans/active/2026-05-14-v6.1.0-subagent-contract/INVENTORY.md`
- Doc canonica: `docs/design-docs/subagent-contract-v1.md` (criado em fase-02)
- Schema: `agents/_contract/v1.schema.json` (criado em fase-03)
- Every guide: "Agent-native Architectures" (Eixo 1 — completion signal, reasoning, parseable output, prompts as features, granularity)
```

### Passo 3: Atualizar `docs/design-docs/index.md`

Adicionar linha referenciando o novo ADR. Ler arquivo antes — pode ja ter um padrao de listagem.

```bash
cat docs/design-docs/index.md
```

Adicionar entrada no padrao existente:

```markdown
- [ADR-0002 — Contrato de Subagentes v1](../../../../design-docs/ADR-0002-subagent-contract.md) — JSON canonico + lifecycle + reasoning + oneOf por kind. Migracao big-bang em 5 ondas (v6.1.0).
```

---

## Gotchas

- **G8 do plano (Comment Provenance):** ADR e doc humano, nao precisa de comentario provenance inline. Continua valendo para codigo das fases seguintes.
- **Local:** O numero do ADR e *imutavel* depois de commitado. Se a fase-02 (paralela) decidir um numero por engano, alinhar antes de commitar.
- **Local:** Manter linguagem do ADR consistente com ADR-0001 (sem emojis, prosa direta, sem acentos no estilo "decisao" para casar o resto do repo).

---

## Verificacao

### TDD

Nao aplicavel — ADR e documento. "Teste" e revisao estrutural.

### Checklist

- [ ] Arquivo criado em `docs/design-docs/ADR-0002-subagent-contract.md`
- [ ] ADR contem **todas as 10 decisoes** do PRD §Decisoes Tecnicas (1 linha por decisao na tabela)
- [ ] Cada decisao tem **alternativa rejeitada** + razao (nao so a escolha)
- [ ] Secao **Alternativas Consideradas** lista 5 alternativas rejeitadas com justificativa
- [ ] Secao **Consequencias** separa positivas/negativas/neutras
- [ ] Referencias linkam PRD, INVENTORY, doc canonica futura e schema futuro
- [ ] `docs/design-docs/index.md` atualizado com entrada do ADR-0002
- [ ] Formato/tom consistente com `ADR-0001-manifest-checksums.md` (ler antes; sem emojis; sem acentos)
- [ ] `bun run harness:validate` passa (se ja checa estrutura de ADRs)

---

## Criterio de Aceite

**Por maquina:**
- `test -f docs/design-docs/ADR-0002-subagent-contract.md` retorna 0
- `grep -c "^| [0-9]* |" docs/design-docs/ADR-0002-subagent-contract.md` retorna >= 10 (10 linhas de decisoes na tabela)

**Por humano:**
- Revisor le o ADR e consegue responder "por que `reasoning` e obrigatorio?" sem abrir o PRD.
- Revisor le o ADR e consegue responder "por que nao manter markdown?" sem abrir o INVENTORY.

---

<!-- Gerado por /plan-feature subagente em 2026-05-14 -->
