# Fase 03: Arquivamento do PRD em verify-work

**Plano:** 03 — Multi-PRD, ciclo de vida e consolidacao
**Sizing:** 1h
**Depende de:** Nenhuma (primeira fase deste plano; depende do Plano 01 fase-03 para que
`verify-work` opere sabendo a pasta ativa)
**Visual:** false

---

## O que esta fase entrega

`verify-work` passa a oferecer, ao final da auditoria bem-sucedida de um PRD, mover a pasta
`.planning/YYYY-MM-DD-{slug}/` para `.planning/_archive/YYYY-MM-DD-{slug}/`. A oferta eh
OPT-IN com confirmacao explicita. A skill SO oferece arquivar se todas as fases no `STATE.md`
estiverem em `completed` ou `skipped` — se alguma estiver `in-progress`, `paused`, `pending` ou
`blocked`, exibe aviso e pula a oferta de arquivamento (dev pode ter esquecido alguma).

Satisfaz **RF6** e **CA-07** do PRD.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/verify-work/SKILL.md` | Modify | Na secao "Cleanup de Artefatos" (ja existente, linhas ~358-369), substituir a opcao `archive` generica por logica concreta: detectar pasta do PRD, verificar status das fases, mover para `_archive/` com confirmacao |

---

## Implementacao

### Passo 1: Detectar pasta ativa do PRD

`verify-work` eh invocado apos `execute-plan`. O contexto eh:
- Se `verify-work` foi chamado no mesmo pipeline: pasta ativa conhecida (do STATE ou caminho).
- Se standalone: inferir via git branch, ultimo commit, ou glob em `.planning/`.

Logica:

```
function detectarPastaAtivaPRD(): string | null {
  // 1. Prioridade: argumento (se dev passou caminho)
  if (arg && arg.startsWith(".planning/")) {
    const match = arg.match(/\.planning\/(\d{4}-\d{2}-\d{2}-[^\/]+)/);
    if (match) return `.planning/${match[1]}/`;
  }

  // 2. Buscar pastas datadas com Phase=completed no STATE.md
  const pastas = Glob(".planning/YYYY-MM-DD-*/");
  const completadas = pastas.filter(p => {
    const state = Read(`${p}/STATE.md`);
    return state && extractField(state, "Phase") === "completed";
  });

  if (completadas.length === 1) return completadas[0];
  if (completadas.length > 1) {
    // Perguntar qual
    return askUser("Qual pasta deseja arquivar?", completadas);
  }

  return null;  // Nenhuma pasta pronta para arquivar
}
```

### Passo 2: Verificar que todas as fases estao em estado terminal

Antes de oferecer arquivamento, ler `STATE.md` da pasta e validar:

```
function podeArquivar(pasta: string): { ok: boolean; motivo?: string } {
  const state = Read(`${pasta}/STATE.md`);
  if (!state) return { ok: false, motivo: "STATE.md nao encontrado" };

  // Extrair tabela "Progress por Plano"
  const planosTabela = extractSection(state, "Progress por Plano");

  // Cada linha da tabela tem Status (pending/in-progress/completed/paused/skipped)
  const planosStatus = parseTabela(planosTabela);

  const naoTerminais = planosStatus.filter(p =>
    !["completed", "skipped"].includes(p.status)
  );

  if (naoTerminais.length > 0) {
    return {
      ok: false,
      motivo: `Planos nao terminais: ${naoTerminais.map(p => `${p.nome} (${p.status})`).join(", ")}`,
    };
  }

  // Tambem verificar status da Phase global
  const phase = extractField(state, "Phase");
  if (phase !== "completed") {
    return { ok: false, motivo: `Phase global = ${phase}, esperado completed` };
  }

  return { ok: true };
}
```

Status terminais aceitos:
- `completed` — plano concluiu normalmente
- `skipped` — plano foi pulado intencionalmente via Step 4-ESCAPE do execute-plan

Status NAO terminais (bloqueiam arquivamento):
- `pending`, `in-progress`, `paused`, `blocked`

### Passo 3: Substituir a secao "Cleanup de Artefatos" no verify-work/SKILL.md

Localizar (linhas ~358-369):

```markdown
### Cleanup de Artefatos

Apos verificacao completa, sugerir ao dev:

> "Os artefatos em `.planning/` ... serviram para rastrear o processo. ...
>
> Opcoes:
> - Arquivar em `.planning/archive/{date}/` (preserva historico)
> - Manter como esta (para referencia futura)
> - Remover artefatos (o codigo e os commits contam a historia)"

NAO deletar automaticamente — sempre perguntar. O dev decide.
```

Substituir por:

```markdown
### Cleanup de Artefatos — Arquivamento do PRD

Apos verificacao completa, se a pasta do PRD for detectada (`.planning/YYYY-MM-DD-{slug}/`):

1. Chamar `detectarPastaAtivaPRD()` para identificar a pasta
2. Se nao houver pasta elegivel:
   - Fallback: sugestao generica antiga (arquivar / manter / remover) — pode ser mantida como
     escape para projetos legacy nao migrados
3. Se houver pasta: chamar `podeArquivar(pasta)`
   - Se NAO pode: informar ao dev
     "Auditoria concluida, mas a pasta {pasta} tem planos nao terminais: {motivo}.
      Nao vou oferecer arquivamento — verifique se algum plano ficou inacabado.
      Voce pode arquivar manualmente depois com mv {pasta} .planning/_archive/."
     NAO oferecer mv; encerrar sem mexer em nada.
   - Se PODE: prosseguir para passo 4

4. Apresentar oferta ao dev via AskUserQuestion:
   "Auditoria concluida. Todos os planos estao em estado terminal (completed/skipped).
    Deseja arquivar a pasta em .planning/_archive/?
    [1] Sim, arquivar ({pasta} -> .planning/_archive/{basename})
    [2] Nao, manter em .planning/ (dev pode arquivar depois manualmente)
    [3] Ver o STATE.md da pasta antes de decidir"

5. Acao conforme resposta:

   OPCAO 1 — ARQUIVAR:
     a. Criar `.planning/_archive/` se nao existir (mkdir)
     b. Verificar que `.planning/_archive/{basename}` NAO existe (caso dev tenha arquivado
        a mesma pasta antes via mv manual):
        - Se existe: abortar com "destino ja existe — conflito, investigar manualmente"
     c. CHAMAR LOGICA DO fase-04 (MEMORY consolidado) ANTES do mv:
        - `gerarMEMORYConsolidado(pasta)` cria/atualiza `{pasta}/MEMORY.md` com consolidado
        - Essa chamada pode ser inline ou spawn de subagente (ver fase-04)
     d. Executar mv da pasta completa:
        `mv .planning/{basename} .planning/_archive/{basename}`
        (no Windows: equivalente via rename/move)
     e. Confirmar sucesso: ler `.planning/_archive/{basename}/PRD.md` para garantir
     f. Informar: "Pasta arquivada em .planning/_archive/{basename}/"

   OPCAO 2 — MANTER:
     - Nao fazer nada, nao consolidar memoria
     - "OK, pasta mantida em .planning/{basename}/. Use /verify-work novamente quando quiser
        oferecer arquivar, ou mova manualmente."

   OPCAO 3 — VER STATE:
     - Mostrar conteudo de `{pasta}/STATE.md` inline
     - Voltar ao prompt do passo 4 apos leitura

Se dev cancelar ou interromper durante o mv, abortar sem rollback (estado consistente: ou
pasta inteira em .planning/, ou pasta inteira em _archive/).
```

### Passo 4: Windows mv cuidados (G-PLAN-4)

`.planning/_archive/` fica DENTRO de `.planning/`. Portanto, mesmo filesystem — `mv` nativo
funciona. No Windows, usar `Move-Item` ou a primitiva do Bash configurado (bash shell no
ambiente usa `mv` Unix-like).

Se por algum motivo o filesystem for diferente (symlinks, mount bind), o `mv` cross-filesystem
vira um copy+delete. Nesse caso:
- Capturar erro
- Abortar com mensagem "falha ao mover — verifique se `.planning/_archive/` esta no mesmo
  filesystem"
- NAO deixar estado parcial (nao copiar metade)

### Passo 5: Integracao com fase-04 (MEMORY consolidado)

A ordem eh CRITICA: gerar `MEMORY.md` consolidado ANTES do mv, DENTRO da pasta original.
Razao: apos o mv, a pasta nova esta em `_archive/` e o consolidado ja deve estar ali junto.

Pseudo-codigo da integracao:

```
// Dentro de Opcao 1 ARQUIVAR:
gerarMEMORYConsolidado(pasta);        // fase-04 — escreve {pasta}/MEMORY.md
mv(pasta, `.planning/_archive/${basename(pasta)}`);
```

Se a geracao do MEMORY consolidado falhar, AVISAR o dev e perguntar se quer arquivar mesmo
assim (sem MEMORY consolidado) — nao bloquear.

---

## Gotchas

- **G1 do plano (G4 — G-PLAN-4 mv Windows):** `.planning/_archive/` esta no mesmo filesystem do
  `.planning/` — mv eh atomico. Em setups exoticos (mount bind), avisar e abortar em caso de
  erro.
- **G2 do plano (G7 — arquivamento so com terminais):** Verificacao de status da fase-02 acima
  eh critica. Se dev tem plano `paused`, talvez ele voltou a trabalhar e esqueceu; nao arquivar
  "por cima" do trabalho pendente.
- **G3 do plano (G6 — confirmacao explicita):** Nunca arquivar sem confirmacao. Mesmo que todas
  as fases sejam terminais, a decisao eh do dev.
- **G4 do plano (G11 — agregacao com fase-04):** A consolidacao do MEMORY.md acontece DENTRO
  do fluxo de arquivamento (nao eh step separado no dev-land). Se dev escolhe "nao arquivar",
  o consolidado nao eh gerado (pode ser refeito depois quando dev optar por arquivar).
- **Local (idempotencia):** Se dev rodar `/verify-work` duas vezes na mesma pasta ja arquivada
  (por ex. apos erro), a segunda rodada deve reconhecer que nao ha pasta em `.planning/` a
  arquivar e encerrar gracefully.
- **Local (permissao):** Se `mv` falhar por permissao (arquivo aberto em editor, etc.), capturar
  erro e instruir o dev.
- **Local (colisao de destino):** Se `.planning/_archive/{basename}` ja existe (dev ja arquivou
  uma pasta com mesmo nome — raro, mas possivel em multi-projeto), NAO sobrescrever. Abortar
  com mensagem clara.

---

## Verificacao

### Dogfooding

- [ ] **RED:** fixture `.planning-test/2026-04-20-done/` com `STATE.md` todas-terminais. Rodar
  `/verify-work`. Confirmar que o comportamento ATUAL do verify-work ja sugere cleanup generico
  (3 opcoes texto), mas nao faz mv real.
- [ ] **GREEN:** apos edit, `/verify-work` oferece [1] arquivar + [2] manter + [3] ver STATE;
  escolher [1] move a pasta para `.planning-test/_archive/2026-04-20-done/`.

### Checklist

- [ ] Fixture com todos planos `completed` + Phase `completed` → oferece arquivar
- [ ] Fixture com 1 plano `paused` → NAO oferece arquivar; mensagem lista o plano pausado
- [ ] Fixture com 1 plano `in-progress` → NAO oferece arquivar; mensagem cita `in-progress`
- [ ] Fixture com fases `skipped` + resto `completed` → oferece arquivar (skipped eh terminal)
- [ ] Opcao [1] arquivar: chama fase-04 (MEMORY consolidado) ANTES do mv
- [ ] Opcao [1] arquivar: `.planning/_archive/` eh criado se nao existir
- [ ] Opcao [1] arquivar: pasta original deixa de existir apos mv
- [ ] Opcao [1] com destino `_archive/{basename}` ja existente: aborta com mensagem
- [ ] Opcao [2] manter: nao gera MEMORY consolidado nem move nada
- [ ] Opcao [3] ver STATE: mostra conteudo inline e volta ao prompt
- [ ] Pasta vazia `_archive/` nao eh listada na descoberta (fase-01)
- [ ] Limpar fixture apos validar

---

## Criterio de Aceite

**Por humano (dogfooding):**
- Criar fixture com 2 planos `completed`, Phase `completed`, rodar `/verify-work` → skill
  oferece arquivar → escolher `[1]` → pasta move para `_archive/`; MEMORY.md consolidado criado
- Criar fixture com 1 plano `in-progress`, rodar `/verify-work` → skill NAO oferece arquivar;
  mensagem clara sobre plano pendente

**Cobertura do PRD:**
- RF6 (verify-work oferece mover para _archive) ✓
- CA-07 (arquivamento com confirmacao, preserva nome) ✓
- G-PLAN-4 (mv mesmo filesystem) ✓

---

<!-- Gerado por /anti-vibe-coding:plan-feature em 2026-04-20 -->
