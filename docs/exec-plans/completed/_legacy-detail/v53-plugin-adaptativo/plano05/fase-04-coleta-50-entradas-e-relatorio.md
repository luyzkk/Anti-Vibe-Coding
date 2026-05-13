# Fase 04: Coleta de >= 50 entradas válidas e relatório baseline (CA-11, CA-08)

**Plano:** 05 — Análise & Dogfooding
**Sizing:** ~1h de trabalho ativo + 14 dias de calendário
**Depende de:** fase-03 (dogfooding setup completo)
**Visual:** false

---

## Patch 2026-05-05 (DEV-05 / DEV-07 / DEV-10)

> **Atenção:** este spec foi escrito quando Licitar (flag=true) e Carreirarte (flag=false) eram os dois pilotos. Após DEV-05, **Licitar virou Rails** e saiu da Onda 1; **Carreirarte virou o único piloto (flag=true)**. Após DEV-07, fase-05 (CA-12 isolamento empírico) virou `obsolete` — CA-12 está coberto só por testes textuais. Substituições mentais ao ler o resto deste documento:
>
> - `<licitar>` → `E:/Programas/Carreirarte - Novo Design` (único piloto-true)
> - "Carreirarte (flag=false)" → ignorar (não há projeto controle)
> - "input para fase-05" → ignorar (fase-05 obsolete)
> - "50 entradas válidas em Licitar" → "50 entradas válidas em Carreirarte"
>
> Janela oficial: **2026-05-05 → 2026-05-19** (14 dias). Mid-checkpoint **2026-05-12**.

---

## O que esta fase entrega

Duas semanas de uso real do plugin v5.3 em Carreirarte (flag=true, único piloto), com **>= 50 entradas válidas** (pares start+end completos). Ao final, gera relatório baseline via `analyze-metrics.ts`, captura os números do CA-08 e arquiva o relatório no repo do plugin para consumo da Onda 2.

Esta fase é majoritariamente **wait time** — trabalho ativo do dev é ~1h (mid-checkpoint + relatório final).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `<licitar>/.claude/metrics/2026-05.jsonl` | Modify (apenas leitura) | Populado naturalmente pelo uso |
| `<carreirarte>/.claude/metrics/2026-05.jsonl` | Modify (apenas leitura) | Populado naturalmente pelo uso (telemetria ignora flag) |
| `anti-vibe-coding/docs/baseline-v53-onda1.md` | Create | Relatório baseline arquivado para consumo da Onda 2 |
| `.planning/2026-05-04-v53-plugin-adaptativo/plano05/MEMORY.md` | Modify | Registrar checkpoint mid-flight, números finais, OQs resolvidas |

---

## Implementacao

### Caminho crítico (calendário sugerido)

| Data | Marco | Acao |
|------|-------|------|
| 2026-05-05 | Início | fase-03 concluída; uso normal de Licitar começa |
| 2026-05-12 | Mid-checkpoint | Rodar `analyze-metrics` em Licitar; ver count de pares válidos; estender prazo se < 25 |
| 2026-05-19 | Fim | Rodar `analyze-metrics` final em Licitar e Carreirarte; gerar relatório baseline |

> **G15:** datas são sugeridas. Se o uso real de Licitar for esparso (feriado, foco em outros projetos), aceitar deslizar fim para 2026-05-26 ou 2026-06-02.

### Passo 1: Mid-checkpoint (2026-05-12)

Trabalho ativo: ~15 minutos.

```bash
bun run F:/Projetos/Claude\ code/anti-vibe-coding/scripts/analyze-metrics.ts --projects "F:/Projetos/Licitar"
```

Decisões nesse ponto:
- Se `Pares validos >= 25` → on track, continuar
- Se `Pares validos < 25` → considerar uso forçado (planejar uma feature pequena em Licitar usando o pipeline completo) ou estender prazo
- Se `Linhas malformadas > 5%` → investigar bug em telemetria-utils, possível regressão no Plano 03
- Se `Taxa de abandono > 30%` → investigar; pode indicar problema de UX nas skills (registrar em MEMORY.md como `BUG-X`)

Registrar em `MEMORY.md`:
```markdown
- **Checkpoint 2026-05-12:** N pares válidos, M malformadas, taxa abandono X%, perfis detectados: {...}
```

### Passo 2: Coleta final (2026-05-19)

Trabalho ativo: ~30 minutos.

```bash
# Licitar (flag=true)
bun run F:/Projetos/Claude\ code/anti-vibe-coding/scripts/analyze-metrics.ts \
  --projects "F:/Projetos/Licitar" \
  --month 2026-05 \
  --ascii \
  > /tmp/baseline-licitar.txt

# Carreirarte (flag=false) — input para fase-05
bun run F:/Projetos/Claude\ code/anti-vibe-coding/scripts/analyze-metrics.ts \
  --projects "E:/Programas/Carreirarte - Novo Design" \
  --month 2026-05 \
  > /tmp/baseline-carreirarte.txt

# Agregado
bun run F:/Projetos/Claude\ code/anti-vibe-coding/scripts/analyze-metrics.ts \
  --projects "F:/Projetos/Licitar,E:/Programas/Carreirarte - Novo Design" \
  --month 2026-05 \
  --ascii \
  > /tmp/baseline-agregado.txt
```

### Passo 3: Validar CA-11

Abrir `/tmp/baseline-licitar.txt` e confirmar:
- [ ] Linha `Pares validos: N` com `N >= 50`
- [ ] Bloco "Por skill" com pelo menos 5 skills distintas (cobertura mínima do pipeline)
- [ ] Bloco "Por perfil" mostrando o perfil detectado em Licitar com count > 0

Se `N < 50` após 14 dias:
1. Estender prazo em + 7 dias (registrar em MEMORY.md como DEV-1)
2. Comunicar ao Luiz que a Onda 1 está em standby

### Passo 4: Arquivar relatório baseline no plugin

Criar `anti-vibe-coding/docs/baseline-v53-onda1.md`:

```markdown
# Baseline v5.3 Onda 1 — Dogfooding em Licitar

**Periodo:** 2026-05-05 a 2026-05-19 (14 dias)
**Projeto piloto:** Licitar (flag = true)
**Projeto controle:** Carreirarte (flag = false — ver fase-05 para validacao CA-12)

---

## Numeros do CA-08

| Metrica | Valor |
|---------|-------|
| Pares validos coletados | {N} |
| Linhas malformadas | {M} |
| Token medio estimado por skill | {valor} |
| Perfil mais usado | {perfil} |
| Taxa de abandono | {X}% |
| Tempo medio por fase do pipeline | {ver tabela} |

## Output completo

(colar aqui o output de /tmp/baseline-licitar.txt)

## Open Questions resolvidas

| OQ | Resposta empirica |
|----|-------------------|
| OQ1 (metricas exatas de sucesso) | {decidir com base nos numeros acima} |
| OQ3 (threshold 80% do detector) | {confirmado / ajustar para X%} |
| OQ11 (telemetryEnabled flag) | {adiar para Onda 2 / adicionar ja} |

## Notas para Onda 2

- Token Tax audit deve focar em: {skill com maior token estimado avg}
- Comprehension Debt tracking pode comecar com: {fase com maior duracao avg}
- Distribuicao de perfis no piloto: {dado real}
```

### Passo 5: Atualizar MEMORY.md

```markdown
## Open Questions resolvidas neste plano

- **OQ1:** {decisao com base nos numeros}
- **OQ3:** {confirmacao do threshold 80%}
- **OQ11:** {decisao sobre telemetryEnabled flag}

## Metricas finais

| Metrica | Valor |
|---------|-------|
| Pares validos em Licitar | {N} |
| Pares validos em Carreirarte | {M} (entrada para fase-05) |
| Linhas malformadas total | {X} |
| Bugs encontrados em uso real | {Y} (referenciar BUG-X) |
```

---

## Gotchas

- **G6 do plano:** "50 entradas" significa 50 pares VÁLIDOS (start+end completos), não 50 linhas brutas. Script reporta esses dois números separadamente.
- **G7 do plano:** 2 semanas é bloqueio físico. Não acelerável.
- **G15 do plano:** Datas sugeridas — registrar datas reais em MEMORY.md.
- **Local:** Se Luiz só usar 2-3 skills durante o piloto (ex: só `plan-feature` + `execute-plan`), o relatório ficará concentrado. Aceitar — baseline reflete uso real, não uso ideal.
- **Local:** Se telemetria mostrar % alta de abandono, pode ser sinal de skill mal projetada. Investigar em fase-04, não em fase-05/fase-06.
- **Local:** Tokens estimados podem vir todos como `0` se Plano 03 fase-01 implementar default `0` (G6 do Plano 03). Aceitar — relatório usa palavra "estimado" e a baseline serve para Onda 2 calibrar Token Tax.

---

## Verificacao

### Checklist

- [ ] Mid-checkpoint executado em 2026-05-12 (ou data real registrada)
- [ ] Relatório final gerado em 2026-05-19 (ou data real registrada)
- [ ] `/tmp/baseline-licitar.txt` contém `Pares validos: N` com `N >= 50`
- [ ] `/tmp/baseline-licitar.txt` contém todas 4 métricas do CA-08
- [ ] `anti-vibe-coding/docs/baseline-v53-onda1.md` criado e committado
- [ ] MEMORY.md atualizado com OQs resolvidas e métricas finais
- [ ] Nenhum bug crítico em telemetria descoberto durante o piloto (ou bugs registrados em MEMORY.md como BUG-X)

### TDD

N/A — fase operacional + agregação via script.

---

## Criterio de Aceite

**Por maquina:**
- `bun run anti-vibe-coding/scripts/analyze-metrics.ts --projects "<licitar>"` reporta `Pares validos: N` com `N >= 50` (CA-11 cumprido)
- `anti-vibe-coding/docs/baseline-v53-onda1.md` existe e contém os 4 números do CA-08

**Por humano:**
- Relatório arquivado responde às OQ1, OQ3, OQ11 com base em dados reais
- MEMORY.md mostra trajetória do dogfooding (início, checkpoint, fim) com datas concretas
- Onda 2 tem inputs claros para Token Tax e Comprehension Debt (campos nomeados, não vagos)

---

<!-- Gerado por /plan-feature em 2026-05-04 -->
