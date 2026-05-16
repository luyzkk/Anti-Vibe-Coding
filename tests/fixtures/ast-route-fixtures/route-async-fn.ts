// 2026-05-16 (Luiz/dev): fixture CA-01 — função async nomeada (caso comum em route.ts)
export async function POST(req: Request) {
  const body = await req.json()
  return new Response(JSON.stringify(body))
}
