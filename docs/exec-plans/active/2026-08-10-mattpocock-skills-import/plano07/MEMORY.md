# Memory: Plano 07 — `improve-codebase-architecture`

Estado rolante do plano. Atualizado ao fim de cada fase pelo executor.

**Status:** planned — nenhuma fase executada
**Depende de:** plano01 fase-01 (a lente) · **plano02 fase-01** (vocabulario — dura)

## Progresso

| Fase | Nome | Status | Arquivos |
|---|---|---|---|
| 01 | Escopar, varrer, detectar conflito | planned | 0/3 |
| 02 | O relatorio HTML | planned | 0/2 |

## Decisoes de implementacao (DI)

Formato: `DI-Plano07-faseNN-<slug>: <o que mudou e por que>`.

Duas ja sao obrigatorias, na fase-02:
- `DI-Plano07-fase02-tmpdir`: qual ordem de resolucao do temp dir? `$TMPDIR` nao existe em Git Bash;
  `$TEMP`/`$TMP` existem com caminho Windows; `/tmp` existe e mapeia para o temp do MSYS. Escolher
  uma e escrever.
- `DI-Plano07-fase02-offline`: Mermaid vem de CDN. Sem rede os diagramas nao renderizam. Fallback
  textual visivel, ou aceitar? O card nao pode parecer completo com buraco no lugar do diagrama.

## O que esta skill e, e nao e

**Primeira skill proativa e periodica do plugin.** Todo o resto e reativo a uma mudanca recem-feita:

| Skill | Gatilho |
|---|---|
| `verify-work` | executei um plano |
| `anti-vibe-review` | implementei |
| `code-simplification` | este arquivo esta complexo |
| `detect-architecture` | classificar o projeto (one-shot) |

E a honestidade da fonte que entra no porte: **levantamento, nao resgate.** Num codebase velho ela
acha candidatos reais, mas nao desemaranha a lama.

## Armadilhas do Windows (fase-02)

Esta fase concentra os problemas de plataforma do plano inteiro:

| Problema | Realidade em Git Bash |
|---|---|
| `start <arquivo>` | **nao existe** — e builtin do `cmd`. Usar `explorer.exe` ou `cmd //c start "" ...` |
| Caminho | `/c/Users/...` nao e entendido por `explorer.exe`. Converter com `cygpath -w` |
| `$TMPDIR` | geralmente ausente. `$TEMP`/`$TMP` existem, estilo Windows |

Parente do defeito D2 do plano03 (`explorer.exe` e exit code). **Nao consolidar preventivamente** —
so quando houver dois call sites reais ("1 adapter = seam hipotetico, 2 = real", plano02).

## Pendencia resolvida por este plano

`plano06/fase-03` encaminha o post-mortem arquitetural para `architecture`/`code-simplification`,
com nota de que o destino muda quando esta skill existir. A fase-01 daqui atualiza aquele ponteiro.

## Adiado (DI-25)

O **loop de grilling** sobre o candidato escolhido, com efeitos colaterais inline (atualizar
glossario, oferecer ADR). Depende de plano04 (frontier) e plano05 (`domain-modeling`). Esta entrega
para em "qual voce quer explorar?" e encaminha para `/design-twice` (Dominio 5, plano02 fase-03).

**Reavaliar quando 04 e 05 estiverem entregues.**

## Degradacao sem glossario

`docs/GLOSSARY.md` so existe apos o plano05. Ate la os cards usam o vocabulario de arquitetura
(plano02) e os nomes que o codigo ja usa. **Degradar, nao quebrar.**

## Resultados a registrar (fase-01 Passo 9)

| Observacao | Resultado |
|---|---|
| Hot spots do `git log` batem com o atrito percebido neste repo? | |
| Skills de dominio (`security` 598, `system-design` 528, `api-design` 437) foram reportadas como falso positivo? | |

## Gates entre fases

- **plano02 fase-01 -> fase-01:** dependencia dura. Sem o vocabulario, todo card diria "componente"
  e "boundary" — exatamente o que o vocabulario existe para evitar.
- **fase-01 -> fase-02:** candidatos precisam existir para serem renderizados.
