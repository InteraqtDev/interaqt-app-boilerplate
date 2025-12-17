import fs from 'fs'
import path from 'path'

interface PropertyInfo {
  type: string
  purpose: string
  controlType: string
  computationMethod?: string
  initialValue?: string
}

interface EntityInfo {
  purpose: string
  entityType?: string
  properties?: Record<string, PropertyInfo>
  commonProperties?: Array<{name: string, type: string, required: boolean, description: string}>
  extends?: string
  lifecycle?: {
    creation?: any
    deletion?: {
      canBeDeleted: boolean
      deletionType: string
      deletionInteractions: any[]
    }
  }
}

interface RelationInfo {
  type: string
  purpose: string
  sourceEntity: string
  targetEntity: string
  sourceProperty: string
  targetProperty: string
  properties?: Record<string, any>
  extends?: string
}

interface DataDesign {
  metadata?: any
  entities: Record<string, EntityInfo>
  relations: Record<string, RelationInfo>
  dictionaries?: Record<string, any>
}

interface PayloadField {
  type: string
  description: string
  required: boolean
  properties?: Record<string, string>
}

interface InteractionSpec {
  id: string
  type: string
  specification: {
    role: string
    action: string
    conditions: string[]
    payload: Record<string, PayloadField>
    data: {
      reads?: string[]
      creates?: any[]
      updates?: any[]
      deletes?: any[]
    }
    dataConstraints: string[]
  }
}

interface InteractionsDesign {
  interactions: InteractionSpec[]
}

function generateImports(hasPolymorphicEntity: boolean, hasHardDeletion: boolean, externalImports: string[]): string {
  const baseImports = [
    'Entity',
    'Property',
    'Relation',
    'Interaction',
    'Action',
    'GetAction',
    'Payload',
    'PayloadItem'
  ]
  
  const conditionalImports = []
  if (hasHardDeletion) {
    conditionalImports.push('HardDeletionProperty')
  }
  
  const allImports = [...baseImports, ...conditionalImports]
  
  let importCode = `import { \n  ${allImports.join(',\n  ')}\n} from 'interaqt'\n`
  
  // Add external module imports
  if (externalImports.length > 0) {
    for (const ext of externalImports) {
      importCode += `${ext}\n`
    }
  }
  
  return importCode + '\n'
}

function needsHardDeletion(entityInfo: EntityInfo): boolean {
  // Check if entity can be deleted based on lifecycle info
  if (entityInfo.lifecycle?.deletion) {
    const deletionType = entityInfo.lifecycle.deletion.deletionType
    return deletionType === 'hard-delete'
  }
  return false
}

function normalizePropertyType(type: string): string {
  // Normalize property types - convert 'timestamp' to 'number' as used in actual code
  if (type === 'timestamp') {
    return 'number'
  }
  return type
}

function generateEntityCode(entityName: string, entityInfo: EntityInfo): string {
  let code = `/**\n * ${entityName} - ${entityInfo.purpose}\n`
  if (entityInfo.entityType) {
    code += ` * Entity Type: ${entityInfo.entityType}\n`
  }
  code += ` */\n`
  
  // Handle polymorphic entities
  if (entityInfo.entityType === 'polymorphic' && entityInfo.commonProperties) {
    code += `export const ${entityName} = Entity.create({\n`
    code += `  name: '${entityName}',\n`
    code += `  inputEntities: [],  // Concrete entities will be pushed here by other modules\n`
    code += `  commonProperties: [\n`
    
    for (const prop of entityInfo.commonProperties) {
      code += `    Property.create({\n`
      code += `      name: '${prop.name}',\n`
      code += `      type: '${normalizePropertyType(prop.type)}'\n`
      code += `    }),\n`
    }
    
    code += `  ]\n`
    code += `})\n\n`
    return code
  }
  
  // Regular entities
  code += `export const ${entityName} = Entity.create({\n`
  code += `  name: '${entityName}',\n`
  code += `  properties: [\n`
  
  if (entityInfo.properties) {
    for (const [propName, propInfo] of Object.entries(entityInfo.properties)) {
      code += `    Property.create({\n`
      code += `      name: '${propName}',\n`
      code += `      type: '${normalizePropertyType(propInfo.type)}'\n`
      
      // Add defaultValue only if not computed and has appropriate initial value
      if (propInfo.controlType !== 'computed-aggregation' && 
          propInfo.controlType !== 'computed-derived' &&
          propInfo.initialValue) {
        if (propInfo.initialValue === "''") {
          code += `,\n      defaultValue: () => ''\n`
        } else if (propInfo.initialValue === '""') {
          code += `,\n      defaultValue: () => ''\n`
        } else if (!propInfo.initialValue.toLowerCase().includes('payload') &&
                   !propInfo.initialValue.toLowerCase().includes('interaction') &&
                   propInfo.initialValue !== 'Date.now()' &&
                   propInfo.initialValue !== 'now()') {
          // Add other simple default values if needed
        }
      }
      
      code += `    }),\n`
    }
  }
  
  // Add HardDeletionProperty if needed
  if (needsHardDeletion(entityInfo)) {
    code += `    HardDeletionProperty.create()\n`
  }
  
  code += `  ]\n`
  code += `})\n\n`
  
  return code
}

function generateRelationCode(relationName: string, relationInfo: RelationInfo, entities: Record<string, EntityInfo>): string {
  let code = `/**\n * ${relationName} - ${relationInfo.purpose}\n`
  code += ` * Type: ${relationInfo.type}\n`
  code += ` */\n`
  
  code += `export const ${relationName} = Relation.create({\n`
  
  // Clean entity names (remove @module suffix)
  const sourceEntityClean = cleanEntityName(relationInfo.sourceEntity)
  const targetEntityClean = cleanEntityName(relationInfo.targetEntity)
  
  const relType = relationInfo.type
  
  if (relType === '1:n') {
    // Flip source/target for 1:n
    code += `  source: ${targetEntityClean},\n`
    code += `  sourceProperty: '${relationInfo.targetProperty}',\n`
    code += `  target: ${sourceEntityClean},\n`
    code += `  targetProperty: '${relationInfo.sourceProperty}',\n`
    code += `  type: 'n:1'\n`
  } else if (relType === 'n:1') {
    // Keep as is for n:1
    code += `  source: ${sourceEntityClean},\n`
    code += `  sourceProperty: '${relationInfo.sourceProperty}',\n`
    code += `  target: ${targetEntityClean},\n`
    code += `  targetProperty: '${relationInfo.targetProperty}',\n`
    code += `  type: 'n:1'\n`
  } else if (relType === '1:1') {
    // For 1:1, keep as defined in design
    code += `  source: ${sourceEntityClean},\n`
    code += `  sourceProperty: '${relationInfo.sourceProperty}',\n`
    code += `  target: ${targetEntityClean},\n`
    code += `  targetProperty: '${relationInfo.targetProperty}',\n`
    code += `  type: '1:1'\n`
  } else if (relType === 'n:n') {
    code += `  source: ${sourceEntityClean},\n`
    code += `  sourceProperty: '${relationInfo.sourceProperty}',\n`
    code += `  target: ${targetEntityClean},\n`
    code += `  targetProperty: '${relationInfo.targetProperty}',\n`
    code += `  type: 'n:n'`
    
    // Add properties if present
    if (relationInfo.properties && Object.keys(relationInfo.properties).length > 0) {
      code += `,\n  properties: [\n`
      for (const [propName, propInfo] of Object.entries(relationInfo.properties)) {
        code += `    Property.create({\n`
        code += `      name: '${propName}',\n`
        code += `      type: '${normalizePropertyType((propInfo as any).type)}'`
        // Add defaultValue for timestamp properties
        if ((propInfo as any).type === 'timestamp' || (propInfo as any).type === 'number') {
          if ((propInfo as any).controlType === 'creation-only' || propName.includes('At')) {
            code += `,\n      defaultValue: () => Math.floor(Date.now() / 1000)`
          }
        }
        code += `\n    }),\n`
      }
      code += `  ]\n`
    } else {
      code += `\n`
    }
  }
  
  code += `})\n\n`
  
  return code
}

function generateActionName(interactionId: string, actionVerb: string): string {
  // Generate proper action name from interaction ID and action verb
  // Examples:
  //   CreatePost + create -> createPost
  //   DeleteComment + delete -> deleteComment  
  //   UpdateUserProfile + update -> updateUserProfile
  //   RechargeCredit + create -> rechargeCredit
  //   RetryVolcJimengImageGeneration + create -> retryVolcJimengImageGeneration
  
  // If the interaction name already starts with the action verb, use it directly
  const lowerInteractionId = interactionId.toLowerCase()
  const lowerActionVerb = actionVerb.toLowerCase()
  
  if (lowerInteractionId.startsWith('create')) {
    return interactionId.charAt(0).toLowerCase() + interactionId.slice(1)
  } else if (lowerInteractionId.startsWith('update')) {
    return interactionId.charAt(0).toLowerCase() + interactionId.slice(1)
  } else if (lowerInteractionId.startsWith('delete')) {
    return interactionId.charAt(0).toLowerCase() + interactionId.slice(1)
  } else if (lowerInteractionId.startsWith('recharge') || 
             lowerInteractionId.startsWith('send') ||
             lowerInteractionId.startsWith('retry') ||
             lowerInteractionId.startsWith('join') ||
             lowerInteractionId.startsWith('leave')) {
    // Special cases where the action verb is embedded in the name
    return interactionId.charAt(0).toLowerCase() + interactionId.slice(1)
  } else {
    // Default: actionVerb + remaining part
    return lowerActionVerb + interactionId
  }
}

function generateInteractionCode(interaction: InteractionSpec): string {
  const isQuery = interaction.type === 'read'
  
  let code = `/**\n * ${interaction.id}\n`
  code += ` * Type: ${interaction.type}\n`
  code += ` */\n`
  
  code += `export const ${interaction.id} = Interaction.create({\n`
  code += `  name: '${interaction.id}',\n`
  
  if (isQuery) {
    code += `  action: GetAction,\n`
    
    // Try to infer data entity from reads
    let dataEntity = null
    if (interaction.specification.data.reads && interaction.specification.data.reads.length > 0) {
      const firstRead = interaction.specification.data.reads[0]
      const parts = firstRead.split('.')
      if (parts.length > 0) {
        dataEntity = cleanEntityName(parts[0])  // Clean entity name (remove @module)
      }
    }
    
    if (dataEntity) {
      code += `  data: ${dataEntity}\n`
    }
  } else {
    // Mutation
    const actionName = generateActionName(interaction.id, interaction.specification.action)
    code += `  action: Action.create({ name: '${actionName}' }),\n`
    
    // Generate payload
    const payloadFields = interaction.specification.payload
    if (payloadFields && Object.keys(payloadFields).length > 0) {
      code += `  payload: Payload.create({\n`
      code += `    items: [\n`
      
      for (const [fieldName, fieldInfo] of Object.entries(payloadFields)) {
        // Skip complex nested objects like pagination and sorting for now
        if (fieldInfo.type === 'object' && fieldInfo.properties) {
          code += `      // TODO: Handle complex payload field: ${fieldName}\n`
          continue
        }
        
        code += `      PayloadItem.create({ `
        code += `name: '${fieldName}', `
        code += `type: '${fieldInfo.type}'`
        if (fieldInfo.required !== undefined) {
          code += `, required: ${fieldInfo.required}`
        }
        code += ` }),\n`
      }
      
      code += `    ]\n`
      code += `  })\n`
    }
  }
  
  code += `})\n\n`
  
  return code
}

function cleanEntityName(entityName: string): string {
  // Remove @module suffix if present
  // e.g., "User@basic" -> "User"
  // e.g., "Post@basic" -> "Post"
  const match = entityName.match(/^(.+)@.+$/)
  return match ? match[1] : entityName
}

function getModuleFromEntityName(entityName: string): string | null {
  // Extract module name from entity name
  // e.g., "User@basic" -> "basic"
  // e.g., "CreditConsumptionRecord@credit" -> "credit"
  const match = entityName.match(/^.+@(.+)$/)
  return match ? match[1] : null
}

function analyzeExternalImports(dataDesign: DataDesign, interactionsDesign: InteractionsDesign, module: string): string[] {
  const externalImports: string[] = []
  const importsByModule = new Map<string, Set<string>>()
  
  // Check entities for extends field
  for (const [entityName, entityInfo] of Object.entries(dataDesign.entities)) {
    if (entityInfo.extends) {
      const extModule = getModuleFromEntityName(entityInfo.extends)
      const extEntityName = cleanEntityName(entityInfo.extends)
      
      if (extModule && extModule !== '_self' && extModule !== module) {
        if (!importsByModule.has(extModule)) {
          importsByModule.set(extModule, new Set())
        }
        importsByModule.get(extModule)!.add(extEntityName)
      }
    }
  }
  
  // Check relations for external entities
  // Note: In data design files, only EXTERNAL entities need @module suffix
  //       Current module entities should NOT have @module suffix
  for (const [relationName, relationInfo] of Object.entries(dataDesign.relations)) {
    // Check source entity
    const sourceEntityClean = cleanEntityName(relationInfo.sourceEntity)
    const sourceModule = getModuleFromEntityName(relationInfo.sourceEntity)
    
    // If entity is not in current module's entities, it's external
    if (!dataDesign.entities[sourceEntityClean]) {
      // If module is specified, use it
      if (sourceModule && sourceModule !== module) {
        if (!importsByModule.has(sourceModule)) {
          importsByModule.set(sourceModule, new Set())
        }
        importsByModule.get(sourceModule)!.add(sourceEntityClean)
      } else if (!sourceModule) {
        // No module specified for external entity
        // For backward compatibility, assume it's from 'basic' module (common entities like User, Post)
        // Recommended: Always use @moduleName for external entities in new design files
        const assumedModule = 'basic'
        if (assumedModule !== module) {
          if (!importsByModule.has(assumedModule)) {
            importsByModule.set(assumedModule, new Set())
          }
          importsByModule.get(assumedModule)!.add(sourceEntityClean)
        }
      }
    }
    
    // Check target entity
    const targetEntityClean = cleanEntityName(relationInfo.targetEntity)
    const targetModule = getModuleFromEntityName(relationInfo.targetEntity)
    
    // If entity is not in current module's entities, it's external
    if (!dataDesign.entities[targetEntityClean]) {
      // If module is specified, use it
      if (targetModule && targetModule !== module) {
        if (!importsByModule.has(targetModule)) {
          importsByModule.set(targetModule, new Set())
        }
        importsByModule.get(targetModule)!.add(targetEntityClean)
      } else if (!targetModule) {
        // No module specified for external entity
        // For backward compatibility, assume it's from 'basic' module
        // Recommended: Always use @moduleName for external entities in new design files
        const assumedModule = 'basic'
        if (assumedModule !== module) {
          if (!importsByModule.has(assumedModule)) {
            importsByModule.set(assumedModule, new Set())
          }
          importsByModule.get(assumedModule)!.add(targetEntityClean)
        }
      }
    }
    
    // Check if relation extends another relation
    if (relationInfo.extends) {
      const relExtModule = getModuleFromEntityName(relationInfo.extends as string)
      const relExtName = cleanEntityName(relationInfo.extends as string)
      
      if (relExtModule && relExtModule !== module) {
        if (!importsByModule.has(relExtModule)) {
          importsByModule.set(relExtModule, new Set())
        }
        importsByModule.get(relExtModule)!.add(relExtName)
      }
    }
  }
  
  // Check interactions for external entities in data.reads
  for (const interaction of interactionsDesign.interactions) {
    if (interaction.specification.data.reads) {
      for (const readPath of interaction.specification.data.reads) {
        const parts = readPath.split('.')
        if (parts.length > 0) {
          const entityName = parts[0]
          const entityClean = cleanEntityName(entityName)
          const entityModule = getModuleFromEntityName(entityName)
          
          if (!dataDesign.entities[entityClean] && entityModule && entityModule !== module) {
            if (!importsByModule.has(entityModule)) {
              importsByModule.set(entityModule, new Set())
            }
            importsByModule.get(entityModule)!.add(entityClean)
          }
        }
      }
    }
  }
  
  // Generate import statements grouped by module
  for (const [moduleName, entities] of importsByModule.entries()) {
    const entityList = Array.from(entities).sort().join(', ')
    externalImports.push(`import { ${entityList} } from './${moduleName}.js'`)
  }
  
  return externalImports
}

function generateModuleCode(module: string, outputDir: string): void {
  console.log(`\n🔄 Generating code for module: ${module}`)
  
  // Read input files
  const dataDesignPath = path.join(process.cwd(), `agentspace/${module}.data-design.json`)
  const interactionsDesignPath = path.join(process.cwd(), `agentspace/${module}.interactions-design.json`)
  
  if (!fs.existsSync(dataDesignPath)) {
    console.error(`❌ Data design file not found: ${dataDesignPath}`)
    return
  }
  
  if (!fs.existsSync(interactionsDesignPath)) {
    console.error(`❌ Interactions design file not found: ${interactionsDesignPath}`)
    return
  }
  
  const dataDesign: DataDesign = JSON.parse(fs.readFileSync(dataDesignPath, 'utf-8'))
  const interactionsDesign: InteractionsDesign = JSON.parse(fs.readFileSync(interactionsDesignPath, 'utf-8'))
  
  // Analyze if we have polymorphic entities or hard deletion
  const hasPolymorphicEntity = Object.values(dataDesign.entities).some(e => e.entityType === 'polymorphic')
  const hasHardDeletion = Object.values(dataDesign.entities).some(e => needsHardDeletion(e))
  
  // Analyze external imports
  const externalImports = analyzeExternalImports(dataDesign, interactionsDesign, module)
  
  // Generate code sections
  let code = ''
  
  // Imports
  code += generateImports(hasPolymorphicEntity, hasHardDeletion, externalImports)
  
  // Entities
  code += '// =============================================================================\n'
  code += '// ENTITIES\n'
  code += '// =============================================================================\n\n'
  
  const entityNames: string[] = []
  for (const [entityName, entityInfo] of Object.entries(dataDesign.entities)) {
    code += generateEntityCode(entityName, entityInfo)
    entityNames.push(entityName)
  }
  
  // Add push statements for entities that extend polymorphic entities
  for (const [entityName, entityInfo] of Object.entries(dataDesign.entities)) {
    if (entityInfo.extends) {
      const extModule = getModuleFromEntityName(entityInfo.extends)
      const extEntityName = cleanEntityName(entityInfo.extends)
      
      if (extModule && extModule !== '_self') {
        // External polymorphic entity - add push statement
        code += `// Push ${entityName} into polymorphic entity ${extEntityName} from ${extModule} module\n`
        code += `${extEntityName}.inputEntities.push(${entityName})\n\n`
      } else if (extModule === '_self') {
        // Same module polymorphic entity - add push statement
        code += `// Push ${entityName} into polymorphic entity ${extEntityName}\n`
        code += `${extEntityName}.inputEntities.push(${entityName})\n\n`
      }
    }
  }
  
  // Relations
  code += '// =============================================================================\n'
  code += '// RELATIONS\n'
  code += '// =============================================================================\n\n'
  
  const relationNames: string[] = []
  for (const [relationName, relationInfo] of Object.entries(dataDesign.relations)) {
    code += generateRelationCode(relationName, relationInfo, dataDesign.entities)
    relationNames.push(relationName)
  }
  
  // Interactions
  code += '// =============================================================================\n'
  code += '// INTERACTIONS\n'
  code += '// =============================================================================\n\n'
  
  const interactionNames: string[] = []
  for (const interaction of interactionsDesign.interactions) {
    code += generateInteractionCode(interaction)
    interactionNames.push(interaction.id)
  }
  
  // Exports
  code += '// =============================================================================\n'
  code += '// EXPORTS\n'
  code += '// =============================================================================\n\n'
  
  code += `export const entities = [${entityNames.join(', ')}]\n`
  code += `export const relations = [${relationNames.join(', ')}]\n`
  code += `export const activities = []\n`
  code += `export const interactions = [\n`
  code += interactionNames.map(name => `  ${name}`).join(',\n')
  code += `\n]\n`
  code += `export const dicts = []\n`
  
  // Write output file
  const outputPath = path.join(outputDir, `${module}.ts`)
  fs.writeFileSync(outputPath, code, 'utf-8')
  
  console.log(`✅ Generated: ${outputPath}`)
}

// =============================================================================
// MODULE DETECTION
// =============================================================================

function getCurrentModule(): string | null {
  const currentModulePath = path.join(process.cwd(), '.currentmodule')
  
  if (fs.existsSync(currentModulePath)) {
    const content = fs.readFileSync(currentModulePath, 'utf-8').trim()
    if (content) {
      return content
    }
  }
  
  return null
}

function getModulesToGenerate(): string[] {
  // Check for command line argument
  const args = process.argv.slice(2)
  
  if (args.length > 0) {
    // Modules specified via command line
    return args
  }
  
  // Try to read from .currentmodule
  const currentModule = getCurrentModule()
  
  if (currentModule) {
    console.log(`📖 Reading module from .currentmodule: ${currentModule}`)
    return [currentModule]
  }
  
  // No module specified, show usage
  console.error('❌ No module specified!')
  console.error('\nUsage:')
  console.error('  npx tsx scripts/generateModuleCode.ts <module1> [module2] [...]')
  console.error('  or create .currentmodule file with module name')
  console.error('\nExamples:')
  console.error('  npx tsx scripts/generateModuleCode.ts basic')
  console.error('  npx tsx scripts/generateModuleCode.ts basic chat credit')
  console.error('  echo "genImage" > .currentmodule && npx tsx scripts/generateModuleCode.ts')
  process.exit(1)
}

// Main execution
const modules = getModulesToGenerate()
const outputDir = path.join(process.cwd(), 'agentspace/output')

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

console.log('🚀 Starting code generation...')
console.log(`📁 Output directory: ${outputDir}`)
console.log(`📦 Modules to generate: ${modules.join(', ')}`)

for (const module of modules) {
  generateModuleCode(module, outputDir)
}

console.log('\n✨ Code generation complete!')

