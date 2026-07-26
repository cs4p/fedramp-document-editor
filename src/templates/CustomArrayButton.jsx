import React from 'react';

const VARIANTS = {
  add: { cls: 'btn-outline-primary mt-2', symbol: '+', optionKey: 'addButtonLabel', fallback: 'Add Item' },
  remove: { cls: 'btn-outline-danger mt-1', symbol: '−', optionKey: 'removeButtonLabel', fallback: 'Remove' },
};

function CustomArrayButton({ variant, className, disabled, onClick, uiSchema }) {
  const { cls, symbol, optionKey, fallback } = VARIANTS[variant];
  const label = uiSchema?.['ui:options']?.[optionKey] ?? fallback;
  return (
    <button
      type="button"
      className={`btn btn-sm ${cls} ${className || ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      {symbol} {label}
    </button>
  );
}

export const CustomAddButton = props => <CustomArrayButton variant="add" {...props} />;
export const CustomRemoveButton = props => <CustomArrayButton variant="remove" {...props} />;
