// 2026-05-12 (Luiz/dev): replica logica de `activePlanAppearsComplete` do .mjs do Andre.
// Helper canonico — reusado por /execute-plan (Plano 05 fase-05) com logica INVERSA:
// so move plano para completed/ se looksComplete === true.
// G6 do Plano 04: detector intencionalmente conservador.

/**
 * Heuristica: "este plano em `active/` parece completo (deveria estar em `completed/`)?"
 *
 * Algoritmo:
 * 1. Se ha marcador de trabalho pendente (`- [ ]`, "in progress", "pending", "blocked",
 *    "remaining work", "not done", "not complete"), retorna `false`.
 * 2. Caso contrario, conta sinais de conclusao em 4 categorias (Exit Criteria,
 *    Validation Log, Lessons Captured, frases de "ready"). Se >=2 sinais, retorna `true`.
 *
 * Documentado: falsos negativos sao OK (plano fica mais tempo em active/),
 * falsos positivos sao caros (autor recebe erro em PR sem motivo).
 *
 * @example
 * looksComplete('## Exit Criteria\n- [x] done\n\n## Validation Log\npassed ✅\n') // true
 * looksComplete('## Steps\n- [ ] pending\n') // false
 */
export function looksComplete(content: string): boolean {
  if (hasRemainingWorkMarker(content)) return false

  const signals = [
    /##\s*Exit Criteria[\s\S]*(?:\bmet\b|\bcomplete(?:d)?\b|\bdone\b|\bpassed\b|\bpassou\b|- \[x\])/i,
    /##\s*Validation Log[\s\S]*(?:\bpassed\b|\bpassou\b|✅|- \[x\])/i,
    /##\s*Lessons Captured[\s\S]*(?:no new capture|no compound capture|no separate compound|not needed|skipped|captured|added|created|linked)/i,
    /(?:ready for review|ready to ship|ready for production|implementation complete|work complete|completed)/i,
  ]

  return signals.filter((pattern) => pattern.test(content)).length >= 2
}

function hasRemainingWorkMarker(content: string): boolean {
  const markers = [
    /\bremaining work\b/i,
    /\bpending\b/i,
    /\bblocked\b/i,
    /\bin progress\b/i,
    /\bnot complete(?:d)?\b/i,
    /\bnot done\b/i,
    /- \[ \]/,
  ]
  return markers.some((pattern) => pattern.test(content))
}
