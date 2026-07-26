import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import { extractFRMRRequirements } from '../src/utils/frmr.js';
import { extractNISTControls, extractRev5BaselineByClass } from '../src/utils/rv5.js';

const PUBLIC = resolve(import.meta.dirname, '../public');

function readJson(filename) {
  return JSON.parse(readFileSync(resolve(PUBLIC, filename), 'utf8'));
}

// ── Schema file ────────────────────────────────────────────────────────────────

describe('Schema file', () => {
  it('exists and is valid JSON', () => {
    expect(() => readJson('cr26SecurityDecisionRecord.schema.json')).not.toThrow();
  });

  it('is a JSON Schema 2020-12 document', () => {
    const schema = readJson('cr26SecurityDecisionRecord.schema.json');
    expect(schema['$schema']).toBe('https://json-schema.org/draft/2020-12/schema');
  });

  it('declares the expected top-level required properties', () => {
    const schema = readJson('cr26SecurityDecisionRecord.schema.json');
    expect(schema.required).toEqual(
      expect.arrayContaining(['certificationPackageOverviewUri', 'fedRampRequirements'])
    );
  });
});

// ── FRMR rules ─────────────────────────────────────────────────────────────────

describe('FRMR rules (fedramp-consolidated-rules.json)', () => {
  it('exists and is valid JSON', () => {
    expect(() => readJson('fedramp-consolidated-rules.json')).not.toThrow();
  });

  it('extractFRMRRequirements returns a non-empty array', () => {
    const requirements = extractFRMRRequirements(readJson('fedramp-consolidated-rules.json'));
    expect(requirements.length).toBeGreaterThan(0);
  });

  it('each requirement has an id and title string', () => {
    const requirements = extractFRMRRequirements(readJson('fedramp-consolidated-rules.json'));
    for (const req of requirements) {
      expect(typeof req.id).toBe('string');
      expect(req.id.length).toBeGreaterThan(0);
      expect(typeof req.title).toBe('string');
      expect(req.title.length).toBeGreaterThan(0);
    }
  });
});

// ── NIST controls ──────────────────────────────────────────────────────────────
// The Rev5 control baseline lives inside fedramp-consolidated-rules.json at
// FRR.FRC.data.rev5.CSF['FRC-CSF-BSL'].varies_by_class — there's no standalone file.

describe('Rev5 NIST control baseline (fedramp-consolidated-rules.json)', () => {
  const frmrData = () => readJson('fedramp-consolidated-rules.json');

  it('extractRev5BaselineByClass finds at least one certification class', () => {
    const byClass = extractRev5BaselineByClass(frmrData());
    expect(Object.keys(byClass).length).toBeGreaterThan(0);
  });

  it('each class maps to a { family: [controlIds] } structure', () => {
    const byClass = extractRev5BaselineByClass(frmrData());
    for (const classData of Object.values(byClass)) {
      expect(typeof classData).toBe('object');
      for (const controls of Object.values(classData)) {
        expect(Array.isArray(controls)).toBe(true);
      }
    }
  });

  it('extractNISTControls returns a non-empty sorted array from the reshaped baseline', () => {
    const controls = extractNISTControls(extractRev5BaselineByClass(frmrData()));
    expect(controls.length).toBeGreaterThan(0);
    // verify sort: each entry should be >= the previous
    for (let i = 1; i < controls.length; i++) {
      expect(controls[i].localeCompare(controls[i - 1])).toBeGreaterThanOrEqual(0);
    }
  });

  it('all entries are non-empty strings', () => {
    const controls = extractNISTControls(extractRev5BaselineByClass(frmrData()));
    for (const id of controls) {
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    }
  });

  it('contains expected well-known control IDs', () => {
    const controls = extractNISTControls(extractRev5BaselineByClass(frmrData()));
    const set = new Set(controls);
    expect(set.has('AC-01')).toBe(true);
    expect(set.has('IA-02')).toBe(true);
  });

  it('extractRev5BaselineByClass reshapes a synthetic varies_by_class node correctly', () => {
    const synthetic = {
      FRR: { FRC: { data: { rev5: { CSF: { 'FRC-CSF-BSL': {
        varies_by_class: {
          b: { rev5_controls_list: { AC: ['AC-01', 'AC-02'] } },
          c: { rev5_controls_list: { AC: ['AC-01'], AU: ['AU-02'] } },
        },
      } } } } } },
    };
    expect(extractRev5BaselineByClass(synthetic)).toEqual({
      b: { AC: ['AC-01', 'AC-02'] },
      c: { AC: ['AC-01'], AU: ['AU-02'] },
    });
  });

  it('extractRev5BaselineByClass returns {} when the node is missing', () => {
    expect(extractRev5BaselineByClass({})).toEqual({});
    expect(extractRev5BaselineByClass(null)).toEqual({});
  });
});
