---
name: update
description: "This skill should be used when the user asks to 'update anti-vibe', 'check for updates', 'sync plugin changes', or when running /anti-vibe-coding:init in a project that already has Anti-Vibe Coding installed. Detects outdated files, shows available updates, and applies incremental updates with intelligent merge strategies."
user-invocable: true
allowed-tools: Read, Grep, Glob, Write, Edit, AskUserQuestion
argument-hint: "[project path (default: current directory)]"
---

# Update — Atualizar Anti-Vibe Coding no Projeto

Detecta e aplica atualizações incrementais do plugin Anti-Vibe Coding.

## Quando Executar

Esta skill é invocada automaticamente quando:
- Usuário roda `/anti-vibe-coding:init` em projeto que já tem `.claude/.anti-vibe-manifest.json`
- Usuário pede explicitamente para "atualizar" ou "check for updates"

## Fluxo de Execução

### Passo 1 — Detectar Atualizações

**1.1 Ler manifests**

```javascript
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Plugin manifest
const pluginManifestPath = path.join(process.env.CLAUDE_PLUGIN_ROOT, 'plugin-manifest.json');
const pluginManifest = JSON.parse(fs.readFileSync(pluginManifestPath, 'utf8'));

// Local manifest
const localManifestPath = path.join(projectRoot, '.claude', '.anti-vibe-manifest.json');
const localManifest = JSON.parse(fs.readFileSync(localManifestPath, 'utf8'));
```

**1.2 Comparar versões e checksums**

Para cada arquivo no `pluginManifest.files`:

```javascript
const updates = [];

Object.entries(pluginManifest.files).forEach(([file, pluginInfo]) => {
  const localInfo = localManifest.files[file];

  // Arquivo novo no plugin
  if (!localInfo) {
    updates.push({
      file,
      status: 'new',
      availableVersion: pluginInfo.version,
      updateStrategy: pluginInfo.updateStrategy,
      preview: generatePreview(file, 'new')
    });
    return;
  }

  // Arquivo desatualizado
  if (pluginInfo.version !== localInfo.sourceVersion) {
    // Verificar se usuário modificou
    const currentPath = path.join(projectRoot, file);
    const currentContent = fs.readFileSync(currentPath, 'utf8');
    const currentChecksum = crypto.createHash('sha256').update(currentContent).digest('hex');
    const userModified = currentChecksum !== localInfo.installedChecksum;

    updates.push({
      file,
      status: 'outdated',
      currentVersion: localInfo.sourceVersion,
      availableVersion: pluginInfo.version,
      userModified,
      updateStrategy: pluginInfo.updateStrategy,
      preview: generatePreview(file, 'updated', userModified)
    });
    return;
  }

  // Usuário modificou mas versão é a mesma
  const currentPath = path.join(projectRoot, file);
  if (fs.existsSync(currentPath)) {
    const currentContent = fs.readFileSync(currentPath, 'utf8');
    const currentChecksum = crypto.createHash('sha256').update(currentContent).digest('hex');

    if (currentChecksum !== localInfo.installedChecksum) {
      updates.push({
        file,
        status: 'modified',
        currentVersion: localInfo.sourceVersion,
        userModified: true,
        updateStrategy: pluginInfo.updateStrategy,
        preview: 'Modificado pelo usuário (versão atual do plugin)'
      });
    }
  }
});
```

**1.3 Se não há atualizações**

```
✓ Plugin Anti-Vibe Coding está atualizado!

Versão instalada: v4.0.0
Versão do plugin: v4.0.0

Nenhuma atualização disponível.
```

Fim da execução.

---

### Passo 2 — Apresentar Atualizações

Se há atualizações, apresentar de forma organizada:

```
## Atualizações Disponíveis do Anti-Vibe Coding

Plugin: v3.5.0 → v4.0.0

### Arquivos para atualizar:

✓ CLAUDE.md (v3.5.0 → v4.0.0)
  Status: Desatualizado
  Modificado pelo usuário: Sim
  Estratégia: Merge inteligente
  Preview: Adicionou seção "Conhecimento Sênior" e skills de infrastructure

✓ senior-principles.md (novo)
  Status: Novo arquivo
  Estratégia: Criar
  Preview: Documento com 60+ princípios técnicos extraídos de referências

✓ rules/security-patterns.md (v3.5.0 → v4.0.0)
  Status: Desatualizado
  Modificado pelo usuário: Não
  Estratégia: Merge
  Preview: Adicionou validação HMAC para webhooks e constant-time comparisons

✓ agents/infrastructure-auditor.md (novo)
  Status: Novo arquivo
  Estratégia: Criar
  Preview: Agent para auditoria de infra (DNS, Docker, health checks)

○ hooks/tdd-gate.cjs
  Status: Atualizado

Total: 4 atualizações disponíveis
```

**Avisos especiais:**

Se algum arquivo tiver `userModified: true` e `updateStrategy: "replace"`:

```
⚠️ ATENÇÃO: Os seguintes arquivos foram modificados por você e serão SUBSTITUÍDOS:
  - hooks/tdd-gate.cjs

Um backup será criado antes de substituir.
```

---

### Passo 3 — Obter Confirmação

Usar `AskUserQuestion` com as opções:

**Opção 1: Atualizar tudo selecionado**
- Aplica todas as atualizações de uma vez
- Cria backups automaticamente
- Recomendado para usuários confiantes

**Opção 2: Escolher arquivo por arquivo**
- Mostra cada arquivo e pergunta: "Atualizar este arquivo? [S/n]"
- Permite selecionar apenas alguns

**Opção 3: Ver diff de cada arquivo**
- Mostra diff detalhado antes/depois
- Depois volta para Opção 1 ou 2

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

Se não houver diferenças em CLAUDE.md (nenhuma seção nova ou alterada), pular o Passo 3.5 integralmente e reportar:
```
CLAUDE.md: sem mudanças de seção nesta versão
```

---

### Passo 4 — Aplicar Atualizações

Para cada arquivo aprovado:

#### 4.1 Criar Backup

SEMPRE criar backup antes de modificar:

```javascript
const backupDir = path.join(projectRoot, '.claude', 'backups', new Date().toISOString().split('T')[0]);
fs.mkdirSync(backupDir, { recursive: true });

const currentPath = path.join(projectRoot, file);
if (fs.existsSync(currentPath)) {
  const backupPath = path.join(backupDir, file.replace(/\//g, '_'));
  fs.copyFileSync(currentPath, backupPath);
  console.log(`✓ Backup criado: ${backupPath}`);
}
```

#### 4.2 Aplicar Estratégia

**Estratégia: `"replace"`**

```javascript
const pluginFilePath = path.join(process.env.CLAUDE_PLUGIN_ROOT, file);
const pluginContent = fs.readFileSync(pluginFilePath, 'utf8');

const targetPath = path.join(projectRoot, file);
fs.writeFileSync(targetPath, pluginContent, 'utf8');

console.log(`✓ Substituído: ${file}`);
```

**Estratégia: `"merge"`**

Se arquivo é `CLAUDE.md`:
- Usar APENAS as seções confirmadas no Passo 3.5 (`approvedSections`)
- Para cada seção em `approvedSections`: adicionar ao CLAUDE.md do projeto na posição correta
- Preservar INTEGRALMENTE todas as seções existentes do projeto (mesmo as alteradas)
- Seções puladas no Passo 3.5: ignorar completamente — não tocar
- Se `approvedSections` estiver vazio: não modificar CLAUDE.md, registrar no resumo final

Se arquivo é `rules/*.md`:
- Ler regra local
- Ler regra do plugin
- Fazer merge aditivo:
  - Se regra existe só no local: preservar
  - Se regra existe só no plugin: adicionar
  - Se existe em ambos: combinar

**Estratégia: `"never"`**

Ignorar completamente. Não tocar no arquivo.

#### 4.3 Calcular Novo Checksum

```javascript
const updatedContent = fs.readFileSync(targetPath, 'utf8');
const newChecksum = crypto.createHash('sha256').update(updatedContent).digest('hex');
```

#### 4.4 Atualizar Manifest Local

```javascript
localManifest.files[file] = {
  sourceVersion: pluginManifest.files[file].version,
  installedChecksum: newChecksum,
  lastUpdated: new Date().toISOString().split('T')[0],
  userModified: false
};
```

---

### Passo 5 — Salvar Manifest Atualizado

Atualizar `.claude/.anti-vibe-manifest.json`:

```javascript
localManifest.pluginVersion = pluginManifest.version;

const manifestPath = path.join(projectRoot, '.claude', '.anti-vibe-manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(localManifest, null, 2), 'utf8');

console.log(`✓ Manifest atualizado: ${manifestPath}`);
```

---

### Passo 6 — Resumo Final

```
## Atualização Concluída

### Arquivos atualizados:
✓ CLAUDE.md (v5.1.0 → v5.2.0) — merge aplicado
    Seções adicionadas: Code Style for Agents, Comments, Tests, Logging
    Seções puladas: Dependencies, Padrões Core
✓ senior-principles.md (novo) — criado
✓ rules/security-patterns.md (v5.1.0 → v5.2.0) — merge aplicado
✓ agents/infrastructure-auditor.md (novo) — criado

### Backups criados em:
.claude/backups/2026-03-23/

### Próximos passos:
1. Revisar arquivos atualizados (especialmente CLAUDE.md)
2. Iniciar nova sessão para mudanças ativarem
3. Continuar usando `/anti-vibe-coding:consultant` para features
```

---

## Funções Auxiliares

### generatePreview(file, updateType, userModified)

Gera preview de 1-2 linhas sobre o que mudou.

**Para arquivos novos:**
```javascript
const previews = {
  'senior-principles.md': 'Documento com 60+ princípios técnicos extraídos de referências',
  'agents/infrastructure-auditor.md': 'Agent para auditoria de infra (DNS, Docker, health checks)',
  // ...
};
return previews[file] || 'Novo arquivo do plugin';
```

**Para arquivos atualizados:**

Comparar conteúdos e detectar:
- Novas seções adicionadas
- Skills/agents/rules adicionados
- Mudanças significativas

Limite de ~80 caracteres.

### compareVersions(v1, v2)

```javascript
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if (parts1[i] > parts2[i]) return 1;
    if (parts1[i] < parts2[i]) return -1;
  }
  return 0;
}
```

---

## Regras Importantes

1. **SEMPRE** criar backup antes de modificar qualquer arquivo
2. **SEMPRE** atualizar manifest local após aplicar mudanças
3. **NUNCA** substituir arquivo com `userModified: true` sem avisar
4. Se `updateStrategy === "never"`, ignorar completamente
5. Se merge falhar, **REVERTER do backup** e avisar usuário
6. Arquivos em `.claude/backups/` NUNCA devem ser deletados automaticamente
7. Se usuário cancelar (Opção 4), não modificar nada
8. **CA-07:** Para CLAUDE.md, NUNCA aplicar seções sem confirmação explícita por seção (Passo 3.5). Dúvida = pular.

---

## Tratamento de Erros

**Se manifest local corrompido:**
```
⚠️ Erro: .anti-vibe-manifest.json está corrompido.

Opções:
[1] Reinstalar do zero (perde rastreamento)
[2] Tentar reparar
[3] Cancelar
```

**Se arquivo local foi deletado mas está no manifest:**
```
⚠️ Aviso: CLAUDE.md está registrado no manifest mas não existe.

Será recriado da versão do plugin.
```

**Se falha ao aplicar merge:**
```
⚠️ Erro ao fazer merge de CLAUDE.md

Backup preservado em: .claude/backups/2026-03-23/CLAUDE.md
Reverter para backup? [S/n]
```

---

## Diretorio do projeto

$ARGUMENTS
