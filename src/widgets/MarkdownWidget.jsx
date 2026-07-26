import React, { useMemo } from 'react';
import SimpleMDE from 'react-simplemde-editor';

const TOOLBAR = [
  'bold', 'italic', 'heading', 'unordered-list', 'ordered-list',
  '|', 'link', 'code',
  '|', 'preview', 'fullscreen', 'side-by-side', 'guide',
];

export default function MarkdownWidget({ id, value, onChange, disabled, readonly }) {
  const options = useMemo(() => ({
    toolbar: TOOLBAR,
    spellChecker: true,
  }), []);

  return (
    <SimpleMDE
      id={id}
      value={value || ''}
      onChange={onChange}
      disabled={disabled || readonly}
      options={options}
    />
  );
}
