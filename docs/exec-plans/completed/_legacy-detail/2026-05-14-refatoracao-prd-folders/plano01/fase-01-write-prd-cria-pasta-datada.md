# Fase 01: write-prd cria pasta datada (TRACER BULLET)

**Plano:** 01 — Nova estrutura (fundacao + tracer bullet)
**Sizing:** 1h
**Depende de:** Nenhuma (primeira fase, tracer bullet do plano inteiro)
**Visual:** false

---

## O que esta fase entrega

`/write-prd` deixa de salvar `.planning/PRD-{slug}.md` na raiz e passa a criar `.planning/YYYY-MM-DD-{slug}/PRD.md` — pasta datada greenfield com o PRD nu dentro.

Este eh o **tracer bullet** da refatoracao inteira: o slice mais fino que prova a nova arquitetura end-to-end. Se este fluxo funciona (input: descricao da feature → output: pasta datada com PRD dentro), tudo mais eh incremento.

Escopo desta fase eh ESTRITO: apenas criacao da pasta + gravacao do `PRD.md` greenfield. NAO trata:
- Movimentacao do `CONTEXT.md` do `grill-me` (fase-04)
- Deteccao de legacy (Plano 02)
- Colisao de nome no mesmo dia → v2 (Plano 03, fase-02) — nesta fase, apenas FALHAR com mensagem clara se a pasta ja existir
- `requires:` no frontmatter (fase-05 atualiza o template)

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/write-prd/SKILL.md` | Modify | Reescrever **Step 5 — Salvar PRD** para criar pasta datada em vez de arquivo solto |

Nenhum outro arquivo eh tocado nesta fase.

---

## Implementacao

### Passo 1: Localizar o Step 5 atual no SKILL.md

Arquivo `anti-vibe-coding/skills/write-prd/SKILL.md`, linhas ~162-179 (Step 5 — Salvar PRD). O bloco atual cria `.planning/PRD-{feature-name-kebab}.md` solto na raiz.

### Passo 2: Reescrever Step 5 com logica de pasta datada

Substituir o corpo do Step 5 pela nova logica. Pseudo-codigo de referencia:

```
Step 5 — Salvar PRD (nova logica)

1. Garantir que .planning/ existe
2. Derivar slug: kebab-case do nome da feature (ex: "sistema-notificacoes-push")
3. Derivar data: YYYY-MM-DD no fuso do sistema (Date.now() ou equivalente)
4. Montar nome canonico da pasta: `YYYY-MM-DD-{slug}`
5. Caminho alvo: `.planning/{YYYY-MM-DD-{slug}}/`
6. Verificar se a pasta JA existe:
   - Se existe:
     - Informar: "Ja existe a pasta `.planning/{YYYY-MM-DD-{slug}}/`.
       Colisao de nome sera tratada em versao futura (Plano 03 — conflito mesmo-dia → v2).
       Por enquanto, interrompendo para evitar sobrescrita."
     - Encerrar sem escrever. (NAO sobrescrever.)
   - Se NAO existe:
     - Criar a pasta
     - Escrever `PRD.md` (nu) dentro, usando o conteudo ja aprovado pelo dev nos Steps 3-4
7. Informar ao dev: "PRD salvo em `.planning/{YYYY-MM-DD-{slug}}/PRD.md`"
8. NAO mexer em .planning/CONTEXT-*.md ainda (fase-04)
```

Snippet ilustrativo do bloco a substituir na SKILL.md (Step 5):

```markdown
## Step 5 — Salvar PRD

1. Criar diretorio `.planning/` se nao existir
2. Derivar:
   - `slug` = kebab-case do nome da feature
   - `date` = YYYY-MM-DD atual
   - `folder` = `.planning/{date}-{slug}/`
3. Se `{folder}` ja existir:
   - Informar ao dev: "Pasta ja existe. Tratamento de v2 sera feito no Plano 03."
   - Encerrar sem sobrescrever.
4. Se NAO existir:
   - Criar `{folder}`
   - Escrever `{folder}/PRD.md` com Write (arquivo nu, sem prefixo)
5. Informar: "PRD salvo em `{folder}/PRD.md`. Voce pode editar diretamente se precisar ajustar."
6. NOTA: o CONTEXT.md do /grill-me (se existir em `.planning/CONTEXT-{slug}.md`) sera movido para dentro da pasta em versao futura (fase-04 do Plano 01).

Se ja existir PRD em `.planning/` na estrutura legacy (PRD-*.md solto):
  - Nao interferir. A deteccao e migracao de legacy eh responsabilidade do Plano 02.
```

### Passo 3: Ajustar Step 7 — Proximo Passo

Atualizar referencias de caminho nas sugestoes de proximo passo. O texto atual menciona `.planning/PRD-{name}.md`; trocar por `.planning/{date}-{slug}/PRD.md`.

Especificamente, no Step 7 da SKILL.md (linha ~217):

```
| Dev quer parar | "Ok. PRD salvo em `.planning/{date}-{slug}/PRD.md`. Retome com /plan-feature quando quiser." |
```

### Passo 4: Ajustar secao "Pipeline Integration → 1. Salvar PRD"

Linhas ~232-233 mencionam salvar em `.planning/PRD.md`. Atualizar para:

```
### 1. Salvar PRD
Ao finalizar o PRD gerado e aprovado pelo dev, salvar em `.planning/{YYYY-MM-DD-{slug}}/PRD.md`.
```

E na secao "2. Sugerir Proximo Passo":

```
> "PRD salvo em `.planning/{date}-{slug}/PRD.md`.
>
> Quer prosseguir para `/plan-feature`? Ele vai quebrar este PRD em planos e fases de execucao."
```

---

## Gotchas

- **G1 do plano (D1):** Nome da pasta eh `YYYY-MM-DD-{slug-kebab}/`. NAO usar underscore, nao usar CamelCase. Slug eh a feature em kebab-case (mesma logica que ja eh usada hoje para `PRD-{slug}.md`).
- **G2 do plano (D2):** Arquivo eh `PRD.md` NU — sem prefixo, sem sufixo. A pasta ja eh o contexto.
- **G6 do plano (D9):** Se a pasta ja existir, FALHAR com mensagem explicita. NAO sobrescrever. O tratamento de "atualizar ou criar v2?" eh Plano 03 fase-02 — nao ANTECIPE isso aqui.
- **G8 do plano:** Se `.planning/` tem legacy (`PRD-sistema-antigo.md` solto), a skill deve IGNORAR (nao migrar automaticamente). Plano 02 adiciona a deteccao e o hook de migracao; nesta fase, simplesmente prosseguir criando a nova pasta.
- **Local:** A deteccao atual "Se ja existir PRD em .planning/" (SKILL.md linha ~174-179) atualmente pergunta "atualizar ou criar v2?". Esse comportamento assume `PRD-*.md` solto na raiz. Com a nova logica, esse caminho nao dispara mais para PRDs criados pela nova versao, pois nao havera mais arquivos soltos. A verificacao de colisao agora eh por PASTA (passo 2 acima), nao por arquivo solto. Deixar o bloco antigo documentado como "path legacy — Plano 02 trata migracao".
- **Local:** O template do `PRD.md` (`anti-vibe-coding/skills/write-prd/templates/prd-template.md`) NAO precisa mudar nesta fase — o conteudo do PRD eh o mesmo; so o LOCAL e o NOME mudam. A adicao de frontmatter com `requires:` eh a fase-05.

---

## Verificacao

### Dogfooding manual (substitui TDD — projeto nao tem test framework)

- [ ] **RED manual:** Antes de mudar, rodar `/anti-vibe-coding:write-prd "feature-tracer-teste"` em um repo limpo e CONFIRMAR que atualmente o arquivo sai como `.planning/PRD-feature-tracer-teste.md` solto.
- [ ] **GREEN:** Aplicar a mudanca no SKILL.md conforme Passos 1-4.
- [ ] **VERIFY 1 (feliz):** Rodar `/anti-vibe-coding:write-prd "feature-tracer-teste-v2"` em repo limpo. Confirmar que:
  - `.planning/YYYY-MM-DD-feature-tracer-teste-v2/` foi criada (YYYY-MM-DD = hoje)
  - Dentro dela existe `PRD.md` (nu, sem prefixo)
  - NENHUM arquivo `PRD-*.md` ficou solto em `.planning/`
- [ ] **VERIFY 2 (colisao):** Rodar o mesmo comando DE NOVO (mesma data, mesmo slug). Confirmar que:
  - Skill responde com mensagem de colisao
  - NAO sobrescreveu o `PRD.md` existente
  - NAO criou `PRD-v2.md` nem `-v2/` (tratamento v2 eh Plano 03)

### Checklist

- [ ] `Step 5` em `write-prd/SKILL.md` reescrito com logica de pasta datada
- [ ] `Step 7` atualiza referencias de caminho para novo formato
- [ ] `Pipeline Integration` secoes 1 e 2 atualizadas
- [ ] Mensagem de colisao eh clara e NAO sobrescreve
- [ ] PRD continua sendo gerado com todo o conteudo dos Steps 1-4 (solucao, MoSCoW, criterios de aceite etc) — so o destino mudou
- [ ] Deletar pasta de teste apos validar (`rm -rf .planning/YYYY-MM-DD-feature-tracer-teste-v2/`)

---

## Criterio de Aceite

**Por maquina / filesystem:**
- Apos rodar `/write-prd "feature-x"` em `.planning/` vazio:
  - Comando `ls .planning/` mostra APENAS `YYYY-MM-DD-feature-x/` (alem de eventuais arquivos pre-existentes nao relacionados).
  - Comando `ls .planning/YYYY-MM-DD-feature-x/` mostra `PRD.md`.
  - Comando `cat .planning/YYYY-MM-DD-feature-x/PRD.md` retorna o PRD completo conforme Steps 1-4.

**Por humano:**
- Dev que leu apenas o nome da pasta consegue identificar data e feature sem abrir nada.
- Atende CA-01 do PRD: "Dado um projeto sem `.planning/`, quando o dev rodar `/write-prd 'feature X'`, entao eh criada a pasta `.planning/YYYY-MM-DD-feature-x/` contendo `PRD.md` nu, e nenhum arquivo `PRD-*.md` aparece na raiz de `.planning/`."

---

<!-- Gerado por /anti-vibe-coding:plan-feature em 2026-04-20 -->
