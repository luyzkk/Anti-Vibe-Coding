# Fase 05: Validação CA-12 — isolamento entre Licitar (flag=true) e Carreirarte (flag=false)

**Plano:** 05 — Análise & Dogfooding
**Sizing:** 1h
**Depende de:** fase-04 (dogfooding completo, metrics de Carreirarte populados)
**Visual:** false

---

## O que esta fase entrega

Validação empírica do CA-12: **Carreirarte intocado durante o piloto**. Verifica via dois ângulos:
1. **Telemetria de Carreirarte** — todas as entradas têm `profile_arquitetura: "disabled"` (skill nunca leu profile pois flag=false)
2. **Snapshot de skill em Carreirarte** — invocação real de UMA skill estruturante produz output idêntico ao baseline v5.2 capturado na fase-03

Esta fase fecha o último critério de aceite da Onda 1.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `<carreirarte>/.claude/metrics/2026-05.jsonl` | Modify (apenas leitura) | Inspeção do conteúdo |
| `<carreirarte>/.claude/.anti-vibe-manifest.json` | Modify (apenas leitura) | Confirmar `architectureDetectorEnabled: false` |
| `anti-vibe-coding/docs/baseline-v53-onda1.md` | Modify | Adicionar seção "Validação CA-12" com evidência |
| `.planning/2026-05-04-v53-plugin-adaptativo/plano05/MEMORY.md` | Modify | Registrar resultado e snapshot de skill |

---

## Implementacao

### Passo 1: Validar telemetria de Carreirarte

Telemetria sempre escreve (Plano 03 G5), mas `profile_arquitetura` deve ser `"disabled"` quando flag=false (Plano 01 fase-02 documenta esse valor especial).

```bash
# Inspecionar arquivo bruto
cat "E:/Programas/Carreirarte - Novo Design/.claude/metrics/2026-05.jsonl" | wc -l
# Esperado: > 0 linhas (telemetria roda mesmo com flag=false)
```

```bash
# Validar que TODAS as entradas tem profile_arquitetura: "disabled"
cat "E:/Programas/Carreirarte - Novo Design/.claude/metrics/2026-05.jsonl" \
  | jq -r '.profile_arquitetura' \
  | sort -u
# Esperado: apenas "disabled" (uma linha)
```

Se aparecer outro valor (`null`, `"vertical-slice"`, etc), há violação de CA-12. Investigar:
1. Manifest de Carreirarte foi modificado por engano? Confirmar `architectureDetectorEnabled: false`
2. Alguma skill leu profile mesmo com flag=false? Possível bug em `readArchitectureProfile()` (Plano 04 fase-01) — registrar como BUG-X em MEMORY.md e abrir issue na Onda 1.

### Passo 2: Comparar count de invocações de skills entre Licitar e Carreirarte

Sanity check: se Carreirarte tem `Pares validos > 0`, isso é normal — skills foram usadas. CA-12 NÃO exige zero uso, exige comportamento idêntico ao v5.2.

```bash
bun run F:/Projetos/Claude\ code/anti-vibe-coding/scripts/analyze-metrics.ts \
  --projects "E:/Programas/Carreirarte - Novo Design" \
  --month 2026-05
```

Esperado:
- Bloco "Por perfil arquitetural" mostra apenas linha `disabled` com count = total de pares
- Pares válidos: qualquer N >= 0

### Passo 3: Snapshot de skill em Carreirarte

Invocar UMA skill estruturante em Carreirarte e capturar output completo:

```
/anti-vibe-coding:architecture
```

Salvar transcrição em `MEMORY.md` deste plano como `SNAPSHOT-CARREIRARTE-V53`.

### Passo 4: Comparar com baseline v5.2 da fase-03

Em fase-03 passo 7, foi salvo `SNAPSHOT-CARREIRARTE-BASELINE` (pré-dogfooding) ou snapshot pré-existente da v5.2.

Comparação esperada (CA-12):
- Mesmas seções no output
- Mesmas recomendações de alto nível
- **NENHUMA** mensagem nova como "perfil detectado:" ou "rode `/anti-vibe-coding:detect-architecture`" — flag=false suprime essas mensagens (G3 do Plano 04)
- **NENHUMA** linha do tipo "Modo Dual ativo" ou referência a `architectureProfile`

Diferenças aceitáveis (não viola CA-12):
- Versionamento do plugin (string como "v5.3" no rodapé) — atualização passiva, não comportamental
- Reordenação cosmética interna do template SE foi mudança de v5.2.x → v5.2.y antes de v5.3 (não relacionada à Onda 1)

### Passo 5: Documentar evidência

Adicionar seção em `anti-vibe-coding/docs/baseline-v53-onda1.md`:

```markdown
## Validação CA-12 — Isolamento entre repos

**Repo controle:** Carreirarte (flag = false durante todo o piloto)

### Evidência por telemetria

| Métrica em Carreirarte | Valor |
|------------------------|-------|
| Pares válidos coletados | {N} |
| Valores únicos de `profile_arquitetura` | apenas `"disabled"` |
| Linhas com `profile_arquitetura != "disabled"` | 0 |

### Evidência por snapshot

Snapshot de `/anti-vibe-coding:architecture` em Carreirarte (2026-05-19): idêntico ao baseline v5.2 (ver MEMORY.md do plano05).

Diferenças observadas:
- Nenhuma diferença comportamental (CA-12 cumprido).
- {Listar aqui qualquer diferença cosmética se houver}

### Conclusão

CA-12 cumprido: feature flag = false preserva comportamento v5.2 mesmo após plugin v5.3 instalado, mesmo com telemetria passiva ativa.
```

### Passo 6: Atualizar MEMORY.md

```markdown
## Bugs Descobertos
- (registrar aqui se algum BUG-X foi encontrado durante validação)

## Snapshot CA-12

### SNAPSHOT-CARREIRARTE-V53 (2026-05-19)
(transcrição completa do output de /architecture em Carreirarte)

### SNAPSHOT-CARREIRARTE-BASELINE (2026-05-04, fase-03 passo 7)
(transcrição já capturada anteriormente)

### Diff observado
- Nenhuma diferença comportamental
- Versão do plugin no rodapé: v5.2.x → v5.3.0 (atualização passiva)
```

---

## Gotchas

- **G11 do plano:** Telemetria roda em Carreirarte mesmo com flag=false. CA-12 valida pelo CAMPO `profile_arquitetura: "disabled"`, não pela ausência de metrics. Se inspecionar metrics e ver linhas, isso é esperado.
- **Local:** Se snapshot do v5.2 não foi capturado em fase-03 passo 7 (oversight), tentar reconstituir via histórico do Luiz ou rodar /architecture em projeto v5.2 puro. Se impossível, marcar CA-12 como "validado por telemetria apenas" e registrar gap em MEMORY.md.
- **Local:** "Idêntico" no snapshot significa idêntico em sentido comportamental, não idêntico byte-a-byte. Diferenças cosméticas como nome de versão no rodapé são aceitáveis. Documentar qualquer diferença.
- **Local:** Se `profile_arquitetura` aparecer com valor diferente de `"disabled"` em ALGUMA linha, investigar imediatamente — é violação de contrato e provável bug do Plano 04 fase-01 (`readArchitectureProfile` deveria retornar `null` quando flag=false, e telemetria deveria gravar `"disabled"`).

---

## Verificacao

### Checklist

- [ ] `cat <carreirarte>/.claude/metrics/2026-05.jsonl | jq -r '.profile_arquitetura' | sort -u` retorna apenas `disabled`
- [ ] `cat <carreirarte>/.claude/.anti-vibe-manifest.json | jq '.architectureDetectorEnabled'` retorna `false`
- [ ] Snapshot de `/architecture` em Carreirarte (2026-05-19) capturado em MEMORY.md
- [ ] Comparação com baseline v5.2 documentada (sem diferenças comportamentais OU diferenças listadas explicitamente como cosméticas)
- [ ] Seção "Validação CA-12" adicionada a `baseline-v53-onda1.md`

### TDD

N/A — fase operacional. Validação por inspeção manual + agregação via script.

---

## Criterio de Aceite

**Por maquina:**
- Comando `cat <carreirarte>/.claude/metrics/2026-05.jsonl | jq -r '.profile_arquitetura' | sort -u | wc -l` retorna `1` (único valor distinto)
- Único valor é literalmente `"disabled"`
- `<carreirarte>/.claude/.anti-vibe-manifest.json` permanece sem campo `architectureProfile` (ou com `null`)

**Por humano:**
- Snapshot de skill em Carreirarte é comportamentalmente equivalente ao v5.2
- Documentação da evidência em `baseline-v53-onda1.md` permite que terceiros reproduzam a validação
- MEMORY.md contém trilha completa: snapshots + diff + decisão

---

<!-- Gerado por /plan-feature em 2026-05-04 -->
