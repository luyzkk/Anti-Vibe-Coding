---
name: centralize-config
description: Detecta configurações espalhadas (strings hardcoded, valores duplicados) e executa migração disciplinada para uma única fonte de verdade. Fluxo: detectar → mapear → centralizar → substituir usos → verificar.
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
argument-hint: "[string ou padrão a centralizar, ex: 'claude-sonnet-4-5' ou 'API_URL']"
---

# Skill: /anti-vibe-coding:centralize-config

Centralizar configuração espalhada em uma única fonte de verdade.

## Por Que Isso Importa

Config espalhada é dívida técnica silenciosa:
- Mudar um valor exige grep + edição manual em N arquivos
- Uma edição esquecida causa comportamento inconsistente em produção
- O agente pode "atualizar" apenas a ocorrência que viu — as outras ficam para trás

Regra: **uma constante, um arquivo, todos importam dela.**

## Fluxo

### Etapa 1 — Detectar

```
Se $ARGUMENTS tem uma string/padrão:
  Buscar ocorrências:
    grep -r "$ARGUMENTS" . --include="*.ts" --include="*.js" -l

Se $ARGUMENTS está vazio:
  Perguntar: "Qual string ou configuração você quer centralizar?"
  Exemplos de candidatos comuns:
    - Nome de modelo LLM (ex: "claude-sonnet-4-5")
    - URLs de API (ex: "https://api.example.com")
    - Timeouts (ex: 30000, 5000)
    - Nomes de tabelas/coleções
    - Feature flags hardcoded
```

### Etapa 2 — Mapear

```
Para cada arquivo encontrado na Etapa 1:
  1. Ler o contexto da ocorrência (±3 linhas)
  2. Classificar: é realmente a mesma config ou coincidência de valor?
  3. Registrar: arquivo, linha, contexto

Apresentar mapa ao dev:
  "Encontrei N ocorrências em X arquivos. Exemplo:
   - src/agents/tdd-verifier.md:12  → model: 'claude-sonnet-4-5'
   - src/skills/write-prd/SKILL.md:8 → model claude-sonnet-4-5
   [...]
  
  Todas devem usar a mesma constante?"

Aguardar confirmação antes de prosseguir.
```

### Etapa 3 — Centralizar

```
Definir o arquivo de config canônico.

Critérios para escolher onde colocar:
  - Já existe um arquivo de config? → adicionar lá
  - TypeScript/JS: criar config/constants.ts ou config/llm.ts
  - Markdown/YAML: criar config/defaults.md ou seção dedicada
  - Nunca criar config dentro de um módulo de feature

Escrever a constante:
  // config/llm.ts
  export const LLM_MODEL = 'claude-sonnet-4-5'

Apresentar ao dev antes de criar o arquivo.
```

### Etapa 4 — Substituir Usos

```
Para cada ocorrência mapeada na Etapa 2:
  1. Releia o arquivo (contexto pode ter mudado)
  2. Substituir a string literal pelo import da constante
  3. Adicionar o import no topo do arquivo se necessário
  4. Confirmar que a substituição não quebrou a sintaxe local

Fazer uma substituição por vez — não use replace global sem inspeção.
```

### Etapa 5 — Verificar

```
Após todas as substituições:

1. Buscar pela string original — não deve restar nenhuma:
   grep -r "[string_original]" . --include="*.ts" --include="*.js"
   Esperado: nenhum resultado (ou apenas comentários/docs)

2. Verificar que o arquivo de config existe e exporta a constante:
   cat config/[arquivo_criado]

3. Rodar testes:
   bun run test
   Esperado: todos verdes

4. Se algum teste quebrou → a substituição foi incorreta. Reverter esse arquivo e inspecionar.
```

### Etapa 6 — Commit Atômico

```
Commit único cobrindo: arquivo de config + todas as substituições

Formato:
  refactor(config): centraliza [nome_da_config] em config/[arquivo]

  - Antes: string literal em N arquivos
  - Depois: constante única importada
  - Arquivos alterados: [lista]

Exemplo:
  refactor(config): centraliza LLM_MODEL em config/llm.ts

  - Antes: 'claude-sonnet-4-5' hardcoded em 24 arquivos
  - Depois: LLM_MODEL importado de config/llm.ts
  - Arquivos alterados: skills/*, agents/*, hooks/pre-tool-call.cjs
```

## Casos Especiais

| Situação | Ação |
|----------|------|
| Valores diferentes para ambientes (dev/prod) | Usar variável de ambiente; constante como fallback |
| Config em arquivo que não pode ter imports (ex: YAML) | Documentar referência no YAML; manter constante TS como fonte |
| Ocorrência em teste que verifica o valor literal | Atualizar o teste para importar a constante também |
| Config em dependência externa (package.json) | Deixar como está; não centralizar o que não controla |

## Ação Solicitada

$ARGUMENTS
