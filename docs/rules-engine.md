# The Rules Engine

JSON Schema validation answers one question: *is this document structurally well-formed?* It is good at types, required keys, enums, and patterns, but it is awkward or impossible to use for conditional, cross-field, and editorial policy — "if you said a requirement is `Implemented`, you have to say how you validated that", or "at least one Key Security Indicator must be documented".

The **rules engine** (`src/utils/rulesEngine.js`) fills that gap. It evaluates a declarative list of checks against the form data on every keystroke and reports violations in the **Rules** badge in the navbar, entirely separate from the schema **Valid / Invalid** badge. Rules never block editing, saving, or downloading — they are advisory guidance layered on top of schema validation.

- **Rules are data, not code.** A rules file is plain JSON. Adding a rule means editing a JSON file, not writing JavaScript.
- **Rules are schema-agnostic.** The engine knows nothing about SDRs or KSIs; it just walks paths into whatever object the form currently holds. The same file format works for every document type in the schema picker.

---

## Using rules in the editor

### Default rules per schema

When you select a document type, the app looks for `public/rules/<schema-file>.rules.json` and auto-loads it if present. For example, selecting the Security Decision Record loads:

```
public/rules/fedramp-security-decision-record-schema-2026-06-24.rules.json
```

If no such file exists, no rules are loaded and the badge reads **Rules: none loaded**. Only two schemas ship default rules today (SDR and Certification Package Overview); the rest are unconstrained beyond their schemas.

### Loading your own rules

Click **Load Rules** in the toolbar and pick a local `.json` file. Your file replaces whatever was loaded (default or previous custom) and stays active until you switch document types — switching reloads that schema's default rules, or clears rules if it has none. A malformed file raises an alert and leaves the current rules in place.

Use this to try out a rule before committing it to `public/rules/`, or to apply organization-specific policy that doesn't belong in the shared repo.

### Reading the results

The **Rules** badge summarizes the current state:

| Badge | Meaning |
|---|---|
| `Rules: none loaded` (grey, disabled) | No rules file is active |
| `Rules: OK` (grey) | Rules are loaded and every one passes |
| `Rules: 0 error(s), 2 warning(s)` (yellow) | Only warnings are failing |
| `Rules: 3 error(s), 1 warning(s)` (red) | At least one error-severity rule is failing |

Click the badge to open the panel, which lists each violation with its severity, message, and the concrete data path that failed — including the resolved array index, e.g. `fedRampRequirements[2].frrValidation`, so you can find the offending row in the form. The panel header names the active rules source, and **Clear** unloads rules until you switch schemas.

---

## Writing a rules file

A rules file is either a bare array of rules or an object with a `rules` array. Both of these are valid:

```json
[ { "id": "…", "path": "…", "check": "required" } ]
```

```json
{ "rules": [ { "id": "…", "path": "…", "check": "required" } ] }
```

### Rule shape

```json
{
  "id": "sdr-frr-implemented-needs-validation",
  "description": "Requirements marked \"Implemented\" should include a validation statement",
  "severity": "warning",
  "path": "fedRampRequirements[].frrValidation",
  "check": "required",
  "value": null,
  "message": "Add a validation statement for this requirement.",
  "when": { "path": "frrImplementationStatus", "check": "equals", "value": "Implemented" }
}
```

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Unique identifier for the rule. A rule with no `id` is itself reported as a violation. |
| `path` | yes | Dot path into the form data identifying the value(s) to check. See [Path syntax](#path-syntax). |
| `check` | yes | Which comparison to apply. See [Checks](#checks). |
| `value` | depends | Operand for checks that need one (`equals`, `oneOf`, `matches`, `minLength`, `minCount`, …). Ignored by `required`/`forbidden`. |
| `description` | no | Human-readable explanation; used as the violation message when `message` is absent. |
| `message` | no | Overrides `description` in the violations panel. Falls back to `Rule "<id>" failed` if neither is set. |
| `severity` | no | `"error"` (default) or `"warning"`. Anything other than `"warning"` is treated as `"error"`. |
| `when` | no | Gate — the rule is only evaluated where this condition holds. See [Conditional rules](#conditional-rules-when). |

A rule that is malformed (unknown `check`, missing `id`, `oneOf` without an array `value`) does not crash the app and does not silently disappear: it surfaces in the panel as an error-severity violation reading `Invalid rule definition: …`. That is your feedback loop while authoring.

### Path syntax

Paths are dot-separated keys, with two array forms:

| Path | Resolves to |
|---|---|
| `serviceIdentification.serviceName` | A single nested value |
| `fedRampRequirements[]` | Every item of the array (wildcard — one match per item) |
| `fedRampRequirements[].frrID` | The `frrID` of every requirement |
| `fedRampRequirements[0].frrID` | The `frrID` of the first requirement only |
| `keySecurityIndicators[].ksiEvidence[].evidenceLocation` | Nested wildcards — every evidence entry of every KSI |

A wildcard produces one violation per failing item, each reported at its concrete index.

**Important asymmetry:** a wildcard over a missing or empty array yields *no matches*, so a `required` rule on `fedRampRequirements[].frrID` stays silent when there are no requirements at all. A non-wildcard path that doesn't exist yields one match with an `undefined` value, so `required` on `serviceIdentification.serviceName` does fire when the field is missing. To require that an array is non-empty in the first place, use `minCount` (below) rather than `required` on a wildcard path.

### Checks

| Check | Passes when |
|---|---|
| `required` / `exists` | Value is non-empty — not `undefined`, `null`, `""`, or `[]` |
| `forbidden` / `notExists` | Value *is* empty, by that same definition |
| `equals` / `notEquals` | Strict `===` / `!==` comparison against `value` |
| `oneOf` / `notOneOf` | `value` (which **must** be an array) contains / does not contain the value |
| `matches` / `notMatches` | Value is a string matching the regex in `value`. `notMatches` also passes for non-strings. |
| `minLength` / `maxLength` | Value is a string or array whose `length` is ≥ / ≤ `value`. Fails for any other type. |
| `min` / `max` | Value is a number ≥ / ≤ `value`. Fails for any other type. |
| `minCount` / `maxCount` | The number of **non-empty** matches for `path` across all wildcards is ≥ / ≤ `value` |

Notes worth internalizing:

- Regexes are written as JSON strings, so backslashes are doubled: `"\\s"` matches whitespace, `"^KSI-[A-Z]{3}-\\d{2}$"` matches a KSI ID.
- `minLength` on a value that is neither a string nor an array *fails* rather than being skipped. Pair it with `when` if the field is legitimately optional.
- `minCount`/`maxCount` are the only checks that aggregate; every other check is evaluated once per match. Because they count only non-empty values, `minCount: 1` on `fedRampRequirements[].frrID` means "at least one requirement with an ID filled in".

### Conditional rules (`when`)

`when` is a mini-rule — `{ path, check, value }` — evaluated before the main check. If it fails, the main check is skipped for that match, producing no violation.

Its `path` is resolved **relative to the matched row**: the nearest enclosing object reached through the last wildcard in the rule's `path`. So for a rule on `fedRampRequirements[].frrValidation`, a `when.path` of `frrImplementationStatus` refers to the sibling field in the *same* requirement:

```json
{
  "id": "sdr-frr-implemented-needs-validation",
  "description": "Requirements marked \"Implemented\" should include a validation statement describing how that was confirmed",
  "severity": "warning",
  "path": "fedRampRequirements[].frrValidation",
  "check": "required",
  "when": { "path": "frrImplementationStatus", "check": "equals", "value": "Implemented" }
}
```

Prefix `when.path` with `$.` to resolve from the document root instead — useful for gating on a value that lives elsewhere in the document. This one (against the Certification Package Overview schema) requires a phone number on every contact, but only for government-only deployments:

```json
{
  "id": "cop-gov-only-contacts-need-phone",
  "description": "Government-Only Cloud offerings must list a phone number for every contact",
  "path": "contactInformation[].contactPhone",
  "check": "required",
  "when": { "path": "$.serviceProperties.deploymentModel", "check": "equals", "value": "Government-Only Cloud" }
}
```

If the rule's `path` has no wildcard, the "row" is the whole document, so a bare `when.path` and a `$.`-prefixed one behave identically there.

---

## Adding rules to the repo

1. **Pick the target file.** Default rules live at `public/rules/<schema-file>.rules.json`, where `<schema-file>` exactly matches the schema's filename in `public/` with `.json` → `.rules.json`. `bun run sync` never touches `public/rules/`, so these files are yours to maintain.

2. **Find the real field paths.** Rule paths are paths into *form data*, which mirrors the schema's property structure. Inspect the schema, or — faster — inspect the matching fixture in `public/samples/`, which is already schema-valid and shows the exact nesting and array shapes.

3. **Write the rule**, keeping `id` unique within the file and stable over time (it identifies the rule in the panel).

4. **Choose a severity honestly.** `error` for things that make a package incomplete or self-contradictory; `warning` for editorial guidance and house style. Everything renders in the same panel, and the badge turns red only for errors.

5. **Test it.** Two levels:
   - **Interactively** — `bun run dev`, select the document type, click **Load File** and open the sample fixture from `public/samples/`, then read the Rules panel. The fixtures are intended to be clean, so a new rule firing against one is a signal: either the rule is wrong or the fixture needs updating.
   - **As a unit test** — `tests/rulesEngine.test.js` exercises `resolvePath`, `normalizeRulesFile`, and `runRules` directly, and is the definitive reference for each check's behavior. Add a case there for any non-obvious rule, and run `bun run test`.

6. **Watch for over-strictness.** Rules run against partially-filled forms the whole time the user is typing. A rule that fires on every empty new array row is noise; gate it with `when` so it only speaks up once the row is meaningfully filled in.

---

## Worked example

Requiring that any KSI evidence entry pointing at a URL also records when it was last checked:

```json
{
  "id": "sdr-ksi-evidence-location-needs-date",
  "description": "Evidence that links to an external location must record when it was last updated",
  "severity": "error",
  "path": "keySecurityIndicators[].ksiEvidence[].lastUpdated",
  "check": "required",
  "when": { "path": "evidenceLocation", "check": "required" }
}
```

Reading it out: for every evidence entry of every KSI (`[]` twice), *if* that entry has a non-empty `evidenceLocation` (the `when`, resolved against the evidence entry itself — the last wildcard's row), *then* `lastUpdated` must be non-empty. Entries with no location are skipped entirely, and a KSI with no evidence array contributes no matches at all.

---

## Reference

| Thing | Where |
|---|---|
| Engine implementation | `src/utils/rulesEngine.js` |
| Behavior of every check | `tests/rulesEngine.test.js` |
| Default-rules lookup (`defaultRulesUrl`, `loadDefaultRules`) | `src/utils/schemaLoader.js` |
| Badge, panel, **Load Rules** wiring | `src/App.jsx` |
| Shipped rules files | `public/rules/` |