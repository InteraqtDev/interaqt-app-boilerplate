/**
 * Schema Extraction Script
 * 
 * Extracts structured schema data from backend Entity/Relation/Interaction definitions
 * for generating strict AttributeQuery types.
 * 
 * Output: frontend/api/schema.json
 * Generated: Auto-generated, do not edit manually
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import backend definitions
import { entities, relations, interactions } from '../backend/index.js';

// Type definitions for extracted schema
interface PropertySchema {
  name: string;
  type: string;
}

interface RelationSchema {
  propertyName: string;      // Property name on this entity (e.g., 'channels', 'owner')
  targetEntity: string;      // The related entity name
  relationType: '1:n' | 'n:1' | 'n:n';
  isSource: boolean;         // Whether this entity is the source of the relation
  relationName: string;      // The actual relation name
  relationProperties?: PropertySchema[];  // For n:n relations, the relation's own properties
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

// Extract properties from an entity or relation
function extractProperties(definition: any): PropertySchema[] {
  if (!definition.properties) return [];
  
  return definition.properties
    .filter((prop: any) => {
      // Skip internal properties like _softDeletion and hard deletion property
      const name = prop.name;
      return !name.startsWith('_') && name !== '__deletion__';
    })
    .map((prop: any) => ({
      name: prop.name,
      type: prop.type || 'any'
    }));
}

// Get relation type from perspective of an entity
function getRelationTypeForEntity(relation: any, isSource: boolean): '1:n' | 'n:1' | 'n:n' {
  const relType = relation.type;
  
  if (relType === 'n:n') {
    return 'n:n';
  }
  
  if (relType === '1:n') {
    // source side is "1", target side is "n"
    return isSource ? '1:n' : 'n:1';
  }
  
  if (relType === 'n:1') {
    return isSource ? 'n:1' : '1:n';
  }
  
  if (relType === '1:1') {
    return isSource ? '1:n' : 'n:1'; // Treat as 1:n for simplicity
  }
  
  return '1:n';
}

// Extract schema from backend definitions
function extractSchema(): ExtractedSchema {
  const schema: ExtractedSchema = {
    entities: {},
    relations: {},
    queryInteractions: {},
    generatedAt: new Date().toISOString()
  };
  
  // Step 1: Extract all entities
  for (const entity of entities) {
    const entityName = entity.name;
    
    schema.entities[entityName] = {
      properties: [
        { name: 'id', type: 'string' },  // All entities have an id
        ...extractProperties(entity)
      ],
      relations: []
    };
  }
  
  // Step 2: Extract all relations and build bidirectional mappings
  for (const relation of relations) {
    const relationName = relation.name;
    const sourceName = relation.source.name;
    const targetName = relation.target.name;
    const sourceProperty = relation.sourceProperty;
    const targetProperty = relation.targetProperty;
    
    // Store relation definition
    schema.relations[relationName] = {
      source: sourceName,
      target: targetName,
      type: relation.type,
      sourceProperty,
      targetProperty,
      properties: relation.properties ? [
        { name: 'id', type: 'string' },  // Relations also have an id
        ...extractProperties(relation)
      ] : undefined
    };
    
    // Add relation mapping to source entity
    if (schema.entities[sourceName]) {
      schema.entities[sourceName].relations.push({
        propertyName: sourceProperty,
        targetEntity: targetName,
        relationType: getRelationTypeForEntity(relation, true),
        isSource: true,
        relationName,
        relationProperties: relation.type === 'n:n' && relation.properties ? [
          { name: 'id', type: 'string' },
          ...extractProperties(relation)
        ] : undefined
      });
    }
    
    // Add relation mapping to target entity
    if (schema.entities[targetName]) {
      schema.entities[targetName].relations.push({
        propertyName: targetProperty,
        targetEntity: sourceName,
        relationType: getRelationTypeForEntity(relation, false),
        isSource: false,
        relationName,
        relationProperties: relation.type === 'n:n' && relation.properties ? [
          { name: 'id', type: 'string' },
          ...extractProperties(relation)
        ] : undefined
      });
    }
  }
  
  // Step 3: Extract query interactions (those using GetAction)
  for (const interaction of interactions) {
    // Check if this is a GetAction (query type)
    if (interaction.action.name !== 'get') continue;
    
    const interactionName = interaction.name;
    const dataTarget = interaction.data;
    
    if (!dataTarget) continue;
    
    // Determine if data target is an entity or relation
    const isRelation = relations.some((r: any) => r.name === dataTarget.name);
    const isEntity = entities.some((e: any) => e.name === dataTarget.name);
    
    // Extract allowed fields from dataPolicy if available
    let allowedFields: string[] | undefined;
    if (interaction.dataPolicy?.attributeQuery) {
      allowedFields = extractAllowedFieldsFromAttributeQuery(interaction.dataPolicy.attributeQuery);
    }
    
    schema.queryInteractions[interactionName] = {
      dataTarget: dataTarget.name,
      dataTargetType: isRelation ? 'relation' : 'entity',
      allowedFields
    };
  }
  
  return schema;
}

// Extract allowed field names from an attributeQuery definition
function extractAllowedFieldsFromAttributeQuery(attrQuery: any[]): string[] {
  const fields: string[] = [];
  
  for (const item of attrQuery) {
    if (typeof item === 'string') {
      fields.push(item);
    } else if (Array.isArray(item)) {
      // [relationName, { attributeQuery: [...] }]
      fields.push(item[0]);
    }
  }
  
  return fields;
}

// Main execution
function main() {
  console.log('Extracting schema from backend definitions...');
  
  const schema = extractSchema();
  
  // Write schema to JSON file
  const outputPath = join(__dirname, '../frontend/api/schema.json');
  writeFileSync(outputPath, JSON.stringify(schema, null, 2));
  
  console.log(`Schema extracted successfully!`);
  console.log(`Output: ${outputPath}`);
  console.log(`\nSummary:`);
  console.log(`  - Entities: ${Object.keys(schema.entities).length}`);
  Object.entries(schema.entities).forEach(([name, entity]) => {
    console.log(`    - ${name}: ${entity.properties.length} properties, ${entity.relations.length} relations`);
  });
  console.log(`  - Relations: ${Object.keys(schema.relations).length}`);
  console.log(`  - Query Interactions: ${Object.keys(schema.queryInteractions).length}`);
  Object.entries(schema.queryInteractions).forEach(([name, interaction]) => {
    console.log(`    - ${name} -> ${interaction.dataTarget} (${interaction.dataTargetType})`);
  });
}

main();

