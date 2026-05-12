# Upgrade: v5.2 → v5.3

Guia técnico para atualizar projetos rodando Anti-Vibe Coding v5.2 para v5.3.

---

## TL;DR

- v5.3 é **opt-in**. Sem ação, comportamento v5.2 é preservado integralmente.
- Para ativar Modo Dual: setar `architectureDetectorEnabled: true` no manifest e rodar `/anti-vibe-coding:detect-architecture`.
- **Telemetria passiva tem coleta não-funcional na v5.3** (BUG-02 — ver "Known limitations" abaixo). Fix planejado para Onda 2.

---

## Passo 1: Atualizar plugin

Use o método de update do seu setup:

```
/anti-vibe-coding:sync
```

Após:

```bash
bun -e 'const m = await Bun.file(".claude/.anti-vibe-manifest.json").json(); console.log("pluginVersion:", m.pluginVersion)'
# Esperado: "pluginVersion: 5.3.0" ou superior
```

---

## Passo 2: (opcional) Ativar Architecture Detector

Edite `.claude/.anti-vibe-manifest.json`:

```json
{
  "pluginVersion": "5.3.0",
  "architectureDetectorEnabled": true
}
```

Depois rode:

```
/anti-vibe-coding:detect-architecture
```

O detector vai:

1. Amostrar `src/`
2. Classificar em 1 de 5 perfis com score 0-100%
3. Pedir confirmação se score < 80%
4. Persistir em `architectureProfile` do manifest + gerar `.claude/architecture-profile.md`

**Nota empírica (Onda 1):** projetos Vite + React SPA podem cair em `unknown-mixed` exigindo override manual. Perfil dedicado está sob avaliação para Onda 2.

---

## Passo 3: (opcional) Verificar Modo Dual

Invoque uma skill estruturante e veja saída adaptada:

```
/anti-vibe-coding:architecture
```

A recommendation table virá adaptada ao perfil detectado — diferente do output genérico v5.2.

---

## Passo 4: Inspecionar telemetria (atualmente não-funcional)

```bash
bun run anti-vibe-coding/scripts/analyze-metrics.ts
```

Script existe e funciona, mas **vai reportar 0 pares válidos** na v5.3 — a coleta em si está bloqueada por BUG-02 (ver abaixo). O script já está pronto para consumir telemetria real assim que o fix da Onda 2 entrar.

---

## Compatibilidade

- Manifest sem campo `architectureProfile` continua válido. Skills detectam ausência e degradam para v5.2 silenciosamente (CA-10).
- Planos em curso em `.planning/` não são modificados.
- Suite de 224 testes verdes ao final da Onda 1.

---

## Reverter

Para voltar ao comportamento v5.2 sem desinstalar:

```json
{
  "architectureDetectorEnabled": false
}
```

Skills voltam ao comportamento v5.2 imediatamente (CA-04).

---

## Privacidade (D7 — irreversível)

Nenhum dado sai do repo. Sem network calls. Sem upload remoto.

---

## Known limitations

### BUG-02 — Coleta de telemetria não-funcional

A instrumentação adicionada nas 10 `SKILL.md` é tratada como prompt markdown pelo agente Claude, não como código executável. Resultado: `writeTelemetryStart`/`writeTelemetryEnd` nunca executam durante invocação real de skills.

**Status:** known issue. Fix planejado para Onda 2 (par `PreToolUse`+`PostToolUse` em `hooks.json` correlacionando por `tool_use_id`).

**Impacto se você ativar a flag agora:**
- `/detect-architecture` funciona normalmente.
- Modo dual em skills estruturantes funciona normalmente (CA-05 cumprido).
- `.claude/metrics/YYYY-MM.jsonl` **não será populado**. O diretório `metrics/` nem é criado.
- Nenhuma regressão funcional — comportamento das skills é o esperado, apenas a observabilidade está cega.

Detalhes em [baseline-v53-onda1.md](baseline-v53-onda1.md) e [release-notes-v53.md](release-notes-v53.md).

### Vite + React SPA → `unknown-mixed`

Detector cai em fallback para projetos Vite+SPA. Override manual via `/detect-architecture` aceita; ou via `bun run scripts/analyze-metrics.ts --set <perfil>` para forçar perfil específico.

---

<!-- Gerado em 2026-05-12 (fase-06 do Plano 05 — Onda 1 v5.3) -->
