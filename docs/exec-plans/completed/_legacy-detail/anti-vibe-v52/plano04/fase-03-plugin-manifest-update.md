# Fase 03 — Atualizar `plugin-manifest.json` + `CLAUDE.md` do Plugin

**Sizing:** ~1h  
**Arquivos a modificar:**
1. `f:\Projetos\Claude code\anti-vibe-coding\plugin-manifest.json`
2. `f:\Projetos\Claude code\anti-vibe-coding\CLAUDE.md`

**Ação:** Adicionar as 5 skills novas (iterate + 4 do Plano 03) ao manifesto e à tabela de skills do CLAUDE.md. Incrementar versão de 5.1 → 5.2.

## Skills a registrar (5 novas)

| Skill | Pasta | Plano de origem |
|-------|-------|-----------------|
| iterate | `skills/iterate/SKILL.md` | Plano 04 (esta fase) |
| incident-response | `skills/incident-response/SKILL.md` | Plano 03 |
| defensive-patterns | `skills/defensive-patterns/SKILL.md` | Plano 03 |
| centralize-config | `skills/centralize-config/SKILL.md` | Plano 03 |
| pair-programming-with-agent | `skills/pair-programming-with-agent/SKILL.md` | Plano 03 |

---

## Parte A — `plugin-manifest.json`

### Contexto

O manifesto atual tem versão `"5.1.0"` e termina com:

```json
    "skills/lib/llm-anti-patterns.md": {
      "version": "5.1.0",
      "checksum": "d35c383059a25c9a43bcc21ca04f8b96286f0dbe1f0ff7bcaacda55e58262a12",
      "lastModified": "2026-04-11",
      "updateStrategy": "replace"
    }
  }
}
```

### Instrução de execução

```
1. Ler plugin-manifest.json para confirmar estrutura atual
2. Localizar o último entry no objeto "files" (skills/lib/llm-anti-patterns.md)
3. Adicionar as 5 novas entries APÓS o último entry existente, ANTES do fechamento }  }
4. Atualizar campo "version" do manifesto raiz de "5.1.0" para "5.2.0"
5. Atualizar campo "generatedAt" para "2026-04-21T00:00:00.000Z"
6. Validar JSON (sem vírgulas extras, sem chaves faltando)
```

### old_string (para Edit)

```json
    "skills/lib/llm-anti-patterns.md": {
      "version": "5.1.0",
      "checksum": "d35c383059a25c9a43bcc21ca04f8b96286f0dbe1f0ff7bcaacda55e58262a12",
      "lastModified": "2026-04-11",
      "updateStrategy": "replace"
    }
  }
}
```

### new_string (para Edit)

```json
    "skills/lib/llm-anti-patterns.md": {
      "version": "5.1.0",
      "checksum": "d35c383059a25c9a43bcc21ca04f8b96286f0dbe1f0ff7bcaacda55e58262a12",
      "lastModified": "2026-04-11",
      "updateStrategy": "replace"
    },
    "skills/iterate/SKILL.md": {
      "version": "5.2.0",
      "checksum": "",
      "lastModified": "2026-04-21",
      "updateStrategy": "replace"
    },
    "skills/incident-response/SKILL.md": {
      "version": "5.2.0",
      "checksum": "",
      "lastModified": "2026-04-21",
      "updateStrategy": "replace"
    },
    "skills/defensive-patterns/SKILL.md": {
      "version": "5.2.0",
      "checksum": "",
      "lastModified": "2026-04-21",
      "updateStrategy": "replace"
    },
    "skills/centralize-config/SKILL.md": {
      "version": "5.2.0",
      "checksum": "",
      "lastModified": "2026-04-21",
      "updateStrategy": "replace"
    },
    "skills/pair-programming-with-agent/SKILL.md": {
      "version": "5.2.0",
      "checksum": "",
      "lastModified": "2026-04-21",
      "updateStrategy": "replace"
    }
  }
}
```

### old_string para versão do manifesto

```json
  "version": "5.1.0",
  "generatedAt": "2026-04-11T00:00:00.000Z",
```

### new_string para versão do manifesto

```json
  "version": "5.2.0",
  "generatedAt": "2026-04-21T00:00:00.000Z",
```

### Nota sobre checksums

Os checksums ficam vazios `""` intencionalmente — serão preenchidos pelo hook `/sync` ou `/init` na primeira execução após o deploy. O campo vazio é válido; o mecanismo de checksum do plugin tolera entries novos sem hash calculado (detecta como "novo arquivo, sem checksum anterior").

---

## Parte B — `CLAUDE.md` do Plugin

### Contexto

A tabela de Skills Disponíveis atual termina com:

```markdown
| **Verify Work** | `/anti-vibe-coding:verify-work` | **[v5] Verificação pós-execução com auditoria completa** |
```

A versão mencionada no título da seção é `v5.0` (linha: `### Pipeline v5.0`).

### Instrução de execução

```
1. Ler CLAUDE.md do plugin para confirmar estrutura atual
2. Localizar fim da tabela "Skills Disponíveis" (linha com verify-work)
3. Adicionar 5 novas linhas após a linha do verify-work
4. Localizar "### Pipeline v5.0" e atualizar para "### Pipeline v5.2"
5. Reler o arquivo para confirmar que as edições foram aplicadas
```

### Edit 1 — Adicionar 5 linhas na tabela de Skills

**old_string:**
```markdown
| **Verify Work** | `/anti-vibe-coding:verify-work` | **[v5] Verificação pós-execução com auditoria completa** |
```

**new_string:**
```markdown
| **Verify Work** | `/anti-vibe-coding:verify-work` | **[v5] Verificação pós-execução com auditoria completa** |
| **Iterate** | `/anti-vibe-coding:iterate` | **[v5.2] Ciclo pós-deploy: incident response + hardening** |
| **Incident Response** | `/anti-vibe-coding:incident-response` | **[v5.2] Investigação aprofundada de incidentes** |
| **Defensive Patterns** | `/anti-vibe-coding:defensive-patterns` | **[v5.2] Menu de hardening defensivo por categoria** |
| **Centralize Config** | `/anti-vibe-coding:centralize-config` | **[v5.2] Centralizar config e env vars espalhadas** |
| **Pair Programming** | `/anti-vibe-coding:pair-programming-with-agent` | **[v5.2] Sessão estruturada de pair programming com IA** |
```

### Edit 2 — Atualizar versão do Pipeline

**old_string:**
```markdown
### Pipeline v5.0
```

**new_string:**
```markdown
### Pipeline v5.2
```

### Edit 3 — Atualizar referência no texto do pipeline (se existir)

Verificar se o texto abaixo do header menciona "v5.0" explicitamente. Se sim, atualizar também. Se não, pular este edit.

```
Fluxo opcional conectando skills em sequencia:
```
grill-me → write-prd → plan-feature → execute-plan → verify-work
```
```

Nenhuma mudança necessária no fluxo — o `/iterate` é pós-pipeline, não entra no fluxo linear. Apenas adicionar nota após o fluxo:

**old_string:**
```markdown
Cada skill funciona standalone. O pipeline é atalho, não obrigação.
```

**new_string:**
```markdown
Cada skill funciona standalone. O pipeline é atalho, não obrigação.

Ciclo pós-deploy (v5.2): `verify-work → iterate` — regression fixes e hardening em produção.
```

---

## Verificação

Após todas as edições:

- [ ] `plugin-manifest.json` versão atualizada para `5.2.0`
- [ ] `plugin-manifest.json` tem 5 novas entries (iterate, incident-response, defensive-patterns, centralize-config, pair-programming-with-agent)
- [ ] JSON válido — sem vírgulas extras, sem chaves faltando
- [ ] `CLAUDE.md` tabela de Skills tem 5 novas linhas
- [ ] `CLAUDE.md` Pipeline atualizado de v5.0 → v5.2
- [ ] `CLAUDE.md` tem nota sobre ciclo pós-deploy
- [ ] Nenhuma linha existente da tabela foi reformatada

### Validação de JSON

```bash
cd 'f:/Projetos/Claude code/anti-vibe-coding'
node -e "JSON.parse(require('fs').readFileSync('plugin-manifest.json','utf8')); console.log('JSON valido')"
```

## Comandos de commit

```bash
cd 'f:/Projetos/Claude code/anti-vibe-coding'
git add plugin-manifest.json CLAUDE.md
git commit -m "feat(plugin): registrar 5 novas skills v5.2 no manifesto e CLAUDE.md"
```

## Nota de rollback

```bash
cd 'f:/Projetos/Claude code/anti-vibe-coding'
git diff plugin-manifest.json CLAUDE.md
git checkout plugin-manifest.json CLAUDE.md
```
