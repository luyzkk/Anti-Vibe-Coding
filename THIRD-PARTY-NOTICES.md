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

`skills/incident-response/` absorbs material from the `diagnosing-bugs` skill in the same repository, at the same commit `84fdeff`. This is an absorption into a pre-existing skill, not a port: `incident-response` already existed here with its own flow, and keeps it.

**Upstream files used:**

1. `skills/engineering/diagnosing-bugs/SKILL.md`
2. `skills/engineering/diagnosing-bugs/scripts/hitl-loop.template.sh`

**Derived** (translated to pt-BR; `tight` and `red` kept in English as anchor terms):

- `SKILL.md`: the whole of upstream's `Phase 1 — Build a feedback loop` — the "this is the skill" framing, the disproportionate-effort instruction, the four-property completion criterion, and the gate that forbids hypothesising before a red-capable command exists
- `references/feedback-loops.md`: the ten ranked ways to build a loop, `Tighten the loop`, `Non-deterministic bugs`, `When you genuinely cannot build a loop`, and the `Redact` section
- `scripts/hitl-loop.template.sh`: verbatim copy of the 44-line upstream script, with one comment line reworded to say the agent generates the script and the user runs it

**Original to this repository** (no upstream counterpart), all pre-dating the absorption and deliberately kept:

- The flakiness classification tree (timing / environment / state / truly random, each with its action)
- The layer-location tree, including `the test itself` as a false-negative branch
- `Tratando Output de Erro como Dado Não Confiável` — treating logs and stack traces as diagnostic data rather than trusted instructions. Upstream redacts secrets; it has no injection boundary
- The post-fix autopsy, in particular the question *"why did it get past review and the existing tests?"*
- The cross-link between the flakiness tree and the loop's reproduction-rate section: upstream has no classification step to connect

**Not ported:**

- Upstream's `CONTEXT.md` read instruction — this plugin's per-feature `CONTEXT.md` is a different artifact (CO-01)

The hand-off to `/improve-codebase-architecture` was listed here as not ported while that skill had no counterpart. It does now (below), and the post-fix autopsy points at it — as a recommendation for the developer to run, since the skill is user-invoked in this plugin.

`skills/improve-codebase-architecture/` is **derived** from the `improve-codebase-architecture` skill in the same repository, at the same commit `84fdeff`.

**Upstream files used:**

1. `skills/engineering/improve-codebase-architecture/SKILL.md`
2. `skills/engineering/improve-codebase-architecture/HTML-REPORT.md`

**Derived** (translated to pt-BR; `deep`, `shallow`, `seam`, `leverage`, `locality` and `deletion test` kept in English as anchor terms):

- `SKILL.md`: the "scope before you scan — YAGNI" ordering (user direction → `git log` hot spots → widen the net) and its justification, the five friction questions the sub-agent explores organically, the deletion test as the entry filter, the ADR-conflict rule (only surface when the friction warrants reopening the decision, and mark it in the card), the card fields (files / problem / solution / benefits in leverage and locality / recommendation strength), the `Strong` / `Worth exploring` / `Speculative` badges, the closing top-recommendation section, and the stop at "which of these would you like to explore?"
- `references` split and the ephemeral-report design: a self-contained HTML file written to the OS temp directory, opened in the browser, with the absolute path always printed
- `references/HTML-REPORT.md` (upstream keeps it beside `SKILL.md`; this plugin's satellites live in `references/`, which is also what `generate-manifest.js` indexes): the HTML scaffold, the Mermaid-versus-hand-drawn rule (Mermaid when the relationship is graph-shaped; divs and SVG when the visual should be editorial), the four diagram patterns (graph, cross-section, mass diagram, call-graph collapse), the badge colour scheme (emerald / amber / slate), the dependency-category tag, the editorial style guidance (~320px diagrams, one accent colour, schematic labels), and the "if the diagram needs a paragraph, redraw the diagram" rule

**Original to this repository** (no upstream counterpart):

- The catalogue rule in the sub-agent brief — reference material read on demand is flat and long by design, so size is not a signal and the largest file in the repo is not a candidate for being large. Upstream has no equivalent guard, and without it the sweep reports valid content as architectural friction
- The `git rev-list --count HEAD` check before trusting the hot-spot ranking: a shallow clone yields truncated history and a ranking that is an artifact of the cut
- The three-outcome deletion test table (complexity vanishes / reappears scattered / reappears concentrated), which splits upstream's binary "concentrate or move" into the two signals that actually decide a candidate's strength
- The rule that a finding a previous audit refused for a load-bearing reason stays refused until the reason changes
- Per-step completion criteria, `Common Rationalizations`, `Red Flags`, and the frontmatter (upstream declares two fields; this plugin has eight)
- The whole Windows story in `HTML-REPORT.md`. Upstream resolves the temp dir from `$TMPDIR` falling back to `/tmp` (or `%TEMP%`) and opens with `start` — neither works in Git Bash, where `start` is a `cmd` builtin and `explorer.exe` needs a `cygpath -w` path and exits 1 even on success. Measured here: `/tmp` **is** the user's `%TEMP%`, so `${TMPDIR:-/tmp}` covers all three platforms with no Windows branch
- The offline story. Upstream states the CDNs as fact; this port wraps the Mermaid import in a `try/catch` that flags `data-offline`, revealing a banner and rendering the diagram source as a readable code block, plus an inline CSS floor so the page survives the Tailwind CDN failing too

**Not ported:**

- The grilling loop (upstream's step 3) and its inline side effects — glossary updates and ADR offers as decisions crystallise. Deferred (DI-25); this port ends at the question and hands off to `/anti-vibe-coding:design-twice`, Domain 5
- Upstream's `CONTEXT.md` as the domain glossary — this plugin keeps the domain language in `docs/GLOSSARY.md`, per DI-12/DI-13

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
