# FedRAMP Document Editor

A web-based and desktop interface for creating and editing FedRAMP 20x package submissions. The editor is schema-agnostic: a dropdown lets you switch between every published FedRAMP document type (Security Decision Record, Certification Package Overview, Ongoing Certification Report, Incident Report, Significant Change Notification, Accepted Vulnerability Info, Vulnerability Detail Report, Historical Vulnerability Activity, Advisor Information, Assessor Information — see `src/config.js`). Schemas, FedRAMP requirements, and NIST control IDs can be fetched live from the official FedRAMP GitHub repos or served locally after running `bun run sync`.

> **Live demo:** [cs4p.github.io/fedramp-document-editor](https://cs4p.github.io/fedramp-document-editor/)

---

## Quick Start (Web)

```bash
bun install
bun run sync   # pull schemas + rules to public/ — all source repos are public, no auth needed
bun run dev
```

Open [http://localhost:5173](http://localhost:5173). NOTE: The port number is dynamically assigned so may be different in your environment.

After `bun run sync` the app works fully offline — no token or network access needed at runtime.

### Syncing local files

`bun run sync` has no configuration or `.env` file to set up. It fetches a fixed set of sources — pinned to a specific commit for the FRMR rules (so a re-sync is reproducible), and `main` for the schema catalog — and writes them to `public/` under standardized names. See `scripts/sync-public.js` for the exact URLs:

| Source | Local file |
|---|---|
| FRMR consolidated rules (also carries the Rev5 NIST control baseline, at `FRR.FRC.data.rev5.CSF['FRC-CSF-BSL']`) | `public/fedramp-consolidated-rules.json` |
| Every `*.json` file in the [fedramp/schemas](https://github.com/fedramp/schemas) repo root (SDR, COP, Ongoing Certification Report, Incident Report, and the rest — discovered dynamically via the GitHub contents API, not hardcoded) | `public/<schema-file>.json` |

These files are committed to the repo so the GitHub Pages demo works without runtime GitHub access. Re-run `bun run sync` and commit whenever the upstream sources change.

Run `bun run sync:clean` (`node scripts/sync-public.js --clean`) to first delete every previously-synced `public/fedramp-*.json` file before re-fetching — useful when upstream has renamed or removed a schema file, since a plain re-sync never deletes files it no longer recognizes. `--clean` only touches files this script owns; the legacy `cr26*.schema.json` fixtures, `public/rules/`, and `public/samples/` are never touched.

## Desktop App

Requires the production build to be run first.

```bash
bun run build
uv run python app.py
```

This opens a `pywebview` window serving the built app locally on port 8080. Set up the Python environment first with `uv sync` (installs `requests`, `pywebview`, and `json-schema-for-humans` from `pyproject.toml`/`uv.lock`).

---

## Workflow

1. **Pick a document type** — use the schema dropdown in the navbar to switch between the 10 published FedRAMP document types. Each schema is lazy-fetched on first selection.

2. **Load data** — click **Load File** and pick a local `.json` file, or start from a blank form. Realistic, schema-valid sample data for every document type lives in `public/samples/` (see [Fixtures](#fixtures) below).

3. **Fill the form** — key behaviors:
   - The requirement ID dropdown (`frrID`/`frId`/`FR_ID`, depending on schema) is populated live from the FRMR consolidated rules and enforces unique selection across all entries.
   - The NIST control ID dropdown is populated live from the Rev5 control baseline in the FRMR consolidated rules and enforces unique selection across all entries.
   - Fields whose schema description includes "May use Markdown for formatting." automatically render a rich Markdown editor.

4. **Check custom rules** — the **Rules** badge in the navbar shows violations from the schema's default rules file (if one exists at `public/rules/<schema-file>.rules.json`), or load your own with **Load Rules**. See [Custom validation rules](#custom-validation-rules) below.

5. **Save / export**:
   - **Download JSON** — saves the current form data as a local `.json` file.
   - **Preview HTML** — renders the current form data as a nicely-formatted, read-only HTML document (collapsible sections, markdown rendering, requirement/control titles) in place of the form; click **← Edit Form** to go back.
   - **Restore** — resets the form back to whatever was last loaded via **Load File**.

The **Valid / Invalid** badge in the toolbar reflects live JSON Schema 2020-12 validation.

---

## Custom validation rules

JSON Schema validation covers structure — types, required keys, enums, patterns. The **rules engine** covers the policy JSON Schema can't express well: conditional and cross-field checks like "a requirement marked `Implemented` must also carry a validation statement", or "at least one Key Security Indicator must be documented".

Rules are plain JSON, not code, and the engine is schema-agnostic — the same file format applies to every document type. A rules file is either a bare array of rules or `{ "rules": [...] }`, and each rule looks like this:

```json
{
  "id": "sdr-frr-implemented-needs-validation",
  "description": "Requirements marked \"Implemented\" should include a validation statement",
  "severity": "warning",
  "path": "fedRampRequirements[].frrValidation",
  "check": "required",
  "when": { "path": "frrImplementationStatus", "check": "equals", "value": "Implemented" }
}
```

- **`path`** is a dot path into the form data, where `[]` means "every item of this array" and `[n]` a specific index.
- **`check`** is one of `required`/`exists`, `forbidden`/`notExists`, `equals`, `notEquals`, `oneOf`, `notOneOf`, `matches`/`notMatches`, `minLength`/`maxLength`, `min`/`max`, `minCount`/`maxCount`.
- **`when`** optionally gates the rule on a condition evaluated against the matched row (or from the document root with a `$.` prefix).
- **`severity`** is `error` (default) or `warning`; violations never block editing or saving.

Rules reach the app two ways: a schema's default file at `public/rules/<schema-file>.rules.json` is auto-loaded whenever that document type is selected, and **Load Rules** loads any local rules JSON, overriding the default until you switch schemas. Results appear in the **Rules** badge and panel in the navbar, separate from the schema-validity badge, with the concrete failing path (e.g. `fedRampRequirements[2].frrValidation`) for each violation.

**→ Full guide: [`docs/rules-engine.md`](docs/rules-engine.md)** — path syntax, every check's exact semantics, conditional rules, and a step-by-step walkthrough for authoring and testing new rules. `tests/rulesEngine.test.js` is the executable reference for each check.

---

## Testing

```bash
bun run test       # Vitest unit tests (pure logic: rules engine, schema patching, $ref inlining, ...)
bun run test:e2e   # Playwright browser tests — every schema loads, every sample fixture loads, file I/O
bun run test:all   # both, in sequence
```

The Playwright suite (`e2e/`) starts its own dev server (`bun run dev`) automatically; no separate setup is needed beyond `bunx playwright install chromium` on first run. CI runs both suites on every push and pull request against `main` before building/deploying (`.github/workflows/deploy.yml`).

## Fixtures

`public/samples/<schema-file>.sample.json` holds one hand-authored, schema-valid sample document per entry in `src/config.js`'s `SCHEMA_CATALOG`, describing a consistent fictitious CSP across the SDR/COP/reporting fixtures. Validate them against their schemas with `bun run validate:samples`. The older `sampleSDR_fgc_*.json` and `cr26*.schema.json` files in `public/` are retained for reference against the retired CR26 schema shape only — see `CLAUDE.md`.

---

## Project Structure

```
.
├── docs/
│   └── rules-engine.md                  # Full guide to the custom validation rules engine
├── public/
│   ├── fedramp-*.json                   # synced by bun run sync (schemas + FRMR consolidated rules)
│   ├── samples/
│   │   └── fedramp-*.sample.json        # one hand-authored sample per current schema
│   ├── rules/
│   │   └── fedramp-*.rules.json         # default custom-validation rules per schema (optional, auto-loaded)
│   ├── sampleSDR_fgc_cop.json           # legacy CR26-shaped sample (reference/testing only)
│   ├── sampleSDR_fgc_sdr.json           # legacy CR26-shaped sample (reference/testing only)
│   ├── cr26SecurityDecisionRecord.schema.json        # superseded schema (reference/testing only)
│   └── cr26CertificationOverviewPackage.schema.json  # superseded schema (reference/testing only)
├── scripts/
│   ├── sync-public.js                   # Fetches remote schema/rules files to public/ (bun run sync[:clean])
│   └── validate-samples.mjs             # Validates public/samples/* against their schemas
├── src/
│   ├── App.jsx                          # Root component: navbar, RJSF form, schema/rules load orchestration
│   ├── config.js                        # SCHEMA_CATALOG — every document type in the schema picker
│   ├── main.jsx                         # React entry point
│   ├── widgets/
│   │   ├── MarkdownWidget.jsx           # SimpleMDE editor for markdown fields
│   │   └── UniqueEnumSelectWidget.jsx   # requirement/control ID dropdown with uniqueness enforcement
│   ├── utils/
│   │   ├── frmr.js                      # Extracts + patches the FRMR requirement ID enum
│   │   ├── rv5.js                       # Extracts + patches the Rev5 NIST control ID enum
│   │   ├── schemaPatch.js               # Shared enum-patching helper used by frmr.js/rv5.js
│   │   ├── schemaLoader.js              # Schema/rules fetch helpers (local-first, GitHub fallback)
│   │   ├── schemaRefs.js                # Inlines cross-file $refs + resolveLocalRef $ref-resolution helper
│   │   ├── uiSchema.js                  # BASE_UI_SCHEMA + markdown-field auto-detection + merge helper
│   │   ├── htmlPreview.js / .css        # Schema-agnostic "Preview HTML" renderer (buildPreviewHtml)
│   │   └── rulesEngine.js               # Custom validation rules engine
│   └── templates/
│       ├── CustomArrayButton.jsx        # "Add X" / "Remove X" buttons with descriptive labels
│       └── CustomArrayFieldItemTemplate.jsx  # Top-aligns remove buttons
├── e2e/                                  # Playwright browser tests
├── tests/                                # Vitest unit tests
├── app.py                               # pywebview desktop wrapper (serves dist/)
└── .github/workflows/deploy.yml        # Runs tests, then builds and deploys to GitHub Pages on push to main
```

## Tech Stack

| Concern | Library |
|---|---|
| Build | [Vite](https://vitejs.dev/) + React 18 |
| Form rendering | [@rjsf/bootstrap-4](https://rjsf-team.github.io/react-jsonschema-form/) |
| Validation | [@rjsf/validator-ajv8](https://github.com/rjsf-team/react-jsonschema-form/tree/main/packages/validator-ajv8) (JSON Schema 2020-12) |
| Markdown fields | [react-simplemde-editor](https://github.com/RIP21/react-simplemde-editor) |
| Markdown rendering (HTML preview) | [marked](https://marked.js.org/) |
| Unit tests | [Vitest](https://vitest.dev/) |
| Browser/e2e tests | [Playwright](https://playwright.dev/) |
| Desktop wrapper | [pywebview](https://pywebview.flowrl.com/) |

---

> This tool is a draft/notional implementation and is not intended for production use.
