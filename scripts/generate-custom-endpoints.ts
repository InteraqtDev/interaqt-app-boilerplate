/**
 * Custom Endpoints Generator
 * 
 * Generates TypeScript type definitions for custom API endpoints.
 * This script reads the OpenAPI spec and generates types that are compatible
 * with the existing APIClient interface.
 */

// Set default environment variables FIRST, before any imports
process.env.S3_REGION = process.env.S3_REGION || 'us-east-1';
process.env.S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || 'dummy';
process.env.S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || 'dummy';
process.env.S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://localhost';
process.env.S3_BUCKET = process.env.S3_BUCKET || 'dummy';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dummy';

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import APIs from integration entries (api/index.js is optional)
import AggregatedIntegrationClass from '../integrations/entries/index.js';
import { entities, relations, activities, interactions, dicts } from '../backend/index.js';
import { API } from '../integrations/index.js';

// Try to import custom apis from api/index.js if it exists
let apis: API[] = [];

interface OpenAPISchema {
  openapi: string;
  components: {
    schemas: {
      [name: string]: {
        type?: string;
        properties?: Record<string, any>;
        required?: string[];
        additionalProperties?: boolean;
      };
    };
  };
}

/**
 * Convert API name (possibly with namespace) to valid schema name
 * e.g., "auth/register" -> "AuthRegister"
 */
function toSchemaName(apiName: string): string {
  return apiName
    .split('/')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Parse API full name into namespace and api name parts
 * e.g., "auth/register" -> { namespace: "auth", apiName: "register" }
 * e.g., "simpleApi" -> { namespace: undefined, apiName: "simpleApi" }
 */
function parseAPIName(fullName: string): { namespace: string | undefined; apiName: string } {
  const parts = fullName.split('/');
  if (parts.length === 1) {
    return { namespace: undefined, apiName: parts[0] };
  }
  // namespace/apiName format
  return { namespace: parts[0], apiName: parts.slice(1).join('/') };
}

/**
 * Group APIs by namespace
 * Returns a map of namespace -> list of { fullName, apiName, api }
 */
function groupAPIsByNamespace(allAPIs: Record<string, API>): Map<string, Array<{ fullName: string; apiName: string; api: API }>> {
  const grouped = new Map<string, Array<{ fullName: string; apiName: string; api: API }>>();
  
  for (const [fullName, api] of Object.entries(allAPIs)) {
    const { namespace, apiName } = parseAPIName(fullName);
    const ns = namespace || '_root_'; // Use special key for APIs without namespace
    
    if (!grouped.has(ns)) {
      grouped.set(ns, []);
    }
    grouped.get(ns)!.push({ fullName, apiName, api });
  }
  
  return grouped;
}

/**
 * Convert JSON Schema type to TypeScript type
 */
function jsonSchemaToTsType(schema: any, indent: string = ''): string {
  if (!schema) return 'any';
  
  if (schema.type === 'string') {
    if (schema.format === 'email') return 'string';
    return 'string';
  }
  if (schema.type === 'number' || schema.type === 'integer') {
    return 'number';
  }
  if (schema.type === 'boolean') {
    return 'boolean';
  }
  if (schema.type === 'array') {
    const itemType = jsonSchemaToTsType(schema.items, indent);
    return `${itemType}[]`;
  }
  if (schema.type === 'object') {
    if (!schema.properties) {
      return 'Record<string, any>';
    }
    
    const required = schema.required || [];
    const props = Object.entries(schema.properties).map(([key, propSchema]) => {
      const isOptional = !required.includes(key);
      const propType = jsonSchemaToTsType(propSchema as any, indent + '  ');
      return `${indent}  ${key}${isOptional ? '?' : ''}: ${propType};`;
    }).join('\n');
    
    return `{\n${props}\n${indent}}`;
  }
  
  return 'any';
}

/**
 * Generate TypeScript interface from JSON Schema
 */
function generateInterfaceFromSchema(name: string, schema: any): string {
  if (!schema || schema.type !== 'object') {
    return `export type ${name} = any;\n`;
  }
  
  const required = schema.required || [];
  const properties = schema.properties || {};
  
  const fields = Object.entries(properties).map(([key, propSchema]) => {
    const isOptional = !required.includes(key);
    const propType = jsonSchemaToTsType(propSchema as any, '');
    return `  ${key}${isOptional ? '?' : ''}: ${propType};`;
  }).join('\n');
  
  return `export interface ${name} {\n${fields}\n}\n`;
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

// Main generation function
async function generateCustomEndpoints() {
  console.log('Starting custom endpoints generation...');
  
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

  // Try to load OpenAPI spec for type information
  const openapiPath = join(__dirname, '../frontend/api/openapi.json');
  let openapiSpec: OpenAPISchema | null = null;
  
  if (existsSync(openapiPath)) {
    try {
      openapiSpec = JSON.parse(readFileSync(openapiPath, 'utf-8'));
      console.log('Loaded OpenAPI spec for type generation');
    } catch (error) {
      console.warn('Failed to load OpenAPI spec, using fallback types');
    }
  }

  // Generate the file content
  let content = `// Auto-generated custom API endpoints
// Generated on: ${new Date().toISOString()}
// This file contains type definitions for custom API endpoints
// Types are generated from OpenAPI spec when available

import { CustomEndpoint } from './APIClient';

`;

  // Generate parameter types
  content += `// ============================================\n`;
  content += `// Parameter Type Definitions\n`;
  content += `// ============================================\n\n`;

  for (const apiName of Object.keys(allAPIs)) {
    const schemaName = `${toSchemaName(apiName)}Request`;
    const interfaceName = `${toSchemaName(apiName)}Params`;
    
    if (openapiSpec?.components?.schemas?.[schemaName]) {
      // Use OpenAPI schema
      content += generateInterfaceFromSchema(interfaceName, openapiSpec.components.schemas[schemaName]);
    } else {
      // Fallback to legacy params
      const api = allAPIs[apiName] as API;
      if (api.useNamedParams && api.params) {
        const params = api.params as Record<string, string>;
        const fields = Object.entries(params).map(([key, type]) => {
          const isOptional = typeof type === 'string' && type.endsWith('?');
          const baseType = isOptional ? type.slice(0, -1) : type;
          const tsType = baseType === 'string' ? 'string' : 
                        baseType === 'number' ? 'number' : 
                        baseType === 'boolean' ? 'boolean' : 'any';
          return `  ${key}${isOptional ? '?' : ''}: ${tsType};`;
        }).join('\n');
        content += `export interface ${interfaceName} {\n${fields}\n}\n`;
      } else {
        content += `export interface ${interfaceName} {}\n`;
      }
    }
    content += '\n';
  }

  // Generate response types
  content += `// ============================================\n`;
  content += `// Response Type Definitions\n`;
  content += `// ============================================\n\n`;

  for (const apiName of Object.keys(allAPIs)) {
    const schemaName = `${toSchemaName(apiName)}Response`;
    const typeName = schemaName;
    
    if (openapiSpec?.components?.schemas?.[schemaName]) {
      // Use OpenAPI schema
      content += generateInterfaceFromSchema(typeName, openapiSpec.components.schemas[schemaName]);
    } else {
      // Fallback to any
      content += `export type ${typeName} = any; // TODO: Define specific response type\n`;
    }
    content += '\n';
  }

  // Group APIs by namespace
  const groupedAPIs = groupAPIsByNamespace(allAPIs);
  
  // Generate endpoint definitions with nested namespace structure
  content += `// ============================================\n`;
  content += `// Endpoint Definitions (Nested by Namespace)\n`;
  content += `// ============================================\n\n`;

  // Generate nested endpoint structure
  content += `export interface NamespacedCustomEndpoints {\n`;
  for (const [namespace, apis] of groupedAPIs) {
    if (namespace === '_root_') {
      // Root-level APIs without namespace
      for (const { apiName } of apis) {
        content += `  ${apiName}: CustomEndpoint;\n`;
      }
    } else {
      content += `  ${namespace}: {\n`;
      for (const { apiName } of apis) {
        content += `    ${apiName}: CustomEndpoint;\n`;
      }
      content += `  };\n`;
    }
  }
  content += `}\n\n`;

  content += `export const customEndpoints: NamespacedCustomEndpoints = {\n`;
  for (const [namespace, apis] of groupedAPIs) {
    if (namespace === '_root_') {
      // Root-level APIs without namespace
      for (const { fullName, apiName } of apis) {
        content += `  ${apiName}: {\n`;
        content += `    path: '${fullName}',\n`;
        content += `    method: 'POST' as const,\n`;
        content += `  },\n`;
      }
    } else {
      content += `  ${namespace}: {\n`;
      for (const { fullName, apiName } of apis) {
        content += `    ${apiName}: {\n`;
        content += `      path: '${fullName}',\n`;
        content += `      method: 'POST' as const,\n`;
        content += `    },\n`;
      }
      content += `  },\n`;
    }
  }
  content += `};\n\n`;

  // Generate CustomAPIMethodMap for type-safe calls with nested structure
  content += `// ============================================\n`;
  content += `// Type-safe API Method Map (Nested by Namespace)\n`;
  content += `// ============================================\n\n`;

  content += `export interface CustomAPIMethodMap {\n`;
  for (const [namespace, apis] of groupedAPIs) {
    if (namespace === '_root_') {
      // Root-level APIs without namespace
      for (const { fullName, apiName } of apis) {
        const paramsInterface = `${toSchemaName(fullName)}Params`;
        const responseType = `${toSchemaName(fullName)}Response`;
        
        const schemaName = `${toSchemaName(fullName)}Request`;
        const hasRequiredParams = openapiSpec?.components?.schemas?.[schemaName]?.required?.length ?? 0 > 0;
        
        if (hasRequiredParams) {
          content += `  ${apiName}: (params: ${paramsInterface}) => Promise<${responseType}>;\n`;
        } else {
          content += `  ${apiName}: (params?: ${paramsInterface}) => Promise<${responseType}>;\n`;
        }
      }
    } else {
      content += `  ${namespace}: {\n`;
      for (const { fullName, apiName } of apis) {
        const paramsInterface = `${toSchemaName(fullName)}Params`;
        const responseType = `${toSchemaName(fullName)}Response`;
        
        const schemaName = `${toSchemaName(fullName)}Request`;
        const hasRequiredParams = openapiSpec?.components?.schemas?.[schemaName]?.required?.length ?? 0 > 0;
        
        if (hasRequiredParams) {
          content += `    ${apiName}: (params: ${paramsInterface}) => Promise<${responseType}>;\n`;
        } else {
          content += `    ${apiName}: (params?: ${paramsInterface}) => Promise<${responseType}>;\n`;
        }
      }
      content += `  };\n`;
    }
  }
  content += `}\n\n`;

  // Generate type helpers for nested structure
  content += `// Type helpers for extracting parameter and return types\n`;
  content += `// For namespaced APIs, use CustomAPIMethodParams<'namespace', 'apiName'>\n`;
  content += `export type CustomAPIMethodParams<\n`;
  content += `  NS extends keyof CustomAPIMethodMap,\n`;
  content += `  API extends keyof CustomAPIMethodMap[NS]\n`;
  content += `> = CustomAPIMethodMap[NS][API] extends (...args: infer P) => any ? P[0] : never;\n\n`;
  content += `export type CustomAPIMethodReturn<\n`;
  content += `  NS extends keyof CustomAPIMethodMap,\n`;
  content += `  API extends keyof CustomAPIMethodMap[NS]\n`;
  content += `> = CustomAPIMethodMap[NS][API] extends (...args: any) => infer R ? R : never;\n`;

  // Write the file
  const outputPath = join(__dirname, '../frontend/api/custom-endpoints.generated.ts');
  writeFileSync(outputPath, content);

  console.log(`✅ Generated custom endpoints file at: ${outputPath}`);
  console.log(`✅ Generated ${Object.keys(allAPIs).length} endpoint definitions`);
}

// Run the generator
generateCustomEndpoints().catch(console.error);
