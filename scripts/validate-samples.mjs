#!/usr/bin/env node
// One-off validation script (not wired into package.json) used to confirm
// public/samples/*.sample.json validate against their target schema using
// the same Ajv2020 + customizeValidator config App.jsx uses.
import { readFileSync, readdirSync } from 'fs';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { inlineCommonDefs } from '../src/utils/schemaRefs.js';

const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);

const commonDefs = JSON.parse(readFileSync('public/fedramp-common-definitions-schema-2026-06-24.json', 'utf8'));

const samples = readdirSync('public/samples').filter(f => f.endsWith('.sample.json'));
let anyFailed = false;

for (const sampleFile of samples) {
  const schemaFile = sampleFile.replace(/\.sample\.json$/, '.json');
  const schema = inlineCommonDefs(JSON.parse(readFileSync(`public/${schemaFile}`, 'utf8')), commonDefs);
  const data = JSON.parse(readFileSync(`public/samples/${sampleFile}`, 'utf8'));
  const validate = ajv.compile(schema);
  const valid = validate(data);
  if (valid) {
    console.log(`✓ ${sampleFile}`);
  } else {
    anyFailed = true;
    console.log(`✗ ${sampleFile}`);
    for (const err of validate.errors) {
      console.log(`   ${err.instancePath || '(root)'} ${err.message} ${JSON.stringify(err.params)}`);
    }
  }
}

if (anyFailed) process.exit(1);
