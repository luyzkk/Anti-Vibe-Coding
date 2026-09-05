// 2026-09-03 (Luiz/dev): fixture CA-01 — rota admin fora do matcher. Sem import de next/* (G7).
export function GET() {
  return Response.json({ admin: true })
}
