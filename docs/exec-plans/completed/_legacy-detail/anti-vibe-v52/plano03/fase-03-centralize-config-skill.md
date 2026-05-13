# Fase 03 — Skill `/anti-vibe-coding:centralize-config`

## Objetivo

Criar a skill `centralize-config` que detecta configurações espalhadas pelo codebase e executa uma migração disciplinada para uma única fonte de verdade. Caso canônico: model LLM hardcoded em 24 arquivos → 1 constante exportada.

**Sizing:** ~1h

## Arquivo a Criar

```
f:\Projetos\Claude code\anti-vibe-coding\skills\centralize-config\SKILL.md
```

**Pré-condição:** Verificar se o diretório existe antes de criar:

```bash
ls "f:/Projetos/Claude code/anti-vibe-coding/skills/" | grep centralize-config
# Se vazio, criar:
mkdir -p "f:/Projetos/Claude code/anti-vibe-coding/skills/centralize-config"
```

---

## Conteúdo Completo do SKILL.md

```markdown
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
```

---

## Checklist de Verificação

```bash
# 1. Diretório e arquivo criados
ls "f:/Projetos/Claude code/anti-vibe-coding/skills/centralize-config/"
# Esperado: SKILL.md

# 2. Frontmatter válido
head -10 "f:/Projetos/Claude code/anti-vibe-coding/skills/centralize-config/SKILL.md"
# Esperado: --- name: centralize-config ...

# 3. Todas as 6 etapas presentes
grep "^### Etapa [0-9]" "f:/Projetos/Claude code/anti-vibe-coding/skills/centralize-config/SKILL.md"
# Esperado: 6 linhas (Etapa 1 a 6)

# 4. Contagem de linhas (≤200)
wc -l "f:/Projetos/Claude code/anti-vibe-coding/skills/centralize-config/SKILL.md"
# Esperado: ≤200

# 5. $ARGUMENTS presente
grep '\$ARGUMENTS' "f:/Projetos/Claude code/anti-vibe-coding/skills/centralize-config/SKILL.md"
# Esperado: linha com $ARGUMENTS
```

## Commit

Repo: `f:\Projetos\Claude code\anti-vibe-coding\`

```bash
cd "f:/Projetos/Claude code/anti-vibe-coding"
git add skills/centralize-config/SKILL.md
git commit -m "feat(skills): centralize-config — migração de config espalhada para fonte única"
```

## Gotchas desta Fase

- O fluxo tem 6 etapas — não abreviar para 4 (detectar+mapear são etapas distintas por design)
- A Etapa 4 instrui "uma substituição por vez" — isso é intencional e não deve ser removido
- A tabela de "Casos Especiais" cobre edge cases comuns — manter todos os 4 casos
- O exemplo canônico (LLM model em 24 arquivos) deve aparecer no commit message de exemplo
- Arquivo de config canônico sugerido: `config/llm.ts` para o caso LLM, genérico `config/constants.ts` para outros
