/**
 * OpenAPI Spec Generator
 * 
 * Generates OpenAPI 3.1 specification from Zod schemas attached to API definitions.
 * This script collects all custom APIs from integrations and generates a comprehensive
 * OpenAPI spec file for frontend type generation.
 */

// Set default environment variables FIRST, before any imports
process.env.S3_REGION = process.env.S3_REGION || 'us-east-1';
process.env.S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || 'dummy';
process.env.S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || 'dummy';
process.env.S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://localhost';
process.env.S3_BUCKET = process.env.S3_BUCKET || 'dummy';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dummy';

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { z, type ZodSchema } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import APIs from integration entries (api/index.js is optional)
import AggregatedIntegrationClass from '../integrations/entries/index.js';
import { entities, relations, activities, interactions, dicts } from '../backend/basic.js';
import { API } from '../integrations/index.js';

// Try to import custom apis from api/index.js if it exists
let apis: API[] = [];


interface OpenAPIPathOperation {
  summary?: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  requestBody?: {
    required: boolean;
    content: {
      'application/json': {
        schema: { $ref: string } | object;
      };
    };
  };
  responses: {
    [statusCode: string]: {
      description: string;
      content?: {
        'application/json': {
          schema: { $ref: string } | object;
        };
      };
    };
  };
}

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: {
    [path: string]: {
      post?: OpenAPIPathOperation;
    };
  };
  components: {
    schemas: {
      [name: string]: object;
    };
  };
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert API name (possibly with namespace) to valid schema name
 * e.g., "auth/register" -> "AuthRegister"
 */
function toSchemaName(apiName: string): string {
  return apiName
    .split('/')
    .map(part => capitalize(part))
    .join('');
}

/**
 * Convert Zod schema to JSON Schema for OpenAPI
 * Uses Zod v4's built-in z.toJSONSchema() method
 */
function zodSchemaToJsonSchema(schema: ZodSchema, name: string): object {
  try {
    const jsonSchema = z.toJSONSchema(schema);
    
    // Remove $schema as it's not needed in OpenAPI components
    const { $schema, ...cleanSchema } = jsonSchema as any;
    
    return cleanSchema;
  } catch (error) {
    console.warn(`Warning: Failed to convert schema for ${name}:`, error);
    return { type: 'object' };
  }
}

/**
 * Generate OpenAPI spec from API definitions
 */
function generateOpenAPISpec(allAPIs: Record<string, API>): OpenAPISpec {
  const spec: OpenAPISpec = {
    openapi: '3.1.0',
    info: {
      title: 'Interaqt API',
      version: '1.0.0',
      description: 'Auto-generated API documentation from Zod schemas'
    },
    paths: {},
    components: {
      schemas: {}
    }
  };

  for (const [apiName, api] of Object.entries(allAPIs)) {
    const path = `/api/custom/${apiName}`;
    const operation: OpenAPIPathOperation = {
      responses: {
        '200': {
          description: 'Successful response'
        },
        '400': {
          description: 'Validation error'
        },
        '401': {
          description: 'Unauthorized'
        },
        '500': {
          description: 'Internal server error'
        }
      }
    };

    // Add OpenAPI metadata if available
    if (api.openapi) {
      if (api.openapi.summary) operation.summary = api.openapi.summary;
      if (api.openapi.description) operation.description = api.openapi.description;
      if (api.openapi.tags) operation.tags = api.openapi.tags;
      if (api.openapi.deprecated) operation.deprecated = api.openapi.deprecated;
    } else {
      operation.summary = `${capitalize(apiName)} API`;
    }

    // Handle request schema
    if (api.paramsSchema) {
      const requestSchemaName = `${toSchemaName(apiName)}Request`;
      const jsonSchema = zodSchemaToJsonSchema(api.paramsSchema, requestSchemaName);
      spec.components.schemas[requestSchemaName] = jsonSchema;
      
      operation.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/${requestSchemaName}` }
          }
        }
      };
    } else if (api.params && api.useNamedParams) {
      // Fallback to legacy params definition
      const requestSchemaName = `${toSchemaName(apiName)}Request`;
      const properties: Record<string, object> = {};
      const required: string[] = [];
      
      for (const [key, type] of Object.entries(api.params as Record<string, string>)) {
        const isOptional = typeof type === 'string' && type.endsWith('?');
        const baseType = isOptional ? type.slice(0, -1) : type;
        
        properties[key] = {
          type: baseType === 'string' ? 'string' : 
                baseType === 'number' ? 'number' : 
                baseType === 'boolean' ? 'boolean' : 'object'
        };
        
        if (!isOptional) {
          required.push(key);
        }
      }
      
      spec.components.schemas[requestSchemaName] = {
        type: 'object',
        properties,
        ...(required.length > 0 ? { required } : {})
      };
      
      operation.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/${requestSchemaName}` }
          }
        }
      };
    }

    // Handle response schema
    if (api.responseSchema) {
      const responseSchemaName = `${toSchemaName(apiName)}Response`;
      const jsonSchema = zodSchemaToJsonSchema(api.responseSchema, responseSchemaName);
      spec.components.schemas[responseSchemaName] = jsonSchema;
      
      operation.responses['200'] = {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/${responseSchemaName}` }
          }
        }
      };
    }

    spec.paths[path] = { post: operation };
  }

  return spec;
}

/**
 * Convert API array to a map indexed by full API name (namespace/name or just name)
 */
function buildAPIMap(apiArray: API[]): Record<string, API> {
  const apiMap: Record<string, API> = {};
  for (const api of apiArray) {
    const fullName = api.namespace ? `${api.namespace}/${api.name}` : api.name;
    apiMap[fullName] = api;
  }
  return apiMap;
}

async function main() {
  console.log('Starting OpenAPI spec generation...');

  // Get extension APIs
  const integration = new AggregatedIntegrationClass({
    entities: entities,
    relations: relations,
    activities: activities,
    interactions: interactions,
    dict: dicts,
  });
  
  const extensionAPIsArray = integration.createAPIs?.() || [];
  const extensionAPIs = buildAPIMap(extensionAPIsArray);
  
  // Combine all APIs (apis from api/index.js is also an array now)
  const apisMap = buildAPIMap(apis);
  const allAPIs = { ...apisMap, ...extensionAPIs };
  
  console.log(`Found ${Object.keys(allAPIs).length} custom APIs:`, Object.keys(allAPIs));

  // Count APIs with Zod schemas
  const apisWithSchema = Object.entries(allAPIs).filter(([_, api]) => 
    (api as API).paramsSchema || (api as API).responseSchema
  );
  console.log(`APIs with Zod schemas: ${apisWithSchema.length}`);

  // Generate OpenAPI spec
  const spec = generateOpenAPISpec(allAPIs as Record<string, API>);

  // Write spec to file
  const outputPath = join(__dirname, '../frontend/api/openapi.json');
  writeFileSync(outputPath, JSON.stringify(spec, null, 2));

  console.log(`✅ OpenAPI spec generated at: ${outputPath}`);
  console.log(`✅ Generated ${Object.keys(spec.paths).length} path definitions`);
  console.log(`✅ Generated ${Object.keys(spec.components.schemas).length} schema definitions`);
}

main().catch(console.error);

