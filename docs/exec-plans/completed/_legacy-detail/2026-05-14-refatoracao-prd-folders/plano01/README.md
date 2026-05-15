# Plano 01: Nova estrutura (fundacao + tracer bullet)

**Feature:** Refatoracao da Estrutura de Pastas por PRD ([PLAN overview](../PLAN-refatoracao-prd-folders.md))
**Fases:** 5
**Sizing total:** ~6h
**Depende de:** Nenhum (primeiro plano)
**Desbloqueia:** Plano 02 (Deteccao legacy), Plano 03 (Multi-PRD + ciclo de vida), Plano 04 (Extras)

---

## O que este plano entrega

As 3 skills principais (`write-prd`, `plan-feature`, `execute-plan`) passam a operar dentro de uma pasta datada por PRD (`.planning/YYYY-MM-DD-{slug}/`) com arquivos nus (`PRD.md`, `PLAN.md`, `STATE.md`, `planoNN/`). No final deste plano, uma feature nova flui greenfield do PRD ate a execucao sem conflito com outras features — o pre-requisito da solucao toda.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| PRD formal aprovado | `.planning/PRD-refatoracao-prd-folders.md` | pronto |
| CONTEXT com 15 decisoes D1-D15 | `.planning/CONTEXT-refatoracao-prd-folders.md` | pronto |
| Templates base do plugin | `anti-vibe-coding/skills/*/templates/*.md` | pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| Skills operando dentro de pasta datada | Plano 02 (precisa detectar legacy e migrar PARA essa estrutura) |
| Estrutura canonica `YYYY-MM-DD-{slug}/` com arquivos nus | Plano 03 (descoberta multi-PRD, arquivamento) |
| `PRD.md` com frontmatter suportando `requires:` | Plano 04 (avisos cross-PRD) |
| Templates atualizados com novos caminhos | Planos 02, 03, 04 (referencias em fases futuras) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-write-prd-cria-pasta-datada.md | `write-prd` cria pasta `YYYY-MM-DD-{slug}/` e salva `PRD.md` nu greenfield (TRACER BULLET) | 1h | — |
| 02 | fase-02-plan-feature-opera-dentro-pasta.md | `plan-feature` le `PRD.md` da pasta, salva `PLAN.md`, `STATE.md` e `planoNN/` dentro | 1.5h | fase-01 |
| 03 | fase-03-execute-plan-navega-pasta.md | `execute-plan` le `STATE.md` local da pasta, navega `planoNN/` local (D3 — paralelismo sem lock) | 1.5h | fase-02 |
| 04 | fase-04-write-prd-move-context.md | `write-prd` move `.planning/CONTEXT-{slug}.md` para dentro da pasta como `CONTEXT.md`, trata colisao de slug (R2) | 1h | fase-01 |
| 05 | fase-05-atualizar-templates.md | Atualizar `prd-template` (frontmatter com `requires:` opcional), `plan-overview-template`, `plan-readme-template`, `fase-template`, `memory-template` com caminhos da nova estrutura | 1h | fase-01, 02, 03 |

---

## Grafo de Fases

```
fase-01 (write-prd cria pasta) [TRACER BULLET]
    |
    +-------+-------+
    |       |       |
    v       v       v
fase-02  fase-04  (fase-05 tambem depende)
    |       |
    v       |
fase-03     |
    |       |
    +-------+
            |
            v
       fase-05 (templates — precisa ter os 3 skills prontos para referenciar caminhos reais)
```

**Paralelismo possivel:**
- Apos fase-01 concluir, `fase-02` e `fase-04` sao INDEPENDENTES entre si (uma mexe em `plan-feature`, outra em `write-prd` Step 5 — arquivos diferentes). Podem rodar em paralelo.
- `fase-03` so comeca apos `fase-02` (precisa de `plan-feature` gerando dentro da pasta para `execute-plan` ler dali).
- `fase-05` eh a ultima (atualiza referencias em templates apos os 3 skills estarem no novo layout).

---

## TDD Strategy

Este projeto (plugin anti-vibe-coding) NAO tem test framework — nao ha `bun run test`. "Verificacao" = **dogfooding manual**:

```
Ciclo por fase:
1. RED manual: criar PRD/feature de teste e confirmar que estado ATUAL da skill produz layout ERRADO (raiz de .planning/)
2. GREEN: modificar SKILL.md para novo comportamento
3. VERIFY: rodar skill novamente em pasta temporaria de teste, confirmar que arquivos aparecem no lugar esperado
4. ROLLBACK do teste: deletar pasta de teste apos validar
```

Checklist padrao de cada fase:
- [ ] Criar diretorio temporario de teste: `.planning-test/` (ou pasta fora do repo)
- [ ] Simular fluxo da skill manualmente (ou invocar diretamente)
- [ ] Confirmar arquivos criados/lidos nos caminhos esperados
- [ ] Confirmar que comportamento legacy NAO foi disparado (nao ha `PRD-*.md` solto ou `plano01/` solto)
- [ ] Limpar pasta de teste

**Tracer Bullet deste plano:** fase-01 (`/write-prd` cria pasta datada + `PRD.md` nu — se isso funciona, toda a arquitetura funciona)

---

## Gotchas Conhecidos

Herdados do PRD (`PRD-refatoracao-prd-folders.md`) e CONTEXT (15 decisoes D1-D15):

- **G1 (D1):** Nome da pasta eh `YYYY-MM-DD-{slug-kebab}/` — data no prefixo, slug em kebab-case. NAO usar prefixo numerico sequencial (reproduziria o bug).
- **G2 (D2):** Arquivos dentro da pasta sao NUS (`PRD.md`, nao `PRD-{slug}.md`). A pasta ja da contexto — prefixo duplicaria informacao.
- **G3 (D3):** Paralelismo por design — NAO criar `.planning/ACTIVE.md` nem qualquer lock global. Cada `STATE.md` vive dentro da sua pasta.
- **G4 (D6):** `grill-me` permanece standalone e continua escrevendo em `.planning/CONTEXT-{slug}.md` na raiz. Quem move o CONTEXT para dentro da pasta eh o `write-prd` (fase-04 deste plano).
- **G5 (R2):** Slug do CONTEXT gerado pelo `grill-me` pode DIFERIR do slug final da pasta criada pelo `write-prd` (dev pode ter mudado o nome na entrevista). `write-prd` deve confirmar antes de mover e oferecer renomear.
- **G6 (D9):** Se `write-prd` rodar 2x no mesmo dia para a mesma feature (mesmo slug), a colisao de nome de pasta deve ser tratada via pergunta "atualizar ou v2?" — mas o tratamento completo vive no Plano 03, fase-02. Nesta fase-01 do Plano 01, apenas DETECTAR colisao e falhar com mensagem clara (nao sobrescrever).
- **G7 (D13):** `planoNN/MEMORY.md` continua LOCAL ao plano (nao eh quebrado por este refactor). O `MEMORY.md` consolidado no nivel do PRD eh gerado AO ARQUIVAR (Plano 03, fase-04) — nao neste plano.
- **G8 (backward compat):** Estruturas legacy (`PRD-*.md` solto, `plano01/` solto) NAO sao tratadas aqui — isso eh Plano 02 inteiro. Neste plano, a skill assume greenfield. Se detectar legacy, deve IGNORAR e prosseguir com o novo fluxo (Plano 02 cuida da migracao depois).
- **G9 (templates versionados):** Os 5 templates que a fase-05 edita sao arquivos do plugin — qualquer mudanca precisa ser compativel com `/anti-vibe-coding:update` (estrategia `replace` para templates conforme CLAUDE.md do plugin).

---

<!-- Gerado por /anti-vibe-coding:plan-feature em 2026-04-20 -->
