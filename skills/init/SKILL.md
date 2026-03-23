---
name: init
description: "This skill should be used when the user asks to 'initialize anti-vibe', 'setup anti-vibe coding', 'add anti-vibe to project', 'configure anti-vibe', or wants to onboard a project into the Anti-Vibe Coding methodology. Handles first-time setup with intelligent CLAUDE.md merge, rules deployment, and decisions registry initialization."
user-invocable: true
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Write, Edit, AskUserQuestion
argument-hint: "[project path (default: current directory)]"
---

# Init — Setup Anti-Vibe Coding no Projeto

Inicializar o Anti-Vibe Coding no projeto atual. Detectar o estado do projeto e adaptar o setup.

## Fluxo de Execucao

### Passo 0 — Detectar Instalação Existente

**ANTES de qualquer coisa**, verificar se existe `.claude/.anti-vibe-manifest.json`:

```javascript
const manifestPath = path.join(projectRoot, '.claude', '.anti-vibe-manifest.json');
const hasManifest = fs.existsSync(manifestPath);
```

#### Se manifest EXISTE → Modo Atualização

O projeto já tem Anti-Vibe Coding instalado. Executar lógica de **atualização incremental**:

1. Ler manifest local e plugin-manifest
2. Detectar arquivos desatualizados (consultar `skills/lib/manifest-utils.md`)
3. Apresentar atualizações disponíveis ao usuário
4. Perguntar: "Deseja atualizar agora? [1] Sim [2] Não [3] Ver detalhes"
5. Se "Sim", aplicar atualizações seguindo as estratégias (merge/replace)
6. Atualizar manifest local
7. Fim da execução (não seguir para Passo 1)

**Ver lógica completa de update em:** `skills/update/skill.md`

#### Se manifest NÃO existe → Modo Instalação

Primeira instalação. Seguir para Passo 1 normalmente.

---

### Passo 1 — Detectar Estado do Projeto

Verificar a existencia destes arquivos no projeto:
- `CLAUDE.md` na raiz
- `.claude/rules/` com rules existentes
- `.claude/decisions.md`

### Passo 2 — Setup do CLAUDE.md

#### Cenario A: Projeto SEM CLAUDE.md

1. Ler o template Anti-Vibe em `${CLAUDE_PLUGIN_ROOT}/CLAUDE.md`
2. Apresentar ao usuario o conteudo que sera criado
3. Perguntar: "Este CLAUDE.md sera criado na raiz do projeto. Aprovar?"
4. Se aprovado, criar o arquivo

#### Cenario B: Projeto COM CLAUDE.md existente (MERGE)

Cenario mais importante. Seguir EXATAMENTE:

1. **Ler** o CLAUDE.md existente do projeto (o "original")
2. **Ler** o template Anti-Vibe em `${CLAUDE_PLUGIN_ROOT}/CLAUDE.md` (o "template")
3. **Analisar** o original e identificar:
   - Secoes especificas do projeto (stack, configs, variaveis de ambiente, regras de negocio)
   - Padroes ja definidos que podem conflitar com o Anti-Vibe
   - Informacoes que DEVEM ser preservadas
4. **Fazer o merge** seguindo as regras de prioridade abaixo

#### Regras de Merge

| Situacao | Acao |
|----------|------|
| Secao existe SO no original | **PRESERVAR** integralmente |
| Secao existe SO no template Anti-Vibe | **ADICIONAR** ao resultado |
| Secao existe em AMBOS sem conflito | **COMBINAR** (original + Anti-Vibe) |
| Secao existe em AMBOS COM conflito | **PRESERVAR o original**, adicionar nota do Anti-Vibe como complemento |
| Informacoes do projeto (stack, env vars, configs) | **SEMPRE preservar** do original |
| Filosofia Anti-Vibe Coding | **SEMPRE adicionar** no topo |
| Workflow de desenvolvimento | **Adicionar** se nao existir workflow equivalente |
| Tabelas de skills/commands do Anti-Vibe | **SEMPRE adicionar** ao final |

#### Estrutura do Merge (ordem das secoes)

```
1. Filosofia Anti-Vibe Coding (do template — SEMPRE no topo)
2. Instrucoes Gerais (merge: original + template)
3. [Secoes especificas do projeto original — TODAS preservadas na ordem original]
4. Padroes Core (do template, se o original nao tiver equivalente)
5. Workflow de Desenvolvimento (do template, se o original nao tiver equivalente)
6. Modo Consultor (do template — resumo com link para skill)
7. Modelo de Permissoes (merge: original + template)
8. Auto-Correcao e Aprendizado (do template)
9. Anti-Patterns (merge: original + template)
10. [Mais secoes especificas do original, se houver]
11. Plugin Anti-Vibe Coding (tabelas de skills/agents — SEMPRE ao final)
12. Git Workflow (merge: original + template)
13. Licoes Aprendidas (do template, se nao existir)
14. Decisoes Arquiteturais (do template, se nao existir)
```

5. **Apresentar o resultado** mostrando:
   - O CLAUDE.md mesclado completo
   - Um resumo das mudancas:
     - Secoes adicionadas do Anti-Vibe
     - Secoes preservadas do original
     - Secoes mescladas (indicando o que veio de cada lado)
     - Conflitos resolvidos (e como foram resolvidos)

6. **Pedir aprovacao** usando AskUserQuestion:
   - Opcao 1: "Aprovar e aplicar"
   - Opcao 2: "Ver diff detalhado" (mostra antes/depois lado a lado)
   - Opcao 3: "Ajustar antes de aplicar" (permite feedback para modificar)

7. Se "Ajustar", aplicar as modificacoes pedidas e apresentar novamente

8. Se aprovado, **criar backup** do original como `CLAUDE.md.backup` e aplicar o merge

### Passo 2.5 — Extração de Conhecimento do Projeto

Este passo extrai conhecimento valioso de arquivos existentes no projeto (além do CLAUDE.md) e o popula nas estruturas do plugin.

#### 1. Detectar arquivos de conhecimento

Buscar pelos seguintes padrões no projeto:
- `progress.txt`, `PROGRESS.md`, `progress.md`
- `.claude/memory/*.md` (arquivos de memória de sessões anteriores)
- `notes.md`, `NOTES.md`, `gotchas.md`, `GOTCHAS.md`
- `lessons.md`, `lessons-learned.md`
- Qualquer `*.md` dentro de `.claude/` que NÃO seja `CLAUDE.md`, `decisions.md` ou `rules/`

Se nenhum arquivo for encontrado além do CLAUDE.md: pular este passo.

#### 2. Analisar e filtrar cada arquivo

Para cada arquivo encontrado, ler o conteúdo e aplicar o **Filtro de Qualidade Sênior**:

Uma entrada SO qualifica se atender PELO MENOS 2 destes critérios:

| Critério | Descrição |
|----------|-----------|
| **Não é deduzível** | A IA não conseguiria inferir apenas lendo a documentação da stack |
| **É específica do projeto** | Aplica-se ao contexto, stack ou regras de negócio deste projeto |
| **Custo alto se repetido** | Se repetido, causa retrabalho, bug em produção, perda de dados |
| **Contra-intuitiva** | Vai contra o que a IA faria por padrão |

**DESCARTAR automaticamente:**
- Erros de sintaxe ou typos
- Bugs que os testes já cobrem
- Coisas que a documentação oficial já explica
- Padrões genéricos de clean code
- Qualquer coisa que a IA acertaria na segunda tentativa sem instrução

#### 3. Classificar as entradas extraídas

Cada entrada qualificada deve ser classificada em:

**→ Lição Aprendida** (vai para seção "Lições Aprendidas" do CLAUDE.md):
- Padrões de erro recorrentes deste projeto
- Comportamentos inesperados de integrações usadas
- Armadilhas específicas da stack/contexto do projeto

**→ Decisão Arquitetural** (vai para `.claude/decisions.md`):
- Escolhas de tecnologia feitas e por quê
- Trade-offs já avaliados
- Decisões de design que afetam múltiplos módulos

**→ Regra de Projeto** (vai para seção de padrões no CLAUDE.md):
- Convenções específicas deste projeto
- Restrições de negócio que impactam o código

#### 4. Apresentar ao usuário

Mostrar um resumo organizado por arquivo analisado:

```
## Conhecimento Extraído

### progress.txt (47 entradas analisadas)
- 3 qualificadas → Lições Aprendidas
- 1 qualificada → Decisão Arquitetural
- 43 descartadas (banais/duplicadas)

### .claude/memory/session-notes.md (12 entradas analisadas)
- 2 qualificadas → Lições Aprendidas
- 9 descartadas

### Preview das entradas que serão adicionadas:

**Lições Aprendidas:**
1. [Integração] ... [preview da lição]
2. [Armadilha] ... [preview da lição]
...

**Decisões Arquiteturais:**
1. [Nome da decisão] ...
...
```

Usar AskUserQuestion com:
- Opção 1: "Aplicar tudo"
- Opção 2: "Revisar entrada por entrada" (mostrar cada uma e pedir aprovação individual)
- Opção 3: "Pular extração"
- Opção 4: "Aplicar tudo e arquivar arquivo fonte" (extrai + move original para `.claude/archive/`)

#### 5. Aplicar o conhecimento aprovado

**Lições Aprendidas:** Adicionar na seção `## Lições Aprendidas` do CLAUDE.md mesclado, usando o formato:
```
### [Categoria] Título conciso da lição
**Regra:** [Uma frase imperativa, direta]
**Contexto:** [Por que essa regra existe — máximo 2 linhas]
```

Categorias válidas: `[Arquitetura]`, `[Integração]`, `[Performance]`, `[Negócio]`, `[Deploy]`, `[Armadilha]`

Limite: máximo 15 entradas. Se exceder, priorizar pelas que atendem mais critérios do filtro sênior.

**Decisões Arquiteturais:** Adicionar em `.claude/decisions.md` usando o formato:
```
### [Nome da Decisão]: [Opção Escolhida]
**Data:** [data extraída do arquivo ou hoje]
**Alternativas consideradas:** [extrair do contexto, se disponível]
**Justificativa:** [extrair do contexto]
**Risco conhecido:** [extrair do contexto, ou "Não documentado"]
**Reversibilidade:** Reversível / Irreversível
```

#### 6. Arquivar arquivo fonte (se Opção 4 escolhida)

Para cada arquivo de origem processado:
1. Criar diretório `.claude/archive/` se não existir
2. Mover o arquivo para `.claude/archive/<nome-do-arquivo>` (ex: `progress.txt` → `.claude/archive/progress.txt`)
3. Se já existir arquivo com mesmo nome no archive, adicionar timestamp: `.claude/archive/progress.txt.2026-03-09`
4. Informar ao usuário: "Arquivado: `progress.txt` → `.claude/archive/progress.txt`"

**Não arquivar automaticamente:** arquivos dentro de `.claude/` (como `memory/*.md`) — apenas arquivos na raiz ou fora do `.claude/`.

#### Regras Importantes

- **NUNCA** criar lições genéricas que se aplicariam a qualquer projeto
- **NUNCA** duplicar o que já está no CLAUDE.md mesclado
- Se um arquivo de origem for muito grande (>500 linhas), processar em blocos e ser mais seletivo
- Manter rastreabilidade: comentar de qual arquivo cada lição foi extraída (em comentário HTML)

### Passo 3 — Setup das Rules

1. Verificar se `.claude/rules/` existe
2. Para cada rule do Anti-Vibe (typescript, testing, api):
   - Se a rule NAO existe no projeto: copiar do template
   - Se a rule JA existe: apresentar as diferencas e perguntar se quer mesclar
3. Copiar as rules aprovadas

As rules do template estao em: `${CLAUDE_PLUGIN_ROOT}/rules/`

### Passo 4 — Setup do Decisions Registry

1. Se `.claude/decisions.md` nao existe, criar com template vazio
2. Se ja existe, nao tocar

### Passo 5 — Criar Manifest Local

Após todas as instalações/merges, criar `.claude/.anti-vibe-manifest.json` para rastrear versões.

**Implementação:**

```javascript
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Ler plugin-manifest.json
const pluginManifestPath = path.join(process.env.CLAUDE_PLUGIN_ROOT, 'plugin-manifest.json');
const pluginManifest = JSON.parse(fs.readFileSync(pluginManifestPath, 'utf8'));

// Criar estrutura do manifest local
const localManifest = {
  pluginVersion: pluginManifest.version,
  installedAt: new Date().toISOString(),
  files: {}
};

// Para cada arquivo instalado/mesclado nesta sessão:
installedFiles.forEach(file => {
  const filePath = path.join(projectRoot, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const checksum = crypto.createHash('sha256').update(content).digest('hex');

  localManifest.files[file] = {
    sourceVersion: pluginManifest.files[file].version,
    installedChecksum: checksum,
    lastUpdated: new Date().toISOString().split('T')[0],
    userModified: false
  };
});

// Salvar
const manifestPath = path.join(projectRoot, '.claude', '.anti-vibe-manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(localManifest, null, 2), 'utf8');
```

**Arquivos rastreados:**
- CLAUDE.md
- senior-principles.md
- Todas as rules instaladas
- Todas as skills (se copiadas)
- Hooks (se instalados)
- Agents (se copiados)

**IMPORTANTE:** O manifest registra o checksum do arquivo APÓS merge/modificação, não o checksum original do plugin.

### Passo 6 — Resumo Final

Apresentar um resumo do que foi feito:

```
## Anti-Vibe Coding — Setup Concluido

### Arquivos criados/modificados:
- [criado/mesclado/ja existia] CLAUDE.md
- [criado] senior-principles.md
- [criado/ja existia] .claude/rules/typescript-standards.md
- [criado/ja existia] .claude/rules/testing-standards.md
- [criado/ja existia] .claude/rules/api-standards.md
- [criado/ja existia] .claude/decisions.md
- [criado] .claude/.anti-vibe-manifest.json (rastreamento de versões)

### Proximos passos:
1. Revisar o CLAUDE.md mesclado
2. Iniciar uma nova sessao para os hooks ativarem
3. Usar `/anti-vibe-coding:consultant` para a proxima feature
4. Para atualizar o plugin no futuro: rodar `/anti-vibe-coding:init` novamente
```

## Regras Importantes

- **NUNCA sobrescrever** informacoes do projeto sem aprovacao
- **NUNCA remover** secoes existentes do CLAUDE.md original
- **SEMPRE** criar backup antes de modificar
- **SEMPRE** mostrar ao usuario o que sera alterado antes de alterar
- O merge deve ser **aditivo** — o Anti-Vibe Coding complementa, nao substitui
- Se nao tiver certeza sobre um conflito, **perguntar ao usuario**

## Diretorio do projeto

$ARGUMENTS
