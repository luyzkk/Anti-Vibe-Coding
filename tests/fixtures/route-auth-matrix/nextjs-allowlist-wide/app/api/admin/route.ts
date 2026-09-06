// 2026-09-05 (Luiz/dev): fixture CA-04 — a entrada `/api/*` nao a cobre (ampla e recusada); sai critical.
export function GET() {
  return Response.json({ admin: true })
}
