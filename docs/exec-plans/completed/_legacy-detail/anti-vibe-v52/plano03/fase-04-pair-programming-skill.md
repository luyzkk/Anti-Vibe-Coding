# Fase 04 — Skill `/anti-vibe-coding:pair-programming-with-agent`

## Objetivo

Criar a skill `pair-programming-with-agent` que ensina a dinâmica disciplinada de "humano navega, agente pilota". Inclui: quando interromper o agente, como injetar contexto de domínio, a tabela Akita de capacidades, e exemplos reais de situações de interrupção.

**Sizing:** ~1h

## Arquivo a Criar

```
f:\Projetos\Claude code\anti-vibe-coding\skills\pair-programming-with-agent\SKILL.md
```

**Pré-condição:** Verificar e criar diretório:

```bash
ls "f:/Projetos/Claude code/anti-vibe-coding/skills/" | grep pair-programming
# Se vazio, criar:
mkdir -p "f:/Projetos/Claude code/anti-vibe-coding/skills/pair-programming-with-agent"
```

---

## Conteúdo Completo do SKILL.md

```markdown
---
name: pair-programming-with-agent
description: Tutorial da dinâmica 'humano navega, agente pilota'. Quando interromper o agente, como injetar contexto de domínio, tabela Akita de capacidades (faz bem / faz mal), e exemplos reais de interrupção por over-engineering, contexto insuficiente e decisão conjunta.
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob
argument-hint: "[situação atual ou pergunta sobre a dinâmica]"
---

# Skill: /anti-vibe-coding:pair-programming-with-agent

Tutorial da dinâmica disciplinada de pair-programming com agente de IA.

## O Modelo Mental

```
Humano = Navegador
  - Define direção, arquitetura, regras de negócio
  - Conhece o domínio, os workarounds, as restrições não documentadas
  - Decide o que construir e por quê
  - INTERROMPE quando o agente sai do caminho

Agente = Piloto
  - Executa com disciplina dentro dos limites definidos
  - Gera código, testes, refatorações mecânicas
  - Sinaliza quando precisa de mais contexto
  - PARA e pergunta quando algo parece errado
```

## Tabela de Capacidades (Akita)

| Agente faz BEM | Agente faz MAL |
|----------------|----------------|
| Boilerplate e código repetitivo | Decisões de arquitetura |
| Testes — estrutura e geração | Conhecimento de domínio específico |
| Refactoring mecânico | Opiniões e preferências do negócio |
| Pesquisa contextual | Segurança proativa |
| Consistência de padrões | Priorização de features |
| Completar código iniciado | Detectar requisitos implícitos |

**Regra de ouro:** se a tarefa está na coluna "faz MAL", o humano deve navegar ativamente — não apenas aprovar o output do agente.

## Quando Interromper o Agente

Interrompa imediatamente se observar qualquer um destes sinais:

### 1. Over-Engineering
```
Sinais:
  - Agente propõe abstrações para casos de uso que não existem ainda
  - Agente cria interfaces/classes para um único uso concreto
  - Agente adiciona configurabilidade onde há apenas um valor possível
  - Agente menciona "extensibilidade futura" sem demanda atual

Ação:
  Digitar: "Para. Você está construindo para cenários hipotéticos.
  Foque em [tarefa específica]. Sem abstrações prematuras."
```

### 2. Path Errado
```
Sinais:
  - Agente muda de abordagem sem avisar
  - Agente resolve um problema adjacente ao pedido
  - Agente faz refatoração não solicitada junto com a feature
  - O código gerado não corresponde ao plano combinado

Ação:
  Digitar: "Para. Você está [descrição do desvio].
  Volte para [objetivo original]. O plano é [relembrar o plano]."
```

### 3. Contexto Insuficiente
```
Sinais:
  - Agente usa padrão genérico onde existe padrão específico do projeto
  - Agente ignora workaround documentado e recria o problema
  - Agente acessa dado de forma que viola regra de negócio não óbvia
  - Agente não conhece restrição de infraestrutura (ex: limite de API)

Ação:
  Injetar contexto (ver seção abaixo) antes de continuar.
```

### 4. Decisão Arquitetural Disfarçada
```
Sinais:
  - Agente escolhe entre duas abordagens sem perguntar
  - Agente cria novo módulo/arquivo onde poderia reutilizar
  - Agente altera schema/interface sem mencionar impacto downstream
  - Agente assume que algo "não vai escalar" e arquiteta para escala

Ação:
  Interromper e decidir conjuntamente:
  "Esta é uma decisão arquitetural. Não prossiga até eu confirmar a abordagem."
```

## Como Injetar Contexto de Domínio

Contexto de domínio é o que o agente não pode inferir da documentação pública:

```
Formato de injeção:
  "[Fato específico]. [Por que importa]. [O que fazer com esse contexto]."

Exemplos reais:

1. TLS fingerprinting:
   "Nossa infra usa TLS 1.2 com fingerprint específico para comunicar com
   o parceiro X. A biblioteca padrão falha silenciosamente — use o client
   customizado em src/lib/partner-client.ts."

2. Regra de negócio implícita:
   "Pedidos com status PENDING_REVIEW nunca devem ser enviados para o
   processador de pagamento, mesmo que o código de status seja válido.
   Isso é uma regra de compliance, não um bug."

3. Workaround de bug externo:
   "A API do fornecedor retorna 200 mesmo em erro — cheque o campo
   'error_code' no body. Isso está documentado em lessons.md."

4. Restrição de infraestrutura:
   "O worker tem limite de 512MB de RAM. Qualquer operação de processamento
   de batch deve ser feita em chunks de no máximo 100 itens."
```

**Quando injetar:** antes de iniciar uma tarefa que toca o domínio específico, não após o agente gerar código incorreto.

## Exemplos Reais de Interrupção

### Exemplo 1 — Interrupção por Over-Engineering

```
Pedido: "Adicione logging à função de envio de email."

O agente começa a criar:
  - Interface LoggingStrategy com 3 implementações
  - Factory para injeção de dependência
  - Config file para selecionar a estratégia

Interrupção:
  "Para. Eu pedi logging, não uma arquitetura de logging.
  Use o logger existente em src/lib/logger.ts.
  Uma linha de log no início e uma no final da função. Nada mais."
```

### Exemplo 2 — Injeção de Contexto de Domínio

```
Pedido: "Implemente a integração com a API de notas fiscais."

Antes de o agente começar:
  "Contexto de domínio:
   - A API usa autenticação por certificado digital A1, não por token
   - O endpoint de homologação tem rate limit de 3 req/min (produção é 60/min)
   - Respostas de erro vêm como XML mesmo quando o Content-Type diz JSON
   - Temos um wrapper em src/lib/nfe-client.ts que trata esses edge cases
   Use o wrapper, não a API diretamente."
```

### Exemplo 3 — Decisão Conjunta

```
Agente propõe (sem perguntar):
  "Vou criar uma tabela separada para o histórico de status
  porque a tabela principal vai crescer muito."

Interrupção:
  "Para. Essa é uma decisão de schema com impacto em migração e queries.
  
  Opção A: tabela separada (normalizado, queries mais complexas)
  Opção B: coluna JSONB na tabela principal (denormalizado, queries simples)
  
  Contexto: temos ~50k pedidos/mês, nunca precisamos de histórico completo,
  só do status atual e do anterior.
  
  Recomendação minha: Opção B. Confirma?"
```

## Checklist de Pair Session Saudável

- [ ] O plano foi combinado antes de começar a codificar?
- [ ] O agente conhece o contexto de domínio relevante para esta tarefa?
- [ ] Decisões arquiteturais foram marcadas explicitamente antes de delegar?
- [ ] O humano revisou cada commit antes de aprovar?
- [ ] Interrupções foram documentadas? (lição aprendida, se recorrente)

## Ação Solicitada

$ARGUMENTS
```

---

## Checklist de Verificação

```bash
# 1. Diretório e arquivo criados
ls "f:/Projetos/Claude code/anti-vibe-coding/skills/pair-programming-with-agent/"
# Esperado: SKILL.md

# 2. Frontmatter válido
head -10 "f:/Projetos/Claude code/anti-vibe-coding/skills/pair-programming-with-agent/SKILL.md"
# Esperado: --- name: pair-programming-with-agent ...

# 3. Tabela Akita presente (faz BEM / faz MAL)
grep "Agente faz BEM" "f:/Projetos/Claude code/anti-vibe-coding/skills/pair-programming-with-agent/SKILL.md"
# Esperado: linha da tabela

# 4. 4 sinais de interrupção presentes
grep "^### [0-9]\." "f:/Projetos/Claude code/anti-vibe-coding/skills/pair-programming-with-agent/SKILL.md"
# Esperado: 4 linhas (Over-Engineering, Path Errado, Contexto Insuficiente, Decisão Arquitetural)

# 5. 3 exemplos reais presentes
grep "^### Exemplo [0-9]" "f:/Projetos/Claude code/anti-vibe-coding/skills/pair-programming-with-agent/SKILL.md"
# Esperado: 3 linhas

# 6. Contagem de linhas (≤200)
wc -l "f:/Projetos/Claude code/anti-vibe-coding/skills/pair-programming-with-agent/SKILL.md"
# Esperado: ≤200

# 7. $ARGUMENTS presente
grep '\$ARGUMENTS' "f:/Projetos/Claude code/anti-vibe-coding/skills/pair-programming-with-agent/SKILL.md"
# Esperado: linha com $ARGUMENTS
```

## Commit

Repo: `f:\Projetos\Claude code\anti-vibe-coding\`

```bash
cd "f:/Projetos/Claude code/anti-vibe-coding"
git add skills/pair-programming-with-agent/SKILL.md
git commit -m "feat(skills): pair-programming-with-agent — dinâmica humano navega, agente pilota"
```

## Gotchas desta Fase

- A tabela Akita (6 linhas × 2 colunas) deve ser incluída integralmente — é a referência central da skill
- Os 4 sinais de interrupção têm estrutura `Sinais + Ação` — não collapsar em lista simples
- Os 3 exemplos reais devem ser concretos (TLS fingerprinting, nota fiscal, decisão de schema) — não abstratos
- O checklist no final deve ter exatamente 5 itens — é intencionalmente curto
- Se o arquivo ultrapassar 200 linhas, cortar prosa das seções de Exemplos, não a tabela nem os sinais
- O nome do diretório é `pair-programming-with-agent` (com hífens) — não `pair_programming` nem `pair-prog`
