# Fase 02: plan-feature opera dentro da pasta datada

**Plano:** 01 — Nova estrutura (fundacao + tracer bullet)
**Sizing:** 1.5h
**Depende de:** fase-01 (precisa da pasta datada com `PRD.md` nu para ler)
**Visual:** false

---

## O que esta fase entrega

`/plan-feature` deixa de procurar `.planning/PRD-*.md` solto e passa a operar dentro de `.planning/YYYY-MM-DD-{slug}/`: le `PRD.md` de dentro, salva `PLAN.md`, `STATE.md` e subpastas `planoNN/` todos dentro da mesma pasta.

Apos esta fase, o fluxo `write-prd → plan-feature` funciona end-to-end contido em uma unica pasta por feature (atende CA-02 do PRD).

Escopo NAO inclui:
- Deteccao de legacy (`PRD-*.md` solto) — Plano 02
- Descoberta interativa multi-PRD (`plan-feature` sem argumento quando ha varios PRDs) — Plano 03, fase-01
- Geracao de `MEMORY.md` consolidado no nivel do PRD — Plano 03, fase-04

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/plan-feature/SKILL.md` | Modify | Reescrever **Step 1 (Caminho B)** e **Step 8 (Salvar Overview e Criar Estrutura)** e **Step 9 (Gerar Planos Detalhados)** para operar dentro da pasta datada |

---

## Implementacao

### Passo 1: Reescrever Step 1 — Ler PRD (Caminho B)

Arquivo `anti-vibe-coding/skills/plan-feature/SKILL.md`, linhas ~54-62 (Caminho B: Buscar em .planning/).

Logica atual busca `PRD-*.md` solto. Nova logica:

```
### Caminho B: Buscar em pasta datada

1. Se nao forneceu caminho:
   - Glob: ".planning/*/PRD.md" (pastas datadas com PRD nu dentro)
   - Filtrar: pastas que batem com padrao `YYYY-MM-DD-*` (ignorar _archive/ e qualquer outra coisa)
   - Se 1 match: ler diretamente, confirmar: "Encontrei PRD em `.planning/{pasta}/PRD.md`. Vou planejar com base nele."
   - Se mais de 1: listar pastas com data+slug e perguntar qual usar (descoberta multi-PRD completa eh Plano 03 — aqui basta listar)
   - IMPORTANTE: guardar o caminho da PASTA ATIVA — todos os outputs vao dentro dela
2. Prosseguir para Step 2
```

Manter Caminho A (caminho fornecido como argumento) mas aceitar AGORA DOIS formatos:
- Caminho de arquivo: `/plan-feature ".planning/2026-04-20-slug/PRD.md"` → pasta ativa = diretorio pai
- Caminho de pasta: `/plan-feature ".planning/2026-04-20-slug/"` → pasta ativa = a propria pasta, busca `PRD.md` dentro

### Passo 2: Definir variavel "PASTA ATIVA" usada em todos os outputs

Adicionar nota no topo do Step 1:

```
NOTA: Apos identificar o PRD, a skill fixa a PASTA ATIVA = diretorio que contem `PRD.md`.
TODOS os artefatos gerados por esta skill (PLAN.md, STATE.md, planoNN/) sao escritos
dentro de PASTA_ATIVA. Nunca na raiz de `.planning/`.
```

### Passo 3: Reescrever Step 8 — Salvar Overview e Criar Estrutura

Arquivo `SKILL.md`, linhas ~358-366. Logica atual escreve `PLAN-{feature}.md` e `STATE-{feature}.md` na raiz de `.planning/`. Nova logica:

```
## Step 8 — Salvar Overview e Criar Estrutura

1. PASTA_ATIVA ja definida no Step 1 (ex: `.planning/2026-04-20-sistema-notificacoes/`)
2. Salvar overview em `{PASTA_ATIVA}/PLAN.md` (nu, sem prefixo)
   - Se ja existir: perguntar "Substituir ou cancelar?" (nota: colisao de v2 nao se aplica aqui — ja estamos DENTRO da pasta do PRD)
3. Criar `{PASTA_ATIVA}/STATE.md` (tracking global LOCAL a este PRD) usando `templates/state-template.md`
   - STATE.md nu, sem prefixo
4. Confirmar: "Overview salvo em `{PASTA_ATIVA}/PLAN.md`. STATE em `{PASTA_ATIVA}/STATE.md`. Pronto para criar o Plano 1."
```

### Passo 4: Reescrever Step 9 — Gerar Planos Detalhados

Arquivo `SKILL.md`, linhas ~370-418. Os caminhos dos subagentes mencionam `.planning/plano{NN}/` (raiz). Nova logica:

```
GERA (dentro de PASTA_ATIVA):
- `{PASTA_ATIVA}/plano{NN}/README.md`
- `{PASTA_ATIVA}/plano{NN}/MEMORY.md`
- `{PASTA_ATIVA}/plano{NN}/fase-01-{nome}.md`
- `{PASTA_ATIVA}/plano{NN}/fase-02-{nome}.md`
- ...
```

Instrucao que o orchestrador passa ao subagente deve INCLUIR o caminho absoluto de PASTA_ATIVA (nao apenas `.planning/plano{NN}/`).

Snippet do bloco que o subagente recebe:

```
RECEBE:
- Caminho de PASTA_ATIVA: `{caminho absoluto}`
- Todos os outputs DEVEM ser escritos em `{PASTA_ATIVA}/plano{NN}/...`
- Se escrever fora de PASTA_ATIVA, a fase eh invalida
- PRD completo (lido de `{PASTA_ATIVA}/PRD.md`)
- Contexto de codebase (Step 2)
- PLAN overview (de `{PASTA_ATIVA}/PLAN.md`)
- Descricao do plano a detalhar
- Templates (caminhos do plugin — inalterados)
```

### Passo 5: Atualizar exemplo de estrutura no topo do SKILL.md

SKILL.md linhas ~21-38 mostram estrutura antiga (`.planning/PLAN-{feature}.md`, `.planning/plano01/`). Substituir por:

```
Estrutura gerada (dentro da pasta datada do PRD):

.planning/
└── 2026-04-20-{feature-slug}/        ← criada pelo /write-prd
    ├── PRD.md                        ← ja existe
    ├── PLAN.md                       ← gerado aqui (overview)
    ├── STATE.md                      ← gerado aqui (tracking global)
    │
    ├── plano01/
    │   ├── README.md                 ← overview do plano
    │   ├── MEMORY.md                 ← memoria viva (bugs, learnings)
    │   ├── fase-01-{nome}.md         ← task detalhada
    │   └── fase-02-{nome}.md
    │
    └── plano02/ ...
```

### Passo 6: Atualizar Pipeline Integration (Step 0 e Step 2)

SKILL.md linhas ~468-486 mencionam `.planning/PRD.md` e `.planning/PLAN-{feature}.md`. Substituir por caminhos relativos a PASTA_ATIVA.

---

## Gotchas

- **G1 do plano (D1) herdado:** Pasta segue formato `YYYY-MM-DD-{slug}/`. O glob deve filtrar por esse padrao para nao capturar pastas legacy (`plano01/` solto) nem `_archive/`.
- **G2 do plano (D2) herdado:** Todos os arquivos DENTRO sao nus — `PLAN.md` nao `PLAN-{slug}.md`. Se alguem editar o SKILL.md no futuro e re-adicionar prefixo, isso REINTRODUZ o problema.
- **G3 do plano (D3) herdado:** `STATE.md` eh LOCAL a esta pasta. Isso eh o que permite paralelismo entre features sem lock global — nao centralizar STATE em lugar nenhum.
- **G8 do plano:** Se o Glob encontrar ZERO pastas datadas mas existir `PRD-*.md` solto na raiz, NAO migrar aqui — apenas informar "Nao encontrei PRD em pasta datada. Existe estrutura legacy em `.planning/`? A migracao sera oferecida no Plano 02." e seguir o Caminho C (pedir criar com `/write-prd`).
- **Local:** Se o dev passar argumento apontando para arquivo dentro de `_archive/` (ex: `.planning/_archive/2026-01-10-auth/PRD.md`), a skill deve RECUSAR com mensagem "Este PRD esta arquivado. Mova para fora de `_archive/` se quiser re-planejar.". Arquivamento eh Plano 03 fase-03, mas a salvaguarda de leitura vive aqui.
- **Local:** O Step 9 gera subagentes em paralelo/sequencial para cada plano. Cada subagente PRECISA receber PASTA_ATIVA como caminho absoluto — caminhos relativos podem quebrar dependendo do cwd do subagente.

---

## Verificacao

### Dogfooding manual

- [ ] **Setup:** Garantir fase-01 ja aplicada. Criar um PRD de teste via `/write-prd "teste-plan-feature"` — deve gerar `.planning/YYYY-MM-DD-teste-plan-feature/PRD.md`.
- [ ] **GREEN:** Aplicar as mudancas deste plano no `plan-feature/SKILL.md`.
- [ ] **VERIFY 1 (feliz, sem argumento):** Rodar `/plan-feature` sem argumento. Confirmar:
  - Skill encontra o PRD via glob `.planning/*/PRD.md`
  - Apresenta overview ao dev, recebe aprovacao
  - Salva `.planning/YYYY-MM-DD-teste-plan-feature/PLAN.md` (nu)
  - Cria `.planning/YYYY-MM-DD-teste-plan-feature/STATE.md` (nu)
  - Ao gerar plano 01: cria `.planning/YYYY-MM-DD-teste-plan-feature/plano01/README.md` + `MEMORY.md` + `fase-*.md`
  - NENHUM arquivo aparece na raiz de `.planning/`
- [ ] **VERIFY 2 (argumento pasta):** Rodar `/plan-feature ".planning/YYYY-MM-DD-teste-plan-feature/"`. Confirmar comportamento identico ao VERIFY 1.
- [ ] **VERIFY 3 (argumento arquivo):** Rodar `/plan-feature ".planning/YYYY-MM-DD-teste-plan-feature/PRD.md"`. Confirmar que a skill extrai a pasta pai corretamente e gera tudo dentro dela.
- [ ] **VERIFY 4 (zero PRDs):** Com `.planning/` vazio, rodar `/plan-feature`. Confirmar que oferece criar com `/write-prd` (Caminho C) sem quebrar.
- [ ] **Cleanup:** Deletar `.planning/YYYY-MM-DD-teste-plan-feature/` apos validar.

### Checklist

- [ ] Step 1 Caminho B: glob agora eh `.planning/*/PRD.md` com filtro de padrao de pasta
- [ ] Step 1 Caminho A aceita caminho de arquivo OU de pasta
- [ ] Step 8 salva `PLAN.md` e `STATE.md` dentro de PASTA_ATIVA
- [ ] Step 9 propaga PASTA_ATIVA absoluta para subagentes de planos
- [ ] Exemplo de estrutura no topo do SKILL.md atualizado
- [ ] Pipeline Integration Steps 0 e 2 atualizados
- [ ] PRDs arquivados em `_archive/` sao recusados com mensagem clara

---

## Criterio de Aceite

**Por maquina / filesystem:**
- Apos rodar o fluxo completo `/write-prd "feat-x"` → `/plan-feature` em `.planning/` limpa:
  - `ls .planning/YYYY-MM-DD-feat-x/` retorna: `PRD.md`, `PLAN.md`, `STATE.md`, `plano01/`
  - `ls .planning/YYYY-MM-DD-feat-x/plano01/` retorna: `README.md`, `MEMORY.md`, `fase-*.md`
  - `ls .planning/` (nivel raiz) NAO contem: `PLAN-*.md`, `STATE-*.md`, `plano01/`, `plano02/`

**Por humano:**
- Atende CA-02 do PRD: "Dado o PRD criado em pasta datada, quando o dev rodar `/plan-feature` sem argumento, entao a skill detecta e usa o `PRD.md` dentro da pasta, gerando `PLAN.md`, `STATE.md` e `planoNN/` todos dentro da mesma pasta."
- Dois PRDs em pastas diferentes coexistem sem interferir (setup do CA-05 de paralelismo, que a fase-03 completa).

---

<!-- Gerado por /anti-vibe-coding:plan-feature em 2026-04-20 -->
