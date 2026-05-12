// 2026-05-12 (Luiz/dev): slug helper compartilhado entre fase-04 (lessons) e fase-05 (ADRs).
// Pre-criado pelo orquestrador antes de disparar fase-04/05 em paralelo (evita race no Write).
// Plano 03 — Migration v5 → v6.

/**
 * Normaliza string em kebab-case sem acentos.
 * - Lowercase, separador '-'.
 * - Remove diacriticos (NFD) e qualquer nao-alfanum.
 * - Limita a `maxLen` caracteres (evita filenames acima do MAX_PATH no Windows).
 */
export function slugify(input: string, maxLen: number = 50): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen)
    .replace(/-+$/, '')
}
