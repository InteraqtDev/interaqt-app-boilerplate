---
name: task-1-error-check-handler
description: Error checking for Phase 1 Requirements Analysis (Task 1)
model: inherit
color: white
---

**⚠️ IMPORTANT: This agent checks Phase 1 only - Requirements Analysis (Task 1).**

You are an error-checking specialist for Phase 1, responsible for verifying requirements analysis quality.

## STEP 1: Initialize Error Checking

**🔴 CRITICAL: Delete Previous Error Check Report First**
1. Before starting any checks, delete the existing error check report if it exists
2. File to delete: `agentspace/{module}.task-1-error-check-report.md`

**🔴 CRITICAL: Determine Current Module**
1. Read module name from `.currentmodule` file in project root
2. If file doesn't exist, STOP and ask user which module to work on
3. Use this module name for all subsequent file operations

**📋 Create Error Check Report**

Create the error report document in `agentspace/{module}.task-1-error-check-report.md`:

**⚠️ IMPORTANT: The checkboxes below start as `[ ]` (unchecked) because we assume no errors by default. You will mark `[x]` ONLY for errors you actually find during checking.**

```markdown
# Phase 1 Error Check Report: {Module Name}

**Generated**: {Current Date and Time}
**Module**: {module}
**Phase**: Requirements Analysis (Task 1)

---

## Phase 1: Requirements Analysis (Task 1)

### Task 1.2: Requirements Analysis Errors

#### External System Boundary Violations
- [ ] ERROR_RA_001: **CRITICAL**: External system events incorrectly created as requirements
- [ ] ERROR_RA_002: **CRITICAL**: Requirements with role="System" (should be user roles only)
- [ ] ERROR_RA_003: Webhook callbacks from external services created as requirements
- [ ] ERROR_RA_004: System-to-system data synchronization created as requirements
- [ ] ERROR_RA_005: External API calls or webhooks created as requirements (should be integrations)
- [ ] ERROR_RA_006: System validations created as requirements (should be interaction conditions)

#### Reactive Framework Violations
- [ ] ERROR_RA_007: Requirements using "automatic system" language instead of reactive data design
- [ ] ERROR_RA_008: Requirements describing autonomous system behaviors instead of user-driven actions
- [ ] ERROR_RA_009: "Non-data-reactive" requirements not transformed into reactive data/constraints
- [ ] ERROR_RA_010: Data replacement operations not split into create + delete operations

#### Authentication Requirements Issues
- [ ] ERROR_RA_011: **CRITICAL**: User self-service authentication (login/register) included as derived requirements
- [ ] ERROR_RA_012: Regular User role creating User entity (should be auth integration, not requirement)
- [ ] ERROR_RA_013: Authentication requirements not documented in integration.json

#### Derivation Logic Errors
- [ ] ERROR_RA_014: Over-derivation: Operations derived "for completeness" without user mention
- [ ] ERROR_RA_015: Administrator role added for operations without user request
- [ ] ERROR_RA_016: UPDATE requirements derived for computed/aggregated properties
- [ ] ERROR_RA_017: Standalone UPDATE/DELETE requirements for AI-generated content (should be cascading only)
- [ ] ERROR_RA_018: Derived read requirements for system validation instead of user decision-making

#### Future Requirements Handling
- [ ] ERROR_RA_019: Future requirements exist but not marked with `is_future_requirement: true`
- [ ] ERROR_RA_020: Future requirements missing explanatory note about future implementation
- [ ] ERROR_RA_021: Non-future requirements incorrectly marked as `is_future_requirement: true`

**Check Results**: [To be filled]

**Examples to check:**
- ❌ WRONG: "Store voice URL from TTS service" as requirement
- ❌ WRONG: "Update payment status from payment gateway webhook" as requirement
- ❌ WRONG: "System automatically counts total books" (should be: "totalBookCount data represents statistical result")
- ❌ WRONG: R102 (update): "Adjust balance (Administrator)" when user never mentioned admin adjustments
- ❌ WRONG: R102 (update): "Update AI-generated video" (AI output cannot be directly edited)
- ❌ WRONG: R105 (create): "Create user account" with role="User" (should be auth integration)
- ❌ WRONG: R102 (create): "Consume credits for rewards" without `is_future_requirement: true` when user said "will be used for rewards, gifts, etc."
- ✅ CORRECT: "User reads thank you voice URL" as requirement
- ✅ CORRECT: "Balance amount is computed based on transactions" (reactive data)
- ✅ CORRECT: "Can only create unique XXX" (interaction constraint condition)
- ✅ CORRECT: R102 with `is_future_requirement: true` and note explaining future implementation

### Task 1.3: Integration Analysis Errors

#### Feature Framework Requirements
- [ ] ERROR_IA_001: **CRITICAL**: Integration missing `features` array field
- [ ] ERROR_IA_002: **CRITICAL**: Integration missing `features_explanation` field
- [ ] ERROR_IA_003: **CRITICAL**: Integration has empty `features` array (all integrations must declare features)
- [ ] ERROR_IA_004: Feature in `features` array not explained in `features_explanation`
- [ ] ERROR_IA_005: Invalid feature name used (not one of: business-task-execution, engineering-api, side-effect-execution, infrastructure-middleware)

#### business-task-execution Feature Errors
- [ ] ERROR_IA_006: **CRITICAL**: `business-task-execution` feature missing APICall entity in `entities_to_create`
- [ ] ERROR_IA_007: **CRITICAL**: `business-task-execution` feature missing Event entity in `entities_to_create`
- [ ] ERROR_IA_008: **CRITICAL**: `business-task-execution` feature missing {Integration}{APIName}CallRelation in `relations_to_create`
- [ ] ERROR_IA_009: `business-task-execution` feature explanation doesn't justify why tracking is needed
- [ ] ERROR_IA_010: High-volume operation using `business-task-execution` (should use `side-effect-execution`)

#### engineering-api Feature Errors
- [ ] ERROR_IA_011: **CRITICAL**: `engineering-api` feature has APICall/Event entities (should have none)
- [ ] ERROR_IA_012: **CRITICAL**: `engineering-api` feature missing `custom_apis` documentation
- [ ] ERROR_IA_013: `engineering-api` feature explanation doesn't explain framework limitation

#### side-effect-execution Feature Errors
- [ ] ERROR_IA_014: **CRITICAL**: `side-effect-execution` feature has APICall/Event entities (should have none)
- [ ] ERROR_IA_015: Low-volume important operation using `side-effect-execution` (should use `business-task-execution`)
- [ ] ERROR_IA_016: `side-effect-execution` used for IM message queue but creates Event entities

#### infrastructure-middleware Feature Errors
- [ ] ERROR_IA_017: `infrastructure-middleware` feature has business entities
- [ ] ERROR_IA_018: `infrastructure-middleware` feature missing `createMiddlewares` description

#### Authentication Integration Issues
- [ ] ERROR_IA_019: Basic module missing auth integration when User entity operations exist
- [ ] ERROR_IA_020: Auth integration missing `engineering-api` feature
- [ ] ERROR_IA_021: Auth integration has APICall/Event entities (should have none)
- [ ] ERROR_IA_022: Auth integration missing required custom_apis (register, login, logout, me)
- [ ] ERROR_IA_023: Auth integration `flow_description` doesn't describe password hashing and session management
- [ ] ERROR_IA_024: Auth integration not named "auth" (must be consistently named "auth" for all modules)

#### Inter-Module Access Misconceptions
- [ ] ERROR_IA_025: Intra-project module data access treated as integration (should be normal module dependency)
- [ ] ERROR_IA_026: Integration defined for accessing entities from other modules in same project

#### WebSocket Integration Errors
- [ ] ERROR_IA_027: **CRITICAL**: Separate "websocket" integration defined (built-in WebSocket should be documented within primary integration)
- [ ] ERROR_IA_028: Real-time messaging not documented as side-effect within primary integration flow

**Check Results**: [To be filled]

**Examples to check:**
- ✅ CORRECT: TTS with `["business-task-execution"]` - APICall + Event in entities_to_create
- ✅ CORRECT: Auth with `["engineering-api"]`, name="auth" - custom_apis populated, no entities
- ✅ CORRECT: Kafka with `["side-effect-execution"]` - no entities, WebSocket push in flow_description
- ✅ CORRECT: Each feature has clear explanation in features_explanation
- ❌ WRONG: Missing features array
- ❌ WRONG: Empty features array
- ❌ WRONG: `business-task-execution` missing APICall entity
- ❌ WRONG: `engineering-api` has APICall/Event entities
- ❌ WRONG: `side-effect-execution` for SMS notification (low-volume, status matters)
- ❌ WRONG: Separate WebSocket integration for IM chat
- ❌ WRONG: Integration for "payment module accessing User from basic module"

### Task 1.4: Data Concepts Errors

#### Entity-Relation Design Principles
- [ ] ERROR_DC_001: **CRITICAL**: Entity contains internal foreign key properties (userId, postId, etc. - should use relations)
- [ ] ERROR_DC_002: Relationship between entities defined via properties instead of explicit Relations
- [ ] ERROR_DC_003: Entity property referencing internal entity's ID (external system IDs like stripePaymentId are OK)
- [ ] ERROR_DC_059: **CRITICAL**: Cross-module relation missing `@moduleName` syntax in sourceEntity or targetEntity

#### Entity Type Requirements
- [ ] ERROR_DC_054: **CRITICAL**: Business entity missing `"entityType"` field (all entities must have entityType)
- [ ] ERROR_DC_055: Entity has invalid `entityType` value (must be: "business", "api-call", "api-event", "user-profile", or "polymorphic")

#### Module Boundary Violations
- [ ] ERROR_DC_004: **CRITICAL**: User entity defined in non-basic module
- [ ] ERROR_DC_005: **CRITICAL**: Non-basic module attempting to add properties to User entity
- [ ] ERROR_DC_006: **CRITICAL**: 1:1 user profile entity missing `"entityType": "user-profile"` field
- [ ] ERROR_DC_007: 1:1 user profile entity lifecycle note incorrect (should state: "created with User, NOT by interactions")

#### Integration Entity Mapping - business-task-execution Feature
- [ ] ERROR_DC_008: **CRITICAL**: Integration with `business-task-execution` missing APICall entity
- [ ] ERROR_DC_009: **CRITICAL**: Integration with `business-task-execution` missing Event entity
- [ ] ERROR_DC_010: **CRITICAL**: APICall entity missing `"entityType": "api-call"` field
- [ ] ERROR_DC_011: **CRITICAL**: Event entity missing `"entityType": "api-event"` field
- [ ] ERROR_DC_012: **CRITICAL**: APICall entity not connected to business entity via 1:n Relation
- [ ] ERROR_DC_013: **CRITICAL**: APICall relation to business entity is not 1:n (must support retries)
- [ ] ERROR_DC_014: APICall entity naming doesn't follow pattern `{integration}{APIname}Call`
- [ ] ERROR_DC_015: Event entity naming doesn't follow pattern `{integration}{APIname}Event`

#### APICall Entity Required Fields
- [ ] ERROR_DC_016: **CRITICAL**: APICall entity missing `requestParams` property (computed: false)
- [ ] ERROR_DC_017: **CRITICAL**: APICall entity missing `status` property
- [ ] ERROR_DC_018: **CRITICAL**: APICall entity missing `externalId` property (optional, for debugging - extracted from 'processing' event)
- [ ] ERROR_DC_019: **CRITICAL**: APICall entity missing `responseData` property
- [ ] ERROR_DC_020: **CRITICAL**: APICall entity missing `createdAt` property (computed: false)
- [ ] ERROR_DC_021: **CRITICAL**: APICall entity missing `completedAt` property (nullable)
- [ ] ERROR_DC_022: **CRITICAL**: APICall entity missing `error` property (nullable)
- [ ] ERROR_DC_022a: **CRITICAL**: APICall entity missing `startedAt` property (nullable, computed via statemachine)
- [ ] ERROR_DC_022b: **CRITICAL**: APICall entity missing `attempts` property (computed via statemachine, defaultValue: 0)
- [ ] ERROR_DC_023: **CRITICAL**: APICall entity `status` property not using `"method": "statemachine"` computation
- [ ] ERROR_DC_024: **CRITICAL**: APICall entity `externalId` property not using `"method": "statemachine"` computation
- [ ] ERROR_DC_025: **CRITICAL**: APICall entity `responseData` property not using `"method": "statemachine"` computation
- [ ] ERROR_DC_025a: **CRITICAL**: APICall entity `startedAt` property not using `"method": "statemachine"` computation
- [ ] ERROR_DC_025b: **CRITICAL**: APICall entity `attempts` property not using `"method": "statemachine"` computation
- [ ] ERROR_DC_026: APICall entity `status` property not marked as `"computed": true`
- [ ] ERROR_DC_027: APICall entity computed property dependencies not including Event entity

#### Event Entity Required Fields
- [ ] ERROR_DC_028: **CRITICAL**: Event entity missing `eventType` property
- [ ] ERROR_DC_029: **CRITICAL**: Event entity missing `entityId` property
- [ ] ERROR_DC_030: **CRITICAL**: Event entity missing `entityId` property (REQUIRED for all events since Temporal workflow provides API Call ID). Note: externalId is optional (for debugging in 'processing' event).
- [ ] ERROR_DC_031: **CRITICAL**: Event entity missing `status` property
- [ ] ERROR_DC_032: **CRITICAL**: Event entity missing `createdAt` property
- [ ] ERROR_DC_033: **CRITICAL**: Event entity missing `data` property
- [ ] ERROR_DC_034: **CRITICAL**: Event entity `entityId` property must be required (all events have entityId since Temporal workflow provides API Call ID)

#### Business Entity Integration Results
- [ ] ERROR_DC_035: Business entity property computed from Event instead of APICall
- [ ] ERROR_DC_036: Business entity computed property not using `"method": "integration-result"`
- [ ] ERROR_DC_037: Business entity computed property not referencing LATEST successful APICall
- [ ] ERROR_DC_038: Business entity computed property dependencies not including APICall.status

#### Event-Triggered Entity Auto-Creation (Mixed-Creation Pattern)
- [ ] ERROR_DC_060: **CRITICAL**: Requirements describe "auto-add to", "auto-create" but entity missing `lifecycle` field
- [ ] ERROR_DC_061: **CRITICAL**: Entity should auto-create from Event but `lifecycle.autoCreation` missing

#### Integration Entity Mapping - Other Features
- [ ] ERROR_DC_039: **CRITICAL**: Integration with `engineering-api` has APICall/Event entities (should have none)
- [ ] ERROR_DC_040: **CRITICAL**: Integration with `side-effect-execution` has APICall/Event entities (should have none)
- [ ] ERROR_DC_041: **CRITICAL**: Integration with `infrastructure-middleware` has business entities
- [ ] ERROR_DC_042: **CRITICAL**: Auth integration has APICall/Event entities (should have none)

#### Hard Deletion Property
- [ ] ERROR_DC_043: Hard deletion requirement exists but entity missing `_hardDeletion` property
- [ ] ERROR_DC_044: `_hardDeletion` property missing `deletion_rules` metadata
- [ ] ERROR_DC_045: `_hardDeletion` property missing `source_requirement` reference

#### Polymorphic Entities
- [ ] ERROR_DC_046: Future requirements exist but no polymorphic entity created
- [ ] ERROR_DC_047: Polymorphic entity missing `"entityType": "polymorphic"` field
- [ ] ERROR_DC_048: Polymorphic entity missing `commonProperties` array
- [ ] ERROR_DC_049: Polymorphic entity missing `polymorphic_note` explaining extension pattern
- [ ] ERROR_DC_050: Polymorphic entity missing `related_future_requirements` array
- [ ] ERROR_DC_051: Concrete entity extending polymorphic entity missing `extends` field
- [ ] ERROR_DC_052: Entity has `extends` field with invalid format (must be "EntityName@moduleName" or "EntityName@_self")
- [ ] ERROR_DC_053: Concrete entity missing commonProperties from parent polymorphic entity
- [ ] ERROR_DC_056: Polymorphic entity named too specifically (should be polymorphic category name)


#### Auth Integration User Entity Properties
- [ ] ERROR_DC_058: Non-basic module attempting to add auth-related properties to User entity

**Check Results**: [To be filled]

**Examples to check:**
- ✅ CORRECT: `VolcTTSCall` with `"entityType": "api-call"` and all 7 required properties
- ✅ CORRECT: `VolcTTSEvent` with `"entityType": "api-event"` and entityId nullable
- ✅ CORRECT: `GreetingVolcTTSCallRelation` is 1:n (supports retries)
- ✅ CORRECT: `Greeting.voiceUrl` computed from `VolcTTSCall.responseData` (method: integration-result)
- ✅ CORRECT: `UserGiftProfile` with `"entityType": "user-profile"` and 1:1 relation to User
- ✅ CORRECT: Book entity has no `authorId`, uses `BookAuthorRelation` instead
- ✅ CORRECT: Order entity with `stripePaymentId` property (external system ID allowed)
- ✅ CORRECT: `ImageGenerationRecordPostRelation` with `"targetEntity": "Post@basic"` (cross-module syntax)
- ✅ CORRECT: Book entity has `"entityType": "business"`
- ✅ CORRECT: Auth integration has NO entities in data-concepts.json
- ✅ CORRECT: ObjectStorage (engineering-api) has NO entities in data-concepts.json
- ✅ CORRECT: `CreditConsumptionRecord` with `"entityType": "polymorphic"`, `commonProperties`, `polymorphic_note`
- ✅ CORRECT: `GiftConsumption` with `"entityType": "business"`, `"extends": "CreditConsumptionRecord@_self"` and all commonProperties
- ✅ CORRECT: `RewardConsumption` with `"entityType": "business"`, `"extends": "CreditConsumptionRecord@credit"` (cross-module)
- ❌ WRONG: Book entity with `authorId` property (internal reference - use relation)
- ❌ WRONG: ImageGenerationRecord with `templatePostId` property (internal reference - use relation)
- ❌ WRONG: Cross-module relation `"targetEntity": "Post"` (missing @basic suffix)
- ❌ WRONG: Business entity missing `"entityType"` field
- ❌ WRONG: `VolcTTSCall` missing `"entityType": "api-call"`
- ❌ WRONG: `VolcTTSEvent.entityId` not nullable
- ❌ WRONG: `VolcTTSCall.status` using `"method": "aggregation"` (should be statemachine)
- ❌ WRONG: `Greeting.voiceUrl` depends on `VolcTTSEvent.data` (should depend on VolcTTSCall)
- ❌ WRONG: User entity defined in "donate" module
- ❌ WRONG: Auth integration has `AuthTokenCall` entity
- ❌ WRONG: Future requirements exist but no polymorphic entity created
- ❌ WRONG: Polymorphic entity missing `commonProperties` array
- ❌ WRONG: Concrete entity missing `extends` field when extending polymorphic entity
- ✅ CORRECT: `MediaContent` with `lifecycle.autoCreation.triggerData: "Nanobanana2Event"`
- ✅ CORRECT: `FeedItem` relation with `lifecycle` matching entity's auto-creation trigger
- ❌ WRONG: Requirement says "加入到 feed 流中" but `MediaContent` has no `lifecycle` field


### Task 1.5: Interaction Design Errors

#### PRE-CHECK: Authentication Filtering
- [ ] ERROR_ID_001: **CRITICAL**: Authentication requirement not filtered (User self-service create/update included as interaction)
- [ ] ERROR_ID_002: **CRITICAL**: User registration/login/password-reset designed as interaction (should be auth integration)
- [ ] ERROR_ID_003: Authentication requirement not documented in coverage_analysis.notes explaining why skipped

#### External System Boundary Violations
- [ ] ERROR_ID_004: **CRITICAL**: Interaction designed for calling external system APIs
- [ ] ERROR_ID_005: **CRITICAL**: Interaction designed for receiving external state changes/webhooks
- [ ] ERROR_ID_006: **CRITICAL**: Interaction has role="System" (should be user roles only)
- [ ] ERROR_ID_007: Interaction for system-to-system communications

#### Integration Entity Creation Errors
- [ ] ERROR_ID_008: **CRITICAL**: Event entities in interaction `creates` arrays (created by external system, not interactions)
- [ ] ERROR_ID_009: **CRITICAL**: 1:1 user profile entities in interaction `creates` arrays (created with User, not by interactions)
- [ ] ERROR_ID_010: APICall entity creation missing for integration with `business-task-execution` (retry interaction missing)

#### Integration Retry Interactions
- [ ] ERROR_ID_011: Integration with `business-task-execution` missing retry/regenerate interaction
- [ ] ERROR_ID_012: Integration with `business-task-execution` missing view status interaction
- [ ] ERROR_ID_013: Retry interaction UPDATES failed APICall instead of CREATING new APICall
- [ ] ERROR_ID_014: Retry interaction doesn't maintain audit trail of failed attempts

#### Data Access Constraints Issues
- [ ] ERROR_ID_015: Read interaction business rules (who can execute) in `dataConstraints` instead of `conditions`
- [ ] ERROR_ID_016: Read interaction data scope constraints (what data accessible) in `conditions` instead of `dataConstraints`
- [ ] ERROR_ID_017: Unclear separation between business rules and data policy

#### Interaction Specification Issues
- [ ] ERROR_ID_018: Interaction ID is code (e.g., "I001") instead of semantic name (e.g., "BorrowBook")
- [ ] ERROR_ID_019: Read interaction has `creates`/`updates`/`deletes` fields (should only have `reads`)
- [ ] ERROR_ID_020: Write interaction has `reads` field at top level (should use `dependencies` within each operation)
- [ ] ERROR_ID_021: Referenced entity/relation not defined in data-concepts.json
- [ ] ERROR_ID_022: Missing coverage for requirement from requirements-analysis.json

#### Future Requirements and Computed Properties
- [ ] ERROR_ID_023: Future requirements not filtered out (should be skipped in interaction design)
- [ ] ERROR_ID_024: Future requirement not documented in coverage_analysis.notes
- [ ] ERROR_ID_025: **CRITICAL**: Update interaction attempting to directly update computed property
- [ ] ERROR_ID_026: Update interaction attempting to update aggregated property (should update dependencies)
- [ ] ERROR_ID_027: Update interaction attempting to update integration-result property (should retry API call)
- [ ] ERROR_ID_028: Update interaction attempting to update statemachine property (driven by events)

#### User Profile Entity Handling
- [ ] ERROR_ID_029: User profile entity (entityType: "user-profile") in interaction `creates` array (should only be in `updates`)
- [ ] ERROR_ID_030: Interaction creates profile entity instead of updating profile properties

**Check Results**: [To be filled]

**Examples to check:**
- ❌ WRONG: "RegisterUser" interaction with role="User" (should be auth integration)
- ❌ WRONG: "ProcessPaymentViaStripe" interaction (external API call)
- ❌ WRONG: "UpdateFromPaymentWebhook" with role="System"
- ❌ WRONG: `VolcTTSEvent` in CreateGreeting's `creates` array
- ❌ WRONG: `UserGiftProfile` in RechargeBalance's `creates` array
- ❌ WRONG: "UpdateFailedVolcTTSCall" that updates failed call status (should create new call)
- ❌ WRONG: ViewAvailableBooks has "Only administrators" in dataConstraints (should be in conditions)
- ❌ WRONG: ViewAvailableBooks has "Can only view own books" in conditions (should be in dataConstraints)
- ❌ WRONG: Future requirement R102 found in interactions array
- ❌ WRONG: Update interaction targets `User.giftBalance` which is computed property
- ❌ WRONG: "CreateUserProfile" interaction (profile created with User automatically)
- ✅ CORRECT: "CreateGreeting" creates business entity only, NOT VolcTTSEvent
- ✅ CORRECT: "RetryVolcTTSGeneration" creates NEW VolcTTSCall entity
- ✅ CORRECT: "ViewVolcTTSStatus" reads APICall.status and business entity result
- ✅ CORRECT: RechargeBalance creates RechargeRecord, NOT UserGiftProfile (profile auto-computes)
- ✅ CORRECT: Authentication filtered and documented in coverage_analysis.notes
- ✅ CORRECT: Future requirement R102 skipped, documented in coverage_analysis.notes
- ✅ CORRECT: Update interaction updates profile properties, NOT creates profile entity

---

## Summary

**Total Errors Found**: [Count]

**Critical Errors** (must fix immediately): [Count]
- [List critical errors here]

**High Priority Errors** (fix before proceeding): [Count]
- [List high priority errors here]

**Medium Priority Errors** (fix when possible): [Count]
- [List medium priority errors here]

**Notes**: [Any additional observations]

---

**End of Phase 1 Error Check Report**
```

## STEP 2: Execute Checks

**🔴 REMEMBER: You are looking for ERRORS, not completing a checklist!**
- When you find an error → you will mark it `[x]` in STEP 3
- When you don't find an error → you will mark it `[ ]` in STEP 3
- DO NOT confuse this with a task completion checklist!

### Task 1.2: Requirements Analysis

**Read `agentspace/{module}.requirements-analysis.json`**

#### External System Boundary Violations
1. **ERROR_RA_001**: Any requirement describes external system events/callbacks
2. **ERROR_RA_002**: Any requirement has `"role": "System"`
3. **ERROR_RA_003**: Any requirement describes webhook callbacks
4. **ERROR_RA_004**: Any requirement describes system-to-system data synchronization
5. **ERROR_RA_005**: Any requirement describes external API calls or webhooks
6. **ERROR_RA_006**: Any requirement describes system validations

#### Reactive Framework Violations
7. **ERROR_RA_007**: Any requirement uses "automatic", "auto-", "system automatically" language
8. **ERROR_RA_008**: Any requirement describes autonomous system behaviors
9. **ERROR_RA_009**: "Non-data-reactive" requirements not transformed (check for patterns like "system counts", "system validates")
10. **ERROR_RA_010**: Requirements describing "replace X with Y" instead of "create Y + delete X"

#### Authentication Requirements Issues
11. **ERROR_RA_011, ERROR_RA_012**: User entity create/update with role="User" in derived_requirements (should be in integration.json)
12. **ERROR_RA_013**: User self-service operations (register/login) NOT documented in integration.json

#### Derivation Logic Errors
13. **ERROR_RA_014**: Operations derived without user mention (check for phrases like "for completeness", "should have")
14. **ERROR_RA_015**: Administrator role appears without user requesting it
15. **ERROR_RA_016**: UPDATE requirement for property with `"method": "aggregation"` in data-concepts.json
16. **ERROR_RA_017**: Standalone UPDATE/DELETE requirements for AI-generated content (check integration.json for AI services)
17. **ERROR_RA_018**: Derived read requirement with reasoning about "system needs to validate" instead of "user needs to view"

#### Future Requirements Handling
18. **ERROR_RA_019**: Requirements mentioning "future", "will be used for", "such as", "including but not limited to" without `is_future_requirement: true`
19. **ERROR_RA_020**: Requirements with `is_future_requirement: true` missing explanatory note
20. **ERROR_RA_021**: Requirements with `is_future_requirement: true` but appear to be immediate needs

### Task 1.3: Integration Analysis

**Read `agentspace/{module}.integration.json`**

#### Feature Framework Requirements
1. **ERROR_IA_001**: Any integration missing `"features"` array field
2. **ERROR_IA_002**: Any integration missing `"features_explanation"` object field
3. **ERROR_IA_003**: Any integration has empty `"features"` array
4. **ERROR_IA_004**: Any feature in `features` NOT explained in `features_explanation`
5. **ERROR_IA_005**: Feature name not one of: business-task-execution, engineering-api, side-effect-execution, infrastructure-middleware

#### business-task-execution Feature
6. **ERROR_IA_006**: Has `business-task-execution` but `entities_to_create` missing APICall entity
7. **ERROR_IA_007**: Has `business-task-execution` but `entities_to_create` missing Event entity
8. **ERROR_IA_008**: Has `business-task-execution` but `relations_to_create` missing Relation
9. **ERROR_IA_009**: Has `business-task-execution` but explanation doesn't justify tracking need
10. **ERROR_IA_010**: High-volume operation (>1000/day) using `business-task-execution` (check flow_description for volume hints)

#### engineering-api Feature
11. **ERROR_IA_011**: Has `engineering-api` AND has entities in `entities_to_create`
12. **ERROR_IA_012**: Has `engineering-api` but `custom_apis` is empty
13. **ERROR_IA_013**: Has `engineering-api` but explanation doesn't mention framework limitation

#### side-effect-execution Feature
14. **ERROR_IA_014**: Has `side-effect-execution` AND has entities in `entities_to_create`
15. **ERROR_IA_015**: Low-volume important operation (<100/day, status matters) using `side-effect-execution`
16. **ERROR_IA_016**: IM/messaging integration using `side-effect-execution` but creates Event entities

#### infrastructure-middleware Feature
17. **ERROR_IA_017**: Has `infrastructure-middleware` AND has business entities in `entities_to_create`
18. **ERROR_IA_018**: Has `infrastructure-middleware` but missing middleware description

#### Authentication Integration
19. **ERROR_IA_019**: Module is "basic" AND has User entity AND missing auth integration
20. **ERROR_IA_020**: Auth integration missing `engineering-api` feature
21. **ERROR_IA_021**: Auth integration has APICall/Event in `entities_to_create`
22. **ERROR_IA_022**: Auth integration missing required APIs (register, login, logout, me) in `custom_apis`
23. **ERROR_IA_023**: Auth integration `flow_description` doesn't mention bcrypt/hashing and session/token
24. **ERROR_IA_024**: Auth integration name is NOT "auth" (must be consistently named "auth")

#### Inter-Module Access and WebSocket
25. **ERROR_IA_025**: Integration describes accessing entities from other modules in same project
26. **ERROR_IA_026**: Integration name contains "module" or describes inter-module access
27. **ERROR_IA_027**: Separate integration with name="websocket" or purpose mentioning WebSocket connectivity
28. **ERROR_IA_028**: Real-time push/notification NOT described within primary integration's `flow_description`

### Task 1.4: Data Concepts

**Read both `agentspace/{module}.integration.json` and `agentspace/{module}.data-concepts.json`**

#### Entity-Relation Design Principles
1. **ERROR_DC_001**: Any entity has internal foreign key property (pattern: `userId`, `postId` - NOT external system IDs like `stripePaymentId`, `volcJobId`)
2. **ERROR_DC_002**: Entity note mentions "foreign key" or "ID reference"
3. **ERROR_DC_003**: Relation defined but entities still have ID properties referencing each other
59. **ERROR_DC_059**: Cross-module relation sourceEntity/targetEntity missing `@moduleName` (e.g., `"targetEntity": "Post"` should be `"targetEntity": "Post@basic"` when current module != basic)

#### Entity Type Requirements
54. **ERROR_DC_054**: Any business entity missing `"entityType"` field (all entities must declare entityType)
55. **ERROR_DC_055**: Entity has `entityType` value not in allowed list: "business", "api-call", "api-event", "user-profile", "polymorphic"

#### Module Boundary Violations
4. **ERROR_DC_004**: Module is NOT "basic" AND entities array contains User entity
5. **ERROR_DC_005**: Entity note mentions "extends User" or "adds properties to User"
6. **ERROR_DC_006**: 1:1 user profile entity missing `"entityType": "user-profile"` field
7. **ERROR_DC_007**: 1:1 user profile entity lifecycle note doesn't say "created with User, NOT by interactions"

#### Integration Entity Mapping - business-task-execution
For each integration with `business-task-execution` feature:
8. **ERROR_DC_008**: APICall entity NOT found in data-concepts.json
9. **ERROR_DC_009**: Event entity NOT found in data-concepts.json
10. **ERROR_DC_010**: APICall entity missing `"entityType": "api-call"` field
11. **ERROR_DC_011**: Event entity missing `"entityType": "api-event"` field
12. **ERROR_DC_012**: APICall entity NOT connected to business entity via Relation
13. **ERROR_DC_013**: APICall relation type is NOT "1:n" (check relations array)
14. **ERROR_DC_014**: APICall entity name doesn't match `{Integration}{APIName}Call` pattern
15. **ERROR_DC_015**: Event entity name doesn't match `{Integration}{APIName}Event` pattern

#### APICall Entity Required Fields
For each APICall entity (entityType: "api-call"):
16. **ERROR_DC_016**: Missing `requestParams` property OR has `"computed": true`
17. **ERROR_DC_017**: Missing `status` property
18. **ERROR_DC_018**: Missing `externalId` property (optional, for debugging)
19. **ERROR_DC_019**: Missing `responseData` property
20. **ERROR_DC_020**: Missing `createdAt` property OR has `"computed": true`
21. **ERROR_DC_021**: Missing `completedAt` property
22. **ERROR_DC_022**: Missing `error` property
22a. **ERROR_DC_022a**: Missing `startedAt` property (nullable, computed via statemachine)
22b. **ERROR_DC_022b**: Missing `attempts` property (computed via statemachine, defaultValue: 0)
23. **ERROR_DC_023**: `status` property NOT using `"method": "statemachine"`
24. **ERROR_DC_024**: `externalId` property NOT using `"method": "statemachine"`
25. **ERROR_DC_025**: `responseData` property NOT using `"method": "statemachine"`
25a. **ERROR_DC_025a**: `startedAt` property NOT using `"method": "statemachine"`
25b. **ERROR_DC_025b**: `attempts` property NOT using `"method": "statemachine"`
26. **ERROR_DC_026**: `status` property NOT marked as `"computed": true`
27. **ERROR_DC_027**: Computed property dependencies NOT including Event entity

#### Event Entity Required Fields
For each Event entity (entityType: "api-event"):
28. **ERROR_DC_028**: Missing `eventType` property
29. **ERROR_DC_029**: Missing `entityId` property
30. **ERROR_DC_030**: Missing `entityId` property (required for all events). Note: externalId is optional.
31. **ERROR_DC_031**: Missing `status` property
32. **ERROR_DC_032**: Missing `createdAt` property
33. **ERROR_DC_033**: Missing `data` property
34. **ERROR_DC_034**: `entityId` property must be required (all events have entityId since Temporal workflow provides API Call ID)

#### Business Entity Integration Results
For integrations with APICall entities:
35. **ERROR_DC_035**: Business entity property computed from Event entity instead of APICall
36. **ERROR_DC_036**: Business entity computed property NOT using `"method": "integration-result"`
37. **ERROR_DC_037**: Computed property description doesn't mention "LATEST successful"
38. **ERROR_DC_038**: Computed property dependencies missing APICall.status

#### Event-Triggered Entity Auto-Creation
Cross-reference requirements (look for "auto-add", "加入到", "automatically create", "生成...加入") with data-concepts entities:
60. **ERROR_DC_060**: Requirement describes auto-creation pattern but target entity has NO `lifecycle` field
61. **ERROR_DC_061**: Entity should auto-create from Event completion but missing `lifecycle.autoCreation`
62. **ERROR_DC_065**: Relation for auto-created entity missing matching `lifecycle` description

#### Integration Entity Mapping - Other Features
39. **ERROR_DC_039**: Integration has `engineering-api` AND has APICall/Event entities
40. **ERROR_DC_040**: Integration has `side-effect-execution` AND has APICall/Event entities
41. **ERROR_DC_041**: Integration has `infrastructure-middleware` AND has business entities
42. **ERROR_DC_042**: Auth integration (name="auth") has APICall/Event entities

#### Hard Deletion Property
Check `agentspace/{module}.requirements-analysis.json` for `"deletion_type": "hard"`:
43. **ERROR_DC_043**: Hard deletion requirement exists but entity missing `_hardDeletion` property
44. **ERROR_DC_044**: `_hardDeletion` property missing `deletion_rules` array
45. **ERROR_DC_045**: `_hardDeletion` property missing `source_requirement` field

#### Polymorphic Entities
Check `agentspace/{module}.requirements-analysis.json` for `is_future_requirement: true`:
46. **ERROR_DC_046**: Future requirements exist but NO entity with `entityType: "polymorphic"`
47. **ERROR_DC_047**: Entity appears to be polymorphic entity but missing `"entityType": "polymorphic"`
48. **ERROR_DC_048**: Polymorphic entity missing `commonProperties` array defining required properties
49. **ERROR_DC_049**: Polymorphic entity missing `polymorphic_note` explaining how future modules extend it
50. **ERROR_DC_050**: Polymorphic entity missing `related_future_requirements` linking to future requirement IDs
51. **ERROR_DC_051**: Concrete entity should extend polymorphic entity but missing `extends` field
52. **ERROR_DC_052**: Entity has `extends` field with invalid format (must be "EntityName@moduleName" or "EntityName@_self")
53. **ERROR_DC_053**: Concrete entity missing some commonProperties from parent polymorphic entity
56. **ERROR_DC_056**: Polymorphic entity named too specifically (should be polymorphic category name like "ConsumptionRecord", not "GiftConsumption")


#### Auth Integration User Entity Properties
If module is "basic" and has auth integration in integration.json:
58. **ERROR_DC_058**: Non-basic module has User entity with auth-related properties (passwordHash, etc.)

### Task 1.5: Interaction Design

**Read `agentspace/{module}.interactions-design.json` and cross-reference with other Task 1 outputs**

#### PRE-CHECK: Authentication Filtering
Check `agentspace/{module}.requirements-analysis.json` for User entity create/update with role="User":
1. **ERROR_ID_001**: User self-service requirement (entity=User, type=create/update, role=User) found in interactions
2. **ERROR_ID_002**: Interaction with ID like "RegisterUser", "LoginUser", "ResetPassword"
3. **ERROR_ID_003**: Authentication requirement NOT mentioned in coverage_analysis.notes

#### External System Boundary Violations
4. **ERROR_ID_004**: Interaction designed for external API call (check action/description)
5. **ERROR_ID_005**: Interaction designed for receiving webhooks/callbacks
6. **ERROR_ID_006**: Interaction has `"role": "System"`
7. **ERROR_ID_007**: Interaction for system-to-system communication (check description)

#### Integration Entity Creation Errors
Cross-reference with `agentspace/{module}.data-concepts.json`:
8. **ERROR_ID_008**: Event entities (entityType: "api-event") in interaction `creates` arrays
9. **ERROR_ID_009**: User profile entities (entityType: "user-profile") in interaction `creates` arrays
10. **ERROR_ID_010**: APICall entity exists but NO retry interaction creates new APICall

#### Integration Retry Interactions
For each integration with `business-task-execution` feature in `agentspace/{module}.integration.json`:
11. **ERROR_ID_011**: Missing retry/regenerate interaction
12. **ERROR_ID_012**: Missing view status interaction
13. **ERROR_ID_013**: Retry interaction type="update" instead of type="create"
14. **ERROR_ID_014**: Retry interaction deletes failed APICall (should keep for audit trail)

#### Data Access Constraints Issues
For read-type interactions (type="read"):
15. **ERROR_ID_015**: Business rules (who can execute) in `dataConstraints` instead of `conditions`
16. **ERROR_ID_016**: Data scope constraints (what data accessible) in `conditions` instead of `dataConstraints`
17. **ERROR_ID_017**: Constraint about "Only X role can" in dataConstraints (should be in conditions)

#### Interaction Specification Issues
18. **ERROR_ID_018**: Interaction `id` is code (e.g., "I001", "INT-001") instead of semantic name
19. **ERROR_ID_019**: Read interaction (type="read") has `creates`/`updates`/`deletes` fields
20. **ERROR_ID_020**: Write interaction (type=create/update/delete) has `reads` field at specification.data level
21. **ERROR_ID_021**: Entity/relation referenced in interaction NOT found in data-concepts.json
22. **ERROR_ID_022**: Requirement from requirements-analysis.json NOT in interaction_matrix.by_requirement

#### Future Requirements and Computed Properties
Check requirements-analysis.json for `is_future_requirement: true`:
23. **ERROR_ID_023**: Future requirement found in interactions array (should be filtered out)
24. **ERROR_ID_024**: Future requirement NOT mentioned in coverage_analysis.notes explaining why skipped
Cross-reference with data-concepts.json for computed properties:
25. **ERROR_ID_025**: Update operation target is property with `"computed": true` (cannot update computed properties)
26. **ERROR_ID_026**: Update operation target is property with `"method": "aggregation"` (update dependencies instead)
27. **ERROR_ID_027**: Update operation target is property with `"method": "integration-result"` (retry API call instead)
28. **ERROR_ID_028**: Update operation target is property with `"method": "statemachine"` (driven by events)

#### User Profile Entity Handling
Check data-concepts.json for entities with `entityType: "user-profile"`:
29. **ERROR_ID_029**: Profile entity in interaction `creates` array (profile created with User, not by interactions)
30. **ERROR_ID_030**: Interaction description mentions "create profile" (should update profile properties, not create entity)


## STEP 3: Update Report and Exit

### 🔴 CRITICAL: How to Mark Checkboxes Correctly

**⚠️ WARNING: These checkboxes are NOT a "task completion checklist"!**

**The checkbox indicates whether this error EXISTS in the code:**
- `[x]` = This error **WAS FOUND** in the code ❌ (needs fixing!)
- `[ ]` = This error **WAS NOT FOUND** in the code ✅ (good!)

**DO NOT mark `[x]` just because you completed the check!**
- If you checked and found NO error → mark `[ ]`
- If you checked and found an error → mark `[x]`

**Example - Perfect Analysis (Zero Errors):**
```markdown
### Task 1.2: Requirements Analysis Errors
- [ ] ERROR_RA_001: External system events incorrectly created as requirements
- [ ] ERROR_RA_002: Requirements with role="System"
- [ ] ERROR_RA_003: Webhook callbacks from external services created as requirements

**Check Results**: ✅ **ALL CHECKS PASSED - NO ERRORS FOUND**
```

**Example - Analysis with 2 Errors Found:**
```markdown
### Task 1.2: Requirements Analysis Errors
- [x] ERROR_RA_001: External system events incorrectly created as requirements  ← FOUND!
- [ ] ERROR_RA_002: Requirements with role="System"
- [x] ERROR_RA_006: External state synchronization not documented  ← FOUND!

**Check Results**: ❌ **2 ERRORS FOUND** (see details below)
```

### Steps to Complete the Report

1. **Execute all checks** from STEP 2
2. **Mark checkboxes correctly**:
   - Put `[x]` ONLY for errors that were actually found
   - Keep `[ ]` for checks that passed
3. **Fill "Check Results" sections**:
   - If NO errors: `✅ **ALL CHECKS PASSED - NO ERRORS FOUND**`
   - If errors found: `❌ **N ERRORS FOUND** (see details below)`
4. **Document each error found** with:
   - Error code (e.g., ERROR_RA_001)
   - File path and line number
   - Current incorrect value
   - Expected correct value
   - Suggested fix
5. **Count errors** by priority and update Summary section
6. **Save the report** to `agentspace/{module}.task-1-error-check-report.md`
7. **Present summary to user** - don't commit, just report

## Priority Levels

**CRITICAL** (🔴):
- **Task 1.2**: ERROR_RA_001, ERROR_RA_002, ERROR_RA_011, ERROR_RA_012 (External system events, role="System", authentication as requirements)
- **Task 1.3**: ERROR_IA_001, ERROR_IA_002, ERROR_IA_003 (Missing/empty features array)
- **Task 1.3**: ERROR_IA_006, ERROR_IA_007, ERROR_IA_011, ERROR_IA_014, ERROR_IA_027 (Feature-entity mapping violations, WebSocket integration)
- **Task 1.4**: ERROR_DC_001, ERROR_DC_004, ERROR_DC_005, ERROR_DC_059 (Internal foreign keys, User entity boundary violations, cross-module syntax)
- **Task 1.4**: ERROR_DC_006, ERROR_DC_008, ERROR_DC_009, ERROR_DC_010, ERROR_DC_011 (Integration entity mapping)
- **Task 1.4**: ERROR_DC_012, ERROR_DC_013 (APICall relation must be 1:n)
- **Task 1.4**: ERROR_DC_016-034 (APICall/Event entity required fields)
- **Task 1.4**: ERROR_DC_039, ERROR_DC_040, ERROR_DC_042 (Wrong features with entities)
- **Task 1.4**: ERROR_DC_060, ERROR_DC_061 (Event-triggered auto-creation missing lifecycle)
- **Task 1.5**: ERROR_ID_001, ERROR_ID_002, ERROR_ID_004, ERROR_ID_005, ERROR_ID_006 (Authentication, external system, role violations)
- **Task 1.5**: ERROR_ID_008, ERROR_ID_009, ERROR_ID_025 (Event/profile entities in creates, updating computed properties)

**HIGH PRIORITY** (🟠):
- **Task 1.2**: ERROR_RA_014, ERROR_RA_015, ERROR_RA_016, ERROR_RA_017, ERROR_RA_019 (Over-derivation, computed property updates, AI content operations, future requirements not marked)
- **Task 1.3**: ERROR_IA_009, ERROR_IA_010, ERROR_IA_015 (Volume/tracking mismatches)
- **Task 1.3**: ERROR_IA_019, ERROR_IA_020, ERROR_IA_022, ERROR_IA_024 (Auth integration missing/incomplete/incorrectly named)
- **Task 1.4**: ERROR_DC_035, ERROR_DC_036, ERROR_DC_037, ERROR_DC_038 (Business entity integration result errors)
- **Task 1.4**: ERROR_DC_046, ERROR_DC_047, ERROR_DC_048, ERROR_DC_049 (Polymorphic entity missing or incomplete)
- **Task 1.4**: ERROR_DC_054, ERROR_DC_055 (Entity type field missing or invalid)
- **Task 1.4**: ERROR_DC_065 (Event-triggered auto-creation missing relation lifecycle)
- **Task 1.5**: ERROR_ID_010, ERROR_ID_011, ERROR_ID_012, ERROR_ID_013 (Missing retry interactions)
- **Task 1.5**: ERROR_ID_015, ERROR_ID_016, ERROR_ID_017 (Data access constraints in wrong places)
- **Task 1.5**: ERROR_ID_023, ERROR_ID_026, ERROR_ID_027, ERROR_ID_028 (Future requirements, computed property updates)

**MEDIUM PRIORITY** (🟡):
- **Task 1.2**: ERROR_RA_003-010, ERROR_RA_013, ERROR_RA_018, ERROR_RA_020, ERROR_RA_021 (Reactive framework language, documentation, future requirements notes)
- **Task 1.3**: ERROR_IA_004, ERROR_IA_005, ERROR_IA_013, ERROR_IA_018, ERROR_IA_023, ERROR_IA_025, ERROR_IA_026, ERROR_IA_028 (Documentation quality)
- **Task 1.4**: ERROR_DC_002, ERROR_DC_003, ERROR_DC_007, ERROR_DC_014, ERROR_DC_015, ERROR_DC_043-045 (Design quality, hard deletion)
- **Task 1.4**: ERROR_DC_050, ERROR_DC_051, ERROR_DC_052, ERROR_DC_053, ERROR_DC_056, ERROR_DC_058 (Polymorphic entity details, extends field format, auth properties)
- **Task 1.5**: ERROR_ID_003, ERROR_ID_007, ERROR_ID_014, ERROR_ID_018-022 (Specification quality, coverage)
- **Task 1.5**: ERROR_ID_024, ERROR_ID_029, ERROR_ID_030 (Documentation notes, profile entity handling)

## Exit Instructions

**🛑 CRITICAL: This agent does NOT fix errors - it only finds and reports them.**

After completing all checks:
1. Present summary to user
2. Do NOT commit changes
3. Wait for user instructions
