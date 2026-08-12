---
fase: 01
plano: 07
status: planned
---

# Fase 01: Escopar, Varrer, Detectar Conflito com ADR

**Plano:** 07 — `improve-codebase-architecture`
**Sizing:** ~2.5h
**Depende de:** **plano02 fase-01** (dependencia dura — o vocabulario)
**Visual:** false

**Decisoes:** DI-25 (sem o loop de grilling nesta entrega)
**Invariantes:** INV-01 (vocabulario exato) · INV-03 (nao propor interface) · INV-04 (nao encaminhar para o que nao existe)

---

## O que esta fase entrega

A varredura que produz candidatos ranqueados. O relatorio e a fase-02; aqui a saida e estruturada,
ainda sem renderizacao.

---

## Arquivos Afetados

**NOVOS**
- `skills/improve-codebase-architecture/SKILL.md`

**MODIFICADOS**
- `docs/exec-plans/active/2026-08-10-mattpocock-skills-import/plano06/fase-03-saida.md` — o ponteiro
  arquitetural do post-mortem passa a ter destino real
- `THIRD-PARTY-NOTICES.md`

**FORA do escopo**
- Renderizacao HTML (fase-02)
- O loop de grilling (DI-25)

---

## Implementacao

### Passo 1: frontmatter

`name: improve-codebase-architecture` · `description` EN < 250 chars · `user-invocable: true` ·
**`disable-model-invocation: true`**.

User-invoked, ao contrario da maioria dos nossos portes. Razao: e varredura periodica cara, disparada
por decisao do humano ("faz tempo que nao olho a arquitetura"), nunca por uma tarefa em andamento.
Uma skill que varre o codebase inteiro e nao deve poder disparar sozinha no meio de outra coisa.

`allowed-tools: Read, Grep, Glob, Bash, Agent, Write`.

### Passo 2: escopar antes de varrer

Ordem, e ela importa:

1. **Se o usuario deu direcao** — modulo, subsistema, ponto de dor — usar e pular a inferencia
2. **Senao**, caminhar `git log --oneline` num trecho generoso para achar os **hot spots**: os
   arquivos e areas que reaparecem. Deixar esses caminhos puxarem a atencao primeiro
3. **Se as mudancas estao espalhadas** sem hot spot claro, abrir a rede

O porque precisa estar escrito, senao o passo vira burocracia: aprofundar um modulo se paga tornando
mudancas **futuras** nele mais faceis. Aprofundar codigo que ninguem toca ha um ano nao paga nada.

Ler o glossario do projeto (`docs/GLOSSARY.md`, quando existir — plano05) e os ADRs da area antes de
comecar.

### Passo 3: varrer por atrito, nao por heuristica rigida

Spawnar subagente para caminhar o codebase. A instrucao e explorar organicamente e anotar **onde se
sente atrito**:

- entender um conceito exige pular entre muitos modulos pequenos?
- modulos **shallow** — interface quase tao complexa quanto a implementacao?
- funcao pura extraida so por testabilidade, mas o bug real mora em como ela e chamada (sem
  *locality*)?
- modulos acoplados vazando pelo seam?
- partes sem teste, ou dificeis de testar pela interface atual?

### Passo 4: o deletion test como filtro obrigatorio

Todo candidato suspeito de shallow passa pelo **deletion test** (plano02 fase-01): imagine deletar o
modulo — a complexidade **some** (era pass-through) ou **reaparece espalhada em N callers** (estava
se pagando)?

"Reaparece concentrando" e o sinal que se procura. Candidato que nao passa nao entra na lista.

Isto e o filtro contra o modo de falha do README — 30 candidatos genericos.

### Passo 5: o falso positivo previsivel

Nossas skills de dominio (`security` 598 linhas, `system-design` 528, `api-design` 437) sao longas
**por design** — sao referencia consultavel, e um catalogo legitimamente plano nao e shallow nem
sprawl.

Mesma armadilha ja registrada no plano01 fase-03 G4. Escrever no brief do subagente, ou a varredura
reporta 500 linhas de conteudo valido como problema arquitetural.

### Passo 6: conflito com ADR

Antes de listar um candidato, conferir `docs/design-docs/ADR-*.md` da area.

Se contradiz um ADR: **so trazer a tona quando o atrito e real o bastante para justificar reabrir a
decisao.** Ai marcar explicitamente — *"contradiz ADR-0007 — mas vale reabrir porque…"*.

Nao listar todo refactor teorico que algum ADR proibe. ADR existe justamente para nao re-litigar.

### Passo 7: parar em "qual voce quer explorar?" (INV-03)

A varredura **nao propoe interface**. Propor cedo mata a exploracao — e a interface e o que o
`/design-twice` faz melhor, com tres restricoes divergentes.

Encaminhar para `/design-twice` (Dominio 5, plano02 fase-03). Nao para o loop de grilling, que esta
adiado (INV-04, DI-25).

### Passo 8: atualizar o ponteiro do plano06

`plano06/fase-03` registra que o post-mortem arquitetural aponta para `architecture`/
`code-simplification` "ate `improve-codebase-architecture` existir". Existe. Atualizar o texto
daquela fase.

### Passo 9: rodar uma vez neste repo

Antes de declarar pronta. Duas coisas a observar:

- os hot spots que o `git log` revela batem com onde voce **sente** atrito neste repo?
- o falso positivo do Passo 5 aconteceu mesmo assim?

Registrar o resultado no MEMORY.

---

## Gotchas

- **G1** — Deriva de vocabulario ("componente", "servico", "boundary"). INV-01: o vocabulario do
  plano02 e o motivo de a skill ser legivel.
- **G2** — Varrer sem escopar. Sem o hot spot de git, a varredura vira uniforme e o sinal dilui.
- **G3** — Skills de dominio como falso positivo (Passo 5).
- **G4** — Propor interface na varredura (INV-03).
- **G5** — Listar candidato que contradiz ADR sem marcar, ou marcar todos. Os dois extremos erram.
- **G6** — `git log --oneline` num repo raso (clone `--depth 1`) devolve historico truncado e hot
  spot falso. Conferir profundidade antes de confiar no ranking.

---

## Verificacao

### Checklist

- [ ] `bun run harness:validate` verde
- [ ] `description` < 250 chars; `disable-model-invocation: true`
- [ ] Escopo por hot spot presente, com o **porque** escrito
- [ ] Deletion test como filtro obrigatorio por candidato
- [ ] Aviso sobre skills de dominio no brief do subagente
- [ ] Deteccao de conflito com ADR, com o criterio de quando trazer a tona
- [ ] Para em "qual voce quer explorar?"; encaminha para `/design-twice`
- [ ] Zero referencia ao loop de grilling (DI-25)
- [ ] Ponteiro do plano06 fase-03 atualizado
- [ ] Vocabulario do plano02 usado exato (INV-01)

### Execucao real (Passo 9)

- [ ] Rodada neste repo; hot spots comparados com o atrito percebido
- [ ] Falso positivo de skill de dominio verificado
- [ ] Resultado no MEMORY

---

## Criterio de Aceite

**Por maquina:**
- `bun run harness:validate` exit 0
- `grep -i "boundary\|componente\|servico"` nao aparece como termo de arquitetura na SKILL.md
- Zero mencao a `grilling` como proximo passo

**Por humano:**
- Rodar neste repo e receber candidatos que voce reconhece como atrito real
- Nenhuma skill de dominio reportada como problema so por ser longa
- Cada candidato passou pelo deletion test, e da para ver isso no output
