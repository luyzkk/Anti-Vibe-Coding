# Fase 03: execute-plan navega dentro da pasta

**Plano:** 01 — Nova estrutura (fundacao + tracer bullet)
**Sizing:** 1.5h
**Depende de:** fase-02 (precisa de `PLAN.md`, `STATE.md` e `planoNN/` gerados dentro da pasta para navegar)
**Visual:** false

---

## O que esta fase entrega

`/execute-plan` deixa de buscar `PLAN-*.md` e `STATE-*.md` soltos na raiz de `.planning/` e passa a operar dentro da pasta datada: le `STATE.md` local, navega `planoNN/` local, spawna subagentes com caminhos absolutos da pasta.

**Ponto critico:** `STATE.md` LOCAL por pasta eh o que viabiliza D3 (paralelismo sem lock global). Duas sessoes Claude podem rodar `/execute-plan` em pastas diferentes sem qualquer coordenacao.

Apos esta fase, o fluxo `write-prd → plan-feature → execute-plan` funciona end-to-end contido em uma pasta, greenfield. Atende CA-03 e estabelece base para CA-05 (paralelismo).

Escopo NAO inclui:
- Deteccao de legacy — Plano 02
- Descoberta interativa quando ha 2+ PRDs (listar e pedir escolha) — Plano 03, fase-01 (mas esta fase DEVE suportar o caso 1 PRD sem travar)
- Arquivamento em `_archive/` — Plano 03, fase-03
- `requires:` cross-PRD — Plano 04

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/execute-plan/SKILL.md` | Modify | Reescrever **Step 1a (Localizar plano)**, **Step 2 (Ler Estado Global)**, **Step 3a (Carregar plano)**, **Step 4b (Spawn de Subagente)** e **Step 7a (SUMMARY)** para operar dentro da pasta datada |

---

## Implementacao

### Passo 1: Reescrever Step 1a — Localizar plano

Arquivo `anti-vibe-coding/skills/execute-plan/SKILL.md`, linhas ~28-43. Logica atual busca `.planning/PLAN-*.md` solto. Nova logica:

```
### 1a. Localizar plano

Se caminho fornecido:
  - /execute-plan ".planning/YYYY-MM-DD-slug/" → PASTA_ATIVA = essa pasta
  - /execute-plan ".planning/YYYY-MM-DD-slug/PLAN.md" → PASTA_ATIVA = diretorio pai
  - Ler `{PASTA_ATIVA}/PLAN.md`
  - Se PLAN.md nao existir: "PLAN.md nao encontrado em `{PASTA_ATIVA}`. Rode /plan-feature primeiro."

Se nao forneceu caminho:
  - Glob: ".planning/*/PLAN.md" filtrando padrao de pasta `YYYY-MM-DD-*` e IGNORANDO `_archive/`
  - Se 1 match: PASTA_ATIVA = diretorio desse PLAN.md. Confirmar: "Encontrei PLAN em `{PASTA_ATIVA}/PLAN.md`. Vou executar."
  - Se mais de 1: listar pastas com status resumido (ler STATE.md de cada, apresentar Phase). Descoberta completa (filtros, listas organizadas) eh Plano 03 fase-01 — aqui basta listar e pedir escolha minimal.
  - Se 0: "Nao encontrei nenhum PLAN.md em `.planning/YYYY-MM-DD-*/`. Quer criar com /plan-feature?"
```

### Passo 2: Reescrever Step 1b — Detectar formato

Arquivo `SKILL.md`, linhas ~47-61. Atualmente detecta hierarquico por `Glob ".planning/plano*/"`. Nova logica:

```
### 1b. Detectar formato

HIERARQUICO (v2 — NOVA ESTRUTURA):
  - PASTA_ATIVA contem `PLAN.md`
  - Glob `{PASTA_ATIVA}/plano*/` encontra pastas
  - Cada pasta tem README.md + fase-*.md

FLAT (v1 — backward compat):
  - PLAN.md contem "## Wave" com slices/tasks
  - Nao existem subpastas `plano*/`
  - IMPORTANTE: o fluxo FLAT pode vir de pasta datada (se `plan-feature` fallback gerou plano unico) OU de legacy (PLAN.md solto na raiz). Deteccao de legacy eh Plano 02 — aqui apenas seguir fluxo flat se detectado dentro de PASTA_ATIVA.
```

### Passo 3: Reescrever Step 2 — Ler Estado Global

Arquivo `SKILL.md`, linhas ~66-98. Caminho atual: `.planning/STATE-{feature-name}.md`. Nova logica:

```
Nome esperado: `{PASTA_ATIVA}/STATE.md` (nu, sem prefixo, LOCAL a pasta)

Se STATE.md existe:
  Ler e verificar (fluxo identico ao atual, apenas caminho diferente)

Se STATE.md nao existe:
  Criar a partir do PLAN overview em `{PASTA_ATIVA}/STATE.md`
```

Atualizar o "Formato do STATE.md" (linhas ~99-124) para refletir:

```markdown
# State: {Feature Name}

**Plan:** ./PLAN.md  (caminho RELATIVO — STATE.md vive ao lado)
**Phase:** {planned | in-progress | paused | completed}
**Current Plan:** {NN}/{total}
**Last Updated:** {date}

(restante do template igual)
```

A referencia ao PLAN.md agora eh relativa (`./PLAN.md`) porque ambos vivem na mesma pasta. Isso simplifica e evita caminhos absolutos hardcoded.

### Passo 4: Reescrever Step 3a — Carregar plano

Arquivo `SKILL.md`, linhas ~132-137. Caminho atual: `.planning/plano{NN}/README.md`. Nova logica:

```
1. Identificar plano ativo do STATE.md (Current Plan: NN)
2. Ler `{PASTA_ATIVA}/plano{NN}/README.md`
3. Listar fases: Glob `{PASTA_ATIVA}/plano{NN}/fase-*.md`
4. Identificar proxima fase pendente
```

### Passo 5: Reescrever Step 4b — Spawn de Subagente

Arquivo `SKILL.md`, linhas ~197-217. O subagente `plan-executor` recebe caminhos hoje relativos a `.planning/`. Precisa receber caminhos absolutos dentro de PASTA_ATIVA:

```
RECEBE:
- PASTA_ATIVA (caminho absoluto — contexto obrigatorio)
- Arquivo da fase: `{PASTA_ATIVA}/plano{NN}/fase-MM-nome.md` (completo)
- README do plano: `{PASTA_ATIVA}/plano{NN}/README.md`
- "Notas para Planos Seguintes" de `{PASTA_ATIVA}/plano{01..NN-1}/MEMORY.md`
- Estado atual: relevant-only do `{PASTA_ATIVA}/STATE.md` (progresso, nao logs completos)
- Padrao de codigo existente (1-2 arquivos de referencia do codebase do projeto — nao do .planning/)
- Instrucao: "Commits e edits de codigo vao para o repositorio DO PROJETO, nao dentro de PASTA_ATIVA.
  PASTA_ATIVA eh apenas para artefatos de planejamento (MEMORY.md, STATE.md updates)."

NAO RECEBE:
- PRD completo
- Outras fases
- MEMORY.md completa de planos anteriores (so "Notas para Planos Seguintes")
- Conversas anteriores
```

### Passo 6: Reescrever Step 4d — Coletar Resultados e Atualizar Memoria

Linhas ~243-269. Atualizar caminhos de `STATE.md` e `MEMORY.md`:

```
3. Atualizar `{PASTA_ATIVA}/STATE.md`:
   - Mudar status da fase
   - Incrementar progresso
   - Registrar evento no Log

4. Atualizar `{PASTA_ATIVA}/plano{NN}/MEMORY.md` do plano ativo:
   - Append decisoes, bugs, gotchas, desvios
   - Atualizar metricas
```

### Passo 7: Reescrever Step 7a — Gerar SUMMARY.md

Arquivo `SKILL.md`, linhas ~413-445. Atualmente gera `.planning/SUMMARY-{feature-name}.md`. Nova logica:

```
Gerar `{PASTA_ATIVA}/SUMMARY.md` (nu, sem prefixo):

(template preservado — so o caminho mudou)
```

### Passo 8: Atualizar Step 2-FLAT (backward compat)

Linhas ~486-524. O fluxo flat continua valido mas agora tambem opera DENTRO de PASTA_ATIVA (se o `plan-feature` fez fallback para plano unico dentro de uma pasta datada). Adicionar nota:

```
Step 2-FLAT assume PASTA_ATIVA ja identificada no Step 1.
Todos os caminhos (STATE.md, logs) vivem dentro de PASTA_ATIVA.
Se detectar PLAN.md SOLTO na raiz de `.planning/` (sem pasta datada),
isso eh legacy puro — Plano 02 cuida da migracao. Nesta fase, apenas
avisar: "PLAN.md solto detectado. Migracao sera oferecida em versao futura."
```

### Passo 9: Atualizar exemplo de estrutura / Pipeline Integration

Ajustar qualquer menciona a `.planning/PLAN-{feature}.md`, `.planning/STATE-*.md`, `.planning/SUMMARY-*.md` para caminhos dentro de PASTA_ATIVA. Linhas ~544-570 (Pipeline Integration, Escape Hatches, Referencias).

---

## Gotchas

- **G3 do plano (D3) critico:** `STATE.md` tem que ficar DENTRO da pasta. Qualquer centralizacao (ex: `.planning/STATE-all.md`) destruiria o paralelismo sem lock. Esse eh o ponto arquitetural do refactor — NAO ceder a essa tentacao.
- **G1/G2 do plano (D1/D2) herdados:** Pasta `YYYY-MM-DD-{slug}/`, arquivos nus (`STATE.md`, nao `STATE-{slug}.md`).
- **G8 do plano:** Se `execute-plan` rodar em `.planning/` que so tem legacy (`PLAN-*.md` solto na raiz, `plano01/` solto), a skill AGORA nao encontra nada via glob `.planning/*/PLAN.md` — ela deve falhar com mensagem clara ("Nenhum PLAN.md em pasta datada. Legacy detectado? Aguarde Plano 02.") em vez de rodar silenciosamente o fluxo flat antigo sobre os arquivos soltos.
- **Local:** O caminho do PLAN dentro do STATE.md agora eh RELATIVO (`./PLAN.md`). Isso torna a pasta "movel" — se o dev renomear ou mover a pasta, as referencias internas continuam funcionando. Antes, STATE referenciava `.planning/PLAN-feature.md` absoluto e quebrava.
- **Local:** Subagente `plan-executor` precisa saber diferenciar "onde moram os artefatos de planejamento" (PASTA_ATIVA) vs "onde mora o codigo do projeto" (repo root). Isso ja eh separado hoje mas a instrucao deve ser explicita no prompt do subagente para evitar commits acidentais dentro de PASTA_ATIVA.
- **Local:** O modo FLAT (backward compat) agora so se aplica DENTRO de PASTA_ATIVA. Se o dev tem plano flat LEGADO com `.planning/PLAN.md` solto, isso vira Plano 02 (migracao). Esta fase nao suporta esse caso.

---

## Verificacao

### Dogfooding manual

- [ ] **Setup:** Com fases 01 e 02 ja aplicadas, criar PRD + plano de teste:
  - `/write-prd "teste-execute"` → pasta datada com PRD.md
  - `/plan-feature` → gera PLAN.md, STATE.md, plano01/ dentro da pasta
- [ ] **GREEN:** Aplicar mudancas deste plano em `execute-plan/SKILL.md`.
- [ ] **VERIFY 1 (feliz, sem argumento, 1 PRD):** Rodar `/execute-plan`. Confirmar:
  - Skill encontra via glob `.planning/*/PLAN.md`
  - Le `STATE.md` de dentro da pasta
  - Confirma execucao ao dev, mostra fases de plano01/
  - Subagentes recebem PASTA_ATIVA absoluta
  - Atualizacoes de `STATE.md` e `MEMORY.md` ocorrem DENTRO da pasta, nao na raiz
- [ ] **VERIFY 2 (argumento pasta):** Rodar `/execute-plan ".planning/YYYY-MM-DD-teste-execute/"`. Confirmar comportamento identico.
- [ ] **VERIFY 3 (argumento arquivo):** Rodar `/execute-plan ".planning/YYYY-MM-DD-teste-execute/PLAN.md"`. Confirmar deriva pasta pai.
- [ ] **VERIFY 4 (paralelismo — base do CA-05):** Criar 2 pastas simultaneamente (`teste-a/`, `teste-b/`), ambas com PLAN.md + STATE.md. Rodar `/execute-plan` em cada uma em sessoes Claude separadas. Confirmar que cada sessao identifica SUA pasta sem pegar a outra por engano (cada uma le seu STATE.md local).
- [ ] **VERIFY 5 (zero matches):** Com `.planning/` vazia (ou so com legacy solto), rodar `/execute-plan`. Confirmar mensagem clara sem crash.
- [ ] **Cleanup:** Deletar pastas de teste.

### Checklist

- [ ] Step 1a busca via `.planning/*/PLAN.md` com filtro YYYY-MM-DD-*
- [ ] Step 1a aceita argumento pasta E argumento arquivo
- [ ] Step 1b detecta hierarquico/flat DENTRO de PASTA_ATIVA
- [ ] Step 2 le/cria `{PASTA_ATIVA}/STATE.md` com referencia relativa ao PLAN
- [ ] Step 3a navega `{PASTA_ATIVA}/plano{NN}/`
- [ ] Step 4b passa PASTA_ATIVA absoluta ao subagente
- [ ] Step 4d atualiza STATE/MEMORY dentro da pasta
- [ ] Step 7a gera SUMMARY em `{PASTA_ATIVA}/SUMMARY.md`
- [ ] Step 2-FLAT preservado mas operando dentro de PASTA_ATIVA
- [ ] Duas pastas datadas funcionam em paralelo sem colisao
- [ ] `_archive/` eh ignorado pelo glob

---

## Criterio de Aceite

**Por maquina / filesystem:**
- Apos rodar `/write-prd → /plan-feature → /execute-plan` em uma unica pasta datada:
  - `STATE.md` eh atualizado dentro da pasta (ver `.planning/YYYY-MM-DD-X/STATE.md` com campo `Phase` mudando)
  - `MEMORY.md` de `plano01/` eh atualizado dentro da pasta
  - NENHUM arquivo aparece ou eh atualizado na raiz de `.planning/` (exceto `CONTEXT-*.md` preexistente se houver — tratado na fase-04)
- Com duas pastas ativas em paralelo (dois shells), ambas progridem em seus STATEs sem colisao.

**Por humano:**
- Atende CA-03 do PRD: "Dado um PRD com STATE.md em sua pasta, quando `/execute-plan` rodar sem argumento e existir apenas 1 PRD nao arquivado, entao a skill lista esse PRD, pede confirmacao, e prossegue lendo estado e planos de dentro da pasta."
- Atende BASE do CA-05 (paralelismo): dois PRDs coexistem operacionalmente sem lock global. A auditoria completa do CA-05 requer Plano 03 fase-01 (descoberta multi-PRD), mas o mecanismo funciona aqui.

---

<!-- Gerado por /anti-vibe-coding:plan-feature em 2026-04-20 -->
