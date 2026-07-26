import React, { useState, useEffect, useMemo, useRef } from 'react';
import Form from '@rjsf/bootstrap-4';
import { customizeValidator } from '@rjsf/validator-ajv8';
import Ajv2020 from 'ajv/dist/2020';
import MarkdownWidget from './widgets/MarkdownWidget';
import UniqueEnumSelectWidget from './widgets/UniqueEnumSelectWidget';
import { CustomAddButton, CustomRemoveButton } from './templates/CustomArrayButton';
import CustomArrayFieldItemTemplate from './templates/CustomArrayFieldItemTemplate';
import { extractFRMRRequirements, patchFRMRSchema } from './utils/frmr';
import { extractNISTControls, extractRev5BaselineByClass, patchRV5Schema } from './utils/rv5';
import { BASE_UI_SCHEMA, buildMarkdownUiSchema, mergeUiSchema } from './utils/uiSchema';
import { runRules, normalizeRulesFile } from './utils/rulesEngine';
import { fetchRaw, fetchSchema, simpleFetch, loadDefaultRules } from './utils/schemaLoader';
import { buildPreviewHtml } from './utils/htmlPreview';
import { SCHEMA_CATALOG } from './config';

const validator = customizeValidator(
  { AjvClass: Ajv2020, ajvOptionsOverrides: { strict: false } },
);

const FRMR_URL = 'fedramp-consolidated-rules.json';
const COMMON_DEFS_FILE = 'fedramp-common-definitions-schema-2026-06-24.json';

const customWidgets = {
  markdown: MarkdownWidget,
  uniqueEnumSelect: UniqueEnumSelectWidget,
};

const customTemplates = {
  ButtonTemplates: { AddButton: CustomAddButton, RemoveButton: CustomRemoveButton },
  ArrayFieldItemTemplate: CustomArrayFieldItemTemplate,
};

function dropdownPanelStyle(extra) {
  return {
    position: 'absolute', top: '100%', marginTop: '4px',
    background: '#fff', border: '1px solid #dee2e6', borderRadius: '4px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)', zIndex: 200,
    ...extra,
  };
}

export default function App() {
  const [selectedEntry, setSelectedEntry] = useState(SCHEMA_CATALOG[0]);
  const [activeSchema, setActiveSchema] = useState(null);
  const [formData, setFormData] = useState({});
  const [initialData, setInitialData] = useState(null);
  const [isValid, setIsValid] = useState(false);
  const [schemaPickerOpen, setSchemaPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customRules, setCustomRules] = useState([]);
  const [rulesSource, setRulesSource] = useState(null); // null | 'default' | 'custom'
  const [rulesFileName, setRulesFileName] = useState(null);
  const [rulesPanelOpen, setRulesPanelOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState(null); // null = showing the form; string = showing the preview

  // Store FRMR/RV5/commonDefs data for re-patching when schema changes
  const frmrRequirementsRef = useRef([]);
  const nistControlsRef = useRef([]);
  const commonDefsRef = useRef(null);
  const schemaPickerRef = useRef(null);
  const rulesPanelRef = useRef(null);
  const fileInputRef = useRef(null);
  const rulesFileInputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (schemaPickerRef.current && !schemaPickerRef.current.contains(e.target)) {
        setSchemaPickerOpen(false);
      }
      if (rulesPanelRef.current && !rulesPanelRef.current.contains(e.target)) {
        setRulesPanelOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetches+patches a schema and its default rules, updating state. Shared by
  // the initial-load effect and handleSelectSchema, which otherwise duplicate
  // this exact sequence.
  async function loadSchemaAndRules(file) {
    const schema = await fetchSchema(file, commonDefsRef.current);
    if (schema) {
      patchFRMRSchema(schema, frmrRequirementsRef.current);
      patchRV5Schema(schema, nistControlsRef.current);
    }
    setActiveSchema(schema ?? null);
    const defaultRules = await loadDefaultRules(file);
    setCustomRules(defaultRules);
    setRulesSource(defaultRules.length ? 'default' : null);
    setRulesFileName(null);
  }

  // Load FRMR (which also carries the Rev5 control baseline) + common defs + default schema on startup
  useEffect(() => {
    Promise.all([
      simpleFetch(FRMR_URL),
      fetchRaw(COMMON_DEFS_FILE),
    ]).then(async ([frmrData, commonDefs]) => {
      if (frmrData) {
        frmrRequirementsRef.current = extractFRMRRequirements(frmrData);
        nistControlsRef.current = extractNISTControls(extractRev5BaselineByClass(frmrData));
      }
      commonDefsRef.current = commonDefs;
      await loadSchemaAndRules(SCHEMA_CATALOG[0].file);
      setLoading(false);
    });
  }, []);

  // When user picks a different schema, lazy-load it
  async function handleSelectSchema(entry) {
    setSchemaPickerOpen(false);
    if (entry.file === selectedEntry.file) return;
    setSelectedEntry(entry);
    setFormData({});
    setInitialData(null);
    setPreviewHtml(null);
    setLoading(true);
    await loadSchemaAndRules(entry.file);
    setLoading(false);
  }

  const activeUiSchema = useMemo(() => {
    if (!activeSchema) return BASE_UI_SCHEMA;
    return mergeUiSchema(BASE_UI_SCHEMA, buildMarkdownUiSchema(activeSchema));
  }, [activeSchema]);

  // Track selected FR IDs across both old and new schema shapes
  const selectedFRIDs = useMemo(() => {
    const reqs =
      formData?.fedRampRequirements ||
      formData?.keySecurityIndicators?.fedRAMP_requirements ||
      [];
    return new Set(
      reqs.map(r => r?.frrID ?? r?.frId ?? r?.FR_ID).filter(Boolean)
    );
  }, [formData]);

  const selectedControlIds = useMemo(() => {
    const controls =
      (Array.isArray(formData?.securityControls) ? formData.securityControls : null) ||
      formData?.securityControls?.securityControls ||
      [];
    return new Set(controls.map(c => c?.controlId).filter(Boolean));
  }, [formData]);

  useEffect(() => {
    if (!activeSchema) return;
    try {
      const result = validator.validateFormData(formData, activeSchema);
      setIsValid(!result.errors?.length);
    } catch { setIsValid(false); }
  }, [formData, activeSchema]);

  const ruleViolations = useMemo(() => runRules(formData, customRules), [formData, customRules]);
  const ruleErrorCount = ruleViolations.filter(v => v.severity === 'error').length;
  const ruleWarningCount = ruleViolations.filter(v => v.severity === 'warning').length;

  function handleChange({ formData: fd }) {
    setFormData(fd || {});
  }

  function handleRulesFileLoad(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const rules = normalizeRulesFile(JSON.parse(evt.target.result));
        setCustomRules(rules);
        setRulesSource('custom');
        setRulesFileName(file.name);
      } catch (err) {
        alert(`Invalid rules file: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleClearRules() {
    setCustomRules([]);
    setRulesSource(null);
    setRulesFileName(null);
  }

  function handleFileLoad(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = JSON.parse(evt.target.result);
        setFormData(data);
        setInitialData(data);
        setPreviewHtml(null);
      } catch {
        alert('Invalid JSON file.');
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => setLoading(false);
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleDownload() {
    const blob = new Blob([JSON.stringify(formData, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    const safeName = selectedEntry.label.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    a.download = `${safeName}.json`;
    a.href = URL.createObjectURL(blob);
    a.click();
  }

  function handleRestore() {
    if (initialData) setFormData(initialData);
    setPreviewHtml(null);
  }

  function handleTogglePreview() {
    if (previewHtml) {
      setPreviewHtml(null);
      return;
    }
    if (!activeSchema) return;
    setPreviewHtml(buildPreviewHtml(activeSchema, formData, { title: selectedEntry.label }));
  }

  return (
    <>
      {loading && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(255,255,255,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading…</span>
          </div>
        </div>
      )}

      <nav
        className="navbar navbar-light bg-white border-bottom fixed-top"
        style={{ padding: '8px 16px', zIndex: 100, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
      >
        <span className="navbar-brand h6 mb-0">FedRAMP Document Editor</span>
        <div className="d-flex align-items-center flex-wrap" style={{ gap: '6px' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleFileLoad}
          />
          <input
            ref={rulesFileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleRulesFileLoad}
          />

          {/* Schema picker */}
          <div className="position-relative" ref={schemaPickerRef}>
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => setSchemaPickerOpen(o => !o)}
              style={{ maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title={selectedEntry.label}
            >
              {selectedEntry.label} {schemaPickerOpen ? '▲' : '▼'}
            </button>
            {schemaPickerOpen && (
              <div style={dropdownPanelStyle({ left: 0, minWidth: '280px' })}>
                {SCHEMA_CATALOG.map(entry => (
                  <button
                    key={entry.file}
                    className={`dropdown-item${entry.file === selectedEntry.file ? ' active' : ''}`}
                    style={{ whiteSpace: 'nowrap' }}
                    onClick={() => handleSelectSchema(entry)}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="btn btn-sm btn-outline-secondary" onClick={() => fileInputRef.current.click()}>
            Load File
          </button>

          <button className="btn btn-sm btn-outline-secondary" onClick={() => rulesFileInputRef.current.click()}>
            Load Rules
          </button>

          <button className="btn btn-sm btn-secondary" onClick={handleDownload} disabled={!activeSchema}>
            Download JSON
          </button>

          <button
            className={`btn btn-sm ${previewHtml ? 'btn-info' : 'btn-outline-info'}`}
            onClick={handleTogglePreview}
            disabled={!activeSchema}
          >
            {previewHtml ? '← Edit Form' : 'Preview HTML'}
          </button>

          {initialData && (
            <button className="btn btn-sm btn-link text-danger p-0" onClick={handleRestore}>
              Restore
            </button>
          )}

          <span
            className={`badge badge-${isValid ? 'success' : 'secondary'}`}
            style={{ fontSize: '0.75rem' }}
            title={isValid ? 'Document is valid' : 'Document is invalid or incomplete'}
          >
            {isValid ? '✓ Valid' : '✗ Invalid'}
          </span>

          {/* Custom rules panel */}
          <div className="position-relative" ref={rulesPanelRef}>
            <button
              className={`btn btn-sm badge ${ruleErrorCount ? 'badge-danger' : ruleWarningCount ? 'badge-warning' : 'badge-light'}`}
              style={{ fontSize: '0.75rem', border: '1px solid #dee2e6' }}
              onClick={() => setRulesPanelOpen(o => !o)}
              disabled={!customRules.length}
              title={
                customRules.length
                  ? `${rulesSource === 'custom' ? rulesFileName : 'Default rules'}: ${customRules.length} rule(s)`
                  : 'No custom rules loaded'
              }
            >
              Rules: {customRules.length
                ? (ruleErrorCount || ruleWarningCount ? `${ruleErrorCount} error(s), ${ruleWarningCount} warning(s)` : 'OK')
                : 'none loaded'}
            </button>
            {rulesPanelOpen && customRules.length > 0 && (
              <div style={dropdownPanelStyle({
                right: 0, minWidth: '340px', maxHeight: '400px', overflowY: 'auto', padding: '8px',
              })}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <small className="text-muted">
                    {rulesSource === 'custom' ? rulesFileName : 'Default rules for this schema'}
                  </small>
                  <button className="btn btn-sm btn-link text-danger p-0" onClick={handleClearRules}>
                    Clear
                  </button>
                </div>
                {ruleViolations.length === 0 ? (
                  <div className="text-success small">All custom rules pass.</div>
                ) : (
                  <ul className="list-unstyled mb-0">
                    {ruleViolations.map((v, i) => (
                      <li key={i} className="small mb-2">
                        <span className={`badge badge-${v.severity === 'warning' ? 'warning' : 'danger'} mr-1`}>
                          {v.severity}
                        </span>
                        {v.message}
                        {v.path && <div className="text-muted" style={{ fontSize: '0.7rem' }}>{v.path}</div>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      <div style={{ paddingTop: '60px' }}>
        {!loading && !activeSchema ? (
          <div className="container mt-4 alert alert-danger">
            Failed to load schema for <strong>{selectedEntry.label}</strong>. Check your network connection.
          </div>
        ) : previewHtml ? (
          <iframe
            srcDoc={previewHtml}
            title={`${selectedEntry.label} Preview`}
            data-testid="html-preview-iframe"
            sandbox=""
            style={{
              position: 'fixed', top: '60px', left: 0,
              width: '100%', height: 'calc(100vh - 60px)', border: 'none', background: '#fff',
            }}
          />
        ) : activeSchema ? (
          <div className="container-fluid py-3" style={{ maxWidth: '1200px' }}>
            <Form
              schema={activeSchema}
              uiSchema={activeUiSchema}
              formData={formData}
              validator={validator}
              onChange={handleChange}
              onSubmit={e => e.preventDefault()}
              formContext={{ selectedFRIDs, selectedControlIds }}
              widgets={customWidgets}
              templates={customTemplates}
            >
              <button type="submit" style={{ display: 'none' }} />
            </Form>
          </div>
        ) : null}
      </div>
    </>
  );
}
