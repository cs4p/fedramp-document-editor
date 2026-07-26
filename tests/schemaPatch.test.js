import { describe, it, expect } from 'vitest';
import { patchFRMRSchema } from '../src/utils/frmr.js';
import { patchRV5Schema } from '../src/utils/rv5.js';

const REQUIREMENTS = [
  { id: 'KSI-CNA-01', title: 'KSI-CNA-01 – Cloud Native Architecture' },
  { id: 'KSI-IAM-01', title: 'KSI-IAM-01 – Identity and Access Management' },
];

const CONTROLS = ['AC-01', 'AC-02', 'AU-02'];

describe('patchFRMRSchema', () => {
  it('patches the new 2026-06-24 SDR shape (fedRampRequirements.items.properties.frrID)', () => {
    const schema = {
      properties: { fedRampRequirements: { items: { properties: { frrID: { type: 'string', example: 'x' } } } } },
    };
    patchFRMRSchema(schema, REQUIREMENTS);
    const field = schema.properties.fedRampRequirements.items.properties.frrID;
    expect(field.enum).toEqual(['', 'KSI-CNA-01', 'KSI-IAM-01']);
    expect(field.enumNames).toEqual([
      '— Select a requirement —',
      'KSI-CNA-01 – Cloud Native Architecture',
      'KSI-IAM-01 – Identity and Access Management',
    ]);
    expect(field.example).toBeUndefined();
  });

  it('patches the old CR26 SDR shape ($defs.fedRAMPRequirement.properties.frId)', () => {
    const schema = { $defs: { fedRAMPRequirement: { properties: { frId: { type: 'string' } } } } };
    patchFRMRSchema(schema, REQUIREMENTS);
    expect(schema.$defs.fedRAMPRequirement.properties.frId.enum).toEqual(['', 'KSI-CNA-01', 'KSI-IAM-01']);
  });

  it('does nothing when requirements list is empty', () => {
    const field = { type: 'string' };
    const schema = { properties: { fedRampRequirements: { items: { properties: { frrID: field } } } } };
    patchFRMRSchema(schema, []);
    expect(field.enum).toBeUndefined();
  });

  it('is a no-op when the target field is absent from the schema', () => {
    expect(() => patchFRMRSchema({}, REQUIREMENTS)).not.toThrow();
  });
});

describe('patchRV5Schema', () => {
  it('patches the new 2026-06-24 SDR shape (securityControls.items.properties.controlId)', () => {
    const schema = { properties: { securityControls: { items: { properties: { controlId: { type: 'string' } } } } } };
    patchRV5Schema(schema, CONTROLS);
    const field = schema.properties.securityControls.items.properties.controlId;
    expect(field.enum).toEqual(['', 'AC-01', 'AC-02', 'AU-02']);
    expect(field.enumNames).toEqual(['— Select a control —', 'AC-01', 'AC-02', 'AU-02']);
  });

  it('patches the old CR26 SDR shape ($defs.nistSecurityControl.properties.controlId)', () => {
    const schema = { $defs: { nistSecurityControl: { properties: { controlId: { type: 'string' } } } } };
    patchRV5Schema(schema, CONTROLS);
    expect(schema.$defs.nistSecurityControl.properties.controlId.enum).toEqual(['', 'AC-01', 'AC-02', 'AU-02']);
  });

  it('does nothing when controls list is empty', () => {
    const field = { type: 'string' };
    const schema = { properties: { securityControls: { items: { properties: { controlId: field } } } } };
    patchRV5Schema(schema, []);
    expect(field.enum).toBeUndefined();
  });
});
