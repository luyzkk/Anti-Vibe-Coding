# Plano 02: Deteccao legacy e migracao on-detect

**Feature:** Refatoracao da Estrutura de Pastas por PRD ([PLAN overview](../PLAN-refatoracao-prd-folders.md))
**Fases:** 5
**Sizing total:** ~7h
**Depende de:** Plano 01 (Nova estrutura + tracer bullet)
**Desbloqueia:** —

---

## O que este plano entrega

Garante a backward compatibility da refatoracao. Ao rodar `plan-feature` ou `execute-plan` em um
projeto que ainda tem `PRD-*.md` ou `plano01/` soltos em `.planning/` (pre-refatoracao), a skill
detecta o legacy, sugere uma pasta datada (`YYYY-MM-DD-{slug}/`), e — com confirmacao do dev —
move todos os artefatos atomicamente para a nova estrutura. Nenhum projeto em andamento quebra
com a atualizacao do plugin.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Skills operando dentro de pasta datada (greenfield) | Plano 01 (todas as fases) | pendente |
| Estrutura canonica `YYYY-MM-DD-{slug}/` com arquivos nus | Plano 01, fase-01 | pendente |
| Step 2-FLAT do execute-plan operando dentro de pasta (G-PLAN-2) | Plano 01, fase-03 | pendente |
| write-prd sem code morto residual (G-PLAN-1) | Plano 01, fase-01/fase-05 | pendente |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| Nenhum — Plano 02 eh folha do grafo | — |

Planos 03 e 04 dependem SO do Plano 01, nao deste. Plano 02 pode rodar em paralelo com 03 e 04.

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-detector-legacy-heuristica.md | Funcao compartilhada `detectLegacy()` com heuristica dupla (baixo falso-positivo) — retorna lista de artefatos + slug inferido | 1h | — (primeira) |
| 02 | fase-02-migracao-atomica-rollback.md | Operacao `migrateLegacy()` STAGE → MOVE → CONFIRM com ROLLBACK em caso de falha; registra no STATE.md da nova pasta | 2h | fase-01 |
| 03 | fase-03-hook-plan-feature-oferece-migrar.md | Novo Step 0 em `plan-feature` que chama detector, apresenta ao dev, oferece migrar antes do fluxo normal | 1.5h | fase-01, fase-02 |
| 04 | fase-04-hook-execute-plan-oferece-migrar.md | Hook equivalente em `execute-plan` antes do Step 1 — cuidado com interacao com Step 2-FLAT v1 | 1.5h | fase-01, fase-02 |
| 05 | fase-05-teste-backward-compat-projeto-em-curso.md | Dogfooding manual do cenario CA-12 — projeto em execucao nao eh interrompido; migracao preserva progresso | 1h | fase-03, fase-04 |

---

## Grafo de Fases

```
fase-01 (detector — heuristica dupla)
    |
    v
fase-02 (migracao atomica — stage/move/rollback)
    |
    +-------------------+
    |                   |
    v                   v
fase-03              fase-04
(hook plan-feature)  (hook execute-plan)
    |                   |
    +---------+---------+
              |
              v
         fase-05 (teste backward compat — dogfooding)
```

**Paralelismo possivel:** fase-03 e fase-04 sao INDEPENDENTES entre si (editam skills diferentes
— `plan-feature/SKILL.md` vs `execute-plan/SKILL.md`) e podem rodar em paralelo apos fase-02.
fase-05 eh puramente validacao manual e deve rodar por ultimo.

---

## TDD Strategy

Este projeto (plugin anti-vibe-coding) NAO tem test framework — "verificacao" eh **dogfooding manual**:

```
Ciclo por fase:
1. RED manual: preparar fixture de teste (.planning-test/ com estado legacy ou nao-legacy)
   simulando o cenario que a heuristica/migracao deve tratar
2. GREEN: editar a skill ou a funcao conforme a fase
3. VERIFY: rodar a skill contra a fixture, confirmar comportamento esperado (detectar / migrar /
   ignorar / reverter)
4. ROLLBACK do teste: deletar fixture apos validar
```

Checklist padrao de cada fase:
- [ ] Criar fixture em `.planning-test/` com estado legacy especifico da fase
- [ ] Simular fluxo da skill manualmente
- [ ] Confirmar comportamento esperado (deteccao, migracao, rollback, ignore)
- [ ] Confirmar que artefatos fora de `.planning/` NUNCA sao tocados
- [ ] Limpar fixture apos validar

**Tracer Bullet deste plano:** N/A (tracer foi no Plano 01). Aqui o "minimum valuable path" eh
fase-01 + fase-02: detectar e migrar com rollback — as outras 3 fases sao consumidoras disso.

---

## Gotchas Conhecidos

Herdados do PRD, CONTEXT e Plano 01:

- **G1 (R1 — falso positivo legacy, D14):** Heuristica dupla. So considera legacy se
  `.planning/` tiver (a) `PRD-*.md` solto OU (b) pasta `planoNN/` solta CONTENDO `fase-*.md`
  dentro. Isso evita tratar pastas aleatorias (ex: `.planning/notas/`, `.planning/drafts/`) como
  anti-vibe. Pasta vazia com nome `planoNN` NAO dispara migracao.
- **G2 (R6 — migracao atomica falha):** Implementar STAGE (listar) → MOVE (executar + logar em
  arquivo temporario) → CONFIRM (remover log). Em qualquer erro no meio do MOVE, ROLLBACK
  reverte os moves ja feitos lendo o log. Zero estado parcial corrompido.
- **G3 (R7 — pipeline paralelo mesma feature):** Duas sessoes Claude podem tentar migrar o mesmo
  legacy concorrentemente. Antes de STAGE, verificar que a pasta destino `YYYY-MM-DD-{slug}/`
  NAO existe — se existir, abortar com mensagem "outra sessao ja migrou? verifique". Nao usar
  lock global (D3).
- **G4 (R2 — slug CONTEXT vs slug pasta):** Se `.planning/CONTEXT-xxx.md` existir ao detectar
  legacy, pode ser base para inferir slug. Mas CONTEXT.md nao conta como legacy sozinho — e um
  artefato valido pre-write-prd. So migrar CONTEXT junto se houver PRD-*.md solto OU planoNN/
  legacy.
- **G5 (backward compat v1 — execute-plan Step 2-FLAT):** O execute-plan aceita PLAN.md flat
  (formato v1 — waves/tasks). Apos Plano 01, Step 2-FLAT opera dentro de uma pasta. Se o
  detector encontrar `.planning/PLAN.md` solto (v1 legacy + formato flat legacy), oferecer
  migrar antes de executar. Se dev recusar, o execute-plan deve rodar o Step 2-FLAT no modo
  legacy (a partir de `.planning/` raiz) sem quebrar.
- **G6 (CA-12 — nao interromper trabalho em curso):** Se o STATE.md legacy marca fases
  `in-progress` ou `paused`, a migracao deve PRESERVAR esse estado. Mover arquivo como esta
  (conteudo intacto) — o STATE.md nao eh regenerado, so movido. Dev acorda na nova pasta com o
  mesmo progresso.
- **G7 (slug ambiguo — CA-09):** Se detector achar `plano01/` solto SEM nenhum `PRD-*.md`,
  NUNCA assumir slug default. PERGUNTAR ao dev qual nome usar. Migracao so prossegue apos slug
  explicito.
- **G8 (nao-destrutivo):** Migracao SEMPRE pede confirmacao (sim/nao/cancelar) antes de mover.
  Se dev disser "nao", skill prossegue no modo greenfield ignorando os legacy (nao erra, nao
  deleta, nao avisa de novo na mesma sessao).
- **G9 (escopo — nao tocar fora de .planning/):** Toda a operacao de migracao eh restrita a
  `.planning/`. NUNCA tocar em arquivos do projeto, do git, ou de outras pastas. Verificacao
  explicita antes de cada move.

---

<!-- Gerado por /plan-feature em 2026-04-20 -->
