import { describe, test, expect } from "bun:test"
import { renderAsciiBars } from "../lib/ascii-chart"

describe("renderAsciiBars", () => {
  test("renderiza barras proporcionais ao max", () => {
    const out = renderAsciiBars([
      { label: "plan-feature", value: 20 },
      { label: "verify-work", value: 10 },
    ], 20)
    expect(out).toContain("plan-feature")
    // plan-feature barra: 20 chars de U+2588
    expect(out.split("\n")[0]!.split("\u2588").length - 1).toBe(20)
    // verify-work barra: 10 chars de U+2588
    expect(out.split("\n")[1]!.split("\u2588").length - 1).toBe(10)
  })

  test("retorna placeholder quando vazio", () => {
    expect(renderAsciiBars([])).toBe("(sem dados)")
  })

  test("nao quebra quando todos valores = 0", () => {
    // maxValue protegido com Math.max(..., 1) => divisao segura
    const out = renderAsciiBars([{ label: "x", value: 0 }])
    expect(out).toContain("x")
  })
})
