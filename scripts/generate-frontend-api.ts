import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the actual interactions from backend
import { interactions } from '../backend/index.js';

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

// Generate type definition for interaction query (for get-type interactions)
function generateQueryType(interaction: any): string {
  // Check if interaction has query items
  if (interaction.query && interaction.query.items) {
    const typeName = `${interaction.name}Query`;
    const fields = interaction.query.items.map((item: any) => {
      // Query items might have different structure, use any for now
      return `  ${item.name}?: any;`;
    }).join('\n');

    return `export interface ${typeName} {\n${fields}\n}`;
  }
  
  return '';
}

// Main function to generate the API file
async function generateApi() {
  // Generate the API file content with only types and interaction metadata
  let apiContent = `// Auto-generated API types and metadata
// Generated on: ${new Date().toISOString()}
// This file only contains types and interaction definitions
// The actual fetch logic is handled by APIClient

`;

  // Generate payload/query types
  interactions.forEach((interaction: any) => {
    const payloadType = generatePayloadType(interaction);
    if (payloadType) {
      apiContent += payloadType + '\n\n';
    }
    
    const queryType = generateQueryType(interaction);
    if (queryType) {
      apiContent += queryType + '\n\n';
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

  // Generate query union type
  const queryTypes = interactions
    .filter((i: any) => i.query)
    .map((i: any) => `${i.name}Query`)
    .join(' | ');
  
  if (queryTypes) {
    apiContent += `export type AnyQuery = ${queryTypes};\n\n`;
  }

  // Generate a comprehensive API type map for type-safe API calls
  apiContent += `// Type-safe API method signatures\n`;
  apiContent += `export interface APIMethodMap {\n`;
  
  interactions.forEach((interaction: any) => {
    const functionName = interaction.name;
    const isQuery = interaction.action.name === 'get';
    
    let paramType = 'void';
    if (interaction.payload) {
      paramType = `${interaction.name}Payload`;
    } else if (interaction.query) {
      paramType = `${interaction.name}Query`;
    } else if (isQuery) {
      // Query without explicit query definition, use generic query params
      paramType = 'Record<string, any>';
    }
    
    // For now, return type is any - could be enhanced with response types
    apiContent += `  ${functionName}: (params${paramType === 'void' ? '?' : ''}: ${paramType}) => Promise<any>;\n`;
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