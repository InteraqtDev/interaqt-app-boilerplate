# Computation Selection Guide v2 - Streamlined Version

## Overview

This guide helps you select the appropriate computation type for each entity, property, relation, and dictionary based on the structured information in `agentspace/{module}.data-design.json` and `agentspace/{module}.interaction-design.md`.

**IMPORTANT**: First read the current module name from `.currentmodule` file in project root, and use it to construct the file paths. For example, if `.currentmodule` contains `user-management`, then the paths would be:
- `agentspace/user-management.data-design.json`
- `agentspace/user-management.interaction-design.md`


## Input Files

You will receive two input files:
1. **agentspace/{module}.data-design.json**: Contains structured data dependencies and lifecycle information
2. **agentspace/{module}.interaction-design.md**: Describes all interactions and their effects

Note: Replace `{module}` with the value from `.currentmodule` file.

## Direct Mapping Rules

### Special Notations

#### _parent:[ParentName]
The `_parent:[ParentName]` notation indicates that this entity or relation is created by its parent's computation, not by its own computation. This occurs when `lifecycle.creation.type` is `"created-with-parent"` (for entities) or `"created-with-entity"` (for relations). The parent entity's computation is responsible for creating this child entity/relation.

Example: If an AuditLog has `lifecycle.creation.type: "created-with-parent"` and `lifecycle.creation.parent: "Transaction"`, its computationDecision would be `"_parent:Transaction"`.

#### None
The `None` notation indicates that this entity has no computation. This applies to:
- **Polymorphic entities** (`entityType: "polymorphic"`): Controlled by their concrete implementing entities

These entities don't need their own computation logic.

#### _owner
The `_owner` notation indicates that this property's value is fully controlled by its owner entity or relation's computation. This applies when:
- `controlType` is `"creation-only"`: Property is set during entity/relation creation and never modified separately
- `controlType` is `"derived-with-parent"`: Property belongs to a derived entity/relation and is computed as part of the parent's overall derivation

Properties marked with `_owner` don't need separate computation control - their logic is embedded in the owner's creation or derivation process.

Note: Properties with `controlType: "integration-result"` are NOT marked as `_owner` - they use `StateMachine` to observe and extract values from API Call entity updates.

### 1. Entity-Level Computations

Look at the entity's `lifecycle.creation` and `lifecycle.deletion`:

| Creation Type | Deletion | Computation Decision |
|---------------|----------|---------------------|
| `"integration-event"` | Always `canBeDeleted: false` | `None` - Entity is externally controlled by webhook/callback from external systems |
| `"created-with-parent"` | Any | `_parent:[lifecycle.creation.parent]` (created by parent's computation) |
| `"data-derived"` | Any | `Transform` from source entity (pure data-driven, no interactions) |
| `"mutation-derived"` | Any | `Transform` from record mutation events (data-only, both interaction-created and entity-created produce mutations) |
| `"mixed-derived"` | Any | `Transform` from both data mutations AND interactions |
| `"interaction-created"` | `canBeDeleted: false` | `Transform` with `InteractionEventEntity` |
| `"interaction-created"` | `canBeDeleted: true` with `hard-delete` | `Transform` + `HardDeletionProperty` with `StateMachine` |
| `"interaction-created"` | `canBeDeleted: true` with `soft-delete` | `Transform` + status property with `StateMachine` |

**Critical Rule**: Transform can ONLY create, NEVER delete. For hard deletion:
- Use `Transform` for entity/relation creation
- Add `HardDeletionProperty` to the entity/relation
- Use `StateMachine` on the `HardDeletionProperty` to manage deletion

### 2. Relation-Level Computations

**First check if source or target entity is polymorphic**: If either entity is polymorphic (`entityType: "polymorphic"`), the relation's computation is `None` - concrete implementing entities control these relations.

Check `lifecycle.creation` and `lifecycle.deletion`:

| Creation Type | Deletion | Computation Decision |
|---------------|----------|---------------------|
| `"created-with-entity"` | `canBeDeleted: false` | `_parent:[lifecycle.creation.parent]` (created by parent entity's computation) |
| `"created-with-entity"` | `canBeDeleted: true` | `_parent:[lifecycle.creation.parent]` + `HardDeletionProperty` with `StateMachine` for deletion |
| `"data-derived"` | Any | `Transform` from source entity/conditions (pure data-driven, no interactions) |
| `"mutation-derived"` | Any | `Transform` from record mutation events (data-only) |
| `"mixed-derived"` | Any | `Transform` from both data mutations AND interactions (dual creation) |
| `"interaction-created"` | `canBeDeleted: false` | `Transform` with `InteractionEventEntity` |
| `"interaction-created"` | `canBeDeleted: true` | `Transform` + `HardDeletionProperty` with `StateMachine` |
| Any | `deletionType: "soft-delete"` | Original computation + status property with `StateMachine` |

**Critical Rule**: Transform can ONLY create, NEVER delete. For hard deletion, add `HardDeletionProperty` and use `StateMachine` on it.

### 3. Property-Level Computations

**🔴 CRITICAL RULE: Properties can NEVER use Transform computation**
- Transform is ONLY for Entity/Relation creation
- Properties must use: _owner, StateMachine, computed, aggregations (Count/Sum/etc.), or Custom
- Even if a property needs to respond to external events (like Integration Events), use StateMachine with appropriate triggers

First check the property's `controlType`, then analyze dependencies if needed:

| Control Type | Computation Decision |
|--------------|---------------------|
| `creation-only` | `_owner` - controlled by entity/relation creation |
| `integration-result` | `StateMachine` - observes API Call entity updates, extracts result from response data |
| `derived-with-parent` | `_owner` - controlled by parent's derivation (ONLY for derived entities) |
| `computed-aggregation` | Aggregation (Count/Sum/etc.) - based on aggregation semantics |
| `computed-reactive` | Appropriate computation based on dependencies (see below) |
| `computed-simple` | `computed` function - simple derivation from own properties |
| `independent` | Further analysis needed (see below) |

#### For `independent` Properties

Analyze the property's `dataDependencies`, `interactionDependencies`, and `computationMethod`:

| Condition | Computation Decision |
|-----------|---------------------|
| `calculationMethod` contains "sum of", "count of", "aggregate", or involves Record entities | `Custom` or aggregation (e.g., balance = sum(deposits) - sum(withdrawals)) |
| Has `interactionDependencies` that can modify it | `StateMachine` for state transitions or value updates (even for external events) |
| Has `dataDependencies` with relations/entities (including Integration Events) | `StateMachine` if triggered by events, otherwise aggregation computation |
| `dataDependencies` = self properties only | `computed` function |
| Complex calculation with multiple entities | `Custom` |
| Only has `initialValue`, no dependencies | No computation (use `defaultValue`) |

**Common Pattern - Integration Result Properties:**
- **If `controlType: "integration-result"`** → **Always use `StateMachine`**
- Pattern: Property computed from API Call entity's response data
- Example: `Donation.voiceUrl` computed from `TTSAPICall.responseData`
- Implementation:
  - Trigger: Monitor API Call entity creation/update
  - ComputeTarget: Find the business entity that needs the result
  - ComputeValue: Extract value from API Call entity's response field

**Common Pattern - Integration Event Updates:**
- Property needs to update based on Integration Event (e.g., TTSEvent) → Use `StateMachine`
- Set trigger to monitor the Integration Event Entity creation: `trigger: { recordName: 'TTSEvent', type: 'create' }`
- Use `computeTarget` to find the target entity/relation to update
- Use `computeValue` to extract and return the new value from the event

#### Decision Priority (check in order):

1. **Check `controlType` first** (with special handling for computed types):
   - `creation-only` → **_owner** (property controlled by entity/relation creation)
   - `integration-result` → **StateMachine** (observes API Call entity, extracts from response)
   - `derived-with-parent` → **_owner** (property controlled by parent derivation, ONLY for derived entities)
   - `computed-aggregation` → **Continue to step 2** (determine specific aggregation type)
   - `computed-reactive` → **Continue to step 3** (analyze dependencies)
   - `computed-simple` → **`computed` function** (simple derivation)
   - `independent` → Continue to step 3

2. **For `computed-aggregation` controlType, determine aggregation type**:
   - Check `calculationMethod` or `computationMethod` for keywords:
     - Contains "count of" → `Count`
     - Contains "sum of" → `Summation` 
     - Contains "weighted sum" or "× price" → `WeightedSummation`
     - Contains "all" or "every" → `Every`
     - Contains "any" or "at least one" → `Any`
     - Complex aggregation with Record entities → `Custom`
   - **STOP** - Don't continue to step 3

3. **For `computed-reactive` or `independent`, check interaction dependencies**:
   - Has `interactionDependencies` that can modify → `StateMachine`
   - For timestamps: Use StateMachine with `computeValue`
   - For status fields: Use StateMachine with StateNodes
   - If no modifying interactions, continue to step 4

4. **Check data dependencies**:
   - Has `dataDependencies` with relations/entities → Appropriate computation based on pattern
   - Uses only own entity properties → `computed` function
   - Complex calculation with multiple entities → `Custom`

#### Aggregation Type Selection

Based on the `computationMethod` description:
- Contains "count of" → `Count`
- Contains "sum of" → `Summation` 
- Contains "weighted sum" or "× price" → `WeightedSummation`
- Contains "all" or "every" → `Every`
- Contains "any" or "at least one" → `Any`
- Contains "percentage" or complex logic → `Custom`
- Time-based comparisons → `RealTime`

### 4. Dictionary-Level Computations

Based on `computationMethod` description:
- "Count of all" → `Count`
- "Sum of" → `Summation`
- "Count where condition" → `Count` with filter callback
- Complex aggregation → `Custom`

## Automated Decision Process

### Step 1: Parse Input Files
First, read the module name from `.currentmodule` file in project root to get the current module name.

Then read `agentspace/{module}.data-design.json` and extract:
- Entity definitions with their properties and lifecycle (creation and deletion)
- Relation definitions with their lifecycle
- Dictionary definitions

### Step 2: Apply Mapping Rules
For each element:
1. **For entities**: Check in this priority order:
   - **First check `entityType` field**:
     - If `entityType === "api-event"` → set computation to "None" (externally controlled)
     - If `entityType === "polymorphic"` → set computation to "None" (controlled by concrete entities)
     - If `entityType === "api-call"` → set computation to "Transform" (mixed-derived pattern: auto-create + retry)
     - If `entityType === "user-profile"` → set computation to "Transform" (data-derived from User)
   - Then check lifecycle.creation.type and lifecycle.deletion
   - For entities that can be hard-deleted, use Transform + HardDeletionProperty with StateMachine
2. **For relations**: First check if source/target entity is polymorphic (if yes, use "None"), then check lifecycle.creation.type and lifecycle.deletion
   - For relations that can be hard-deleted, use Transform + HardDeletionProperty with StateMachine
3. **For properties**: Check controlType first (PRIORITY ORDER):
   - If `creation-only` or `derived-with-parent` → use `_owner`
   - **If `integration-result` → DIRECTLY use `StateMachine` (no further analysis)**
   - If `independent` → apply standard dependency analysis rules

### Step 3: Generate Output Document

Create `agentspace/{module}.computation-analysis.json` (using the module name from `.currentmodule`) with this structure:

```json
{
  "entities": [
    {
      "name": "<from agentspace/{module}.data-design.json>",
      "entityAnalysis": {
        "purpose": "<from agentspace/{module}.data-design.json>",
        "lifecycle": "<directly copy from lifecycle field in agentspace/{module}.data-design.json>",
        "dependencies": "<from dataDependencies - creation-time dependencies only>",
        "computationDecision": "<Transform/_parent:[ParentName]/None based on rules>",
        "reasoning": "<automated based on lifecycle and deletion capability>",
        "calculationMethod": "<from computationMethod>"
      },
      "propertyAnalysis": [
        {
          "propertyName": "<property name>",
          "type": "<from agentspace/{module}.data-design.json>",
          "purpose": "<from agentspace/{module}.data-design.json>",
          "controlType": "<from agentspace/{module}.data-design.json: creation-only/integration-result/derived-with-parent/independent>",
          "dataSource": "<from computationMethod>",
          "computationDecision": "<_owner/StateMachine/Count/etc. based on controlType and rules>",
          "reasoning": "<automated based on controlType and rules>",
          "dependencies": <convert dataDependencies to proper format>,
          "interactionDependencies": <from agentspace/{module}.data-design.json>,
          "calculationMethod": "<from computationMethod>"
        }
      ]
    }
  ],
  "relations": [
    {
      "name": "<from agentspace/{module}.data-design.json>",
      "relationAnalysis": {
        "purpose": "<from agentspace/{module}.data-design.json>",
        "type": "<from agentspace/{module}.data-design.json>",
        "sourceEntity": "<from agentspace/{module}.data-design.json>",
        "targetEntity": "<from agentspace/{module}.data-design.json>",
        "lifecycle": "<directly copy from lifecycle field in agentspace/{module}.data-design.json>",
        "dependencies": "<from dataDependencies - creation-time dependencies only>",
        "computationDecision": "<Transform/_parent:[ParentName] based on rules>",
        "reasoning": "<automated based on lifecycle>",
        "calculationMethod": "<from computationMethod>"
      }
    }
  ],
  "dictionaries": [
    {
      "name": "<from agentspace/{module}.data-design.json>",
      "dictionaryAnalysis": {
        "purpose": "<from agentspace/{module}.data-design.json>",
        "type": "<from agentspace/{module}.data-design.json>",
        "collection": "<determine from type>",
        "computationDecision": "<apply dictionary rules>",
        "reasoning": "<automated based on computationMethod>",
        "dependencies": <format properly>,
        "interactionDependencies": <from agentspace/{module}.data-design.json>,
        "calculationMethod": "<from computationMethod>"
      }
    }
  ]
}
```

## Dependency Formatting Rules

### Entity/Relation Level Dependencies
Entity and Relation `dependencies` field captures **creation-time dependencies only** - entities/relations needed when creating this entity/relation. Copy directly from `dataDependencies` in data-design.json:
- For derived entities: `["ParentEntity"]` (e.g., `UserCreditProfile` depends on `["User"]`)
- For relations: `["SourceEntity", "TargetEntity"]`
- For interaction-created entities: entities referenced in creation interaction

**Do NOT include**: Property-level reactive dependencies (those go in propertyAnalysis.dependencies)

### Property Level Dependencies
When converting property `dataDependencies` to `dependencies`:

1. **Entity/Relation properties**: Format as `EntityName.propertyName`
2. **Self properties**: Convert to `_self.propertyName`
3. **Relations without properties**: Use relation name directly
4. **Dictionaries**: Use dictionary name without dot notation
5. **InteractionEventEntity**: Add when `interactionDependencies` exists

Examples:
- `["User", "Dormitory"]` → `["User.id", "Dormitory.id"]` (specify actual properties used)
- `["UserDormitoryRelation"]` → `["UserDormitoryRelation"]`
- Self-reference → `["_self.capacity", "_self.occupancy"]`

## Quick Decision Flowchart

```
1. Entity Lifecycle?
   ├─ Check entityType first:
   │  ├─ entityType: "api-event"? → None (externally controlled)
   │  ├─ entityType: "polymorphic"? → None (controlled by concrete entities)
   │  ├─ entityType: "api-call"? → Transform (mixed-derived pattern: auto-create + retry)
   │  └─ entityType: "user-profile"? → Transform (data-derived from User)
   ├─ lifecycle.creation.type: "created-with-parent"? → _parent:[parent]
   ├─ lifecycle.creation.type: "mixed-derived"? → Transform (dual: data-driven + interaction-driven)
   ├─ lifecycle.creation.type: "mutation-derived"? → Transform from record mutation event (data-only)
   ├─ lifecycle.creation.type: "data-derived"? → Transform from source entity (data-only)
   ├─ lifecycle.creation.type: "interaction-created" + canBeDeleted: true (hard)? → Transform + HardDeletionProperty with StateMachine
   ├─ lifecycle.creation.type: "interaction-created" + canBeDeleted: true (soft)? → Transform + status StateMachine
   └─ lifecycle.creation.type: "interaction-created" + canBeDeleted: false? → Transform with InteractionEventEntity
   
2. Relation Lifecycle?
   ├─ Source/target entity is polymorphic? → None (controlled by concrete entities)
   ├─ lifecycle.creation.type: "created-with-entity"? → _parent:[parent]
   ├─ Can be deleted? → Transform/parent + HardDeletionProperty with StateMachine
   ├─ Needs audit trail? → Transform + status StateMachine (soft delete)
   └─ Never deleted? → Transform (if interaction-created) or _parent:[parent]

3. Property Value? (🔴 NEVER Transform - Transform is ONLY for Entity/Relation)
   ├─ controlType: "creation-only"? → _owner (controlled by entity/relation)
   ├─ controlType: "integration-result"? → StateMachine (observe API Call entity)
   ├─ controlType: "derived-with-parent"? → _owner (ONLY for derived entities)
   ├─ controlType: "computed-aggregation"?
   │  ├─ "count of"? → Count
   │  ├─ "sum of"? → Summation
   │  ├─ "weighted sum"? → WeightedSummation
   │  ├─ "every"/"all"? → Every
   │  ├─ "any"? → Any
   │  └─ Complex with Record entities? → Custom
   ├─ controlType: "computed-simple"? → computed function
   ├─ controlType: "computed-reactive" or "independent"?
   │  ├─ Has interactionDependencies that can modify? → StateMachine
   │  ├─ Depends on Integration Event? → StateMachine with event trigger
   │  ├─ Has dataDependencies with relations? → Appropriate computation
   │  └─ Only uses own properties? → computed
   └─ Only has initialValue? → defaultValue

4. Dictionary Aggregation?
   └─ Check computationMethod → Map to Count/Summation/Custom
```

## Common Patterns

### Timestamps
- Creation timestamps (`createdAt`): Use `defaultValue: () => Math.floor(Date.now()/1000)`
- Update timestamps (`updatedAt`, `processedAt`): Use StateMachine with `computeValue`

### Status Fields
- With defined transitions: Use StateMachine with StateNodes
- Example: pending → approved/rejected

### Integration Result Properties
**🔴 DIRECT RULE: `controlType: "integration-result"` → Always `StateMachine`**

Properties with `controlType: "integration-result"` are computed from external API/integration results:
- **Pattern**: Extract values from API Call entity's response data
- **Computation**: Always use `StateMachine`
- **Trigger**: Observe API Call entity creation/update events
- **Logic**: 
  - Use `computeTarget` to find the business entity that owns this property
  - Use `computeValue` to extract the result from API Call entity's response field
  - Typically extract from the LATEST successful API Call (status='completed')

**Example**:
```json
{
  "propertyName": "voiceUrl",
  "controlType": "integration-result",
  "dataDependencies": ["TTSAPICall.responseData", "TTSAPICall.status"],
  "computationDecision": "StateMachine",
  "reasoning": "controlType is 'integration-result' - directly maps to StateMachine to observe API Call entity"
}
```

**Implementation notes**:
- Monitor related API Call entity (via relation) for updates
- Extract result when API Call reaches completed status
- Handle multiple API Call attempts (retries) by using the latest successful one

### Counts and Aggregations
- Simple counts: Use `Count`
- Sums: Use `Summation`
- Calculated totals (price × quantity): Use `WeightedSummation`

### Balance/Accumulation Properties
**🔴 CRITICAL**: Properties that aggregate from transaction records should use `Custom`, NOT `StateMachine`
- Pattern: `balance = sum(deposits) - sum(withdrawals)`
- Examples:
  - `UserGiftProfile.giftBalance = sum(RechargeRecord.amount) - sum(DonationRecord.giftAmount)`
  - `Account.balance = sum(CreditRecord.amount) - sum(DebitRecord.amount)`
  - `Inventory.stockLevel = sum(PurchaseOrder.quantity) - sum(SalesOrder.quantity)`
- **How to identify**: 
  - `calculationMethod` contains "sum of", "aggregate", "increased by", "decreased by"
  - Involves multiple Record entities (entities ending in "Record", "Transaction", "Event")
  - Even if has `interactionDependencies`, prioritize aggregation over StateMachine
- Use `Custom` computation to aggregate from related records reactively

### Deletion Patterns

#### For Entities:
- **Hard delete** (no history): Transform + HardDeletionProperty with StateMachine
  - Creation: Transform creates entity from interaction
  - Deletion: HardDeletionProperty with StateMachine triggers physical deletion
- **Soft delete** (audit trail): Transform for creation + status property with StateMachine
  - Creation: Transform creates entity
  - Deletion: StateMachine updates status to "deleted"

#### For Relations:
- **Hard delete**: Transform + HardDeletionProperty with StateMachine
- **Soft delete**: Original creation computation + status property with StateMachine
- **Created-with-entity + deletable**: `_parent` for creation + HardDeletionProperty with StateMachine for deletion

## Validation

Before finalizing, verify:
1. **🔴 CRITICAL**: NO property has `computationDecision: "Transform"` - Transform is ONLY for Entity/Relation
2. Every entity has `dependencies` field with creation-time dependencies from data-design.json
3. Every relation has `dependencies` field with creation-time dependencies from data-design.json
4. Every entity with `entityType: "api-event"` has `computationDecision: "None"`
5. Every entity with `entityType: "polymorphic"` has `computationDecision: "None"`
6. Every entity with `entityType: "api-call"` has `computationDecision: "Transform"`
7. Every entity with `entityType: "user-profile"` has `computationDecision: "Transform"`
8. Every entity with `interactionDependencies` has appropriate computation:
   - If `canBeDeleted: true` with `hard-delete` → Must use Transform + HardDeletionProperty with StateMachine
   - If `canBeDeleted: false` → Can use Transform (unless `created-with-parent` or has special entityType)
9. Relations with polymorphic source/target entity have `computationDecision: "None"`
10. Entities/relations with `lifecycle.creation.type: "created-with-parent/entity"` use `_parent:[ParentName]`
11. Properties with `controlType: "creation-only"` have computation `_owner`
12. Properties with `controlType: "derived-with-parent"` have computation `_owner` (ONLY for derived entities)
13. Properties with `controlType: "computed-aggregation"` use appropriate aggregation (Count/Sum/etc.)
14. Properties with `controlType: "computed-simple"` use `computed` function
15. Properties with `controlType: "integration-result"` use `StateMachine` to observe API Call entities
16. Properties with `controlType: "computed-reactive"` or `"independent"` are analyzed for appropriate computation
17. Properties with modifying `interactionDependencies` use StateMachine (if `controlType: "computed-reactive"` or `"independent"`)
18. Properties that depend on Integration Events use StateMachine with event triggers (NOT Transform)
19. Properties with only `dataDependencies` use data-based computation (if `controlType: "computed-reactive"` or `"independent"`)
20. All entities or relations with `canBeDeleted:true` and `hard-delete` use Transform + HardDeletionProperty
21. All property dependencies are properly formatted with specific properties
22. `InteractionEventEntity` is included when interactions are dependencies
23. The parent name in `_parent:[ParentName]` matches `lifecycle.creation.parent`


## Implementation Checklist

- [ ] Read module name from `.currentmodule` file in project root
- [ ] Parse `agentspace/{module}.data-design.json` completely
- [ ] **Check `entityType` field for every entity first**:
  - [ ] Check for entities with `entityType: "api-event"` and set computation to "None"
  - [ ] Check for entities with `entityType: "polymorphic"` and set computation to "None"
  - [ ] Check for entities with `entityType: "api-call"` and set computation to "Transform"
  - [ ] Check for entities with `entityType: "user-profile"` and set computation to "Transform"
- [ ] Apply mapping rules for every entity (check deletion capability)
- [ ] Copy entity-level `dataDependencies` to `dependencies` (creation-time only)
- [ ] Check `controlType` for every property first
- [ ] For properties with `controlType: "computed-aggregation"`, determine specific aggregation type (Count/Sum/etc.)
- [ ] For properties with `controlType: "computed-reactive"`, analyze dependencies and determine appropriate computation
- [ ] For properties with `controlType: "computed-simple"`, use `computed` function
- [ ] Verify properties with `controlType: "creation-only"` use `_owner`
- [ ] Verify properties with `controlType: "derived-with-parent"` use `_owner` (ONLY for derived entities)
- [ ] Verify properties with `controlType: "integration-result"` use `StateMachine`
- [ ] Apply mapping rules for every relation
- [ ] Check if relation's source/target entity is polymorphic, set computation to "None" if yes
- [ ] Copy relation-level `dataDependencies` to `dependencies` (creation-time only)
- [ ] Apply mapping rules for every dictionary
- [ ] Format all property dependencies correctly
- [ ] Separate `dependencies` and `interactionDependencies`
- [ ] Add `InteractionEventEntity` when needed
- [ ] Verify entities with `lifecycle.creation.type: "integration-event"` have no computation
- [ ] Verify Transform + HardDeletionProperty is used for deletable entities (hard-delete)
- [ ] Verify Transform + HardDeletionProperty is used for deletable relations (hard-delete)
- [ ] Generate complete `agentspace/{module}.computation-analysis.json`