# PRD: Refatoracao da Estrutura de Pastas por PRD

**Status:** Approved
**Author:** Luiz Felipe + AI
**Date:** 2026-04-20
**Context:** [.planning/CONTEXT-refatoracao-prd-folders.md](CONTEXT-refatoracao-prd-folders.md) (15 decisoes indexadas D1-D15)

---

## Problema

As skills `write-prd`, `plan-feature` e `execute-plan` geram artefatos em `.planning/` usando nomes planos (`plano01/`, `plano02/`, `plano03/`, ...). Essa numeracao eh GLOBAL dentro de `.planning/`, nao por feature.

Consequencia pratica: quando uma primeira feature ja criou `plano01/` ate `plano05/` e o dev inicia uma segunda feature, o `plan-feature` tenta criar outro `plano01/` e colide com a existente. O mesmo vale para `PRD-*.md`, `PLAN-*.md`, `STATE-*.md` que convivem soltos na raiz.

Impacto de nao resolver:
- Impossibilidade pratica de trabalhar em mais de 1 feature em paralelo via anti-vibe-coding
- Risco de sobrescrever planos existentes sem aviso
- Poluicao visual progressiva de `.planning/` conforme features se acumulam
- Incompatibilidade com workflows de multi-branch git e multi-sessao Claude

---

## Solucao

Cada PRD passa a viver em sua propria **pasta datada** dentro de `.planning/`, contendo todos os artefatos relacionados (PRD, PLAN, STATE, SUMMARY, MEMORY consolidado, planos e fases) como arquivos nus.

Estrutura alvo:

```
.planning/
├── CONTEXT-{slug}.md              ← gerado pelo grill-me (antes da pasta existir)
├── 2026-04-20-sistema-notificacoes/
│   ├── CONTEXT.md                 ← movido do .planning/ raiz pelo write-prd
│   ├── PRD.md
│   ├── PLAN.md
│   ├── STATE.md
│   ├── MEMORY.md                  ← consolidado, gerado ao arquivar
│   ├── SUMMARY.md
│   ├── plano01/
│   │   ├── README.md
│   │   ├── MEMORY.md              ← local do plano (inalterado)
│   │   ├── fase-01-*.md
│   │   └── fase-02-*.md
│   └── plano02/ ...
├── 2026-04-25-relatorio-dashboard/
│   └── ...
└── _archive/
    └── 2026-01-10-auth/           ← PRDs concluidos movidos pra ca
```

Alinhamento com o projeto anti-vibe-coding:
- Zero dependencias novas — mudanca eh puramente de logica das skills e templates
- Mantem modelo de subagentes isolados de `plan-feature`/`execute-plan`
- Compativel com `/anti-vibe-coding:update` (merge/replace existentes)
- Licoes continuam indo para `CLAUDE.md` via `/lessons-learned` (sem nova infraestrutura de memoria)

---

## Requisitos Funcionais

### Must Have (core — sem isso a refatoracao nao resolve o problema)

- [ ] **RF1:** Cada PRD vive em pasta com nome `YYYY-MM-DD-{slug-kebab}/` dentro de `.planning/`, contendo arquivos nus (`PRD.md`, `PLAN.md`, `STATE.md`, `SUMMARY.md`) e subpastas `planoNN/` locais aquela pasta (D1, D2)
- [ ] **RF2:** As 3 skills (`write-prd`, `plan-feature`, `execute-plan`) leem e escrevem dentro da pasta do PRD, sem interferir em outros PRDs (D3)
- [ ] **RF3:** `execute-plan` e `plan-feature` detectam estrutura legacy (`planoNN/` solto OU `PRD-*.md` solto em `.planning/`) e oferecem migracao automatica para uma pasta datada, com confirmacao antes de mover (D5, D14)

### Should Have

- [ ] **RF4:** `write-prd` MOVE `.planning/CONTEXT-{slug}.md` (gerado pelo `grill-me`) para dentro da nova pasta como `CONTEXT.md` (D6)
- [ ] **RF5:** `execute-plan` e `plan-feature` sem argumento listam todos os PRDs nao arquivados com status (planned/in-progress/paused/completed) e pedem escolha (D8)
- [ ] **RF6:** Ao concluir um PRD (`/verify-work` ou fim de `execute-plan`), oferecer mover a pasta para `.planning/_archive/` com confirmacao (D7)
- [ ] **RF7:** Ao arquivar, gerar `MEMORY.md` consolidado no nivel do PRD agregando as `planoNN/MEMORY.md` locais (D13)

### Could Have

- [ ] **RF8:** Suporte a campo opcional `requires: [outro-slug]` no frontmatter do `PRD.md`; `plan-feature`/`execute-plan` avisam (sem bloquear) se o PRD dependido nao estiver `completed` (D11)
- [ ] **RF9:** Se `write-prd` rodar 2x no mesmo dia para a mesma feature, perguntar "atualizar ou criar v2?" — v2 cria pasta com sufixo `-v2` (D9)
- [ ] **RF10:** `/lessons-learned add` apos concluir um PRD registra linha `Origem: .planning/_archive/{pasta}/SUMMARY.md` (D12)
- [ ] **RF11:** `plan-feature` detecta ciclos em `requires:` (A requires B, B requires A) e avisa sem bloquear

### Won't Have (desta versao)

- Lock global via `.planning/ACTIVE.md` — paralelismo livre por design (D3)
- Alteracao em `quick-plan` — continua inline, sem tocar em `.planning/` (D10)
- Arquivo global `.planning/MEMORY.md` — licoes vao para `CLAUDE.md` via `/lessons-learned` (D4)
- Mudancas no formato interno de `planoNN/` (fases, README do plano, MEMORY local do plano permanecem como hoje)
- Novo comando `/migrate-prd` standalone — migracao eh on-detect (D5)

---

## Requisitos Nao-Funcionais

- **Compatibilidade:** Projetos legacy (com `planoNN/` e `PRD-*.md` soltos) continuam executaveis sem migracao forcada. Migracao eh sempre on-detect + confirmacao.
- **Atomicidade:** Operacao de migracao (move de arquivos soltos para pasta datada) eh atomica — sucesso completo ou rollback para estado anterior, sem deixar estado parcial corrompido.
- **Nao-destrutivo:** Arquivamento e migracao SEMPRE pedem confirmacao explicita antes de mover arquivos.
- **Descoberta:** `execute-plan` sem argumento nunca falha silenciosamente — mostra PRDs disponiveis ou sinaliza legacy detectado.
- **Observabilidade:** Cada migracao/arquivamento registra no `STATE.md` do PRD afetado (campo `log`) o que foi movido e quando.
- **Acessibilidade:** N/A (mudanca puramente em artefatos de skills/CLI, nao ha UI).
- **Seguranca:** Migracao NUNCA toca em arquivos fora de `.planning/`.

---

## Decisoes Tecnicas

| # | Decisao | Escolha | Alternativa Rejeitada | Razao |
|---|---------|---------|----------------------|-------|
| 1 | Formato do nome da pasta | `YYYY-MM-DD-{slug}/` | Prefixo numerico sequencial (`01-slug/`) | Prefixo numerico reproduziria o mesmo problema de numeracao global entre PRDs. Data ordena cronologicamente sem exigir gerenciamento. |
| 2 | Nomes de arquivos dentro da pasta | Nus (`PRD.md`, `PLAN.md`) | Com prefixo (`PRD-{slug}.md`) | A pasta ja da contexto. Prefixo duplicaria informacao e inflaria nomes. |
| 3 | Paralelismo entre PRDs | Sem lock global | `.planning/ACTIVE.md` apontando PRD ativo | Cada PRD tem STATE.md local — basta isso. Lock global quebraria multi-branch e multi-sessao. |
| 4 | Local das licoes seniores globais | `CLAUDE.md` via `/lessons-learned` | `.planning/MEMORY.md` dedicado | Reusa infraestrutura existente. Evita duplicacao de memoria global. |
| 5 | Migracao legacy | On-detect com confirmacao | Novo comando `/migrate-prd` explicito | Nao exige dev lembrar de rodar — migracao acontece no primeiro uso pos-update. |
| 6 | Local do CONTEXT.md do grill-me | Raiz de `.planning/`, movido pelo write-prd | grill-me ja cria a pasta | grill-me permanece standalone (nao precisa saber da estrutura). |
| 7 | Arquivamento pos-conclusao | Opt-in com confirmacao em `_archive/` | Auto-move sem perguntar | Dev controla quando arquivar. Historico preservado. |
| 8 | Descoberta sem argumento | Lista e pergunta | Auto-detect unico in-progress | Explicito eh melhor que magico. Evita decisoes surpreendentes. |
| 9 | Dependencia cross-PRD | Campo opcional `requires: []` | Sem conceito, ou campo obrigatorio | Util para milestones sem penalizar PRDs simples. |
| 10 | MEMORY.md consolidado | Gerado AO ARQUIVAR, nao durante execucao | Continuo (atualizado em tempo real) | Evita duplicacao com `planoNN/MEMORY.md` local durante execucao. |

---

## Criterios de Aceite

- [ ] **CA-01 (feliz, novo projeto):** Dado um projeto sem `.planning/`, quando o dev rodar `/write-prd "feature X"`, entao eh criada a pasta `.planning/YYYY-MM-DD-feature-x/` contendo `PRD.md` nu, e nenhum arquivo `PRD-*.md` aparece na raiz de `.planning/`.
- [ ] **CA-02 (feliz, pipeline completo):** Dado o PRD criado em pasta datada, quando o dev rodar `/plan-feature` sem argumento, entao a skill detecta e usa o `PRD.md` dentro da pasta, gerando `PLAN.md`, `STATE.md` e `planoNN/` todos dentro da mesma pasta.
- [ ] **CA-03 (feliz, execucao):** Dado um PRD com `STATE.md` em sua pasta, quando `/execute-plan` rodar sem argumento e existir apenas 1 PRD nao arquivado, entao a skill lista esse PRD, pede confirmacao, e prossegue lendo estado e planos de dentro da pasta.
- [ ] **CA-04 (legacy):** Dado um `.planning/` com `PRD-auth.md` e `plano01/` soltos (estrutura pre-refatoracao), quando o dev rodar `/execute-plan` ou `/plan-feature`, entao a skill detecta legacy, sugere nome de pasta (`YYYY-MM-DD-auth-legacy` por default), pede confirmacao, e move TODOS os artefatos relacionados para a nova pasta atomicamente.
- [ ] **CA-05 (paralelismo):** Dado dois PRDs (`2026-04-20-a/` e `2026-04-20-b/`) ambos com planos criados, quando duas sessoes Claude executarem `/execute-plan` em paralelo (uma para cada), entao cada sessao opera na sua pasta sem colisao e sem exigir lock global.
- [ ] **CA-06 (CONTEXT move):** Dado `.planning/CONTEXT-feature.md` gerado pelo `grill-me`, quando `/write-prd` criar a pasta `YYYY-MM-DD-feature/`, entao o `CONTEXT-feature.md` eh movido para dentro como `CONTEXT.md` e o arquivo na raiz de `.planning/` deixa de existir.
- [ ] **CA-07 (arquivamento):** Dado um PRD com todos os planos `completed` e `SUMMARY.md` gerado, quando `/verify-work` concluir a auditoria, entao a skill oferece mover a pasta para `.planning/_archive/`, e ao aceitar a pasta eh movida preservando o nome (`_archive/YYYY-MM-DD-feature/`).
- [ ] **CA-08 (descoberta multi-PRD):** Dado `.planning/` contendo 3 PRDs nao arquivados com status distintos, quando `/execute-plan` rodar sem argumento, entao a skill lista os 3 com seus status (planned/in-progress/paused) lidos de seus `STATE.md` locais e pede que o dev escolha.
- [ ] **CA-09 (erro — legacy ambiguo):** Dado `.planning/` com `plano01/` solto mas sem nenhum `PRD-*.md` associado, quando a skill detectar legacy, entao a skill PEDE ao dev um nome de pasta (em vez de assumir default), e so migra apos confirmacao explicita do nome.
- [ ] **CA-10 (erro — conflito de nome):** Dado uma pasta `.planning/2026-04-20-feature/` ja existente, quando `/write-prd` for chamado para a mesma feature no mesmo dia, entao a skill pergunta "atualizar existente ou criar v2?"; se v2, cria `2026-04-20-feature-v2/`.
- [ ] **CA-11 (requires — aviso nao bloqueante):** Dado `PRD-B.md` com frontmatter `requires: [PRD-A]`, quando `/execute-plan` rodar no PRD-B e o PRD-A nao estiver `completed`, entao a skill mostra aviso claro com o status atual de A, mas permite prosseguir se o dev confirmar.
- [ ] **CA-12 (backward compat estrita):** Dado um projeto legacy em execucao (planos em andamento), quando o plugin for atualizado com esta refatoracao e o dev rodar `/execute-plan`, entao a execucao continua sem interromper trabalho em curso — migracao eh oferecida mas nunca forcada.

---

## Out of Scope

- `quick-plan` permanece inline, sem integracao com a nova estrutura de pastas (D10)
- Arquivo global `.planning/MEMORY.md` (licoes vao para `CLAUDE.md` via skill existente)
- Comando standalone `/migrate-prd` — nao sera criado, migracao eh on-detect (D5)
- Reestruturacao interna de `planoNN/` (fases, README do plano, MEMORY local permanecem inalterados)
- UI/dashboard para visualizar PRDs — manipulacao continua via CLI/filesystem
- Remocao automatica de `_archive/` (arquivos ficam ate o dev decidir deletar)

---

## Dependencias

| Tipo | Dependencia | Status |
|------|------------|--------|
| Skill | `/anti-vibe-coding:write-prd` | existente — sera modificada |
| Skill | `/anti-vibe-coding:plan-feature` | existente — sera modificada |
| Skill | `/anti-vibe-coding:execute-plan` | existente — sera modificada |
| Skill | `/anti-vibe-coding:verify-work` | existente — adicionar oferta de arquivamento |
| Skill | `/anti-vibe-coding:lessons-learned` | existente — adicionar rastreio de origem (RF10) |
| Template | `plan-feature/templates/plan-overview-template.md` | existente — atualizar paths referenciados |
| Template | `plan-feature/templates/memory-template.md` | existente — manter + criar template do MEMORY consolidado do PRD |
| Template | `write-prd/templates/prd-template.md` | existente — adicionar frontmatter com `requires:` opcional |
| Doc | `anti-vibe-coding/CLAUDE.md` | existente — atualizar secao "Estrutura hierarquica (v2)" para refletir nova estrutura |
| Infra | `/anti-vibe-coding:update` | existente — estrategia `merge` para CLAUDE.md, `replace` para templates |

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| R1: Deteccao legacy com falso positivo (pasta `plano01/` em contexto nao anti-vibe) | baixa | medio | So considerar legacy se houver `fase-*.md` dentro OU `PRD-*.md` com estrutura de anti-vibe proximo |
| R2: Slug do CONTEXT.md (grill-me) difere do slug da pasta final (write-prd) | media | baixo | write-prd confirma slug antes de mover, oferece renomear o CONTEXT |
| R3: Dependencia circular em `requires:` (PRD-A requires B, PRD-B requires A) | baixa | baixo | Detectar ciclo em `plan-feature` e avisar (nao bloquear) — RF11 |
| R4: MEMORY.md consolidado do PRD cresce demais com muitos planos | media | baixo | Template do consolidado eh sumario focado em "o que vira licao", nao copia tudo |
| R5: Projetos ja instalados com plugin desatualizado continuam com estrutura antiga | alta | baixo | `/anti-vibe-coding:update` propaga docs e templates; skills detectam legacy no primeiro uso |
| R6: Migracao atomica falha no meio (crash, permissao), deixando estado parcial | baixa | alto | Implementar como "stage → move todos → confirm" com rollback em erro; logar no STATE da nova pasta |
| R7: Dev rodar pipeline em paralelo na mesma feature por engano (2 sessoes, mesmo slug) | baixa | medio | write-prd usa resolucao v2 (RF9) — segundo `write-prd` no mesmo dia detecta colisao |
| R8: `execute-plan` sem argumento em `.planning/` com 10+ PRDs vira lista poluida | media | baixo | Listar apenas `planned` e `in-progress` por default; `/execute-plan --all` mostra tudo |

---

<!-- Gerado por /anti-vibe-coding:write-prd em 2026-04-20 -->
<!-- Importado de .planning/CONTEXT-refatoracao-prd-folders.md (15 decisoes D1-D15) -->
