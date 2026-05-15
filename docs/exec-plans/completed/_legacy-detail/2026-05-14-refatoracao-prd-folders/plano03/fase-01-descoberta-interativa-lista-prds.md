# Fase 01: Descoberta interativa de PRDs (lista com status)

**Plano:** 03 — Multi-PRD, ciclo de vida e consolidacao
**Sizing:** 1h
**Depende de:** Nenhuma (primeira fase do plano; depende do Plano 01 fase-02 e fase-03)
**Visual:** false

---

## O que esta fase entrega

`execute-plan` e `plan-feature` rodados SEM argumento passam a listar todos os PRDs nao arquivados
em `.planning/` com status lido do `STATE.md` local de cada pasta datada. Dev escolhe qual usar.
Satisfaz **RF5** e **CA-08** do PRD e mitiga **R8** (filtro default: `planned`+`in-progress`;
flag `--all` inclui `completed` nao arquivados).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/execute-plan/SKILL.md` | Modify | Substituir "Step 1a Localizar plano" para descoberta por pasta datada; tratar flag `--all` do `argument-hint`; adicionar comportamento quando ha 2+ pastas |
| `anti-vibe-coding/skills/plan-feature/SKILL.md` | Modify | Substituir "Step 1 Caminho B: Buscar em .planning/" por descoberta equivalente (glob de pastas datadas; leitura de STATE.md de cada) |

---

## Implementacao

### Passo 1: Algoritmo de enumeracao (compartilhado conceitualmente)

Ambas as skills usam o mesmo algoritmo. Nao ha codigo compartilhado fisico (sao SKILL.md
diferentes), mas o comportamento eh identico:

```
function listarPRDs(includeAll: boolean): PRDEntry[] {
  // 1. Glob .planning/YYYY-MM-DD-*/   (excluir _archive/)
  const candidatas = Glob(".planning/*/");
  const pastasDatadas = candidatas.filter(p =>
    /^\d{4}-\d{2}-\d{2}-.+/.test(basename(p)) &&
    !p.startsWith(".planning/_archive/")
  );

  // 2. Para cada pasta, ler STATE.md local e extrair status
  const entradas: PRDEntry[] = [];
  for (const pasta of pastasDatadas) {
    const statePath = `${pasta}/STATE.md`;
    if (!exists(statePath)) {
      // pasta sem STATE.md: considerar "planned" (pode ser so com PRD.md ainda)
      entradas.push({ pasta, status: "planned", nome: basename(pasta) });
      continue;
    }
    const state = Read(statePath);
    const phase = extractField(state, "Phase");  // planned|in-progress|paused|completed
    const currentPlan = extractField(state, "Current Plan");
    entradas.push({
      pasta,
      status: phase || "planned",
      nome: basename(pasta),
      currentPlan,
    });
  }

  // 3. Filtro default: so planned + in-progress + paused
  //    Com --all: inclui completed (mas NUNCA listar pastas dentro de _archive/)
  if (!includeAll) {
    return entradas.filter(e =>
      ["planned", "in-progress", "paused"].includes(e.status)
    );
  }
  return entradas;  // --all: tudo exceto archived
}
```

Onde `PRDEntry` eh conceitual (as skills escrevem isso em pseudo-codigo dentro do SKILL.md).

### Passo 2: Modificar `execute-plan/SKILL.md` — Step 1a

Localizar a secao `### 1a. Localizar plano` (linhas ~29-43 atualmente). Substituir por:

```markdown
### 1a. Localizar plano (nova estrutura — pastas datadas)

Se caminho fornecido (/execute-plan "path/to/PASTA/" ou ".../PLAN.md"):
  - Resolver para pasta datada `.planning/YYYY-MM-DD-{slug}/`
  - Ler `STATE.md` de dentro da pasta
  - Prosseguir para 1b

Se NAO forneceu caminho:
  1. Enumerar pastas datadas em `.planning/` (Glob `.planning/YYYY-MM-DD-*/`)
     - EXCLUIR `.planning/_archive/` e seu conteudo
     - Para cada pasta, ler `STATE.md` local e extrair `Phase` + `Current Plan`
  2. Aplicar filtro default: mostrar apenas `planned` + `in-progress` + `paused`
     - Flag `--all` incluida no argumento: mostrar tambem `completed`
  3. Apresentar lista ao dev:

     Encontrei 3 PRDs ativos em .planning/:
       [1] 2026-04-20-sistema-notificacoes  (in-progress — Plano 2/4)
       [2] 2026-04-21-auth-refactor         (planned)
       [3] 2026-04-15-billing               (paused — Plano 3/5)
     Qual executar? (--all para ver completed tambem)

  4. Se dev escolher um: usar aquela pasta como raiz, ler `STATE.md` dela
  5. Se lista vazia apos filtro:
     - Se `--all` foi usado: "Nenhum PRD em .planning/." + oferecer /plan-feature
     - Se default: "Nenhum PRD ativo (planned/in-progress/paused). Rode /execute-plan --all para ver todos."
  6. Se apenas 1 PRD ativo apos filtro: pedir confirmacao
     "Encontrei 1 PRD ativo: {nome} ({status}). Executar?"

Se apos enumeracao NAO houver nenhuma pasta datada:
  - Verificar se ha artefatos legacy (`PRD-*.md` solto, `plano*/` solto)
    → Plano 02 ja instala detector; se disponivel, chamar detectLegacy()
  - Senao: "Nao encontrei nenhum PRD em .planning/. Quer criar um com /write-prd?"
  - Encerrar
```

Depois, ajustar `### 1b. Detectar formato` para operar DENTRO da pasta escolhida (o `PLAN.md`
eh lido como `{pasta}/PLAN.md`).

### Passo 3: Modificar `plan-feature/SKILL.md` — Step 1 Caminho B

Localizar a secao `### Caminho B: Buscar em .planning/` (linhas ~54-62 atualmente). Substituir
por:

```markdown
### Caminho B: Buscar em .planning/ (nova estrutura — pastas datadas)

1. Se nao forneceu caminho:
   a. Enumerar pastas datadas em `.planning/` (mesmo algoritmo do execute-plan fase-01 Plano 03)
      - Glob `.planning/YYYY-MM-DD-*/`
      - Excluir `_archive/`
      - Para cada pasta, ler `STATE.md` e extrair `Phase`
      - Default filtrar: `planned` + `in-progress` + `paused`
      - Flag `--all`: incluir `completed`
   b. Se 1 PRD apos filtro:
      - Ler `{pasta}/PRD.md` diretamente
      - Confirmar: "Encontrei {nome}. Vou planejar com base no PRD.md dentro."
   c. Se 2+ PRDs apos filtro:
      - Listar como no execute-plan:
        [1] 2026-04-20-sistema-notificacoes (in-progress)
        [2] 2026-04-21-auth-refactor (planned)
        Para qual vou criar/ajustar planos?
      - Dev escolhe, le `{escolhida}/PRD.md`
   d. Se lista vazia:
      - Oferecer Caminho C (PRD nao existe)
2. Prosseguir para Step 2 operando DENTRO da pasta escolhida
   (todos os outputs do Step 8 e Step 9 vao para `{pasta}/PLAN.md`, `{pasta}/STATE.md`,
    `{pasta}/planoNN/` — ja definido no Plano 01 fase-02)
```

### Passo 4: Comportamento quando `--all` aparece como argumento

O `argument-hint` do `execute-plan` ja aceita flags (atualmente `[--plano N] [--fase N]`).
Estender para aceitar `--all`. Regras:

- Se `--all` vier junto com um caminho (`/execute-plan path/ --all`): ignorar `--all` (caminho ja
  eh explicito).
- Se `--all` vier sozinho: listar tambem `completed`.
- Se `--all` vier com outra flag (`--plano N`): `--all` altera APENAS a listagem de descoberta;
  ignorado se o dev escolheu um PRD explicito.

Em `plan-feature`, estender o `argument-hint` similarmente se necessario (atualmente aceita
`[caminho do PRD ou nome da feature]`).

### Passo 5: Interacao com flag `--plano N` / `--fase N` (execute-plan)

Essas flags ja existem. Apos selecao interativa do PRD, aplicar flag normalmente dentro da pasta
escolhida. Nenhuma mudanca de significado.

---

## Gotchas

- **G1 do plano (R8):** Filtro default `planned+in-progress+paused` reduz poluicao visual em
  projetos com 10+ PRDs. `--all` eh explicito para o dev que quer ver tudo (exceto arquivados).
- **G2 do plano (G-PLAN-6 — sinal C isolado):** Nao confundir descoberta com deteccao legacy.
  Esta fase SO enumera pastas com nome matching `YYYY-MM-DD-*`. `PLAN.md` ou `STATE.md` soltos em
  `.planning/` (sinal C) NAO sao tratados aqui — isso eh job do Plano 02 (detector legacy).
- **G12 do plano (slug case Windows):** Usar comparacao case-insensitive no regex de matching
  (ex: `/^\d{4}-\d{2}-\d{2}-.+/i`), mas preservar o nome original no output. Em Windows, pode
  haver pasta `2026-04-20-Auth` — listar como esta.
- **Local:** PRD recem-criado pelo `write-prd` pode ainda nao ter `STATE.md` (so `PRD.md`). Nesse
  caso, listar com status `planned` por default — ver `Passo 1` no algoritmo.
- **Local:** Pasta datada vazia (dev criou manualmente) — tambem entra como `planned`. Se dev
  escolher uma pasta sem `PRD.md`, as skills a jusante (Plano 01 fase-02) tratam isso.
- **Local:** `_archive/` pode ter subpastas com o mesmo padrao `YYYY-MM-DD-*`. Filtro
  `!p.startsWith(".planning/_archive/")` eh critico — NUNCA listar arquivados na descoberta.

---

## Verificacao

### Dogfooding (projeto nao tem test framework)

- [ ] **RED:** estado atual das skills lista SO `PRD-*.md` da raiz — criar fixture
  `.planning-test/` com 3 pastas datadas (planned, in-progress, completed), rodar `/execute-plan`
  sem argumento, confirmar que o comportamento ATUAL nao detecta as pastas.
- [ ] **GREEN:** apos editar as duas SKILLs, rodar `/execute-plan` sem argumento na mesma fixture
  e confirmar que as 3 pastas aparecem; default mostra 2 (planned + in-progress); `--all` mostra 3.

### Checklist

- [ ] Em fixture com 0 pastas datadas: mensagem clara "nenhum PRD" + oferta `/write-prd`
- [ ] Em fixture com 1 pasta planned: pede confirmacao antes de prosseguir
- [ ] Em fixture com 3 pastas (planned, in-progress, completed): default lista 2
- [ ] Com flag `--all` na mesma fixture: lista 3
- [ ] Em fixture com pasta datada SEM `STATE.md` (apenas `PRD.md`): lista como `planned`
- [ ] Pasta dentro de `_archive/` NUNCA aparece na lista (nem com `--all`)
- [ ] Regex case-insensitive: pasta `2026-04-20-Feature` eh listada corretamente
- [ ] Flag `--plano N` combinada com descoberta: aplica apos selecao do PRD
- [ ] `plan-feature` sem argumento: mesmo comportamento (listagem e escolha)
- [ ] Limpar `.planning-test/` apos validar

---

## Criterio de Aceite

**Por humano (dogfooding):**
- Rodar `/execute-plan` em fixture com 2 PRDs ativos + 1 completed → lista mostra 2; dev escolhe
  [1]; skill prossegue lendo `{pasta}/STATE.md` local
- Rodar `/execute-plan --all` na mesma fixture → lista mostra 3
- Rodar `/plan-feature` na mesma fixture → lista identica, dev escolhe, skill le `{pasta}/PRD.md`

**Cobertura do PRD:**
- RF5 (execute-plan/plan-feature sem argumento listam PRDs com status) ✓
- CA-08 (descoberta multi-PRD com 3 status distintos) ✓
- R8 mitigado (filtro default reduz poluicao) ✓

---

<!-- Gerado por /anti-vibe-coding:plan-feature em 2026-04-20 -->
