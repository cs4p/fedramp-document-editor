import { resolveLocalRef } from './schemaRefs';

const MARKDOWN_MARKER = 'May use Markdown for formatting.';

// uiSchema covers both the new 2026-06-24 schemas and the old CR26 schemas
export const BASE_UI_SCHEMA = {
  // --- New + old COP: serviceIdentification ---
  serviceIdentification: {
    serviceDescription: { 'ui:widget': 'markdown' },
  },
  // --- New COP: serviceProperties arrays ---
  serviceProperties: {
    serviceType: {
      'ui:options': { addButtonLabel: 'Add Service Type' },
      items: { 'ui:options': { removeButtonLabel: 'Remove Service Type' } },
    },
    businessCategory: {
      'ui:options': { addButtonLabel: 'Add Business Category' },
      items: { 'ui:options': { removeButtonLabel: 'Remove Business Category' } },
    },
    additionalRepositories: {
      'ui:options': { addButtonLabel: 'Add Repository' },
      items: { 'ui:options': { removeButtonLabel: 'Remove Repository' } },
    },
    // Old CR26 COP used 'repositories'
    repositories: {
      'ui:options': { addButtonLabel: 'Add Repository' },
      items: { 'ui:options': { removeButtonLabel: 'Remove Repository' } },
    },
  },
  // --- New COP: contactInformation array + old nested variant ---
  contactInformation: {
    'ui:options': { addButtonLabel: 'Add Contact' },
    items: { 'ui:options': { removeButtonLabel: 'Remove Contact' } },
    additionalContacts: {
      'ui:options': { addButtonLabel: 'Add Contact' },
      items: { 'ui:options': { removeButtonLabel: 'Remove Contact' } },
    },
  },
  // --- New COP: certifiedServices ---
  certifiedServices: {
    'ui:options': { addButtonLabel: 'Add Certified Service' },
    items: { 'ui:options': { removeButtonLabel: 'Remove Certified Service' } },
  },
  // --- New COP: thirdPartyInformationResources ---
  thirdPartyInformationResources: {
    certified: {
      'ui:options': { addButtonLabel: 'Add Certified Resource' },
      items: { 'ui:options': { removeButtonLabel: 'Remove Certified Resource' } },
    },
    nonCertified: {
      'ui:options': { addButtonLabel: 'Add Non-Certified Resource' },
      items: { 'ui:options': { removeButtonLabel: 'Remove Non-Certified Resource' } },
    },
  },
  // --- Old CR26 COP: leveragedServices ---
  leveragedServices: {
    'ui:options': { addButtonLabel: 'Add Leveraged Service' },
    items: {
      'ui:options': { removeButtonLabel: 'Remove Leveraged Service' },
      dataTypes: {
        'ui:options': { addButtonLabel: 'Add Data Type' },
        items: { 'ui:options': { removeButtonLabel: 'Remove Data Type' } },
      },
      authorizedUsersAndAuthentication: {
        'ui:options': { addButtonLabel: 'Add Authorized User' },
        items: { 'ui:options': { removeButtonLabel: 'Remove Authorized User' } },
      },
      otherCompliancePrograms: {
        'ui:options': { addButtonLabel: 'Add Compliance Program' },
        items: { 'ui:options': { removeButtonLabel: 'Remove Compliance Program' } },
      },
    },
  },
  // --- Ports and protocols (new SDR + old CR26) ---
  portsAndProtocols: {
    'ui:options': { addButtonLabel: 'Add Port/Protocol' },
    items: { 'ui:options': { removeButtonLabel: 'Remove Port/Protocol' } },
  },
  // --- Security controls (new SDR + old CR26 both use controlId directly on each item) ---
  securityControls: {
    'ui:options': { addButtonLabel: 'Add Security Control' },
    items: {
      'ui:options': { removeButtonLabel: 'Remove Security Control' },
      controlId: { 'ui:widget': 'uniqueEnumSelect', 'ui:options': { formContextKey: 'selectedControlIds' } },
      parameterValues: {
        'ui:options': { addButtonLabel: 'Add Parameter Value' },
        items: { 'ui:options': { removeButtonLabel: 'Remove Parameter Value' } },
      },
    },
    // old CR26: securityControls is an object containing a securityControls array
    securityControls: {
      'ui:options': { addButtonLabel: 'Add Security Control' },
      items: {
        'ui:options': { removeButtonLabel: 'Remove Security Control' },
        controlId: { 'ui:widget': 'uniqueEnumSelect', 'ui:options': { formContextKey: 'selectedControlIds' } },
      },
    },
  },
  // --- FedRAMP requirements (new SDR: frrID etc. directly on each item) ---
  fedRampRequirements: {
    'ui:options': { addButtonLabel: 'Add FedRAMP Requirement' },
    items: {
      'ui:options': { removeButtonLabel: 'Remove FedRAMP Requirement' },
      frrID: { 'ui:widget': 'uniqueEnumSelect', 'ui:options': { formContextKey: 'selectedFRIDs' } },
      frrImplementation: {
        'ui:options': { addButtonLabel: 'Add Implementation Statement' },
        items: { 'ui:widget': 'markdown' },
      },
      frrValidation: {
        'ui:options': { addButtonLabel: 'Add Validation Statement' },
        items: { 'ui:widget': 'markdown' },
      },
      frrAssessment: {
        'ui:options': { addButtonLabel: 'Add Assessment Statement' },
        items: { 'ui:widget': 'markdown' },
      },
      // old CR26: direct frId / FR_ID + securityAchievement
      frId: { 'ui:widget': 'uniqueEnumSelect', 'ui:options': { formContextKey: 'selectedFRIDs' } },
      FR_ID: { 'ui:widget': 'uniqueEnumSelect', 'ui:options': { formContextKey: 'selectedFRIDs' } },
      securityAchievement: {
        'ui:options': { addButtonLabel: 'Add Security Achievement' },
        items: {
          'ui:options': { removeButtonLabel: 'Remove Security Achievement' },
          securityTests: {
            'ui:options': { addButtonLabel: 'Add Security Test' },
            items: {
              'ui:options': { removeButtonLabel: 'Remove Security Test' },
              evidence: {
                'ui:options': { addButtonLabel: 'Add Evidence' },
                items: { 'ui:options': { removeButtonLabel: 'Remove Evidence' } },
              },
            },
          },
        },
      },
    },
  },
  // --- Key security indicators (new SDR: ksiImplementation etc. directly on each item) ---
  keySecurityIndicators: {
    'ui:options': { addButtonLabel: 'Add Key Security Indicator' },
    items: {
      'ui:options': { removeButtonLabel: 'Remove Key Security Indicator' },
      ksiImplementation: {
        'ui:options': { addButtonLabel: 'Add Implementation Statement' },
        items: { 'ui:widget': 'markdown' },
      },
      ksiValidation: {
        'ui:options': { addButtonLabel: 'Add Validation Statement' },
        items: { 'ui:widget': 'markdown' },
      },
      ksiAssessment: {
        'ui:options': { addButtonLabel: 'Add Assessment Statement' },
        items: { 'ui:widget': 'markdown' },
      },
      ksiTests: {
        'ui:options': { addButtonLabel: 'Add Security Test' },
        items: { 'ui:options': { removeButtonLabel: 'Remove Security Test' } },
      },
      ksiEvidence: {
        'ui:options': { addButtonLabel: 'Add Evidence' },
        items: { 'ui:options': { removeButtonLabel: 'Remove Evidence' } },
      },
      // old 20x: nested fedRAMP_requirements under keySecurityIndicators
      fedRAMP_requirements: {
        'ui:options': { addButtonLabel: 'Add FedRAMP Requirement' },
        items: {
          'ui:options': { removeButtonLabel: 'Remove FedRAMP Requirement' },
          FR_ID: { 'ui:widget': 'uniqueEnumSelect', 'ui:options': { formContextKey: 'selectedFRIDs' } },
        },
      },
    },
  },
};

export function buildMarkdownUiSchema(schema) {
  function walk(node) {
    node = resolveLocalRef(schema, node);
    if (!node?.properties) return {};

    const result = {};
    for (const [key, rawProp] of Object.entries(node.properties)) {
      const prop = resolveLocalRef(schema, rawProp);
      if (!prop) continue;

      if (prop.type === 'string' && prop.description?.includes(MARKDOWN_MARKER)) {
        result[key] = { 'ui:widget': 'markdown' };
      } else if (prop.type === 'object') {
        const nested = walk(prop);
        if (Object.keys(nested).length) result[key] = nested;
      } else if (prop.type === 'array' && prop.items) {
        const nested = walk(resolveLocalRef(schema, prop.items));
        if (Object.keys(nested).length) result[key] = { items: nested };
      }
    }
    return result;
  }

  return walk(schema);
}

export function mergeUiSchema(base, overlay) {
  const result = { ...base };
  for (const [key, val] of Object.entries(overlay)) {
    if (key in result) {
      if (typeof result[key] === 'object' && !Array.isArray(result[key]) &&
          typeof val === 'object' && !Array.isArray(val)) {
        result[key] = mergeUiSchema(result[key], val);
      }
      // base takes precedence for primitives and existing widget assignments
    } else {
      result[key] = val;
    }
  }
  return result;
}
