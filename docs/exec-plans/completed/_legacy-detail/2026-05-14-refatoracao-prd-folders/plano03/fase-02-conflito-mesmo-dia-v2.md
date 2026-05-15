# Fase 02: Conflito mesmo-dia (atualizar ou criar v2)

**Plano:** 03 — Multi-PRD, ciclo de vida e consolidacao
**Sizing:** 1h
**Depende de:** Nenhuma (primeira fase deste plano; substitui comportamento instalado pelo
Plano 01 fase-01)
**Visual:** false

---

## O que esta fase entrega

`write-prd` detecta que a pasta `.planning/YYYY-MM-DD-{slug}/` ja existe ao tentar salvar um
novo PRD (mesmo dia, mesmo slug). Pergunta interativamente: **atualizar conteudo existente** ou
**criar v2**. Se v2: criar pasta com sufixo `-v2`, `-v3`, etc. Se atualizar: sobrescrever
`PRD.md` e AVISAR explicitamente que `CONTEXT.md`, `PLAN.md`, `STATE.md`, `planoNN/` permanecem
INALTERADOS.

Satisfaz **RF9** e **CA-10** do PRD. Substitui o bloco instalado pelo Plano 01 fase-01 que apenas
"falha com mensagem clara" em colisao (G6 do README do Plano 01).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/write-prd/SKILL.md` | Modify | Substituir o bloco de colisao em "Step 5 Salvar PRD" (instalado pelo Plano 01 fase-01) pela logica interativa v2; remover tambem o bloco legacy "Se ja existir PRD em `.planning/`" que virou codigo morto (G-PLAN-1) |

---

## Implementacao

### Passo 1: Localizar o bloco de colisao instalado pelo Plano 01 fase-01

O Plano 01 fase-01 modificou o `Step 5 — Salvar PRD` do `write-prd/SKILL.md` para:
1. Gerar pasta `.planning/YYYY-MM-DD-{slug}/`
2. Salvar `PRD.md` NU dentro
3. Tratar colisao com **mensagem clara de falha** (deferred — nao sobrescrever)

Alem disso, permanece o bloco legacy (G-PLAN-1) que trata `PRD-*.md` solto na raiz:
```
Se ja existir PRD em .planning/:
1. Ler o PRD existente
2. Perguntar: "Ja existe um PRD para {feature}. Quer atualizar/refinar ou criar um novo?"
3. Se atualizar: carregar como base e aplicar como refinamento
4. Se novo: criar com nome diferente (PRD-{feature}-v2.md)
```

Esse bloco se tornou codigo morto apos Plano 01 (nao ha mais `PRD-*.md` na raiz). DEVE ser
removido nesta fase (consolidacao de G-PLAN-1).

### Passo 2: Substituir o bloco de colisao do Step 5

Logica nova (substitui o "falhar com mensagem clara" do Plano 01):

```markdown
### Colisao de pasta mesmo-dia mesmo-slug (RF9 / CA-10)

Apos calcular `.planning/YYYY-MM-DD-{slug}/`, antes de criar:

1. Verificar se a pasta ja existe:
   - Se NAO existe: criar pasta + salvar PRD.md nu (fluxo normal)
   - Se existe: prosseguir para 2

2. Ler `{pasta}/PRD.md` existente (se houver), extrair:
   - Status (Draft / Approved / Completed)
   - Titulo
   - Data de criacao no frontmatter (se presente)

3. Apresentar ao dev com AskUserQuestion:

   "Ja existe uma pasta para esta feature hoje: {pasta}
    PRD atual: {titulo} (status: {status})

    O que deseja?
    [1] Atualizar PRD existente (sobrescreve PRD.md; CONTEXT/PLAN/STATE/planoNN inalterados)
    [2] Criar v2 (nova pasta com sufixo)
    [3] Cancelar"

4. Acao conforme resposta:

   OPCAO 1 — ATUALIZAR:
     - AVISAR explicitamente:
       "ATENCAO: Apenas PRD.md sera sobrescrito.
        CONTEXT.md, PLAN.md, STATE.md e planoNN/ permanecerao com conteudo antigo.
        Se o PRD mudou substancialmente, considere opcao [2] v2.
        Confirma?"
     - Se dev confirma: sobrescrever `{pasta}/PRD.md` apenas
     - Se dev cancela: voltar ao prompt do passo 3

   OPCAO 2 — CRIAR V2:
     - Calcular proximo sufixo disponivel:
       - Se `{pasta}-v2/` nao existe: usar `-v2`
       - Se existe: tentar `-v3`, `-v4`, ate achar slot livre
     - Criar `.planning/YYYY-MM-DD-{slug}-v2/` (ou -vN)
     - Salvar PRD.md nu la dentro
     - Informar: "PRD salvo em {nova-pasta}/PRD.md"
     - NAO mover CONTEXT.md automaticamente (fase-04 do Plano 01 cuida da logica de CONTEXT;
       a colisao de v2 eh caso especial — perguntar separadamente se o CONTEXT deve ser copiado
       ou deixar a pasta v2 sem CONTEXT inicialmente)

   OPCAO 3 — CANCELAR:
     - Nao criar nada
     - "PRD nao foi salvo. Ajuste o slug com /write-prd {novo-nome} se quiser pasta diferente."
```

### Passo 3: Calculo do proximo sufixo `-vN` (edge case G11 do Plano 02)

Duas sessoes Claude podem tentar criar v2 ao mesmo tempo (CA-05 paralelismo). O calculo eh
atomico para cada skill, mas mvs concorrentes nao tem lock (D3 — sem lock global). Pseudo-codigo:

```
function nextVersionSuffix(baseFolder: string): string {
  for (let v = 2; v <= 99; v++) {
    const candidate = `${baseFolder}-v${v}`;
    if (!exists(candidate)) return `-v${v}`;
  }
  throw new Error("Mais de 99 versoes no mesmo dia — revise o slug manualmente");
}
```

Se duas sessoes calcularem `-v2` simultaneamente, quem chegar primeiro cria; o segundo vai
tentar `-v3` APOS verificar que `-v2` ja existe. A verificacao de existencia acontece ANTES do
`mkdir` e eh SEQUENCIAL dentro da skill — nao ha race entre verificar e criar da MESMA sessao.

Em caso extremo de duas sessoes com mesma verificacao NA MESMA nanossegundo (improvavel), o
`mkdir` falhara com `EEXIST` numa delas — capturar e tentar proximo sufixo.

### Passo 4: Remover codigo morto G-PLAN-1

O bloco pre-existente do `write-prd/SKILL.md` (linhas ~174-179 no original):
```
Se ja existir PRD em .planning/:
1. Ler o PRD existente
2. Perguntar: "Ja existe um PRD para {feature}. Quer atualizar/refinar ou criar um novo?"
3. Se atualizar: carregar como base e aplicar como refinamento
4. Se novo: criar com nome diferente (PRD-{feature}-v2.md)
```

Esse bloco tratava `PRD-*.md` soltos na raiz de `.planning/`, o que nao existe mais apos Plano
01. Remover integralmente. Se o dev quiser migrar legacy, ele usa o Plano 02 (detector +
migrator), nao o write-prd.

### Passo 5: Logging no STATE.md (nao aplicavel nesta fase)

O `write-prd` atual NAO cria `STATE.md` (isso eh `plan-feature`). Portanto, nao ha log a
atualizar. A proxima vez que `plan-feature` rodar na pasta, ele cria `STATE.md` do zero (opcao 2
v2) ou le o existente (opcao 1 atualizar) — comportamento ja coberto pelo Plano 01 fase-02.

---

## Gotchas

- **G1 do plano (G5 — D9):** Esta fase SUBSTITUI o comportamento do Plano 01 fase-01 (que apenas
  falhava em colisao). A ordem de aplicacao eh importante: Plano 01 primeiro, depois este.
- **G2 do plano (G9 — G-PLAN-1 limpeza):** Aproveitar esta fase para remover o codigo morto do
  write-prd (bloco de `PRD-*.md` solto). Fazer em commit separado ou mesmo commit, mas deixar
  claro no diff.
- **Local (opcao atualizar):** AVISAR explicitamente que apenas PRD.md sera sobrescrito. Dev
  pode esquecer de regenerar o PLAN se mudou o escopo. Avisar reduz surpresa.
- **Local (opcao v2 sem CONTEXT):** `CONTEXT.md` do `grill-me` eh por-slug, nao por-versao. Se
  o dev criar v2 para uma feature que ja tinha CONTEXT.md, a pasta v2 nasce sem CONTEXT (o
  original ja foi movido para a v1 pela fase-04 do Plano 01). Comportamento OK — v2 eh uma
  reformulacao; se precisar de CONTEXT, dev roda /grill-me novamente.
- **Local (paralelismo — CA-05):** Duas sessoes Claude podem gerar v2 e v3 concorrentemente
  para a mesma feature no mesmo dia. Isso eh aceito por design (D3 — sem lock). Cada sessao
  termina com sua propria pasta — dev decide manualmente depois qual manter.
- **Local (limite de 99 versoes):** Seguranca — impedir loop infinito se algo estiver errado.
  Se dev gerou 99 versoes no mesmo dia, algo esta claramente errado e merece parada manual.

---

## Verificacao

### Dogfooding

- [ ] **RED:** fixture `.planning-test/2026-04-20-foo/` pre-existente com `PRD.md` dummy. Rodar
  `/write-prd "foo"` na mesma data (simular). Confirmar que o comportamento ATUAL (pos-Plano 01)
  eh apenas falhar com mensagem — nao ha interacao de "atualizar ou v2".
- [ ] **GREEN:** apos editar `write-prd/SKILL.md`, rodar novamente. Confirmar que a skill
  apresenta as 3 opcoes (atualizar / v2 / cancelar).

### Checklist

- [ ] Opcao ATUALIZAR: sobrescreve `{pasta}/PRD.md` e NAO toca em outros arquivos da pasta
- [ ] Opcao ATUALIZAR: aviso explicito eh mostrado ANTES de sobrescrever
- [ ] Opcao V2: cria `{pasta}-v2/` com novo PRD.md nu
- [ ] Opcao V2 com `-v2` ja existente: avanca para `-v3` (ou proximo livre)
- [ ] Opcao CANCELAR: nao cria nem modifica nada
- [ ] Codigo morto G-PLAN-1 removido (grep pelo texto "Se ja existir PRD em `.planning/`:" nao
  retorna mais match no SKILL.md)
- [ ] Limit de 99 versoes respeitado (teste com fixture simulada — criar dummies de `-v2` a
  `-v99` e confirmar erro)
- [ ] Limpar fixture apos validar

---

## Criterio de Aceite

**Por humano (dogfooding):**
- Fixture com pasta `2026-04-20-auth/` + `PRD.md` existente → rodar `/write-prd "auth"` →
  skill mostra 3 opcoes → escolher [2] v2 → pasta `2026-04-20-auth-v2/` eh criada com PRD.md
- Mesma fixture → escolher [1] atualizar → `{pasta}/PRD.md` sobrescrito; `PLAN.md` dummy na
  pasta permanece intacto (verificar com checksum/timestamp)
- Mesma fixture com `-v2/` ja presente → escolher [2] → resultado vai para `-v3/`

**Cobertura do PRD:**
- RF9 (conflito mesmo-dia mesma feature → "atualizar ou v2") ✓
- CA-10 (pasta ja existente + write-prd → pergunta e cria v2 com sufixo) ✓
- G-PLAN-1 (codigo morto limpo) ✓

---

<!-- Gerado por /anti-vibe-coding:plan-feature em 2026-04-20 -->
