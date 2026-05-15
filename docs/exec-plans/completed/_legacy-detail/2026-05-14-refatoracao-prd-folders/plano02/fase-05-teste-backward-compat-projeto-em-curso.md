# Fase 05: Validacao backward compat — projeto em curso nao eh interrompido

**Plano:** 02 — Deteccao legacy e migracao on-detect
**Sizing:** 1h
**Depende de:** fase-03 (hook plan-feature), fase-04 (hook execute-plan)
**Visual:** false

---

## O que esta fase entrega

Validacao formal (dogfooding manual) do Criterio de Aceite **CA-12** do PRD: um projeto
legacy com planos em andamento (STATE.md com `phase: in-progress` ou `paused`) que recebe a
atualizacao do plugin NAO tem seu trabalho interrompido. A migracao eh oferecida mas nunca
forcada; se dev aceita migrar, progresso eh preservado; se recusa, execucao continua no modo
legacy v1.

Esta fase NAO modifica codigo — eh puramente um roteiro de teste manual que o dev executa para
certificar que o Plano 02 fecha CA-12 do PRD. O resultado eh um relato em MEMORY.md do Plano
02 com status `validated` ou lista de defeitos a corrigir.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `.planning/plano02/MEMORY.md` | Modify | Adicionar secao "Validacao CA-12" com output do dogfooding (pass/fail por cenario) |
| (nenhum codigo do plugin) | — | Esta fase nao edita skills, templates ou libs |

---

## Implementacao

### Passo 1 — Preparar fixtures de projeto legacy em curso

Criar em `f:\Projetos\Claude code\.planning-test-ca12\` (fora do `.planning/` real para nao
poluir) tres fixtures distintas, cada uma simulando um projeto legacy em um estado diferente
de execucao:

#### Fixture A — "Projeto pausado no meio do Plano 02"

```
.planning-test-ca12/fixture-a/.planning/
├── PRD-auth.md                       (conteudo: PRD qualquer, com Must Have aprovados)
├── PLAN-auth.md                      (conteudo: overview de 3 planos)
├── STATE-auth.md                     (phase: paused, current_plan: 02, progress: 3/8)
├── plano01/
│   ├── README.md
│   ├── MEMORY.md                     (metricas: 4 fases concluidas, 2 bugs registrados)
│   ├── fase-01-tipos.md
│   ├── fase-02-migration.md
│   ├── fase-03-queries.md
│   └── fase-04-endpoints.md
├── plano02/
│   ├── README.md
│   ├── MEMORY.md                     (metricas: 1/4 fases concluidas)
│   ├── fase-01-componente-form.md    (status: done)
│   ├── fase-02-hooks.md              (status: in-progress)
│   ├── fase-03-pagina.md
│   └── fase-04-e2e.md
└── plano03/
    ├── README.md
    ├── MEMORY.md
    └── fase-01-polish.md
```

#### Fixture B — "Projeto flat v1 em execucao"

```
.planning-test-ca12/fixture-b/.planning/
├── PRD-notifications.md
├── PLAN-notifications.md             (formato flat com waves e tasks)
└── STATE-notifications.md            (phase: in-progress, current_wave: 2)
```

Sem planoNN/ (estrutura flat v1 pura). Detector retorna legacy=true por sinal A (PRD solto),
nao sinal B. Sinal C entra tambem (PLAN/STATE soltos).

#### Fixture C — "Projeto ambiguous — planoNN sem PRD"

```
.planning-test-ca12/fixture-c/.planning/
├── plano01/
│   ├── README.md
│   ├── MEMORY.md
│   └── fase-01-exploratorio.md       (dev comecou sem PRD formal)
```

Detector marca `ambiguous: true, suggestedSlug: null`. Dev precisa fornecer slug.

### Passo 2 — Roteiro de teste por cenario

Para cada fixture, executar o seguinte roteiro com a fixture como `.planning/` ativa do
contexto de teste (copiando para pasta temporaria e apontando as skills para la).

#### Cenario 1 — Detectar sem migrar (CA-12 core)

1. Rodar `/anti-vibe-coding:execute-plan` sobre a fixture A
2. **Esperado:** Step 0 detecta legacy, apresenta artefatos, pergunta "migrar?"
3. Responder: "Nao — executar legacy em modo v1"
4. **Esperado:** execute-plan vai para Step 1 no modo legacy, le `PLAN-auth.md` solto,
   entra em Step 2 hierarquico (encontra planoNN/), le STATE-auth.md, reconhece
   `phase: paused, current_plan: 02`, oferece retomar fase-02 do plano 02
5. **CA-12 PASS se:** nada foi movido, STATE.md intacto, dev pode retomar exatamente de onde
   parou

#### Cenario 2 — Detectar e migrar (CA-12 preserva progresso)

1. Rodar `/anti-vibe-coding:execute-plan` sobre copia da fixture A
2. **Esperado:** Step 0 detecta legacy, sugere `2026-04-20-auth`
3. Responder: "Sim, migrar agora"
4. **Esperado:** migrateLegacy executa, todos os 6 artefatos movem para
   `.planning/2026-04-20-auth/`
5. **Esperado:** execute-plan continua no Step 1 dentro da pasta migrada, le STATE.md da
   nova pasta, ve `phase: paused, current_plan: 02`, oferece retomar fase-02 do plano 02
6. **CA-12 PASS se:** STATE.md apos migracao tem:
   - `phase: paused` (mantido)
   - `current_plan: 02` (mantido)
   - Progresso 3/8 (mantido)
   - Log contem NOVA linha: "migracao legacy — 6 artefatos movidos..."
   - Conteudo das 3 MEMORY.md (plano01/02/03) intacto
   - Fase-02 do plano02 continua marcada como in-progress

#### Cenario 3 — Fixture B flat v1 em execucao, migra

1. Rodar `/execute-plan` sobre fixture B (sem planoNN/)
2. **Esperado:** Step 0 detecta legacy (sinal A: PRD-notifications.md), sugere slug "notifications"
3. Responder: "Sim, migrar"
4. **Esperado:** PRD + PLAN + STATE movem para `2026-04-20-notifications/`
5. **Esperado:** Step 1 vai para pasta, Step 1b detecta PLAN como flat (waves), entra no
   Step 2-FLAT no MODO MIGRADO (operando dentro de pasta), continua a wave 2 de onde parou
6. **CA-12 PASS se:** STATE.md migrado mantem `current_wave: 2`, dev retoma de onde parou
   sem re-executar waves anteriores

#### Cenario 4 — Fixture C ambiguous, dev fornece slug

1. Rodar `/plan-feature` sobre fixture C
2. **Esperado:** Step 0 detecta legacy (sinal B apenas), ambiguous=true
3. **Esperado:** pergunta slug ao dev
4. Responder slug invalido "Auth Systems" → re-pergunta
5. Responder "auth-exploratorio" (valido)
6. **Esperado:** sugere pasta `2026-04-20-auth-exploratorio/`, pede confirmacao de migracao
7. Responder "sim"
8. **Esperado:** plano01/ (unico artefato) eh movido para dentro da pasta
9. **CA-12 PASS se:** plano01 preservado byte-a-byte dentro da nova pasta, plan-feature
   continua para Step 1 pedindo o PRD (que nao existe, oferece criar)

#### Cenario 5 — Cancelamento total

1. Rodar `/execute-plan` sobre fixture A
2. Responder "Cancelar" no Step 0
3. **Esperado:** skill encerra imediatamente, zero arquivos tocados, zero pastas criadas
4. **CA-12 PASS se:** `diff -r fixture-a-backup fixture-a-apos-cancelar` retorna vazio

#### Cenario 6 — Migracao falha no meio (rollback)

1. Copiar fixture A para area temporaria
2. **Preparar falha induzida:** tornar `plano02/` readonly (chmod ou equivalente Windows) de
   modo que o `mv` da pasta para o destino falhe
3. Rodar `/execute-plan`, responder "sim, migrar"
4. **Esperado:** migrateLegacy tenta mover PRD.md (ok), PLAN.md (ok), STATE.md (ok),
   CONTEXT.md (n/a aqui), plano01/ (ok), plano02/ (FALHA). Rollback dispara.
5. **Esperado:** rollback move os 4 arquivos e 1 pasta DE VOLTA para `.planning/` raiz
6. **Esperado:** pasta destino vazia eh removida (rmdir)
7. **Esperado:** mensagem ao dev "migracao falhou e foi revertida. erro: ..."
8. **CA-12 PASS se:** `diff -r fixture-a-backup fixture-a-apos-rollback` retorna vazio.
   Estado legacy inalterado. execute-plan pergunta se dev quer prosseguir legacy ou cancelar.

### Passo 3 — Registrar resultado em MEMORY.md

Apos executar os 6 cenarios, editar `.planning/plano02/MEMORY.md` adicionando uma nova secao:

```markdown
## Validacao CA-12 (fase-05)

**Data:** {YYYY-MM-DD}
**Executado por:** {nome/sessao}

| Cenario | Resultado | Notas |
|---------|-----------|-------|
| 1. Detectar sem migrar | {PASS/FAIL} | {observacoes} |
| 2. Detectar e migrar | {PASS/FAIL} | {observacoes} |
| 3. Fixture B flat v1 | {PASS/FAIL} | {observacoes} |
| 4. Fixture C ambiguous | {PASS/FAIL} | {observacoes} |
| 5. Cancelamento | {PASS/FAIL} | {observacoes} |
| 6. Rollback atomico | {PASS/FAIL} | {observacoes} |

**Conclusao CA-12:** {validated / defeitos abertos}

Se defeitos: listar em "Bugs Descobertos" e abrir follow-ups.
```

### Passo 4 — Limpeza

Apos validacao:
- Deletar `.planning-test-ca12/` (todas as fixtures + backups)
- Se nao houver defeitos: marcar fase-05 como done no STATE.md
- Se houver defeitos: registrar em `MEMORY.md` e abrir nova fase ou ciclo de retry nas fases
  03/04

---

## Gotchas

- **G6 do plano (CA-12 core):** Esta fase existe para CERTIFICAR que G6 foi respeitado. O teste
  crucial eh Cenario 2 — STATE.md com `phase: paused` sendo preservado apos migracao. Se
  falhar aqui, volte para fase-02 (migracao pode ter regenerado STATE.md em vez de preservar).
- **G2 do plano (R6 rollback):** Cenario 6 testa explicitamente a atomicidade. Se rollback
  falhar parcial, CA-12 falha — o projeto ficaria em estado corrompido (metade no lugar,
  metade na pasta destino). Zero tolerancia aqui.
- **G8 do plano (nao-destrutivo):** Cenarios 1 e 5 validam que "nao" e "cancelar" sao
  absolutamente seguros. Comparar fixture antes e depois com `diff -r` — deve dar vazio.
- **Local (ambiente Windows):** Induzir falha de `mv` no Windows pode ser diferente do Unix.
  Alternativas: criar arquivo com mesmo nome no destino antes da migracao, ou usar
  `attrib +r` para readonly. Documentar no MEMORY.md qual tecnica funcionou.
- **Local (dogfooding de skill-em-skill):** Rodar /plan-feature sobre fixture requer apontar a
  skill para uma `.planning/` alternativa. Uma maneira: copiar fixture temporariamente para
  `.planning/` do projeto real (com backup prev.), rodar teste, restaurar backup. Anotar esse
  protocolo em MEMORY.md.

---

## Verificacao

### TDD (dogfooding manual)

- [ ] Todas as 3 fixtures criadas em `.planning-test-ca12/`
- [ ] Backup completo de cada fixture antes de cada cenario (tar/zip) para comparar apos
- [ ] 6 cenarios executados e resultados registrados em MEMORY.md
- [ ] Cenario 2 (migracao preservando progresso) — validado com comparacao explicita
  do STATE.md pre e pos-migracao: mesmos campos phase/current_plan/progress
- [ ] Cenario 5 (cancelamento) — `diff -r` retorna vazio
- [ ] Cenario 6 (rollback) — `diff -r` retorna vazio apos rollback
- [ ] Fixtures deletadas apos validacao

### Checklist

- [ ] 3 fixtures documentadas com estado inicial claro
- [ ] 6 cenarios executados com resultado PASS ou FAIL claro
- [ ] MEMORY.md do Plano 02 atualizado com tabela de resultados
- [ ] Se algum cenario FAIL: bug registrado na secao "Bugs Descobertos" com sintoma/causa/fix
  sugerido
- [ ] Se todos PASS: conclusao `CA-12 validated` registrada
- [ ] Fixtures e backups limpos

---

## Criterio de Aceite

**Por maquina:**
- `grep -A 20 "Validacao CA-12" .planning/plano02/MEMORY.md` mostra a tabela com 6 cenarios

**Por humano:**
- Todos os 6 cenarios com resultado PASS (ou defeitos claramente registrados com plano de
  correcao)
- Especificamente, CA-12 do PRD considerado fechado: "dado um projeto legacy em execucao,
  quando o plugin eh atualizado e o dev roda /execute-plan, a execucao continua sem
  interromper trabalho em curso"

---

<!-- Gerado por /plan-feature em 2026-04-20 -->
