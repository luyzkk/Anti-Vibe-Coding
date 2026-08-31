<!--
Princípio universal #5 — Comment Provenance.
Fase de verificação + rastreio de licença — sem código de runtime; outputs são o
verifier-report, o MEMORY.md e (condicionalmente) THIRD-PARTY-NOTICES.md.
-->

# Fase 06: Verifier Refined Batch T1 (5 átomos) + Rastreio ECC

**Plano:** 02 — Atoms T1 + Verifier + Rastreio ECC
**Sizing:** 2h
**Depende de:** fases 01-05 (fan-in — os 5 átomos escritos e commitados nas Waves 1-2)
**Visual:** false

---

## O que esta fase entrega

Gate de fidelidade fechado para o batch T1: verifier refined roda sobre os 5 átomos do plano
(≥80% de claims rastreáveis por átomo), relatório commitado em
`plano02/verifier-report-plano02.md`; e a tentativa não-bloqueante de rastrear a origem/licença
do material "ECC" (RF12, R5) documentada no MEMORY.md — com entrada no
`THIRD-PARTY-NOTICES.md` se licença for encontrada.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/exec-plans/active/2026-08-30-stack-knowledge-python/plano02/verifier-report-plano02.md` | Create | Relatório do verifier batch (5 átomos × 5 claims, veredito por átomo) |
| `docs/exec-plans/active/2026-08-30-stack-knowledge-python/plano02/MEMORY.md` | Modify | Seção "Resultado do Rastreio ECC" preenchida + métricas de ciclos do verifier |
| `THIRD-PARTY-NOTICES.md` (raiz) | Modify (condicional) | SÓ se o rastreio ECC encontrar licença — entrada com texto verbatim |
| `knowledge/python/atoms/*.md` (algum dos 5) | Modify (condicional) | Rework cirúrgico de claims reprovadas pelo verifier |

---

## Implementacao

### Parte A — Verifier refined batch (5 átomos)

#### Passo 1: Spawnar 1 verifier subagente por átomo (paralelo, read-only)

Átomos do batch: `python-idioms-and-antipatterns`, `typing-and-static-analysis`,
`errors-logging-observability`, `pytest-and-testing-strategy`, `security-fastapi-owasp`.

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
   paráfrase fiel). Para claims traduzidas de fonte em espanhol (python-patterns/SKILL.md,
   python-testing/SKILL.md): a passagem original em ES conta como rastreio válido.
3. Para o átomo security: use os IDs de regra citados (formato "regra N.N") como atalho de
   rastreio — confira que o ID existe na fonte E que o conteúdo da claim bate com a seção do ID.
4. Veredito por claim: RASTREADA (cite a passagem/linha da fonte) ou NÃO ENCONTRADA (explique
   o que buscou).
5. CHECKS ADICIONAIS (reportar, não reprovar por si só):
   - Corpo >200 linhas → REPROVA o átomo (hard cap, independente das claims)
   - Claim que a fonte marca como "contestado" apresentada como regra dura → conta como falha
   - Número concreto divergente do valor da fonte → conta como falha

OUTPUT: tabela claim → seção → veredito → passagem da fonte; score final N/5; veredito do
átomo: PASS (≥4/5, i.e. ≥80%) ou FAIL.
```

#### Passo 2: Consolidar `verifier-report-plano02.md`

Estrutura do relatório:

```markdown
# Verifier Report — Plano 02 (Batch T1)

**Data:** {YYYY-MM-DD}
**Protocolo:** refined (compound 2026-05-16-verifier-protocol-technical-sections-only)
**Gate:** ≥80% (4/5 claims) por átomo

| Átomo | v1 | v2 | v3 | Veredito final |
|---|---|---|---|---|
| python-idioms-and-antipatterns | {N}/5 | — | — | PASS/FAIL |
| typing-and-static-analysis | {N}/5 | — | — | PASS/FAIL |
| errors-logging-observability | {N}/5 | — | — | PASS/FAIL |
| pytest-and-testing-strategy | {N}/5 | — | — | PASS/FAIL |
| security-fastapi-owasp | {N}/5 | — | — | PASS/FAIL |

## Claims reprovadas e rework aplicado
{tabela: átomo → claim → motivo → fix (rework cirúrgico ou remoção)}

## Observações de calibração para Planos 03-04
{ajustes de prompt extrator/verifier descobertos neste batch}
```

#### Passo 3: Rework cirúrgico (se houver FAIL)

- Claim NÃO ENCONTRADA → corrigir para o que a fonte diz, ou remover a claim (nunca "defender").
- Re-rodar o verifier SÓ no átomo afetado (v2). Registrar ciclos na tabela.
- **G12 — gate de loop (compound verifier-protocol, Prevention #3):** se ≥2 átomos falharem a
  v1, PARAR antes de qualquer v2: revisar o prompt do verifier E suspeitar de drift sistemático
  de extrator (compound anti-drift, Prevention #4 — ≥2 claims não encontradas em runs paralelos
  do mesmo batch = suspeita de drift de prompt, não bug pontual). Corrigir a causa raiz,
  registrar como DI/GT no MEMORY.md, e só então rodar v2.

### Parte B — Rastreio ECC (RF12, R5 — NÃO-BLOQUEANTE)

#### Passo 4: Tentar identificar a origem do material "ECC"

Material alvo: `Infos/knowledge/Python/python-patterns/SKILL.md` e
`Infos/knowledge/Python/python-testing/SKILL.md` (em espanhol, origem rotulada "ECC", sem
licença declarada — D5).

Procedimento (~30min, timeboxed):

1. Extrair 3-5 trechos característicos de cada SKILL.md (frases distintivas em espanhol,
   títulos de seção incomuns, exemplos de código com nomes peculiares — trechos improváveis
   de colisão).
2. Busca web pelos trechos entre aspas (busca exata) + variações sem aspas.
3. Buscar repositórios de skills conhecidos: GitHub search por `python-patterns SKILL.md`,
   `python-testing SKILL.md`, coleções de skills de Claude/agentes em espanhol, o rótulo
   "ECC" combinado com "skill"/"claude"/"python".
4. Se um repositório de origem for identificado: verificar LICENSE/README do repo e a licença
   declarada (se houver).

#### Passo 5: Documentar o resultado (SEMPRE, mesmo em fracasso)

- Preencher a seção **"Resultado do Rastreio ECC (RF12)"** do `plano02/MEMORY.md`: data,
  trechos buscados, fontes consultadas, resultado, ação tomada.
- **Se licença encontrada:** adicionar entrada no `THIRD-PARTY-NOTICES.md` com o texto da
  licença VERBATIM (precedente python-debugpy/RF7 e Addy Osmani/Next). Se a licença encontrada
  for restritiva (não-permissiva), NÃO resolver sozinho: parar e levar ao dev — pode mudar a
  decisão D5.
- **Se não encontrada:** registrar a tentativa e seguir — risco aceito pelo dev (D5). NÃO
  bloquear o plano nem remover os `sources:` ECC dos átomos.

### Passo 6: Fechar o plano

1. Atualizar `plano02/MEMORY.md`: métricas (ciclos de verifier, excedentes → TODO.md) + "Notas
   para Planos Seguintes" (resultado ECC, ajustes de prompt para os batches T2/T3, confirmação
   G11 INDEX intacto).
2. `bun run harness:validate` (G10) + `bun test` (regressão — nada de código mudou, suite deve
   estar verde).
3. Commit 3: verifier-report + MEMORY + rework de átomos (se houve) + NOTICES (se aplicável) +
   TODO.md (excedentes).
4. Abrir PR da branch `feat/stack-knowledge-python-plano02` (G9). Descrição cita: 5 átomos T1,
   verifier 5/5 PASS, resultado do rastreio ECC.

---

## Gotchas

- **G2 do plano:** protocolo do verifier VERBATIM — o bloco em inglês é o prompt v3 validado no
  Plano 04 Node; parafrasear reintroduz o bug de false-negative em seções editoriais que a
  compound documenta.
- **G12 do plano:** ≥2 FAIL na v1 = parar e recalibrar ANTES de v2. O custo documentado de
  ignorar isso foi ~30min de loop cego no Plano 04 Node.
- **G13 do plano:** rastreio ECC é não-bloqueante — o único desfecho que interrompe é licença
  RESTRITIVA encontrada (decisão sobe para o dev; D5 pode ser revisitada).
- **G1 do plano:** a busca ECC usa o CONTEÚDO dos SKILL.md como query — cuidado para não colar
  trechos longos do material em arquivos commitados (verifier-report cita passagens de fonte
  por referência curta, não por blocos copiados).
- **Local — verifier NÃO reaudita o piloto:** `async-and-concurrency` já passou no gate do
  Plano 01 fase-03. O batch desta fase são os 5 átomos NOVOS.
- **Local — verifiers em paralelo são read-only:** os 5 podem rodar simultâneos sem conflito;
  rework subsequente é sequencial por átomo afetado.

---

## Verificacao

### TDD (adaptado — esta fase É o gate)

- [ ] **Gate de fidelidade:** 5/5 átomos com veredito PASS (≥4/5 claims rastreadas cada)
- [ ] **Gate de loop respeitado:** se houve ≥2 FAIL em v1, existe DI/GT no MEMORY documentando
  a recalibração antes da v2

### Checklist

- [ ] `verifier-report-plano02.md` existe, com tabela de 5 átomos, scores por rodada e seção
  de claims reprovadas/rework
- [ ] Nenhum átomo com corpo >200 linhas passou (o verifier reprova por cap independente das claims)
- [ ] Seção "Resultado do Rastreio ECC (RF12)" do MEMORY.md preenchida — inclusive em caso de
  fracasso da busca
- [ ] SE licença ECC encontrada: entrada verbatim no `THIRD-PARTY-NOTICES.md`; SE restritiva:
  registro de escalada ao dev (sem resolução unilateral)
- [ ] Excedentes de cap das fases 01-05 consolidados no `TODO.md` da raiz
- [ ] "Notas para Planos Seguintes" do MEMORY.md preenchida (Plano 03 lê antes de começar)
- [ ] `bun run harness:validate` verde; `bun test` verde; `git status` sem `Infos/` staged (G1)
- [ ] INDEX.md intacto durante todo o plano: `git diff main...HEAD --stat -- knowledge/python/INDEX.md` vazio (G11)
- [ ] PR aberto da branch `feat/stack-knowledge-python-plano02` (G9)

---

## Criterio de Aceite

**Por maquina:**
- `verifier-report-plano02.md` commitado com 5× PASS
- `grep -c 'PASS' verifier-report-plano02.md` ≥ 5; nenhum `FAIL` como veredito final
- `bun run harness:validate` e `bun test` verdes no HEAD da branch

**Por humano:**
- Leitura do relatório: claims reprovadas tiveram rework real (não re-rotulação)
- Resultado do rastreio ECC documentado no MEMORY é suficiente para o closeout do Plano 04
  citar (RF12 cumprido: tentativa registrada OU NOTICES atualizado)

---

<!-- Gerado por /plan-feature em 2026-08-30 -->
