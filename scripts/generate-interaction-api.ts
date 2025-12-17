import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the actual interactions from backend
import { interactions } from '../backend/index.js';

// Try to load schema for strict types
interface QueryInteractionSchema {
  dataTarget: string;
  dataTargetType: 'entity' | 'relation';
  allowedFields?: string[];
}

interface ExtractedSchema {
  queryInteractions: Record<string, QueryInteractionSchema>;
}

function loadSchema(): ExtractedSchema | null {
  const schemaPath = join(__dirname, '../frontend/api/schema.json');
  if (existsSync(schemaPath)) {
    const schemaContent = readFileSync(schemaPath, 'utf-8');
    return JSON.parse(schemaContent);
  }
  return null;
}

// Map interaqt types to TypeScript types
function mapToTsType(type: string): string {
  switch (type) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'object':
      return 'Record<string, any>';
    case 'array':
      return 'any[]';
    default:
      return 'any';
  }
}

// Generate type definition for interaction payload
function generatePayloadType(interaction: any): string {
  // All interactions with payload use the same pattern
  if (interaction.payload) {
    const typeName = `${interaction.name}Payload`;
    const fields = interaction.payload.items.map((item: any) => {
      const tsType = mapToTsType(item.type);
      const optional = item.required === false ? '?' : '';
      return `  ${item.name}${optional}: ${tsType};`;
    }).join('\n');

    return `export interface ${typeName} {\n${fields}\n}`;
  }
  
  return '';
}

// Generate type definition for user query parameters (for query-type interactions)
// Query-type interactions always accept match, attributeQuery, and modifier
function generateUserQueryType(): string {
  return `// User query parameters for query-type interactions
// @deprecated Use interaction-specific types from attributeQuery-types.generated.ts instead
// AttributeQueryData is a recursive type that matches interaqt framework's structure
// It can be:
// - A string representing an attribute name (e.g., 'id', 'name', '*')
// - A tuple [relationName, { attributeQuery?: AttributeQueryData }] for nested queries
export type AttributeQueryData = (string | [string, { attributeQuery?: AttributeQueryData }])[];

export interface UserQueryParams {
  match?: {
    key: string;
    value: [string, any];
  };
  attributeQuery?: AttributeQueryData;
  modifier?: {
    limit?: number;
    offset?: number;
    orderBy?: {
      [field: string]: 'ASC' | 'DESC';
    };
  };
}`;
}

// Generate imports for strict query types
function generateStrictTypeImports(schema: ExtractedSchema | null): string {
  if (!schema) return '';
  
  const queryInteractions = Object.keys(schema.queryInteractions);
  if (queryInteractions.length === 0) return '';
  
  const imports = queryInteractions.map(name => `${name}QueryParams`).join(',\n  ');
  
  return `// Strict query parameter types (generated from schema)
import type {
  ${imports}
} from './attributeQuery-types.generated';
`;
}

// Generate response type definitions
function generateResponseTypes(): string {
  return `// Response types from interaqt framework
// Query responses always have data field as an array
export interface QueryResponse<T = any> {
  data: T[];
  error?: any;
  effects?: any;
}

// Mutation responses have optional data, error, and effects
export interface MutationResponse<T = any> {
  data?: T;
  error?: any;
  effects?: any;
}`;
}

// Main function to generate the API file
async function generateApi() {
  // Try to load schema for strict types
  const schema = loadSchema();
  
  // Generate the API file content with only types and interaction metadata
  let apiContent = `// Auto-generated API types and metadata
// Generated on: ${new Date().toISOString()}
// This file only contains types and interaction definitions
// The actual fetch logic is handled by APIClient

`;

  // Generate strict type imports if schema exists
  if (schema) {
    apiContent += generateStrictTypeImports(schema) + '\n';
  }

  // Generate response types first
  apiContent += generateResponseTypes() + '\n\n';

  // Generate user query params type (used by all query-type interactions)
  apiContent += generateUserQueryType() + '\n\n';

  // Generate payload types
  interactions.forEach((interaction: any) => {
    const payloadType = generatePayloadType(interaction);
    if (payloadType) {
      apiContent += payloadType + '\n\n';
    }
  });

  // Generate interaction metadata
  apiContent += `// Interaction metadata for APIClient\n`;
  apiContent += `export type InteractionType = 'query' | 'mutation';\n\n`;
  
  apiContent += `export interface InteractionDefinition {\n`;
  apiContent += `  name: string;\n`;
  apiContent += `  type: InteractionType;\n`;
  apiContent += `}\n\n`;
  
  apiContent += `export const interactions: Record<string, InteractionDefinition> = {\n`;
  
  interactions.forEach((interaction: any) => {
    const functionName = interaction.name;
    // Check if it's a query interaction by looking at the action name
    const interactionType = interaction.action.name === 'get' ? 'query' : 'mutation';
    apiContent += `  ${functionName}: { name: '${interaction.name}', type: '${interactionType}' },\n`;
  });
  
  apiContent += `};\n\n`;
  
  // Export all the types as a union for better type safety
  apiContent += `// Union types for all payloads\n`;
  
  const payloadTypes = interactions
    .filter((i: any) => i.payload)
    .map((i: any) => `${i.name}Payload`)
    .join(' | ');
  
  if (payloadTypes) {
    apiContent += `export type AnyPayload = ${payloadTypes};\n\n`;
  }

  // Generate a comprehensive API type map for type-safe API calls
  apiContent += `// Type-safe API method signatures\n`;
  apiContent += `export interface APIMethodMap {\n`;
  
  interactions.forEach((interaction: any) => {
    const functionName = interaction.name;
    const isQuery = interaction.action.name === 'get';
    const responseType = isQuery ? 'QueryResponse' : 'MutationResponse';
    
    if (isQuery) {
      // Query-type interactions always have two parameters: payload and query
      const payloadType = interaction.payload ? `${interaction.name}Payload` : 'undefined';
      
      // Use strict query type if available from schema
      let queryType: string;
      if (schema && schema.queryInteractions[functionName]) {
        queryType = `${functionName}QueryParams`;
      } else {
        queryType = 'UserQueryParams';
      }
      
      apiContent += `  ${functionName}: (payload: ${payloadType}, query?: ${queryType}) => Promise<${responseType}>;\n`;
    } else {
      // Mutation-type interactions only need payload (if any)
      if (interaction.payload) {
        apiContent += `  ${functionName}: (payload: ${interaction.name}Payload) => Promise<${responseType}>;\n`;
      } else {
        apiContent += `  ${functionName}: () => Promise<${responseType}>;\n`;
      }
    }
  });
  
  apiContent += `}\n\n`;

  // Generate type helpers for extracting parameter types
  apiContent += `// Type helpers for extracting parameter and return types\n`;
  apiContent += `export type APIMethodParams<T extends keyof APIMethodMap> = Parameters<APIMethodMap[T]>[0];\n`;
  apiContent += `export type APIMethodReturn<T extends keyof APIMethodMap> = ReturnType<APIMethodMap[T]>;\n`;

  // Write the API file
  const outputPath = join(__dirname, '../frontend/api/generated.ts');
  writeFileSync(outputPath, apiContent.trim() + '\n');

  console.log(`Generated API types file at: ${outputPath}`);
  console.log(`Generated ${interactions.length} interaction definitions:`);
  interactions.forEach((interaction: any) => {
    console.log(`  - ${interaction.name} (${interaction.action.name})`);
  });
}

// Run the generator
generateApi();