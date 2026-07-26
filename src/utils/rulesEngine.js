// Declarative custom validation rules, evaluated against form data in addition
// to JSON Schema validation. A rules file is either a bare array of rule objects
// or `{ "rules": [...] }`.
//
// Rule shape:
//   {
//     "id": "sdr-frr-implementation-required",
//     "description": "Every FedRAMP requirement must have an implementation statement",
//     "severity": "error" | "warning",       // default: "error"
//     "path": "fedRampRequirements[].fedRAMPRequirement.frrImplementation",
//     "check": "required",                    // see CHECKS below
//     "value": ...,                           // operand used by some checks
//     "message": "...",                       // optional, overrides description in output
//     "when": { "path": "...", "check": "...", "value": ... }  // optional gate
//   }
//
// Path syntax: dot-separated keys with `[]` marking "each item of this array"
// (wildcard) or `[n]` for a specific index, e.g. `securityControls[].nistSecurityControl.controlId`.
//
// `when.path` is resolved relative to the matched row (the nearest enclosing
// object reached via the last wildcard in `path`) unless it starts with `$.`,
// in which case it is resolved from the document root.

const CHECKS = [
  'required', 'exists', 'forbidden', 'notExists',
  'equals', 'notEquals', 'oneOf', 'notOneOf',
  'matches', 'notMatches',
  'minLength', 'maxLength', 'min', 'max',
  'minCount', 'maxCount',
];

function tokenize(path) {
  const tokens = [];
  const re = /\[\]|\[(\d+)\]|[^.[\]]+/g;
  let m;
  while ((m = re.exec(path || ''))) {
    if (m[0] === '[]') tokens.push({ type: 'wildcard' });
    else if (m[1] !== undefined) tokens.push({ type: 'index', index: Number(m[1]) });
    else tokens.push({ type: 'key', key: m[0] });
  }
  return tokens;
}

// Resolves a path against data, returning one entry per match:
// { value, path (concrete, with indices), context (nearest enclosing row) }.
export function resolvePath(data, path) {
  const tokens = tokenize(path);
  const results = [];

  function walk(node, idx, pathStr, context) {
    if (idx === tokens.length) {
      results.push({ value: node, path: pathStr, context });
      return;
    }
    const tok = tokens[idx];
    if (tok.type === 'wildcard') {
      if (!Array.isArray(node)) return;
      node.forEach((item, i) => walk(item, idx + 1, `${pathStr}[${i}]`, item));
      return;
    }
    if (node == null) {
      const nextPath = tok.type === 'index' ? `${pathStr}[${tok.index}]` : `${pathStr}${pathStr ? '.' : ''}${tok.key}`;
      walk(undefined, idx + 1, nextPath, context);
      return;
    }
    if (tok.type === 'key') {
      walk(node[tok.key], idx + 1, `${pathStr}${pathStr ? '.' : ''}${tok.key}`, context);
    } else {
      walk(Array.isArray(node) ? node[tok.index] : undefined, idx + 1, `${pathStr}[${tok.index}]`, context);
    }
  }

  walk(data, 0, '', data);
  return results;
}

function isEmpty(v) {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
}

function evalCheck(check, value, ruleValue) {
  switch (check) {
    case 'required':
    case 'exists': return !isEmpty(value);
    case 'forbidden':
    case 'notExists': return isEmpty(value);
    case 'equals': return value === ruleValue;
    case 'notEquals': return value !== ruleValue;
    case 'oneOf':
      if (!Array.isArray(ruleValue)) throw new Error('"oneOf" requires an array "value"');
      return ruleValue.includes(value);
    case 'notOneOf':
      if (!Array.isArray(ruleValue)) throw new Error('"notOneOf" requires an array "value"');
      return !ruleValue.includes(value);
    case 'matches':
      return typeof value === 'string' && new RegExp(ruleValue).test(value);
    case 'notMatches':
      return !(typeof value === 'string' && new RegExp(ruleValue).test(value));
    case 'minLength':
      return (typeof value === 'string' || Array.isArray(value)) && value.length >= ruleValue;
    case 'maxLength':
      return (typeof value === 'string' || Array.isArray(value)) && value.length <= ruleValue;
    case 'min':
      return typeof value === 'number' && value >= ruleValue;
    case 'max':
      return typeof value === 'number' && value <= ruleValue;
    default:
      throw new Error(`unknown check "${check}"`);
  }
}

function whenPasses(when, context, root) {
  if (!when) return true;
  const source = when.path?.startsWith('$.') ? root : context;
  const relPath = when.path?.startsWith('$.') ? when.path.slice(2) : when.path;
  const match = resolvePath(source, relPath)[0];
  return evalCheck(when.check, match?.value, when.value);
}

export function normalizeRulesFile(parsed) {
  const rules = Array.isArray(parsed) ? parsed : parsed?.rules;
  if (!Array.isArray(rules)) throw new Error('Rules file must be an array of rules or an object with a "rules" array');
  return rules;
}

// Returns an array of { ruleId, severity, message, path } for every failing rule.
export function runRules(data, rules) {
  const violations = [];

  for (const rule of rules || []) {
    const severity = rule.severity === 'warning' ? 'warning' : 'error';
    const message = rule.message || rule.description || `Rule "${rule.id}" failed`;
    try {
      if (!rule.id) throw new Error('rule is missing "id"');
      if (!CHECKS.includes(rule.check)) throw new Error(`unknown check "${rule.check}"`);

      if (rule.check === 'minCount' || rule.check === 'maxCount') {
        const matches = resolvePath(data, rule.path).filter(m => !isEmpty(m.value));
        const ok = rule.check === 'minCount' ? matches.length >= rule.value : matches.length <= rule.value;
        if (!ok) violations.push({ ruleId: rule.id, severity, message, path: rule.path });
        continue;
      }

      const hasWildcard = (rule.path || '').includes('[]');
      let matches = resolvePath(data, rule.path);
      if (!matches.length && !hasWildcard) {
        matches = [{ value: undefined, path: rule.path || '', context: data }];
      }

      for (const m of matches) {
        if (!whenPasses(rule.when, m.context, data)) continue;
        if (!evalCheck(rule.check, m.value, rule.value)) {
          violations.push({ ruleId: rule.id, severity, message, path: m.path });
        }
      }
    } catch (err) {
      violations.push({
        ruleId: rule.id || '(invalid rule)',
        severity: 'error',
        message: `Invalid rule definition: ${err.message}`,
        path: rule.path || '',
      });
    }
  }

  return violations;
}
