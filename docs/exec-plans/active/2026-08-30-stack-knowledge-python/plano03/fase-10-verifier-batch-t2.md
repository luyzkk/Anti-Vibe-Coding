# Fase 10: Verifier Refined Batch T2 (9 átomos) + Fechamento do Plano

**Plano:** 03 — Atoms T2 (waves) + Verifier
**Sizing:** ~2h
**Depende de:** fases 01-09 (fan-in — os 9 átomos T2 escritos e commitados nas 3 waves)
**Visual:** false

---

## O que esta fase entrega

Verifier refined rodado sobre os 9 átomos T2 com gate ≥80% de rastreabilidade por átomo,
relatório `plano03/verifier-report-plano03.md` commitado, rework cirúrgico (se necessário),
MEMORY atualizado e PR do plano aberta.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/exec-plans/active/2026-08-30-stack-knowledge-python/plano03/verifier-report-plano03.md` | Create | Relatório do batch (formato do verifier-report-plano02.md) |
| `knowledge/python/atoms/*.md` (algum dos 9) | Modify (condicional) | Rework cirúrgico de claims reprovadas |
| `docs/exec-plans/active/2026-08-30-stack-knowledge-python/plano03/MEMORY.md` | Modify | Métricas, desvios, Notas para Planos Seguintes |
| `TODO.md` (raiz) | Modify (condicional) | Consolidação de excedentes de cap reportados pelas fases |

NÃO tocar `INDEX.md` (G11).

---

## Protocolo do Verifier (refined — regression obrigatória)

Protocolo herdado do compound
`docs/compound/2026-05-16-verifier-protocol-technical-sections-only.md` e calibrado nos
Planos 01-02. Por átomo:

1. Selecionar **5 claims técnicas** — EXCLUSIVAMENTE das 3 seções técnicas.
2. Rastrear cada claim a uma passagem específica da(s) fonte(s) do `sources:` do átomo
   (literal ou paráfrase; paráfrase cross-idioma conta — G6).
3. Gate: **≥80% rastreáveis por átomo** (≥4/5). Abaixo disso → reprova, rework cirúrgico.

Cláusula VERBATIM no prompt do verifier (não parafrasear — G2):

> "TECHNICAL CLAIMS (source-traceable, MUST appear in source) live in: Padrões sênior,
> Anti-padrões, Critérios de decisão. ATOM-STRUCTURAL METADATA lives in: Quando consultar
> (use-case framing) and Referências externas (cross-skill linking) — DO NOT evaluate these
> sections for source traceability."

Checks adicionais que o verifier deste batch DEVE incluir (por átomo, além das 5 claims):

- Corpo ≤200 linhas (hard cap — reprova automática acima)
- 4 seções obrigatórias presentes; zero placeholders `[A DEFINIR]`
- Nenhuma claim marcada "contestado" na fonte promovida a regra dura (G3 — spot-check;
  atenção especial ao repository pattern Percival vs Bayer na fase-03)

---

## Implementacao

### Passo 1: Pré-flight do fan-in

Confirmar no código: 9 átomos T2 commitados (commits 1-3 das waves), `harness:validate` verde,
`verifier-report-plano02.md` disponível como formato de referência.

### Passo 2: Rodar o verifier batch (subagente, 1 por átomo ou lotes de 3)

Prompt por átomo: path do átomo + path(s) da(s) fonte(s) do `sources:` + protocolo acima com
a cláusula verbatim. Espelhar a estrutura de invocação do Plano 02 fase-06 (registrada no
MEMORY/report daquele plano). Rodar em lotes de 3 (mesmo agrupamento das waves) para
facilitar o gate do Passo 4.

### Passo 3: Checks direcionados do batch (defeitos de wave)

Além das claims, o batch re-checa as regras específicas deste plano:

- **fase-02:** grep GraphQL/gRPC/tRPC = zero conteúdo (G15/D6)
- **fase-09:** IDs `PERF-*` presentes + spot-check de 3 IDs contra a fonte (G16)
- **fases 03/04:** fronteira do split — grep cruzado (termos de migração no átomo ORM e
  termos de runtime no átomo migrations = 0) (G14)
- **fase-06:** grep flags mypy strict = 0 (dedup com typing — G17)
- **presença da anti-drift clause:** conferir que os prompts usados nas fases 01-09
  continham a cláusula verbatim (R8 — plan-verifier confirma antes de aceitar o batch)

### Passo 4: Política de loop/polish (G12)

- **0-1 átomo reprovado na v1:** rework cirúrgico APENAS das claims apontadas (não reescrever
  o átomo), re-rodar o verifier só no átomo afetado (v2).
- **≥2 átomos reprovados na v1:** PARAR. Revisar o prompt do verifier (falso-negativo em seção
  editorial? — compound verifier-protocol) E/OU suspeitar de drift sistemático de extrator
  (compound anti-drift, Prevention #4: ≥2 claims "não encontrada" em runs paralelos do mesmo
  batch = suspeitar do prompt, não de bug pontual). Só depois rodar v2. Registrar o diagnóstico
  no MEMORY.
- **Polish nunca vira reescrita:** rework é cirúrgico por claim; estrutura, seções e frases
  rastreáveis aprovadas não se tocam.

### Passo 5: Relatório

Escrever `plano03/verifier-report-plano03.md` no formato do `verifier-report-plano02.md`:
por átomo — 5 claims, veredicto por claim (rastreável/não + passagem da fonte), score,
pass/fail no gate, ciclos (v1/v2/v3), resultado dos checks direcionados do Passo 3.

### Passo 6: Fechamento do plano

1. Consolidar excedentes de cap das fases no `TODO.md` (se ainda não registrados).
2. Atualizar `MEMORY.md`: métricas (fases, retries), desvios, e **Notas para Planos
   Seguintes** (mínimo: 9/9 verificados + link do report; sqlalchemy flagged p/ audit D11;
   GraphQL/gRPC/tRPC intocados p/ Plano 04 fase-03; ajustes de prompt herdados pelo Plano 04).
3. `bun run harness:validate` + `bun test` + `bun run typecheck` verdes.
4. Commit 4 (`verifier-report` + MEMORY + TODO; rework entra aqui ou em commit
   `fix(knowledge):` dedicado se o diff for grande).
5. Abrir PR da branch `feat/stack-knowledge-python-plano03` (G9) — descrição lista os 9
   átomos, o resultado do verifier e os excedentes registrados.

---

## Gotchas

- **G2 do plano:** cláusula do verifier VERBATIM no prompt — embutida acima.
- **G12 do plano (crítico aqui):** com 9 átomos, o gate "≥2 falhas → parar" é mais provável de
  disparar do que nos planos anteriores. Respeitá-lo evita o loop cego que custou ~30min no
  precedente Node.
- **G3 do plano:** o spot-check de "contestado" tem alvo conhecido: repository pattern
  (fase-03). Se aparecer como regra dura, é reprova mesmo com 5/5 claims rastreáveis.
- **G14/G15/G16/G17 do plano:** os checks direcionados do Passo 3 existem porque claims
  rastreáveis podem ainda assim violar fronteiras de escopo — o verifier de claims não pega
  isso sozinho.
- **Local:** o átomo da fase-02 tem 2 fontes e o da fase-05 também — o verifier deve receber
  AMBOS os paths; claim rastreável a qualquer uma das fontes declaradas conta como rastreável.
- **Local:** path da fonte da fase-09 tem espaço/parênteses (`deep-research-report (1).md`) —
  quoting nos comandos do verifier.

---

## Verificacao

### Checklist

- [ ] Verifier rodado nos 9 átomos; 5 claims/átomo, só das 3 seções técnicas
- [ ] Gate ≥80% por átomo: 9/9 pass (após rework, se houve)
- [ ] Política G12 respeitada (se ≥2 falhas na v1: diagnóstico registrado no MEMORY antes da v2)
- [ ] Checks direcionados: G15 (fase-02), G16 (fase-09), G14 (fases 03/04), dedup G17
  (fase-06), anti-drift presente nos prompts das fases 01-09 (R8)
- [ ] `verifier-report-plano03.md` commitado no formato do report do Plano 02
- [ ] Excedentes de cap consolidados no `TODO.md` (ou nota de que não houve)
- [ ] `MEMORY.md` atualizado com Notas para Planos Seguintes
- [ ] `bun test` + `bun run typecheck` + `bun run harness:validate` verdes
- [ ] PR aberta da branch `feat/stack-knowledge-python-plano03` (nunca main direto — G9)

---

## Criterio de Aceite

**Por maquina:**
- `verifier-report-plano03.md` existe e registra 9/9 átomos com score ≥80%
- `bun run harness:validate` verde; suite completa verde

**Por humano:**
- Dev revisa o report (amostra de 2-3 claims por átomo contra as fontes, se desejar) e aprova
  a PR do plano
- Plano 04 desbloqueado: T3 + INDEX final + audit humano (sqlalchemy deste plano na lista D11)

---

<!-- Gerado por /plan-feature em 2026-08-30 -->
