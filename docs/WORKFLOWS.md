# Dynamic Workflows — Fronteira Workflow / Subagente / Skill

Este documento é a **fonte de verdade única** sobre quando usar Dynamic Workflows do Claude Code
versus subagentes orquestrados na conversa versus skills in-context. Todas as outras superfícies
do plugin (AGENTS.md, skills, banners) apenas referenciam este arquivo — nunca duplicam suas
seções.

---

## Complexidade não é escala

O insight central: **complexidade ≠ escala.**

Uma tarefa pode ser profundamente complexa — multi-domínio, com decisões irreversíveis, exigindo
design cuidadoso — e ainda assim caber perfeitamente em uma conversa estruturada. Para isso existem
`/plan-feature`, `/execute-plan`, `/verify-work`, `/design-twice`: o humano navega, o Claude pilota
turno a turno, todo resultado vive no contexto.

Dynamic Workflows entram quando o **volume** (não a complexidade) estoura o que uma conversa
gerenciável comporta. O sinal é quantitativo: codebase inteiro, centenas de arquivos, fontes
diversas demandando paralelismo real. A complexidade conceitual não muda o mecanismo — muda o
scope que ele precisa cobrir.

**Workflow é a camada ACIMA de `/design-twice`, `/verify-work`, `/execute-plan`** — nunca um
substituto deles. Ver seção [Workflow vs as skills paralelas existentes](#workflow-vs-as-skills-paralelas-existentes).

---

## Modos de orquestração: comparativo

O eixo organizador é **"quem segura o plano"** enquanto o trabalho acontece.

| Dimensão | Subagente (no contexto) | Skill in-context | Dynamic Workflow |
|---|---|---|---|
| Quem segura o plano | Claude, turno a turno | Claude, guiado pela skill | **Script externo** (fora do contexto) |
| Onde vivem os resultados | Contexto da conversa | Contexto da conversa | **Variáveis do script** (resumable) |
| Volume típico de trabalho | Uma a poucas tarefas | Poucas a várias paralelas | **Dezenas a centenas de tarefas** |
| Aprovação de edições | Humano aprova por turno | Humano aprova por turno | **Auto-aprovadas após lançar** |
| Estado entre sessões | Não persiste | Não (skill orquestra no turno) | **Sim — resumable** |
| Quando usar | Delegação pontual | Pipeline estruturado | Volume que estoura a conversa |

**Consequência crítica da linha "auto-aprovadas":** uma vez lançado, o workflow executa sem
checkpoint humano. Leia a caixa [PRIME-DIRECTIVE](#prime-directive) antes de sugerir qualquer uso.

---

## Os 5 gatilhos canônicos (mapeados a sinais semânticos)

O detector do plugin (`hooks/user-prompt-gate.cjs`) mapeia estes sinais. A prosa aqui descreve
**o que aciona** — sem repetir os thresholds numéricos que vivem apenas no hook (INV5).

### 1. Varredura ou auditoria do codebase inteiro

**Sinal:** verbo de cobertura total + escopo amplo ("todo o repositório", "todos os arquivos",
"o codebase inteiro"). Exemplos canônicos: auditoria de segurança em todo o repo, scan de
conformidade em todos os componentes.

*Fallback in-context:* `/verify-work` com escopo limitado a um módulo por vez.

### 2. Migração de volume alto de arquivos

**Sinal:** verbo de migração/transformação + indicação de volume alto ("centenas de arquivos",
"o projeto inteiro", "todas as rotas"). Exemplos: migrar codebase inteiro de CommonJS para ESM,
renomear convenção de nomenclatura em todo o repositório.

*Fallback in-context:* `/execute-plan` dividido em fases de escopo menor.

### 3. Pesquisa cross-checada multi-fonte

**Sinal:** pedido de pesquisa com múltiplas fontes, verificação cruzada ou síntese de grande
volume de documentação. Exemplos: consolidar documentação de API de diversas fontes, comparar
implementações alternativas com evidência.

*Fallback in-context:* `/deep-research` (se disponível) ou `/design-twice` para exploração
multi-ângulo manual.

### 4. Geração ou transformação em massa

**Sinal:** verbo de geração/transformação + contagem alta ou escopo de "todos" ("gerar testes
para todos os módulos", "transformar todos os schemas"). Exemplos: criar fixtures para toda a
suíte de testes, aplicar lint fix automático em todo o projeto.

*Fallback in-context:* `/execute-plan` por módulo, com aprovação incremental.

### 5. Plano multi-ângulo com exploração paralela

**Sinal:** pedido de exploração de múltiplos ângulos/abordagens em paralelo, com síntese
posterior. Exemplos: avaliar N arquiteturas alternativas simultaneamente, gerar N rascunhos
divergentes para revisão.

*Fallback in-context:* `/design-twice` (two-mode explore/critique) ou `/deep-research`
(se disponível) para pesquisa comparativa.

---

## Padrões de qualidade habilitados por workflows

### adversarial-verify

Dois subagentes produzem rascunhos independentes; um terceiro os verifica adversarialmente,
buscando contradições e lacunas. O resultado é mais robusto do que iteração linear.

*Análogo in-context:* `/verify-work` — critique mode após execução.

### multi-angle

N subagentes exploram ângulos divergentes em paralelo (arquiteturas alternativas, abordagens
diferentes para o mesmo problema). A síntese final tem amplitude que a exploração sequencial
não alcança.

*Análogo in-context:* `/design-twice` — explore mode seguido de critique mode.

### loop-until-dry

O script itera até a fonte secar: processar itens enquanto houver fila, aplicar transformações
até convergir, extrair até não restar mais conteúdo relevante.

*Análogo in-context:* `/iterate` — ciclos manuais de refinamento com checkpoint humano.

---

## Limites operacionais

- **Concorrência máxima:** até dezesseis subagentes simultâneos por workflow.
- **Volume por run:** até aproximadamente mil subagentes por execução.
- **Sem input humano no meio do run:** uma vez lançado, o workflow executa de forma autônoma
  até completar ou falhar. Não há checkpoint para aprovação incremental — ver PRIME-DIRECTIVE.
- **Edições auto-aprovadas após lançar:** qualquer ferramenta de escrita (Write, Edit, Bash)
  executada por subagentes do workflow não passa pelo fluxo normal de aprovação humana.
  Esta é a consequência de segurança mais crítica da lista.

---

## Aviso de custo

> **Workflows consomem substancialmente mais tokens do que skills in-context.**
> Dezenas de subagentes em paralelo multiplicam o consumo por fator proporcional ao paralelismo.
> Use workflows apenas quando o volume justifica esse custo — caso contrário, o fallback
> in-context entrega o mesmo resultado com uma fração do gasto.

---

## Gate de disponibilidade e degradação graciosa

**Pré-requisito de versão:** Dynamic Workflows são uma feature research preview que exige
Claude Code v2.1 (build recente) ou superior.

**Desabilitação:** workflows podem ser desabilitados globalmente via flag `disableWorkflows`
nas configurações do Claude Code ou via variável de ambiente `CLAUDE_CODE_DISABLE_WORKFLOWS`.

**Degradação graciosa — princípio do plugin:** toda sugestão de workflow emitida pelo
`[WORKFLOW_ADVISOR]` vem **sempre pareada com um fallback in-context** que funciona mesmo
com workflows desabilitados:

| Gatilho | Fallback prioritário |
|---|---|
| Varredura do codebase | `/verify-work` com escopo reduzido |
| Migração em volume | `/execute-plan` em fases |
| Pesquisa multi-fonte | `/deep-research` (se disponível) |
| Geração em massa | `/execute-plan` por módulo |
| Exploração multi-ângulo | `/design-twice` |

O hedge "(se disponível)" em `/deep-research` é intencional: essa skill não está bundled neste
repositório — ela existe como skill top-level no ambiente do desenvolvedor. Sempre que citada,
carrega esse qualificador.

---

## PRIME-DIRECTIVE

> **PRIME-DIRECTIVE — o plugin SUGERE e pede opt-in pela palavra `workflow`; NUNCA emite a tool
> Workflow nem `decision:block`.** O opt-in é inteiramente ação humana (a mecânica do Claude Code:
> a palavra `workflow` no prompt ou o comando `/effort ultracode`). Esta diretriz é travada por
> teste de CI (`tests/e2e/workflow-advisor-directive.test.ts`), não só por esta prosa.

**O que isso significa na prática:**

- O plugin detecta sinais de escala e **sugere** considerar um workflow — nada mais.
- A decisão de lançar pertence ao humano: incluir a palavra "workflow" no prompt ou invocar
  `/effort ultracode` é o gesto de opt-in explícito.
- Nenhum caminho de código do plugin deve emitir a tool `Workflow` diretamente nem retornar
  `decision:block` para forçar ou impedir a escolha.
- A diretriz é verificada por CI em `tests/e2e/workflow-advisor-directive.test.ts` — qualquer
  mudança que quebre esse teste indica violação da PRIME-DIRECTIVE.

---

## Workflow vs as skills paralelas existentes

Esta seção distingue explicitamente os dois modos de orquestração para evitar confusão.

### Skills in-context (Claude-orquestradas)

As skills existentes do plugin — `/design-twice`, `/verify-work`, `/execute-plan`, e os
exploradores paralelos do `/init` — são **Claude-orquestradas**: Claude gerencia o plano
turno a turno, os resultados ficam no contexto da conversa, a escala é limitada pelo contexto
disponível, e não há estado entre sessões.

Elas são o modo padrão e preferido. Requerem aprovação humana a cada turno relevante.
STATE.md e MEMORY.md usados pelo `/execute-plan` são **artefatos de planejamento humano**,
não variáveis de script — não os confundir com o mecanismo de estado resumable de um workflow
(INV8: não unificar esses conceitos).

### Dynamic Workflows (script-orquestrados)

Workflows são **script-orquestrados**: um script externo gerencia o plano, os resultados vivem
em variáveis do script, a escala pode chegar a centenas de subagentes, e o run é resumable
entre sessões.

Eles existem na **camada ACIMA** das skills in-context, não como substitutos. O plugin os
**oferece ao lado** das skills como opção para volumes que ultrapassam o que uma conversa
comporta — nunca como padrão, nunca substituindo o fluxo `/execute-plan` para tarefas
que cabem em contexto (INV2: offer-alongside / keep-separate).

### Regra de ouro

Se a tarefa cabe em contexto — use as skills. Se o volume estoura o contexto e o paralelismo
real traria ganho mensurável — considere um workflow, com opt-in explícito.

Para pesquisa multi-fonte, `/deep-research` (se disponível) é o caminho concreto in-context;
para volumes que excedem esse escopo, o workflow com padrão `adversarial-verify` ou
`multi-angle` é a escalada natural.

---

*Ver também: [docs/PIPELINE.md](PIPELINE.md) para o pipeline completo de skills,
[ARCHITECTURE.md](../ARCHITECTURE.md) para a arquitetura do plugin.*
