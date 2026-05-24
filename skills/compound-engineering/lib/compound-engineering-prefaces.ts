// 2026-05-24 (Luiz/dev): prefaces por profile para compound-engineering — PRD fase-01.
// Plano 03 fases posteriores preenchem entradas por profile quando subcomandos forem implementados.
// Mesmo pattern de lessons-learned-prefaces.ts (G3 do plano — lookup table per-skill).
import type { ArchitectureProfileName } from '../../lib/manifest-types'

export const COMPOUND_ENGINEERING_PREFACE_BY_PROFILE: Partial<Record<ArchitectureProfileName, string>> = {
  // Nenhum profile especifico ainda — Plano 03 adiciona entradas conforme subcomandos forem implementados.
}

// 2026-05-24 (Luiz/dev): DEFAULT preserva comportamento v6.2 (CA-02) — string vazia = sem preface.
export const DEFAULT_COMPOUND_ENGINEERING_PREFACE = ''
