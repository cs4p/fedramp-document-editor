# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install JS dependencies
bun install

# Pull remote schema/rules files from GitHub into public/ (all source repos are public, no auth needed)
bun run sync

# Run dev server (hot-reload, no build needed)
bun run dev

# Build production bundle → dist/
bun run build

# Launch desktop app (pywebview serving dist/ on port 8080)
# Requires 'bun run build' first
uv run python app.py

# Set up the Python environment (installs requests/pywebview/json-schema-for-humans
# from pyproject.toml/uv.lock — the source of truth for Python deps)
uv sync

# Run the Vitest unit suite
bun run test

# Run the Playwright browser suite (first run: bunx playwright install chromium)
bun run test:e2e

# Both suites in sequence
bun run test:all

# Purge previously-synced public/fedramp-*.json before re-syncing
bun run sync:clean

# Validate public/samples/* against their schemas
bun run validate:samples
```

For the web interface without the desktop wrapper, run `bun run dev` and open the local Vite URL, or run `bun run build && python -m http.server --directory dist`.

Note: `build_docs.py` is referenced by an older workflow for generating `schema_docs.html` but does not currently exist in the repo — treat that command as aspirational until the script is restored.

## Architecture

### Schema

The editor is schema-agnostic: `src/config.js` ships a `SCHEMA_CATALOG` of every published document type from [fedramp/schemas](https://github.com/fedramp/schemas) (SDR, COP, Ongoing Certification Report, Incident Report, Significant Change Notification, Accepted Vulnerability Info, Vulnerability Detail Report, Historical Vulnerability Activity, Advisor/Assessor Information). A dropdown in the navbar (`App.jsx`) lets the user switch documents; each schema is lazy-fetched via `src/utils/schemaLoader.js` (local `public/` copy first, falling back to the live GitHub raw URL) and `$ref`s into `fedramp-common-definitions-schema-2026-06-24.json` are inlined (`src/utils/schemaRefs.js`) so Ajv never needs to resolve cross-file URIs at runtime.

`bun run sync` pulls all of the above (plus the FRMR consolidated rules, `public/fedramp-consolidated-rules.json`) from GitHub into `public/`; see `scripts/sync-public.js` for the full file list. `bun run sync:clean` purges previously-synced files first (see "Commands" above).

The FRMR consolidated rules file is the source for two enums patched into whichever schema is active at runtime (`App.jsx`'s `loadSchemaAndRules`, via `patchFRMRSchema`/`patchRV5Schema`, both built on the shared `src/utils/schemaPatch.js:patchEnumField` helper):
- The FRMR requirement list (`frrID`/`frId`/`FR_ID` enum, depending on schema version) — `patchFRMRSchema` in `src/utils/frmr.js`.
- The Rev5 NIST control catalog (`controlId` enum), read from `FRR.FRC.data.rev5.CSF['FRC-CSF-BSL'].varies_by_class` (per-class control lists, unioned and deduped) — `patchRV5Schema` in `src/utils/rv5.js`.

The older, superseded CR26 schemas (`cr26SecurityDecisionRecord.schema.json`, `cr26CertificationOverviewPackage.schema.json`) and the `sampleSDR_fgc_*.json` fixtures that use their shape still live in `public/` for reference/testing; `BASE_UI_SCHEMA` (`src/utils/uiSchema.js`) supports both the old and new field names side by side (see "Updating the uiSchema" below).

### Frontend (`src/`)

React app built with Vite. Uses:
- **[React JSON Schema Form (RJSF)](https://rjsf-team.github.io/react-jsonschema-form/)** (`@rjsf/bootstrap-4`) to render the schema as an interactive form
- **`@rjsf/validator-ajv8`** with `Ajv2020` for JSON Schema 2020-12 validation
- **react-simplemde-editor** (EasyMDE) as a custom RJSF widget for `"format": "markdown"` fields
- **Bootstrap 4** for styling

Custom RJSF widgets:
- `markdown` (`src/widgets/MarkdownWidget.jsx`) — SimpleMDE editor; applied via `uiSchema`, and auto-detected on any string field whose schema `description` contains "May use Markdown for formatting." (see `src/utils/uiSchema.js:buildMarkdownUiSchema`)
- `uniqueEnumSelect` (`src/widgets/UniqueEnumSelectWidget.jsx`) — generic enum `<select>` that disables values already chosen elsewhere in the document; which set of "already chosen" values it checks against is passed per-field via `'ui:options': { formContextKey: 'selectedFRIDs' | 'selectedControlIds' }` (both keys are populated on `formContext` in `App.jsx`). Used for both the requirement ID (`frrID`/`frId`/`FR_ID`) and NIST control ID (`controlId`) fields.

Files are loaded and saved locally; use the Load File / Download buttons in the toolbar.

### HTML preview

`src/utils/htmlPreview.js`'s `buildPreviewHtml(schema, formData, options)` renders whichever schema/formData is currently active as a standalone, read-only HTML document, shown via the "Preview HTML" toolbar button (toggles a full-viewport `<iframe sandbox="">` in place of the form; the empty sandbox blocks all scripting, which is the app's XSS defense against a maliciously-crafted loaded JSON file). It's schema-agnostic by design — a single recursive renderer walks `schema.properties` using the same `title`/`description`/`enum`/`enumNames`/`type` metadata RJSF itself uses to build the form, rather than a template per document type. Markdown fields render via `marked` (an explicit dependency; also used transitively by `easymde`). Requirement/control ID fields get a human-readable title for free, with no separate lookup: `patchFRMRSchema`/`patchRV5Schema` already set matching `enum`/`enumNames` pairs on those fields by the time `activeSchema` is in state, and the renderer just displays `enumNames[i]` alongside the raw value whenever it differs from it. `$ref` resolution reuses `resolveLocalRef` (`src/utils/schemaRefs.js`), the same helper `buildMarkdownUiSchema` uses.

### Custom validation rules

Beyond JSON Schema validation, the app can check a document against a **rules file** — a declarative list of additional checks (`src/utils/rulesEngine.js`) for things JSON Schema can't express well, e.g. "if `frrImplementationStatus` is `Implemented`, `frrValidation` must be non-empty."

- **Rule shape**: `{ id, description, severity ("error"|"warning"), path, check, value, message?, when? }`.
- **`path`** is a dot path into the form data where `[]` means "every item of this array" (wildcard) and `[n]` a specific index, e.g. `fedRampRequirements[].frrImplementation`.
- **`check`** is one of: `required`/`exists`, `forbidden`/`notExists`, `equals`, `notEquals`, `oneOf`, `notOneOf`, `matches`/`notMatches` (regex), `minLength`/`maxLength`, `min`/`max`, `minCount`/`maxCount` (across all wildcard matches).
- **`when`** optionally gates the rule on a sibling condition, evaluated relative to the matched row (or from the document root if `when.path` starts with `$.`).

A rules file is either a bare array of rules or `{ "rules": [...] }`. Two ways rules get loaded in the app:
1. **Default rules per schema** — if `public/rules/<schema-file>.rules.json` exists, it's auto-loaded whenever that schema is selected (see `defaultRulesUrl` / `loadDefaultRules` in `src/utils/schemaLoader.js`). Example: `public/rules/fedramp-security-decision-record-schema-2026-06-24.rules.json`.
2. **Load Rules button** — the user can load any local rules JSON file, which overrides the schema default until the schema is switched again (reverting to that schema's default, or none).

Violations show up in the "Rules" badge/panel in the navbar, separate from the schema-validity badge. Add new rules by editing/creating a `public/rules/*.rules.json` file; see `tests/rulesEngine.test.js` for the full behavior of each check.

`docs/rules-engine.md` is the user-facing guide to all of the above (path syntax, per-check semantics, `when` gating, authoring workflow) — keep it in sync when the engine, its checks, or the rules-loading UI change.

### Desktop wrapper (`app.py`)

Starts a `SimpleHTTPRequestHandler` on port 8080 serving `dist/`, then opens a `pywebview` window at `http://localhost:8080/index.html`. Supports PyInstaller frozen bundles via `sys._MEIPASS`.

### Testing

- **`bun run test`** — Vitest unit tests (`tests/`), pure Node-side logic: rules engine, FRMR/Rev5 extraction and enum patching, schema-loader fetch fallbacks, `$ref` inlining. `vite.config.js`'s `test.exclude` keeps this runner out of `e2e/`.
- **`bun run test:e2e`** — Playwright browser tests (`e2e/`): every `SCHEMA_CATALOG` entry selects and renders with no console errors (`schemas.spec.js`), every `public/samples/*.sample.json` fixture loads into its schema's form without error (`fixtures.spec.js`), and a full Load File → Download JSON round trip (`file-io.spec.js`). `playwright.config.js` boots its own `bun run dev` server.
- **`bun run test:all`** — both, in sequence. CI (`.github/workflows/deploy.yml`) runs this on every push and pull request against `main`; `build`/`deploy` depend on it passing and are skipped on PR runs.

### Fixtures

`public/samples/<schema-file>.sample.json` — one hand-authored, schema-valid sample per `SCHEMA_CATALOG` entry, describing a consistent fictitious CSP (and a separate fictitious advisor/3PAO for the Advisor/Assessor Information samples) across the SDR/COP/reporting fixtures. Validate with `bun run validate:samples` (`scripts/validate-samples.mjs`, using the same Ajv2020 + `customizeValidator` config as `App.jsx`) after editing any fixture. These are distinct from the legacy `public/sampleSDR_fgc_*.json` files, which only cover the retired CR26 schema shape (see "Schema" above).

### Pending major dependency upgrades

`@rjsf/*` (5→6), `bootstrap` (4→5), `react`/`react-dom` (18→19), and `vite` (5→8) all have major versions available but are deliberately deferred — each is a breaking-change surface (RJSF widget/registry API, Bootstrap class names, React 19 peer-dep compatibility with RJSF 5.x, Vite major bump) that needs its own dedicated pass and full re-validation across all 10 schemas rather than a routine dependency bump. `bun outdated` surfaces the current gap; only same-major patch/minor bumps (e.g. the `vitest` 4.1.8→4.1.10 bump) should be taken opportunistically.

### KSI data model (inside the schema)

In the current (2026-06-24) SDR schema, `keySecurityIndicators` is a top-level array, separate from `fedRampRequirements`. Each entry has `ksiId`, `ksiImplementationStatus`, `ksiImplementation[]`/`ksiValidation[]`/`ksiAssessment[]` (each an array of markdown strings), `ksiTests[]` (plain strings), and `ksiEvidence[]` (objects with `evidenceType`, `evidenceDescription`, `evidenceLocation` (URI), `evidenceText`, and `lastUpdated` — no `oneOf` constraint; any subset of the evidence fields may be present). `fedRampRequirements` entries follow the same `frrImplementation`/`frrValidation`/`frrAssessment` shape but have no `ksiTests`/`ksiEvidence` equivalent.

The older, superseded CR26 schema nested KSI-like content differently: each FedRAMP requirement held an array of `securityAchievement` objects, each with a `security_achievement_description` (markdown) and `securityTests[]` (each with `frequency`, `automated`, `security_test_description`, `command`, and an `evidence[]` array requiring exactly one of `evidenceLocation`/`evidenceContent`/`evidenceText` via `oneOf`). This shape only applies to `cr26SecurityDecisionRecord.schema.json` and the `sampleSDR_fgc_*.json` fixtures.

## Updating the uiSchema

When a schema changes (new arrays added, fields renamed, new schema file adopted), `BASE_UI_SCHEMA` in `src/utils/uiSchema.js` (and related code in `src/App.jsx`) must be kept in sync. To update:

1. **Find all array fields** in the schema:
   ```bash
   python3 -c "
   import json
   with open('public/<schema-file>.json') as f:
       s = json.load(f)
   def find_arrays(obj, path='root'):
       if isinstance(obj, dict):
           if obj.get('type') == 'array':
               print(f'{path}: {obj.get(\"title\", \"(no title)\")}')
           for k, v in obj.items():
               if k not in ('\$defs',):
                   find_arrays(v, f'{path}.{k}')
       elif isinstance(obj, list):
           for i, v in enumerate(obj):
               find_arrays(v, f'{path}[{i}]')
   find_arrays(s)
   "
   ```

2. **For each array**, ensure `BASE_UI_SCHEMA` in `src/utils/uiSchema.js` has matching `addButtonLabel` / `removeButtonLabel` under `'ui:options'`. Use the item's title to form the label (e.g., title "Leveraged Services" → "Add Leveraged Service" / "Remove Leveraged Service").

3. **For string fields with `"format": "markdown"`**, add `'ui:widget': 'markdown'` at the field path in `BASE_UI_SCHEMA` (or rely on `buildMarkdownUiSchema`'s auto-detection if the field's `description` already contains the markdown marker).

4. **For a requirement/control ID field** (unique-enum selector), add `'ui:widget': 'uniqueEnumSelect'` plus `'ui:options': { formContextKey: 'selectedFRIDs' }` (requirement IDs) or `'formContextKey': 'selectedControlIds'` (control IDs) at that field path in `BASE_UI_SCHEMA`. Also update the enum-patching target in `src/utils/frmr.js`'s `patchFRMRSchema` / `src/utils/rv5.js`'s `patchRV5Schema` — each targets `schema?.properties?.<path>` or `schema?.$defs?.<defName>?.properties?.<fieldName>` — and update `selectedFRIDs`/`selectedControlIds` in `App.jsx` to read from the correct path in `formData`.

5. **Check field name differences** between schemas (e.g., `FR_ID` vs `frId`, `keySecurityIndicators.fedRAMP_requirements` vs top-level `fedRampRequirements`). `BASE_UI_SCHEMA` supports both the 20x and CR26 schemas simultaneously by including both key variants.
