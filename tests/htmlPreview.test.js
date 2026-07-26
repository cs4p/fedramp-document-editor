import { describe, it, expect } from 'vitest';
import { buildPreviewHtml } from '../src/utils/htmlPreview.js';

const FIXED_DATE = new Date('2026-07-15T12:00:00Z');

describe('buildPreviewHtml', () => {
  it('renders markdown fields via marked', () => {
    const schema = {
      properties: {
        notes: { type: 'string', title: 'Notes', description: 'May use Markdown for formatting.' },
      },
    };
    const html = buildPreviewHtml(schema, { notes: '**bold** text' }, { generatedAt: FIXED_DATE });
    expect(html).toContain('<strong>bold</strong>');
  });

  it('renders both the raw enum value and its enumNames title, and skips the sentinel value', () => {
    const schema = {
      properties: {
        frrID: {
          type: 'string',
          title: 'Requirement ID',
          enum: ['', 'KSI-CNA-01'],
          enumNames: ['— Select a requirement —', 'KSI-CNA-01 – Cloud Native Architecture'],
        },
      },
    };
    const html = buildPreviewHtml(schema, { frrID: 'KSI-CNA-01' }, { generatedAt: FIXED_DATE });
    expect(html).toContain('KSI-CNA-01');
    expect(html).toContain('KSI-CNA-01 – Cloud Native Architecture');

    const emptyHtml = buildPreviewHtml(schema, { frrID: '' }, { generatedAt: FIXED_DATE });
    expect(emptyHtml).not.toContain('Requirement ID');
  });

  it('fully skips a field with no value, including its label', () => {
    const schema = {
      properties: {
        filled: { type: 'string', title: 'Filled Field' },
        empty: { type: 'string', title: 'Empty Field' },
      },
    };
    const html = buildPreviewHtml(schema, { filled: 'present' }, { generatedAt: FIXED_DATE });
    expect(html).toContain('Filled Field');
    expect(html).not.toContain('Empty Field');
  });

  it('HTML-escapes a non-markdown string field, neutralizing injected markup', () => {
    const schema = {
      properties: {
        title: { type: 'string', title: 'Title' },
      },
    };
    const html = buildPreviewHtml(schema, { title: '<img src=x onerror=alert(1)>' }, { generatedAt: FIXED_DATE });
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('renders one item block per entry in an array of objects', () => {
    const schema = {
      properties: {
        contacts: {
          type: 'array',
          title: 'Contacts',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', title: 'Name' },
              email: { type: 'string', title: 'Email', format: 'email' },
            },
          },
        },
      },
    };
    const html = buildPreviewHtml(schema, {
      contacts: [{ name: 'Alice' }, { name: 'Bob' }],
    }, { generatedAt: FIXED_DATE });
    expect((html.match(/class="item-details"/g) || []).length).toBe(2);
    expect(html).toContain('Alice');
    expect(html).toContain('Bob');
  });

  it('resolves $ref items and skips schema-level $refs', () => {
    const schema = {
      $defs: {
        contact: {
          type: 'object',
          properties: { name: { type: 'string', title: 'Name' } },
        },
      },
      properties: {
        contacts: {
          type: 'array',
          title: 'Contacts',
          items: { $ref: '#/$defs/contact' },
        },
      },
    };
    const html = buildPreviewHtml(schema, { contacts: [{ name: 'Carol' }] }, { generatedAt: FIXED_DATE });
    expect(html).toContain('Carol');
  });

  it('shows the empty-note when nothing in formData is renderable', () => {
    const schema = { properties: { title: { type: 'string', title: 'Title' } } };
    const html = buildPreviewHtml(schema, {}, { generatedAt: FIXED_DATE });
    expect(html).toContain('No data entered yet.');
  });

  it('uses the provided title and generatedAt in the document header', () => {
    const schema = { properties: {} };
    const html = buildPreviewHtml(schema, {}, { title: 'My Document', generatedAt: FIXED_DATE });
    expect(html).toContain('<title>My Document</title>');
    expect(html).toContain('My Document');
  });
});
