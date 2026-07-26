# Generate Sample FedRAMP 20x Packages

## Goal

Create realistic, schema-valid JSON documentation for a fictitious Cloud Service Provider (CSP) that can serve as a reference example. Output is two files: a Certification Overview Package (COP) and a Security Decision Record (SDR).

---

## Step 1: Gather requirements from the user

Before generating anything, ask the user for:

1. **Service description** — what does the service do, who uses it, what data does it handle?
2. **Certification class** — A, B, or C (see class definitions below)
3. **Real-world analog** — any existing commercial service(s) this fictional CSP should resemble (e.g., "like Splunk Cloud", "similar to AWS GovCloud")

Use the real-world analog to inform realistic values for architecture details, leveraged services, technology stack, and service description. Do not copy proprietary content verbatim — fictionalize names, URLs, and specifics.

---

## Step 2: Load reference material

The following files are already available locally — read them before generating content:

- **Rules & requirements**: `public/fedramp-consolidated-rules.json` — defines all FedRAMP Requirements and KSIs. Every requirement and KSI included in the output must come from this file.
- **COP schema**: `public/cr26CertificationOverviewPackage.schema.json` — governs the structure of the COP output file.
- **SDR schema**: `public/cr26SecurityDecisionRecord.schema.json` — governs the structure of the SDR output file.

Also fetch the following for narrative context and any schema updates:

- `https://github.com/fedramp/2026-markdown.git` — markdown guidance on the FedRAMP 20x program
- `https://github.com/fedramp/schemas.git` — authoritative schemas (use to check for updates vs. local copies)

---

## Step 3: Certification class definitions

The class drives both service thresholds and the depth of content required.

| Class | Detail level                                                          | Validation approach | Evidence requirement                 |
|-------|-----------------------------------------------------------------------|--------------------|--------------------------------------|
| **A** | Minimal — concise descriptions, respond only to requirements          | Manual or attestation-based | Narrative text sufficient            |
| **B** | Low — thorough descriptions for all requirements and KSIs             | Manual validation acceptable | Evidence text or locations required  |
| **C** | Moderate — detailed technical responses for all requirements and KSIs | Automated validation required wherever possible (`automated: true`) | plain text preferred over `evidenceLocation` URIs  |

---

## Step 4: Generate the COP (`sampleSDR_<abbr>_cop.json`)

Populate all required fields from `cr26CertificationOverviewPackage.schema.json`. Key fields to make realistic:

- `serviceIdentification` — plausible name, acronym, version, and provider
- `serviceDescription` — 2–4 sentences drawn from the real-world analog
- `contactInformation` — fictional but formatted correctly (emails, phone numbers)
- `leveragedServices` — include realistic FedRAMP-authorized dependencies (e.g., AWS GovCloud, Azure Government) with correct impact levels
- `certificationClass` — must match the class the user selected

Save to `public/sampleSDR_<abbr>_cop.json` where `<abbr>` is a short lowercase identifier for the service.

---

## Step 5: Generate the SDR (`sampleSDR_<abbr>_sdr.json`)

Populate all required fields from `cr26SecurityDecisionRecord.schema.json`. For every applicable FedRAMP Requirement and KSI from `fedramp-consolidated-rules.json`:

- Write a `security_achievement_description` (markdown) appropriate to the class level
- Include `securityTests[]` with realistic `frequency`, `automated` flag, `security_test_description`, and `command` values
- Include `evidence[]` entries — use `evidenceText` for Class A, `evidenceLocation` URIs for Class B/C, and prefer `evidenceContent` (base64) for Class C automated checks
- For Class C, set `automated: true` on tests that could realistically be scripted

Save to `public/sampleSDR_<abbr>_sdr.json`.

---

## Step 6: Validate

After generating both files:

1. Validate each file against its schema using the local schema files.
2. Report any validation errors and fix them before delivering.
3. Confirm both files are saved to `public/`.
