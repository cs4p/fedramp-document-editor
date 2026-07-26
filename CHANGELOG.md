# Changelog

All notable changes to this project are documented in this file. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- `docs/rules-engine.md` — full guide to the custom validation rules engine: what it's for, how default/user-loaded rules reach the app, how to read the Rules badge and panel, rule-file format, path syntax, exact semantics of every check, `when` gating, and a workflow for authoring and testing new rules. Summarized in a new "Custom validation rules" section in `README.md`.

## [0.2.0] - 2026-07-15

### Added
- "Preview HTML" — renders the currently-loaded document as a nicely-formatted, read-only HTML page in place of the form. Schema-agnostic (`src/utils/htmlPreview.js` walks whichever schema is active, no per-document template), covering all 10 document types. Rendered into a sandboxed iframe for safety.
- `bun run sync:clean` (`scripts/sync-public.js --clean`) purges previously-synced `public/fedramp-*.json` files before re-fetching, so schemas renamed or removed upstream no longer linger locally.
- `public/samples/<schema-file>.sample.json` — one hand-authored, schema-valid sample document per entry in `SCHEMA_CATALOG` (previously only the retired CR26 schemas had sample data). Validate with `bun run validate:samples`.
- Playwright browser test suite (`e2e/`) covering every schema's load/render, every sample fixture's load, the Preview HTML toggle, and a Load File → Download JSON round trip. CI now runs `bun run test` and `bun run test:e2e` on every push/PR to `main`, gating the build/deploy job.

### Changed
- `src/App.jsx` decomposed from a single 632-line file into `src/utils/uiSchema.js` (`BASE_UI_SCHEMA`), `src/utils/schemaLoader.js` (fetch helpers), `src/utils/schemaPatch.js` + `frmr.js`/`rv5.js` (`patchFRMRSchema`/`patchRV5Schema`) — no behavior change.
- `FRIDSelectWidget`/`NISTControlSelectWidget` merged into a single `UniqueEnumSelectWidget`, parameterized by `ui:options.formContextKey`; `CustomAddButton`/`CustomRemoveButton` merged into a single `CustomArrayButton`.
- Python dependencies (`requests`, `pywebview`, `json-schema-for-humans`) are now locked for real in `pyproject.toml`/`uv.lock` via `uv add`, replacing `requirements.txt` as the source of truth (`uv sync` instead of `uv pip install -r requirements.txt`).
- `vitest` bumped 4.1.8 → 4.1.10 (the only same-major update available across the JS dependency set at time of writing; `@rjsf/*`, `bootstrap`, `react`, and `vite` all have pending major upgrades tracked in `CLAUDE.md`).
- `readme.md` renamed to `README.md` and rewritten to reflect the current 10-schema catalog, `src/config.js`, `public/samples/`, and the test suites.
- `$ref`-resolution logic deduplicated into `src/utils/schemaRefs.js`'s `resolveLocalRef`, shared by `buildMarkdownUiSchema` and the new HTML preview renderer.

### Removed
- `scripts/build_sfcp.py` and `scripts/build_dogstash_frr.py` — orphaned CR26-era sample-data generators for output files (`sampleSDR_sfcp_*.json`, `sampleSDR_dogstash_*.json`) that no longer exist in the repo.

## [0.1.0] - 2026-07 (approximate, first tagged baseline)

### Added
- Multi-schema catalog: the editor became schema-agnostic, supporting all 10 published FedRAMP 20x document types (SDR, COP, Ongoing Certification Report, Incident Report, Significant Change Notification, Accepted Vulnerability Info, Vulnerability Detail Report, Historical Vulnerability Activity, Advisor Information, Assessor Information) via `SCHEMA_CATALOG`, replacing the earlier single-schema CR26 editor.
- Custom validation rules engine (`src/utils/rulesEngine.js`) for checks JSON Schema can't express well, loaded from a default `public/rules/<schema-file>.rules.json` per schema or a user-supplied rules file.
- Rev5 NIST control baseline enum, sourced from the FRMR consolidated rules file's per-class control lists.
- Dual-document editor UI, splitting the original combined CR26 schema into separate Certification Overview Package (COP) and Security Decision Record (SDR) documents.
- `scripts/sync-public.js` for pulling schema/rules files from the public FedRAMP GitHub repos into `public/`, keeping the GitHub Pages demo working offline.
- `sample-sdr` skill and hand-built sample fixtures (SFCP, DogStash, FGC) for exercising the editor against realistic data.
