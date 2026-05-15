# Plan: Refatoracao da Estrutura de Pastas por PRD

**PRD:** [.planning/PRD-refatoracao-prd-folders.md](PRD-refatoracao-prd-folders.md)
**Planos:** 4 planos, 18 fases total (~21h)
**Created:** 2026-04-20

---

## Planos

| # | Nome | Fases | Sizing | Depende de |
|---|------|-------|--------|------------|
| 01 | Nova estrutura (fundacao + tracer bullet) | 5 | ~6h | — |
| 02 | Deteccao legacy e migracao on-detect | 5 | ~7h | Plano 01 |
| 03 | Multi-PRD, ciclo de vida e consolidacao | 5 | ~5h | Plano 01 |
| 04 | Extras (requires, lessons-learned origem) | 3 | ~3h | Plano 01 |

---

## Grafo de Dependencias

```
Plano 01 (Nova estrutura + tracer bullet)
    |
    +-------------------+-----------------+
    |                   |                 |
    v                   v                 v
Plano 02            Plano 03           Plano 04
(Legacy &           (Multi-PRD &       (Extras — Could Have)
 Migracao)           Ciclo de Vida)
```

**Paralelismo possivel:** Planos 02, 03 e 04 sao independentes entre si (so dependem do 01). Podem ser executados em paralelo ou em qualquer ordem apos Plano 01 concluir.

**Criticidade:**
- Plano 01: Must Have (RF1, RF2) — sem ele nada funciona
- Plano 02: Must Have (RF3) — backward compat com projetos legacy
- Plano 03: Should Have (RF4, RF5, RF6, RF7)
- Plano 04: Could Have (RF8, RF10, RF11) — cortavel sem perder valor core

---

## Tracer Bullet

**Plano:** 01
**Fase:** fase-01-write-prd-cria-pasta-datada
**Descricao:** `/write-prd` cria pasta `YYYY-MM-DD-{slug}/` em `.planning/` e salva `PRD.md` (nu) dentro. Este eh o slice mais fino que prova a nova arquitetura end-to-end: um input (argumentos), uma operacao (criar pasta + escrever arquivo), um output verificavel (pasta com PRD.md dentro). Se isso funciona, toda a nova estrutura funciona.

---

## Resumo por Plano

### Plano 01: Nova estrutura (fundacao + tracer bullet)
> Estabelece a estrutura `YYYY-MM-DD-{slug}/` como padrao. As 3 skills principais (`write-prd`, `plan-feature`, `execute-plan`) passam a ler e escrever dentro da pasta do PRD. Tracer bullet valida o fluxo end-to-end.

Fases:
- fase-01-write-prd-cria-pasta-datada: `write-prd` cria pasta datada + salva PRD.md nu (TRACER BULLET)
- fase-02-plan-feature-opera-dentro-pasta: `plan-feature` le PRD.md da pasta, salva PLAN/STATE/planoNN dentro
- fase-03-execute-plan-navega-pasta: `execute-plan` le STATE.md da pasta, navega planoNN/ local
- fase-04-write-prd-move-context: `write-prd` move `.planning/CONTEXT-{slug}.md` para dentro como `CONTEXT.md`
- fase-05-atualizar-templates: atualizar `plan-overview-template`, `prd-template`, `memory-template` para refletir nova estrutura

### Plano 02: Deteccao legacy e migracao on-detect
> Garante backward compat. `plan-feature` e `execute-plan` detectam estruturas legacy (planoNN/ solto, PRD-*.md solto), oferecem migracao automatica e movem os artefatos atomicamente para uma pasta datada nova. Nao quebra workflows em andamento.

Fases:
- fase-01-detector-legacy-heuristica: funcao compartilhada que detecta legacy com baixo falso-positivo (R1)
- fase-02-migracao-atomica-rollback: operacao stage→move→confirm com rollback em caso de falha (R6)
- fase-03-hook-plan-feature-oferece-migrar: `plan-feature` detecta legacy ao iniciar, oferece migrar com confirmacao
- fase-04-hook-execute-plan-oferece-migrar: `execute-plan` detecta legacy ao iniciar, oferece migrar com confirmacao
- fase-05-teste-backward-compat-projeto-em-curso: validar CA-12 (projeto legacy em execucao nao eh interrompido)

### Plano 03: Multi-PRD, ciclo de vida e consolidacao
> Completa o ciclo de vida: descoberta interativa quando ha multiplos PRDs, conflito de nome no mesmo dia, arquivamento em `_archive/` ao concluir, MEMORY.md consolidado gerado no arquivamento, e atualizacao da documentacao do plugin.

Fases:
- fase-01-descoberta-interativa-lista-prds: `execute-plan` e `plan-feature` sem argumento listam PRDs nao arquivados
- fase-02-conflito-mesmo-dia-v2: `write-prd` no mesmo dia/slug pergunta "atualizar ou v2?" (RF9)
- fase-03-arquivamento-verify-work: `verify-work` oferece mover pasta para `_archive/` ao concluir
- fase-04-memory-consolidado-ao-arquivar: gerar PRD-level `MEMORY.md` agregando `planoNN/MEMORY.md`
- fase-05-atualizar-claude-md-plugin: atualizar `anti-vibe-coding/CLAUDE.md` secao "Estrutura hierarquica"

### Plano 04: Extras (Could Have)
> Recursos opcionais que agregam valor mas nao sao bloqueantes. Cortavel sem perder o core. Pode ser executado em sprint separado ou adiado.

Fases:
- fase-01-requires-frontmatter-e-aviso: suporte a `requires: [slug]` no PRD + aviso nao-bloqueante em execute-plan
- fase-02-deteccao-ciclos-requires: detectar A→B→A e avisar sem bloquear (RF11)
- fase-03-lessons-learned-rastreia-origem: `/lessons-learned` registra `Origem: .planning/_archive/.../SUMMARY.md` (RF10)

---

## Risks

Herdados do PRD, aplicados ao planejamento:

- **R1 (falso positivo legacy):** mitigado em Plano 02 fase-01 (heuristica: so considera legacy se houver `fase-*.md` dentro da pasta planoNN/ OU estrutura tipica de anti-vibe-coding proxima)
- **R2 (slug CONTEXT != pasta):** mitigado em Plano 01 fase-04 (write-prd confirma slug antes de mover, oferece renomear CONTEXT)
- **R3 (ciclo em requires):** mitigado em Plano 04 fase-02 (deteccao de ciclo com aviso nao-bloqueante)
- **R4 (MEMORY consolidado gigante):** mitigado em Plano 03 fase-04 (template do consolidado eh sumario focado, nao copia tudo)
- **R5 (projetos desatualizados):** mitigado em Plano 03 fase-05 (atualizacao de docs + estrategia merge do /update)
- **R6 (migracao atomica falha):** mitigado em Plano 02 fase-02 (stage → move → rollback, logado no STATE da nova pasta)
- **R7 (rodar pipeline paralelo mesma feature):** mitigado em Plano 03 fase-02 (conflito mesmo-dia → sufixo -v2)
- **R8 (10+ PRDs poluem lista):** mitigado em Plano 03 fase-01 (listar por default so planned+in-progress, flag para ver todos)

---

## Decisoes do PRD Aplicadas

| Decisao | Onde se aplica |
|---------|---------------|
| D1 (pasta YYYY-MM-DD-slug) | Plano 01, fase-01 |
| D2 (arquivos nus) | Plano 01, fase-01, fase-02, fase-03 |
| D3 (paralelismo sem lock) | Plano 01, fase-03 (STATE.md local por pasta) |
| D4 (licoes em CLAUDE.md) | Plano 04, fase-03 (integracao com /lessons-learned) |
| D5 (migracao on-detect) | Plano 02, fase-03, fase-04 |
| D6 (CONTEXT movido pelo write-prd) | Plano 01, fase-04 |
| D7 (arquivar em _archive/) | Plano 03, fase-03 |
| D8 (descoberta lista e pergunta) | Plano 03, fase-01 |
| D9 (conflito mesmo-dia → v2) | Plano 03, fase-02 |
| D10 (quick-plan inalterado) | Sem plano — Won't Have |
| D11 (requires: []) | Plano 04, fase-01 |
| D12 (origem em lessons-learned) | Plano 04, fase-03 |
| D13 (MEMORY consolidado) | Plano 03, fase-04 |
| D14 (legacy heuristica dupla) | Plano 02, fase-01 |
| D15 (meta — pipeline para refatorar) | Plano 01-04 (em execucao) |

---

<!-- Gerado por /plan-feature em 2026-04-20 -->
