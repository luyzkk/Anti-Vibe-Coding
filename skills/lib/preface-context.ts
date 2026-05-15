/**
 * PrefaceContext helper — v6.3.0 (Adaptive Coaching, Eixo 2 Agent-Native).
 *
 * Encapsula a leitura do architecture profile em shape estável consumível por skills.
 * É wrapper deliberado de readArchitectureProfile — não duplica lógica de IO.
 *
 * Shape composto { profile, language, framework, confidence }:
 * - language e framework são null em v6.3.0 (slots reservados para v6.5/v6.6)
 * - confidence reflete diretamente o score do detector (0..100)
 *
 * @see docs/design-docs/adaptive-coaching-framework.md — migration guide para autores de skill
 * @see docs/design-docs/ADR-0020-adaptive-coaching.md — decisão D2 (shape composto)
 */

import * as path from "path";
import type { ArchitectureProfileName } from "./manifest-types";
import { readArchitectureProfile } from "./read-architecture-profile";

// 2026-05-14 (Luiz/dev): slots de linguagem e framework reservados para v6.5/v6.6
// (PRD §Decisão #2). Em v6.3.0 são sempre null — não hardcode lógica de preenchimento.
export type LanguageHint = "node-ts" | "rails" | (string & Record<never, never>);
export type FrameworkHint = "nextjs" | "rails" | (string & Record<never, never>);

/**
 * Shape de contexto adaptativo consumido pelas skills.
 * Estável: v6.5/v6.6 adicionarão language e framework sem quebrar chamadores atuais (CA-09).
 */
export type PrefaceContext = {
  /** Profile detectado pelo architecture detector, ou null se ausente/flag off. */
  profile: ArchitectureProfileName | null;
  /** Hint de linguagem — sempre null em v6.3.0; preenchido em v6.5/v6.6. */
  language: LanguageHint | null;
  /** Hint de framework — sempre null em v6.3.0; preenchido em v6.5/v6.6. */
  framework: FrameworkHint | null;
  /** Confiança do detector (0..100). Zero quando profile é null. */
  confidence: number;
};

// 2026-05-14 (Luiz/dev): constante imutável para evitar alocação desnecessária em cada chamada null — ref PRD §CA-02
const NULL_CONTEXT: PrefaceContext = {
  profile: null,
  language: null,
  framework: null,
  confidence: 0,
};

/**
 * Lê o PrefaceContext a partir do manifest do projeto.
 *
 * Wrapper de readArchitectureProfile — toda a lógica de guard (feature flag,
 * IO graceful, parse+validate) fica encapsulada lá. Esta função apenas adapta
 * o shape de ArchitectureProfile para PrefaceContext.
 *
 * Retorna NULL_CONTEXT quando readArchitectureProfile retorna null (qualquer motivo).
 * Nunca lança exceção.
 *
 * @param projectRoot - Diretório raiz do projeto (absoluto).
 *   O manifest é buscado em `{projectRoot}/.anti-vibe-manifest.json`.
 *
 * @example
 * // Em uma skill profile-aware
 * const ctx = readPrefaceContext(projectRoot)
 * const advice = getRecommendationForProfile(ctx.profile, ADVICE_TABLE, DEFAULT_ADVICE)
 */
export function readPrefaceContext(projectRoot: string): PrefaceContext {
  const manifestPath = path.join(projectRoot, ".anti-vibe-manifest.json");
  const archProfile = readArchitectureProfile(manifestPath);

  if (archProfile === null) {
    return NULL_CONTEXT;
  }

  return {
    profile: archProfile.profile,
    // 2026-05-14 (Luiz/dev): language null — aguarda v6.5 (PRD §Decisão #2)
    language: null,
    // 2026-05-14 (Luiz/dev): framework null — aguarda v6.6 (PRD §Decisão #2)
    framework: null,
    confidence: archProfile.confidence,
  };
}
