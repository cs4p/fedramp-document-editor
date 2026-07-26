import { patchEnumField } from './schemaPatch';

export function patchFRMRSchema(schema, requirements) {
  if (!requirements.length) return;
  // New 2026-06-24 SDR: frrID directly on each item
  const frrIDField = schema?.properties?.fedRampRequirements?.items?.properties?.frrID;
  // Old CR26 SDR: frId in $defs
  const frIdField = schema?.$defs?.fedRAMPRequirement?.properties?.frId;
  // Even older 20x schema
  const FR_IDField = schema?.$defs?.fedRAMP_requirement?.properties?.FR_ID;

  const enumValues = ['', ...requirements.map(r => r.id)];
  const enumNames = ['— Select a requirement —', ...requirements.map(r => r.title)];
  for (const field of [frrIDField, frIdField, FR_IDField]) {
    if (field) {
      patchEnumField(field, enumValues, enumNames);
      delete field.example;
    }
  }
}

export function extractFRMRRequirements(frmrData) {
  const pattern = /^[A-Z]+-[A-Z]+-[A-Z]+$/;
  const collected = {};

  function walk(node) {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) {
      if (pattern.test(key) && value && typeof value === 'object') {
        if ('affects' in value) {
          const a = value.affects;
          const hits = Array.isArray(a) ? a.includes('Providers') : String(a).includes('Providers');
          if (hits) collected[key] = value;
        } else {
          collected[key] = value;
        }
      } else {
        walk(value);
      }
    }
  }
  walk(frmrData);

  const ids = [];
  for (const [reqId, req] of Object.entries(collected)) {
    if (typeof req.name === 'string' && typeof req.statement === 'string') {
      ids.push({ id: reqId, title: `${reqId} – ${req.name}` });
    } else if (typeof req.name === 'string' && req.varies_by_level && typeof req.varies_by_level === 'object') {
      for (const [levelId, level] of Object.entries(req.varies_by_level)) {
        if (level && typeof level.statement === 'string') {
          ids.push({ id: `${reqId}-${levelId}`, title: `${reqId}-${levelId} – ${req.name} (${levelId})` });
        }
      }
    }
  }
  return ids;
}
