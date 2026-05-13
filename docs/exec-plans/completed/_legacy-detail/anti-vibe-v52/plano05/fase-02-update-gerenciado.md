# Fase 02 — Update `skills/update/SKILL.md`: Upgrade Gerenciado com Diff + Confirmação

**Sizing:** ~1.0h  
**Arquivo a modificar:** `f:\Projetos\Claude code\anti-vibe-coding\skills\update\SKILL.md`  
**CA-07:** Não aplicar nenhuma mudança sem confirmação explícita por seção

## Objetivo

Implementar o mecanismo de upgrade gerenciado: ao rodar `/update` de v5.1 → v5.2, mostrar diff das mudanças em CLAUDE.md do projeto e pedir confirmação **por seção** antes de aplicar. Breaking changes são gerenciados, não silenciosos.

## Análise do arquivo atual (lido em 2026-04-21)

O arquivo tem 389 linhas. O Passo 3 atual (linhas 169–189) tem confirmação por ARQUIVO (atualizar tudo / arquivo a arquivo / ver diff / cancelar). Falta a granularidade por SEÇÃO para o CLAUDE.md.

O Passo 4.2, estratégia `"merge"` para CLAUDE.md (linhas 228–233), delega ao lógica do /init sem mostrar diff por seção.

As mudanças necessárias são:
1. Inserir novo Passo 3.5 entre o Passo 3 e o Passo 4: "Confirmação por Seção para CLAUDE.md"
2. Atualizar o Passo 4.2 (estratégia merge para CLAUDE.md) para referenciar o novo Passo 3.5

## Diff a aplicar

### Alteração 1 — Inserir Passo 3.5 após o Passo 3

**Localização:** Após o bloco `**Opção 4: Cancelar**` (linha 188), antes de `---` que precede `### Passo 4`

```
old_string:
**Opção 4: Cancelar**
- Não aplica nenhuma atualização
- Sai da skill

---

### Passo 4 — Aplicar Atualizações

new_string:
**Opção 4: Cancelar**
- Não aplica nenhuma atualização
- Sai da skill

---

### Passo 3.5 — Confirmação por Seção (apenas para CLAUDE.md)

Executar SOMENTE quando `CLAUDE.md` estiver na lista de atualizações aprovadas no Passo 3.

Este passo implementa o **CA-07**: nenhuma seção do CLAUDE.md é modificada sem confirmação explícita.

#### 3.5.1 — Detectar versão atual instalada

```javascript
// Ler versão do plugin instalada (do manifest local)
const installedVersion = localManifest.pluginVersion; // ex: "5.1.0"
const targetVersion = pluginManifest.version;         // ex: "5.2.0"
```

#### 3.5.2 — Identificar seções alteradas entre versões

Comparar o CLAUDE.md do plugin (`${CLAUDE_PLUGIN_ROOT}/CLAUDE.md`) com o CLAUDE.md instalado (registrado no manifest). Identificar seções que foram adicionadas, modificadas ou removidas no plugin entre `installedVersion` e `targetVersion`.

```javascript
// Extrair seções de um CLAUDE.md (split por "## " headings)
function extractSections(content) {
  const sections = {};
  const lines = content.split('\n');
  let currentSection = '__preamble__';
  let currentLines = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      sections[currentSection] = currentLines.join('\n').trim();
      currentSection = line.slice(3).trim();
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }
  sections[currentSection] = currentLines.join('\n').trim();
  return sections;
}

const pluginSections = extractSections(pluginClaudeMdContent);
const localProjectSections = extractSections(projectClaudeMdContent);

// Diferenças: seções novas no plugin que não existem no projeto
const newSections = Object.keys(pluginSections).filter(
  s => !localProjectSections[s] && s !== '__preamble__'
);

// Diferenças: seções existentes com conteúdo alterado no plugin
const changedSections = Object.keys(pluginSections).filter(s => {
  return localProjectSections[s] &&
    pluginSections[s] !== localProjectSections[s] &&
    s !== '__preamble__';
});
```

#### 3.5.3 — Apresentar diff por seção

```
## Atualizações de CLAUDE.md — Confirmação por Seção

Versão atual: v5.1.0 → v5.2.0
Seções com mudanças: 6

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NOVA SEÇÃO: Code Style for Agents
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
+ ## Code Style for Agents
+
+ Convenções obrigatórias para código gerado por IA:
+ - Nomes grepáveis: use nomes específicos ao domínio...
+ [... prévia das primeiras 10 linhas ...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NOVA SEÇÃO: Comments
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
+ ## Comments
+
+ Escreva o WHY. Nunca o WHAT.
+ [... prévia das primeiras 10 linhas ...]

[... repetir para cada seção nova/alterada ...]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Mostrar prévia de no máximo 10 linhas por seção. Indicar `[+N linhas adicionais]` se maior.

#### 3.5.4 — Pedir confirmação por seção

Para cada seção nova ou alterada, usar `AskUserQuestion`:

```
Seção: "Code Style for Agents" (NOVA)

[1] Aplicar — adicionar esta seção ao CLAUDE.md do projeto
[2] Pular — não adicionar esta seção agora
[3] Ver seção completa — mostrar conteúdo integral antes de decidir
```

Registrar decisão de cada seção: `{ section: string, decision: 'apply' | 'skip' }[]`

**Regra CA-07:** Se o usuário não confirmar explicitamente, a seção é PULADA. Dúvida = pular.

#### 3.5.5 — Resumo antes de aplicar

Após percorrer todas as seções, mostrar resumo e pedir confirmação final:

```
## Resumo das decisões — CLAUDE.md

Aplicar (4 seções):
  ✓ Code Style for Agents (nova)
  ✓ Comments (nova)
  ✓ Tests (nova)
  ✓ Logging (nova)

Pular (2 seções):
  ○ Dependencies (pulada)
  ○ Padrões Core (alterada — preservar versão do projeto)

Confirmar e aplicar as 4 seções selecionadas? [S/n]
```

Se o usuário responder "n", voltar para confirmação por seção (recomeçar o 3.5.4).
Se "S", prosseguir para Passo 4 com apenas as seções confirmadas.

#### 3.5.6 — Passar lista de seções confirmadas para Passo 4

```javascript
// Contexto que o Passo 4 usa ao fazer merge de CLAUDE.md
const approvedSections = decisions
  .filter(d => d.decision === 'apply')
  .map(d => d.section);

// Repassar para a lógica de merge
mergeClaudeMd({ approvedSections });
```

---

### Passo 4 — Aplicar Atualizações
```

### Alteração 2 — Atualizar estratégia merge de CLAUDE.md no Passo 4.2

**Localização:** Dentro do bloco `**Estratégia: "merge"`**, na sub-seção `Se arquivo é CLAUDE.md`

```
old_string:
Se arquivo é `CLAUDE.md`:
- Seguir lógica de merge do `/anti-vibe-coding:init` (Passo 2 → Cenário B)
- Preservar seções do projeto
- Adicionar novas seções do plugin
- Avisar sobre conflitos

new_string:
Se arquivo é `CLAUDE.md`:
- Usar APENAS as seções confirmadas no Passo 3.5 (`approvedSections`)
- Para cada seção em `approvedSections`: adicionar ao CLAUDE.md do projeto na posição correta
- Preservar INTEGRALMENTE todas as seções existentes do projeto (mesmo as alteradas)
- Seções puladas no Passo 3.5: ignorar completamente — não tocar
- Se `approvedSections` estiver vazio: não modificar CLAUDE.md, registrar no resumo final
```

### Alteração 3 — Atualizar Resumo Final (Passo 6) para incluir seções aplicadas/puladas

**Localização:** Dentro do bloco de código do Passo 6 (linhas ~283–299)

```
old_string:
### Arquivos atualizados:
✓ CLAUDE.md (v3.5.0 → v4.0.0) — merge aplicado
✓ senior-principles.md (novo) — criado
✓ rules/security-patterns.md (v3.5.0 → v4.0.0) — merge aplicado
✓ agents/infrastructure-auditor.md (novo) — criado

new_string:
### Arquivos atualizados:
✓ CLAUDE.md (v5.1.0 → v5.2.0) — merge aplicado
    Seções adicionadas: Code Style for Agents, Comments, Tests, Logging
    Seções puladas: Dependencies, Padrões Core
✓ senior-principles.md (novo) — criado
✓ rules/security-patterns.md (v5.1.0 → v5.2.0) — merge aplicado
✓ agents/infrastructure-auditor.md (novo) — criado
```

### Alteração 4 — Adicionar CA-07 às Regras Importantes

**Localização:** Seção `## Regras Importantes` (linhas ~345–353)

```
old_string:
1. **SEMPRE** criar backup antes de modificar qualquer arquivo
2. **SEMPRE** atualizar manifest local após aplicar mudanças
3. **NUNCA** substituir arquivo com `userModified: true` sem avisar
4. Se `updateStrategy === "never"`, ignorar completamente
5. Se merge falhar, **REVERTER do backup** e avisar usuário
6. Arquivos em `.claude/backups/` NUNCA devem ser deletados automaticamente
7. Se usuário cancelar (Opção 4), não modificar nada

new_string:
1. **SEMPRE** criar backup antes de modificar qualquer arquivo
2. **SEMPRE** atualizar manifest local após aplicar mudanças
3. **NUNCA** substituir arquivo com `userModified: true` sem avisar
4. Se `updateStrategy === "never"`, ignorar completamente
5. Se merge falhar, **REVERTER do backup** e avisar usuário
6. Arquivos em `.claude/backups/` NUNCA devem ser deletados automaticamente
7. Se usuário cancelar (Opção 4), não modificar nada
8. **CA-07:** Para CLAUDE.md, NUNCA aplicar seções sem confirmação explícita por seção (Passo 3.5). Dúvida = pular.
```

## Checklist de Verificação (Fase 02)

- [ ] Reler o arquivo `skills/update/SKILL.md` antes de editar
- [ ] Confirmar que o Passo 3.5 foi inserido ENTRE o Passo 3 e o Passo 4 (não dentro de nenhum deles)
- [ ] Confirmar que o Passo 3.5 tem 6 sub-passos numerados (3.5.1 a 3.5.6)
- [ ] Confirmar que a Alteração 2 (estratégia merge de CLAUDE.md) referencia `approvedSections`
- [ ] Confirmar que a Alteração 3 (resumo final) mostra seções aplicadas/puladas
- [ ] Confirmar que a Alteração 4 (CA-07) foi adicionada à lista de Regras Importantes como item 8
- [ ] Verificar que nenhuma lógica de arquivo existente foi removida — apenas adicionada/modificada
- [ ] Verificar que o Passo 3.5 está dentro de um bloco executável (não apenas prosa) — sub-passos com blocos de código
- [ ] Contar linhas do arquivo final — deve ser ~550 linhas (389 original + ~160 adicionadas)
- [ ] Commit no repo `anti-vibe-coding/`: `feat(update): add section-by-section confirmation for CLAUDE.md upgrade (CA-07)`

## Gotchas críticos

- O Passo 3.5 só executa quando CLAUDE.md está na lista de arquivos aprovados no Passo 3 — não executa para outros arquivos (rules, agents, hooks)
- A função `extractSections` usa `## ` (dois hashes + espaço) para split. Seções com `###` são tratadas como conteúdo interno, não como seções separadas
- `approvedSections` é uma lista de strings com os nomes das seções (ex: `["Code Style for Agents", "Comments"]`) — o merge usa essa lista como filtro, não como substituição
- O resumo do 3.5.5 deve mostrar o TOTAL de seções (aplicar + pular) para o usuário ter visibilidade completa
- Se não houver diferenças em CLAUDE.md (nenhuma seção nova ou alterada), pular o Passo 3.5 integralmente e reportar "CLAUDE.md: sem mudanças de seção nesta versão"

## Fluxo completo do upgrade (v5.1 → v5.2)

```
/update
  ↓
Passo 1: Detectar atualizações
  ↓
Passo 2: Apresentar lista (CLAUDE.md + outros arquivos)
  ↓
Passo 3: Confirmação por ARQUIVO
  → Usuário seleciona CLAUDE.md para atualizar
  ↓
Passo 3.5: Confirmação por SEÇÃO (apenas CLAUDE.md)
  → "Code Style for Agents" → [aplicar]
  → "Comments" → [aplicar]
  → "Tests" → [aplicar]
  → "Dependencies" → [pular]
  → "Logging" → [aplicar]
  → Resumo → confirmar
  ↓
Passo 4: Aplicar (só seções confirmadas do CLAUDE.md + outros arquivos aprovados)
  ↓
Passo 5: Salvar manifest
  ↓
Passo 6: Resumo final (com seções aplicadas/puladas do CLAUDE.md)
```

## Ordem de execução recomendada

1. Reler o arquivo completo (confirmar estado atual — 389 linhas)
2. Aplicar Alteração 1 (inserir Passo 3.5 completo)
3. Verificar que o Passo 3.5 aparece entre os Passos 3 e 4
4. Aplicar Alteração 2 (estratégia merge CLAUDE.md usa `approvedSections`)
5. Verificar Alteração 2
6. Aplicar Alteração 3 (resumo final com seções)
7. Aplicar Alteração 4 (CA-07 nas Regras Importantes)
8. Reler o arquivo inteiro para confirmar integridade
9. Commit no repositório `anti-vibe-coding/`
