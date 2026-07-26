import { marked } from 'marked';
import { resolveLocalRef } from './schemaRefs';
import previewCss from './htmlPreview.css?inline';

const MARKDOWN_MARKER = 'May use Markdown for formatting.';

function esc(val) {
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isEmptyValue(v) {
  if (v === undefined || v === null || v === '') return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v).length === 0;
  return false;
}

function humanize(key) {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, c => c.toUpperCase())
    .trim();
}

function labelFor(key, prop) {
  return prop?.title || humanize(key);
}

// Deterministic string -> HSL color, so ID-shaped enum values (e.g. "KSI-CNA-01")
// get a stable per-category accent without a hardcoded category->color table.
function colorForCategory(value) {
  const match = /^[A-Z]+-([A-Z]+)-/.exec(value);
  const seed = match ? match[1] : value;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 40%)`;
}

function renderEnum(prop, value) {
  const { enum: enumValues, enumNames } = prop;
  const hasNames = Array.isArray(enumNames) && enumNames.length === enumValues.length;
  const i = enumValues.indexOf(value);
  const title = hasNames && i > 0 ? enumNames[i] : null;
  const badge = `<span class="enum-value" style="border-left-color:${colorForCategory(value)}">${esc(value)}</span>`;
  if (title && title !== value) {
    return `${badge}<span class="enum-title">${esc(title)}</span>`;
  }
  return badge;
}

function renderString(prop, value) {
  if (prop.description?.includes(MARKDOWN_MARKER)) {
    return `<div class="markdown-body">${marked.parse(String(value))}</div>`;
  }
  if (prop.format === 'uri') {
    return `<a href="${esc(value)}" target="_blank" rel="noopener">${esc(value)}</a>`;
  }
  if (prop.format === 'email') {
    return `<a href="mailto:${esc(value)}">${esc(value)}</a>`;
  }
  if (prop.format === 'date' || prop.format === 'date-time') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return esc(prop.format === 'date' ? d.toLocaleDateString() : d.toLocaleString());
    }
  }
  return esc(value);
}

function isScalarType(prop) {
  return prop.enum || ['string', 'number', 'integer', 'boolean'].includes(prop.type);
}

function renderObjectBody(prop, value, root, depth) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entries = Object.entries(prop.properties || {});
  const rows = [];
  const subSections = [];

  for (const [key, rawChild] of entries) {
    const child = resolveLocalRef(root, rawChild);
    if (!child) continue;
    const childValue = value?.[key];
    if (isEmptyValue(childValue)) continue;

    const isMarkdown = child.type === 'string' && child.description?.includes(MARKDOWN_MARKER);
    if (isScalarType(child) && !isMarkdown) {
      const html = renderField(child, childValue, root, key, depth);
      if (html) rows.push(`<tr><th>${esc(labelFor(key, child))}</th><td>${html}</td></tr>`);
    } else {
      const html = renderField(child, childValue, root, key, depth + 1);
      if (html) subSections.push(`<div class="sub-section"><div class="sub-label">${esc(labelFor(key, child))}</div>${html}</div>`);
    }
  }

  if (!rows.length && !subSections.length) return null;
  const table = rows.length ? `<table class="info-table"><tbody>${rows.join('')}</tbody></table>` : '';
  return table + subSections.join('');
}

function itemSummary(items, item, index) {
  // Prefer an enum field with a genuine looked-up title (e.g. frrID -> its
  // FRMR title) over one whose enumNames just repeat the raw value (e.g.
  // controlId, or a plain status enum like "Implemented") — the latter is no
  // more identifying than any other short string field on the item.
  for (const [key, rawChild] of Object.entries(items.properties || {})) {
    const v = item?.[key];
    if (rawChild?.enum && !isEmptyValue(v)) {
      const { enum: enumValues, enumNames } = rawChild;
      const hasNames = Array.isArray(enumNames) && enumNames.length === enumValues.length;
      const i = enumValues.indexOf(v);
      if (hasNames && i > 0 && enumNames[i] !== v) return renderEnum(rawChild, v);
    }
  }
  for (const [key, rawChild] of Object.entries(items.properties || {})) {
    const v = item?.[key];
    if (typeof v === 'string' && v && v.length <= 60 && !rawChild?.description?.includes(MARKDOWN_MARKER)) {
      return esc(v);
    }
  }
  return `Item ${index + 1}`;
}

function renderArrayBody(prop, value, root, key, depth) {
  if (!Array.isArray(value)) return null;
  const items = resolveLocalRef(root, prop.items);
  if (!items) return null;

  if (items.type === 'object' || items.properties) {
    const blocks = value.map((item, i) => {
      const body = renderObjectBody(items, item, root, depth + 1);
      if (!body) return '';
      return `<details class="item-details" open><summary>${itemSummary(items, item, i)}</summary><div class="item-body">${body}</div></details>`;
    }).filter(Boolean);
    return blocks.length ? blocks.join('') : null;
  }

  const lis = value
    .filter(v => !isEmptyValue(v))
    .map(v => `<li>${renderField(items, v, root, key, depth)}</li>`);
  return lis.length ? `<ul class="bullet-list">${lis.join('')}</ul>` : null;
}

function renderField(rawProp, value, root, key, depth) {
  const prop = resolveLocalRef(root, rawProp);
  if (!prop || isEmptyValue(value)) return null;

  if (prop.enum) return renderEnum(prop, value);

  switch (prop.type) {
    case 'object':
      return renderObjectBody(prop, value, root, depth);
    case 'array':
      return renderArrayBody(prop, value, root, key, depth);
    case 'boolean':
      return `<span class="badge" style="background:${value ? '#059669' : '#6b7280'}">${value ? 'Yes' : 'No'}</span>`;
    case 'number':
    case 'integer':
      return esc(String(value));
    case 'string':
    default:
      return renderString(prop, value);
  }
}

export function buildPreviewHtml(schema, formData, options = {}) {
  const title = options.title || 'Document Preview';
  const generatedAt = options.generatedAt || new Date();

  const sections = Object.entries(schema.properties || {}).map(([key, rawProp]) => {
    const prop = resolveLocalRef(schema, rawProp);
    if (!prop) return '';
    const body = renderField(prop, formData?.[key], schema, key, 1);
    if (!body) return '';
    return `<details class="top-section" open><summary>${esc(labelFor(key, prop))}</summary><div class="top-section-body">${body}</div></details>`;
  }).join('');

  const bodyHtml = sections || '<p class="empty-note">No data entered yet.</p>';
  const generatedLabel = generatedAt.toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${esc(title)}</title>
<style>${previewCss}</style>
</head>
<body>
<div class="page">
  <div class="page-header">
    <h1>${esc(title)}</h1>
    <p class="subtitle">Generated ${esc(generatedLabel)}</p>
  </div>
  ${bodyHtml}
</div>
</body>
</html>`;
}
