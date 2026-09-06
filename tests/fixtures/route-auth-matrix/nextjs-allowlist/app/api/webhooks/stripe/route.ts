// 2026-09-05 (Luiz/dev): POST declarado publico — sem a allowlist seria critical (metodo mutante, D9).
export async function POST() {
  return new Response(null, { status: 204 })
}
