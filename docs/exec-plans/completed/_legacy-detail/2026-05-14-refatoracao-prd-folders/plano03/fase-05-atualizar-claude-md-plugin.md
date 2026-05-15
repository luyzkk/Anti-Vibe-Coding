# Fase 05: Atualizar CLAUDE.md do plugin (documentacao)

**Plano:** 03 — Multi-PRD, ciclo de vida e consolidacao
**Sizing:** 0.5h
**Depende de:** fase-01, fase-02, fase-03, fase-04 (documenta o estado FINAL apos todas as
mudancas de comportamento deste plano)
**Visual:** false

---

## O que esta fase entrega

Atualizar `anti-vibe-coding/CLAUDE.md`:
1. Secao "Estrutura hierarquica (v2)" dentro de "Pipeline v5.0 → Artefatos de Pipeline" — refletir
   o novo layout `.planning/YYYY-MM-DD-{slug}/` com arquivos nus e subpastas `planoNN/`.
2. Secao "Artefatos de Pipeline" (acima) — mencionar arquivamento em `_archive/` como fim do
   ciclo de vida.

Compativel com `/anti-vibe-coding:update` (estrategia MERGE do CLAUDE.md).

Satisfaz **R5** do PRD (mitigacao via atualizacao de docs) e consolida a documentacao para
novos usuarios.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/CLAUDE.md` | Modify | Substituir bloco "Estrutura hierarquica (v2)" (linhas ~130-148 atualmente) pela estrutura `.planning/YYYY-MM-DD-{slug}/`; atualizar bullets de "Artefatos de Pipeline" acima (linhas ~124-128) mencionando arquivamento |

---

## Implementacao

### Passo 1: Substituir "Artefatos de Pipeline"

Localizar (linhas ~124-128 atualmente):

```markdown
Artefatos de Pipeline:
- Artefatos em `.planning/` (CONTEXT, PRD, PLAN, STATE, SUMMARY, plano{NN}/) são **temporários**
- Após `/verify-work`, o código é a fonte de verdade — artefatos servem para rastrear processo
- Não crie documentos para explicar outros documentos — se precisa de resumo, adicione seção no doc original
- Se um artefato existe APENAS para explicar ou resumir outro, delete e corrija o original
```

Substituir por:

```markdown
Artefatos de Pipeline:
- Cada PRD vive em pasta datada `.planning/YYYY-MM-DD-{slug}/` com artefatos nus (CONTEXT, PRD, PLAN, STATE, SUMMARY, MEMORY, plano{NN}/) — veja "Estrutura hierarquica (v2)" abaixo
- Artefatos sao **temporarios** — apos `/verify-work` o codigo eh a fonte de verdade
- Ao concluir: `/verify-work` oferece arquivar a pasta em `.planning/_archive/` e gera `MEMORY.md` consolidado do PRD
- Nao crie documentos para explicar outros documentos — se precisa de resumo, adicione secao no doc original
- Se um artefato existe APENAS para explicar ou resumir outro, delete e corrija o original
- Paralelismo por design: multiplos PRDs coexistem em pastas datadas independentes (sem lock global)
```

### Passo 2: Substituir "Estrutura hierarquica (v2)"

Localizar (linhas ~130-148 atualmente):

```markdown
Estrutura hierárquica (v2):
`` `
.planning/
├── PLAN-{feature}.md         ← Overview (grafo entre planos)
├── STATE-{feature}.md        ← Tracking global por plano
├── plano01/
│   ├── README.md             ← Overview do plano + dependências
│   ├── MEMORY.md             ← Memória viva (bugs, decisões, gotchas)
│   └── fase-01-{nome}.md    ← Tasks detalhadas com snippets e checklist
├── plano02/ ...
└── SUMMARY-{feature}.md      ← Gerado ao concluir todos os planos
`` `
- Planos são gerados sob demanda (um por vez, em contexto isolado)
- MEMORY.md é preenchida DURANTE execução e destilada ao final via /lessons-learned
```

Substituir por:

```markdown
Estrutura hierarquica (v2 — pasta datada por PRD):
`` `
.planning/
├── CONTEXT-{slug}.md                  ← gerado pelo /grill-me (antes da pasta existir)
├── 2026-04-20-sistema-notificacoes/   ← pasta datada do PRD
│   ├── CONTEXT.md                     ← movido pelo /write-prd ao criar a pasta
│   ├── PRD.md                         ← arquivos NUS (a pasta ja da contexto)
│   ├── PLAN.md                        ← overview (grafo entre planos)
│   ├── STATE.md                       ← tracking global por plano
│   ├── SUMMARY.md                     ← gerado ao concluir todos os planos
│   ├── MEMORY.md                      ← consolidado do PRD (gerado ao arquivar)
│   ├── plano01/
│   │   ├── README.md                  ← overview do plano + dependencias
│   │   ├── MEMORY.md                  ← memoria viva (bugs, decisoes, gotchas) — por plano
│   │   ├── fase-01-{nome}.md          ← tasks detalhadas com snippets e checklist
│   │   └── fase-02-{nome}.md
│   └── plano02/ ...
├── 2026-04-25-outra-feature/
│   └── ...
└── _archive/
    └── 2026-01-10-auth/               ← PRDs concluidos arquivados (via /verify-work)
`` `
- Cada PRD vive em sua propria pasta `YYYY-MM-DD-{slug}/` — multiplos PRDs coexistem sem colisao
- Arquivos dentro da pasta sao NUS (`PRD.md`, nao `PRD-{slug}.md`) — a pasta ja da contexto
- Planos sao gerados sob demanda (um por vez, em contexto isolado)
- `planoNN/MEMORY.md` eh preenchida DURANTE execucao, por plano (isolamento de subagentes)
- `MEMORY.md` no nivel do PRD eh consolidado (agregado das memorias dos planos) — gerado AO ARQUIVAR
- Licoes generalizaveis sao promovidas para `CLAUDE.md` do projeto via `/lessons-learned`
- Paralelismo sem lock: duas sessoes Claude podem trabalhar em PRDs diferentes simultaneamente
- Descoberta: `/execute-plan` e `/plan-feature` sem argumento listam PRDs ativos (filtro default: planned + in-progress + paused; `--all` inclui completed)
- Legacy: `PRD-*.md` ou `planoNN/` soltos da versao anterior sao detectados e migracao eh oferecida on-detect (sem comando separado)
```

### Passo 3: Compatibilidade com /update (estrategia MERGE)

A tabela de estrategias de atualizacao de `CLAUDE.md` (linhas ~168-174 do CLAUDE.md):

```
| CLAUDE.md | Merge | Preserva modificações + adiciona novos princípios |
```

Como a estrategia eh MERGE e NAO REPLACE, customizacoes do usuario em outros lugares sao
preservadas. Para esta fase:

- As substituicoes acima sao de BLOCOS INTEIROS com headings conhecidos (`Artefatos de Pipeline:`,
  `Estrutura hierarquica (v2):`).
- O algoritmo de merge (conforme hooks/skill `/anti-vibe-coding:update`) tipicamente:
  1. Detecta headings iguais no arquivo local e remoto
  2. Se o usuario nao modificou aquele bloco: substitui pelo remoto
  3. Se o usuario modificou: pergunta ao dev (conflito)

- Para facilitar a mesclagem, manter os headings EXATAMENTE como estao:
  - `Artefatos de Pipeline:` (com dois pontos no final)
  - `Estrutura hierarquica (v2 — pasta datada por PRD):` (novo heading, mas comecando com
    `Estrutura hierarquica (v2)` — prefixo preservado para matching)

- Importante: NAO mudar o heading radicalmente (ex: nao trocar para "Estrutura v3"). Manter
  `v2` para que o merge reconheca o bloco como continuacao.

### Passo 4: Verificar que NAO ha outras referencias a `PLAN-{feature}.md` no CLAUDE.md

Grep em `anti-vibe-coding/CLAUDE.md` por:
- `PLAN-{feature}` — deve ter 0 matches apos esta fase
- `STATE-{feature}` — deve ter 0 matches apos esta fase
- `SUMMARY-{feature}` — deve ter 0 matches apos esta fase
- `PRD-{feature}` — deve ter 0 matches apos esta fase

Se encontrar algum, atualizar para a nova estrutura (caminhos dentro da pasta datada). Essas
strings podem aparecer em exemplos dentro das secoes de "Skills Disponiveis", "Agents", etc.

### Passo 5: Confirmar que outras secoes NAO mencionam estrutura antiga

Revisar rapidamente as seguintes secoes do `CLAUDE.md` para garantir consistencia:
- "Pipeline v5.0" (linhas ~117-122) — nao menciona estrutura de pastas diretamente, OK
- Tabela "Skills Disponiveis" (linhas ~179-203) — sem referencias a paths especificos, OK
- "Agents Disponiveis" (linhas ~205-223) — sem referencias a paths, OK
- "Versionamento e Atualizacoes" (linhas ~139-175) — menciona `.claude/`, nao `.planning/`, OK

Se encontrar referencia desatualizada em qualquer outra secao (ex: `templates/`, `skills/`), NAO
tocar — esta fase eh focada APENAS em "Estrutura hierarquica (v2)" e "Artefatos de Pipeline".
Outras mudancas sao escopo de planos futuros ou do proprio /update.

### Passo 6: Nao tocar em templates do plugin

Os templates em `anti-vibe-coding/skills/*/templates/*.md` foram atualizados no Plano 01 fase-05.
Esta fase NAO toca neles. Se o Plano 01 fase-05 ainda nao rodou, isso eh um bloqueador — marcar
blocked.

---

## Gotchas

- **G1 do plano (G10 — /update merge):** Preservar headings exatos para que o merge do
  `/anti-vibe-coding:update` reconheca os blocos. Mudanca radical de heading faria o merge
  adicionar DUPLICATA em vez de substituir.
- **G2 do plano (R5 — projetos desatualizados):** Esta fase eh justamente a mitigacao de R5.
  Projetos instalados com versao antiga do plugin, apos `/update`, recebem o novo CLAUDE.md
  mergeado e passam a ver a estrutura nova documentada. Sem esta fase, devs nao saberiam que a
  estrutura mudou.
- **G3 do plano (fase-05 eh ultima):** Esta fase documenta o ESTADO FINAL apos as 4 fases
  anteriores. Nao faz sentido documentar comportamentos que ainda nao existem. Por isso a
  dependencia eh em TODAS as fases anteriores deste plano.
- **Local (consistencia com plano 01 fase-05):** Plano 01 fase-05 atualizou TEMPLATES. Esta fase
  atualiza DOCUMENTACAO. Nao sobrepor — sao arquivos distintos.
- **Local (sem criar arquivos de documentacao adicionais):** Conforme CLAUDE.md global do user:
  "NEVER proactively create documentation files". Esta fase apenas EDITA o CLAUDE.md do plugin
  existente. NAO criar README novo, nao criar CHANGELOG novo — essas decisoes sao escopo do dev.

---

## Verificacao

### Dogfooding

- [ ] **RED:** abrir `anti-vibe-coding/CLAUDE.md` antes da edicao; confirmar que secao
  "Estrutura hierarquica (v2)" ainda mostra a estrutura PLANA antiga (`plano01/` solto).
- [ ] **GREEN:** apos edicao, mesma secao mostra `.planning/YYYY-MM-DD-{slug}/` com `_archive/`
  e arquivos nus. "Artefatos de Pipeline" menciona arquivamento e consolidado.

### Checklist

- [ ] Bloco "Estrutura hierarquica (v2)" atualizado com pasta datada + arquivos nus + `_archive/`
- [ ] Bloco "Artefatos de Pipeline" menciona arquivamento via `/verify-work` e `MEMORY.md`
  consolidado
- [ ] Headings preservam prefixo `Estrutura hierarquica (v2)` e `Artefatos de Pipeline:` para
  merge
- [ ] Grep por `PLAN-{feature}`, `STATE-{feature}`, `SUMMARY-{feature}`, `PRD-{feature}` em
  `CLAUDE.md` retorna 0 matches (nao ha mais referencia a estrutura antiga)
- [ ] Menciona arquivos NUS, pasta datada, paralelismo sem lock, `--all`, migracao on-detect
- [ ] Secoes nao relacionadas (Skills, Agents, Versionamento) NAO foram tocadas
- [ ] Nenhum arquivo NOVO foi criado (apenas edicao)
- [ ] `/anti-vibe-coding:update` em um projeto teste continua funcionando (fora do escopo
  desta fase — validacao manual opcional)

---

## Criterio de Aceite

**Por humano (dogfooding):**
- Abrir `anti-vibe-coding/CLAUDE.md` apos edicao → secao "Estrutura hierarquica" mostra o novo
  layout com `YYYY-MM-DD-{slug}/` e `_archive/`
- Um dev novo lendo CLAUDE.md pela primeira vez entende como os PRDs sao organizados, sem
  precisar olhar codigo das skills

**Cobertura do PRD:**
- Dependencia "anti-vibe-coding/CLAUDE.md" (tabela Dependencias do PRD) ✓
- R5 mitigado via atualizacao de docs ✓

---

<!-- Gerado por /anti-vibe-coding:plan-feature em 2026-04-20 -->
