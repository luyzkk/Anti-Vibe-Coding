---
name: tdd-workflow
description: "Adaptive 7-step TDD workflow with automatic level detection (guided/assisted/direct). Enforces test-first discipline with RED-GREEN-REFACTOR cycle, naive-first implementation, context isolation, and vertical slices. Use for new features, bug fixes, or refactoring with test-driven development."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Bash, Write, Edit, Agent
argument-hint: "[feature description]"
---

<!-- stack-aware-preface:start -->
```typescript
// 2026-05-16 (Luiz/dev): Plano 03 fase-02 — stack-aware-preface (PRD §Mecanismo Skill wire-up, D11).
// G1 do plano: bloco verbatim do Plano 01 fase-04 (security wire). Path fixo .claude/knowledge/INDEX.md (D11).
// CA-09: se INDEX ausente, preface = ''; comportamento da skill = v6.3.1 intacto.

import { getStackKnowledgePreface } from '../security/lib/stack-aware-preface'

const stackKnowledgePreface = getStackKnowledgePreface(process.cwd())
```

Se `stackKnowledgePreface` for não-vazio, **prepende** esta frase ao início da resposta. Se vazio, ignore — comportamento da skill = v6.3.1 intacto (CA-09).
<!-- stack-aware-preface:end -->

# TDD Workflow — Anti-Vibe Coding

Workflow TDD adaptativo de 7 passos. Seguir EXATAMENTE esta sequencia.

---

## IA-TDD — Deteccao Automatica de Nivel

> Fundamentacao completa do fluxo IA-TDD: [`references/ia-tdd-workflow.md`](./references/ia-tdd-workflow.md)

Detectar o nivel sem perguntar. Usar estes sinais:

| Sinal detectado | Nivel inferido |
|----------------|----------------|
| Dev descreve feature em linguagem natural sem mencionar testes | Nivel 1 — Guiado |
| Dev descreve requisitos + identifica alguns edge cases | Nivel 2 — Assistido |
| Dev cola ou referencia um teste que ele mesmo escreveu | Nivel 3 — Direto |
| `user_profile` na memoria do projeto registra nivel | Usar nivel registrado |

Dev pode forcar nivel explicitamente a qualquer momento:
- "quero TDD guiado" → Nivel 1
- "quero TDD direto" → Nivel 3
- "quero TDD assistido" → Nivel 2

### Nivel 1: IA-TDD Guiado (Iniciante/Junior)

Fluxo quando dev descreve feature sem mencionar testes:

1. IA propoe UM unico teste e EXPLICA:
   - O que o teste verifica (comportamento, nao implementacao)
   - Por que importa (qual bug ou regressao previne)
   - Como se chama o padrao (happy path, edge case, boundary, etc.)
   - Conexao com testes anteriores (se existirem)
2. Dev valida: "sim" / "nao entendi" / propoe cenario alternativo
   - Se "nao entendi" → sugerir /anti-vibe-coding:learn para o conceito em questao
3. IA implementa codigo minimo para o teste passar
4. IA propoe o proximo teste — Repetir ate cobertura completa

**Regra:** UM teste por ciclo. Nunca propor 3 testes de uma vez no Nivel 1.

### Nivel 2: IA-TDD Assistido (Intermediario)

Fluxo quando dev descreve requisitos com edge cases identificados:

1. Dev descreve requisitos com edge cases que ja identifica
2. IA gera 1-3 testes por vez (nao todos de uma vez)
3. Dev revisa com olhar critico, adiciona cenarios que faltaram
4. CONTEXT ISOLATION:
   - Subagente RED escreve os testes (recebe requisitos + codigo existente)
   - Subagente GREEN implementa (recebe APENAS testes, nao os requisitos)
5. Dev valida resultado — Repetir com proximo conjunto de requisitos

### Nivel 3: IA-TDD Direto (Avancado)

Fluxo quando dev ja escreve testes:

1. Dev escreve UM teste falhando
2. IA implementa codigo minimo para passar
3. Dev escreve proximo teste — Repetir

IA nao propoe testes no Nivel 3, apenas implementa.

---

## Vertical Slices como Unidade de Trabalho

No IA-TDD, a unidade de trabalho e o slice vertical — nao o modulo ou a camada.

Um slice atravessa todas as camadas necessarias para um comportamento funcionar:
`test → service → API → UI` (quando aplicavel)

**Tracer Bullet — Primeiro Slice Obrigatorio**
Antes de qualquer feature, implementar o caminho mais fino de ponta a ponta:
- Objetivo: confirmar que o ciclo completo funciona (CI, deploy, integracao)
- Tracer bullet NAO precisa ter logica de negocio — apenas "encanamento" funcionando
- Teste do tracer: chama o endpoint → recebe resposta (mesmo que vazia)
- Somente apos o tracer verde → implementar slices com logica real

**Slices subsequentes:** cada slice adiciona um comportamento observavel, nao uma camada:
- Ruim: "implementar toda a camada de repositorio"
- Bom: "usuario autenticado pode criar uma tarefa e ela aparece na listagem"

**O anti-padrao tem nome: horizontal slicing** — escrever todos os testes primeiro, depois toda a
implementacao. Parece TDD, e nao e, por tres razoes que se somam:

1. Teste em lote verifica comportamento **imaginado** — voce testa a forma que supos, nao a que o
   codigo revela quando existe
2. Os testes ficam insensiveis a mudanca real, porque foram escritos contra a mesma suposicao
3. Voce se compromete com a estrutura de teste **antes** de entender a implementacao, e mudar essa
   estrutura depois custa mais que escreve-la certa uma de cada vez

Um teste por vez, e cada um atravessando o slice inteiro.

---

## Deep Modules na Fase RED

Ao projetar a interface de um modulo (durante a fase RED), aplicar o principio de Ousterhout:

> "Que interface eu gostaria de usar?" — nao "como vou implementar isso?"

Sinal de interface bem projetada: o teste NAO sabe detalhes internos.
- Se o teste precisa configurar 5 objetos para testar 1 comportamento → modulo raso (shallow)
- Se o teste chama 1 metodo e verifica 1 resultado → modulo profundo (deep)

Se ao escrever testes voce perceber que precisa expor detalhes de implementacao:
→ Redesenhe a interface antes de implementar

Referencia completa: [`skills/tdd-workflow/references/deep-modules.md`](./references/deep-modules.md)

**Nenhum teste e escrito num seam nao confirmado.** Antes do primeiro teste, anotar em quais **seams**
voce vai testar e confirmar com o usuario:

> "Qual e a interface publica, e em quais seams devemos testar?"

O porque, sem o qual isto vira ritual: **voce nao consegue testar tudo.** Acordar os seams antes e
como o esforco cai nos caminhos criticos e na logica complexa em vez de se espalhar por toda borda —
e e mais barato acordar agora que descobrir na review que metade da suite testa a fronteira errada.

Quando o que esta em questao e a **forma** da interface — quao profundo o modulo deveria ser, onde o
seam pertence, o que a interface precisa expor — a referencia acima e o lugar. E referencia a
consultar, nao sessao a rodar.

---

## Assertions Tautologicas

Uma assertion tautologica **passa por construcao**: ela nao consegue discordar do codigo, entao nao
carrega informacao. Existe em duas formas, e a segunda e a que passa despercebida.

**Trivial** — `expect(true).toBe(true)`, snapshot vazio, `expect(undefined).toBeUndefined()` sem
setup. Obvia em review.

**Por recomputacao** — a assertion recalcula o valor esperado **do mesmo jeito que o codigo faz**:

```ts
// Tautologico: o esperado e produzido pela mesma operacao que a implementacao usa.
expect(add(a, b)).toBe(a + b)
expect(normalizeId('7')).toBe('7'.padStart(3, '0'))
```

Se a implementacao mudar de `padStart(3)` para `padStart(4)`, o teste muda junto e **continua
verde**. Ele parece um teste de verdade — e essa e exatamente a razao de passar batido.

**O remedio:** o valor esperado vem de **fonte independente** — um literal conhecido-bom, um exemplo
trabalhado a mao, ou a spec.

```ts
// Independente: o 007 foi decidido por um humano lendo o formato, nao derivado do codigo.
expect(normalizeId('7')).toBe('007')
```

Esta e a definicao canonica; `agents/tdd-verifier.md` a aplica na deteccao pos-fato.

---

## Context Isolation RED/GREEN

Aplicavel no Nivel 2 (Assistido) e opcional no Nivel 3 (Direto).

Principio: o agente que implementa nao deve "ver" os requisitos em texto natural.
A unica fonte da verdade para implementacao sao os testes.

**Subagente RED (escreve testes):**
- Recebe: requisitos da task + codigo existente
- Recebe tambem, quando o slice e de risco: a secao "Ameacas & Dados" do PRD — classificacao do
  dado, fronteiras de confianca e os casos de abuso `AB-*`. Sem ela o RED escreve so o happy path:
  o subagente nao tem como adivinhar um modelo de ameaca que ficou no documento que ele nao recebeu.
  <!-- 2026-09-01 (Luiz/dev): contexto de ameaca chega ao RED — PRD §RF-05 -->
- Produz: arquivos de teste que FALHAM por assertion
- NAO produz codigo de producao

**CONTEXTO ZERADO**

**Subagente GREEN (implementa):**
- Recebe: APENAS os testes criados pelo RED + codigo existente
- NAO recebe: requisitos em texto natural, descricao da task
- Produz: codigo minimo para os testes passarem
- Regra: arquivos `*.test.*` e `*.spec.*` sao read-only (ancoras imutaveis)

O GREEN continua sem ver o PRD, e isso nao muda com seguranca no jogo: **os testes de abuso sao a
forma como a ameaca chega ate ele**. A consequencia e direta — defesa que nao esta expressa num teste
nao vai existir no codigo, porque o unico contrato que o implementador enxerga sao os testes.

**Quando usar:** feature com 3+ criterios de aceite distintos, logica critica (financeiro, auth, permissoes), quando o dev quer design emergente garantido.

**Quando NAO usar:** features simples com 1-2 criterios, CRUD basico sem logica.

Nota: context isolation depende do TDD Gate (plano 05) para bloquear edicao de testes durante GREEN. Se nao ativo, as instrucoes no prompt do subagente GREEN sao a unica barreira.

---

## Deteccao: Test-First vs Test-Driven

**Test-First:** todos os testes antes de qualquer implementacao (antipadrao com IA — permite que a IA "cole" mentalmente da suite, sem design emergente).
**Test-Driven:** UM teste → implementa → repete (correto).

Se em um unico ciclo forem adicionados 2+ testes novos simultaneamente → alertar (suave):

> "Voce acabou de adicionar [N] testes de uma vez. TDD real recomenda 1 teste por ciclo para o design emergir incrementalmente. Quer que eu guie teste a teste?"

Enforcement via config: `config/tdd-gate.json → max_tests_per_cycle: 1` para bloqueio real via hook.

**Excecoes aceitas:** testes de regressao para bug conhecido (conjunto fixo ja mapeado), migracao de codigo legado (capturar comportamento existente).

---

## AI Judge — Quando Sugerir

O AI Judge e um segundo LLM que valida conformidade TDD em tempo real. Consome ~2.5x tokens — NAO e o padrao.

**Quando sugerir:**
- Feature com 3+ slices verticais
- Feature critica: financeiro, autenticacao, permissoes, dados pessoais
- Dev expressou incerteza sobre se o TDD esta sendo seguido

**Como sugerir:**
> "Esta feature tem [N] slices e envolve [area critica]. O AI Judge pode validar conformidade TDD em tempo real, mas consome ~2.5x mais tokens. Ativar?"

Dev decide: sim → ativar `config/tdd-gate.json → mode: "ai-judge"` / nao → continuar com regex.

Referencia: plano 05 documenta o mecanismo tecnico do AI Judge.

---

## Piramide Invertida com IA

A piramide classica (muitos unit, poucos E2E) foi projetada para times humanos.
Com IA, o ROI por camada inverte — nao em quantidade, mas em QUEM LIDA COM CADA CAMADA:

| Camada | Quem escreve | Observacao |
|--------|-------------|------------|
| Unit — regras de negocio | Humano define, IA implementa | Mais critico: humano especifica via testes |
| Unit — infra/utils | IA pode gerar | Questionar se vale testar (ex: getter trivial) |
| Component | IA funciona bem | Protocolo-based com DSLs legiveis |
| E2E | IA brilha — melhor ROI | User Story → Example Mapping → Gherkin → E2E |

Ao entrar no Nivel 1 ou 2: inferir se a feature tem comportamento de negocio (priorizar unit com humano definindo criterios) ou e um fluxo de usuario (considerar comecar com E2E via Gherkin).

Referencia completa: `skills/tdd-workflow/references/test-pyramid-ai.md`

---

## Test Sizes

Tres tamanhos de teste segundo orcamento de tempo e fidelidade ao runtime real:

- **Unit (ms)** — milisegundos por teste, sem I/O, sem rede, sem filesystem. Funcao
  pura ou modulo com dependencias mockadas. Roda em massa (centenas em <1s).
- **Integration (sub-1s)** — sub-segundo, com storage fake (SQLite em memoria,
  in-process queue, msw para HTTP). Testa integracao real entre 2-3 modulos.
- **E2E (segundos)** — segundos por teste, com UI real, browser real (Playwright),
  banco real. Reservar para fluxos criticos de usuario.

| Tamanho | Custo | Quando usar |
|---------|-------|-------------|
| Unit | ms | Logica de dominio, parsing, transformacao de dados, validacao |
| Integration | sub-1s | Repositories, controllers, integracao entre services |
| E2E | segundos | Fluxos criticos end-to-end (login, checkout, onboarding) |

**Regra de proporcao:** 70% Unit, 20% Integration, 10% E2E. Inverter a piramide
(majoria E2E) torna a suite lenta e fragil.

---

## DAMP vs DRY em Testes

**DAMP** = "Don't Abstain from Meaningful Phrases". Testes aceitam alguma repeticao
se isso torna cada cenario auto-descritivo. Codigo de producao busca DRY; codigo de
teste prioriza CLAREZA.

**Anti-padrao (DRY demais):**

```ts
function setup(role: string) {
  return createUserWithRole(role)
}

test('admin can delete', () => {
  const u = setup('admin')
  expect(canDelete(u)).toBe(true)
})

test('viewer cannot delete', () => {
  const u = setup('viewer')
  expect(canDelete(u)).toBe(false)
})
```

O leitor precisa pular para `setup` para entender o cenario. Custo cognitivo
desproporcional ao ganho de 1 linha.

**DAMP (preferivel):**

```ts
test('admin can delete posts', () => {
  const admin = createUserWithRole('admin')
  expect(canDelete(admin)).toBe(true)
})

test('viewer cannot delete posts', () => {
  const viewer = createUserWithRole('viewer')
  expect(canDelete(viewer)).toBe(false)
})
```

Cada teste e auto-contido. Setup explicito vence indireção. Helpers de teste sao
extraidos APENAS quando a logica de setup e nao-obvia ou repetida 3+ vezes com
identica forma.

---

## Test-Doubles Reference

| Tipo | O que faz | Quando usar |
|------|-----------|-------------|
| **Stub** | Retorna valor fixo para chamadas | Substituir dependencia sem comportamento dinamico (ex: `clock.now() → 2026-01-01`) |
| **Mock** | Verifica que uma chamada ocorreu com argumentos esperados | Testar side-effect (ex: `expect(emailer.send).toHaveBeenCalledWith(...)`) |
| **Fake** | Implementacao simplificada e funcional | Substituir DB real por in-memory (ex: `InMemoryUserRepository`) |
| **Spy** | Log de chamadas sem alterar comportamento | Observar fluxo sem modificar (ex: contar quantas vezes `logger.warn` foi chamado) |

**Regra:** prefira **Fake** quando o comportamento da dependencia importa (testa
mais cenarios reais). Use **Mock** com moderacao — mocks excessivos acoplam o teste
a implementacao e nao ao comportamento.

**Ordem de preferencia (mais → menos confianca):** Implementacao real > Fake > Stub > Mock.
Use mocks apenas quando a dependencia real e lenta, nao-deterministica, ou tem efeitos colaterais incontrolaveis (APIs externas, envio de email). Over-mocking cria testes que passam enquanto a producao quebra.

---

<decision-tree>
## Classificacao de Complexidade (Modo Classico)

Antes de iniciar, classificar a tarefa:

| Nivel | Criterio | Adaptacao |
|-------|----------|-----------|
| **Baixa** | Funcao pura, sem I/O, sem dependencias | Combinar passos 3-4 |
| **Media** | Multiplos arquivos, API calls, estado | Seguir todos os 7 passos |
| **Alta** | Decisoes arquiteturais, integracoes, schema | Exigir Fase Zero (`/anti-vibe-coding:consultant`) antes |

Se complexidade = Alta, direcionar para `/anti-vibe-coding:consultant` primeiro.
</decision-tree>

## Os 7 Passos

<step id="1" name="Investigacao e Contexto">
<instructions>
- Reler o CLAUDE.md e `senior-principles.md` do projeto
- Entender a stack, diretorios, padroes vigentes
- Se algo nao estiver claro, PERGUNTAR antes de escrever qualquer codigo
- Verificar se existem testes similares como referencia
</instructions>
</step>

<step id="2" name="Fundacao">
<instructions>
- Gerar ou atualizar arquivos de infraestrutura necessarios (dependencias, configs, env vars)
- Atualizar CLAUDE.md se a nova feature exigir novos padroes
- Nao escrever codigo de producao aqui
</instructions>
</step>

<step id="3" name="TDD Red — Testes Primeiro">
<instructions>
- Escrever APENAS os testes para a funcionalidade solicitada
- Usar mocks e stubs conforme necessario
- Os testes DEVEM falhar (fase Red)
- NAO escrever codigo de producao nesta etapa
</instructions>
<verification>
Executar os testes para confirmar que falham: `bun run test`
Expectativa: testes devem FALHAR (Red phase)
</verification>
<context>
**Token economy**: Se houver erros de configuracao, solicitar ao dev que execute no proprio terminal e compartilhe apenas as linhas de erro relevantes (~20 tokens vs ~500 tokens com output completo)
</context>
</step>

### Prove-It (bug fixes) — teste de reproducao ANTES do fix
Quando a task e um bug report (nao uma feature nova): NAO comece tentando corrigir.
Escreva primeiro um teste que reproduz o bug e confirme que ele FALHA (bug confirmado).
So entao implemente o fix, rode o teste (deve passar) e rode a suite completa (sem regressoes).
Antes (errado): editar o codigo "que parece o culpado" e testar manualmente.
Depois (certo): teste vermelho que prova o bug -> fix minimo -> teste verde -> suite verde.
Para o fluxo completo de bug dificil, em producao ou em desenvolvimento (logs brutos -> loop tight -> minimizar -> hipoteses -> instrumentar -> regression test -> fix cirurgico -> hardening -> autopsia), use `/anti-vibe-coding:incident-response`.

### Abuse-It (slice de risco) — teste de abuso ANTES da defesa

<!-- 2026-09-01 (Luiz/dev): teste de abuso no RED para slice de risco — PRD §RF-05, §CA-05.
     Modelado sobre o Prove-It acima: mesma forma (teste vermelho primeiro), outro gatilho. -->

Quando o slice e **de risco**: NAO comece implementando a defesa.
Escreva primeiro o teste que executa o abuso e confirme que ele FALHA. Falhar aqui significa "o
ataque passou" — a vulnerabilidade esta confirmada, do mesmo jeito que o Prove-It confirma o bug.
So entao implemente a defesa, rode o teste (deve passar) e rode a suite completa (sem regressoes).
Antes (errado): escrever o `checkPermission` e depois conferir manualmente se "esta funcionando".
Depois (certo): teste em que o usuario A le o recurso de B -> vermelho (o ataque passou) -> defesa
minima -> verde -> suite verde.

**O slice e de risco quando toca ao menos um destes seis:**
`auth/authz` · `PII/sensivel` · `input externo` (body, query, webhook, arquivo importado) ·
`upload` · `pagamento` · `integracao terceira`.
Sao os mesmos gatilhos da secao "Ameacas & Dados" do PRD
(`skills/write-prd/templates/prd-template.md`). Se o PRD tem a secao, os casos de abuso `AB-*` ja
estao escritos — cada `AB-*` vira um teste aqui, e o trabalho e traduzir, nao inventar.
Se o slice e de risco e o PRD nao tem a secao: o gatilho se perdeu na especificacao. Diga isso ao
dev antes de escrever o teste; nao monte o modelo de ameaca sozinho no meio do RED.

**Exemplos por categoria.** O teste e sempre escrito do ponto de vista do atacante, e a assertion e
a defesa que se espera:

| Categoria | O que o teste tenta | Assertion (defesa esperada) |
|---|---|---|
| Autorizacao (IDOR) | usuario A pede o recurso de B pelo id | `403` — e o corpo nao permite distinguir "nao e seu" de "nao existe" |
| Autenticacao | request sem token, e com token expirado | `401`, e nenhum efeito colateral persistido |
| Input externo | payload com `<script>`, `' OR 1=1 --`, `../../etc/passwd` | rejeitado na validacao do boundary, antes de virar query/HTML/caminho |
| Upload | MIME `image/png` declarado, magic bytes de outro tipo | rejeitado; o arquivo nao chega ao storage |
| Financeiro | valor negativo; a mesma cobranca reenviada duas vezes | rejeitado / idempotente — saldo final identico |
| Integracao terceira | webhook com assinatura HMAC invalida | descartado sem processar o corpo |
| Excecao (A10:2025) | erro/excecao no fluxo (catch generico, retry, fallback) pula a checagem de autorizacao | `403` mesmo no caminho de excecao — o catch nao vira bypass |

**Um teste de abuso por ciclo**, como qualquer outro teste (`## Deteccao: Test-First vs
Test-Driven`). Escrever os seis de uma vez e horizontal slicing com outro nome — e o pior lugar para
isso, porque testes de seguranca em lote sao escritos contra a ameaca **imaginada**, nao contra a que
o codigo revela quando existe.

**Onde o teste vive:** na mesma suite do slice, com o mesmo runner. Teste de abuso nao e categoria
separada nem pasta a parte — se ele so roda com flag especial, ele nao roda (`## Red Flags`).

**Escopo, sem ambiguidade:** estes testes atacam o codigo **deste projeto**, na suite local. Nao sao
ferramenta apontada para sistema de terceiro, e o valor de payload em fixture e o minimo que prova a
defesa — nunca um catalogo de exploracao.

<step id="4" name="TDD Green — Implementacao Minima (Naive First)">
<instructions>
- Somente apos aprovacao dos testes pelo desenvolvedor
- Escrever a implementacao mais NAIVE e DIRETA que faz os testes passarem
- Nada mais, nada menos — codigo minimo
- NUNCA otimize na fase GREEN — codigo feio que passa nos testes e melhor que codigo elegante nao validado
- Se existem 2 abordagens: escolha a mais simples, mesmo que "inelegante"
</instructions>
<verification>
Executar os testes para confirmar que passam: `bun run test`
Expectativa: testes devem PASSAR (Green phase)
</verification>
<context>
**Token economy**: Se os testes ainda falharem, o dev pode executar no proprio terminal e compartilhar apenas a linha de erro relevante
</context>
</step>

<step id="5" name="Refatoracao (Optimize with Safety Net)">
<instructions>
- Codigo passou nos testes? Agora otimize preservando a suite verde
- Principio Karpathy: "Write the naive algorithm first, then optimize while preserving correctness"
- Extrair logicas complexas para Services ou modulos dedicados
- Otimizar queries lentas
- Delegar operacoes pesadas para background jobs
- Compare complexidade antes/depois — se a refatoracao nao melhora claramente, mantenha o naive
</instructions>
<verification>
Executar os testes para confirmar que CONTINUAM passando: `bun run test`
</verification>
</step>

<step id="6" name="Interface">
<instructions>
- Somente apos backend e testes estarem solidos
- Gerar a camada de visualizacao (frontend, API publica, bots)
- Se aplicavel, escrever testes de integracao/E2E
</instructions>
</step>

<step id="7" name="Validacao Final">
<instructions>
- Executar linters: `bun run lint`
- Executar analise estatica se disponivel
- Executar a suite de testes completa do modulo: `bun run test`
- Em monorepo, rodar testes dos modulos dependentes
</instructions>
<verification>
`bun run test && bun run lint` — todos devem passar sem erros.
</verification>
<context>
**Staged/Unstaged Review**: Antes de solicitar `/anti-vibe-coding:anti-vibe-review`, deixar as alteracoes em staged (`git add`). Ao receber sugestoes de melhoria, pedir que sejam aplicadas como unstaged — isso permite comparar o antes/depois com `git diff` sem perder o trabalho original.

Sugerir ao desenvolvedor executar `/anti-vibe-coding:anti-vibe-review`.
</context>
</step>

<constraints>
## Regras Inviolaveis

- NUNCA gerar codigo de producao e testes ao mesmo tempo — testes escritos depois tendem a validar a implementacao, nao o comportamento esperado
- NUNCA pular a etapa de testes para "ganhar tempo" — divida tecnica acumula juros exponenciais
- Se o humano pedir funcionalidade sem mencionar testes, avisar e criar os testes primeiro
- Se entrar em loop de erro (3+ tentativas falhando), PARAR e informar o desenvolvedor
- Testar **comportamento**, nao implementacao
- Usar verbos em terceira pessoa nos nomes de teste (nao usar "should")
- NUNCA adicionar 2+ testes em um unico ciclo sem alertar sobre test-first vs test-driven
- Sugerir AI Judge quando feature tiver 3+ slices ou for critica (financeiro, auth, permissoes)
- Para features de regras de negocio: humano especifica via testes — IA nao propoe requisitos de negocio
- Para features E2E: User Story → Example Mapping → Gherkin e o fluxo de maior ROI com IA
- Slice de risco (auth/authz, PII/sensivel, input externo, upload, pagamento, integracao terceira) NAO entra em GREEN sem ao menos um teste de abuso vermelho antes (Abuse-It)
</constraints>

## Refactor Fica no Ciclo — Divergencia Consciente

Existe uma escola de TDD que tira o refactor do ciclo e o move para a etapa de review, deixando o
loop como `red → green`. **Divergimos, e o registro fica aqui para nao parecer que passou batido.**

Refatorar com o teste verde na mao **e** a rede de seguranca que torna o refactor seguro: voce muda a
forma sabendo, a cada passo, que o comportamento nao mudou. E e o momento em que o codigo esta mais
fresco na cabeca. Empurrar para a review separa o momento em que voce **entende** o codigo do momento
em que voce o **melhora** — e o segundo chega sem o primeiro.

A preocupacao daquela escola e legitima: refactor grande escondido dentro de um commit de feature,
onde ninguem consegue revisar nem um nem outro. Mas o remedio e outro — `git-workflow-and-versioning`
ja pede commits atomicos, e refactor amplo merece commit proprio. **E problema de granularidade de
commit, nao de posicao no ciclo.**

RED-GREEN-REFACTOR permanece.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Vou escrever os testes depois que o código estiver funcionando" | Testes escritos após implementação tendem a apenas confirmar o que foi feito, não o que deveria ser feito. Test-after não descobre design problems. |
| "Este código é tão simples que não precisa de teste" | Código simples hoje, complexo amanhã. O custo de escrever o teste é mínimo; o custo da regressão não é. |
| "TDD é lento, vou usar em código complexo" | TDD é mais lento no início de um arquivo, mais rápido no total do projeto. O tempo economizado em debug supera o investimento. |
| "O tipo já garante o comportamento — não preciso testar" | Types verificam estrutura; testes verificam comportamento. Um `string` pode ser um email inválido — o compilador não detecta. |
| "Vou rodar os testes de novo so pra ter certeza" | Re-rodar o mesmo comando sem nenhuma mudanca de codigo entre as execucoes adiciona zero confianca. So rode de novo apos uma alteracao que possa mudar o resultado. |

## Red Flags

- `test.skip` ou `xit` sem comentário com data e ticket vinculado
- `expect(true).toBe(true)` ou qualquer assertion que sempre passa
- Assertion cujo valor esperado e **recomputado** pela mesma operacao que a implementacao usa — passa por construcao, e parece um teste de verdade
- Teste escrito num seam que o usuario nao confirmou
- Teste sem nenhuma assertion (`expect` ausente)
- 0% de cobertura em arquivo com lógica de negócio
- Teste que só roda com `--testNamePattern` específico (jamais na suite completa)
- Mock que retorna dados de produção hardcoded sem label `FIXTURE`
- Describe block vazio criado como placeholder sem `test.todo`
- Rodar o mesmo comando de teste duas vezes sem nenhuma mudanca de codigo entre as execucoes
- Slice que toca auth, PII, upload ou pagamento e cuja suite so exercita o caminho autorizado
- Teste chamado "de seguranca" em que `401`/`403`/"rejeitado" nunca aparece em nenhuma assertion — ele testa a feature, nao a defesa

## Verification — Auto-Auditoria Antes de Reportar "Pronto"
Antes de declarar a task concluida, TODOS os itens devem estar satisfeitos:
- [ ] Todo novo comportamento tem um teste correspondente
- [ ] Fix de bug inclui um teste que FALHAVA antes do fix (Prove-It)
- [ ] Slice de risco inclui ao menos um teste de abuso que FALHAVA antes da defesa (Abuse-It)
- [ ] Nenhum teste foi pulado ou desabilitado (`test.skip`/`xit`/`.only`)
- [ ] Nomes de teste descrevem comportamento (sem "should", terceira pessoa)
- [ ] Cobertura nao diminuiu (se rastreada no projeto)
- [ ] A suite foi REALMENTE executada: `bun run test && bun run lint` verde
Nota: rode cada comando apos uma mudanca que possa afetar o resultado. Apos uma execucao limpa, NAO repita o mesmo comando sem alteracao de codigo — re-rodar codigo inalterado nao adiciona confianca.

## Feature solicitada

$ARGUMENTS
