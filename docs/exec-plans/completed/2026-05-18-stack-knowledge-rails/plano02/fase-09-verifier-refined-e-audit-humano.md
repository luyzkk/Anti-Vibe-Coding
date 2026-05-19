<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only (markdown). Sem código TS, sem comentário inline em runtime.
O prompt do verifier vive nesta fase como spec, não como código.
-->

# Fase 09: Verifier refined batch A+B parcial + audit humano CA-08 (2 átomos flagged)

**Plano:** 02 — Batch A T1 + Batch B parcial T2
**Sizing:** 2.5h (8 verifiers em paralelo ~45min + audit humano 2 átomos ~60min + retrabalho buffer ~45min)
**Depende de:** fase-01 a fase-08 (todos os 8 átomos escritos)
**Visual:** false

---

## O que esta fase entrega

Gate de qualidade do Batch A T1 + Batch B parcial T2 (CA-08): 8 subagentes verifier refined rodam em paralelo (1 por átomo), auditando APENAS as 3 seções técnicas (`Padrões sênior` + `Anti-padrões` + `Critérios de decisão`) com threshold ≥80% das claims rastreáveis para passagem específica das fontes em `sources:`. Em seguida, **Luiz** revisa pessoalmente os 2 átomos flagged CA-08:
- `active-record-fundamentals.md` (T1, fase-01)
- `action-view-and-hotwire.md` (T2, fase-06)

Assinatura em STATE.md global da feature: bloco `## Audit Humano CA-08 (Plano 02)` com linha por átomo: `slug | tier | Aprovado por Luiz em YYYY-MM-DD | Notas`. Se algum verifier OU audit humano reprovar, abre retrabalho na fase do átomo + re-roda fase-09 parcial. Veredito final em `plano02/MEMORY.md` como DI-1.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/rails/atoms/active-record-fundamentals.md` | Read | input do verifier (fase-01) + audit humano |
| `docs/knowledge/rails/atoms/active-record-migrations-safety.md` | Read | input do verifier (fase-02) |
| `docs/knowledge/rails/atoms/action-controller-and-routing.md` | Read | input do verifier (fase-03) |
| `docs/knowledge/rails/atoms/security-csrf-and-brakeman.md` | Read | input do verifier (fase-04) |
| `docs/knowledge/rails/atoms/rspec-and-minitest.md` | Read | input do verifier (fase-05) |
| `docs/knowledge/rails/atoms/action-view-and-hotwire.md` | Read | input do verifier (fase-06) + audit humano |
| `docs/knowledge/rails/atoms/active-job-and-solid-queue.md` | Read | input do verifier (fase-07) |
| `docs/knowledge/rails/atoms/caching-with-rails.md` | Read | input do verifier (fase-08) |
| `docs/exec-plans/active/2026-05-18-stack-knowledge-rails/STATE.md` | Modify | adicionar bloco `## Audit Humano CA-08 (Plano 02)` com assinatura Luiz |
| `docs/exec-plans/active/2026-05-18-stack-knowledge-rails/plano02/MEMORY.md` | Modify | registrar veredito final como DI-1 |

---

## Implementacao

### Passo 1: Spawn 8 subagentes verifier refined em paralelo (1 por átomo)

Prompt do verifier (verbatim — usar este prompt sem modificações; inclui texto LITERAL da compound lesson `2026-05-16-verifier-protocol-technical-sections-only.md`):

````
Você é um subagente verificador isolado, sem contexto prévio do projeto.
Sua única tarefa: validar fidelidade de um átomo Markdown contra suas fontes em `sources:`.

INPUT:
- Caminho do átomo: docs/knowledge/rails/atoms/{slug}.md
- Caminhos das fontes (extraídos do frontmatter `sources:` do próprio átomo):
  claude-code/knowledge/Rails/{pasta-canonica}/{arquivo}.md
  (Compass artifacts entram com nome completo: compass_artifact_wf-{uuid}_text_markdown.md)

PROTOCOLO REFINED (copy verbatim da compound lesson
`docs/compound/2026-05-16-verifier-protocol-technical-sections-only.md`):

> "TECHNICAL CLAIMS (source-traceable, MUST appear in source) live in: Padrões sênior, Anti-padrões,
> Critérios de decisão. ATOM-STRUCTURAL METADATA lives in: Quando consultar (use-case framing) and
> Referências externas (cross-skill linking) — DO NOT evaluate these sections for source traceability."

Adicionar regra Rails-specific:
> "Se o átomo contém a seção `## API-only mode` (apenas em action-controller-and-routing e
> security-csrf-and-brakeman), trate-a como SCAFFOLDING EDITORIAL (D7). NÃO audite source
> traceability nessa seção — é callout para apps API-only, não claim técnica do átomo."

PASSOS:
1. Leia o átomo na íntegra.
2. Leia as fontes listadas no frontmatter `sources:` na íntegra. (Se uma fonte não existir, abortar
   e reportar ERROR — fonte fantasma é blocker.)
3. Selecione 5 claims aleatórias do átomo, distribuídas APENAS entre as 3 seções técnicas:
   - Padrões sênior (priorizar — maior densidade técnica)
   - Anti-padrões
   - Critérios de decisão
   Claim = afirmação técnica concreta (ex: "Solid Queue é o adapter default do ActiveJob em Rails 8";
   "Strong params previnem mass-assignment via whitelist explícita").
4. NUNCA selecione claims de: Quando consultar, Referências externas, API-only mode (se existir),
   título, frontmatter. Essas seções são EDITORIAL/SCAFFOLDING — não rastreáveis ao source por design.
5. Para CADA claim selecionada, identifique a PASSAGEM ESPECÍFICA da fonte que a sustenta. Reporte:
   - Claim: <texto exato do átomo>
   - Seção origem: <Padrões sênior | Anti-padrões | Critérios de decisão>
   - Citação da fonte: <transcrever 1-3 parágrafos relevantes da fonte; identificar arquivo e linhas se possível>
   - Veredito: rastreada | parafrase aceitavel | nao encontrada
6. Calcule taxa: (rastreada + parafrase aceitavel) / 5.
7. Reporte PASS se taxa >= 0.80 (4/5 ou 5/5). FAIL caso contrário, com lista das claims problemáticas.

REGRAS:
- Não invente passagem. Se não achar, marque "nao encontrada" e diga o que procurou.
- Paráfrase aceitável = mesma ideia técnica em palavras diferentes. Paráfrase com mudança de
  semântica é "nao encontrada".
- Não consulte conhecimento prévio sobre Rails — só as fontes importam.
- Se a fonte declarada em `sources:` não existe (arquivo not found), reportar como ERROR de
  integridade — NÃO tentar usar outra fonte como substituto.

OUTPUT: relatório markdown com 5 entradas (1 por claim) + veredito final PASS/FAIL + tabela
de resumo (claim N | seção | veredito).
````

**Spawn 8 subagentes em paralelo** (uma invocação por átomo). Cada subagente:

- Recebe `{slug}` do átomo
- Lê o átomo + extrai paths das fontes em `sources:`
- Lê todas as fontes listadas
- Produz relatório no formato acima
- Retorna PASS ou FAIL + relatório

**Mapeamento slug → fase:**

| slug | fase | tier |
|------|------|------|
| active-record-fundamentals | fase-01 | T1 (FLAGGED) |
| active-record-migrations-safety | fase-02 | T1 |
| action-controller-and-routing | fase-03 | T1 |
| security-csrf-and-brakeman | fase-04 | T1 |
| rspec-and-minitest | fase-05 | T1 |
| action-view-and-hotwire | fase-06 | T2 (FLAGGED) |
| active-job-and-solid-queue | fase-07 | T2 |
| caching-with-rails | fase-08 | T2 |

Salvar relatórios em `tmp/verifier-batch-rails-02/{slug}-report.md` (descartar após fase-09 fechar — não commitar).

### Passo 2: Audit humano CA-08 — 2 átomos flagged (Luiz)

Após os 8 verifiers retornarem PASS, **Luiz** revisa pessoalmente os 2 átomos flagged (D14, D19):

#### Átomo 1: `active-record-fundamentals.md` (T1) — `flagged CA-08`

Checklist humano (~30min):

- [ ] Frontmatter completo: 8 campos base + `rails_versions: ['>=7.1']` na ordem correta
- [ ] Skeleton respeitado: 5 seções na ordem (Quando consultar / Padrões sênior / Anti-padrões / Critérios de decisão / Referências externas — sem API-only neste átomo)
- [ ] `wc -l` ≤ 200 (alvo ~150)
- [ ] Zero placeholders `[A DEFINIR]`
- [ ] Patterns lem como decisões sênior de produção — NÃO bullets genéricos de Rails Guides
- [ ] Cross-check de **3 claims aleatórias** das seções técnicas contra paths citados em `sources:`:
  - Para cada claim aleatória: abrir o arquivo source citado e localizar passagem que sustenta
  - Marcar: ✅ rastreada | ⚠️ parafrase aceitável | ❌ não encontrada (falha)
  - 3/3 rastreáveis → aprovar; ≤2/3 → reprovar e abrir retrabalho da fase-01
- [ ] Triggers do frontmatter coerentes com conteúdo (ex: se "STI" está em triggers, deve haver pattern sobre STI)
- [ ] Nenhum pattern duplica conteúdo cross-stack de `/api-design` (ângulo Rails-specific — `includes` vs `preload` vs `eager_load` — é claro)

#### Átomo 2: `action-view-and-hotwire.md` (T2) — `flagged CA-08`

Checklist humano (~30min): mesma estrutura do Átomo 1, com cross-check específico:

- [ ] Patterns Hotwire (Turbo Frames/Streams, Stimulus) lem como Rails 7+ idiomáticos, não tutorial Rails Guides
- [ ] Cross-check de 3 claims aleatórias contra `sources:` (compass `a0aa55c4` + `8afc0f40` cobrem Hotwire)
- [ ] Triggers cobrem keywords reais: `hotwire`, `turbo frames`, `turbo streams`, `stimulus`, `form_with`

### Passo 3: Assinatura em STATE.md global da feature

Após Luiz aprovar (ou reprovar) os 2 átomos, adicionar bloco no STATE.md global da feature (`docs/exec-plans/active/2026-05-18-stack-knowledge-rails/STATE.md`):

```markdown
## Audit Humano CA-08 (Plano 02)

| Átomo | Tier | Aprovado por Luiz em | Notas |
|-------|------|---------------------|-------|
| active-record-fundamentals | T1 | YYYY-MM-DD | {ex: "OK — 3/3 claims rastreadas em rails-stack-conventions/PATTERNS.md e rails-code-review/PITFALLS.md"} |
| action-view-and-hotwire | T2 | YYYY-MM-DD | {ex: "OK — Turbo Streams pattern validado contra compass a0aa55c4 §3"} |
```

Se reprovar: adicionar linha com `Reprovado por Luiz em YYYY-MM-DD | Motivo: ... | Retrabalho fase-NN aberto`.

### Passo 4: Veredito do batch em MEMORY.md (DI-1)

Adicionar entrada em `plano02/MEMORY.md > Decisoes de Implementacao`:

```markdown
- **DI-1:** Batch A T1 + Batch B parcial T2 {aprovado | reprovado} em YYYY-MM-DD
  - Verifier refined: {8/8 PASS | N/8 PASS, falhas em <slugs>}
  - Audit humano CA-08: {2/2 OK (active-record-fundamentals + action-view-and-hotwire) | falha em <slug>: <motivo>}
  - Total claims auditadas: 40 (8 átomos × 5 claims cada)
  - Taxa global rastreabilidade: {N/40 rastreáveis ou parafraseaveis} = {%}
  - Próximo passo: {desbloqueia Plano 03 fase-01..05 + fase-06 (INDEX final) | retrabalho em fase-NN}
```

### Passo 5: Retrabalho condicional

Se algum átomo falhar verifier OU audit humano:

1. Identificar a fase do átomo afetado (fase-01..08)
2. Re-executar a fase (revisar conteúdo, ajustar claims contra fonte com prompt anti-drift literal reforçado)
3. Re-rodar **apenas a invocação do verifier** para esse átomo + (se flagged) re-audit humano
4. Atualizar STATE.md e MEMORY.md DI-1 com nova rodada (DI-1 → DI-1-revisao-1)

Se **múltiplos átomos falharem** (≥2/8), revisar prompt do extrator OU do verifier (pode estar permissivo ou estrito demais) antes de re-rodar — registrar mudança em MEMORY.md como GT-N (gotcha).

---

## Gotchas

- **G3 do plano (verifier refined audita só seções técnicas):** o prompt do verifier OBRIGA citar passagem específica da fonte para cada claim DAS 3 SEÇÕES TÉCNICAS (Padrões sênior + Anti-padrões + Critérios de decisão). Se o verifier auditar bullets de "Quando consultar" ou "Referências externas" ou "API-only mode", está aplicando o protocolo errado — REJEITAR o relatório e re-spawnar com prompt reforçado.

- **G2 do plano (anti-drift na fase de extração):** se o verifier marcar ≥2 átomos como FAIL na v1, suspeitar de **drift do extrator** (não bug pontual em 1 átomo). Antes de re-rodar v2, conferir se o prompt do extrator (fases 01-08) realmente colou o texto LITERAL da compound lesson `2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md`. Se foi parafraseado, retrabalho do prompt antes de rework dos átomos.

- **CA-08 humano é bloqueante:** sem assinatura de Luiz nos 2 átomos flagged, CA-08 não está cumprido — bloquear Plano 03 fase-01.

- **G7 do plano (API-only é scaffolding):** fases 03 e 04 têm seção `## API-only mode`. O prompt do verifier explicita: NÃO auditar essa seção. Se verifier marcar claim de "API-only" como "não encontrada", false-positive — confirmação da G7.

- **Paralelismo dos 8 verifiers:** invocações isoladas evitam context bleed. NÃO usar 1 subagente para auditar os 8 átomos em sequência (degradação de contexto + viés cross-átomo). Cada subagente é fresh-context.

- **Relatórios do verifier devem ficar em arquivo temporário:** salvar em `tmp/verifier-batch-rails-02/{slug}-report.md`. Não commitar — descartar após fase-09 fechar. Audit trail real fica em STATE.md (audit humano) + MEMORY.md (DI-1).

- **Fonte fantasma é blocker:** se algum `sources:` aponta para arquivo que não existe (ex: dedup do Plano 01 deletou o lado que o extrator citou), o verifier reporta ERROR. Causa raiz: extrator não leu STATE.md global para confirmar fonte canônica. Fix: re-rodar extrator com STATE.md atualizado.

- **Local — divergência entre verifier e audit humano:** se verifier aprova (5/5) mas humano reprova (≤2/3 cross-check), priorizar audit humano. Compound lesson `2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` parágrafo 5 documenta: "subagente fresh-context não é equivalente a senior engineer com source aberta". Humano fecha o loop.

---

## Verificacao

### Conteúdo (content-only, gate de qualidade)

### Checklist

- [ ] 8 invocações de verifier refined concluídas (1 por átomo) — paralelas
- [ ] Cada relatório do verifier contém: 5 claims selecionadas APENAS de Padrões sênior + Anti-padrões + Critérios de decisão; citação da fonte por claim; veredito por claim; veredito final PASS/FAIL
- [ ] Cada relatório PASS tem taxa ≥80% (4/5 ou 5/5)
- [ ] Cada FAIL tem lista de claims problemáticas + abre retrabalho na fase do átomo
- [ ] Audit humano de **2 átomos flagged** concluído por Luiz: `active-record-fundamentals` + `action-view-and-hotwire`
- [ ] Cross-check humano: 3 claims aleatórias por átomo flagged → 3/3 rastreáveis para aprovar
- [ ] Bloco `## Audit Humano CA-08 (Plano 02)` adicionado ao STATE.md global com assinatura "Aprovado por Luiz em YYYY-MM-DD" para os 2 átomos
- [ ] Veredito do batch registrado em MEMORY.md como DI-1 (data + resultado por átomo + taxa global)
- [ ] Se algum átomo falhou: retrabalho aberto + re-verifier rodado + DI-1 atualizada
- [ ] CA-08 (PRD + PLAN.md) marcado como cumprido para os 2 átomos flagged deste plano (terceiro átomo flagged `action-cable-and-realtime` fica para Plano 03 fase-07)

---

## Criterio de Aceite

**Por maquina:**

- 8 arquivos em `tmp/verifier-batch-rails-02/{slug}-report.md` contendo o relatório de cada verifier
- `grep "Veredito final: PASS"` em todos os 8 relatórios retorna 8 matches (após retrabalho se necessário)
- STATE.md global contém bloco `## Audit Humano CA-08 (Plano 02)` com 2 linhas (active-record-fundamentals + action-view-and-hotwire)
- MEMORY.md contém entrada `DI-1` com `Batch A T1 + Batch B parcial T2 aprovado em YYYY-MM-DD`
- `wc -l` em cada um dos 8 átomos retorna entre 120 e 200
- `grep -c '\[A DEFINIR\]'` em cada átomo retorna 0
- `bun run harness:validate` passa sobre `docs/knowledge/rails/atoms/*.md`

**Por humano:**

- Luiz confirma que os 2 átomos flagged passam no checklist visual (skeleton + frontmatter + lem-como-sênior + 3/3 claims rastreáveis no cross-check)
- Nenhum dos átomos duplica conteúdo cross-stack de skill relacionada (diferencial Rails-specific claro)
- **CA-08 cumprido para Batch A+B parcial:** ≥80% claims rastreáveis (verifier) + audit humano de 2 átomos (Luiz) — gate explícito para destrancar Plano 03

---

## Critério para liberar Plano 03

**Todos os 4 critérios DEVEM estar verdes:**

1. ✅ 8/8 átomos do Batch A+B parcial passam verifier refined (≥80% claims rastreáveis nas 3 seções técnicas)
2. ✅ `active-record-fundamentals` assinado por Luiz em STATE.md global
3. ✅ `action-view-and-hotwire` assinado por Luiz em STATE.md global
4. ✅ DI-1 em `plano02/MEMORY.md` registra "Batch A T1 + Batch B parcial T2 aprovado em YYYY-MM-DD"

Se algum critério vermelho → Plano 03 fica bloqueado; retrabalho na fase do átomo afetado + re-verifier + (se flagged) re-audit humano.

---

<!-- Gerado por /plan-feature em 2026-05-18 -->
