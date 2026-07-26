import { normalizeRulesFile } from './rulesEngine';
import { inlineCommonDefs } from './schemaRefs';

const GITHUB_SCHEMAS_BASE = 'https://raw.githubusercontent.com/fedramp/schemas/main/';

export async function fetchRaw(file) {
  try {
    const local = await fetch(file);
    if (local.ok) return local.json();
  } catch { /* fall through */ }
  try {
    const remote = await fetch(GITHUB_SCHEMAS_BASE + file);
    if (remote.ok) return remote.json();
  } catch { /* fall through */ }
  return null;
}

export async function fetchSchema(file, commonDefs) {
  const schema = await fetchRaw(file);
  if (!schema) return null;
  return commonDefs ? inlineCommonDefs(schema, commonDefs) : schema;
}

export function simpleFetch(url) {
  return fetch(url)
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .catch(() => null);
}

// Convention: an optional default rules file for schema `foo.json` lives at
// `rules/foo.rules.json`. Missing files are silently ignored (simpleFetch -> null).
export function defaultRulesUrl(schemaFile) {
  return `rules/${schemaFile.replace(/\.json$/, '.rules.json')}`;
}

export async function loadDefaultRules(schemaFile) {
  const parsed = await simpleFetch(defaultRulesUrl(schemaFile));
  if (!parsed) return [];
  try {
    return normalizeRulesFile(parsed);
  } catch {
    return [];
  }
}
