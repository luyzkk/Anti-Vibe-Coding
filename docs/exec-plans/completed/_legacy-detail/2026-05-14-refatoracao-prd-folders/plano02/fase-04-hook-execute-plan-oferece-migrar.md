# Fase 04: Hook no execute-plan que oferece migrar legacy

**Plano:** 02 — Deteccao legacy e migracao on-detect
**Sizing:** 1.5h
**Depende de:** fase-01 (detector), fase-02 (migrator)
**Visual:** false

---

## O que esta fase entrega

Novo **Step 0 — Deteccao de Legacy** no `execute-plan/SKILL.md`, simetrico ao da fase-03 mas
com uma consideracao extra: o execute-plan aceita PLAN.md **flat** (formato v1, backward
compat via Step 2-FLAT). Se o legacy detectado incluir um `.planning/PLAN.md` solto, o Step 0
oferece migrar para pasta antes de entrar no Step 2-FLAT. Se dev recusar, Step 2-FLAT continua
operando a partir de `.planning/` raiz conforme formato v1 legacy.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/execute-plan/SKILL.md` | Modify | Inserir Step 0 novo antes do Step 1 atual; atualizar Step 2-FLAT para explicitar interacao com legacy; adicionar referencias a lib/* |

---

## Implementacao

### Passo 1 — Inserir Step 0 no execute-plan/SKILL.md

Localizar `## Step 1 — Detectar Formato e Ler Plano` (linha ~25 do arquivo atual).
IMEDIATAMENTE antes, inserir:

```markdown
## Step 0 — Deteccao de Legacy

Roda antes de qualquer outra coisa. Se `.planning/` tem artefatos soltos pre-refatoracao
(`PRD-*.md`, `PLAN-*.md`, `STATE-*.md`, `planoNN/` solto), oferece migrar para pasta datada.

Algoritmo: `lib/legacy-detector.md`.
Migracao: `lib/legacy-migrator.md`.

### Fluxo

1. Se `.planning/` nao existe: skip — ir para Step 1.
2. Executar `detectLegacy(".planning/")`.
3. Se `legacy == false`: skip — ir para Step 1.
4. Se `legacy == true`:
   a. Apresentar ao dev:
      "Detectei estrutura legacy em .planning/:
         Sinais: {signals.join(', ')}
         Artefatos:
           - {cada artifact.path}
         Slug inferido: {suggestedSlug ou 'nenhum — dev fornece'}"
   b. Se detectou apenas PLAN.md/STATE.md flat (sinal C sem A nem B):
      - Isso indica formato v1 puro legacy (raro — mas possivel em projetos muito antigos).
      - Oferecer migracao tambem, mas explicar:
        "Detectei PLAN.md no formato flat (v1). A migracao move-o para dentro de uma pasta
        datada. O execute-plan entao rodara via Step 2-FLAT DENTRO da pasta. O formato interno
        do PLAN.md (waves/tasks) nao sera alterado."
   c. Se `suggestedSlug` for null (ambiguous):
      - AskUserQuestion: "Qual slug usar para a pasta destino? (kebab-case)"
      - Validar regex `^[a-z0-9][a-z0-9-]*$`; re-perguntar 1x em caso de invalido
   d. Computar `targetFolderName = "{YYYY-MM-DD}-{slug}"`
   e. Se pasta destino ja existir: oferecer `-v2` ou cancelar (mitiga R7)
   f. AskUserQuestion:
      - "Sim, migrar agora e executar dentro da pasta"
      - "Nao — executar legacy em modo v1 a partir de .planning/ raiz (nao migra)"
      - "Cancelar execute-plan"
   g. Se "Sim":
      - Chamar `migrateLegacy(detectorResult, targetFolderName)`
      - Se `status == "success"`: continuar Step 1 dentro da pasta migrada
      - Se `rolled_back`/`aborted`: reportar erro, perguntar se prosseguir em modo legacy
        ou cancelar
   h. Se "Nao":
      - Modo legacy v1 ativado apenas para esta invocacao
      - Ir para Step 1 com a convencao ANTIGA: ler `.planning/PLAN-*.md` solto,
        `.planning/STATE-*.md` solto, `.planning/plano*/` solto — formato v1 como era antes
        desta refatoracao
      - No Step 1b, se detectar PLAN flat: ir para Step 2-FLAT que agora precisa operar de
        forma condicional (ver Passo 3 desta fase abaixo)
   i. Se "Cancelar": encerrar execute-plan sem tocar em nada

### Regras

- Step 0 roda apenas 1 vez por invocacao
- Se migracao falhou: dev decide prosseguir legacy ou cancelar — nunca re-tentar sozinho
- Se dev escolheu "Nao (legacy v1)": essa decisao vale SO para esta invocacao — proxima
  chamada pergunta de novo
```

### Passo 2 — Atualizar secao `## Step 1 — Detectar Formato e Ler Plano`

O Step 1 atual faz glob em `.planning/PLAN-*.md`. Apos Plano 01, ele foi adaptado para buscar
dentro de pasta datada. Nesta fase, adicionar uma nota:

```markdown
### 1a. Localizar plano

Se Step 0 detectou legacy e dev escolheu MODO LEGACY v1:
  - Buscar em `.planning/PLAN-*.md` solto (formato antigo)
  - Prosseguir para 1b normal

Caso contrario (projeto greenfield OU legacy migrado):
  - Buscar em pastas `.planning/YYYY-MM-DD-*/PLAN.md`
  - Se 1 pasta ativa: usar
  - Se varias: listar e pedir escolha (integracao com fase-01 do Plano 03)
  - ...
```

Nota: como a descoberta multi-PRD completa eh Plano 03 (fase-01), aqui apenas:
- Se 1 pasta ativa com PLAN.md: usar ela
- Se multiplas: avisar "multi-PRD discovery ainda nao implementado — por enquanto passe path
  como argumento" (Plano 03 completa)

### Passo 3 — Atualizar Step 2-FLAT para operar dentro de pasta

**Gotcha G-PLAN-2 herdado do Plano 01:** apos Plano 01, o Step 2-FLAT do execute-plan opera
DENTRO de uma pasta datada. O legacy detectado e migrado entra nessa categoria — o PLAN.md
flat foi movido para `{targetFolderName}/PLAN.md` e o Step 2-FLAT processa ele de la.

Se o dev escolheu modo legacy v1 (sem migrar), o Step 2-FLAT precisa operar no modo ANTIGO
(a partir de `.planning/PLAN.md` solto). Isso eh a condicionalidade.

Inserir na secao `## Step 2-FLAT — Backward Compat (Formato v1)`:

```markdown
### Contexto de operacao

Apos Plano 01 da refatoracao de pastas, o Step 2-FLAT pode operar em 2 modos:

1. **Modo migrado (default pos-refatoracao):** PLAN.md flat vive dentro de
   `.planning/YYYY-MM-DD-{slug}/PLAN.md`. STATE.md ao lado. Step 2-FLAT le de la.

2. **Modo legacy v1 (opt-in):** Dev escolheu "nao migrar" no Step 0 OU esta eh uma invocacao em
   projeto pre-refatoracao que ainda nao detectou legacy (caso muito raro). PLAN.md esta em
   `.planning/PLAN-{feature}.md` solto. Step 2-FLAT le de la.

O modo eh determinado no Step 0 e propagado como variavel de contexto da invocacao. O conteudo
interno do PLAN.md (waves/tasks) eh IDENTICO nos 2 modos — so o path eh diferente.
```

### Passo 4 — Atualizar secao Referencias

Adicionar ao final:

```markdown
## Referencias

- `references/wave-execution.md` — Waves e paralelismo (formato flat, ja existente)
- `skills/plan-feature/templates/memory-template.md` — Template de memoria
- `agents/plan-executor.md` — Agent que executa tasks/fases
- `agents/plan-verifier.md` — Agent verificador
- `skills/lib/legacy-detector.md` — Deteccao de legacy (Step 0)
- `skills/lib/legacy-migrator.md` — Migracao atomica (Step 0 quando dev confirma)
```

---

## Gotchas

- **G1 do plano (falso positivo):** detector ja filtra — nao duplicar logica aqui.
- **G3 do plano (concorrencia R7):** colisao de pasta destino trata no Step 0 Passo e.
  Importante: se duas sessoes execute-plan rodarem concorrentemente em um projeto legacy, a
  primeira que chegar migra; a segunda ve pasta ja existente e aborta com mensagem. Nenhum
  lock necessario.
- **G5 do plano (backward compat v1 PLAN flat):** Esta eh a fase onde G5 se concretiza. O dev
  pode ter PLAN.md flat + planos em execucao. A migracao PRESERVA conteudo byte-a-byte. STATE.md
  flat tambem eh movido como esta — dev acorda na pasta migrada com mesmo progresso.
- **G6 do plano (CA-12 nao interromper):** Se dev estava em meio de execucao (STATE.md com
  `phase: in-progress`), a migracao move o STATE.md intacto. Apos migrar, execute-plan le o
  STATE.md da nova pasta, ve o mesmo `Current Plan`, e retoma de onde parou. CA-12 validado
  aqui (e na fase-05).
- **G-PLAN-2 herdado:** Step 2-FLAT operando dentro de pasta eh responsabilidade do Plano 01;
  esta fase SO adiciona a condicionalidade (modo migrado vs modo legacy v1). Verificar que o
  Plano 01 ja ajustou o Step 2-FLAT para usar path da pasta — se nao ajustou, bloquear esta
  fase e reportar ao dev.
- **Local (ordem x plan-feature):** plan-feature (fase-03) e execute-plan (fase-04) tem Steps 0
  gemeos mas INDEPENDENTES. Se dev rodar plan-feature e recusar migrar, depois rodar
  execute-plan, o execute-plan vai perguntar DE NOVO. Isso eh OK — sao invocacoes separadas,
  nao ha estado compartilhado. Documentar explicitamente para que o dev nao se surpreenda.

---

## Verificacao

### TDD (dogfooding manual)

- [ ] **RED — legacy hierarquico:** fixture com `PRD-auth.md` + `planoNN/fase-*.md` + `STATE-auth.md`
  (sem PLAN.md flat). Simular Step 0: oferece migrar; se "sim", migra; execute-plan entra no
  Step 2 hierarquico lendo STATE.md da nova pasta.
- [ ] **RED — legacy flat v1:** fixture com `PLAN-auth.md` (flat com waves) + `STATE-auth.md`
  + sem planoNN/. Simular Step 0: detector acha sinal A (PRD?) — se nao tiver PRD, sinais
  podem ficar so em C. Revisar: o detector SO retorna legacy se houver sinal A ou B (conforme
  fase-01). Sinal C sozinho nao eh legacy. Entao esse caso (PLAN flat puro sem PRD/plano)
  passa direto para Step 1 e Step 1b detecta flat normalmente. CONFIRMAR essa decisao.
- [ ] **RED — legacy misto:** fixture com `PRD-auth.md` + `PLAN-auth.md` flat + `STATE-auth.md`
  + planoNN/. Sinais A, B e C presentes. Oferece migrar; se "sim", tudo vai para a pasta. Step
  1 do execute-plan vai para pasta e detecta formato: se STATE estava flat com waves → Step 2-FLAT
  no modo migrado (dentro da pasta). Se STATE era hierarquico → Step 2 normal. Ambos devem
  funcionar.
- [ ] **RED — dev recusa migrar (modo legacy v1):** responder "nao, executar legacy v1".
  Confirmar: execute-plan le `.planning-test/PLAN-auth.md` solto no Step 1, entra em Step 2-FLAT
  no modo legacy, executa normalmente. Nada foi migrado. Na proxima invocacao, Step 0 vai
  perguntar de novo (nao ha cache entre sessoes).
- [ ] **RED — dev cancela:** responder "cancelar". Confirmar que skill encerra sem tocar em nada.
- [ ] **RED — ambiguous + validacao de slug:** so `planoNN/fase-*.md` sem PRD. Detector marca
  ambiguous. Passo 1.c pergunta slug. Testar slug invalido ("Auth Systems") → re-pergunta; slug
  valido → prossegue.
- [ ] **RED — CA-12 crucial:** fixture legacy com STATE.md marcando `phase: in-progress`, `plano02/`
  com fases parcialmente done. Migrar. Validar que apos migracao, execute-plan le o STATE.md
  migrado, identifica plano02 como current, fase X como proxima pendente. Progresso preservado.

### Checklist

- [ ] Step 0 inserido em `execute-plan/SKILL.md` ANTES do Step 1 atual
- [ ] Fluxo cobre: legacy hierarquico / legacy flat / misto / recusa v1 / cancelar / ambiguous / CA-12
- [ ] Step 2-FLAT teve secao "Contexto de operacao" adicionada explicando os 2 modos (migrado
  vs v1)
- [ ] Step 1a teve nota sobre buscar em pasta vs raiz conforme modo
- [ ] Referencias a `lib/legacy-detector.md` e `lib/legacy-migrator.md` adicionadas
- [ ] Numeracao Step 1..Step 7 preservada (so adicionou Step 0)
- [ ] Verificado que Plano 01 ja ajustou Step 2-FLAT para operar dentro de pasta (caso contrario,
  bloquear esta fase)
- [ ] Fixtures de teste removidas apos validacao

---

## Criterio de Aceite

**Por maquina:**
- `grep -c "Step 0 — Deteccao de Legacy" anti-vibe-coding/skills/execute-plan/SKILL.md` retorna 1
- `grep -c "lib/legacy-detector.md" anti-vibe-coding/skills/execute-plan/SKILL.md` >= 1
- `grep -c "lib/legacy-migrator.md" anti-vibe-coding/skills/execute-plan/SKILL.md` >= 1
- `grep -c "Modo legacy v1" anti-vibe-coding/skills/execute-plan/SKILL.md` >= 1

**Por humano:**
- Os 7 cenarios de dogfooding manualmente validados com comportamento esperado
- CA-12 do PRD explicitamente confirmado: projeto legacy em execucao migra sem perder
  progresso (STATE.md intacto pos-migracao)
- Com "cancelar": skill encerra limpa

---

<!-- Gerado por /plan-feature em 2026-04-20 -->
