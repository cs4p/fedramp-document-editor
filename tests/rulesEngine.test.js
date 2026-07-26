import { describe, it, expect } from 'vitest';
import { runRules, resolvePath, normalizeRulesFile } from '../src/utils/rulesEngine.js';

describe('resolvePath', () => {
  it('resolves plain dot paths', () => {
    const data = { a: { b: 'hi' } };
    expect(resolvePath(data, 'a.b')).toEqual([{ value: 'hi', path: 'a.b', context: data }]);
  });

  it('resolves a specific array index', () => {
    const data = { items: ['x', 'y'] };
    expect(resolvePath(data, 'items[1]')[0].value).toBe('y');
  });

  it('expands a wildcard into one match per array item, with context set to the row', () => {
    const data = { items: [{ id: 1 }, { id: 2 }] };
    const matches = resolvePath(data, 'items[].id');
    expect(matches.map(m => m.value)).toEqual([1, 2]);
    expect(matches[0].context).toBe(data.items[0]);
    expect(matches[0].path).toBe('items[0].id');
  });

  it('returns undefined values (not a crash) when traversing through a missing key', () => {
    const data = {};
    expect(resolvePath(data, 'a.b.c')).toEqual([{ value: undefined, path: 'a.b.c', context: data }]);
  });

  it('yields no matches for a wildcard over a missing or non-array field', () => {
    expect(resolvePath({}, 'items[].id')).toEqual([]);
    expect(resolvePath({ items: 'nope' }, 'items[].id')).toEqual([]);
  });
});

describe('normalizeRulesFile', () => {
  it('accepts a bare array', () => {
    expect(normalizeRulesFile([{ id: 'x' }])).toEqual([{ id: 'x' }]);
  });

  it('accepts an object with a rules array', () => {
    expect(normalizeRulesFile({ rules: [{ id: 'x' }] })).toEqual([{ id: 'x' }]);
  });

  it('rejects anything else', () => {
    expect(() => normalizeRulesFile({ foo: 'bar' })).toThrow();
    expect(() => normalizeRulesFile('nope')).toThrow();
  });
});

describe('runRules', () => {
  it('flags a required field that is missing', () => {
    const violations = runRules({}, [
      { id: 'name-required', path: 'serviceIdentification.serviceName', check: 'required' },
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ ruleId: 'name-required', severity: 'error' });
  });

  it('passes a required field that is present', () => {
    const violations = runRules({ serviceIdentification: { serviceName: 'X' } }, [
      { id: 'name-required', path: 'serviceIdentification.serviceName', check: 'required' },
    ]);
    expect(violations).toHaveLength(0);
  });

  it('applies a rule to every item matched by a wildcard path', () => {
    const data = {
      fedRampRequirements: [
        { fedRAMPRequirement: { frrID: 'A', frrImplementation: ['done'] } },
        { fedRAMPRequirement: { frrID: 'B', frrImplementation: [] } },
      ],
    };
    const violations = runRules(data, [
      {
        id: 'frr-impl-required',
        path: 'fedRampRequirements[].fedRAMPRequirement.frrImplementation',
        check: 'required',
      },
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0].path).toBe('fedRampRequirements[1].fedRAMPRequirement.frrImplementation');
  });

  it('does not fire a wildcard rule when the array is empty', () => {
    const violations = runRules({ fedRampRequirements: [] }, [
      { id: 'frr-impl-required', path: 'fedRampRequirements[].fedRAMPRequirement.frrImplementation', check: 'required' },
    ]);
    expect(violations).toHaveLength(0);
  });

  it('honors oneOf, matches, minLength, min/max checks', () => {
    const data = { level: 'Extreme', email: 'not-an-email', tags: ['a'], count: 42 };
    const violations = runRules(data, [
      { id: 'level', path: 'level', check: 'oneOf', value: ['Low', 'Moderate', 'High'] },
      { id: 'email', path: 'email', check: 'matches', value: '^[^@]+@[^@]+\\.[^@]+$' },
      { id: 'tags', path: 'tags', check: 'minLength', value: 2 },
      { id: 'count-too-high', path: 'count', check: 'max', value: 10 },
    ]);
    expect(violations.map(v => v.ruleId).sort()).toEqual(['count-too-high', 'email', 'level', 'tags']);
  });

  it('gates a rule with a sibling "when" condition evaluated relative to the matched row', () => {
    const data = {
      securityTests: [
        { automated: true, command: '' },
        { automated: false, command: '' },
      ],
    };
    const violations = runRules(data, [
      {
        id: 'automated-needs-command',
        path: 'securityTests[].command',
        check: 'required',
        when: { path: 'automated', check: 'equals', value: true },
      },
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0].path).toBe('securityTests[0].command');
  });

  it('resolves a "$." when-path from the document root instead of the row', () => {
    const data = {
      certificationClass: 'C',
      fedRampRequirements: [{ frId: 'X', frrValidation: [] }],
    };
    const violations = runRules(data, [
      {
        id: 'class-c-needs-validation',
        path: 'fedRampRequirements[].frrValidation',
        check: 'required',
        when: { path: '$.certificationClass', check: 'equals', value: 'C' },
      },
    ]);
    expect(violations).toHaveLength(1);
  });

  it('enforces minCount / maxCount across all wildcard matches', () => {
    const data = { leveragedServices: [{ name: 'A' }] };
    const violations = runRules(data, [
      { id: 'need-2-services', path: 'leveragedServices[].name', check: 'minCount', value: 2 },
    ]);
    expect(violations).toHaveLength(1);
  });

  it('reports an invalid rule (bad check name) as a violation instead of throwing', () => {
    const violations = runRules({}, [{ id: 'bad', path: 'a', check: 'bogus' }]);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toMatch(/Invalid rule definition/);
  });

  it('reports a missing rule id as a violation', () => {
    const violations = runRules({}, [{ path: 'a', check: 'required' }]);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe('(invalid rule)');
  });

  it('marks severity "warning" distinctly from the default "error"', () => {
    const violations = runRules({}, [
      { id: 'w', path: 'a', check: 'required', severity: 'warning' },
      { id: 'e', path: 'b', check: 'required' },
    ]);
    expect(violations.find(v => v.ruleId === 'w').severity).toBe('warning');
    expect(violations.find(v => v.ruleId === 'e').severity).toBe('error');
  });
});
