# State Utils — Operações de Execução de Estado

Instruções para skills manipularem arquivos de estado de execução em `.planning/`.

> **Nota:** As operações abaixo são executadas pelas skills via ferramentas Read/Write/Edit do Claude — não são código de runtime.

---

## Convenções

- **Diretório:** `.planning/` na raiz do projeto do usuário
- **Naming:** `STATE-{kebab-case-name}.md`, `SUMMARY-{kebab-case-name}.md`
- **Frontmatter:** delimitado por `---`, campos no formato `chave: valor`
- **Encoding:** UTF-8, line endings LF
- **Timestamps:** ISO 8601 (ex: `2026-04-08T14:30:00Z`)
- **Fallback:** se `.planning/` não existir, criar com `mkdir -p .planning/`

---

## Operações

### readState(featureName)

Ler o estado atual de uma feature.

**Parâmetros:**
- `featureName`: nome da feature em kebab-case (ex: `user-auth`)

**Comportamento:**
1. Ler `.planning/STATE-{featureName}.md`
2. Parsear frontmatter entre os dois `---` delimitadores
3. Retornar null se arquivo não existir (feature não iniciada)

**Exemplo de uso:**
```
Read: .planning/STATE-user-auth.md
→ Parsear campos: phase, wave, tasks_done, tasks_total, etc.
→ Se não existe: feature não foi iniciada ainda
```

---

### createState(featureName, planData)

Criar estado inicial de uma feature a partir do template.

**Parâmetros:**
- `featureName`: nome da feature em kebab-case
- `planData`: dados do plano (waves, tasks, nomes)

**Comportamento:**
1. Criar `.planning/` se não existir
2. Ler `templates/STATE.md` do plugin (via `CLAUDE_PLUGIN_ROOT`)
3. Preencher todos os placeholders `{variavel}` com dados reais
4. Escrever em `.planning/STATE-{featureName}.md`

**Exemplo de uso:**
```
Read: ${CLAUDE_PLUGIN_ROOT}/templates/STATE.md
→ Substituir {feature_name} = "User Auth"
→ Substituir {current_wave} = 1, {total_waves} = 3
→ Write: .planning/STATE-user-auth.md
```

---

### updateWaveProgress(featureName, wave, tasksDone)

Atualizar progresso ao avançar de wave.

**Parâmetros:**
- `featureName`: nome da feature
- `wave`: número da wave atual
- `tasksDone`: quantidade de tasks concluídas até agora

**Comportamento:**
1. Ler arquivo de estado atual
2. Atualizar frontmatter: `wave`, `tasks_done`, `last_updated`
3. Recalcular progress bar: `[████████░░] 80% (8/10 tasks)`
4. Atualizar seção "Current Wave" com tasks da nova wave

**Exemplo:**
```
Read: .planning/STATE-user-auth.md
→ Atualizar: wave: 2, tasks_done: 5, last_updated: 2026-04-08T15:00:00Z
Edit: .planning/STATE-user-auth.md
```

---

### markTaskDone(featureName, taskId)

Marcar uma task específica como concluída.

**Parâmetros:**
- `featureName`: nome da feature
- `taskId`: identificador da task (ex: "1.2")

**Comportamento:**
1. Localizar task na seção "Current Wave" com `- [ ]`
2. Mudar para `- [x]`
3. Remover marcador `<- CURRENT` da task concluída
4. Adicionar `<- CURRENT` à próxima task pendente
5. Incrementar `tasks_done` no frontmatter

---

### markTaskBlocked(featureName, taskId, reason)

Registrar bloqueio em uma task.

**Parâmetros:**
- `featureName`: nome da feature
- `taskId`: identificador da task
- `reason`: motivo do bloqueio

**Comportamento:**
1. Marcar task na seção "Current Wave" com `- [⛔]`
2. Adicionar entrada na seção "Blockers":
   `- Task {taskId}: {reason}`
3. NÃO incrementar `tasks_done`
4. Atualizar `last_updated`

---

### addDecision(featureName, decision, reason)

Registrar decisão tomada durante execução.

**Parâmetros:**
- `featureName`: nome da feature
- `decision`: descrição da decisão
- `reason`: justificativa

**Comportamento:**
1. Adicionar na seção "Decisions Made":
   `- {decision} ({reason})`
2. Atualizar `last_updated`

---

### writeNextSession(featureName, context)

Atualizar contexto de retomada. **Operação mais crítica.**

**Parâmetros:**
- `featureName`: nome da feature
- `context`: objeto com `done`, `next`, `keyState`

**Comportamento:**
1. Substituir completamente a seção "Next Session"
2. Preencher os três campos: Done, Next, Key state
3. Atualizar `last_updated` no frontmatter

**Exemplo:**
```
→ Next Session:
  Done: "Wave 1 completa — auth service criado, testes passando"
  Next: "Wave 2: implementar endpoints REST e middleware de autenticação"
  Key state: "Token expiry = 24h, usando argon2 para hash"
```

---

### createSummary(featureName, results)

Gerar sumário final ao concluir execução. Chamado **uma vez** ao final.

**Parâmetros:**
- `featureName`: nome da feature
- `results`: objeto com waves, decisões, blockers, testes

**Comportamento:**
1. Ler `templates/SUMMARY.md` do plugin
2. Preencher todas as seções com dados reais da execução
3. Escrever em `.planning/SUMMARY-{featureName}.md`
4. NÃO sobrescrever se já existir (execução parcial prévia)

---

## Regras Importantes

1. **SEMPRE** atualizar `last_updated` em qualquer operação de escrita
2. **SEMPRE** criar `.planning/` se não existir antes de escrever
3. **NUNCA** sobrescrever STATE sem ler primeiro (integridade das edições)
4. **`writeNextSession`** deve ser chamado ao final de CADA wave
5. **`createSummary`** é chamado apenas uma vez, ao concluir todas as waves
6. Se frontmatter tiver campos desconhecidos (versão futura), preservá-los
