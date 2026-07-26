# Generate Sample SDR

Generate a realistic sample Security Decision Record (SDR) JSON file for a fictitious organization pursuing FedRAMP authorization.

## Arguments

`$ARGUMENTS` — optional description of the fictitious organization (e.g., "a healthcare data analytics SaaS", "a geospatial mapping platform for civilian agencies"). If omitted, invent a plausible federal-market SaaS.

Flags (may appear anywhere in `$ARGUMENTS`):
- `--assessed` — populate the `assessed` object on every security test to simulate a completed 3PAO assessment (see Step 6).

## Instructions

Create a complete, realistic SDR JSON file at `public/sampleSDR_<acronym>.json` following the schema in `public/cr26.schema.json`.

### Step 1 — Design the organization

Invent a specific, internally consistent organization:

- **Company name, acronym, location** — pick a real-sounding mid-size ISV (e.g., "Vertex Federal Systems, LLC", Reston VA or Bethesda MD)
- **Service name and what it does** — one-sentence description grounded in a real federal use case (document management, analytics, case management, geospatial, grant tracking, etc.)
- **Technology stack** — be specific: AWS GovCloud, ECS Fargate or EKS, RDS Aurora or DynamoDB, Splunk or Elasticsearch SIEM, Okta or Azure AD with FIDO2, Terraform + GitHub Actions CI/CD
- **Authorization path** — `"20x"` unless `$ARGUMENTS` specifies Rev5
- **Digital identity level** — IAL2/FAL2/AAL2 minimum for anything handling CUI
- **Deployment model** — Government-Only Cloud for anything handling federal data

### Step 2 — Determine required schema sections

For the **20x path**, include only:
- `serviceIdentification` (authorizationPath: "20x")
- `serviceProperties` (serviceType, digitalIdentityLevel, deploymentModel, repositories)
- `contactInformation` (primaryContact, securityContact, 1 additionalContact)
- `fedRampRequirements` — cover all KSI indicators (Step 3) **and** all FRR process requirements (Step 4)

Do **not** include `leveragedServices`, `portsAndProtocols`, or `securityControls` for 20x unless `$ARGUMENTS` requests Rev5.

For **Rev5**, add those three sections as well as `securityControls` with at least AC-01, AU-02, and SC-08.

### Step 3 — KSI entries in `fedRampRequirements`

Include one entry per KSI indicator using the full indicator ID as `frId`. Cover all non-optional indicators:

| Category | Indicators |
|----------|-----------|
| CMT | KSI-CMT-LMC, KSI-CMT-RMV, KSI-CMT-RVP, KSI-CMT-VTD |
| CNA | KSI-CNA-DFP, KSI-CNA-IBP, KSI-CNA-MAT, KSI-CNA-OFA, KSI-CNA-RNT, KSI-CNA-RVP, KSI-CNA-ULN |
| CED | KSI-CED-RAT |
| IAM | KSI-IAM-AAM, KSI-IAM-APM, KSI-IAM-ELP, KSI-IAM-JIT, KSI-IAM-SNU, KSI-IAM-SUS |
| INR | KSI-INR-AAR, KSI-INR-RIR, KSI-INR-RPI |
| MLA | KSI-MLA-EVC, KSI-MLA-LET, KSI-MLA-OSM, KSI-MLA-RVL |
| PIY | KSI-PIY-GIV, KSI-PIY-RES, KSI-PIY-RIS, KSI-PIY-RSD, KSI-PIY-RVD |
| RPL | KSI-RPL-ABO, KSI-RPL-ARP, KSI-RPL-RRO, KSI-RPL-TRC |
| SVC | KSI-SVC-ACM, KSI-SVC-ASM, KSI-SVC-EIS, KSI-SVC-SNT, KSI-SVC-VRI |
| SCR | KSI-SCR-MIT, KSI-SCR-MON |

KSI entry format — keep descriptions 2–4 sentences, include at least one security test with evidence:

```json
{
  "frId": "KSI-XXX-YYY",
  "securityAchievement": [
    {
      "securityAchievementDescription": "Specific control mechanism or design decision. Name actual tools and frequencies.",
      "securityTests": [
        {
          "frequency": "Continuous|Daily|Weekly|Monthly|Quarterly|Annually",
          "automated": true,
          "securityTestDescription": "What the test validates and the expected outcome.",
          "command": "actual CLI command or empty string if manual",
          "evidence": [
            {
              "evidenceType": "Log|Report|Configuration|Policy|Procedure|Audit Record",
              "evidenceDescription": "What the evidence shows.",
              "evidenceLocation": "https://github.com/<org>/<repo>/blob/main/evidence/<category>/<file>.json",
              "lastUpdated": "YYYY-MM-DD"
            }
          ]
        }
      ]
    }
  ]
}
```

### Step 4 — FRR process entries in `fedRampRequirements`

After all KSI entries, add one entry per FRR rule ID listed below. Use the rule ID directly as `frId` (e.g., `"frId": "FSI-CSO-INB"`). Descriptions should be 1–3 sentences — these are process/compliance statements, not technical architecture descriptions. Include a security test only when the requirement is verifiable by inspection, interview, or automated check; omit `securityTests` entirely for requirements that are fulfilled by the SDR itself or by pure documentation.

#### FRR-FSI — FedRAMP Security Inbox

| frId | Requirement name |
|------|-----------------|
| FSI-CSO-INB | Maintain a FedRAMP Security Inbox |
| FSI-CSO-NOC | Notification of Changes |
| FSI-CSO-TFG | Trust @fedramp.gov and @gsa.gov |
| FSI-CSO-RCV | Receive Email Without Disruption |
| FSI-CSO-CRA | Complete Required Actions |
| FSI-CSO-EMR | Emergency Message Routing |
| FSI-CSO-IMA | Important Message Actions |
| FSI-CSO-ACK | Acknowledge Receipt |

#### FRR-VDR — Vulnerability Detection and Response

| frId | Requirement name |
|------|-----------------|
| VDR-CSO-DET | Vulnerability Detection |
| VDR-CSO-RES | Vulnerability Response |
| VDR-EVA-ELX | Evaluate Exploitability |
| VDR-EVA-EIR | Evaluate Internet-Reachability |
| VDR-EVA-EPA | Estimate Potential Adverse Impact |
| VDR-EVA-GRV | Group Vulnerabilities |
| VDR-EVA-EFP | Evaluate False Positives |
| VDR-RPT-PER | Persistent Reporting |
| VDR-RPT-NID | Responsible Disclosure |
| VDR-RPT-VDT | Vulnerability Details |
| VDR-RPT-AVI | Accepted Vulnerability Info |
| VDR-RPT-HLO | High-Level Overviews |
| VDR-TFR-MHR | Monthly Activity Report |
| VDR-TFR-MAV | Mark Accepted Vulnerabilities |
| VDR-TFR-KEV | Remediate KEVs |
| VDR-TFR-RMN | Remaining Vulnerabilities |

#### FRR-CCM — Collaborative Continuous Monitoring

| frId | Requirement name |
|------|-----------------|
| CCM-OCR-AVL | Report Availability |
| CCM-OCR-NRD | Next Report Date |
| CCM-OCR-FBM | Feedback Mechanism |
| CCM-OCR-AFS | Anonymized Feedback Summary |
| CCM-OCR-LSI | Limit Sensitive Information |
| CCM-OCR-RPS | Responsible Public Sharing |
| CCM-QTR-REG | Meeting Registration Info |
| CCM-QTR-NRD | Next Review Date |
| CCM-QTR-NID | No Irresponsible Disclosure |
| CCM-QTR-ACT | Additional Content |
| CCM-QTR-RTR | Record/Transcribe Reviews |
| CCM-QTR-RTP | Restrict Third Parties |
| CCM-QTR-SRR | Share Recordings Responsibly |
| CCM-QTR-SCR | Share Content Responsibly |

#### FRR-CDS — Certification Data Sharing

| frId | Requirement name |
|------|-----------------|
| CDS-CSO-PUB | Public Information |
| CDS-CSO-SVC | Service List |
| CDS-CSO-UTC | Use Trust Centers |
| CDS-CSO-CBF | Consistency Between Formats |
| CDS-CSO-RIS | Responsible Information Sharing |
| CDS-CSO-HAD | Historical FedRAMP Certification Data |
| CDS-CSO-RPS | Responsible Public Sharing |
| CDS-UTC-PGD | Public Guidance |
| CDS-UTC-AGA | Agency Access |
| CDS-UTC-AAD | Agency Access Denial |

#### FRR-MAS — Minimum Assessment Scope

| frId | Requirement name |
|------|-----------------|
| MAS-CSO-IIR | Identify Information Resources |
| MAS-CSO-FLO | Information Flows and Security Categories |
| MAS-CSO-TPR | Third-Party Information Resources |
| MAS-CSO-MDI | Metadata Inclusion |
| MAS-CSO-SUP | Supplemental Information |

#### FRR-SCG — Secure Configuration Guide

| frId | Requirement name |
|------|-----------------|
| SCG-CSO-RSC | Recommended Secure Configuration |
| SCG-CSO-AUP | Use Instructions |
| SCG-CSO-PUB | Public Guidance |
| SCG-CSO-SDF | Secure Defaults |

#### FRR-SCN — Significant Change Notifications

| frId | Requirement name |
|------|-----------------|
| SCN-CSO-MAR | Maintain Audit Records |
| SCN-CSO-INF | Required Information |
| SCN-CSO-HIS | Historical Notifications |
| SCN-CSO-HRM | Human and Machine-Readable |
| SCN-CSO-NOM | Notification Mechanisms |
| SCN-CSO-EMG | Emergency Changes |
| SCN-CSO-EVA | Evaluate Changes |
| SCN-ADP-NTF | Adaptive Change Notification Requirements |
| SCN-TRF-NIP | Transformative: Notification of Initial Plans |
| SCN-TRF-NFP | Transformative: Notification of Final Plans |
| SCN-TRF-NAF | Transformative: Notification After Finishing |
| SCN-TRF-NAV | Transformative: Notification After Verification |
| SCN-TRF-UPD | Transformative: Update Documentation |

#### FRR-ICP — Incident Communications Procedures

| frId | Requirement name |
|------|-----------------|
| ICP-CSO-EFR | Evaluate FedRAMP Reportability |
| ICP-CSO-DPR | Default PAIN Rating |
| ICP-CSO-EFI | Estimate Federal Impact |
| ICP-CSO-AIR | Automated Incident Reporting |

#### FRR-UCM — Using Cryptographic Modules

| frId | Requirement name |
|------|-----------------|
| UCM-CSO-CMD | Cryptographic Module Documentation |
| UCM-CSO-CAT | Configuration of Agency Tenants |

#### FRR-MKT — Marketplace Listing

| frId | Requirement name |
|------|-----------------|
| MKT-CSO-AGU | Agency Use Cases |
| MKT-CSO-LRQ | Listing Requests |
| MKT-PRE-REQ | Preparation Phase Requirements |
| MKT-PRE-DCP | Demonstrating Continuous Progress |

#### FRR-FRC — FedRAMP Certification (self-attestation requirements)

| frId | Requirement name |
|------|-----------------|
| FRC-CSO-CDS | Follow CDS Rules |
| FRC-CSO-CCM | Follow CCM Rules |
| FRC-CSO-FSI | Follow FSI Rules |
| FRC-CSO-ICP | Follow ICP Rules |
| FRC-CSO-MAS | Follow MAS Rules |
| FRC-CSO-SCG | Follow SCG Rules |
| FRC-CSO-SCN | Follow SCN Rules |
| FRC-CSO-UCM | Follow UCM Rules |
| FRC-CSO-VDR | Follow VDR Rules |
| FRC-CSO-PVV | Persistent Verification and Validation |
| FRC-CSO-FAV | Failures Are Vulnerabilities |
| FRC-CSO-STE | Supply Technical Evidence |
| FRC-CSX-SUM | Implementation Summaries |
| FRC-APP-AFC | Applying for FedRAMP Certification |

FRR entry format — simpler than KSI entries; most require only a single brief achievement and may omit tests:

```json
{
  "frId": "FSI-CSO-INB",
  "securityAchievement": [
    {
      "securityAchievementDescription": "1–3 sentence description of how the provider satisfies this specific rule. Reference the concrete mechanism, contact, URL, or process that fulfills it.",
      "securityTests": [
        {
          "frequency": "Monthly|Quarterly|Annually",
          "automated": false,
          "securityTestDescription": "How compliance with this rule is verified. Omit this array entirely if the rule is fulfilled purely by documentation or policy.",
          "command": "",
          "evidence": [
            {
              "evidenceType": "Policy|Procedure|Audit Record|Configuration",
              "evidenceDescription": "What the evidence demonstrates.",
              "evidenceLocation": "https://github.com/<org>/<repo>/blob/main/evidence/<frr>/<file>.txt",
              "lastUpdated": "YYYY-MM-DD"
            }
          ]
        }
      ]
    }
  ]
}
```

**FRR-specific content guidance by process:**

- **FSI**: Name the actual security inbox email address (e.g., `fedramp@example.com`), state monitoring SLA (e.g., "monitored 24/7 with a 4-hour response SLA for Emergency messages"), reference the escalation path.
- **VDR**: Reference the specific scanner tools, CVSS thresholds, and SLA timelines. For reporting rules, describe the format and delivery mechanism of the monthly VDR report to FedRAMP and agencies.
- **CCM**: Describe the Ongoing Certification Report cadence, hosting location (trust center or USDA Connect), and the quarterly review meeting invitation mechanism.
- **CDS**: Name the trust center platform being used (e.g., USDA Connect, a FedRAMP-compatible trust center), describe what data is published and how it stays current.
- **MAS**: Describe the boundary, what is in and out of scope, how third-party services are handled, and how the scope is documented.
- **SCG**: Describe where the Secure Configuration Guide is published and what it covers.
- **SCN**: Describe the notification process and tooling for each change category (Adaptive, Routine Recurring, Transformative).
- **ICP**: Reference the Incident Response Plan, PAIN rating methodology, and automated reporting mechanism.
- **UCM**: List the FIPS 140-2/140-3 validated modules in use and how tenant configurations are managed.
- **MKT**: Describe the marketplace listing status and intended agency use cases.
- **FRC**: These are brief self-attestation statements — one sentence each confirming the referenced rule set is followed.

### Step 5 — Realism guidelines

**Do:**
- Use specific real tools (AWS GuardDuty, Splunk Cloud, Okta, Terraform, GitHub Actions, Dependabot, Checkov, Teleport, KnowBe4, testssl.sh, Driftctl, AWS FIS, etc.)
- Use specific cloud services appropriate to the chosen platform (AWS GovCloud, GCP FedRAMP authorized regions, Azure Government)
- Give concrete numbers (e.g., "47 accounts", "CVSS ≥ 7.0", "within 4 hours", "35-day retention")
- Vary evidence types across entries: use `evidenceLocation` (URLs to structured files like `.json`, `.csv`, `.txt`, `.log`) and `evidenceText` (inline command output or test result text)
- Use realistic fake URLs pointing to structured, machine-readable artifacts: `.json`, `.csv`, `.log`, `.txt` — not `.pdf` or image files
- Include at least one `evidenceText` entry with realistic command output or test result text for variety
- Date all evidence within the last 6 months of today's date
- Make technology choices consistent across all entries (same SIEM, same CI/CD, same IdP)

**Don't:**
- Use Lorem Ipsum or placeholder text
- Make claims without evidence (though some FRR entries may omit tests entirely — that is fine)
- Use the same evidence pattern for every entry
- Invent fictional cloud services or tool names
- Use `.pdf`, `.png`, `.jpg`, or other binary/image formats as `evidenceLocation` URLs — the only exception is if the command itself naturally produces that format as output

### Step 6 — Assessed flag

If `--assessed` is present in `$ARGUMENTS`, add an `assessed` object to **every** security test (KSI and FRR alike). The `assessed` block represents the finding from an independent 3PAO. Use a single fictional 3PAO name consistently throughout the document (e.g., "ClearPath Assessment Group, LLC" or "Apex 3PAO Services, Inc."). Assessment dates should cluster within a 2–4 week window in the past 6 months.

```json
"assessed": {
  "wasAssessed": true,
  "assessedBy": "Apex 3PAO Services, Inc.",
  "assessedOn": "2026-03-14T00:00:00Z",
  "assessmentMethod": "Examine|Interview|Test",
  "assessmentResult": "PASSED"
}
```

- `assessmentMethod`: `"Test"` for automated/command-based tests, `"Examine"` for policy/config review, `"Interview"` for process/procedure reviews. Use comma-separated values (e.g., `"Examine, Test"`) when multiple methods apply.
- `assessmentResult`: `"PASSED"` for all entries unless `$ARGUMENTS` asks for failures.
- `assessedOn`: vary dates realistically — assessors typically assess different rule families on different days.
- FRR entries with no `securityTests` array do not get `assessed` blocks (nothing to assess).

### Step 7 — Output

Write the JSON to `public/sampleSDR_<acronym_lowercase>.json`. Validate mentally:
- `serviceIdentification.authorizationPath` is `"20x"`
- All `contactPhone` values match `###-###-####`
- All `evidenceLocation` values are valid URIs ending in `.json`, `.csv`, `.log`, or `.txt`
- All `frequency` values are from the allowed enum: `Continuous`, `Daily`, `Weekly`, `Monthly`, `Quarterly`, `Annually`
- All `frId` values match entries from the KSI table (Step 3) or FRR table (Step 4) — no invented IDs

Confirm to the user: total number of `fedRampRequirements` entries (KSI count + FRR count), the fictitious company and service, whether `--assessed` was applied, and the output file path.
