# Fase 04: MEMORY.md consolidado gerado ao arquivar

**Plano:** 03 — Multi-PRD, ciclo de vida e consolidacao
**Sizing:** 1.5h
**Depende de:** fase-03 (logica de arquivamento precisa existir — fase-04 eh chamada dentro da
opcao "arquivar" da fase-03)
**Visual:** false

---

## O que esta fase entrega

No momento do arquivamento (opcao [1] da fase-03), antes do mv da pasta para `_archive/`, gerar
`{pasta}/MEMORY.md` consolidado no nivel do PRD. O consolidado AGREGA as `planoNN/MEMORY.md`
locais com foco em "o que vira licao" — nao copia conteudo integral (mitigacao de **R4**:
MEMORY consolidado gigante).

Satisfaz **RF7** e **D13** do PRD.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/verify-work/SKILL.md` | Modify | Adicionar passo de geracao do MEMORY consolidado DENTRO da opcao [1] arquivar (ver fase-03), antes do mv |
| `anti-vibe-coding/skills/plan-feature/templates/memory-prd-template.md` | Create | Novo template focado em agregacao — distinto do `memory-template.md` por-plano existente |

---

## Implementacao

### Passo 1: Criar template `memory-prd-template.md`

Novo arquivo em `anti-vibe-coding/skills/plan-feature/templates/memory-prd-template.md`. Este
template eh distinto do `memory-template.md` por-plano existente (que permanece inalterado
conforme D13).

Conteudo (template em si — placeholders `{...}` sao preenchidos pela skill):

```markdown
# Memoria Consolidada: {Feature Name}

**PRD:** [PRD.md](./PRD.md)
**Arquivado em:** {YYYY-MM-DD}
**Duracao total:** {data-inicio} -> {data-fim}
**Planos consolidados:** {N planos}

---

## Decisoes de Implementacao (relevantes)

Decisoes tomadas durante execucao que afetaram mais de um plano ou que sao
generalizaveis. NAO decisoes triviais locais a uma unica fase.

- **DI-{plano}-{n}:** {descricao concisa}
  - Plano: {NN}
  - Impacto: {por que foi relevante}

<!-- Preenchido por agregacao das secoes "Decisoes de Implementacao" de cada planoNN/MEMORY.md,
     filtrando pelas que tem impacto cross-plano ou marcadas como relevantes -->

---

## Gotchas Generalizaveis

Armadilhas que NAO sao especificas da feature — se aplicam a qualquer feature similar.
Candidatas a virar licoes em CLAUDE.md via /lessons-learned.

- **GT-{plano}-{n}:** {descricao}
  - Descoberto em: Plano {NN}, fase-{MM}
  - Aplicabilidade: {quando voltar a aparecer}

<!-- Filtrado por heuristica: gotcha que menciona stack, framework, tooling em vez de
     detalhes especificos da feature -->

---

## Bugs Significativos

Bugs que consumiram retries, mudaram a arquitetura, ou revelaram assumption errada.
Nao incluir bugs triviais (typo, import esquecido).

- **BUG-{plano}-{n}:** {sintoma} -> {causa raiz} -> {fix}
  - Plano: {NN}
  - Fase: fase-{MM}

<!-- Filtrado: incluir se o bug gerou retries > 0, ou se envolveu mais de uma fase -->

---

## Desvios Significativos do Plano

O que mudou em relacao ao planejamento inicial e por que.

- **DEV-{plano}-{n}:** {descricao}
  - Motivo: {por que mudou}
  - Aprovado por: {dev / decisao tacita}

<!-- Todos os desvios dos planoNN/MEMORY.md, agregados -->

---

## Metricas Totais

| Metrica | Total | Por Plano |
|---------|-------|-----------|
| Planos planejados | {N} | — |
| Planos concluidos | {N} | {01:completed, 02:skipped, ...} |
| Fases total | {N} | — |
| Fases concluidas | {N} | — |
| Fases skipped | {N} | — |
| Bugs encontrados | {N} | {01:X, 02:Y} |
| Retries necessarios | {N} | — |
| Desvios | {N} | — |

---

## Candidatas a Licao (para /lessons-learned)

Lista que o dev pode revisar para decidir quais itens promover para `CLAUDE.md`
via `/anti-vibe-coding:lessons-learned add`.

- {item 1 — referencia ao DI/GT/BUG acima}
- {item 2}

<!-- Gerado por heuristica: tudo em "Gotchas Generalizaveis" + DIs com impacto cross-plano -->

---

<!-- Gerado ao arquivar via /anti-vibe-coding:verify-work em {YYYY-MM-DD} -->
```

### Passo 2: Algoritmo de agregacao (dentro do verify-work)

Pseudo-codigo da funcao `gerarMEMORYConsolidado(pasta)`:

```
function gerarMEMORYConsolidado(pasta: string): void {
  // 1. Ler todas as planoNN/MEMORY.md da pasta
  const planos = Glob(`${pasta}/plano*/MEMORY.md`);

  const agregado = {
    decisoes: [],
    gotchas: [],
    bugs: [],
    desvios: [],
    metricas: { planosConcluidos: 0, fasesTotal: 0, bugsEncontrados: 0, retries: 0 },
    ausentes: [],
  };

  for (const memPath of planos) {
    const planoNum = extractPlanoNumber(memPath);  // 01, 02, ...
    const conteudo = Read(memPath);

    if (!conteudo) {
      agregado.ausentes.push(planoNum);  // G13 — plano sem MEMORY.md
      continue;
    }

    // Extrair secoes
    const decisoes = extractSection(conteudo, "Decisoes de Implementacao");
    const gotchas  = extractSection(conteudo, "Gotchas");
    const bugs     = extractSection(conteudo, "Bugs Descobertos");
    const desvios  = extractSection(conteudo, "Desvios do Plano");
    const metricas = extractSection(conteudo, "Metricas");

    // Agregar com FILTRO (mitigacao R4)
    agregado.decisoes.push(
      ...parseItems(decisoes).filter(d => isImpactoCrossPlano(d) || isRelevante(d))
        .map(d => ({ ...d, plano: planoNum }))
    );
    agregado.gotchas.push(
      ...parseItems(gotchas).filter(isGeneralizavel)
        .map(g => ({ ...g, plano: planoNum }))
    );
    agregado.bugs.push(
      ...parseItems(bugs).filter(b => b.retries > 0 || b.fasesAfetadas.length > 1)
        .map(b => ({ ...b, plano: planoNum }))
    );
    agregado.desvios.push(
      ...parseItems(desvios).map(d => ({ ...d, plano: planoNum }))
    );

    // Somar metricas
    agregado.metricas.planosConcluidos += 1;
    agregado.metricas.fasesTotal += parseInt(metricas.fasesTotal) || 0;
    agregado.metricas.bugsEncontrados += parseInt(metricas.bugs) || 0;
    agregado.metricas.retries += parseInt(metricas.retries) || 0;
  }

  // 2. Ler template memory-prd-template.md
  const template = Read("anti-vibe-coding/skills/plan-feature/templates/memory-prd-template.md");

  // 3. Preencher placeholders
  const conteudoFinal = fillTemplate(template, {
    featureName: extractPRDTitle(`${pasta}/PRD.md`),
    dataArquivamento: hoje(),
    ...agregado,
  });

  // 4. Adicionar marcadores para planos ausentes
  if (agregado.ausentes.length > 0) {
    conteudoFinal += `\n\n<!-- Nota: planos ${agregado.ausentes.join(", ")} sem MEMORY.md registrado -->`;
  }

  // 5. Escrever em {pasta}/MEMORY.md (nivel do PRD, nao do plano)
  Write(`${pasta}/MEMORY.md`, conteudoFinal);

  // 6. Gerar lista "Candidatas a Licao"
  const candidatas = [
    ...agregado.gotchas.filter(isGeneralizavel).map(formatItemLicao),
    ...agregado.decisoes.filter(isImpactoCrossPlano).map(formatItemLicao),
  ];
  appendSection(`${pasta}/MEMORY.md`, "Candidatas a Licao", candidatas);
}
```

### Passo 3: Heuristicas de filtragem (mitigacao R4)

Mitigar R4 (MEMORY consolidado gigante) via heuristicas claras — o consolidado NAO eh dump:

**`isGeneralizavel(gotcha)`** — verdadeiro se:
- Gotcha menciona stack/framework/tooling (regex: Supabase, Prisma, Next, Bun, Windows, etc.)
- Gotcha tem palavra-chave indicando reuso ("qualquer feature", "comum", "evitar", "padrao")
- NAO eh especifico da feature (ex: "tabela X conflitou com tabela Y" eh especifico — excluir)

**`isImpactoCrossPlano(decisao)`** — verdadeiro se:
- Decisao eh referenciada no campo "Notas para Planos Seguintes" de algum planoNN
- Decisao menciona outro plano explicitamente (ex: "afeta Plano 3")
- Decisao mudou arquitetura compartilhada (schema, API publica, types exportados)

**`isRelevante(decisao)`** — verdadeiro se:
- Decisao tem palavras-chave ("escolhi ... em vez de ...", "trade-off", "rejeitado")
- Decisao foi tomada apos retry ou erro (visto no Log do STATE)
- Decisao contraria uma especificacao inicial do PRD

Se TODAS as heuristicas excluirem um item, ainda assim manter o item em uma secao "Outros
(baixa relevancia)" curta no final — evita perder contexto valioso por filtro muito agressivo,
mas mantem o consolidado enxuto.

### Passo 4: Integracao com fase-03

Na opcao [1] arquivar da fase-03:

```
// Dentro da OPCAO 1 — ARQUIVAR (fase-03, passo 5):
gerarMEMORYConsolidado(pasta);  // <-- fase-04 roda aqui
mv(pasta, `.planning/_archive/${basename(pasta)}`);
```

Se `gerarMEMORYConsolidado` falhar (por ex. template nao encontrado, plano sem MEMORY.md
parseavel), CAPTURAR erro e perguntar:

```
"Falha ao gerar MEMORY consolidado: {erro}.
 Arquivar mesmo assim (sem consolidado)? [sim/nao]"
```

Se dev aceita: prosseguir mv sem consolidado. Se recusa: abortar arquivamento.

### Passo 5: Integracao com `/lessons-learned`

A secao "Candidatas a Licao" do consolidado alimenta `/lessons-learned`. Esta fase NAO altera
`/lessons-learned` — apenas expoe a lista no arquivo. O Plano 04 fase-03 (se executado) usa essa
secao para auto-popular a origem. Se Plano 04 nao rodar, a secao eh apenas informativa.

---

## Gotchas

- **G1 do plano (G3 — R4 mitigacao):** Filtros sao OBRIGATORIOS. Sem filtro, consolidado vira
  dump e perde utilidade. As 3 heuristicas acima sao o contrato.
- **G2 do plano (G8 — gerado AO ARQUIVAR):** Esta fase so roda dentro de fase-03. Se dev opta
  por nao arquivar, nao ha consolidacao. Pode ser refeita quando dev optar por arquivar depois.
- **G3 do plano (G13 — plano sem MEMORY.md):** Seguir gracefully: marcar como "ausente" no
  consolidado, nao falhar. Raro (normalmente plano tem MEMORY), mas possivel (dev apagou,
  ou plano foi skipped sem execucao).
- **G4 do plano (D13 — template distinto):** `memory-prd-template.md` eh NOVO arquivo, nao
  substitui `memory-template.md` (que eh por-plano). Dois templates coexistem com escopos
  diferentes — claramente distintos.
- **Local (idempotencia de consolidacao):** Se `{pasta}/MEMORY.md` (consolidado) ja existe ao
  chamar a funcao, sobrescrever. Pode acontecer se dev arquivou, desarquivou manualmente, e
  voltou a arquivar.
- **Local (parser de markdown):** Extrair secoes de `MEMORY.md` por-plano depende do formato do
  template por-plano existente (`memory-template.md`). Usar headings (`## Decisoes de
  Implementacao`, `## Gotchas`, etc.) como anchor — se o dev editou o template por-plano
  manualmente, o parser pode falhar. Em caso de falha de parsing, incluir o conteudo BRUTO do
  plano numa secao "Raw MEMORY plano NN" — evita perder informacao.
- **Local (ordem de arquivamento + consolidacao):** A ordem eh: 1) gerar consolidado na pasta
  atual, 2) mv pasta inteira para _archive/. Se inverter, o consolidado ja estaria em _archive/
  (ainda funcionaria, mas eh mais fragil). Ordem atual: consolidar PRIMEIRO.

---

## Verificacao

### Dogfooding

- [ ] **RED:** fixture com 2 `planoNN/MEMORY.md` preenchidos manualmente (decisoes, gotchas,
  bugs mock). Rodar fase-03 opcao [1]. Confirmar que o `{pasta}/MEMORY.md` consolidado NAO
  existe antes e que o mv seria feito sem agregacao (estado anterior).
- [ ] **GREEN:** apos edit, `{pasta}/MEMORY.md` eh criado ANTES do mv; conteudo tem as secoes
  agregadas do template.

### Checklist

- [ ] Template `memory-prd-template.md` existe e tem as secoes previstas
- [ ] Agregacao le TODAS as `planoNN/MEMORY.md` da pasta
- [ ] Plano sem MEMORY.md eh listado em "Notas: planos X sem MEMORY.md registrado"
- [ ] Heuristica `isGeneralizavel` filtra gotchas especificos da feature (teste: gotcha
  mencionando nome da feature eh excluido)
- [ ] Heuristica `isImpactoCrossPlano` inclui decisao presente em "Notas para Planos Seguintes"
- [ ] Heuristica `isRelevante` inclui decisao com "escolhi ... em vez de"
- [ ] Metricas sao somadas corretamente (teste: 2 planos, cada um com 3 bugs = total 6)
- [ ] Secao "Candidatas a Licao" eh gerada com itens filtrados
- [ ] Falha na geracao nao bloqueia arquivamento (pergunta antes de abortar)
- [ ] Consolidado eh criado DENTRO da pasta original (antes do mv)
- [ ] Limpar fixture apos validar

---

## Criterio de Aceite

**Por humano (dogfooding):**
- Fixture com 2 planos (cada um com MEMORY.md com 3 decisoes, 2 gotchas, 1 bug) → rodar
  arquivamento → consolidado gerado com secoes agregadas; consolidado tem <200 linhas
  (eh sumario focado, nao dump)
- Fixture com 1 plano sem MEMORY.md e outro com → consolidado menciona "plano 01 sem MEMORY"
- Fixture com gotcha "tabela users conflitou com migration X" → NAO entra em "Gotchas
  Generalizaveis" (especifico da feature)
- Fixture com gotcha "No Windows, mv cross-filesystem falha" → ENTRA (generalizavel)

**Cobertura do PRD:**
- RF7 (MEMORY consolidado gerado ao arquivar) ✓
- D13 (MEMORY consolidado por-PRD + planoNN/MEMORY.md local inalterado) ✓
- R4 (consolidado focado, nao dump) mitigado ✓

---

<!-- Gerado por /anti-vibe-coding:plan-feature em 2026-04-20 -->
