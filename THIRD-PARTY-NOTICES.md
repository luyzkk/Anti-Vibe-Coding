<!-- 2026-05-24 (Luiz/dev): NOTICES único — D14 + RF-15 do PRD nextjs-react-stack-knowledge, resolve R6. -->

# Third-Party Notices

This file lists third-party works that the Anti-Vibe-Coding plugin includes content **derived from** (not copied verbatim). Each entry preserves the upstream copyright notice and license text as required by the upstream license terms.

---

## Anti-Vibe-Coding plugin includes content derived from third-party works:

### agent-skills (Addy Osmani, MIT License)

The atoms in `knowledge/nextjs/atoms/*.md` are **distilled** from the `agent-skills` repository by Addy Osmani (MIT licensed). Distillation involves selecting senior patterns, anti-patterns, and decision criteria from upstream SKILL.md V2 files and rewriting them in the Anti-Vibe-Coding atom format (frontmatter + 4 mandatory sections). Each derivative atom lists the upstream SKILL.md V2 path in its frontmatter `sources:` field for audit traceability.

**Upstream license verified locally at:** `Infos/knowledge/NextJS/agent-skills-main/LICENSE` (the `Infos/` directory is `.gitignore`-d as reference material — the LICENSE file lives outside the public repo but its text is reproduced verbatim below per the MIT preservation clause).

**Upstream SKILL.md V2 files used as inspiration for `knowledge/nextjs/atoms/`:**

1. `nextjs-app-router-patterns V1` (`Infos/knowledge/NextJS/agent-skills-main/nextjs-app-router-patterns/SKILL.md`)
2. `nextjs-app-router-patterns V2` (`Infos/knowledge/NextJS/agent-skills-main/nextjs-app-router-patterns V2/SKILL.md`)
3. `nextjs-best-practices` (`Infos/knowledge/NextJS/agent-skills-main/nextjs-best-practices/SKILL.md`)
4. `nextjs-expert` (`Infos/knowledge/NextJS/agent-skills-main/nextjs-expert/SKILL.md`)
5. `nextjs-supabase-auth` (`Infos/knowledge/NextJS/agent-skills-main/nextjs-supabase-auth/SKILL.md`)
6. `nextjs-turbopack` (`Infos/knowledge/NextJS/agent-skills-main/nextjs-turbopack/SKILL.md`)

#### MIT License (verbatim from upstream LICENSE):

```
MIT License

Copyright (c) 2025 Addy Osmani

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

### skills (Matt Pocock, MIT License)

`skills/writing-for-agents/` is **derived** from the `writing-for-agents` skill in the [`mattpocock/skills`](https://github.com/mattpocock/skills) repository (MIT licensed), analysed at commit `84fdeff` (2026-08-06).

**Upstream files used:**

1. `skills/productivity/writing-for-agents/SKILL.md`
2. `skills/productivity/writing-for-agents/SKILL-MECHANICS.md`

**Derived sections** (translated to pt-BR, anchor terms kept in English; conceptual content and section order preserved):

- `SKILL.md`: `Context pointers`, `As duas cargas`, `Hierarquia da informacao`, `Steps e criterios de completude`, `Quando dividir`, `Leading words`, `Poda`
- `references/SKILL-MECHANICS.md`: `Dividir por invocacao`, `Router skills`, and the model- vs. user-invoked trade-off framing in `Invocation`

**Original to this repository** (no upstream counterpart):

- `SKILL.md`: `Armadilhas deste harness`, `docs/ vs runtime asset`, `Common Rationalizations`, `Red Flags`
- `references/SKILL-MECHANICS.md`: the frontmatter field table (rewritten for this plugin's eight fields — upstream models two states) and the measured frontmatter findings

#### MIT License (verbatim from upstream LICENSE):

```
MIT License

Copyright (c) 2026 Matt Pocock

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Future expansion

If future stacks (Phoenix? Go? Elixir?) include derivative content from third-party works, append additional sections (`### <upstream-name> (<author>, <license>)`) to this file. Keep this single file as the canonical NOTICES — do not split across matrix folders.
