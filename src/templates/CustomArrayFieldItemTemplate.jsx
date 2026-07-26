import React from 'react';

export default function CustomArrayFieldItemTemplate({
  children,
  className,
  disabled,
  hasMoveDown,
  hasMoveUp,
  hasRemove,
  index,
  onDropIndexClick,
  onReorderClick,
  readonly,
  registry,
  uiSchema,
}) {
  const { ButtonTemplates: { MoveDownButton, MoveUpButton, RemoveButton } } = registry.templates;

  return (
    <div className={className}>
      <div className="d-flex align-items-start">
        <div className="flex-grow-1">{children}</div>
        {(hasMoveUp || hasMoveDown || hasRemove) && (
          <div className="d-flex flex-column ml-2" style={{ flexShrink: 0 }}>
            {hasMoveUp && (
              <MoveUpButton
                disabled={disabled || readonly || !hasMoveUp}
                onClick={onReorderClick(index, index - 1)}
                uiSchema={uiSchema}
                registry={registry}
              />
            )}
            {hasMoveDown && (
              <MoveDownButton
                disabled={disabled || readonly || !hasMoveDown}
                onClick={onReorderClick(index, index + 1)}
                uiSchema={uiSchema}
                registry={registry}
              />
            )}
            {hasRemove && (
              <RemoveButton
                disabled={disabled || readonly}
                onClick={onDropIndexClick(index)}
                uiSchema={uiSchema}
                registry={registry}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
