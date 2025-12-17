# Data Analysis Guide for interaqt Projects

## Overview

This guide explains how to analyze data requirements using the new requirement artifacts (`agentspace/{module}.data-concepts.json`, `agentspace/{module}.interactions-design.json`, and `agentspace/{module}.integration.json`) to produce a comprehensive data design for interaqt implementations. The analysis leverages pre-extracted data concepts, interaction specifications, and external integration requirements to determine entity lifecycles, property dependencies, and computation methods.

**IMPORTANT**: Read the current module name from `.currentmodule` file in project root, and use it to construct the file paths. For example, if `.currentmodule` contains `user-management`, then the paths would be:
- `agentspace/user-management.data-concepts.json`
- `agentspace/user-management.interactions-design.json`
- `agentspace/user-management.integration.json`

## Important Note on Interaction References

**CRITICAL**: Throughout this analysis process, always use **interaction names** (not interaction IDs) when referencing interactions. 

- ✅ Correct: `"creationInteractions": ["CreateUser", "AssignUserToBed"]`
- ❌ Incorrect: `"creationInteractions": ["I101", "I102"]`

This applies to all interaction-related fields including:
- `creationInteractions`
- `deletionInteractions` 
- `interactionDependencies`
- Any other references to interactions in the analysis output

## Input Artifacts

### 1. agentspace/{module}.data-concepts.json
Contains pre-extracted data concepts:
- **Entities**: Core business objects with their properties
- **Relations**: Connections between entities 
- **Dictionaries**: Global data and system-wide configurations
- **Views**: Pre-defined data queries and filters

Note: Replace `{module}` with the value from `.currentmodule` file.

### 2. agentspace/{module}.interactions-design.json
Contains interaction specifications showing:
- **Data operations**: What each interaction creates, reads, updates, or deletes
- **Data constraints**: How data is modified or created
- **Validation rules**: Business rules and constraints

Note: Replace `{module}` with the value from `.currentmodule` file.

### 3. agentspace/{module}.integration.json
Contains external system integration requirements:
- **Integration flows**: Descriptions of interactions with external systems
- **Asynchronous operations**: Payment processing, AIGC generation, file storage, etc.
- **System boundaries**: What happens in current system vs external systems
- **Data flow**: How data moves between systems

Note: Replace `{module}` with the value from `.currentmodule` file. This file is used to identify integration event entities for tracking asynchronous external system responses.

## Analysis Process

### Step 1: Import Core Data Concepts

#### 1.1 Import Entities from agentspace/{module}.data-concepts.json

First, read the module name from `.currentmodule` file in project root to get the current module name.

Then read the entities directly from `agentspace/{module}.data-concepts.json`. Each entity already includes:
- Name and description
- Properties with types and purposes
- Computed property indicators
- Reference information

**No extraction needed** - the entities are already identified and structured.

#### 1.2 Import Dictionaries

Read dictionaries from `agentspace/{module}.data-concepts.json`. These represent:
- System-wide configurations
- Global statistics 
- Shared validation rules
- Cross-entity aggregates


### Step 2: Analyze Entity Lifecycles Using Interactions

For **EACH entity** in `agentspace/{module}.data-concepts.json`:

#### 2.1 Determine Creation Pattern

Analyze `agentspace/{module}.interactions-design.json` (using the module name from `.currentmodule`) to identify how entities are created:

**Step A: Check Entity Type (PRIORITY CHECK)**
⚠️ **CRITICAL: This check MUST be performed FIRST, before analyzing interactions.**

Check the entity's `entityType` field in `agentspace/{module}.data-concepts.json`:

**If `entityType === "api-event"` (Integration Event):**
- **Type = "integration-event"**
- **creationInteractions = [] (empty array)**
- **computationMethod = "Created by external system integration/webhook/callback"**
- **STOP and skip Step B, C and D**
- Note: Even if this entity appears in interactions-design.json's creates array, ignore it - the creates entry is only for tracking data flow, not for actual creation logic





**If `entityType === "polymorphic"` (Polymorphic Entity):**
- **Type = "none"**
- **Skip lifecycle and computation analysis** (controlled by concrete implementing entities)
- **Only preserve `entityType` and `commonProperties` in output**
- **STOP and skip Step B, C and D**
- **Rationale**: Polymorphic entities are controlled by their concrete implementing entities, not by their own lifecycle rules

**If `entityType === "user-profile"`:**
- **Type = "data-derived"**
- **parent = "User"**
- **Rationale**: User profile entities are automatically derived from the User entity upon User creation
- **STOP and skip Step B, C and D**

**If none of the above, continue to Step B.**

**Step B: Find Creation Interactions**
(Only perform this step if entityType is NOT "api-event", "user-profile", or "polymorphic")

1. Search all interactions where the entity appears in `interactions.specification.data.creates`
2. For each creation interaction, capture:
   - Interaction name (not ID)
   - Description from the creates entry
   - Dependencies from the creates entry
3. Store as `creationInteractions` with detailed information for each interaction

**Step D: Determine Creation Type**
(Only perform this step if entityType is NOT "api-event", "user-profile", or "polymorphic")

**⚠️ Key Distinction:**
- `data-derived`: Strict lifecycle coupling, framework auto-deletes with source
- `created-with-parent`: Only creation timing linked, independent lifecycle after

**Decision Order** (check in this sequence):

1. **data-derived**: Strictly follows parent lifecycle, auto-deleted with parent
   - Has NO independent create/delete interactions, or has create/delete interactions that are the same as parent's
   - **Examples**: Filtered views, computed projections
   - **Key**: Framework automatically creates, updates, and deletes data-derived entities following strict rules when source data is created, updated, or deleted

2. **created-with-parent**: Created with parent, but has independent lifecycle
   - Child has `dependencies` including parent
   - Child has own create/delete interactions
   - Check `dataConstraints` for "automatically create", "create for each"
   - **Key**: Only creation timing linked to parent, lifecycle independent
   - **Examples**: Child does not need to be deleted when parent entity is deleted, or child can be deleted independently

3. **interaction-created**: Independently created by interactions
   - Entity appears alone in `data.creates`
   - Or is primary entity in creates array

4. **mutation-derived**: Event-driven creation, single source
   - Not in any `data.creates`
   - Responds to record mutations (create/update/delete)
   - **Examples**: Audit logs, history tracking
   - Check descriptions: "when X is created/updated, create Y"

5. **mixed-derived**: Dual creation (data-driven + interaction-driven)
   - Auto-created from data changes AND has manual creation interactions
   - Set `relatedBusinessEntity` for primary trigger
   - **Example**: API Call entities with retry support

**Example Analysis**:
```json
// Example 1: User Profile Entity (PRIORITY CHECK catches it)
// In agentspace/user.data-concepts.json:
{
  "name": "UserProfile",
  "entityType": "user-profile",
  "description": "Extended profile information for users",
  "properties": {
    "bio": {"type": "string"},
    "avatar": {"type": "string"}
  }
}
// Analysis using Step A:
// - Step A: entityType === "user-profile" ✓
// - Result: Type = "data-derived", parent = "User"
// - STOP, skip Step B, C and D
// ⚠️ Note: User profile entities are automatically generated with User creation

// Example 2: Integration Event (PRIORITY CHECK catches it)
// In agentspace/donate.data-concepts.json:
{
  "name": "TTSGenerationEvent",
  "entityType": "api-event",
  "description": "Events from TTS service about generation completion"
}
// In agentspace/donate.interactions-design.json (DonateToContent):
"creates": [
  {
    "target": "TTSGenerationEvent",
    "description": "Create initial TTSGenerationEvent with status='pending'...",
    "dependencies": ["DonationRecord"]
  }
]
// Analysis using Step A:
// - Step A: entityType === "api-event" ✓
// - Result: Type = "integration-event", creationInteractions = []
// - STOP, skip Step B, C and D
// ⚠️ Note: Ignore the creates entry in interactions - it's only for tracking data flow

// Example 3a: API Call Entity WITH retry interaction (mixed-derived)
// In agentspace/donate.data-concepts.json:
{
  "name": "TTSAPICall",
  "entityType": "api-call",
  "description": "Records TTS API call execution for tracking"
}
// In agentspace/donate.interactions-design.json:
// - "RetryTTSCall" interaction has creates: [{"target": "TTSAPICall", ...}]
// Analysis:
// - Step A: entityType === "api-call" → continue to Step B
// - Step B: Found creation interaction "RetryTTSCall"
// - Step D: Has creation interactions → Type = "mixed-derived"
//           Set relatedBusinessEntity: "DonationRecord"
//           computationMethod: "Transform: Auto-create when DonationRecord is created (data-driven). Also supports retry via RetryTTSCall interaction (interaction-driven)."
// ⚠️ Note: Mixed-derived pattern - both data-driven auto-creation AND interaction-driven manual creation

// Example 3b: API Call Entity WITHOUT retry interaction (mutation-derived)
// In agentspace/payment.data-concepts.json:
{
  "name": "PaymentAPICall",
  "entityType": "api-call",
  "description": "Records payment API call execution"
}
// In agentspace/payment.interactions-design.json:
// - No interactions create PaymentAPICall
// Analysis:
// - Step A: entityType === "api-call" → continue to Step B
// - Step B: No creation interactions found
// - Step D: No creation interactions → Type = "mutation-derived"
//           computationMethod: "Transform: Auto-create when PaymentRecord is created (data-driven only)."
// ⚠️ Note: Pure mutation-derived pattern - only data-driven auto-creation, no retry support



// Example 3.6: Polymorphic Entity
// In agentspace/{module}.data-concepts.json:
{
  "name": "CreditConsumptionRecord",
  "entityType": "polymorphic",
  "commonProperties": [{"name": "amount", "type": "float"}],
  "description": "Polymorphic entity for all credit consumption scenarios"
}
// Analysis using Step A:
// - Step A: entityType === "polymorphic" ✓
// - Result: Skip lifecycle and computation analysis
//           Only preserve entityType and commonProperties in output
// - STOP, skip Step B, C and D
// ⚠️ Note: Polymorphic entities are controlled by their concrete implementing entities

// Example 4: data-derived vs created-with-parent
// Scenario A: BedOccupancyView (data-derived)
// - Not in any creates
// - No update/delete interactions
// - Pure projection from Bed entity
// → Result: data-derived (auto-deleted when Bed deleted)

// Scenario B: Bed in CreateDormitory (created-with-parent)
"creates": [
  {"target": "Dormitory", ...},
  {"target": "Bed", "dependencies": ["Dormitory"], ...}
]
// - Has UpdateBedStatus interaction
// - Has independent lifecycle after creation
// → Result: created-with-parent (independent after creation)

// Example 5: Mutation-derived
// UserActivityLog not in any creates
// Description: "Auto-created when users perform actions"
// → Result: mutation-derived
```

#### 2.2 Determine Deletion Pattern

Search interactions for deletion operations:
1. Find interactions where entity appears in `data.deletes`
2. For each deletion interaction, capture:
   - Interaction name (not ID)
   - Description from the deletes entry
   - Dependencies from the deletes entry
3. Determine deletion type:
   - **hard-delete**: Entity removed from storage
   - **soft-delete**: Entity marked as deleted (status change)
   - **auto-delete**: Deleted when parent/dependency is deleted

### Step 3: Analyze Property Dependencies

For **EACH property** of every entity:

#### 3.1 Identify Data Dependencies

From `agentspace/{module}.data-concepts.json`, check if property is marked as `computed`:
- If `computed: true`, examine the `computation` field
- List all entities/relations/properties mentioned in `computation.dependencies`
- These become the property's `dataDependencies`

**Important**: Consider if this property could be decomposed:
- Could parts of the computation be extracted as separate properties?
- Are there reusable metrics hidden in the computation?
- Would intermediate properties make the logic clearer?

#### 3.2 Identify Interaction Dependencies

Search `agentspace/{module}.interactions-design.json` (using the module name from `.currentmodule`) to find which interactions modify this property:
1. Look for entity property in `data.updates` (e.g., "User.behaviorScore")
2. Look for entity in `data.creates` (properties set at creation)
3. List all matching interactions as `interactionDependencies` (use interaction **names**, not IDs)

#### 3.3 Determine Computation Method

Transform the computation description using semantic best practices:
- **Don't copy directly** from `agentspace/{module}.data-concepts.json`
- Apply the "Best Practices for Computation Design" principles
- Use semantic computations (Count, Every, Any, Summation, etc.) where possible
- Decompose complex calculations into intermediate properties
- Make the computation intent clear and implementation-ready

#### 3.4 Determine Control Type

Follow this decision process:

1. **Check if property has `computation.method: "integration-result"` in `agentspace/{module}.data-concepts.json`**
   - If YES → **integration-result**
   - Used for properties computed from external API/integration results
   - These properties react to API call entity updates

2. **Check if parent entity's `lifecycle.creation.type` is `"data-derived"`**
   - If YES → **derived-with-parent**
   - Property belongs to a data-derived entity (e.g., UserProfile)
   - Property's value is part of the parent's derivation logic

3. **Check if property appears in any interaction's `data.updates`**
   - If YES → **independent**
   - Property has explicit update interactions

4. **Check if property is computed**
   - If NO (not computed) → **creation-only**
   - If YES (computed) → Continue to step 5 to determine the specific type

5. **For computed properties, analyze computation pattern**:
   - **Check `computation.method` or `computationMethod` for aggregation keywords**:
     - Contains "count of", "sum of", "aggregate", "every", "any" → **computed-aggregation**
     - Rationale: These are reactive aggregations that need independent computation (Count, Summation, Every, Any, etc.)
   
   - **Check `dataDependencies` for relation/entity references**:
     - Depends on relations or other entities → **computed-reactive**
     - Rationale: Property reacts to changes in other entities/relations
   
   - **Check `dataDependencies` for self-only references**:
     - Only depends on own entity's properties → **computed-simple**
     - Rationale: Simple derivation from own properties (e.g., fullName = firstName + lastName)
   
   - **Default for computed properties**:
     - If none of above matches → **computed-reactive**

**Control Type Definitions**:
- **creation-only**: Set once at entity creation, never changes
- **integration-result**: Computed from external API/integration results, reacts to API call entity changes
- **derived-with-parent**: Property belongs to a data-derived entity, controlled by parent's derivation logic
- **independent**: Has explicit update interactions separate from creation
- **computed-aggregation**: Reactive aggregation over collections (Count, Sum, Every, Any, etc.)
- **computed-reactive**: Computed from other entities/relations with reactive updates
- **computed-simple**: Simple computation from own entity's properties only

**IMPORTANT**: The distinction between controlType categories is critical for correct computation selection:
- `derived-with-parent` is ONLY for properties of data-derived entities (where parent entity is data-derived)
- `computed-aggregation` is for aggregations that need independent reactive computation
- Never conflate "property is computed" with "property is derived-with-parent"

### Step 4: Analyze Relations

#### 4.1 Import Relation Structure

Read relations from `agentspace/{module}.data-concepts.json` (using the module name from `.currentmodule`):
- Source and target entities
- Cardinality
- Relation properties
- Extend Info

#### 4.2 Determine Relation Lifecycle

Similar to entities, analyze how relations are created:

**Find Creation Interactions**:
1. Search for relation name in `data.creates`
2. For each creation interaction, capture:
   - Interaction name (not ID)
   - Description from the creates entry
   - Dependencies from the creates entry
3. Analyze creation context

**Determine Creation Type - MANDATORY ALGORITHM**:

**🔴 CRITICAL: Follow this exact decision algorithm for EACH relation:**

```
FOR each Relation found in interaction's data.creates:

STEP 1: Check if relation NOT in any interaction's data.creates
  → IF TRUE: Type = "mutation-derived"
  → STOP

STEP 2: Check the SAME interaction's data.creates array
  → Find all Entities in the same creates array
  
STEP 3: Check relation's dependencies field
  → IF dependencies contains ANY Entity from STEP 2:
    → Type = "created-with-entity"
    → parent = that Entity name
    → STOP
    
STEP 4: Check description for keywords
  → IF description contains "newly created" OR "just created" OR "connecting to created":
    → Type = "created-with-entity"
    → parent = the Entity being referenced
    → STOP

STEP 5: Default case (relation only, no entity in same creates)
  → Type = "interaction-created"
  → parent = null
```

**Type Definitions**:
- **integration-event**: Relation created from external system events (rare, most integration events are entities)
  - Would be identified if a relation needs to track external system relationships
  - Immutable and append-only like integration-event entities
  
- **created-with-entity**: Relation created together with an entity in the SAME interaction
  - **Key signal**: Relation's dependencies include an Entity that is ALSO in the same `data.creates` array
  - **Key signal**: Description mentions "newly created" or "connecting to created" entity
  - The relation should be created automatically by the entity's Transform computation
  - Set `parent` to the entity name
  
- **interaction-created**: Relation created independently (no entity being created in same interaction)
  - **Key signal**: Relation is the ONLY item in `data.creates`, or
  - **Key signal**: All entities in dependencies already exist (not being created in same interaction)
  - The relation needs its own Transform computation
  
- **data-derived**: Computed from data conditions (pure data derivation)
  - Not directly in any interaction's `data.creates`
  - Automatically maintained based on data state
  - Purely data-driven creation with no interaction involvement
  
- **mutation-derived**: Created from record mutation events (single source, data-driven only)
  - Not directly in any interaction's `data.creates`
  - Created by reactive computations responding to entity/relation changes
  - Common for maintaining referential integrity or creating audit trails
  
- **mixed-derived**: Relation has dual creation sources (both data-driven and interaction-driven)
  - Relations that need to be both auto-created from data changes AND manually created through interactions
  - Both creation paths are handled by Transform computations observing record mutations
  - **Key distinction**: Unlike mutation-derived (data-only), mixed-derived supports both data and interaction creation

**Examples with Algorithm Applied**:

```json
// Example 1: interaction-created
// "AssignUserToBed": "data": { 
//   "creates": [{
//     "target": "UserBedAssignment",
//     "description": "Create assignment between user and bed",
//     "dependencies": ["User", "Bed", "AvailabilityCheck"]
//   }]
// }
// Analysis:
// - STEP 2: Same creates array has: [] (no entities)
// - STEP 3: Dependencies ["User", "Bed"] are NOT in creates array
// - STEP 5: Result = interaction-created

// Example 2: created-with-entity
// "CreatePost": "data": { 
//   "creates": [
//     {"target": "Post", "description": "Create new post", "dependencies": ["User"]},
//     {"target": "PostAuthorRelation", "description": "Link post to author", "dependencies": ["Post", "User"]}
//   ]
// }
// Analysis for PostAuthorRelation:
// - STEP 2: Same creates array has: ["Post"]
// - STEP 3: Dependencies contain "Post" which IS in creates array
// - Result = created-with-entity (parent: "Post")

// Example 3: created-with-entity (donate module case)
// "RechargeGifts": "data": { 
//   "creates": [
//     {"target": "RechargeRecord", "description": "Create new recharge record...", "dependencies": []},
//     {"target": "UserRechargeRelation", "description": "Create relation connecting current User to the newly created RechargeRecord", "dependencies": ["User", "RechargeRecord"]}
//   ]
// }
// Analysis for UserRechargeRelation:
// - STEP 2: Same creates array has: ["RechargeRecord"]
// - STEP 3: Dependencies contain "RechargeRecord" which IS in creates array
// - STEP 4: Description contains "newly created"
// - Result = created-with-entity (parent: "RechargeRecord")

// Example 4: mutation-derived
// UserFollowRelation not in any interaction's creates
// Description: "Automatically created when user likes multiple posts by same author"
// Analysis:
// - STEP 1: NOT in any creates array
// - Result = mutation-derived
```

### Step 5: Transform Dictionaries to Analysis Format

For each dictionary in `agentspace/{module}.data-concepts.json` (using the module name from `.currentmodule`):

#### 5.1 Analyze Usage Patterns

Search interactions for dictionary usage:
1. Find where dictionary appears in `data.reads` (record interaction **names**, not IDs)
2. Find where dictionary values are used in conditions
3. Determine if values are static or computed

#### 5.2 Determine Dependencies

- **Data Dependencies**: If dictionary aggregates from entities
- **Interaction Dependencies**: If interactions update dictionary values (use interaction **names**, not IDs)
- **Computation Method**: How the value is calculated or maintained

## Best Practices for Computation Design

### Prioritize Semantic Computations

To ensure data clarity, follow these principles:

1. **Use System-Provided Semantic Computations First**
   - Prefer built-in computations over custom implementations:
     - `Count` - Count entities or relations
     - `Every` - Check if all items meet a condition
     - `Any` - Check if at least one item meets a condition
     - `Summation` - Sum numeric values across relations
     - `Average` - Calculate average of numeric values
     - `WeightedSummation` - Calculate weighted sum with custom weights
   - These provide better performance and clearer intent
   - Examples:
     - Use `Count` for counting relations instead of custom counter logic
     - Use `Every` for "all items meet condition" instead of custom validation
     - Use `Any` for "at least one item meets condition" instead of custom checks
     - Use `Summation` for totaling values (e.g., order totals, scores)
     - Use `Average` for calculating means (e.g., average rating, average price)
     - Use `WeightedSummation` for weighted calculations (e.g., GPA, weighted scores)

2. **Decompose Complex Calculations with Intermediate Data Concepts**
   - When custom calculations are necessary, identify reusable parts
   - Extract these parts as intermediate computed properties using semantic computations
   - Reference intermediate properties in final custom calculations
   - This approach:
     - Reduces complexity of custom logic
     - Improves reusability
     - Makes data dependencies clearer
     - Enables better optimization

### Example: Order Fulfillment Status

Instead of a complex custom calculation:

```json
// ❌ Complex custom calculation mixing multiple concerns
"fulfillmentStatus": {
  "type": "string",
  "purpose": "Overall order fulfillment status",
  "dataDependencies": ["OrderItemRelation", "Item.status", "Item.shippedDate"],
  "interactionDependencies": [],
  "computationMethod": "Custom: Loop through all items, check each status, count shipped, check dates, determine overall status"
}
```

Decompose into intermediate semantic computations:

```json
// ✅ Better: Use intermediate properties with semantic computations
"properties": {
  "totalItems": {
    "type": "number",
    "purpose": "Total number of items in order",
    "dataDependencies": ["OrderItemRelation"],
    "interactionDependencies": [],
    "computationMethod": "Count of OrderItemRelation"
  },
  "shippedItems": {
    "type": "number",
    "purpose": "Number of shipped items",
    "dataDependencies": ["OrderItemRelation", "Item.status"],
    "interactionDependencies": [],
    "computationMethod": "Count of OrderItemRelation where Item.status = 'shipped'"
  },
  "allItemsShipped": {
    "type": "boolean",
    "purpose": "Whether all items are shipped",
    "dataDependencies": ["OrderItemRelation", "Item.status"],
    "interactionDependencies": [],
    "computationMethod": "Every(item => item.status === 'shipped')"
  },
  "fulfillmentStatus": {
    "type": "string",
    "purpose": "Overall order fulfillment status",
    "dataDependencies": ["allItemsShipped", "shippedItems", "totalItems"],
    "interactionDependencies": [],
    "computationMethod": "Custom: if (allItemsShipped) return 'complete'; if (shippedItems > 0) return 'partial'; return 'pending'"
  }
}
```

### When to Create Intermediate Properties

Create intermediate computed properties when you find yourself:
- Counting or aggregating within custom logic
- Checking conditions across collections
- Repeatedly calculating the same sub-values
- Combining multiple data sources in complex ways

Remember: It's better to have several simple, semantic computations than one complex custom calculation.

## Output Generation

### Generate Analysis JSON

Transform the analyzed data into the standard output format:

```json
{
  "entities": {
    "[EntityName]": {
      "purpose": "[From agentspace/{module}.data-concepts.json description]",
      "entityType": "[ALWAYS copy from agentspace/{module}.data-concepts.json if present - values: api-event, api-call, user-profile, polymorphic, business, or omit if not present]",
      "commonProperties": "[Preserve if entity has commonProperties field - for polymorphic entities]",
      "extends": "[Preserve if entity has extends field in agentspace/{module}.data-concepts.json - format: EntityName@moduleName or EntityName@_self]",
      "dataDependencies": "[Dependencies identified in Step 2]",
      "computationMethod": "[Creation pattern description]",
      "lifecycle": {
        "creation": {
          "type": "[integration-event | interaction-created | data-derived | created-with-parent | mutation-derived | mixed-derived]",
          "parent": "[Parent entity name if created-with-parent or data-derived]",
          "relatedBusinessEntity": "[For mixed-derived entities: the business entity that triggers auto-creation (typically used for API Call entities)]",
          "creationInteractions": [
            {
              "name": "[Interaction name]",
              "description": "[Description from creates entry]",
              "dependencies": "[Dependencies from creates entry]"
            }
          ]
        },
        "deletion": {
          "canBeDeleted": "[true/false, always false for api-event]",
          "deletionType": "[auto-delete for data-derived | soft-delete | hard-delete | none]",
          "deletionInteractions": "[Empty for data-derived, list interactions otherwise]"
        }
      },
      "properties": {
        "[propertyName]": {
          "type": "[From agentspace/{module}.data-concepts.json]",
          "attributes": "[From agentspace/{module}.data-concepts.json]",
          "purpose": "[From agentspace/{module}.data-concepts.json or inferred]",
          "controlType": "[From Step 3.4]",
          "dataDependencies": "[From Step 3.1]",
          "interactionDependencies": "[From Step 3.2]",
          "computationMethod": "[From Step 3.3]",
          "initialValue": "[Default or creation logic]"
        }
      }
    }
  },
  "relations": {
    "[RelationName]": {
      "type": "[From agentspace/{module}.data-concepts.json cardinality]",
      "purpose": "[From agentspace/{module}.data-concepts.json description]",
      "sourceEntity": "[From agentspace/{module}.data-concepts.json]",
      "targetEntity": "[From agentspace/{module}.data-concepts.json]",
      "sourceProperty": "[Inferred or specified]",
      "targetProperty": "[Inferred or specified]",
      "extends": "[From agentspace/{module}.data-concepts.json]",
      "dataDependencies": "[Always includes source and target entities]",
      "computationMethod": "[From Step 4.2]",
      "lifecycle": {
        "creation": {
          "type": "[integration-event | interaction-created | created-with-entity | data-derived | mutation-derived | mixed-derived]",
          "parent": "[If created-with-entity or data-derived]",
          "relatedBusinessEntity": "[For mixed-derived relations: the business entity that triggers auto-creation]",
          "creationInteractions": [
            {
              "name": "[Interaction name]",
              "description": "[Description from creates entry]",
              "dependencies": "[Dependencies from creates entry]"
            }
          ]
        },
        "deletion": {
          "canBeDeleted": "[Based on analysis]",
          "deletionType": "[Type identified]",
          "deletionInteractions": [
            {
              "name": "[Interaction name]",
              "description": "[Description from deletes entry]",
              "dependencies": "[Dependencies from deletes entry]"
            }
          ]
        }
      },
      "properties": {
        "[propertyName]": {
          // Same structure as entity properties
        }
      }
    }
  },
  "dictionaries": {
    "[DictionaryName]": {
      "purpose": "[From agentspace/{module}.data-concepts.json description]",
      "type": "[object with key types]",
      "dataDependencies": "[From Step 5.2]",
      "interactionDependencies": "[From Step 5.2]",
      "computationMethod": "[From Step 5.2]"
    }
  }
}
```

## Best Practices for Analysis

### 1. Cross-Reference Data Operations

Always verify entity/property modifications by:
- Checking all interactions that mention the entity
- Looking for indirect updates through relations
- Identifying cascade effects in dataConstraints

### 2. Identify Computation Patterns

When analyzing computed properties:
- Look for standard patterns (Count, Sum, Average, etc.)
- Identify if computation can use built-in interaqt computations
- Document complex custom logic clearly

### 3. Track Dependency Chains

Ensure all dependencies are identified:
- Direct data dependencies from computation logic
- Indirect dependencies through relations
- Interaction chains that affect the data

### 4. Validate Lifecycle Consistency

Verify that:
- Creation patterns match the business logic
- Deletion handling preserves data integrity
- Parent-child relationships are properly maintained

## Common Analysis Patterns

### 1. Aggregation Properties
Properties that count or sum related data:
```json
"currentOccupancy": {
  "dataDependencies": ["Bed", "UserBedAssignment"],
  "computationMethod": "Count of occupied beds (Bed.isOccupied = true)"
}
```

### 2. Status-Driven Properties
Properties that change based on interactions:
```json
"status": {
  "interactionDependencies": ["CreateUser", "ActivateUser", "DeactivateUser"],
  "computationMethod": "Set by interactions, defaults to 'active' on creation"
}
```

### 3. Cascading Updates
Properties affected by multiple sources:
```json
"behaviorScore": {
  "dataDependencies": ["BehaviorViolation"],
  "interactionDependencies": ["ModifyBehaviorScore"],
  "computationMethod": "Base score minus sum of violations, can be overridden by admin"
}
```

### 4. Integration Result Properties
Properties computed from external API/integration results:
```json
"voiceUrl": {
  "type": "string",
  "purpose": "AI-generated audio URL from TTS service",
  "controlType": "integration-result",
  "dataDependencies": ["TTSAPICall.responseData", "TTSAPICall.status"],
  "interactionDependencies": [],
  "computationMethod": "Statemachine: Extract from latest TTSAPICall.responseData where status='completed'",
  "initialValue": "null"
}
```

Note: Use `controlType: "integration-result"` when:
- Property value comes from external API/service responses
- Property is computed from API Call entity's response data
- Always specified in `agentspace/{module}.data-concepts.json` with `computation.method: "integration-result"`

### 5. Derived Entities (data-derived)

```json
// User Profile: entityType catches it, strictly follows User
"UserProfile": {
  "entityType": "user-profile",
  "lifecycle": {
    "creation": {"type": "data-derived", "parent": "User"},
    "deletion": {"deletionType": "auto-delete"}  // Auto-deleted with User
  }
}

// Filtered View: Pure projection, auto-deleted when source removed
"ActiveUser": {
  "computationMethod": "Filter from User where lastLoginDate > (now - 30 days)",
  "lifecycle": {
    "creation": {"type": "data-derived", "parent": null}
  }
}
```

### 6. Multiple Creation Interactions
Entity created by different interactions with different logic:
```json
"Style": {
  "lifecycle": {
    "creation": {
      "type": "interaction-created",
      "parent": null,
      "creationInteractions": [
        {
          "name": "CreateStyle",
          "description": "Create new Style entity with provided data, automatically setting status to 'draft', generating slug if not provided, and setting timestamps",
          "dependencies": ["SlugUniquenessCheck"]
        },
        {
          "name": "RestoreToVersion", 
          "description": "Recreate Style entities from version snapshot data",
          "dependencies": ["StyleVersion.snapshotData"]
        }
      ]
    }
  }
}
```

### 7. Integration Event Entity
Event entity for tracking asynchronous external system responses:
```json
"PaymentEvent": {
  "purpose": "Records payment status updates received from Stripe payment gateway",
  "entityType": "api-event",
  "dataDependencies": [],
  "computationMethod": "Created when webhook receives payment status from Stripe",
  "lifecycle": {
    "creation": {
      "type": "integration-event",
      "parent": null,
      "creationInteractions": []
    },
    "deletion": {
      "canBeDeleted": false,
      "deletionType": "none",
      "deletionInteractions": []
    }
  },
  "properties": {
    "transactionId": {
      "type": "string",
      "purpose": "External payment transaction ID from Stripe",
      "controlType": "creation-only",
      "dataDependencies": [],
      "interactionDependencies": [],
      "computationMethod": "Set from Stripe webhook payload",
      "initialValue": "From external system response"
    },
    "paymentStatus": {
      "type": "string",
      "purpose": "Payment status (success, failed, pending)",
      "controlType": "creation-only",
      "dataDependencies": [],
      "interactionDependencies": [],
      "computationMethod": "Set from Stripe webhook payload",
      "initialValue": "From external system response"
    },
    "timestamp": {
      "type": "date",
      "purpose": "When the payment event was received",
      "controlType": "creation-only",
      "dataDependencies": [],
      "interactionDependencies": [],
      "computationMethod": "Current server timestamp when event is created",
      "initialValue": "now()"
    }
  }
}
```

Note: Other business entities (like `Order.paymentStatus`, `User.premiumUntil`) should be computed based on these event entities to maintain reactive consistency.

## Validation Checklist

- [ ] Read module name from `.currentmodule` file in project root
- [ ] All entities from `agentspace/{module}.data-concepts.json` are analyzed
- [ ] All relations from `agentspace/{module}.data-concepts.json` are analyzed
- [ ] All dictionaries from `agentspace/{module}.data-concepts.json` are analyzed
- [ ] **🔴 CRITICAL: For EACH entity, performed Step A (Entity Type Check) FIRST**
- [ ] **🔴 CRITICAL: For EACH entity with entityType, verified entityType is copied to output**
- [ ] **🔴 CRITICAL: For EACH entity, correctly handled special entity types in Step A (api-event, polymorphic, user-profile)**
- [ ] **🔴 CRITICAL: data-derived entities have NO independent update/delete interactions (auto-deleted with source)**
- [ ] **🔴 CRITICAL: created-with-parent entities HAVE independent lifecycle (own update/delete logic)**
- [ ] API Call entities (with `entityType: "api-call"`) analyzed through Step B and D
- [ ] API Call entities WITH retry interactions have lifecycle.creation.type set to "mixed-derived" and `relatedBusinessEntity` field set
- [ ] API Call entities WITHOUT retry interactions have lifecycle.creation.type set to "mutation-derived"
- [ ] Extensibility entities (with `entityType: "extensibility"`) only have `entityType` and `commonProperties` preserved
- [ ] Extensibility entities skip lifecycle and computation analysis
- [ ] Polymorphic entities (with `entityType: "polymorphic"`) only have `entityType` and `commonProperties` preserved
- [ ] Polymorphic entities skip lifecycle and computation analysis
- [ ] Entities with `extends` field have `extends` preserved in output (format: EntityName@moduleName or EntityName@_self)
- [ ] User profile entities (with `entityType: "user-profile"`) have lifecycle.creation.type set to "data-derived"
- [ ] User profile entities have lifecycle.creation.parent set to "User"
- [ ] Integration event entities (with `entityType: "api-event"`) have lifecycle.creation.type set to "integration-event"
- [ ] Integration event entities have lifecycle.creation.creationInteractions set to [] (empty array)
- [ ] Integration event entities have deletion.canBeDeleted set to false
- [ ] **🔴 CRITICAL: Integration event entities do NOT have computationMethod from interactions** (should be "Created by external system...")
- [ ] Creation patterns identified for each entity/relation
- [ ] **🔴 CRITICAL: For EACH relation, executed the 5-step algorithm in Step 4.2 to determine lifecycle type**
- [ ] **🔴 CRITICAL: For relations with type "created-with-entity", verified parent field is set correctly**
- [ ] **🔴 CRITICAL: For relations in same creates array as entities, checked dependencies to identify created-with-entity pattern**
- [ ] Interaction dependencies found by searching `agentspace/{module}.interactions-design.json`
- [ ] Data dependencies match computed property definitions
- [ ] Lifecycle patterns are consistent with business logic
- [ ] Parent-child relationships properly identified
- [ ] All properties have defined control types
- [ ] Computation methods clearly documented
