# Plano 03: Multi-PRD, ciclo de vida e consolidacao

**Feature:** Refatoracao da Estrutura de Pastas por PRD ([PLAN overview](../PLAN-refatoracao-prd-folders.md))
**Fases:** 5
**Sizing total:** ~5h
**Depende de:** Plano 01 (Nova estrutura + tracer bullet)
**Desbloqueia:** —

---

## O que este plano entrega

Completa o ciclo de vida dos PRDs em pastas datadas. `execute-plan`/`plan-feature` sem argumento
descobrem interativamente quais PRDs existem (filtrando por status). `write-prd` trata conflito de
nome mesmo-dia com opcao "atualizar ou v2". `verify-work` oferece arquivar a pasta em
`.planning/_archive/` ao concluir e gera um `MEMORY.md` consolidado no nivel do PRD agregando as
memorias locais dos planos. A documentacao do plugin (CLAUDE.md) eh atualizada para refletir o
layout final.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Skills operando dentro de pasta datada | Plano 01 (todas as fases) | pendente |
| `write-prd` cria pasta datada e falha com mensagem em colisao (G-PLAN nao-v2) | Plano 01, fase-01 | pendente |
| `execute-plan`/`plan-feature` leem `STATE.md` local por pasta | Plano 01, fase-02/03 | pendente |
| Estrutura canonica `planoNN/MEMORY.md` preservada | Plano 01 (nao toca) | pendente |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| Nenhum — Plano 03 eh folha do grafo | — |

Planos 02 e 04 dependem SO do Plano 01. Plano 03 pode rodar em paralelo com 02 e 04 apos Plano 01
concluir.

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-descoberta-interativa-lista-prds.md | `execute-plan` e `plan-feature` sem argumento listam PRDs nao arquivados (default: `planned`+`in-progress`; `--all` inclui completed) lendo `STATE.md` de cada pasta datada | 1h | — |
| 02 | fase-02-conflito-mesmo-dia-v2.md | `write-prd` detecta pasta ja existente com mesmo dia+slug; pergunta "atualizar ou criar v2?"; v2 cria pasta com sufixo `-v2`, `-v3`... — substitui o "falhar com mensagem clara" do Plano 01 fase-01 | 1h | — (substitui comportamento do Plano 01 fase-01) |
| 03 | fase-03-arquivamento-verify-work.md | `verify-work` oferece mover a pasta do PRD para `.planning/_archive/` ao final da auditoria, com confirmacao explicita; so arquiva se todas as fases forem `completed` ou `skipped` | 1h | — |
| 04 | fase-04-memory-consolidado-ao-arquivar.md | No momento do arquivamento, gerar `MEMORY.md` no nivel do PRD agregando as `planoNN/MEMORY.md` locais (decisoes relevantes, gotchas generalizaveis, bugs significativos, metricas totais) | 1.5h | fase-03 |
| 05 | fase-05-atualizar-claude-md-plugin.md | Atualizar `anti-vibe-coding/CLAUDE.md` secoes "Estrutura hierarquica (v2)" e "Pipeline v5.0 → Artefatos de Pipeline" para refletir o layout `.planning/YYYY-MM-DD-{slug}/` final | 0.5h | fase-01, 02, 03, 04 |

**Soma:** 1 + 1 + 1 + 1.5 + 0.5 = 5h ✓

---

## Grafo de Fases

```
fase-01 (descoberta)         fase-02 (conflito v2)          fase-03 (arquivar)
     |                            |                               |
     |                            |                               v
     |                            |                         fase-04 (memory consolidado)
     |                            |                               |
     +--------------+-------------+-------------------------------+
                    |
                    v
              fase-05 (atualizar CLAUDE.md do plugin)
```

**Paralelismo possivel:**
- `fase-01`, `fase-02` e `fase-03` sao INDEPENDENTES entre si (editam skills diferentes —
  `plan-feature`+`execute-plan`, `write-prd`, `verify-work`). Podem rodar em paralelo.
- `fase-04` depende de `fase-03` (so existe "arquivamento" quando fase-03 entrega a operacao de
  mover; o memory consolidado eh gerado DENTRO desse momento).
- `fase-05` eh a ULTIMA — documenta o estado final do layout apos as 4 primeiras fases.

---

## TDD Strategy

Este projeto (plugin anti-vibe-coding) NAO tem test framework — "verificacao" eh **dogfooding
manual** (conforme Plano 01/02):

```
Ciclo por fase:
1. RED manual: preparar fixture em .planning-test/ com estado inicial esperado
   (ex: 3 pastas datadas com STATE.md distintos, ou PRD-bar pronto para arquivar)
2. GREEN: modificar SKILL.md conforme a fase
3. VERIFY: rodar skill contra a fixture, confirmar comportamento esperado
4. ROLLBACK do teste: deletar fixture
```

Checklist padrao de cada fase:
- [ ] Criar fixture em `.planning-test/` com estado especifico
- [ ] Simular fluxo da skill manualmente
- [ ] Confirmar comportamento (descoberta, conflito, arquivamento, consolidacao)
- [ ] Confirmar que artefatos fora de `.planning/` NUNCA sao tocados
- [ ] Limpar fixture apos validar

**Tracer Bullet deste plano:** N/A (tracer foi no Plano 01). O "minimum valuable path" aqui eh
fase-03 + fase-04: arquivar e consolidar — sao as duas fases que "fecham" o ciclo de vida.

---

## Gotchas Conhecidos

Herdados do PRD, CONTEXT (D1-D15), STATE (G-PLAN-1 a G-PLAN-8) e descobertos ao ler arquivos-alvo:

- **G1 (R8 — 10+ PRDs poluem lista):** `fase-01` filtra por default mostrando apenas `planned` e
  `in-progress`. Flag `--all` inclui `completed` nao arquivados. Mitigacao explicita de R8.
- **G2 (G-PLAN-6 — sinal C isolado):** `fase-01` enumera APENAS pastas com nome matching
  `YYYY-MM-DD-*` DIRETAMENTE dentro de `.planning/`. Nao trata `PLAN.md`/`STATE.md` soltos
  (Plano 02 cuida de legacy). Descoberta eh pura sobre a nova estrutura.
- **G3 (R4 — MEMORY consolidado gigante):** Template da `fase-04` foca em "o que vira licao" —
  NAO copia conteudo integral de cada `planoNN/MEMORY.md`. Agrega com filtros: so decisoes que
  afetaram >1 plano, so gotchas generalizaveis, so bugs significativos (nao triviais).
- **G4 (G-PLAN-4 — mv Windows):** `fase-03` faz mv de pasta inteira para `.planning/_archive/`.
  Mesmo filesystem eh pre-requisito (`.planning/_archive/` fica no proprio `.planning/`, nao ha
  cross-filesystem). Em caso de falha, abortar sem estado parcial — nao ha rollback porque eh um
  mv unico e a pasta destino nao existia antes.
- **G5 (D9 — conflito mesmo-dia v2):** `fase-02` SUBSTITUI o tratamento de colisao do Plano 01
  fase-01 ("falhar com mensagem clara"). A versao final do `write-prd` Step 5 usa a logica
  interativa desta fase: pergunta ao dev `atualizar existente / criar v2 / cancelar`.
- **G6 (CA-07 — arquivamento pede confirmacao):** `fase-03` NUNCA arquiva automatico. Sempre
  apresenta ao dev: "mover pasta para _archive? sim/nao". Se dev disser nao, skill termina sem
  tocar em nada.
- **G7 (arquivamento so com planos terminados):** `fase-03` verifica o `STATE.md` local da
  pasta — se alguma fase estiver em status diferente de `completed` ou `skipped`, NAO oferece
  arquivar. Mensagem: "Plano X fase-MM ainda in-progress — nao arquivar". Dev pode esquecer
  alguma.
- **G8 (D13 — MEMORY consolidado eh gerado AO ARQUIVAR):** Nao eh continuo. `fase-04` so roda
  dentro do fluxo de `fase-03`. Se dev decidir nao arquivar, nao ha consolidacao (e ela pode ser
  refeita depois quando dev optar por arquivar).
- **G9 (G-PLAN-1 + G-PLAN-2 implicacao):** Apos Plano 02 ter limpo o codigo legacy, a `fase-02`
  deste plano vai editar o mesmo bloco do `write-prd` que o Plano 01 fase-01 tocou. Verificar que
  a substituicao respeita a ordem de execucao: Plano 01 primeiro, depois Plano 02, depois este.
- **G10 (fase-05 + /update merge):** `CLAUDE.md` do plugin eh versionado e atualizado via
  `/anti-vibe-coding:update` com estrategia MERGE. Mudancas da `fase-05` devem ser adicoes claras
  (substituicao de blocos inteiros ja existentes com mesmo heading), para que o merge funcione
  bem em projetos que ja customizaram `CLAUDE.md`.
- **G11 (verify-work Step "Cleanup de Artefatos"):** O `verify-work/SKILL.md` ja tem uma secao
  "Cleanup de Artefatos" que sugere 3 opcoes (`archive`, `keep`, `remove`). `fase-03` integra a
  opcao `archive` com a logica real de mv para `_archive/` — nao substitui, AGREGA.
- **G12 (descoberta case-insensitive slug):** Ao matchear `YYYY-MM-DD-*` em `fase-01`, case de
  slug nao importa (Windows), mas preservar o nome original ao listar. NAO normalizar.
- **G13 (fase-04 ausencia de MEMORY.md local):** Se algum `planoNN/` nao tiver `MEMORY.md`
  (ex: dev apagou, ou plano nunca executado), a agregacao salta aquele plano com um marcador
  "plano NN sem MEMORY.md registrado" no consolidado. Nao falhar.

---

<!-- Gerado por /anti-vibe-coding:plan-feature em 2026-04-20 -->
