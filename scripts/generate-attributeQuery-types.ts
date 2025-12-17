/**
 * AttributeQuery Strict Types Generator
 * 
 * Generates strict TypeScript types for AttributeQuery based on schema.json.
 * Uses fixed-depth recursion to handle circular entity relationships.
 * 
 * Output: frontend/api/attributeQuery-types.generated.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Schema types (matching schema.json structure)
interface PropertySchema {
  name: string;
  type: string;
}

interface RelationSchema {
  propertyName: string;
  targetEntity: string;
  relationType: '1:n' | 'n:1' | 'n:n';
  isSource: boolean;
  relationName: string;
  relationProperties?: PropertySchema[];
}

interface EntitySchema {
  properties: PropertySchema[];
  relations: RelationSchema[];
}

interface RelationDefinitionSchema {
  source: string;
  target: string;
  type: string;
  sourceProperty: string;
  targetProperty: string;
  properties?: PropertySchema[];
}

interface QueryInteractionSchema {
  dataTarget: string;
  dataTargetType: 'entity' | 'relation';
  allowedFields?: string[];
}

interface ExtractedSchema {
  entities: Record<string, EntitySchema>;
  relations: Record<string, RelationDefinitionSchema>;
  queryInteractions: Record<string, QueryInteractionSchema>;
  generatedAt: string;
}

// Configuration
const MAX_DEPTH = 3;

// Load schema
function loadSchema(): ExtractedSchema {
  const schemaPath = join(__dirname, '../frontend/api/schema.json');
  const schemaContent = readFileSync(schemaPath, 'utf-8');
  return JSON.parse(schemaContent);
}

// Generate property literal type for an entity
function generatePropertyType(entityName: string, properties: PropertySchema[]): string {
  const propertyNames = properties.map(p => `'${p.name}'`).join(' | ');
  return `export type ${entityName}PropertyName = ${propertyNames};`;
}

// Generate relation query type for a specific depth
function generateRelationQueryType(
  entityName: string,
  relations: RelationSchema[],
  depth: number,
  schema: ExtractedSchema
): string {
  if (relations.length === 0 || depth <= 0) {
    return '';
  }

  const unionMembers: string[] = [];

  for (const relation of relations) {
    const targetEntity = relation.targetEntity;
    const targetDepth = depth - 1;
    
    // For n:n relations with properties, we need to support the '&' special property
    // to access relation-specific properties (e.g., displayOrder, addedAt)
    // Usage: ['feedItems', { attributeQuery: ['id', 'url', ['&', { attributeQuery: ['displayOrder'] }]] }]
    // Access in result: feedItem['&'].displayOrder
    if (relation.relationType === 'n:n' && relation.relationProperties && relation.relationProperties.length > 0) {
      const safeRelationName = relation.relationName.replace(/[^a-zA-Z0-9]/g, '_');
      
      // Build the nested type that includes both target entity properties AND the '&' special property
    let nestedType: string;
    if (targetDepth <= 0) {
        // At depth 0: target entity properties + '&' with relation properties
        nestedType = `(${targetEntity}PropertyName | ['&', { attributeQuery?: ${safeRelationName}RelationPropertyName[] }])[]`;
    } else {
        // At depth > 0: target entity full query + '&' with relation properties
        nestedType = `(${targetEntity}AttributeQueryD${targetDepth} | ['&', { attributeQuery?: ${safeRelationName}RelationPropertyName[] }])[]`;
    }
      unionMembers.push(`['${relation.propertyName}', { attributeQuery?: ${nestedType} }]`);
    } else {
      // Regular relation (1:n, n:1) or n:n without properties - directly access target entity
      let nestedType: string;
      if (targetDepth <= 0) {
        nestedType = `${targetEntity}PropertyName[]`;
      } else {
        nestedType = `${targetEntity}AttributeQueryD${targetDepth}[]`;
      }
      unionMembers.push(`['${relation.propertyName}', { attributeQuery?: ${nestedType} }]`);
    }
  }

  if (unionMembers.length === 0) {
    return '';
  }

  return unionMembers.join('\n  | ');
}

// Generate AttributeQuery type for an entity at a specific depth
function generateAttributeQueryForDepth(
  entityName: string,
  entity: EntitySchema,
  depth: number,
  schema: ExtractedSchema
): string {
  const lines: string[] = [];

  if (depth === 0) {
    // At depth 0, only property names are allowed
    lines.push(`export type ${entityName}AttributeQueryD0 = ${entityName}PropertyName;`);
  } else {
    // Generate relation query type for this depth
    const relationQueryType = generateRelationQueryType(entityName, entity.relations, depth, schema);
    
    if (relationQueryType) {
      lines.push(`export type ${entityName}RelationQueryD${depth} =`);
      lines.push(`  | ${relationQueryType};`);
      lines.push('');
      lines.push(`export type ${entityName}AttributeQueryD${depth} = ${entityName}PropertyName | ${entityName}RelationQueryD${depth};`);
    } else {
      // No relations at this level, just use property names
      lines.push(`export type ${entityName}AttributeQueryD${depth} = ${entityName}PropertyName;`);
    }
  }

  return lines.join('\n');
}

// Generate all depth levels for an entity
function generateEntityTypes(entityName: string, entity: EntitySchema, schema: ExtractedSchema): string {
  const lines: string[] = [];

  // Generate property literal type
  lines.push(generatePropertyType(entityName, entity.properties));
  lines.push('');

  // Generate types for each depth level
  for (let depth = 0; depth <= MAX_DEPTH; depth++) {
    lines.push(generateAttributeQueryForDepth(entityName, entity, depth, schema));
    lines.push('');
  }

  // Export the max depth as the standard type
  lines.push(`/** AttributeQuery type for ${entityName} with max depth ${MAX_DEPTH} */`);
  lines.push(`export type ${entityName}AttributeQuery = ${entityName}AttributeQueryD${MAX_DEPTH}[];`);

  return lines.join('\n');
}

// Generate types for n:n relation (when used as data target)
function generateRelationTypes(relationName: string, relation: RelationDefinitionSchema, schema: ExtractedSchema): string {
  const lines: string[] = [];
  
  // Relation has its own properties plus source/target
  const relationProps = relation.properties || [];
  const allProps = [
    ...relationProps,
    { name: 'source', type: 'relation' },
    { name: 'target', type: 'relation' }
  ];

  // Property type for the relation
  const propNames = allProps.map(p => `'${p.name}'`).join(' | ');
  const safeRelationName = relationName.replace(/[^a-zA-Z0-9]/g, '_');
  lines.push(`export type ${safeRelationName}PropertyName = ${propNames};`);
  lines.push('');

  // For depth 0, just property names
  lines.push(`export type ${safeRelationName}AttributeQueryD0 = ${safeRelationName}PropertyName;`);
  lines.push('');

  // For higher depths, allow nested queries into source and target
  for (let depth = 1; depth <= MAX_DEPTH; depth++) {
    const sourceEntity = relation.source;
    const targetEntity = relation.target;
    const nestedDepth = depth - 1;

    let sourceType: string;
    let targetType: string;

    if (nestedDepth <= 0) {
      sourceType = `${sourceEntity}PropertyName[]`;
      targetType = `${targetEntity}PropertyName[]`;
    } else {
      sourceType = `${sourceEntity}AttributeQueryD${nestedDepth}[]`;
      targetType = `${targetEntity}AttributeQueryD${nestedDepth}[]`;
    }

    lines.push(`export type ${safeRelationName}RelationQueryD${depth} =`);
    lines.push(`  | ['source', { attributeQuery?: ${sourceType} }]`);
    lines.push(`  | ['target', { attributeQuery?: ${targetType} }];`);
    lines.push('');
    lines.push(`export type ${safeRelationName}AttributeQueryD${depth} = ${safeRelationName}PropertyName | ${safeRelationName}RelationQueryD${depth};`);
    lines.push('');
  }

  lines.push(`/** AttributeQuery type for ${relationName} relation with max depth ${MAX_DEPTH} */`);
  lines.push(`export type ${safeRelationName}AttributeQuery = ${safeRelationName}AttributeQueryD${MAX_DEPTH}[];`);

  return lines.join('\n');
}

// Generate query parameter type for an interaction
function generateInteractionQueryType(
  interactionName: string,
  interaction: QueryInteractionSchema,
  schema: ExtractedSchema
): string {
  const { dataTarget, dataTargetType } = interaction;
  
  let attributeQueryType: string;
  
  if (dataTargetType === 'relation') {
    const safeRelationName = dataTarget.replace(/[^a-zA-Z0-9]/g, '_');
    attributeQueryType = `${safeRelationName}AttributeQuery`;
  } else {
    attributeQueryType = `${dataTarget}AttributeQuery`;
  }

  return `export interface ${interactionName}QueryParams {
  match?: MatchExpression;
  attributeQuery?: ${attributeQueryType};
  modifier?: QueryModifier;
}`;
}

// Generate the complete types file
function generateTypesFile(schema: ExtractedSchema): string {
  const lines: string[] = [];

  // Header
  lines.push(`/**
 * Strict AttributeQuery Types
 * 
 * Auto-generated from schema.json
 * Generated: ${new Date().toISOString()}
 * Max recursion depth: ${MAX_DEPTH}
 * 
 * DO NOT EDIT MANUALLY
 */

`);

  // Common types
  lines.push(`// ============== Common Types ==============

/**
 * Match expression for filtering query results
 * Supports nested key paths like 'owner.id' or 'channel.name'
 */
export interface MatchExpression {
  key: string;
  value: [string, any];
}

/**
 * Query modifier for pagination and ordering
 */
export interface QueryModifier {
  limit?: number;
  offset?: number;
  orderBy?: Record<string, 'ASC' | 'DESC' | 'asc' | 'desc'>;
}

`);

  // First, collect all n:n relations with properties (they need RelationPropertyName types)
  const n2nRelationsWithProperties = new Set<string>();
  for (const [relationName, relation] of Object.entries(schema.relations)) {
    if (relation.type === 'n:n' && relation.properties && relation.properties.length > 0) {
      n2nRelationsWithProperties.add(relationName);
    }
  }

  // Generate RelationPropertyName types for n:n relations with properties
  // These are used with the '&' special property to access relation-specific fields
  if (n2nRelationsWithProperties.size > 0) {
    lines.push('// ============== Relation Property Types (for & accessor) ==============\n');
    lines.push('// These types define properties accessible via the & special property in n:n relation queries\n');
    
    for (const relationName of n2nRelationsWithProperties) {
      const relation = schema.relations[relationName];
      if (relation && relation.properties) {
        const safeRelationName = relationName.replace(/[^a-zA-Z0-9]/g, '_');
        const propertyNames = relation.properties.map(p => `'${p.name}'`).join(' | ');
        lines.push(`export type ${safeRelationName}RelationPropertyName = ${propertyNames};`);
      }
    }
    lines.push('');
  }

  // Generate entity types
  lines.push('// ============== Entity AttributeQuery Types ==============\n');
  
  for (const [entityName, entity] of Object.entries(schema.entities)) {
    lines.push(`// --- ${entityName} ---`);
    lines.push(generateEntityTypes(entityName, entity, schema));
    lines.push('');
  }

  // Generate relation types for:
  // 1. Relations used as data targets in queryInteractions
  // 2. ALL n:n relations with properties (so they can be accessed from entity relations)
  lines.push('// ============== Relation AttributeQuery Types ==============\n');
  
  const relationsToGenerate = new Set<string>();
  
  // Add relations used as data targets in queryInteractions
  for (const interaction of Object.values(schema.queryInteractions)) {
    if (interaction.dataTargetType === 'relation') {
      relationsToGenerate.add(interaction.dataTarget);
    }
  }
  
  // Add ALL n:n relations with properties (they need types for nested queries from entities)
  for (const [relationName, relation] of Object.entries(schema.relations)) {
    if (relation.type === 'n:n' && relation.properties && relation.properties.length > 0) {
      relationsToGenerate.add(relationName);
    }
  }

  for (const relationName of relationsToGenerate) {
    if (schema.relations[relationName]) {
      lines.push(`// --- ${relationName} ---`);
      lines.push(generateRelationTypes(relationName, schema.relations[relationName], schema));
      lines.push('');
    }
  }

  // Generate interaction-specific query types
  lines.push('// ============== Interaction Query Parameter Types ==============\n');

  for (const [interactionName, interaction] of Object.entries(schema.queryInteractions)) {
    lines.push(generateInteractionQueryType(interactionName, interaction, schema));
    lines.push('');
  }

  // Generate type map for all query interactions
  lines.push(`// ============== Query Type Map ==============

/**
 * Map of interaction names to their query parameter types
 */
export interface QueryInteractionMap {`);

  for (const [interactionName, interaction] of Object.entries(schema.queryInteractions)) {
    const { dataTarget, dataTargetType } = interaction;
    let attributeQueryType: string;
    
    if (dataTargetType === 'relation') {
      const safeRelationName = dataTarget.replace(/[^a-zA-Z0-9]/g, '_');
      attributeQueryType = `${safeRelationName}AttributeQuery`;
    } else {
      attributeQueryType = `${dataTarget}AttributeQuery`;
    }
    
    lines.push(`  ${interactionName}: ${interactionName}QueryParams;`);
  }

  lines.push(`}

/**
 * Helper type to get the AttributeQuery type for an interaction
 */
export type InteractionAttributeQuery<T extends keyof QueryInteractionMap> = 
  QueryInteractionMap[T]['attributeQuery'];
`);

  // Backward compatibility type
  lines.push(`
// ============== Backward Compatibility ==============

/**
 * Legacy loose AttributeQuery type for backward compatibility
 * @deprecated Use interaction-specific types instead (e.g., ChannelAttributeQuery)
 */
export type AttributeQueryDataLegacy = (string | [string, { attributeQuery?: AttributeQueryDataLegacy }])[];
`);

  return lines.join('\n');
}

// Main execution
function main() {
  console.log('Generating strict AttributeQuery types...');
  
  const schema = loadSchema();
  const typesContent = generateTypesFile(schema);
  
  const outputPath = join(__dirname, '../frontend/api/attributeQuery-types.generated.ts');
  writeFileSync(outputPath, typesContent);
  
  console.log(`Types generated successfully!`);
  console.log(`Output: ${outputPath}`);
  console.log(`\nGenerated types for:`);
  console.log(`  - ${Object.keys(schema.entities).length} entities`);
  console.log(`  - ${Object.keys(schema.queryInteractions).length} query interactions`);
}

main();

