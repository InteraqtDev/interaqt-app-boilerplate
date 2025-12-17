---
name: integration-generation-handler
description: when task 4.0.6
model: inherit
color: cyan
---

**⚠️ IMPORTANT: Strictly follow the steps below to execute the task. Do not compress content or skip any steps.**

## START: Select Next Uncompleted Integration

**📖 FIRST: Determine current module and confirm context.**

**🔴 STEP 0: Determine Current Module**
1. Read module name from `.currentmodule` file in project root
2. If file doesn't exist, STOP and ask user which module to work on
3. Use this module name for all subsequent file operations
4. Module status file location: `agentspace/{module}.status.json`

**🔴 CRITICAL: Working Directory Constraints**
- All file operations MUST be performed within the current project directory
- NEVER access parent directories using `../` or absolute paths outside the workspace

**📖 Reference Files**
- `integrations/example_auth/` - Type 2 (Functional) integration example
- `integrations/example_objectstorage/` - Type 3 (Client-Direct) integration example
- `integrations/example_sync/` - **Type 1 (Sync API → Async) with Pull Mode** - External API is sync but long-running, uses workflow + Pull Mode
- `integrations/example_async/` - **Type 1 (Async API with Polling) with Pull Mode** - External API is async (submit + query), uses workflow + Pull Mode
- `integrations/docs/` - Pre-configured external API documentation

**🔴 Type 1 Pull Mode Architecture:**
All Type 1 integrations use Pull Mode where:
1. `createSideEffects()` returns empty array `[]`
2. `getPullModeConfig()` provides configuration for TaskProcessor
3. TaskProcessor polls `fetchPendingTasks` API to get pending/failed/stuck tasks
4. TaskProcessor reports 'queued' status via `reportTaskEvent` API before starting workflow
5. Workflow reports 'processing' and terminal status via callback API

**🔴 CRITICAL: Module-Based File Naming**
- Read module name from `.currentmodule` and use it as file prefix
- All file references must use `{module}.` prefix format

**🔴 CRITICAL: Implement ONLY ONE integration per session, then STOP and wait for user confirmation.**

**🔴 CRITICAL: Complete Implementation Rules**
- Each integration must be 100% complete with design doc, implementation, and tests
- Cannot defer, skip, or mark any part as "will implement later" or "TODO"

**❌ ABSOLUTELY FORBIDDEN:**
- "Will add tests later"
- "Design doc not needed for this type"
- "Skipping external API test because..."
- "TODO: implement webhook"
- "Simplified version for now"

1. **Read `agentspace/{module}.integration-implementation-plan.json`** to find the FIRST item with `completed: false`
   - ALWAYS select the FIRST item where `completed` field is `false`
   - NEVER skip ahead - implement in order

2. **Check if item has `lastError` field:**
   - If YES → Execute DEEP DEBUG MODE below
   - If NO → Execute NORMAL IMPLEMENTATION FLOW below

## DEEP DEBUG MODE (when lastError exists):

1. **Review Previous Error**: Read the error document at the path in `lastError` to understand what failed and what was already attempted

2. **Analyze Root Cause**:
   - Verify implementation code correctness
   - Check external API configuration in `app.config.json`
   - Confirm test expectations match integration behavior
   - Review similar example integrations for patterns

3. **Apply Fix Based on Analysis**:
   - **Implementation Issue** → Fix integration code in `integrations/{name}/index.ts`
   - **External API Issue** → Fix API wrapper in `integrations/{name}/externalApi.ts`
   - **Test Issue** → Fix test case logic or expectations
   - **Config Issue** → Update `app.config.json` or entry file in `integrations/entries/`

4. **Test the Fix**:
   - Run `npm run check` for type verification
   - Run the specific test
   - If successful: Remove `lastError` field, mark `"completed": true`, return to START
   - If still failing: Update error document with new attempts
   - After 3 additional attempts, STOP and wait for user guidance

## NORMAL IMPLEMENTATION FLOW (when no lastError):

**🔴 CRITICAL: Follow ALL steps in order. Each integration MUST complete ALL applicable steps.**

### Step 1: Read Integration Details

1. **Read the current integration from `agentspace/{module}.integration-implementation-plan.json`**
2. **Identify integration type**: Type1, Type2, or Type3
3. **Read related requirements from `agentspace/{module}.integration.json`**
4. **Read data design from `agentspace/{module}.data-design.json`** (for Type1 - find APICall/Event entities)

**🔴 CRITICAL: The integration's `name` field from the plan (e.g., `auth`, `objectStorage`) is used for ALL `{integration-name}` placeholders in subsequent steps.**

### Step 2: External System Research (Task 4.1)

1. **Check `integrations/docs/` for pre-configured documentation**
   - List directory contents
   - Read relevant API docs if found

2. **If not found locally, use web_search for official documentation**
   - Search: "{Service Name} API documentation"
   - Document API endpoints, auth methods, error codes

3. **Validate Configuration in `app.config.json`**
   - Check `externalServices.{integration-name}.config` exists
   - Verify all required credentials are present
   - **🛑 If any required config is MISSING: STOP and ask user to add it**

### Step 3: Create Design Document (Task 4.2)

**🔴 CRITICAL: Design Document is MANDATORY for ALL integration types**

**🔴 CRITICAL: For Type 1, MUST extract EXACT requestParams from data-design.json**

Before creating design document:
1. Read `agentspace/{module}.data-design.json`
2. Find the APICall entity (e.g., `FangzhouCall`, `Nanobanana2Call`)
3. Copy the EXACT `requestParams.attributes` structure - DO NOT modify field names
4. Use these exact field names in both design doc AND implementation code

Create `agentspace/{module}.{integration-name}.integration-design.json` using the appropriate template:

**For Type 1 (External System Integration):**
```json
{
  "integrationName": "{Integration Name}",
  "integrationType": "Type 1: External System Integration",
  "overview": "{Brief description}",
  "externalSystem": {
    "name": "{System Name}",
    "documentation": "{URL}",
    "authentication": "{Method}"
  },
  "configuration": {
    "location": "externalServices.{integration-name}.config",
    "fields": [
      { "field": "{field1}", "purpose": "{purpose1}", "example": "{example1}" },
      { "field": "{field2}", "purpose": "{purpose2}", "example": "{example2}" }
    ]
  },
  "externalAPIs": [
    {
      "name": "{API Name}",
      "endpoint": "{URL}",
      "method": "{HTTP Method}",
      "request": "{Parameters description}",
      "response": "{Format description}"
    }
  ],
  "integrationFlow": {
    "businessPhase": {
      "description": "APICall entity created by business computation",
      "requestParamsStructure": "COPY EXACT attributes from data-design.json APICall.requestParams"
    },
    "integrationPhase": {
      "common": [
        "Listen to APICall entity creation",
        "Create first event (status='queued', entityId=APICall.id) when workflow worker picks up",
        "ALL events have entityId since Temporal workflow provides the API Call ID"
      ],
      "syncApiType": [
        "For sync API (long-running but synchronous return):",
        "Create event (status='processing', entityId=APICall.id, externalId=apiCallId) BEFORE calling external API",
        "Call external API synchronously",
        "On completion: Create terminal event (status='completed'|'failed', entityId=APICall.id)"
      ],
      "asyncApiType": [
        "For async API (submit task + query result separately):",
        "Call external API to submit task",
        "Create event (status='processing', entityId=APICall.id, externalId=taskId) AFTER external API returns taskId",
        "Poll for result or wait for callback",
        "On completion: Create terminal event (status='completed'|'failed', entityId=APICall.id)"
      ],
      "errorHandling": [
        "If external API call fails before processing: Create event (status='failed', entityId=APICall.id) directly from 'queued' state",
        "For retries: Create event (status='queued', entityId=APICall.id) from 'completed'|'failed' state"
      ]
    }
  },
  "eventSequence": "queued → processing → completed|failed, with queued → failed for external API call failures, and completed|failed → queued for retries. ALL events have entityId (APICall.id) since Temporal workflow context is available. The 'processing' event includes externalId for debugging: sync APIs use apiCallId, async APIs use external taskId.",
  "errorHandling": {
    "strategies": [
      { "errorType": "{type1}", "strategy": "{strategy1}" },
      { "errorType": "{type2}", "strategy": "{strategy2}" }
    ]
  }
}
```

**For Type 2 (Functional Integration):**
```json
{
  "integrationName": "{Integration Name}",
  "integrationType": "Type 2: Functional Integration",
  "overview": "{Brief description of infrastructure functionality}",
  "apis": [
    {
      "name": "{API Name}",
      "purpose": "{Description}",
      "authRequired": true,
      "request": "{Parameters}",
      "response": "{Format}"
    }
  ],
  "middleware": {
    "enabled": true,
    "description": "{Description of middleware functionality}"
  },
  "dataOperations": {
    "entities": ["{Entity1}", "{Entity2}"],
    "operations": "{Operations performed}"
  },
  "security": {
    "approach": "{Authentication/authorization approach}"
  }
}
```

**For Type 3 (Client-Direct):**
```json
{
  "integrationName": "{Integration Name}",
  "integrationType": "Type 3: Client-Direct Integration",
  "overview": "{Brief description - server provides credentials, client calls external service directly}",
  "externalService": {
    "name": "{Service Name}",
    "clientSDK": "{Package name}",
    "authMethod": "{Pre-signed URL / Temp credentials / Access token}"
  },
  "authorizationAPI": {
    "name": "{API Name}",
    "purpose": "Generate credentials for client",
    "request": "{Parameters}",
    "response": "{Credential format}"
  },
  "clientFlow": [
    "Frontend requests credentials from server",
    "Server generates pre-signed URL / temp credentials",
    "Frontend uses client SDK to call external service directly"
  ]
}
```

### Step 4: Create Integration Directory (Task 4.2.3)

**🔴 CRITICAL: Use EXACT `name` from `agentspace/{module}.integration-implementation-plan.json`**

The `{integration-name}` placeholder MUST be replaced with the exact `name` field value from the plan (e.g., `auth`, `objectStorage`, `nanobanana2ImageGeneration`).

```bash
mkdir -p integrations/{integration-name}
```

Create `integrations/{integration-name}/package.json`:

**🔴 CRITICAL: `type` and `exports` fields are REQUIRED for ESM module resolution**

```json
{
  "name": "@integrations/{integration-name}",
  "version": "1.0.0",
  "description": "{Integration Name} integration for interaqt framework",
  "type": "module",
  "main": "index.ts",
  "exports": {
    ".": "./index.ts"
  },
  "dependencies": {
    "interaqt": "*"
  }
}
```

**Why these fields are required:**
- `"type": "module"` - Declares this package uses ES modules
- `"exports": { ".": "./index.ts" }` - Tells Node.js how to resolve the package entry point

**⚠️ Without these fields, the integration will fail at runtime with:**
```
SyntaxError: The requested module does not provide an export named 'create...Integration'
```

### Step 4.5: Create Zod Schemas File (Task 4.2.4)

**🔴 CRITICAL: ALL integrations that expose APIs MUST define Zod schemas for OpenAPI generation**

Create `integrations/{integration-name}/schemas.ts`:

```typescript
/**
 * {Integration Name} Integration Zod Schemas
 * 
 * Defines request/response schemas for API endpoints
 * Used for:
 * - Runtime parameter validation
 * - TypeScript type inference
 * - OpenAPI specification generation
 */

import { z } from 'zod'

// ============================================
// {API Name} Schemas
// ============================================

export const {ApiName}RequestSchema = z.object({
  // Define request parameters with validation
  paramName: z.string().min(1, 'paramName is required'),
  optionalParam: z.string().optional()
})

export const {ApiName}ResponseSchema = z.object({
  // Define response structure
  success: z.boolean(),
  data: z.object({
    // Response data fields
  })
})

// ============================================
// Type Exports
// ============================================

export type {ApiName}Request = z.infer<typeof {ApiName}RequestSchema>
export type {ApiName}Response = z.infer<typeof {ApiName}ResponseSchema>
```

**Key Rules:**
1. **One schema file per integration** - All API schemas go in `schemas.ts`
2. **Request and Response pairs** - Each API should have both `{ApiName}RequestSchema` and `{ApiName}ResponseSchema`
3. **Type exports** - Export TypeScript types using `z.infer<typeof Schema>`
4. **Validation messages** - Add clear validation error messages for required fields
5. **Reference examples** - Check `integrations/example_auth/schemas.ts` or `integrations/example_objectstorage/schemas.ts`

### Step 5: External API Testing (Task 4.3) - TYPE 1 ONLY

**🔴 CRITICAL: This step is MANDATORY for Type 1 integrations, including those using Temporal workflows**

1. **Add SDK to `integrations/{integration-name}/package.json`**

2. **Run `npm install` from project root**

3. **Create test file `tests/{module}.{integration-name}.external.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import appConfig from '@/app.config.json'

/**
 * External API Integration Tests
 * 
 * Purpose: Verify external system APIs work with real credentials
 * IMPORTANT: These tests use REAL API calls
 */

describe('{Integration} External API Tests', () => {
  const config = appConfig.externalServices['{integration-name}'].config
  
  it('should have required configuration', () => {
    expect(config.apiKey).toBeDefined()
    expect(config.apiKey).not.toBe('')
  })

  describe('API Endpoint Tests', () => {
    it('should call API successfully', async () => {
      // Make real API call
      // Verify response format
    })

    it('should handle errors gracefully', async () => {
      // Test error handling
    })
  })
})
```

4. **Run tests: `npm test tests/{module}.{integration-name}.external.test.ts`**

**🛑 ALL tests MUST pass before proceeding. If any test fails, fix and retry.**

**🔴 CRITICAL: Tests Must ACTUALLY Succeed - No False Positives**

❌ **FORBIDDEN**: Catching API errors and treating them as "expected behavior" to make tests pass:
```typescript
// ❌ WRONG - This hides code bugs!
catch (error) {
  if (error.message.includes('some error')) {
    console.log('This is a configuration issue')
    expect(error.message).toContain('some error')  // Test passes but API failed!
  }
}
```

✅ **REQUIRED**: API must return success response. If API returns error:
1. Compare your code against API documentation (headers, auth, request body format)
2. Fix code if implementation doesn't match docs
3. If truly a config issue (missing credentials), STOP and ask user for correct config

**🛑 If API consistently fails after 3 fix attempts, STOP and wait for user guidance. Do NOT make tests pass by catching errors.**

### Step 6: Implement Integration (Task 4.4)

**Read the example files for your integration type before implementing:**

**Type 1**: Reference `integrations/nanobanana2ImageGeneration/` or `integrations/fangzhouVideoGeneration/`
**Type 2**: Reference `integrations/example_auth/`
**Type 3**: Reference `integrations/example_objectstorage/`

---

#### 🔴 CRITICAL: Type 1 Pull Mode Architecture

**All Type 1 integrations MUST follow Pull Mode architecture:**

Integration layer provides `getPullModeConfig()` for TaskProcessor. TaskProcessor polls for tasks and starts workflows. ALL external API calls are in activities.

**Type 1a - Sync API → Async (e.g., nanobanana2ImageGeneration):**
- External API is synchronous but long-running
- Flow: TaskProcessor polls `fetchPendingTasks` → reports 'queued' → starts workflow → Workflow: report 'processing' (entityId, externalId=apiCallId) → call API activity → report result (entityId)
- **IMPORTANT: 'queued' event is created by TaskProcessor BEFORE starting workflow**
- **IMPORTANT: 'processing' event is emitted by workflow BEFORE calling external API, with entityId for matching and externalId=apiCallId for debugging**
- **If external API call fails: workflow transitions directly to 'failed' (skip 'processing')**
- **ALL workflow events have entityId since Temporal workflow context provides the API Call ID**

**Type 1b - Async API with Polling (e.g., fangzhouVideoGeneration):**
- External API is async (submit task + query result are separate APIs)
- Flow: TaskProcessor polls `fetchPendingTasks` → reports 'queued' → starts workflow → Workflow: create task activity → report 'processing' (entityId, externalId=taskId) → poll status activity (loop) → report result (entityId)
- **IMPORTANT: 'queued' event is created by TaskProcessor BEFORE starting workflow**
- **IMPORTANT: 'processing' event is emitted by workflow AFTER external API returns taskId, with entityId for matching and externalId=taskId for debugging**
- **If external API call fails during task submission: workflow transitions directly to 'failed' (skip 'processing')**
- **ALL workflow events have entityId since Temporal workflow context provides the API Call ID**
- Supports signals: `stopPolling` (manual query found result) and `triggerImmediatePoll` (trigger immediate check)

**Key Components:**
1. `index.ts`: Provides `getPullModeConfig()`, `fetchPendingTasks`, `queryStatus`, and `reportResult` APIs; `createSideEffects()` returns `[]`
2. `workflows/index.ts`: Orchestrates the lifecycle (processing → execute → result). NOTE: 'queued' is already reported by TaskProcessor
3. `activities/index.ts`: Contains ALL external API calls and `reportToMain` callback

**reportResult API Requirements:**
- Must be `allowAnonymous: true` (called from Temporal worker and TaskProcessor)
- For 'queued' status: Must double-check current status allows transition (prevents duplicate queued events from concurrent TaskProcessors)
- For terminal status: Must check if APICall already in terminal state before creating event

---

#### 🔴 CRITICAL: Temporal Task Queue Naming Convention (Type 1 with Workflows)

**For integrations using Temporal workflows, you MUST follow the Task Queue naming convention:**

**Background:**
- `startAsyncTask.ts` uses `workflow-collector.ts` to auto-discover integrations with workflows
- The collector generates Task Queue names automatically based on the integration directory name
- If your Task Queue name doesn't match, the Worker will NEVER receive your tasks!

**Naming Rule:**
```
Task Queue = integration-{normalized-integration-name}-queue
```

**Normalization rules:**
1. Convert to lowercase
2. Replace non-alphanumeric characters (except `-`) with `-`
3. Collapse multiple `-` into single `-`
4. Remove leading/trailing `-`

**Examples:**

| Integration Directory | Task Queue Name |
|----------------------|-----------------|
| `nanobanana2-image` | `integration-nanobanana2-image-queue` |
| `sora2-video` | `integration-sora2-video-queue` |
| `volc_tts` | `integration-volc-tts-queue` |
| `MyIntegration` | `integration-myintegration-queue` |

**Implementation Pattern:**
```typescript
// ✅ CORRECT: Use the standardized naming
const TASK_QUEUE = 'integration-{your-integration-name}-queue'

// ❌ WRONG: Custom naming that doesn't match the collector
const TASK_QUEUE = 'my-custom-queue'
const TASK_QUEUE = '{integration-name}-tasks'
```

**Multiple Workflows in One Integration:**
- All workflows exported from `workflows/index.ts` share the SAME Task Queue
- The Worker loads all workflows and activities from the integration directory
- You can define multiple workflow functions, they all use one queue:

```typescript
// integrations/{name}/workflows/index.ts
export async function workflowA(params: ParamsA): Promise<ResultA> { ... }
export async function workflowB(params: ParamsB): Promise<ResultB> { ... }
export async function workflowC(params: ParamsC): Promise<ResultC> { ... }
// All three workflows use: integration-{name}-queue
```

**Directory Structure for Temporal Integrations:**
```
integrations/{integration-name}/
├── index.ts              # Integration entry (submits workflows)
├── package.json
├── schemas.ts            # Zod schemas for API validation & OpenAPI
├── externalApi.ts        # External API wrapper
├── workflows/
│   └── index.ts          # Export all workflow functions
└── activities/
    └── index.ts          # Export all activity functions
```

---

#### 6.1 Create External API Wrapper (Type 1 only)

Create `integrations/{integration-name}/externalApi.ts`:
- Return RAW API responses (no transformation)
- Define strict TypeScript types
- Handle only HTTP-level errors

**🔴 CRITICAL: External API calls are made from activities, NOT from index.ts**

The externalApi.ts file provides helper functions that are IMPORTED by activities, not by the main integration file.

**🔴 CRITICAL: Validate External API Responses with Zod**

Define Zod schema for external API responses and validate immediately after each call:

```typescript
export const ApiResponseSchema = z.object({ taskId: z.string(), status: z.string() })
export type ApiResponse = z.infer<typeof ApiResponseSchema>

export async function callApi(params): Promise<ApiResponse> {
  const data = await fetch(...).then(r => r.json())
  return ApiResponseSchema.parse(data)  // Validate immediately!
}
```

**Why:** API docs may be incomplete/outdated. Immediate validation catches format mismatches during integration testing, not at runtime.

#### 6.1.1 Create Activities File (Type 1 only)

Create `integrations/{integration-name}/activities/index.ts`:

**Activities must include:**
1. External API call activities (import from externalApi.ts)
2. `reportToMain` activity - calls integration's reportResult API via HTTP

**reportToMain Pattern:**
```typescript
/**
 * Report status to main component via callback API
 * 
 * Status values:
 * - 'processing': Before/after external API call (workflow reports this)
 * - 'completed': Task completed successfully (workflow reports this)
 * - 'failed': Task failed (workflow reports this)
 * 
 * NOTE: 'queued' status is reported by TaskProcessor, NOT by workflow
 */
export async function reportToMain(params: {
  workflowId?: string  // For logging/debugging
  callbackUrl: string
  status: 'processing' | 'completed' | 'failed'  // NOTE: 'queued' is reported by TaskProcessor
  apiCallId: string   // Required for ALL events - entityId for state machine matching
  externalId?: string  // For 'processing' status: use apiCallId for sync APIs, external taskId for async APIs
  // Result data fields...
}): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(params.callbackUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  })
  // Handle response...
}
```

#### 6.1.2 Create Workflows File (Type 1 only)

Create `integrations/{integration-name}/workflows/index.ts`:

**🔴 CRITICAL: 'queued' status is reported by TaskProcessor BEFORE starting workflow. Workflow does NOT report 'queued'.**

**Workflow must:**
1. **NOTE: 'queued' is already reported by TaskProcessor** - workflow does NOT report 'queued'
2. For sync API (Type 1a):
   - First workflow step: Call `reportToMain` with status='processing', apiCallId (entityId), and externalId=apiCallId BEFORE calling external API
   - Call external API synchronously
   - On success/failure: Call `reportToMain` with status='completed' or 'failed' and apiCallId (entityId)
3. For async API (Type 1b):
   - First workflow step: Call external API to submit task (returns taskId)
   - Call `reportToMain` with status='processing', apiCallId (entityId), and externalId=taskId AFTER external API returns
   - Poll for result or wait for callback
   - On success/failure: Call `reportToMain` with status='completed' or 'failed' and apiCallId (entityId)
4. For external API call failures: Report 'failed' directly (no need to report 'processing' first)
5. **ALL workflow events MUST include apiCallId (entityId)** since Temporal workflow context provides the API Call ID

**For polling workflows (Type 1b), also:**
- Define signals: `stopPolling` and `triggerImmediatePoll`
- Use `condition()` with timeout for interruptible sleep between polls

#### 6.2 Create Integration Main File

Create `integrations/{integration-name}/index.ts`:

**🔴 CRITICAL Rules:**
1. NO backend imports - only import from `'interaqt'`, `'@/integrations/index'` (plus necessary third-party libs like `'hono'`, `'@temporalio/client'`)
2. NO hardcoded entity names - all names come from config
3. Config from `app.config.json` only - NO default values or fallbacks
4. **Import Zod schemas from `./schemas`** - Use for parameter validation and OpenAPI generation
5. **Convert external API field names to match `data-design.json`** - External APIs often use snake_case (e.g., `video_url`), but internal entities use camelCase (e.g., `videoUrl`). Always check `agentspace/{module}.data-design.json` for correct field names when creating integration events.
6. **🔴 requestParams field names MUST match data-design.json EXACTLY** - Read `requestParams.attributes` from APICall entity in data-design.json. Use those exact field names (e.g., `firstFrameImageUrl` NOT `image_urls`). Never invent or copy field names from example code.
7. **🔴 DO NOT manually set fields with `defaultValue`** - If Entity property has `defaultValue` (e.g., `createdAt`), let the framework handle it. Use `Math.floor(Date.now() / 1000)` for timestamps (seconds, NOT milliseconds).

**Type 1 Template (Pull Mode Architecture):**

```typescript
import { Controller, RecordMutationSideEffect, MatchExp } from 'interaqt'
import { IIntegration, IIntegrationConstructorArgs, API, buildAPIPath, PullModeConfig } from '@/integrations/index'
import { Client, Connection } from '@temporalio/client'
import {
  QueryStatusRequestSchema, QueryStatusResponseSchema,
  ReportResultRequestSchema, ReportResultResponseSchema,
  type QueryStatusRequest, type ReportResultRequest
} from './schemas'

export const FETCH_PENDING_TASKS_API_NAME = 'fetchPendingTasks'
export const QUERY_STATUS_API_NAME = 'query{IntegrationName}Status'
export const REPORT_RESULT_API_NAME = 'report{IntegrationName}Result'

// Task queue name - MUST match workflow-collector.ts naming convention
const TASK_QUEUE = 'integration-{integration-name}-queue'

export function create{IntegrationName}Integration(config: Config) {
  return class {IntegrationName}Integration implements IIntegration {
    private temporalClient?: Client
    public readonly namespace: string
    
    constructor(public args: IIntegrationConstructorArgs) {
      this.namespace = args.namespace
    }
    
    async setup(controller: Controller) {
      // Connect to Temporal (for queryStatus signal support)
      const connection = await Connection.connect({ address: config.temporal.address })
      this.temporalClient = new Client({ connection, namespace: config.temporal.namespace })
    }

    /**
     * Returns Pull Mode configuration for TaskProcessor
     * TaskProcessor uses this to poll and start workflows
     */
    getPullModeConfig(): PullModeConfig {
      return {
        enabled: true,
        taskQueue: TASK_QUEUE,
        workflowName: '{workflowName}',
        buildWorkflowId: (apiCall) => `{integration-name}-${apiCall.id}`,
        buildWorkflowParams: (apiCall) => ({
          workflowId: `{integration-name}-${apiCall.id}`,
          apiCallId: apiCall.id,
          callbackUrl: `${config.mainEndpoint}/${buildAPIPath(this.namespace, REPORT_RESULT_API_NAME)}`,
          // ... other params from apiCall.requestParams
        }),
        internalAPIs: {
          fetchPendingTasks: `${config.mainEndpoint}/${buildAPIPath(this.namespace, FETCH_PENDING_TASKS_API_NAME)}`,
          reportTaskEvent: `${config.mainEndpoint}/${buildAPIPath(this.namespace, REPORT_RESULT_API_NAME)}`
        }
      }
    }

    createSideEffects(): RecordMutationSideEffect[] {
      // Pull Mode: Empty - TaskProcessor handles task dispatching
      return []
    }

    createAPIs(): API[] {
      const self = this
      const MAX_ATTEMPTS = 5
      const STUCK_TIMEOUT_SECONDS = 300  // 5 minutes
      
      return [
        // fetchPendingTasks API - Internal API for TaskProcessor to poll tasks
        {
          name: FETCH_PENDING_TASKS_API_NAME,
          namespace: this.namespace,
          allowAnonymous: true,  // Internal API - secured by network policy
          useNamedParams: true,
          callback: async function(this: Controller, context, params: { limit?: number }) {
            // Query pending, failed (with retries), and stuck tasks
            // See nanobanana2ImageGeneration or fangzhouVideoGeneration for full implementation
          }
        },
        // queryStatus API - returns current known status, optionally signals workflow
        { name: QUERY_STATUS_API_NAME, namespace: this.namespace, allowAnonymous: false, callback: async function(...) {
          // Query APICall entity for current status
          // For polling workflows: send triggerImmediatePoll signal
        }},
        // reportResult API - called by workflow AND TaskProcessor to report status
        { name: REPORT_RESULT_API_NAME, namespace: this.namespace, allowAnonymous: true, callback: async function(...) {
          // For 'queued': Double-check current status allows transition (prevent concurrent TaskProcessor duplicates)
          // For terminal: Check if already terminal (avoid duplicate events)
          // Create integration event with status
        }}
      ]
    }
  }
}
```

**Type 2/3 Template:**
```typescript
import { Controller, RecordMutationSideEffect } from 'interaqt'
import { IIntegration, IIntegrationConstructorArgs, API } from '@/integrations/index'
import type { MiddlewareHandler } from 'hono'
// Import Zod schemas for API parameter validation
import {
  {ApiName}RequestSchema,
  {ApiName}ResponseSchema,
  type {ApiName}Request
} from './schemas'

export function create{IntegrationName}Integration(config: Config) {
  return class {IntegrationName}Integration implements IIntegration {
    constructor(public args: IIntegrationConstructorArgs) {}
    createSideEffects(): RecordMutationSideEffect[] { return [] }  // Empty for Type 2/3
    createAPIs(): API[] {
      return [{
        name: '{apiName}',
        namespace: this.args.namespace,
        callback: async function(this: Controller, context, params: {ApiName}Request) {
          // API implementation
        },
        paramsSchema: {ApiName}RequestSchema,
        responseSchema: {ApiName}ResponseSchema,
        useNamedParams: true,
        allowAnonymous: false,
        openapi: {
          summary: '{API description}',
          tags: ['{IntegrationName}']
        }
      }]
    }
    createMiddlewares?(): MiddlewareHandler[] { /* Optional middleware */ }
  }
}
```

#### 6.3 Create Entry File

**🔴 CRITICAL: Create a separate entry file instead of modifying aggregatedIntegration.ts directly**

Create `integrations/entries/{integration-name}.entry.ts`:

**Entry File Template:**

```typescript
/**
 * {Integration Name} Integration Entry
 * 
 * Type {1|2|3}: {Integration Type Description}
 * {Brief description}
 */

import { config as appConfig } from "@/config.js"
import { create{IntegrationName}Integration } from "@/integrations/{integration-name}/index"

const mainConfig = (appConfig as any).components.main

const {IntegrationName}Integration = create{IntegrationName}Integration({
  // Configuration object - structure defined by the integration's Config type
  // Check integrations/{integration-name}/index.ts for the Config type definition
  // Get values from mainConfig (app.config.json)
})

export default {IntegrationName}Integration
```

**Key Rules:**
1. **File naming**: `{integration-name}.entry.ts` - use EXACT `name` from plan (e.g., `auth.entry.ts`, `objectStorage.entry.ts`)
2. **Config structure**: Refer to the integration's `Config` type in `integrations/{integration-name}/index.ts`
3. **Config values**: Get from `mainConfig` (mapped from `app.config.json`)
4. **Entity names**: Check `agentspace/{module}.data-design.json` for correct entity names (Type 1 only)
5. **Export default**: Always export the created integration class instance as default

#### 6.4 Generate Aggregated Integration

**🔴 CRITICAL: Run this command to regenerate the aggregated integration file**

```bash
npx tsx .claude/agents/scripts/generate-aggregated-integration.ts
```

This command will:
1. Scan all `*.entry.ts` files in `integrations/entries/`
2. Generate `integrations/entries/index.ts` that imports and aggregates all integrations
3. The generated file is used by the application instead of manual registration

**Verify the generation:**
- Check that `integrations/entries/index.ts` includes the new integration
- The file should have an import for your new entry file

#### 6.5 Type Check

Run `npm run check` and fix all type errors before proceeding.

### Step 7: Integration Testing (Task 4.5)

1. **Create test file `tests/{module}.{integration-name}.integration.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Controller } from 'interaqt'

describe('{IntegrationName} Integration', () => {
  describe('Configuration', () => {
    it('should be properly configured', async () => {
      // Verify integration setup
    })
  })

  describe('Functionality', () => {
    it('should handle main use case', async () => {
      // Test main integration flow
    })

    it('should handle errors', async () => {
      // Test error handling
    })
  })
})
```

2. **Run tests: `npm test tests/{module}.{integration-name}.integration.test.ts`**

### Step 8: Document Progress

**🔴 CRITICAL: Update `agentspace/{module}.integration-implementation-plan.json` based on test results:**

- **If ALL tests pass**:
  - Set `"completed": true` for the current integration
  - Remove `lastError` field if it exists

- **If ANY test fails**:
  - Keep `"completed": false`
  - Add/update `lastError` field with error document path
  - Create error document in `agentspace/errors/{module}.{integration-name}.error.md`

### Step 9: Commit (only if tests pass)

```bash
git add .
git commit -m "feat: Task 4 - Implement {integration-name} integration"
```

### Step 10: Complete and Exit

**🛑 MANDATORY STOP: Exit immediately after completing ONE integration**
- Wait for user confirmation before selecting the next integration
- Report completion status to user

## Completion Checklist

Before marking an integration as complete, verify:

**For ALL Types:**
- [ ] Design document created at `agentspace/{module}.{integration-name}.integration-design.json`
- [ ] Integration directory created at `integrations/{integration-name}/`
- [ ] `package.json` has `"type": "module"` and `"exports": { ".": "./index.ts" }` fields
- [ ] **Zod schemas file `integrations/{integration-name}/schemas.ts`** with request/response schemas
- [ ] Main implementation file `integrations/{integration-name}/index.ts`
- [ ] **APIs define `paramsSchema`, `responseSchema`, and `openapi`** on each `API` object returned by `createAPIs()`
- [ ] **Entry file created at `integrations/entries/{integration-name}.entry.ts`**
- [ ] **Aggregation script executed (`npx tsx .claude/agents/scripts/generate-aggregated-integration.ts`)**
- [ ] **New integration appears in generated `integrations/entries/index.ts`**
- [ ] Type check passes (`npm run check`)
- [ ] Integration test passes

**For Type 1 (Additional - Pull Mode Architecture):**
- [ ] External API wrapper `integrations/{integration-name}/externalApi.ts`
- [ ] Activities file `integrations/{integration-name}/activities/index.ts` with:
  - [ ] External API call activities (import from externalApi.ts)
  - [ ] `reportToMain` activity for callback to integration (NOTE: does NOT report 'queued')
- [ ] Workflows file `integrations/{integration-name}/workflows/index.ts` with:
  - [ ] **NOTE: Does NOT report 'queued' - TaskProcessor handles that**
  - [ ] For sync API (Type 1a): First step reports 'processing' status with apiCallId (entityId) and externalId=apiCallId BEFORE calling external API
  - [ ] For async API (Type 1b): First step calls external API, then reports 'processing' status with apiCallId (entityId) and externalId=taskId
  - [ ] Last step reports 'completed' or 'failed' status with apiCallId (entityId)
  - [ ] Supports external API call failure: reports 'failed' directly (skipping 'processing')
  - [ ] (For polling) Signals: `stopPolling`, `triggerImmediatePoll`
  - [ ] **ALL workflow events include apiCallId (entityId)** since Temporal workflow context is available
- [ ] `getPullModeConfig()` method returns PullModeConfig with:
  - [ ] `enabled: true`
  - [ ] `taskQueue` matching workflow-collector.ts naming convention
  - [ ] `workflowName`, `buildWorkflowId`, `buildWorkflowParams` functions
  - [ ] `internalAPIs.fetchPendingTasks` and `internalAPIs.reportTaskEvent` URLs
- [ ] `createSideEffects()` returns empty array `[]`
- [ ] Three APIs in index.ts: 
  - [ ] `fetchPendingTasks` (allowAnonymous: true) - Internal API for TaskProcessor
  - [ ] `queryStatus` (allowAnonymous: false) - Manual query API
  - [ ] `reportResult` (allowAnonymous: true) - Callback API for workflow and TaskProcessor
- [ ] `reportResult` API handles 'queued' status with double-check to prevent duplicate events from concurrent TaskProcessors
- [ ] External API test `tests/{module}.{integration-name}.external.test.ts` passing
- [ ] Event sequence follows Pull Mode pattern: TaskProcessor reports 'queued' → Workflow reports 'processing' → 'completed'|'failed'
- [ ] ALL workflow events have entityId (apiCallId) for state machine matching; 'processing' event includes externalId for debugging

**For Type 2/3:**
- [ ] Empty `createSideEffects()` (returns `[]`)
- [ ] Functional APIs properly implemented

## Error Handling

**If test fails after 10 attempts:**
1. Create error document at `agentspace/errors/{module}.{integration-name}.error.md`
2. Document: test plan, implementation code, error messages, fix attempts
3. Update `lastError` field in plan
4. STOP and wait for user guidance

**Common Error Patterns:**

1. **Missing Config**: Check `app.config.json` has all required fields
2. **Type Errors**: Ensure all entity/field names come from config
3. **API Errors**: Verify credentials and endpoint URLs
4. **Test Failures**: Check test data setup and expectations

