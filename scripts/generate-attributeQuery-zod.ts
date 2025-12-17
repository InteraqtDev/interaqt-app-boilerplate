/**
 * AttributeQuery Zod Schema Generator
 * 
 * Generates Zod schemas for runtime validation of AttributeQuery based on schema.json.
 * Uses factory functions with depth limiting to handle recursive structures.
 * 
 * Output: frontend/api/attributeQuery-zod.generated.ts
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
const DEFAULT_MAX_DEPTH = 3;

// Load schema
function loadSchema(): ExtractedSchema {
  const schemaPath = join(__dirname, '../frontend/api/schema.json');
  const schemaContent = readFileSync(schemaPath, 'utf-8');
  return JSON.parse(schemaContent);
}

// Generate property enum schema for an entity
function generatePropertyEnumSchema(entityName: string, properties: PropertySchema[]): string {
  const propertyNames = properties.map(p => `'${p.name}'`).join(', ');
  return `const ${entityName}PropertyNameSchema = z.enum([${propertyNames}]);`;
}

// Generate the complete Zod file
function generateZodFile(schema: ExtractedSchema): string {
  const lines: string[] = [];

  // Header
  lines.push(`/**
 * Strict AttributeQuery Zod Schemas
 * 
 * Auto-generated from schema.json
 * Generated: ${new Date().toISOString()}
 * Default max recursion depth: ${DEFAULT_MAX_DEPTH}
 * 
 * DO NOT EDIT MANUALLY
 */

import { z } from 'zod';

`);

  // Common types and schemas
  lines.push(`// ============== Common Types ==============

/**
 * Safe parse result type (re-exported from Zod for convenience)
 */
export type SafeParseResult = z.ZodSafeParseResult<any>;

// ============== Common Schemas ==============

/**
 * Match expression schema for filtering query results
 */
export const MatchExpressionSchema = z.object({
  key: z.string(),
  value: z.tuple([z.string(), z.any()])
});

/**
 * Order direction enum schema
 */
export const OrderDirectionSchema = z.enum(['ASC', 'DESC', 'asc', 'desc']);

/**
 * Query modifier schema for pagination and ordering
 */
export const QueryModifierSchema = z.object({
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
  orderBy: z.record(z.string(), OrderDirectionSchema).optional()
});

`);

  // Generate property enum schemas for each entity
  lines.push('// ============== Entity Property Schemas ==============\n');
  
  for (const [entityName, entity] of Object.entries(schema.entities)) {
    lines.push(generatePropertyEnumSchema(entityName, entity.properties));
  }
  lines.push('');

  // Generate RelationPropertyName schemas for n:n relations with properties
  // These are used with the '&' special property to access relation-specific fields
  lines.push('// ============== Relation Property Schemas (for & accessor) ==============\n');
  
  for (const [relationName, relation] of Object.entries(schema.relations)) {
    if (relation.type === 'n:n' && relation.properties && relation.properties.length > 0) {
      const safeRelationName = relationName.replace(/[^a-zA-Z0-9]/g, '_');
      const propertyNames = relation.properties.map(p => `'${p.name}'`).join(', ');
      lines.push(`const ${safeRelationName}RelationPropertyNameSchema = z.enum([${propertyNames}]);`);
    }
  }
  lines.push('');

  // Collect relations that need schemas:
  // 1. Relations used as data targets in queryInteractions
  // 2. ALL n:n relations with properties (they need schemas for nested queries from entities)
  const relationsToGenerate = new Set<string>();
  
  // Add relations used as data targets in queryInteractions
  for (const interaction of Object.values(schema.queryInteractions)) {
    if (interaction.dataTargetType === 'relation') {
      relationsToGenerate.add(interaction.dataTarget);
    }
  }
  
  // Add ALL n:n relations with properties (they need schemas for nested queries from entities)
  for (const [relationName, relation] of Object.entries(schema.relations)) {
    if (relation.type === 'n:n' && relation.properties && relation.properties.length > 0) {
      relationsToGenerate.add(relationName);
    }
  }

  lines.push('// ============== Relation Property Schemas ==============\n');
  
  for (const relationName of relationsToGenerate) {
    const relation = schema.relations[relationName];
    if (relation) {
      const safeRelationName = relationName.replace(/[^a-zA-Z0-9]/g, '_');
      const allProps = [
        ...(relation.properties || []),
        { name: 'source', type: 'relation' },
        { name: 'target', type: 'relation' }
      ];
      const propertyNames = allProps.map(p => `'${p.name}'`).join(', ');
      lines.push(`const ${safeRelationName}PropertyNameSchema = z.enum([${propertyNames}]);`);
    }
  }
  lines.push('');

  // Generate AttributeQuery schema factories for each entity
  lines.push('// ============== Entity AttributeQuery Schema Factories ==============\n');

  for (const [entityName, entity] of Object.entries(schema.entities)) {
    lines.push(generateEntitySchemaFactory(entityName, entity, schema));
    lines.push('');
  }

  // Generate AttributeQuery schema factories for relations
  lines.push('// ============== Relation AttributeQuery Schema Factories ==============\n');

  for (const relationName of relationsToGenerate) {
    const relation = schema.relations[relationName];
    if (relation) {
      lines.push(generateRelationSchemaFactory(relationName, relation, schema));
      lines.push('');
    }
  }

  // Generate interaction-specific query schemas
  lines.push('// ============== Interaction Query Schemas ==============\n');

  for (const [interactionName, interaction] of Object.entries(schema.queryInteractions)) {
    lines.push(generateInteractionQuerySchema(interactionName, interaction, schema));
    lines.push('');
  }

  // Generate validation functions
  lines.push('// ============== Validation Functions ==============\n');

  for (const [interactionName, interaction] of Object.entries(schema.queryInteractions)) {
    lines.push(generateValidationFunctions(interactionName));
    lines.push('');
  }

  // Generate a generic validator map
  lines.push(`// ============== Validator Map ==============

/**
 * Map of interaction names to their query schema factories
 */
export const querySchemaFactories = {`);

  for (const interactionName of Object.keys(schema.queryInteractions)) {
    lines.push(`  ${interactionName}: create${interactionName}QuerySchema,`);
  }

  lines.push(`};

/**
 * Validate a query for any interaction
 * @param interactionName The name of the interaction
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: ${DEFAULT_MAX_DEPTH})
 * @returns Validation result
 */
export function validateInteractionQuery(
  interactionName: keyof typeof querySchemaFactories,
  query: unknown,
  maxDepth: number = ${DEFAULT_MAX_DEPTH}
): SafeParseResult {
  const factory = querySchemaFactories[interactionName];
  if (!factory) {
    // Return a failed result for unknown interactions
    return z.object({}).safeParse({ __unknown_interaction__: interactionName });
  }
  return factory(maxDepth).safeParse(query);
}
`);

  return lines.join('\n');
}

// Generate schema factory for an entity
function generateEntitySchemaFactory(entityName: string, entity: EntitySchema, schema: ExtractedSchema): string {
  const lines: string[] = [];
  
  lines.push(`/**
 * Create AttributeQuery schema for ${entityName} with depth limit
 * @param maxDepth Maximum recursion depth
 */
export function create${entityName}AttributeQuerySchema(maxDepth: number = ${DEFAULT_MAX_DEPTH}): z.ZodType<any> {
  const createSchema = (depth: number): z.ZodType<any> => {
    if (depth <= 0) {
      // At depth 0, only property names are allowed
      return ${entityName}PropertyNameSchema;
    }`);

  if (entity.relations.length > 0) {
    lines.push(`
    
    // At depth > 0, allow property names and relation queries
    // For n:n relations with properties, also support '&' special property for relation fields
    return z.union([
      ${entityName}PropertyNameSchema,`);
    
    for (const relation of entity.relations) {
      const targetEntity = relation.targetEntity;
      
      // Check if this is an n:n relation with properties
      if (relation.relationType === 'n:n' && relation.relationProperties && relation.relationProperties.length > 0) {
        const safeRelationName = relation.relationName.replace(/[^a-zA-Z0-9]/g, '_');
        // n:n relation with properties: support both target entity properties AND '&' for relation properties
        // For simplicity, we allow: target entity properties + '&' tuple
        // The nested relation queries on target entity are handled by the recursive depth check
        lines.push(`      z.tuple([
        z.literal('${relation.propertyName}'),
        z.object({
          attributeQuery: z.array(z.union([
            ${targetEntity}PropertyNameSchema,
            // '&' special property for accessing relation-specific fields
            z.tuple([
              z.literal('&'),
              z.object({
                attributeQuery: z.array(${safeRelationName}RelationPropertyNameSchema).optional()
              })
            ])
          ])).optional()
        })
      ]),`);
      } else {
        // Regular relation: only target entity properties
      lines.push(`      z.tuple([
        z.literal('${relation.propertyName}'),
        z.object({
          attributeQuery: create${targetEntity}AttributeQuerySchema(depth - 1).optional()
        })
      ]),`);
      }
    }
    
    lines.push(`    ]);`);
  } else {
    lines.push(`
    
    // No relations, only property names at any depth
    return ${entityName}PropertyNameSchema;`);
  }

  lines.push(`
  };
  
  return z.array(createSchema(maxDepth));
}`);

  return lines.join('\n');
}

// Generate schema factory for a relation
function generateRelationSchemaFactory(relationName: string, relation: RelationDefinitionSchema, schema: ExtractedSchema): string {
  const lines: string[] = [];
  const safeRelationName = relationName.replace(/[^a-zA-Z0-9]/g, '_');
  const sourceEntity = relation.source;
  const targetEntity = relation.target;
  
  lines.push(`/**
 * Create AttributeQuery schema for ${relationName} relation with depth limit
 * @param maxDepth Maximum recursion depth
 */
export function create${safeRelationName}AttributeQuerySchema(maxDepth: number = ${DEFAULT_MAX_DEPTH}): z.ZodType<any> {
  const createSchema = (depth: number): z.ZodType<any> => {
    if (depth <= 0) {
      // At depth 0, only property names are allowed
      return ${safeRelationName}PropertyNameSchema;
    }
    
    // At depth > 0, allow property names and source/target queries
    // Note: nested attributeQuery uses create...Schema directly (which returns z.array)
    return z.union([
      ${safeRelationName}PropertyNameSchema,
      z.tuple([
        z.literal('source'),
        z.object({
          attributeQuery: create${sourceEntity}AttributeQuerySchema(depth - 1).optional()
        })
      ]),
      z.tuple([
        z.literal('target'),
        z.object({
          attributeQuery: create${targetEntity}AttributeQuerySchema(depth - 1).optional()
        })
      ]),
    ]);
  };
  
  return z.array(createSchema(maxDepth));
}`);

  return lines.join('\n');
}

// Generate query schema for an interaction
function generateInteractionQuerySchema(interactionName: string, interaction: QueryInteractionSchema, schema: ExtractedSchema): string {
  const { dataTarget, dataTargetType } = interaction;
  
  let attributeQuerySchemaFactory: string;
  
  if (dataTargetType === 'relation') {
    const safeRelationName = dataTarget.replace(/[^a-zA-Z0-9]/g, '_');
    attributeQuerySchemaFactory = `create${safeRelationName}AttributeQuerySchema`;
  } else {
    attributeQuerySchemaFactory = `create${dataTarget}AttributeQuerySchema`;
  }

  return `/**
 * Create query schema for ${interactionName}
 * @param maxDepth Maximum recursion depth for attributeQuery
 */
export function create${interactionName}QuerySchema(maxDepth: number = ${DEFAULT_MAX_DEPTH}): z.ZodType<any> {
  return z.object({
    match: MatchExpressionSchema.optional(),
    attributeQuery: ${attributeQuerySchemaFactory}(maxDepth).optional(),
    modifier: QueryModifierSchema.optional()
  });
}`;
}

// Generate validation functions for an interaction
function generateValidationFunctions(interactionName: string): string {
  return `/**
 * Validate ${interactionName} query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: ${DEFAULT_MAX_DEPTH})
 * @returns true if valid, throws if invalid
 */
export function validate${interactionName}Query(query: unknown, maxDepth: number = ${DEFAULT_MAX_DEPTH}): boolean {
  create${interactionName}QuerySchema(maxDepth).parse(query);
  return true;
}

/**
 * Safely validate ${interactionName} query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: ${DEFAULT_MAX_DEPTH})
 * @returns Validation result with success/error
 */
export function safeParse${interactionName}Query(query: unknown, maxDepth: number = ${DEFAULT_MAX_DEPTH}): SafeParseResult {
  return create${interactionName}QuerySchema(maxDepth).safeParse(query);
}`;
}

// Main execution
function main() {
  console.log('Generating Zod schemas for AttributeQuery validation...');
  
  const schema = loadSchema();
  const zodContent = generateZodFile(schema);
  
  const outputPath = join(__dirname, '../frontend/api/attributeQuery-zod.generated.ts');
  writeFileSync(outputPath, zodContent);
  
  console.log(`Zod schemas generated successfully!`);
  console.log(`Output: ${outputPath}`);
  console.log(`\nGenerated validation for:`);
  console.log(`  - ${Object.keys(schema.entities).length} entities`);
  console.log(`  - ${Object.keys(schema.queryInteractions).length} query interactions`);
}

main();

