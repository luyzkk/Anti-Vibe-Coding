# Fase 04: write-prd move CONTEXT.md para dentro da pasta

**Plano:** 01 — Nova estrutura (fundacao + tracer bullet)
**Sizing:** 1h
**Depende de:** fase-01 (precisa da pasta datada criada antes de mover CONTEXT para dentro)
**Visual:** false
**Independente de:** fase-02, fase-03 (pode rodar em paralelo com elas — toca em arquivo e Step diferentes do SKILL.md)

---

## O que esta fase entrega

`/write-prd` passa a MOVER `.planning/CONTEXT-{slug}.md` (gerado pelo `grill-me`) para dentro da pasta datada recem-criada como `CONTEXT.md` (nu). Trata o caso R2: slug do CONTEXT pode diferir do slug final da pasta — nesse caso, pedir confirmacao/renomear antes de mover.

Atende RF4, CA-06 do PRD, e mitiga R2.

Escopo NAO inclui:
- CONTEXT.md DENTRO da pasta ja eh lido — o fluxo atual do `write-prd` Step 1 Caminho A ja le `.planning/CONTEXT-*.md`. Esta fase so se preocupa com MOVIMENTACAO final (apos PRD salvo).
- Se `grill-me` mudar para criar pasta direto — nao acontece (D6 eh explicita: grill-me permanece standalone).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/write-prd/SKILL.md` | Modify | Adicionar logica de movimentacao do CONTEXT ao final do **Step 5 — Salvar PRD** (apos pasta e PRD criados) |

---

## Implementacao

### Passo 1: Adicionar sub-step no Step 5

Apos o Step 5 atualizado pela fase-01 (que ja criou `.planning/YYYY-MM-DD-{slug}/PRD.md`), adicionar sub-step "5.5 — Mover CONTEXT (se existir)":

```
### 5.5 — Mover CONTEXT do /grill-me para dentro da pasta

1. Glob `.planning/CONTEXT-*.md` na raiz de `.planning/`
2. Se 0 matches: nao fazer nada (dev nao usou /grill-me — prosseguir)
3. Se 1+ matches, para cada CONTEXT encontrado:
   a. Extrair slug do nome: `CONTEXT-{slug-do-grill}.md` → `{slug-do-grill}`
   b. Comparar com slug da pasta recem-criada (`{slug-da-pasta}`)
   c. Se `{slug-do-grill}` == `{slug-da-pasta}`:
      - Mover com `mv .planning/CONTEXT-{slug}.md → .planning/{YYYY-MM-DD-slug}/CONTEXT.md`
      - Informar: "CONTEXT.md do /grill-me movido para dentro da pasta."
   d. Se `{slug-do-grill}` != `{slug-da-pasta}`:
      - Esta eh a colisao R2. Perguntar ao dev via AskUserQuestion:
        "Encontrei `.planning/CONTEXT-{slug-do-grill}.md` mas a pasta do PRD eh `{slug-da-pasta}`.
         Opcoes:
         [a] Este CONTEXT eh deste PRD — renomear e mover para `{pasta}/CONTEXT.md`
         [b] Este CONTEXT eh de OUTRO PRD — deixar em paz
         [c] Nao sei — deixar em paz"
      - Se [a]: mover e renomear
      - Se [b] ou [c]: nao mover, prosseguir
4. Se 2+ matches com MESMO slug da pasta (improvavel mas possivel): pegar o mais recente por mtime e perguntar sobre os outros
5. Nunca FALHAR a skill se nao conseguir mover — logar e prosseguir (o PRD ja foi salvo, mover CONTEXT eh oportunistic)
```

### Passo 2: Atualizar Step 1 — Caminho A (Importar do /grill-me)

Arquivo `SKILL.md`, linhas ~22-34. O caminho A atual busca `.planning/CONTEXT-*.md` e informa "Importei contexto". Manter o comportamento mas adicionar nota de que o CONTEXT sera MOVIDO no final (Step 5.5):

```
3. Prosseguir para Step 2
   NOTA: Ao final (Step 5.5), o arquivo CONTEXT-{slug}.md sera movido para dentro
   da pasta do PRD como CONTEXT.md. A referencia dentro do PRD.md ja deve apontar
   para `./CONTEXT.md` (caminho relativo).
```

Ajustar o campo **Context** do `prd-template.md` para refletir caminho final — na verdade, a referencia no PRD fica mais limpa: `**Context:** ./CONTEXT.md` (caminho relativo, que so eh valido apos o mv). Essa atualizacao de texto ocorre na fase-05 (templates), aqui apenas garantir consistencia.

### Passo 3: Guardar auditoria da movimentacao

Registrar a movimentacao em stdout para o dev ver:

```
Exemplo de output final da skill:
  PRD salvo em `.planning/2026-04-20-sistema-notificacoes/PRD.md`
  CONTEXT movido de `.planning/CONTEXT-sistema-notificacoes.md` para `.planning/2026-04-20-sistema-notificacoes/CONTEXT.md`
```

Se houve renomeacao por colisao de slug (caminho d acima):

```
  CONTEXT renomeado e movido:
    .planning/CONTEXT-antigo-slug.md → .planning/2026-04-20-novo-slug/CONTEXT.md
```

### Passo 4: Atualizar Pipeline Integration — Step 0

Arquivo `SKILL.md`, linhas ~223-231. Atualmente diz "Antes de iniciar o PRD, verificar se `.planning/CONTEXT.md` existe". Corrigir para o padrao real (`.planning/CONTEXT-*.md`) e adicionar nota do mv final:

```
### 0. Importar Contexto (se disponivel)

Antes de iniciar o PRD, verificar se `.planning/CONTEXT-*.md` existe na raiz de `.planning/`:

- Se existir: importar conteudo para pre-preencher PRD.
- Ao final (Step 5.5), este arquivo sera MOVIDO para dentro da pasta do PRD
  como `CONTEXT.md` (sem prefixo). A partir dai, a raiz de `.planning/`
  nao tem mais arquivos CONTEXT-* soltos.
- Se slug do CONTEXT nao bater com slug final da pasta: perguntar ao dev (mitigacao R2).
```

---

## Gotchas

- **G4 do plano (D6):** `grill-me` eh standalone e continua criando `.planning/CONTEXT-{slug}.md` na raiz. NAO mudar isso. Quem move eh o `write-prd`.
- **G5 do plano (R2) critico:** Slug do `grill-me` pode diferir do slug final. Exemplo real: dev roda `/grill-me` pensando em "sistema de notificacoes push", CONTEXT sai como `CONTEXT-sistema-notificacoes-push.md`. Na entrevista do `write-prd`, dev decide nomear como "notificacoes" — pasta sai `2026-04-20-notificacoes/`. Os slugs nao batem. A skill deve DETECTAR isso e perguntar.
- **Local:** Nao fazer merge automatico. Se houver 2 CONTEXTs soltos na raiz com slugs diferentes, perguntar sobre cada um.
- **Local:** Operacao de mv deve ser ATOMICA: se falhar (ex: permissao), NAO deixar estado meia-boca. Logar erro, manter CONTEXT na raiz, PRD.md ja salvo fica valido.
- **Local:** Se a fase-01 falhou ao criar a pasta (ex: colisao de nome), esta logica NAO deve rodar — soh move CONTEXT apos confirmar que a pasta existe e o PRD.md foi gravado.
- **Local:** Apos o mv, a referencia **Context:** no frontmatter do PRD.md fica errada se apontava para caminho absoluto `.planning/CONTEXT-{slug}.md`. A fase-05 atualiza o `prd-template.md` para usar `./CONTEXT.md` (relativo), mas se o PRD ja foi escrito com caminho absoluto nos Steps 3-4, o `write-prd` DEVE fazer um find-and-replace no PRD.md apos o mv para corrigir a referencia.

---

## Verificacao

### Dogfooding manual

- [ ] **Setup (cenario feliz):** Garantir fase-01 aplicada. Criar `.planning/CONTEXT-teste-move.md` manualmente com conteudo minimo valido (frontmatter + slug: teste-move).
- [ ] **VERIFY 1 (slugs batem):** Rodar `/write-prd` e nomear a feature como `teste-move`. Confirmar:
  - Pasta `YYYY-MM-DD-teste-move/` criada
  - `PRD.md` dentro
  - `.planning/CONTEXT-teste-move.md` NAO existe mais na raiz
  - `.planning/YYYY-MM-DD-teste-move/CONTEXT.md` existe com conteudo do CONTEXT original
- [ ] **VERIFY 2 (slugs diferem — R2):** Criar `.planning/CONTEXT-slug-antigo.md`. Rodar `/write-prd` e nomear como `slug-novo`. Confirmar:
  - Skill PERGUNTA ao dev sobre o CONTEXT orfao
  - Se dev escolhe [a] (este CONTEXT eh deste PRD): arquivo sai como `.planning/YYYY-MM-DD-slug-novo/CONTEXT.md`, raiz limpa
  - Se dev escolhe [b] (outro PRD): CONTEXT permanece em `.planning/CONTEXT-slug-antigo.md`, pasta do novo PRD NAO tem CONTEXT.md
- [ ] **VERIFY 3 (sem CONTEXT):** Com `.planning/` so tendo a pasta recem-criada pelo fase-01, rodar `/write-prd` normalmente. Confirmar que nao ha tentativa de mv e nenhuma mensagem de erro.
- [ ] **VERIFY 4 (2 CONTEXTs soltos):** Criar CONTEXT-a.md e CONTEXT-b.md na raiz. Rodar `/write-prd` com feature `a`. Confirmar:
  - CONTEXT-a.md movido para `YYYY-MM-DD-a/CONTEXT.md`
  - CONTEXT-b.md continua na raiz intocado
- [ ] **Cleanup:** Remover pastas e CONTEXTs de teste.

### Checklist

- [ ] Step 5.5 adicionado com logica completa
- [ ] Colisao de slug (R2) tratada com AskUserQuestion
- [ ] Movimentacao eh log clara para o dev
- [ ] Falha no mv nao derruba a skill (PRD.md ja foi salvo)
- [ ] Step 1 Caminho A e Pipeline Integration Step 0 atualizados com nota do mv final
- [ ] Referencia **Context:** no PRD.md apos mv aponta para `./CONTEXT.md` relativo (ou fica preparado para a fase-05 ajustar o template)
- [ ] `.planning/` nao tem mais `CONTEXT-*.md` solto apos sucesso

---

## Criterio de Aceite

**Por maquina / filesystem:**
- Atende CA-06: apos rodar o fluxo feliz `/grill-me "feat"` (gera `CONTEXT-feat.md` na raiz) + `/write-prd` (pasta `YYYY-MM-DD-feat/`):
  - `ls .planning/` NAO mostra `CONTEXT-feat.md`
  - `ls .planning/YYYY-MM-DD-feat/` mostra `CONTEXT.md` (alem do PRD.md da fase-01)
  - `diff` entre CONTEXT original e o movido eh zero (conteudo preservado)

**Por humano:**
- Mitigacao explicita de R2 (slug CONTEXT != slug pasta) com UX clara
- Dev que usa `/grill-me + /write-prd` sequencialmente no mesmo dia obtem pasta completa sem artefatos soltos

---

<!-- Gerado por /anti-vibe-coding:plan-feature em 2026-04-20 -->
