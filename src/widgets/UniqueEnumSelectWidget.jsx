import React from 'react';

export default function UniqueEnumSelectWidget({ id, value, onChange, schema, registry, options }) {
  const selected = registry.formContext?.[options.formContextKey] ?? new Set();
  const enumValues = schema.enum || [];
  const enumNames = schema.enumNames || enumValues;

  return (
    <select
      id={id}
      className="form-control"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
    >
      {enumValues.map((opt, i) => (
        <option
          key={opt}
          value={opt}
          disabled={Boolean(opt) && selected.has(opt) && opt !== value}
        >
          {enumNames[i] !== undefined ? enumNames[i] : opt}
        </option>
      ))}
    </select>
  );
}
