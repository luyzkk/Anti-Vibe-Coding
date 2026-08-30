<!--
Princípio universal #5 — Comment Provenance.
Fase de verificação — sem código de runtime; outputs são o verifier-report e eventual
rework cirúrgico de átomos.
-->

# Fase 05: Verifier Refined Batch T3 (3 átomos) + Checks Direcionados

**Plano:** 04 — Atoms T3 + INDEX Final + Audit Humano + E2E Full
**Sizing:** ~1.5h
**Depende de:** fases 01-03 (fan-in dos 3 átomos T3) — paralelizável com a fase-04
**Visual:** false

---

## O que esta fase entrega

Gate de fidelidade fechado para o batch T3: verifier refined sobre `background-jobs-and-queues`,
`debugging-pdb-debugpy` e `graphql-grpc-contracts` (≥80% de claims rastreáveis por átomo) +
3 checks direcionados deste plano (CA-10 Hermes zero; exclusividade GraphQL; dedup jobs vs
piloto), com relatório commitado em `plano04/verifier-report-plano04.md`. Com isso, 18/18
átomos passaram pelo verifier — pré-condição do audit humano (fase-06).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/exec-plans/active/2026-08-30-stack-knowledge-python/plano04/verifier-report-plano04.md` | Create | Relatório do batch (3 átomos × 5 claims + checks direcionados) |
| `docs/exec-plans/active/2026-08-30-stack-knowledge-python/plano04/MEMORY.md` | Modify | Métricas de ciclos + observações de calibração |
| `knowledge/python/atoms/*.md` (algum dos 3) | Modify (condicional) | Rework cirúrgico de claims reprovadas |

---

## Implementacao

### Passo 1: Spawnar 1 verifier subagente por átomo (paralelo, read-only)

Formato de referência do relatório: `plano03/verifier-report-plano03.md` (e o do Plano 02).

Prompt-esqueleto do verifier (por átomo). O bloco de protocolo em inglês abaixo está copiado
VERBATIM de `docs/compound/2026-05-16-verifier-protocol-technical-sections-only.md` (prompt v3
do Plano 04 Node) — copiar literalmente, NUNCA parafrasear (G2, R8):

```text
Você é subagente verifier de source-traceability (read-only, contexto limpo).

ÁTOMO: F:\Projetos\Anti-Vibe-Coding\knowledge\python\atoms\{slug}.md
FONTES (as declaradas no frontmatter `sources:` do átomo, resolvidas para
F:\Projetos\Anti-Vibe-Coding\Infos\knowledge\Python\...): {lista}

PROTOCOLO REFINED:
TECHNICAL CLAIMS (source-traceable, MUST appear in source) live in: Padrões sênior,
Anti-padrões, Critérios de decisão. ATOM-STRUCTURAL METADATA lives in: Quando consultar
(use-case framing) and Referências externas (cross-skill linking) — DO NOT evaluate these
sections for source traceability.

PROCEDIMENTO:
1. Selecione 5 claims técnicas do átomo — APENAS das 3 seções técnicas acima; distribua entre
   as 3 seções (mínimo 1 de cada, se a seção tiver claims).
2. Para cada claim, localize a passagem específica da fonte que a sustenta (literal ou
   paráfrase fiel). Para o átomo debugging-pdb-debugpy: a fonte é em INGLÊS — a passagem
   original em EN conta como rastreio válido de claim traduzida (paráfrase cross-idioma).
3. Para claims com IDs de regra citados (formato "regra N.N" — átomo de jobs): use o ID como
   atalho — confira que o ID existe na fonte E que o conteúdo da claim bate com a seção do ID.
4. FRONTEIRA DE SEÇÃO (átomos de jobs e graphql): a claim deve rastrear às seções DECLARADAS
   nos limites da fase (jobs: compass 63884763 §4-5/§14-15, compass 9b12d328 §14, report2
   pilar BackgroundTasks; graphql: report3 seção "GraphQL e RPC" + Conflitos abertos). Claim
   rastreável apenas a OUTRA seção da mesma fonte conta como NÃO ENCONTRADA (vazamento de
   fronteira).
5. Veredito por claim: RASTREADA (cite a passagem/linha da fonte) ou NÃO ENCONTRADA (explique
   o que buscou).
6. CHECKS ADICIONAIS (reportar; os dois primeiros REPROVAM o átomo por si só):
   - Corpo >200 linhas → REPROVA (hard cap, independente das claims)
   - {check direcionado do átomo — ver Passo 2} falhou → REPROVA
   - Claim que a fonte marca como "contestado"/Conflito aberto apresentada como regra dura →
     conta como falha
   - Número concreto divergente do valor da fonte → conta como falha

OUTPUT: tabela claim → seção → veredito → passagem da fonte; resultado dos checks adicionais;
score final N/5; veredito do átomo: PASS (≥4/5, i.e. ≥80% E checks adicionais ok) ou FAIL.
```

### Passo 2: Checks direcionados (1 por átomo, embutidos no prompt de cada verifier)

| Átomo | Check direcionado |
|---|---|
| `debugging-pdb-debugpy` | **CA-10 re-check:** rodar `grep -i "hermes\|tui_gateway\|run_agent\|_SlashWorker"` no átomo → ZERO matches. Qualquer hit REPROVA o átomo (mesmo com 5/5 claims). |
| `graphql-grpc-contracts` | **Exclusividade (G15):** grep `OpenAPI\|webhook\|operationId` → zero; e leitura cruzada com `knowledge/python/atoms/api-design-and-contracts.md` — nenhuma claim REST duplicada do átomo do Plano 03 fase-02 ("REST" permitido só como comparativo em Critérios de decisão). |
| `background-jobs-and-queues` | **Dedup (G17/G24):** nenhuma claim re-ensina mecanismo TaskGroup/event loop/threadpool (dono: piloto `async-and-concurrency` — menção só como referência); nenhuma claim afirma fila "dominante/superior" (Lacuna declarada do report2). |

### Passo 3: Consolidar `verifier-report-plano04.md`

```markdown
# Verifier Report — Plano 04 (Batch T3)

**Data:** {YYYY-MM-DD}
**Protocolo:** refined (compound 2026-05-16-verifier-protocol-technical-sections-only)
**Gate:** ≥80% (4/5 claims) por átomo + checks direcionados

| Átomo | v1 | v2 | v3 | Check direcionado | Veredito final |
|---|---|---|---|---|---|
| background-jobs-and-queues | {N}/5 | — | — | dedup async/lacuna: OK/FALHOU | PASS/FAIL |
| debugging-pdb-debugpy | {N}/5 | — | — | grep Hermes: 0 hits / {N} hits | PASS/FAIL |
| graphql-grpc-contracts | {N}/5 | — | — | exclusividade REST: OK/FALHOU | PASS/FAIL |

## Claims reprovadas e rework aplicado
{tabela: átomo → claim → motivo → fix (rework cirúrgico ou remoção)}

## Fechamento da feature (18/18)
Com este batch: 18/18 átomos verificados (1 piloto + 5 T1 + 9 T2 + 3 T3). Reports:
plano01 fase-03 (piloto), verifier-report-plano02.md, verifier-report-plano03.md, este.

## Observações para o audit humano (fase-06)
{qualquer claim borderline que mereça atenção do dev nos 3 átomos flagged}
```

### Passo 4: Rework cirúrgico (se houver FAIL)

- Claim NÃO ENCONTRADA → corrigir para o que a fonte diz, ou remover (nunca "defender").
- Check direcionado falhou → correção é obrigatória e re-grep antes da v2.
- Re-rodar o verifier SÓ no átomo afetado (v2). Registrar ciclos na tabela.
- **G12 — gate de loop:** se ≥2 dos 3 átomos falharem a v1, PARAR antes de qualquer v2:
  revisar o prompt do verifier E suspeitar de drift sistemático de extrator (compound
  anti-drift, Prevention #4). Corrigir causa raiz, registrar DI/GT no MEMORY, só então v2.

### Passo 5: Fechar a fase

1. Atualizar `plano04/MEMORY.md`: métricas (ciclos, rework) + observações para a fase-06.
2. `bun run harness:validate` (G10) + `bun test` (nada de código mudou — suite deve seguir
   verde; se a fase-04 já commitou, o teste RF15 também roda aqui).
3. Commit (commit 3 do plano — pode aguardar e agrupar com os fixes de audit da fase-06,
   regra de commits do README): `verifier-report-plano04.md` + MEMORY + rework de átomos.

---

## Gotchas

- **G2 do plano:** protocolo VERBATIM — o bloco em inglês é o prompt v3 validado; parafrasear
  reintroduz o false-negative em seções editoriais que a compound documenta.
- **G12 do plano:** ≥2 FAIL na v1 = parar e recalibrar ANTES de v2 (custo documentado de
  ignorar: ~30min de loop cego no Plano 04 Node).
- **Local — check direcionado reprova sozinho:** diferente das claims (gate 4/5), os checks
  CA-10 e exclusividade são binários — 1 hit reprova. Não fazer média.
- **Local — fronteira de seção (item 4 do protocolo):** novidade deste batch — os átomos de
  jobs e graphql destilam SUBCONJUNTOS de fontes usadas por outros átomos; claim rastreável
  só fora da fronteira é vazamento, não fidelidade.
- **G6 do plano:** debugging tem fonte EN — o verifier já está instruído a aceitar paráfrase
  cross-idioma; não reprovar por idioma.
- **Local — verifiers em paralelo são read-only:** os 3 rodam simultâneos; rework é
  sequencial por átomo afetado.
- **Local — NÃO reauditar os 15 anteriores:** o batch desta fase são os 3 T3. Os demais já
  passaram nos seus planos.

---

## Verificacao

### TDD (adaptado — esta fase É o gate)

- [ ] **Gate de fidelidade:** 3/3 átomos PASS (≥4/5 claims + check direcionado ok)
- [ ] **Gate de loop respeitado:** se houve ≥2 FAIL em v1, existe DI/GT no MEMORY documentando
      a recalibração antes da v2

### Checklist

- [ ] `verifier-report-plano04.md` existe: tabela 3 átomos, coluna de check direcionado,
      seção "Fechamento da feature (18/18)" e observações para a fase-06
- [ ] Grep CA-10 re-executado e registrado no report (zero hits)
- [ ] Nenhum átomo >200 linhas passou
- [ ] Claims de Conflito aberto/contestado conferidas como notas, não regras duras (G3)
- [ ] `plano04/MEMORY.md` atualizado (métricas + observações)
- [ ] `bun run harness:validate` e `bun test` verdes; `git status` sem `Infos/` staged (G1)

---

## Criterio de Aceite

**Por maquina:**
- `verifier-report-plano04.md` commitado com 3× PASS; nenhum `FAIL` como veredito final
- `grep -i "hermes\|tui_gateway\|run_agent\|_SlashWorker" knowledge/python/atoms/debugging-pdb-debugpy.md`
  → zero matches

**Por humano:**
- Leitura do report: rework foi real (claims corrigidas contra a fonte, não re-rotuladas);
  as observações para a fase-06 dão ao dev pontos concretos de atenção

---

<!-- Gerado por /plan-feature em 2026-08-30 -->
