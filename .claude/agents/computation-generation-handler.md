---
name: computation-generation-handler
description: when task 3.1.4.3
model: inherit
color: blue
---

**⚠️ IMPORTANT: Strictly follow the steps below to execute the task. Do not compress content or skip any steps.**


## START: Select Next Uncompleted Item

**📖 FIRST: Determine current module and confirm context.**

**🔴 STEP 0: Determine Current Module**
1. Read module name from `.currentmodule` file in project root
2. If file doesn't exist, STOP and ask user which module to work on
3. Use this module name for all subsequent file operations
4. Module status file location: `agentspace/{module}.status.json`

**🔴 CRITICAL: Working Directory Constraints**
- All file operations MUST be performed within the current project directory
- NEVER access parent directories using `../` or absolute paths outside the workspace

**📖 Reference** 
- `./backend/crud.example.ts` + `./tests/crud.example.test.ts` - Simple CRUD operations with state machines, relations, and permissions
- `./backend/versionControl.example.ts` + `./tests/versionControl.example.test.ts` - Version control with soft delete pattern
- `./backend/versionControlHardDelete.example.ts` + `./tests/versionControlHardDelete.example.test.ts` - Version control with hard delete pattern (for cascading deletes: listen to relation deletion + check parent existence in HardDeletionProperty)
- `./.claude/agents/knowledge/computation-implementation.md` - Detailed computation implementation patterns and examples


**🔴 CRITICAL: Module-Based File Naming**
- Read module name from `.currentmodule` and use it as file prefix
- All file references must use `{module}.` prefix format

**🔴 CRITICAL: Implement ONLY ONE computation per session, then STOP and wait for user confirmation.**

**🔴 CRITICAL: Complete Implementation Rules**
- Each computation must be 100% complete with FULL test coverage
- If computation depends on polymorphic entity: MUST create test concrete entities immediately
- Cannot defer, skip, or mark any part as "will test later" or "TODO"

**❌ ABSOLUTELY FORBIDDEN in test comments or code:**
- "Since X is polymorphic and no concrete entities exist yet, this test focuses on Y"
- "Future tests will add Z scenarios"
- "Note: waiting for concrete entities to be implemented"
- "TODO: test X when Y exists"
- "Simplified version for now"

1. **Read `agentspace/{module}.computation-implementation-plan.json`** to find the FIRST item with `completed: false`
   - ALWAYS select the FIRST item where `completed` field is `false`
   - NEVER skip ahead - dependencies must be completed in order
   - Phase 1 must complete before Phase 2, etc.

2. **Check if item has `lastError` field:**
   - If YES → Execute DEEP DEBUG MODE below
   - If NO → Execute NORMAL IMPLEMENTATION FLOW below

## DEEP DEBUG MODE (when lastError exists):

1. **Review Previous Error**: Read the error document at the path in `lastError` to understand what failed and what was already attempted

2. **Analyze Root Cause**:
   - Verify implementation code correctness
   - Check all `expandedDependencies` are properly handled
   - Confirm test expectations match business requirements
   - Review similar successful computations for patterns

3. **Apply Fix Based on Analysis**:
   - **Implementation Issue** → Fix computation code in `backend/{module}.ts` (refer to API reference)
   - **Test Issue** → Fix test case logic or expectations
   - **Dependency Issue** → Fix data creation order
   - **Business Logic Issue** → Re-read requirements and adjust

4. **Test the Fix**:
   - Run `npm run check` for type verification
   - Run the specific test
   - If successful: Remove `lastError` field, mark `"completed": true`, return to START
   - If still failing: Update error document with new attempts
   - After 3 additional attempts, STOP and wait for user guidance

## NORMAL IMPLEMENTATION FLOW (when no lastError):

**🔴 CRITICAL: You MUST strictly follow the steps below to update the todo list and strictly adhere to each step's requirements and standards. Do not skip or modify any step.**

1. **Implement the Computation** (following API Reference)
   - **📖 MANDATORY FIRST STEP: Completely read `./.claude/agents/knowledge/api-reference.md` to understand all API usage before writing any code**
   - **📖 MANDATORY SECOND STEP: Completely read `./backend/{module}.ts` to understand all existing implementations from previous tasks**
   - **📖 MANDATORY THIRD STEP: Study the reference example files above to understand the standard code structure and computation patterns**
   - **🔴 CRITICAL: Polymorphic Entities Are Normal Entities** - When implementing computations:
     - Polymorphic entities with `entityType: 'polymorphic'` should be treated as **normal entities** in all computation code
     - Include polymorphic entity relations in `dataDeps` attributeQuery just like any other relation
     - Use their `commonProperties` in `compute` callback just like normal properties
     - Do NOT skip, mock, or defer computation logic that depends on polymorphic entities
     - Example: `['creditConsumptions', { attributeQuery: ['amount'] }]` where creditConsumptions targets an polymorphic entity
   - **🔴 CRITICAL: Recognize Split Computation Nodes** - If the current item's ID contains `@InteractionName` (e.g., `Entity@CreateInteraction`, `Entity@UpdateInteraction`):
     - This indicates the entity/relation can be created through multiple interaction paths
     - Multiple nodes with same entity name but different `@InteractionName` suffixes represent ONE unified computation with multiple trigger paths
     - **First node implementation**: Design the Transform to support ALL interactions from the start, even if you're only implementing the first path. Check the plan file for other nodes with the same entity name to see all interaction paths.
     - **Subsequent nodes**: Add new interaction branch to the existing Transform, don't create separate computation
     - Use `event.interactionName` or match conditions to branch between different interaction paths within a single Transform callback
     - All nodes with same entity name share the same `ownerProperties` and `createdWithRelations` - implement them once in the unified Transform
     - Example: `User@CreateUser` and `User@ImportUser` should result in ONE `User.computation` Transform with two branches
   - **🔴 CRITICAL: Check for existing computations** - If the target entity/relation already has computation code:
     - **NEVER overwrite** existing computation logic
     - **ADD branch logic** to handle the new interaction/scenario within existing Transform callback
     - **PRESERVE all existing branches** to ensure previous test cases continue to pass
     - Example: Add `else if` conditions or extend existing conditions in Transform callback
   - **⚠️ Regression Prevention**: All previous tests must continue passing after adding new computation branches
   - **Note**: The backend file is `./backend/{module}.ts` where {module} is from `.currentmodule`
   - **🔴 CRITICAL: NO DATA MUTATIONS IN COMPUTATIONS** - Computations must NEVER directly use `this.system.storage.create()`, `this.system.storage.update()`, or `this.system.storage.delete()`:
     - ❌ **FORBIDDEN**: `await this.system.storage.create('Entity', {...})` in computation code
     - ❌ **FORBIDDEN**: `await this.system.storage.update('Entity', MatchExp..., {...})` in computation code
     - ❌ **FORBIDDEN**: `await this.system.storage.delete('Entity', MatchExp...)` in computation code
     - ✅ **ALLOWED**: `await this.system.storage.find()` or `await this.system.storage.findOne()` to READ data
     - **WHY**: Computations are reactive and should only compute values based on existing data. Data mutations should happen through Interactions or RecordMutationSideEffect, NOT in computations
     - **IF YOU NEED TO MUTATE DATA**: Use Interactions (for user-triggered actions) or RecordMutationSideEffect (for reactive side effects)
   - **🔴 CRITICAL: NO MOCK DATA OR PLACEHOLDERS** - Every computation must be fully implemented with real data:
     - ❌ **FORBIDDEN**: `return 0 // Placeholder` or `return 100 // TODO: implement later`
     - ❌ **FORBIDDEN**: `if (record.id === 'test') return mockValue`
     - ✅ **REQUIRED**: Complete implementation with real data queries and calculations
     - **IF DATA IS MISSING**: Add it to the data model (entities/relations/properties)
     - **IF CALCULATION IS COMPLEX**: Break it down into steps, but implement all steps
   - **🔴 CRITICAL: NO SIDE EFFECTS IN COMPUTATIONS** - Side effects (email, AI calls, external APIs) must be in integrations:
     - ❌ **FORBIDDEN**: `await sendEmail(...)` in computation code
     - ❌ **FORBIDDEN**: `await callOpenAI(...)` in computation code
     - ❌ **FORBIDDEN**: `await stripeAPI.charge(...)` in computation code
     - ✅ **CORRECT**: Create separate integration (see `task-4-implement-integration`)
     - **COMPUTATION ROLE**: Read data → Calculate → Return value (pure reactive computation)
     - **INTEGRATION ROLE**: Handle all side effects triggered by data changes
   - **🔴 CRITICAL: ALWAYS RE-QUERY FROM mutationEvent** - Never trust data completeness in mutationEvent.record:
     - ❌ **FORBIDDEN**: `const entity = mutationEvent.record; use(entity.someField)`
     - ✅ **CORRECT**: `const id = mutationEvent.record.id; const entity = await storage.findOne(..., ['id', 'someField'])`
     - **WHY**: mutationEvent.record may have incomplete data since some fields/relations are optional in queries
   - **🔴 CRITICAL: Event Dependency Timing for Mixed-Derived Entities** - For entities with multiple creation paths (e.g., API Call entities):
     - **WRONG**: Listen to InteractionEventEntity when entity depends on cascading child entity
       - ❌ If A creates B (cascading), and you need C based on B, DON'T listen to A's interaction
       - **Why**: B might not exist yet when C's Transform executes
     - **CORRECT**: Use multiple eventDeps with proper event sources
       - ✅ Branch 1 (data-driven): Listen to B's creation → C created automatically when B created
       - ✅ Branch 2 (interaction-driven): Listen to retry interaction → C created on retry
     - **Example Pattern**:
       ```typescript
       APICall.computation = Transform.create({
         eventDeps: {
           // Branch 1: Auto-create when parent entity created
           parentCreation: { recordName: 'ParentEntity', type: 'create' },
           // Branch 2: Manual retry via interaction
           retryInteraction: { recordName: InteractionEventEntity.name, type: 'create' }
         },
         callback: function(mutationEvent) {
           if (mutationEvent.recordName === 'ParentEntity') {
             const parent = mutationEvent.record // Direct access, no query needed
             return { ...apiCallData, parent: { id: parent.id } }
           }
           if (mutationEvent.recordName === InteractionEventEntity.name) {
             const event = mutationEvent.record
             // Handle retry logic
           }
         }
       })
       ```
 - **🔴 CRITICAL: API Call Entity Property Computations** - For ALL property StateMachines (status, startedAt, attempts, responseData, completedAt, error, etc.) that depend on Integration Event entities:
   - **State flow is FIXED**: `pending → queued → processing → completed|failed`, with `queued → failed` for external API call failures, and `completed|failed → queued` for retries. **NEVER define `pending → processing` or `pending → completed` or `pending → failed` transitions** - the flow must go through `queued` first.
   - **All events have `entityId`**: Since we have Temporal workflow context, ALL events can have correct `entityId` (APICall.id). Use `event.entityId` directly for all state transitions.
   - **startedAt property**: Set to current timestamp when status transitions to 'queued' (from 'pending' or 'failed'). This records when the workflow worker picks up the task.
   - **attempts property**: Increments +1 when status transitions to 'failed' (from 'queued' or 'processing') or 'completed' (from 'processing'). This tracks the number of execution attempts. Start with defaultValue 0.
   - **externalId field**: Preserved for debugging purposes. For sync APIs, use apiCallId; for async APIs, use external taskId. The 'processing' event includes externalId for debug traceability, but state machine matching always uses entityId.
   - **Pattern for computeTarget**:
      ```typescript
      // ALL events use entityId for matching (no need to query by externalId)
      computeTarget: async function(mutationEvent) {
          return { id: mutationEvent.record.entityId }
      }
      ```
   - **🔴 CRITICAL: HardDeletionProperty for Cascading Deletes** - For dependent entity deletion (e.g., Comment depends on Post):
     - ❌ **WRONG**: Listen to Post deletion - relation already deleted, can't find Comments
     - ❌ **WRONG**: Directly call `storage.delete()` in computation
     - ✅ **CORRECT**: Listen to Relation deletion event + check if parent entity exists
     - **Pattern**: 
       1. HardDeletionProperty computation monitors relation's delete event
       2. In callback, query parent entity existence
       3. Return `true` if relation deleted AND parent doesn't exist
   - **🔴 CRITICAL: Entity nodes with ownerProperties** - If the current item has `ownerProperties` field:
     - These are `_owner` type properties that must be set in the entity's creation computation
     - Include ALL ownerProperties in the owner entity computation return value when creating the entity
   - **🔴 CRITICAL: Entity nodes with createdWithRelations** - If the current item has `createdWithRelations` field:
     - These are `created-with-entity` type relations that must be created together with the entity
     - Read `agentspace/{module}.data-design.json` to find the `sourceProperty` or `targetProperty` name for each relation
     - In the entity's computation, return these property names with corresponding data to create relations
     - Framework will automatically create relation records based on these property values. Example:
     ```typescript
     // Entity with createdWithRelations (create relations via property names)
     Order.computation = Transform.create({
      eventDeps: {
        orderInteraction: {
          recordName: InteractionEventEntity.name,
          type: 'create',
          record: {
            interactionName: 'createOrder'
          }
        }
      },
      callback: async function(event) {
        return {
          orderNumber: event.payload.orderNumber,
          owner: event.user // Creates OrderOwner relations via 'owner' sourceProperty
        }
      }
     })
     ```
   - **🔴 CRITICAL: Entity nodes with createdWithChildren** - If the current item has `createdWithChildren` field:
     - These are `created-with-parent` type child entities that must be created together with the parent
     - For each child entity, find the relation connecting parent and child in `agentspace/{module}.data-design.json`
     - Use the relation's `sourceProperty` (if parent is source) or `targetProperty` (if parent is target) in Transform return value
     - Child entity data should include all required fields and relations (especially `user` relation for polymorphic entities)
   - **🔴 SPECIAL CASE 1: `_parent:[parent]` notation**
     - If the computation name contains `_parent:[parent]` (e.g., `_parent:[User]`), this means:
       - You should modify the PARENT entity's computation, not the current entity
       - Example: For `_parent:[User]`, modify the `User` entity's computation that creates Posts
       - This typically occurs when a child entity needs to be created by a parent's Transform computation
       - **📍 Finding the parent entity**: You can find the parent entity name in the current item's `lifecycle.creation.parent` field
       - **How to create child entities**: Use the relation's source/target property name in the parent's Transform return value
       - Example: If `OrderItemRelation` has `sourceProperty: 'items'`, then in Order's Transform:
         ```typescript
         Order.computation = Transform.create({
           record: InteractionEventEntity,
           callback: function(event) {
             if (event.interactionName === 'CreateOrder') {
               return {
                 orderNumber: event.payload.orderNumber,
                 customerName: event.payload.customerName,
                 items: event.payload.items // Creates OrderItem entities via 'items' relation property
               };
             }
             return null;
           }
         });
         ```
   - Add computation code using assignment pattern at end of file:
     ```typescript
     // At end of backend/{module}.ts, after exports:
     // Property computation
     const userProperty = User.properties.find(p => p.name === 'postCount')!
     userProperty.computation = Count.create({
       property: 'posts'
     })
   - Remove any `defaultValue` if adding computation to that property
   - Never use Transform in Property computation
   - For `_owner` properties, always set them in the owner's creation/derivation logic

2. **Type Check**
   - Run `npm run check`
   - Fix all type errors before proceeding to tests

3. **Create Test Case Plan**
   - Read item details from `agentspace/{module}.computation-implementation-plan.json`
   - Check `expandedDependencies` to understand all required dependencies
   - **🔴 MANDATORY CHECK: If any dependency is polymorphic entity, plan MUST include creating test concrete entities**
   - Write test plan comment with: dependencies, test steps, business logic notes
   - Cross-reference with `agentspace/{module}.data-design.json`
   - **🔴 For split computation nodes** (ID contains `@InteractionName`): Write a separate test for the specific interaction path this node represents, even though the implementation is a unified Transform. Each node's test verifies its particular trigger path works correctly.
   - **🔴 For entity nodes with `ownerProperties`**: Test entity creation AND verify ALL ownerProperties are correctly set
   - **🔴 For entity nodes with `createdWithRelations`**: Test entity creation AND query each relation to verify it was created with correct source/target
   - **🔴 For entity nodes with `createdWithChildren`**: Test parent entity creation AND query each child entity to verify it was created with all required fields and relations (especially user relation for polymorphic entities)
   - **🔴 MANDATORY for computations depending on polymorphic entities**: 
     - Plan must include creating test concrete entities NOW (not "future")
     - Must include: 1) Define test concrete entities 2) Push to polymorphic entity's inputEntities 3) Create separate controller with concrete entities 4) Test full computation logic 5) Pop test concrete entities after test
     - ❌ FORBIDDEN: Any note suggesting "will test later" or "waiting for concrete entities"
   - **🔴 For `_parent:[parent]` computations**: Test the parent entity's behavior that creates/manages the child entities
   - **🔴 For `_owner` computations**: Test that the property is correctly set when the owner entity/relation is created
   
   ```typescript
   test('User.dormitoryCount computation', async () => {
     /**
      * Test Plan for: User.dormitoryCount
      * Dependencies: User entity, UserDormitoryRelation
      * Steps: 1) Create user 2) Create dormitories 3) Create relations 4) Verify count
      * Business Logic: Count of dormitories user is assigned to
      */
     // Implementation...
   })
   
   // For split computation nodes (same entity, different interaction paths):
   test('VolcanoEngineStreamURLCall entity via CreateLivestreamRoom (Node: VolcanoEngineStreamURLCall@CreateLivestreamRoom)', async () => {
     /**
      * Test Plan for: VolcanoEngineStreamURLCall@CreateLivestreamRoom
      * Note: This tests ONE trigger path of the unified Transform computation
      * Steps: 1) Trigger CreateLivestreamRoom 2) Verify VolcanoEngineStreamURLCall created with correct properties
      * Business Logic: API call entity auto-created when room is created
      */
     // Implementation...
   })
   
   test('VolcanoEngineStreamURLCall entity via RetryStreamURLGeneration (Node: VolcanoEngineStreamURLCall@RetryStreamURLGeneration)', async () => {
     /**
      * Test Plan for: VolcanoEngineStreamURLCall@RetryStreamURLGeneration
      * Note: This tests ANOTHER trigger path of the SAME unified Transform computation
      * Steps: 1) Trigger RetryStreamURLGeneration 2) Verify new VolcanoEngineStreamURLCall created
      * Business Logic: New API call created when user retries URL generation
      */
     // Implementation...
   })
   
   // For entity with ownerProperties:
   test('Post entity creation with ownerProperties', async () => {
     /**
      * Test Plan for: Post entity (with ownerProperties: [createdAt, status])
      * This tests the entity creation AND all ownerProperties
      * Steps: 1) Create Post via interaction 2) Verify entity exists 3) Verify ALL ownerProperties are set
      * Business Logic: Post creation sets createdAt timestamp and initial status
      */
     // Implementation...
   })
   
   // For entity with createdWithRelations:
   test('Order entity with createdWithRelations', async () => {
     /**
      * Test Plan for: Order entity (with createdWithRelations: [OrderItemRelation])
      * Steps: 1) Create Order 2) Verify Order exists 3) Query each relation to verify creation
      * Note: Check relation source/target are correctly linked
      */
     // Implementation...
   })
   
   // For entity with createdWithChildren:
   test('VideoGenerationRequest entity with createdWithChildren', async () => {
     /**
      * Test Plan for: VideoGenerationRequest entity (with createdWithChildren: [VideoGenerationCreditConsumption])
      * Steps: 1) Create VideoGenerationRequest 2) Verify parent exists 3) Query child entity to verify creation 4) Verify child's relations (especially user relation for polymorphic entities)
      * Business Logic: Creating parent automatically creates child entities with all required data
      */
     // Implementation...
   })
   
   // For _parent:[parent] computations:
   test('Post creation through User Transform (_parent:[User])', async () => {
     /**
      * Test Plan for: _parent:[User]
      * This tests the User's Transform computation that creates Posts
      * Steps: 1) Trigger interaction that creates User 2) Verify Posts are created
      * Business Logic: User's Transform creates related Posts
      */
     // Implementation...
   })
   
   // For _owner computations:
   test('Post.createdAt set by owner computation (_owner)', async () => {
     /**
      * Test Plan for: _owner
      * This tests that createdAt is properly set when Post is created
      * Steps: 1) Trigger interaction that creates Post 2) Verify createdAt is set
      * Business Logic: Post's creation computation sets createdAt timestamp
      */
     // Implementation...
   })
   
   // For computations depending on polymorphic entities:
   test('User.totalCredits computed from polymorphic CreditConsumption', async () => {
     /**
      * Test Plan for: User.totalCredits (depends on polymorphic CreditConsumption entity)
      * Dependencies: Polymorphic CreditConsumption entity
      * 
      * 🔴 MANDATORY Controller Setup (cannot be skipped or deferred):
      *   1) Define test concrete entities: ImageGenConsumption, TTSConsumption
      *   2) Push to CreditConsumption.inputEntities array
      *   3) Create separate test controller including concrete entities
      * 
      * Test Steps:
      *   1) Create user
      *   2) Create ImageGenConsumption records (test polymorphic path 1)
      *   3) Create TTSConsumption records (test polymorphic path 2)
      *   4) Verify totalCredits sums correctly from ALL consumption types
      * 
      * Business Logic: User's credit balance computed from all types of consumptions
      * 
      * Clean Step: Pop test concrete entities from polymorphic entity after test
      */
     // Implementation...
   })
   ```

4. **Write Test Implementation**
   - Add test to `tests/{module}.business.test.ts` in 'Basic Functionality' describe group
   - Follow the test plan created above
   - **📖 Reference the example test files above for testing patterns and structure**
   - For StateMachine computations, test ALL StateTransfer transitions
   - Test all CRUD operations the computation supports
   
   **🔴 CRITICAL: When querying Relations in tests:**
   - ALWAYS use the relation instance's `.name` property: `storage.find(UserPostRelation.name, ...)`
   - NEVER hardcode relation names: `storage.find('UserPostRelation', ...)` ❌
   - This ensures tests work regardless of whether relation names are manually specified or auto-generated
   
   **🔴 CRITICAL: Testing Polymorphic Entity Computations:**
   - **MANDATORY steps when computation depends on polymorphic entity (cannot skip):**
     1. Define test concrete entities matching polymorphic entity's `commonProperties`
     2. Push concrete entities to polymorphic entity's `inputEntities` array
     3. Create separate test controller including concrete entities
     4. Test the FULL computation logic using concrete entities
     5. Pop test concrete entities after test completes
   - **❌ FORBIDDEN approaches:**
     - Skipping polymorphic entity testing ("will test later when entities exist")
     - Testing only non-polymorphic dependencies
     - Adding comments like "Note: consumption testing deferred"
   - Example: For `MediaContent` polymorphic entity, create `VideoContent` and `ImageContent`, push both to `MediaContent.inputEntities`, pass to controller, test both types
   
   **⚠️ Testing Integration Event Entity Computations:**
   - When testing computations based on **Integration Event Entities** (NOT InteractionEventEntity):
     - Use `controller.system.storage.create('${EventEntityName}', {...})` to directly create event records
     - Do NOT use `controller.callInteraction()` - integration events are created by external systems
     - Example: For StripePaymentEvent entity, use `controller.system.storage.create(StripePaymentEvent.name, { transactionId: '...', paymentStatus: 'success', ... })`
     - This simulates the webhook/callback from external systems that creates these events
   - When testing computations based on **InteractionEventEntity**:
     - Use `controller.callInteraction()` as normal - these are triggered by user interactions
   
   Example patterns:
   ```typescript
   test('User.status has correct default value', async () => {
     const user = await system.storage.create('User', {
       name: 'Test User',
       email: 'test@example.com'
     })
     
     const foundUser = await system.storage.findOne(
       'User',
       MatchExp.atom({ key: 'id', value: ['=', user.id] }),
       undefined,
       ['id', 'status'] // Remember attributeQuery!
     )
     
     expect(foundUser.status).toBe('active')
   })
   
   test('Post entity with ownerProperties (createdAt, status)', async () => {
     // Create Post - ownerProperties should be set by entity's Transform
     const result = await controller.callInteraction('CreatePost', {
       user: testUser,
       payload: { title: 'Test Post', content: 'Content' }
     })
     
     // Verify entity creation AND all ownerProperties
     const post = await system.storage.findOne(
       'Post',
       MatchExp.atom({ key: 'id', value: ['=', result.data.id] }),
       undefined,
       ['id', 'title', 'createdAt', 'status'] // Include ALL ownerProperties in attributeQuery
     )
     
     expect(post.title).toBe('Test Post')
     expect(post.createdAt).toBeGreaterThan(0) // ownerProperty: createdAt
     expect(post.status).toBe('draft') // ownerProperty: status
   })
   
   test('Order entity with createdWithRelations (OrderItemRelation)', async () => {
     // Create Order with items - relations created automatically via sourceProperty
     const result = await controller.callInteraction('CreateOrder', {
       user: testUser,
       payload: { 
         orderNumber: 'ORD001',
         items: [{ productId: 'P1', quantity: 2 }, { productId: 'P2', quantity: 1 }]
       }
     })
     
     // Verify Order exists
     const order = await system.storage.findOne('Order',
       MatchExp.atom({ key: 'id', value: ['=', result.data.id] }),
       undefined, ['id', 'orderNumber']
     )
     expect(order.orderNumber).toBe('ORD001')
     
     // Verify ALL relations in createdWithRelations are created
     const relations = await system.storage.find(OrderItemRelation.name,
       MatchExp.atom({ key: 'source.id', value: ['=', order.id] }),
       undefined,
       ['id', ['source', { attributeQuery: ['id'] }], ['target', { attributeQuery: ['id', 'productId'] }]]
     )
     expect(relations.length).toBe(2)
     expect(relations[0].target.productId).toBe('P1')
   })
   
   test('Article.state transitions correctly', async () => {
     // Create article in draft state
     const result = await controller.callInteraction('CreateArticle', {
       user: testUser,
       payload: { title: 'Test', content: 'Content' }
     })
     
     // Verify state is draft
     const article = await system.storage.findOne(
       'Article',
       MatchExp.atom({ key: 'id', value: ['=', result.data.id] }),
       undefined,
       ['id', 'state']
     )
     expect(article.state).toBe('draft')
     
     // Transition to published
     await controller.callInteraction('PublishArticle', {
       user: testUser,
       payload: { id: article.id }
     })
     
     // Verify state changed
     const published = await system.storage.findOne(
       'Article',
       MatchExp.atom({ key: 'id', value: ['=', article.id] }),
       undefined,
       ['id', 'state']
     )
     expect(published.state).toBe('published')
   })
   
  // Example: Querying Relations (if needed in tests)
  test('User-Post relation exists after creation', async () => {
    // Import the relation instance
    import { UserPostRelation } from '@/backend'
     
     // Query using relation instance name
     const relations = await system.storage.find(
       UserPostRelation.name,  // ✅ CORRECT: Use instance name
       MatchExp.atom({ key: 'source.id', value: ['=', userId] }),
       undefined,
       [
         'id',
         ['source', { attributeQuery: ['id', 'name'] }],
         ['target', { attributeQuery: ['id', 'title'] }]
       ]
     )
     
     expect(relations.length).toBe(1)
   })
   
   // Example: Testing Integration Event Entity computations
   test('Order.paymentStatus computed from StripePaymentEvent', async () => {
     /**
      * Test Plan: Testing computation based on Integration Event Entity
      * This tests computations triggered by external system events (StripePaymentEvent)
      * Use storage.create() to simulate webhook data, NOT callInteraction()
      */
     
     // Create an order first (via interaction)
     const orderResult = await controller.callInteraction('CreateOrder', {
       user: testUser,
       payload: { orderNumber: 'ORD001', amount: 100 }
     })
     
     // Simulate webhook from payment gateway by directly creating StripePaymentEvent
     // This mimics external system (Stripe/Alipay) sending payment confirmation
     await controller.system.storage.create(StripePaymentEvent.name, {
       transactionId: 'txn_123456',
       paymentStatus: 'success',
       orderId: orderResult.data.id,
       timestamp: Math.floor(Date.now() / 1000)
     })
     
     // Verify the computation triggered by StripePaymentEvent updated Order
     const order = await system.storage.findOne(
       'Order',
       MatchExp.atom({ key: 'id', value: ['=', orderResult.data.id] }),
       undefined,
       ['id', 'paymentStatus']
     )
     
     expect(order.paymentStatus).toBe('paid')
   })
   ```

5. **Type Check Test Code**
   - Run `npm run check` to ensure test code has no type errors
   - Fix any type errors in test code before proceeding
   - Do NOT run actual tests until type checking passes

6. **Run Test**
   - Run full test suite: `npm run test tests/{module}.business.test.ts`
   - Must fix any failures (new tests or regressions) before proceeding
   
   **If test fails:**
   - Review test plan - are dependencies properly set up?
   - Verify against `agentspace/{module}.data-design.json`
   - Check if test data matches `expandedDependencies`
   - Common issues: missing dependencies, wrong operation order, incorrect expectations
   
   **Error handling:**
   - After 10 fix attempts, STOP IMMEDIATELY and wait for user guidance
   - Create error document in `agentspace/errors/{module}.{error-name}.md` with test plan, code, error, and attempts
   - Update `lastError` field in `agentspace/{module}.computation-implementation-plan.json` with error doc path
   - Never skip tests or fake data to pass

7. **Document Progress**
   - **🔴 CRITICAL: Update `agentspace/{module}.computation-implementation-plan.json` based on test results:**
     - **If ALL tests pass** (`npm run test tests/{module}.business.test.ts` shows ALL tests passing):
       - Set `"completed": true` for the CURRENT node being worked on
       - Remove `lastError` field if it exists
       - **For split computation nodes**: Mark completed only after the specific interaction path is implemented and tested. The unified Transform accumulates multiple trigger paths across nodes, with each node tracking completion of its specific path.
     - **If ANY test fails** (including regression tests):
       - Keep `"completed": false` - the computation is NOT done
       - Add/update `lastError` field with path to error document in `agentspace/errors/{module}.{error-name}.md`
       - The computation remains incomplete and needs fixing

8. **Commit Changes (only if tests pass)**
   - **📝 If computation was successfully completed:**
     ```bash
     git add .
     git commit -m "feat: Task 3.1.4.3 - Implement [computation_name] computation with tests"
     ```
   - Replace `[computation_name]` with the actual computation name from the plan

9. **Complete and Exit**
   - **🛑 MANDATORY STOP: Exit immediately after completing ONE computation**
   - Wait for user confirmation before selecting the next computation
