<!--
Principio universal #5 — Comment Provenance.
NAO aplicar em codigo de runtime do plugin.
-->

# Fase 07: Verifier refined batch (6 atoms) — R3-A regression

**Plano:** 02 — Atoms Feature-driven Next (em EN) + verifier batch
**Sizing:** S (~1h)
**Depende de:** fase-01 a fase-06 (todos os 6 atoms presentes em `knowledge/nextjs/atoms/`)
**Visual:** false (audit/verifier — content-only output)

---

## O que esta fase entrega

`verifier-report-plano02.md` (relatorio markdown na pasta deste plano, NAO em `knowledge/`) com 1 secao por atom (6 secoes total) contendo: claims amostradas, rastreabilidade verificada contra `sources:`, decisao `APPROVE` ou `REWORK` + razoes. Atualiza `STATE.md` global da feature com status `verified` ou `needs-rework` por atom. Se algum REWORK, volta a fase correspondente (fase-01..06) para re-rodar extrator com instrucao cirurgica.

Esta NAO e uma fase de extracao — e VERIFICACAO. Subagente verifier audita o batch usando protocolo refined estabelecido pelo Plano 04 do Node-TS wave (heranca documentada na compound lesson `2026-05-16-verifier-protocol-technical-sections-only.md`).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/plano02/verifier-report-plano02.md` | Create | Relatorio markdown com 1 secao por atom: claims amostradas + rastreabilidade + decisao APPROVE/REWORK |
| `docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/STATE.md` | Modify | Atualizar status global da feature: cada um dos 6 atoms recebe `verified` OU `needs-rework` |

---

## Implementacao

### Passo 1: Verificar precondicao (6 atoms existem)

```bash
for atom in react-server-components server-actions-and-mutations middleware-and-edge data-fetching-and-cache rendering-strategies pages-router-migration-tips; do
  test -f "knowledge/nextjs/atoms/${atom}.md" || echo "MISSING: ${atom}.md"
done
```

Se algum faltar, RECUAR — fase-07 nao roda parcial.

### Passo 2: Subagente verifier — invocacao

Subagente: `Agent` tool com `subagent_type=general-purpose`. Content-only (le os 6 atoms + sources declarados; escreve apenas `verifier-report-plano02.md` + edita `STATE.md`).

**Prompt completo (cole tal qual, com bloco verbatim da compound lesson do verifier):**

````
Voce e um subagente verifier auditando 6 atoms de conhecimento Next.js destilados em `knowledge/nextjs/atoms/` pelo Plano 02 da feature 2026-05-24-nextjs-react-stack-knowledge.

## TASK

Audite os 6 atoms abaixo. Para cada atom, amostre >=5 claims tecnicas das 3 secoes auditaveis e tente rastrear cada claim para passagem especifica das fontes declaradas em `sources:` (audit trail textual; arquivos em `Infos/knowledge/NextJS/` — `Infos/` esta no .gitignore mas voce tem acesso local). Decisao: APPROVE se >=80% das claims sao rastreaveis; REWORK caso contrario.

## ATOMS A AUDITAR

1. `knowledge/nextjs/atoms/react-server-components.md` (T1 — flagged R3-B audit humano em Plano 03 fase-07; voce roda o audit automatico aqui)
2. `knowledge/nextjs/atoms/server-actions-and-mutations.md` (T1)
3. `knowledge/nextjs/atoms/middleware-and-edge.md` (T1)
4. `knowledge/nextjs/atoms/data-fetching-and-cache.md` (T1)
5. `knowledge/nextjs/atoms/rendering-strategies.md` (T2 — verificar tambem que `next_versions: ['>=15']` esta no frontmatter E `<!-- next_versions: >=15 -->` comentario HTML esta presente antes do `### Pattern: Partial Pre-Rendering`)
6. `knowledge/nextjs/atoms/pages-router-migration-tips.md` (T3)

## PROTOCOLO REFINED (cole VERBATIM da compound lesson 2026-05-16-verifier-protocol-technical-sections-only)

TECHNICAL CLAIMS (source-traceable, MUST appear in source) live in: Senior patterns, Anti-patterns, Decision criteria. ATOM-STRUCTURAL METADATA lives in: When to consult (use-case framing) and External references (cross-skill linking) — DO NOT evaluate these sections for source traceability.

Antes de criar verifier, documentar split editorial/tecnico no template do artefato. O piloto define qual secao e meta-content e qual e claim tecnica rastreavel ao source.

Prompt do verifier deve nomear explicitamente as secoes auditaveis, nao confiar em "selecione 5 claims aleatorias".

Acionador de revisao do prompt: se >=2 artefatos do batch falharem v1, parar e revisar o prompt do verifier antes de rodar v2. Nao entrar em loop de rework cego (gate explicito em README do plano).

Esta licao se aplica a: stack-knowledge batches (Planos 02/03 herdam o protocolo refined), audit de ADRs, audit de documentacao tecnica em geral, e qualquer extracao assistida por IA com verifier gate.

Anti-pattern relacionado: confundir "verifier deve auditar tudo no artefato" com "verifier deve auditar todo conteudo que veio do source". Editorial framing nao vem do source — vem do template.

## METODOLOGIA POR ATOM

1. Leia o frontmatter — extraia paths em `sources:` (audit trail)
2. Leia o arquivo do atom inteiro
3. Conte linhas — se >200, FLAG como hard cap violation (R3-C — registrar mesmo se APPROVE em rastreabilidade)
4. Para cada uma das 3 secoes auditaveis (Senior patterns, Anti-patterns, Decision criteria):
   - Identifique >=2 claims tecnicas concretas (ex: "revalidateTag invalida cache por tag, sempre em mutation")
5. Total >=5 claims amostradas por atom (cobertura das 3 secoes)
6. Para cada claim, tente rastrear: leia o(s) source(s) declarado(s) e procure por trecho que (i) afirma literalmente, OU (ii) afirma parafraseavelmente, OU (iii) implica diretamente a claim
7. Classifique cada claim como `rastreavel` ou `nao-rastreavel`
8. Calcule taxa: `rastreaveis / total amostrado`
9. Decisao: APPROVE se taxa >= 80%; REWORK se < 80%

NAO evolua claims das 2 secoes editoriais (When to consult + External references). Esses sao meta-content (use-case framing + cross-skill linking) — false-negative loop conhecido (companion lesson 2026-05-16-extrator).

## OUTPUT

Crie `docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/plano02/verifier-report-plano02.md` com este formato:

```markdown
# Verifier Report — Plano 02 (Atoms Feature-driven Next)

**Generated:** {ISO date}
**Atoms auditados:** 6
**Decisao agregada:** APPROVE/REWORK por atom

---

## react-server-components.md

**Linhas:** {N} (hard cap 200: PASS/FAIL)
**Claims amostradas:** {N}
**Rastreaveis:** {N} ({pct}%)
**Decisao:** APPROVE / REWORK

### Claims rastreadas

1. Claim: "{claim}"
   - Source: {path:linha-aproximada ou citacao da fonte}
   - Rastreabilidade: rastreavel / nao-rastreavel
   - Comentario: {opcional}

(repetir para 5+ claims)

### Razao da decisao
{se REWORK: por que; se APPROVE: nota de qualidade}

---

(repetir para os 5 atoms restantes)

---

## Resumo agregado

| Atom | Linhas | Hard cap | Claims | Rastreaveis | % | Decisao |
|------|--------|----------|--------|-------------|---|---------|
| react-server-components | ... | PASS | 5 | 5 | 100% | APPROVE |
| ... | ... | ... | ... | ... | ... | ... |

**Atoms APPROVE:** N / 6
**Atoms REWORK:** N / 6 (listar quais)
**Hard cap violations:** N / 6 (listar quais)
```

## STATE.md UPDATE

Apos gerar verifier-report-plano02.md, atualize `docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/STATE.md` com nova entrada:

```markdown
## Plano 02 — Verifier batch (fase-07)

Data: {ISO date}
Relatorio: docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/plano02/verifier-report-plano02.md

Status por atom:
- react-server-components.md: verified / needs-rework
- server-actions-and-mutations.md: verified / needs-rework
- middleware-and-edge.md: verified / needs-rework
- data-fetching-and-cache.md: verified / needs-rework
- rendering-strategies.md: verified / needs-rework
- pages-router-migration-tips.md: verified / needs-rework
```

NAO sobrescreva entradas existentes em STATE.md — apenas append.

## OUTPUT FINAL

Retorne resumo: qtos APPROVE, qtos REWORK, qtos hard cap violations, link para o report.

NAO toque atoms (so leitura). NAO toque outros arquivos alem de `verifier-report-plano02.md` + STATE.md.
````

### Passo 3: Tratamento de REWORK

Se verifier marca algum atom como REWORK:
1. Identificar fase correspondente (1-6) pelo nome do atom
2. Re-rodar extrator daquela fase com instrucao cirurgica: "as claims X, Y, Z foram marcadas como nao-rastreaveis. Re-escreva ESSAS claims especificas usando passagem literal/parafraseavel das sources declaradas. Mantenha o resto do atom."
3. Re-rodar fase-07 sobre o batch ou somente o atom retrabalhado (verifier subagente pode rodar single-atom mode)
4. Anotar em MEMORY.md como DEV-N ou BUG-N

**Gate de loop (compound lesson — "se >=2 artefatos falham v1, revisar prompt"):** se 2+ atoms falharem v1, NAO re-rodar verifier sem antes revisar o prompt do extrator (pode ser que anti-drift clause foi efetivamente perdida em algum subagente paralelo). Recapture o root cause antes do v2.

---

## Gotchas

- **G1 do plano (anti-drift verbatim):** este prompt nao tem anti-drift (e verifier, nao extrator). Mas o compound lesson verifier-protocol esta colado verbatim — nao editar.
- **G6 do plano (verifier scope):** prompt acima explicita os 3 sections tecnicas auditaveis + 2 sections editoriais excluidas. Critico — false-negative em When to consult ja foi observado em Node-TS Plano 04 (Plano 04 fase-06 perdeu ~30min em ciclos v2 desnecessarios antes de identificar a raiz).
- **G7 do plano (sources audit trail):** verifier le `Infos/knowledge/NextJS/...` que esta no `.gitignore` mas disponivel local. Se subagente nao conseguir abrir o arquivo (ex: PATH errado), reportar como FLAG separado de nao-rastreabilidade.
- **G8 do plano (paralelismo):** se as 6 fases rodaram em paralelo via /execute-plan wave, e algum subagente extrator perdeu o bloco anti-drift, verifier vai detectar via baixa rastreabilidade. Verifique TAMBEM a presenca do bloco no prompt salvo (se preservado em logs do harness).
- **Local — fase-05 frontmatter check:** verifier precisa explicitamente checar `next_versions: ['>=15']` no frontmatter E comentario HTML `<!-- next_versions: >=15 -->` no corpo de `rendering-strategies.md`. Se ausente, REWORK (mesmo que rastreabilidade pass).
- **Local — single-atom rework mode:** se REWORK e isolado a 1 atom (improvavel ate v2), pode re-invocar verifier apenas sobre esse atom usando mesmo prompt com lista reduzida a 1.

---

## Verificacao

### Checklist

- [ ] `verifier-report-plano02.md` criado em `docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/plano02/`
- [ ] Report tem 6 secoes (1 por atom) + resumo agregado
- [ ] Cada secao tem >=5 claims amostradas
- [ ] Cada secao tem decisao explicita APPROVE ou REWORK
- [ ] Hard cap 200 linhas verificado para todos os 6 atoms (FLAG se violado)
- [ ] Frontmatter `next_versions: ['>=15']` + comentario HTML PPR validados em `rendering-strategies.md`
- [ ] STATE.md global atualizado com `Plano 02 — Verifier batch` entry + status por atom
- [ ] Bloco verbatim da compound lesson verifier-protocol presente no prompt do verifier (auto-check antes de invocar)
- [ ] Se REWORK: fase correspondente re-rodada com instrucao cirurgica + verifier v2 sobre atom(s) retrabalhado(s)
- [ ] Gate de loop respeitado: se >=2 atoms falharem v1, prompt do extrator revisado ANTES de v2

---

## Criterio de Aceite

**Por maquina:**

- `test -f docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/plano02/verifier-report-plano02.md` retorna 0
- `grep -c "^## " docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/plano02/verifier-report-plano02.md` retorna >=7 (6 atoms + resumo agregado + qualquer subsecao adicional)
- `grep -q "Decisao:" docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/plano02/verifier-report-plano02.md` retorna 0
- `grep -q "Plano 02 — Verifier batch" docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/STATE.md` retorna 0
- Numero de atoms APPROVE >= 5 / 6 (tolerancia para 1 REWORK aceito em primeira passada — se >=2 REWORK, fase nao completa, dispara revisao de prompt do extrator)

**Por humano:**
- Luiz revisa o report e decide se aceita o batch como entregue (ou requer rework adicional alem do automatico)
- Se REWORK pendente em algum atom, anotar em MEMORY.md e propagar para Plano 03 fase-07 (audit humano flagged)

---

<!-- Gerado por /plan-feature (sub-agente isolado) em 2026-05-24 -->
