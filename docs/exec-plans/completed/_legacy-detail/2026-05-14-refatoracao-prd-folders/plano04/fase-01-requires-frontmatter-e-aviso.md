# Fase 01: Requires no frontmatter + aviso nao-bloqueante

**Plano:** 04 — Extras (Could Have — cortavel)
**Sizing:** 1.5h
**Depende de:** Nenhuma (primeira fase deste plano) — pre-requisito externo: Plano 01 fase-01/02/03 concluidos
**Visual:** false

---

## O que esta fase entrega

`PRD.md` aceita campo opcional `requires: [outro-slug]` no frontmatter YAML. `plan-feature` parseia o
campo. `execute-plan`, ao iniciar um PRD com `requires:`, verifica status de cada dependencia lendo
`STATE.md` das pastas correspondentes; se alguma NAO estiver `completed`, mostra AVISO claro com
status atual mas permite prosseguir apos confirmacao do dev. Satisfaz **RF8** e **CA-11**.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/write-prd/templates/prd-template.md` | Modify | Adicionar bloco frontmatter YAML no topo com `requires: []` comentado (opcional) |
| `anti-vibe-coding/skills/plan-feature/SKILL.md` | Modify | No Step 1 (apos ler PRD), parsear frontmatter e extrair `requires:` — normalizar string/array |
| `anti-vibe-coding/skills/execute-plan/SKILL.md` | Modify | Novo sub-step apos Step 1 (antes do Step 3 "Confirmar com dev"): `check-requires` le frontmatter do PRD da pasta, verifica STATE.md de cada dependencia, AVISA se alguma nao `completed` |

---

## Implementacao

### Passo 1: Adicionar frontmatter YAML ao `prd-template.md`

O template atual nao tem frontmatter — comeca direto com `# PRD: {Feature Name}`. Adicionar bloco
YAML no topo (G11 do README). Manter compatibilidade: `requires:` eh opcional, array vazio por default.

```markdown
---
# Metadados opcionais do PRD (formato YAML).
# `requires:` lista PRDs que devem estar completos antes deste.
# Aceita string unica (`requires: auth`) ou array (`requires: [auth, billing]`).
# Pode referenciar slug curto (`auth`) ou pasta completa (`2026-04-20-auth`).
# Se ausente ou vazio, nenhuma verificacao eh feita.
requires: []
---

# PRD: {Feature Name}

**Status:** Draft
...
```

Observacao: o frontmatter eh **comentado por default** no template (o campo `requires: []` fica
visivel mas nao ativo), sinalizando que eh opcional.

### Passo 2: Parser de frontmatter em `plan-feature/SKILL.md`

No **Step 1 (Ler PRD)**, apos `Read` do PRD.md, extrair frontmatter se presente. Pseudo-codigo
inline na skill (nao criar arquivo de lib separado — parse simples, nao merece extracao).

```
Apos Read do PRD.md:

1. Se o conteudo comeca com `---\n`:
   - Extrair bloco entre primeiro `---` e segundo `---`
   - Parsear linha por linha: `chave: valor`
   - Procurar por linha iniciada com `requires:`
   - Se encontrada:
     - Se valor comeca com `[`: split por virgula, trim brackets e espacos, lista
     - Se valor eh string simples: colocar em lista de 1 elemento
     - Se valor eh `[]` ou vazio: lista vazia
   - Se nao encontrada OU bloco ausente: requires = []

2. Armazenar no contexto local da skill: `prd_requires = [...]`

3. Prosseguir normalmente para Step 2 (Explorar Codebase)
```

Esta fase NAO faz nada com `prd_requires` alem de armazenar — fase-02 (deteccao de ciclos) eh quem
vai usar. Aqui basta garantir que o parser funciona.

### Passo 3: Verificacao em `execute-plan/SKILL.md`

Adicionar novo sub-step **Step 2.5 — Verificar Requires** entre Step 2 (ler STATE.md global) e Step 3
(confirmar com dev). Fica DENTRO da pasta ativa do PRD.

```
Step 2.5 — Verificar Requires (novo)

1. Ler PRD.md da pasta ativa
2. Extrair frontmatter (mesmo parser da fase-01 de plan-feature — reusar logica inline)
3. Se `requires:` vazio ou ausente: pular este step, prosseguir para Step 3
4. Para cada dependencia em `requires:`:
   a. Resolver para pasta:
      - Se valor eh pasta exata (`2026-04-20-auth`): usar diretamente
      - Se eh slug (`auth`): glob `.planning/YYYY-MM-DD-*-auth/` (sufixo) + `.planning/_archive/YYYY-MM-DD-*-auth/`
      - Se nao encontrou: status = "nao encontrado" (G9)
      - Se mais de 1 pasta bate: status = "ambiguo" (listar pastas encontradas)
   b. Se resolveu: ler `STATE.md` da pasta encontrada, extrair campo `Phase:`
      - Mapear para status (`planned` / `in-progress` / `paused` / `completed`)
5. Montar lista de avisos para as dependencias NAO `completed` ou nao-encontradas:

   "AVISO: Dependencias nao concluidas:
     - {slug1}: {status} (em {pasta})
     - {slug2}: nao encontrado
     - {slug3}: ambiguo (2 pastas: X, Y)

   Este PRD declara `requires:` em seu frontmatter. Prosseguir mesmo assim?"

6. AskUserQuestion:
   - "Prosseguir (aceito o risco)"
   - "Cancelar e resolver dependencias primeiro"
7. Se dev cancela: encerrar skill com mensagem "Execucao cancelada. Conclua as dependencias e rode /execute-plan novamente."
8. Se dev prossegue: registrar decisao no Log do STATE.md ("Aviso de requires aceito pelo dev em {data}")
```

Importante (G6): aviso NUNCA bloqueia automaticamente. Eh sempre pergunta ao dev.

### Passo 4: Dogfooding manual

Preparar fixture de teste em `.planning-test/`:

```
.planning-test/
├── 2026-04-20-auth/
│   ├── PRD.md                  (sem frontmatter requires — legacy)
│   └── STATE.md                (Phase: in-progress)
├── 2026-04-21-dashboard/
│   ├── PRD.md                  (frontmatter: requires: [auth])
│   └── STATE.md                (Phase: planned)
└── 2026-04-22-relatorio/
    ├── PRD.md                  (frontmatter: requires: [auth, dashboard])
    └── STATE.md                (Phase: planned)
```

Cenarios a verificar manualmente:
1. Rodar mental/simular `/execute-plan` apontando para `2026-04-21-dashboard/`
   - Esperado: aviso que `auth` esta `in-progress`, pergunta se prossegue
2. Rodar `/execute-plan` em `2026-04-22-relatorio/`
   - Esperado: aviso com 2 dependencias listadas (`auth: in-progress`, `dashboard: planned`)
3. Rodar `/execute-plan` em `2026-04-20-auth/` (sem requires)
   - Esperado: comportamento normal, sem aviso

---

## Gotchas

- **G1 do plano (D11 — opcional):** Ausencia de `requires:` no frontmatter NAO eh erro. Parser
  trata como lista vazia silenciosamente.
- **G2 do plano (flexibilidade YAML):** Normalizar string vs array no parser. Caso do Passo 2.
- **G3 do plano (slug OU pasta):** Logica de resolucao no Passo 3 linha 4a. Ambiguidade eh avisada.
- **G9 do plano (dangling):** Referencia para pasta inexistente eh aviso especifico, nao crash.
- **G11 do plano (PRD legacy sem frontmatter):** Parser trata comeco do arquivo sem `---\n` como
  "sem frontmatter" e retorna `requires = []`. Nao explode em PRDs antigos.
- **Local (leitura de STATE.md):** Campo `**Phase:**` no STATE.md eh texto em negrito markdown.
  Parse simples: regex linha que contem `Phase:` e extrair valor apos os dois pontos. Trim espacos.
- **Local (reuso do parser):** Mesma logica de parse inline em `plan-feature` e `execute-plan`.
  Se ficar ruim duplicar, considerar extrair para `skills/lib/prd-frontmatter-parser.md` — mas eh
  pequeno o suficiente para duplicar sem dor (nao super-engenheirar).

---

## Verificacao

### TDD

Este projeto nao tem test framework (veja README do plano). Verificacao eh dogfooding manual.

- [ ] **RED manual:** Sem a alteracao, rodar `/execute-plan` com PRD que tem `requires: [auth]`
  em fixture — skill IGNORA o campo (comportamento atual)
- [ ] **GREEN:** Com a alteracao, skill detecta o campo, verifica `STATE.md` de `auth`, mostra
  aviso se `auth` nao `completed`

### Checklist

- [ ] `prd-template.md` atualizado com bloco frontmatter YAML comentado no topo
- [ ] `plan-feature/SKILL.md` Step 1 parseia frontmatter quando presente
- [ ] `plan-feature/SKILL.md` armazena `prd_requires` no contexto da skill (nao faz nada com ele ainda)
- [ ] `execute-plan/SKILL.md` tem novo Step 2.5 com verificacao e AskUserQuestion
- [ ] PRD sem frontmatter ainda funciona (legacy preservado — G11)
- [ ] PRD com `requires:` string unica funciona (G2)
- [ ] PRD com `requires: []` array funciona (G2)
- [ ] Dependencia `completed` NAO dispara aviso
- [ ] Dependencia `in-progress` / `planned` / `paused` dispara aviso listando status
- [ ] Dependencia nao encontrada dispara aviso "nao encontrado" (G9)
- [ ] Dependencia ambigua dispara aviso "ambiguo" com pastas encontradas (G3)
- [ ] Aviso eh sempre pergunta (AskUserQuestion), nunca bloqueio automatico
- [ ] Decisao de prosseguir fica registrada no Log do STATE.md

---

## Criterio de Aceite

**Por humano (dogfooding):**
- Dado um PRD-B com frontmatter `requires: [PRD-A]` e PRD-A com `Phase: in-progress`, quando
  rodar `/execute-plan` em PRD-B, entao a skill mostra aviso com "PRD-A: in-progress" e pergunta
  se deve prosseguir (CA-11 do PRD).
- Dado um PRD sem campo `requires:`, quando rodar `/execute-plan`, entao nenhum aviso adicional
  aparece (comportamento atual preservado).
- Dado um PRD com `requires: [foo]` onde `foo` nao existe, quando rodar `/execute-plan`, entao
  aviso especifico "foo: nao encontrado" aparece — mas NAO bloqueia.

**Por maquina:**
- Grep em `execute-plan/SKILL.md` encontra string "Step 2.5" ou "Verificar Requires"
- Grep em `plan-feature/SKILL.md` encontra string "requires" no Step 1
- `prd-template.md` comeca com bloco `---\nrequires: []\n---`

---

<!-- Gerado por /plan-feature em 2026-04-20 -->
