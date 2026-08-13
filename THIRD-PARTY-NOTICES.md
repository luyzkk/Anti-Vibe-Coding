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

`skills/wizard/` is **derived** from the `wizard` skill in the same repository, at the same commit `84fdeff`.

**Upstream files used:**

1. `skills/engineering/wizard/SKILL.md`
2. `skills/engineering/wizard/template.sh`

**Derived:**

- `template.sh`: near-verbatim copy of the 204-line upstream script — the wizard library (everything above the `STAGES` marker) is deliberately unmodified, since identical UX across generated wizards is the point
- `SKILL.md`: the four-step process (`Escopar o procedimento`, `Mapear a jornada de cada estagio`, `Escrever o wizard`, `Verificar e entregar`), translated to pt-BR with each step's completion criterion preserved

**Original to this repository** (no upstream counterpart):

- Two fixes to `template.sh`, both commented inline: `_existing` strips a trailing CR so a CRLF `.env` cannot send an invisible `\r` into `write_env` / `set_secret`; and the `explorer.exe` branch of `open_url` is treated as unconditional success, because it exits 1 even when it opened the browser (measured on Windows 11 / Git Bash)
- `SKILL.md`: the `AskUserQuestion` boundary, `Correcoes nossas sobre o template original`, `Common Rationalizations`, `Red Flags`, and the frontmatter (upstream models two states; this plugin has eight fields)
- `skills/wizard/template.test.ts`: static guards for the template

`skills/domain-modeling/` is **derived** from the `domain-modeling` skill in the same repository, at the same commit `84fdeff`.

**Upstream files used:**

1. `skills/engineering/domain-modeling/SKILL.md`
2. `skills/engineering/domain-modeling/CONTEXT-FORMAT.md`

**Derived** (translated to pt-BR; `ubiquitous language` kept in English as an anchor term):

- `SKILL.md`: the active-vs-passive boundary in the opening paragraph, the four session disciplines (`Challenge against the glossary`, `Sharpen fuzzy language`, `Discuss concrete scenarios`, `Cross-reference with code`) including their intervention lines, `Update CONTEXT.md inline` (as `Gravar no momento`), and the "it is a glossary and nothing else" rule (as `O que entra no glossario`)
- `references/GLOSSARY-FORMAT.md`: the entry structure, and the `Be opinionated` / `Keep definitions tight` / `Group terms under subheadings` rules

**Original to this repository** (no upstream counterpart):

- `SKILL.md`: `Fronteira com o decision-registry`, `Common Rationalizations`, `Red Flags`, and the frontmatter (upstream declares two fields; this plugin has eight)
- Upstream's `Only include terms specific to this project's context` rule moved out of the format file into `SKILL.md`, and its test was rewritten. Upstream asks whether a concept is unique to this context or general programming; that question excludes a common word carrying a divergent local meaning, which is the highest-value entry a glossary can hold

**Not ported:**

- `ADR-FORMAT.md` and the `Offer ADRs sparingly` section — this plugin's `decision-registry` skill already covers ADRs in more depth (numbering, lifecycle, full template), so the upstream ADR half is absorbed there rather than duplicated here
- The `File structure` section, `CONTEXT-MAP.md` and the whole multi-context model — this plugin scaffolds a single `docs/GLOSSARY.md` per repo
- Lazy file creation — `docs/GLOSSARY.md` is scaffolded by `/init` instead

Upstream's `agents/openai.yaml` was **not** ported — it is an OpenAI-specific display manifest with no counterpart in this plugin's frontmatter model.

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
