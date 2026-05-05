# Convenção: Modo Dual em Skills (v5.3+)

Skills estruturantes que adaptam saída ao perfil arquitetural detectado seguem
ESTA convenção. Ela existe para evitar branching profundo e manter as skills
manuteníveis (RNF Manutenibilidade do PRD v5.3).

## Regra única

> Leia o profile UMA vez no topo da skill. Adapte a saída via UMA lookup table.

## Forma canônica

```typescript
import { readArchitectureProfile, getRecommendationForProfile } from '../lib/read-architecture-profile'
import type { ArchitectureProfileName } from '../lib/manifest-types'

// 1. Lookup table — Record com EXATAMENTE 5 chaves (uma por perfil canônico)
const RECOMMENDATIONS: Record<ArchitectureProfileName, string> = {
  'clean-architecture-ritual': '...',
  'mvc-flat': '...',
  'vertical-slice': '...',
  'nextjs-app-router': '...',
  'unknown-mixed': '...',
}

// 2. Fallback — comportamento v5.2 (quando profile é null)
const DEFAULT_RECOMMENDATION = '...'

// 3. UMA leitura, UMA resolução — sem ramificações profundas
const profile = readArchitectureProfile()
const recommendation = getRecommendationForProfile(
  profile?.profile ?? null,
  RECOMMENDATIONS,
  DEFAULT_RECOMMENDATION,
)
```

## Quando `readArchitectureProfile` retorna null

O helper retorna `null` silenciosamente (sem throw) em quatro situações:

| Situação | Causa | CA |
|----------|-------|----|
| Flag desabilitada | `architectureDetectorEnabled: false` no manifest | CA-04 |
| Manifest ausente | Arquivo ainda não foi gerado (projeto novo) | CA-10 |
| Campo ausente | Manifest pré-v5.3 sem `architectureProfile` | CA-10 |
| Perfil inválido | Valor não pertence aos 5 perfis canônicos | — |

Quando `null`, a skill **segue o comportamento v5.2 intacto** via `DEFAULT_RECOMMENDATION`.
Opcionalmente, a skill pode exibir UMA linha sugerindo executar o detector de arquitetura.

## Anti-padrões

- `if (profile === 'A') {...} else if (profile === 'B') {...}` espalhado pela skill
- Múltiplas chamadas a `readArchitectureProfile()` na mesma execução da skill
- Lookup table com menos de 5 chaves (5 perfis exatos — D4 do PRD)
- Throw quando profile é `null` — silent fallback é a regra (CA-04, CA-10)
- Adaptar comportamento ANTES de ler o profile (flag check é o primeiro guard)

## Testes com fixtures

Em testes, passe o caminho absoluto do fixture como `manifestPath`:

```typescript
import { readArchitectureProfile } from '../lib/read-architecture-profile'

// Lê fixture direto — sem criar diretório temporário
const profile = readArchitectureProfile(path.join(__fixtures__, 'manifests', 'vertical-slice.json'))
expect(profile?.profile).toBe('vertical-slice')
```

Fixtures canônicas vivem em `skills/lib/__fixtures__/manifests/`.
Uma fixture por perfil + `no-profile.json` (CA-10) + `flag-disabled.json` (CA-04) + `invalid-profile.json`.

## Referências

- `skills/lib/read-architecture-profile.ts` — implementação do helper e de `getRecommendationForProfile`
- `skills/lib/manifest-types.ts` — union `ArchitectureProfileName` com os 5 perfis canônicos
- `docs/architecture-profiles.md` — descrição completa dos 5 perfis
