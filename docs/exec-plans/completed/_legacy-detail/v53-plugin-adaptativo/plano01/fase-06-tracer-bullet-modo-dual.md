# Fase 06 — Tracer Bullet do Modo Dual

**Plano:** 01 — Foundation
**Sizing:** ~1h
**Dependências:** fase-01 (tipos), fase-03 (flag), fase-04 (não estritamente — usa só JSON do manifest), fase-05 (referência da mensagem)
**Visual:** false

> **Nota destacada — Tracer Bullet.** Esta é a fase mais importante do Plano 01. Prova arquitetura end-to-end: manifest no disco → leitura tipada → output adaptado visível ao usuário. Sem detector real (profile mock hardcoded), sem instrumentação completa (sem telemetria), sem refatorar todas as 5 skills. Apenas `architecture` adaptando UMA mensagem. Se este caminho funcionar, o Plano 04 vai expandir; se este caminho quebrar, descobrimos o problema arquitetural agora — antes de investir 9h no Modo Dual completo.

## Objetivo

Adaptar a skill `architecture` para LER `architectureProfile` do manifest no início e mostrar UMA mensagem adaptada por perfil (cabeçalho do tipo "Recomendações para perfil: vertical-slice"). Profile mock hardcoded no manifest (não há detector ainda). Quando flag = `false`, comportamento v5.2 preservado integralmente. Quando flag = `true` E profile presente, output recebe o cabeçalho adaptado.

## Arquivos Afetados

- `anti-vibe-coding/skills/architecture/SKILL.md` (modificar) — adicionar bloco "Profile-aware preface" no topo do prompt
- `anti-vibe-coding/skills/lib/read-architecture-profile.ts` (criar) — helper `readArchitectureProfile(): ArchitectureProfile | null`
- `anti-vibe-coding/skills/lib/read-architecture-profile.test.ts` (criar) — testes de leitura
- `.claude/.anti-vibe-manifest.json` (modificar — fixture local) — adicionar profile mock `vertical-slice` e flag `true` para teste manual
- `anti-vibe-coding/skills/architecture/__tests__/tracer-bullet.test.ts` (criar) — teste de integração

## Contexto Técnico

D11 (modo dual: skill lê profile UMA vez no início, sem branching profundo). RF7 (lê profile uma vez, adapta saída).

Princípio: SKILL.md tem um bloco condicional no topo do tipo:

```markdown
<!-- profile-aware-preface:start -->
Before producing recommendations, read `.anti-vibe-manifest.json`. If
`architectureDetectorEnabled === true` AND `architectureProfile` is present,
prepend the output with:

  "Recomendações para perfil: <profile>"

Otherwise, behave exactly as v5.2 (no preface, no profile reading).
<!-- profile-aware-preface:end -->
```

Tracer Bullet **não** implementa lookup table de mensagens por perfil — isso é Plano 04. Aqui basta UMA mensagem que injeta o nome do perfil literal.

**Risco crítico:** se o teste de integração mostrar que a skill `architecture` ignora o preface, descobrimos um problema arquitetural no SKILL.md (provavelmente o prompt precisa de marcador mais explícito). Documentar achado em MEMORY.md como GOTCHA — Plano 04 herda.

## Snippets de Referência

```typescript
// read-architecture-profile.ts
import type { ArchitectureProfile } from "./manifest-types";
import { isFeatureEnabled } from "./feature-flags";

/**
 * Reads architectureProfile from `.anti-vibe-manifest.json`. Returns null when:
 * - feature flag is disabled
 * - manifest missing
 * - profile field absent
 * - profile field invalid
 *
 * Used by structural skills (architecture, plan-feature, write-prd, execute-plan,
 * verify-work) to adapt output once at the top of the prompt — no deep branching.
 *
 * @example
 *   const profile = readArchitectureProfile();
 *   if (profile) {
 *     // prepend "Recomendações para perfil: <profile.profile>"
 *   }
 */
export function readArchitectureProfile(): ArchitectureProfile | null;
```

Manifest mock para teste manual:

```json
{
  "version": "5.3.0",
  "architectureDetectorEnabled": true,
  "architectureProfile": {
    "profile": "vertical-slice",
    "confidence": 100,
    "detectedAt": "2026-05-04T00:00:00Z",
    "signals": ["mock:tracer-bullet"],
    "schemaVersion": 1
  }
}
```

## Plano TDD (RED → GREEN → REFACTOR)

### RED — Escrever testes primeiro
- [ ] `readArchitectureProfile returns null when flag is false`
- [ ] `readArchitectureProfile returns null when manifest is missing`
- [ ] `readArchitectureProfile returns null when profile field absent`
- [ ] `readArchitectureProfile returns parsed profile when flag true and profile valid`
- [ ] `architecture skill output contains "Recomendações para perfil: vertical-slice" when profile mocked`
- [ ] `architecture skill output identical to v5.2 baseline when flag false`
- [ ] Rodar `bun test` — vermelho

### GREEN — Implementação mínima
- [ ] Implementar `readArchitectureProfile` reusando `parseManifest` (fase-01) e `isFeatureEnabled` (fase-03)
- [ ] Modificar `SKILL.md` com bloco "profile-aware preface"
- [ ] Salvar manifest mock para o teste de integração
- [ ] Rodar `bun test` — verde

### REFACTOR — Limpeza
- [ ] `readArchitectureProfile` < 30 linhas
- [ ] Comentário WHY explicando por que retorna `null` em vez de lançar
- [ ] SKILL.md com marcadores HTML comment claros para o Plano 04 estender depois

## Checklist de Verificação

- [ ] Tracer Bullet passa: manifest com profile `vertical-slice` → output da skill começa com cabeçalho adaptado
- [ ] Comportamento v5.2 preservado quando flag `false` (verificado por teste de comparação com baseline)
- [ ] Helper `readArchitectureProfile` tem testes para 4 caminhos: flag-off, manifest-missing, profile-missing, profile-valid
- [ ] MEMORY.md atualizado com qualquer GOTCHA descoberto
- [ ] CA-04 coberto via teste explícito (output baseline = output com flag-off)
- [ ] CA-05 (preview) coberto: output muda visivelmente quando profile presente

## Critérios de Aceite do PRD Cobertos

- **CA-04** — Feature flag desligada preserva v5.2. Teste de comparação com baseline é a evidência.
- **CA-05 (preview)** — Modo Dual adapta saída. Apenas 1 mensagem; expansão completa é Plano 04.
- **D11** — Modo dual implementado com princípio "lê UMA vez, adapta saída".
- **RF7** — Lê profile UMA vez no início, sem branching profundo.

## Próxima Fase

Final do Plano 01. Próximo plano: **Plano 02 — Architecture Detector** (heurística real substitui o profile mock). Plano 03 (Telemetria) também pode iniciar em paralelo a partir daqui.
