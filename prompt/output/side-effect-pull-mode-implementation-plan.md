# 副作用拉模式重构实施计划

## 概述

本文档基于 `side-effect-pull-mode-refactor-plan.md` 中的新架构设计，制定分步实施计划。每一步完成后都有完整的测试验证，确保渐进式执行。

---

## 第一步：类型定义与接口扩展

### 目标
在 `integrations/index.ts` 中添加 `PullModeConfig` 类型和 `IIntegration.getPullModeConfig()` 方法。

### 实施内容

#### 1.1 添加 PullModeConfig 类型

```typescript
// integrations/index.ts

export type PullModeConfig = {
  enabled: boolean
  
  // Temporal 配置
  taskQueue: string
  workflowName: string
  buildWorkflowId: (apiCall: any) => string
  buildWorkflowParams: (apiCall: any) => any
  
  // Internal API 端点（完整 URL）
  internalAPIs: {
    fetchPendingTasks: string   // e.g. 'http://main:3000/api/fangzhou/fetchPendingTasks'
    reportTaskEvent: string     // 复用现有 reportResult API
  }
}
```

#### 1.2 扩展 IIntegration 接口

```typescript
// integrations/index.ts

export type IIntegration = {
  configure?:() => Promise<any>
  setup?:(controller: Controller) => Promise<any>
  createSideEffects:() => RecordMutationSideEffect<any>[]
  createAPIs?: () => API[]
  createMiddlewares?: () => MiddlewareHandler[]
  getPullModeConfig?: () => PullModeConfig | null  // 新增
}
```

#### 1.3 添加 buildAPIPath 工具函数

```typescript
// integrations/index.ts

/**
 * 构建 API 路径
 * @param namespace - Integration 命名空间
 * @param apiName - API 名称
 * @returns 完整的 API 路径（不含 host）
 */
export function buildAPIPath(namespace: string, apiName: string): string {
  return `api/${namespace}/${apiName}`
}
```

### 测试

#### 测试 1.1：类型编译检查

```bash
# 运行 TypeScript 编译，确保类型定义正确
npx tsc --noEmit --project tsconfig.json
```

**预期结果**：编译通过，无类型错误。

#### 测试 1.2：buildAPIPath 函数单元测试

创建测试文件 `tests/integrations/buildAPIPath.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import { buildAPIPath } from '@/integrations/index.js'

describe('buildAPIPath', () => {
  it('should build correct API path', () => {
    expect(buildAPIPath('fangzhouVideoGeneration', 'fetchPendingTasks'))
      .toBe('api/fangzhouVideoGeneration/fetchPendingTasks')
  })

  it('should handle different namespaces', () => {
    expect(buildAPIPath('nanobanana2ImageGeneration', 'reportResult'))
      .toBe('api/nanobanana2ImageGeneration/reportResult')
  })
})
```

```bash
npx vitest run tests/integrations/buildAPIPath.test.ts
```

**预期结果**：所有测试用例通过。

#### 测试 1.3：接口兼容性测试

确保现有 Integration 实现不会因接口扩展而报错（因为 `getPullModeConfig` 是可选方法）。

```bash
# 运行现有的 Integration 相关测试
npx vitest run tests/ --grep "integration"
```

**预期结果**：现有测试全部通过。

---

## 第二步：创建 Internal API - fetchPendingTasks

### 目标
在每个需要支持拉模式的 Integration 中添加 `fetchPendingTasks` API。

### 实施内容

#### 2.1 创建通用的 fetchPendingTasks API 工厂函数

```typescript
// integrations/shared/fetchPendingTasksAPI.ts

import { Controller, MatchExp } from 'interaqt'
import { API } from '@/integrations/index.js'

export interface FetchPendingTasksConfig {
  namespace: string
  apiCallEntity: {
    entityName: string
    fields: {
      status: string
      startedAt: string
      attempts: string
      requestParams: string
      createdAt: string
    }
  }
  maxAttempts?: number
  stuckTimeoutSeconds?: number
}

export function createFetchPendingTasksAPI(config: FetchPendingTasksConfig): API {
  const {
    namespace,
    apiCallEntity,
    maxAttempts = 5,
    stuckTimeoutSeconds = 300
  } = config

  return {
    name: 'fetchPendingTasks',
    namespace,
    allowAnonymous: false,  // 需要认证
    callback: async function(this: Controller, context) {
      const nowSeconds = Math.floor(Date.now() / 1000)
      const limit = context.query?.limit ? parseInt(context.query.limit, 10) : 10

      // 条件1：pending 状态的任务
      const pendingCondition = MatchExp.atom({
        key: apiCallEntity.fields.status,
        value: ['=', 'pending']
      })

      // 条件2：failed 但未超过重试次数的任务
      const failedCondition = MatchExp.atom({
        key: apiCallEntity.fields.status,
        value: ['=', 'failed']
      }).and({
        key: apiCallEntity.fields.attempts,
        value: ['<', maxAttempts]
      })

      // 条件3：stuck (queued 超时) 的任务
      const stuckCondition = MatchExp.atom({
        key: apiCallEntity.fields.status,
        value: ['=', 'queued']
      }).and({
        key: apiCallEntity.fields.startedAt,
        value: ['<', nowSeconds - stuckTimeoutSeconds]
      }).and({
        key: apiCallEntity.fields.attempts,
        value: ['<', maxAttempts]
      })

      const match = pendingCondition.or(failedCondition).or(stuckCondition)

      const tasks = await this.system.storage.find(
        apiCallEntity.entityName,
        match,
        { limit, orderBy: { [apiCallEntity.fields.createdAt]: 'asc' } },
        ['id', 
         apiCallEntity.fields.status, 
         apiCallEntity.fields.startedAt,
         apiCallEntity.fields.attempts, 
         apiCallEntity.fields.requestParams]
      )

      return { tasks: tasks || [] }
    }
  }
}
```

#### 2.2 在 fangzhouVideoGeneration Integration 中集成

```typescript
// integrations/fangzhouVideoGeneration/index.ts

import { createFetchPendingTasksAPI } from '@/integrations/shared/fetchPendingTasksAPI.js'

// 在 createAPIs() 方法中添加
createAPIs(): API[] {
  return [
    createFetchPendingTasksAPI({
      namespace: this.namespace,
      apiCallEntity: {
        entityName: config.apiCallEntity.entityName,
        fields: {
          status: config.apiCallEntity.fields.status,
          startedAt: config.apiCallEntity.fields.startedAt,
          attempts: config.apiCallEntity.fields.attempts,
          requestParams: config.apiCallEntity.fields.requestParams,
          createdAt: config.apiCallEntity.fields.createdAt
        }
      }
    }),
    // ... 其他现有 APIs
  ]
}
```

#### 2.3 在 nanobanana2ImageGeneration Integration 中集成

同上，使用 `createFetchPendingTasksAPI` 工厂函数。

### 测试

#### 测试 2.1：fetchPendingTasks API 单元测试

创建测试文件 `tests/integrations/fetchPendingTasks.test.ts`：

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setupTestController, cleanupTestController } from '../helpers/test-setup.js'

describe('fetchPendingTasks API', () => {
  let controller: Controller
  let testData: any

  beforeEach(async () => {
    const setup = await setupTestController()
    controller = setup.controller
    
    // 创建测试数据
    testData = await createTestAPICallRecords(controller)
  })

  afterEach(async () => {
    await cleanupTestController(controller)
  })

  it('should return pending tasks', async () => {
    const response = await controller.callAPI(
      'fangzhouVideoGeneration',
      'fetchPendingTasks',
      { query: { limit: 10 } }
    )

    expect(response.tasks).toBeDefined()
    expect(response.tasks.length).toBeGreaterThan(0)
    expect(response.tasks[0].status).toBe('pending')
  })

  it('should return failed tasks with attempts < maxAttempts', async () => {
    // 创建一个 failed 任务，attempts = 2
    await createFailedTask(controller, { attempts: 2 })
    
    const response = await controller.callAPI(
      'fangzhouVideoGeneration',
      'fetchPendingTasks',
      { query: { limit: 10 } }
    )

    const failedTasks = response.tasks.filter(t => t.status === 'failed')
    expect(failedTasks.length).toBeGreaterThan(0)
  })

  it('should NOT return failed tasks with attempts >= maxAttempts', async () => {
    // 创建一个 failed 任务，attempts = 5 (等于 maxAttempts)
    const task = await createFailedTask(controller, { attempts: 5 })
    
    const response = await controller.callAPI(
      'fangzhouVideoGeneration',
      'fetchPendingTasks',
      { query: { limit: 10 } }
    )

    const exhaustedTasks = response.tasks.filter(t => t.id === task.id)
    expect(exhaustedTasks.length).toBe(0)
  })

  it('should return stuck (queued timeout) tasks', async () => {
    // 创建一个 stuck 任务：status=queued, startedAt 超过 5 分钟
    const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 400
    await createQueuedTask(controller, { startedAt: fiveMinutesAgo, attempts: 1 })
    
    const response = await controller.callAPI(
      'fangzhouVideoGeneration',
      'fetchPendingTasks',
      { query: { limit: 10 } }
    )

    const stuckTasks = response.tasks.filter(t => t.status === 'queued')
    expect(stuckTasks.length).toBeGreaterThan(0)
  })

  it('should order tasks by createdAt ascending (FIFO)', async () => {
    const response = await controller.callAPI(
      'fangzhouVideoGeneration',
      'fetchPendingTasks',
      { query: { limit: 10 } }
    )

    for (let i = 1; i < response.tasks.length; i++) {
      expect(response.tasks[i].createdAt).toBeGreaterThanOrEqual(
        response.tasks[i - 1].createdAt
      )
    }
  })

  it('should respect limit parameter', async () => {
    const response = await controller.callAPI(
      'fangzhouVideoGeneration',
      'fetchPendingTasks',
      { query: { limit: 2 } }
    )

    expect(response.tasks.length).toBeLessThanOrEqual(2)
  })
})
```

```bash
npx vitest run tests/integrations/fetchPendingTasks.test.ts
```

**预期结果**：所有测试用例通过。

#### 测试 2.2：API 路由可访问性测试

```typescript
// tests/integrations/fetchPendingTasks.http.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { startTestServer, stopTestServer } from '../helpers/test-server.js'

describe('fetchPendingTasks HTTP Endpoint', () => {
  let serverUrl: string

  beforeAll(async () => {
    const server = await startTestServer()
    serverUrl = server.url
  })

  afterAll(async () => {
    await stopTestServer()
  })

  it('should respond to GET request', async () => {
    const response = await fetch(
      `${serverUrl}/api/fangzhouVideoGeneration/fetchPendingTasks?limit=10`,
      {
        headers: { 'Authorization': 'Bearer test-token' }
      }
    )

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty('tasks')
  })

  it('should reject unauthenticated requests', async () => {
    const response = await fetch(
      `${serverUrl}/api/fangzhouVideoGeneration/fetchPendingTasks`
    )

    expect(response.status).toBe(401)
  })
})
```

```bash
npx vitest run tests/integrations/fetchPendingTasks.http.test.ts
```

**预期结果**：HTTP 端点正确响应。

---

## 第三步：扩展 reportResult API 支持 queued 状态

### 目标
修改现有的 `reportResult` API，使其支持 `status: 'queued'` 事件报告。

### 实施内容

#### 3.1 修改 reportResult API

```typescript
// integrations/fangzhouVideoGeneration/index.ts

// 在 reportResult API callback 中添加 queued 状态处理
{
  name: REPORT_RESULT_API_NAME,
  namespace: this.namespace,
  allowAnonymous: true,
  callback: async function(this: Controller, context, params: ReportResultRequest) {
    const { apiCallId, status, taskId, data, error } = params

    // ========== 新增：处理 queued 状态 ==========
    if (status === 'queued') {
      // 二次确认：检查当前状态是否允许转换为 queued
      const currentTask = await this.system.storage.findOne(
        apiCallEntity.entityName,
        MatchExp.atom({ key: 'id', value: ['=', apiCallId] })
      )
      
      if (!currentTask) {
        return { success: false, error: 'Task not found' }
      }
      
      if (currentTask[apiCallEntity.fields.status] !== 'pending' && 
          currentTask[apiCallEntity.fields.status] !== 'failed') {
        return { 
          success: false, 
          error: `Cannot transition to queued from ${currentTask[apiCallEntity.fields.status]}` 
        }
      }
      
      await self.createIntegrationEvent(
        this, 
        apiCallId, 
        null,      // externalId
        'queued', 
        null,      // data
        null       // errorMessage
      )
      
      return { success: true, message: 'Queued event created' }
    }
    // ========== END 新增 ==========

    // 原有 processing/completed/failed 处理逻辑不变
    // ...
  }
}
```

#### 3.2 确保 StateMachine 支持相关状态转换

确认 `apiCallEntity` 的 StateMachine 定义支持以下转换：
- `pending -> queued`
- `failed -> queued`（用于重试）

### 测试

#### 测试 3.1：reportResult queued 状态单元测试

创建测试文件 `tests/integrations/reportResult.queued.test.ts`：

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setupTestController, cleanupTestController } from '../helpers/test-setup.js'

describe('reportResult API - queued status', () => {
  let controller: Controller

  beforeEach(async () => {
    const setup = await setupTestController()
    controller = setup.controller
  })

  afterEach(async () => {
    await cleanupTestController(controller)
  })

  it('should accept queued status from pending task', async () => {
    // 创建一个 pending 任务
    const task = await createPendingTask(controller)
    
    const response = await controller.callAPI(
      'fangzhouVideoGeneration',
      'reportFangzhouVideoResult',
      { body: { apiCallId: task.id, status: 'queued' } }
    )

    expect(response.success).toBe(true)
    
    // 验证状态已更新
    const updatedTask = await getTask(controller, task.id)
    expect(updatedTask.status).toBe('queued')
  })

  it('should accept queued status from failed task (retry)', async () => {
    // 创建一个 failed 任务
    const task = await createFailedTask(controller, { attempts: 2 })
    
    const response = await controller.callAPI(
      'fangzhouVideoGeneration',
      'reportFangzhouVideoResult',
      { body: { apiCallId: task.id, status: 'queued' } }
    )

    expect(response.success).toBe(true)
    
    // 验证状态已更新
    const updatedTask = await getTask(controller, task.id)
    expect(updatedTask.status).toBe('queued')
  })

  it('should reject queued status from completed task', async () => {
    // 创建一个 completed 任务
    const task = await createCompletedTask(controller)
    
    const response = await controller.callAPI(
      'fangzhouVideoGeneration',
      'reportFangzhouVideoResult',
      { body: { apiCallId: task.id, status: 'queued' } }
    )

    expect(response.success).toBe(false)
    expect(response.error).toContain('Cannot transition')
  })

  it('should reject queued status from processing task', async () => {
    // 创建一个 processing 任务
    const task = await createProcessingTask(controller)
    
    const response = await controller.callAPI(
      'fangzhouVideoGeneration',
      'reportFangzhouVideoResult',
      { body: { apiCallId: task.id, status: 'queued' } }
    )

    expect(response.success).toBe(false)
    expect(response.error).toContain('Cannot transition')
  })

  it('should return error for non-existent task', async () => {
    const response = await controller.callAPI(
      'fangzhouVideoGeneration',
      'reportFangzhouVideoResult',
      { body: { apiCallId: 'non-existent-id', status: 'queued' } }
    )

    expect(response.success).toBe(false)
    expect(response.error).toContain('not found')
  })
})
```

```bash
npx vitest run tests/integrations/reportResult.queued.test.ts
```

**预期结果**：所有测试用例通过。

#### 测试 3.2：并发安全测试

```typescript
// tests/integrations/reportResult.concurrent.test.ts

describe('reportResult API - concurrent safety', () => {
  it('should handle concurrent queued reports for same task', async () => {
    const task = await createPendingTask(controller)
    
    // 同时发送两个 queued 报告
    const results = await Promise.all([
      controller.callAPI('fangzhouVideoGeneration', 'reportFangzhouVideoResult', 
        { body: { apiCallId: task.id, status: 'queued' } }),
      controller.callAPI('fangzhouVideoGeneration', 'reportFangzhouVideoResult', 
        { body: { apiCallId: task.id, status: 'queued' } })
    ])

    // 只有一个应该成功
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length
    
    expect(successCount).toBe(1)
    expect(failCount).toBe(1)
    
    // 验证最终状态
    const updatedTask = await getTask(controller, task.id)
    expect(updatedTask.status).toBe('queued')
  })
})
```

```bash
npx vitest run tests/integrations/reportResult.concurrent.test.ts
```

**预期结果**：并发请求被正确处理，只有一个成功。

---

## 第四步：实现 TaskProcessor

### 目标
创建新的 `TaskProcessor` 类，通过 HTTP 与 Main Component 通信，不直接连接数据库。

### 实施内容

#### 4.1 创建 TaskProcessor 类

```typescript
// async-task-component/task-processor.ts

import { Client, Connection, WorkflowExecutionAlreadyStartedError } from '@temporalio/client'
import { PullModeConfig } from '@/integrations/index.js'

export interface TaskProcessorConfig {
  instanceId: string
  pollIntervalMs: number
  batchSize: number
  temporalAddress: string
  temporalNamespace: string
  internalToken?: string
}

export class TaskProcessor {
  private isRunning = false
  private temporalClient?: Client
  private temporalConnection?: Connection
  private pullModeConfigs: Array<{ namespace: string; config: PullModeConfig }> = []

  constructor(private config: TaskProcessorConfig) {}

  async start(
    pullModeConfigs: Array<{ namespace: string; config: PullModeConfig }>
  ): Promise<void> {
    this.pullModeConfigs = pullModeConfigs
    this.isRunning = true
    await this.connectTemporal()
    this.startPollingLoop()
  }

  async stop(): Promise<void> {
    this.isRunning = false
    await this.temporalConnection?.close()
  }

  private async connectTemporal(): Promise<void> {
    this.temporalConnection = await Connection.connect({
      address: this.config.temporalAddress
    })
    this.temporalClient = new Client({
      connection: this.temporalConnection,
      namespace: this.config.temporalNamespace
    })
  }

  private async startPollingLoop(): Promise<void> {
    while (this.isRunning) {
      for (const { namespace, config } of this.pullModeConfigs) {
        try {
          await this.processTaskType(namespace, config)
        } catch (error) {
          console.error(`[TaskProcessor] Error processing ${namespace}:`, error)
        }
      }
      await this.sleep(this.config.pollIntervalMs)
    }
  }

  private async fetchPendingTasks(pullConfig: PullModeConfig): Promise<any[]> {
    const url = `${pullConfig.internalAPIs.fetchPendingTasks}?limit=${this.config.batchSize}`
    
    const response = await fetch(url, {
      headers: this.getHeaders()
    })
    
    if (!response.ok) {
      console.error(`[TaskProcessor] Failed to fetch tasks: ${response.status}`)
      return []
    }
    
    const { tasks } = await response.json()
    return tasks || []
  }

  private async reportTaskEvent(
    pullConfig: PullModeConfig,
    apiCallId: string,
    status: string,
    data?: any
  ): Promise<boolean> {
    const url = pullConfig.internalAPIs.reportTaskEvent
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getHeaders()
      },
      body: JSON.stringify({ apiCallId, status, ...data })
    })
    
    if (!response.ok) {
      console.error(`[TaskProcessor] Failed to report event: ${response.status}`)
    }
    
    return response.ok
  }

  private async processTaskType(namespace: string, pullConfig: PullModeConfig): Promise<void> {
    if (!this.temporalClient) return
    
    const tasks = await this.fetchPendingTasks(pullConfig)
    if (tasks.length === 0) return

    console.log(`[TaskProcessor] Processing ${tasks.length} tasks for ${namespace}`)

    for (const task of tasks) {
      await this.processTask(task, namespace, pullConfig)
    }
  }

  private async processTask(
    apiCall: any,
    namespace: string,
    pullConfig: PullModeConfig
  ): Promise<void> {
    const workflowId = `${namespace}:${pullConfig.buildWorkflowId(apiCall)}`
    
    try {
      // Step 1: 报告 queued 事件
      const reported = await this.reportTaskEvent(pullConfig, apiCall.id, 'queued')
      
      if (!reported) {
        console.log(`[TaskProcessor] Failed to report queued, skipping`, { apiCallId: apiCall.id })
        return
      }

      // Step 2: 幂等启动 Temporal workflow
      await this.temporalClient!.workflow.start(pullConfig.workflowName, {
        taskQueue: pullConfig.taskQueue,
        workflowId,
        args: [pullConfig.buildWorkflowParams(apiCall)]
      })

      console.log(`[TaskProcessor] Workflow started`, { apiCallId: apiCall.id, workflowId })

    } catch (error: any) {
      if (error instanceof WorkflowExecutionAlreadyStartedError) {
        console.log(`[TaskProcessor] Workflow already exists (idempotent)`, { workflowId })
        return
      }

      console.error(`[TaskProcessor] Workflow start failed`, { 
        apiCallId: apiCall.id, 
        error: error.message 
      })

      await this.reportTaskEventWithRetry(
        pullConfig,
        apiCall.id,
        'failed',
        { error: `Workflow start failed: ${error.message}` }
      )
    }
  }

  private async reportTaskEventWithRetry(
    pullConfig: PullModeConfig,
    apiCallId: string,
    status: string,
    data?: any,
    maxRetries: number = 3
  ): Promise<boolean> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const success = await this.reportTaskEvent(pullConfig, apiCallId, status, data)
      if (success) return true
      await this.sleep(1000 * Math.pow(2, attempt))
    }
    return false
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}
    if (this.config.internalToken) {
      headers['Authorization'] = `Bearer ${this.config.internalToken}`
    }
    return headers
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

### 测试

#### 测试 4.1：TaskProcessor 单元测试（Mock HTTP）

创建测试文件 `tests/async-task-component/task-processor.test.ts`：

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TaskProcessor, TaskProcessorConfig } from '@/async-task-component/task-processor.js'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock Temporal
vi.mock('@temporalio/client', () => ({
  Connection: {
    connect: vi.fn().mockResolvedValue({
      close: vi.fn()
    })
  },
  Client: vi.fn().mockImplementation(() => ({
    workflow: {
      start: vi.fn().mockResolvedValue({})
    }
  })),
  WorkflowExecutionAlreadyStartedError: class extends Error {}
}))

describe('TaskProcessor', () => {
  let taskProcessor: TaskProcessor
  const config: TaskProcessorConfig = {
    instanceId: 'test-instance',
    pollIntervalMs: 100,
    batchSize: 10,
    temporalAddress: 'localhost:7233',
    temporalNamespace: 'default',
    internalToken: 'test-token'
  }

  beforeEach(() => {
    mockFetch.mockReset()
    taskProcessor = new TaskProcessor(config)
  })

  afterEach(async () => {
    await taskProcessor.stop()
  })

  describe('fetchPendingTasks', () => {
    it('should call correct URL with headers', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ tasks: [] })
      })

      const pullConfig = {
        enabled: true,
        taskQueue: 'test-queue',
        workflowName: 'testWorkflow',
        buildWorkflowId: (t) => t.id,
        buildWorkflowParams: (t) => ({}),
        internalAPIs: {
          fetchPendingTasks: 'http://main:3000/api/test/fetchPendingTasks',
          reportTaskEvent: 'http://main:3000/api/test/reportResult'
        }
      }

      // 触发内部 fetchPendingTasks 调用
      await taskProcessor.start([{ namespace: 'test', config: pullConfig }])
      
      // 等待一个 poll 周期
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://main:3000/api/test/fetchPendingTasks?limit=10',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      )
    })

    it('should return empty array on fetch failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500
      })

      // 验证不会抛出异常
      // ...
    })
  })

  describe('reportTaskEvent', () => {
    it('should send correct POST request', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ tasks: [{ id: '123' }] }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) })
        .mockResolvedValueOnce({ ok: true })

      const pullConfig = {
        enabled: true,
        taskQueue: 'test-queue',
        workflowName: 'testWorkflow',
        buildWorkflowId: (t) => t.id,
        buildWorkflowParams: (t) => ({ apiCallId: t.id }),
        internalAPIs: {
          fetchPendingTasks: 'http://main:3000/api/test/fetchPendingTasks',
          reportTaskEvent: 'http://main:3000/api/test/reportResult'
        }
      }

      await taskProcessor.start([{ namespace: 'test', config: pullConfig }])
      await new Promise(resolve => setTimeout(resolve, 150))

      // 验证 POST 请求
      const postCalls = mockFetch.mock.calls.filter(c => c[1]?.method === 'POST')
      expect(postCalls.length).toBeGreaterThan(0)
      
      const [url, options] = postCalls[0]
      expect(url).toBe('http://main:3000/api/test/reportResult')
      expect(JSON.parse(options.body)).toMatchObject({
        apiCallId: '123',
        status: 'queued'
      })
    })
  })

  describe('processTask', () => {
    it('should handle WorkflowExecutionAlreadyStartedError gracefully', async () => {
      // 配置 mock 使 workflow.start 抛出 AlreadyStarted 错误
      // ...
    })

    it('should report failed event on workflow start failure', async () => {
      // 配置 mock 使 workflow.start 抛出其他错误
      // ...
    })
  })
})
```

```bash
npx vitest run tests/async-task-component/task-processor.test.ts
```

**预期结果**：所有测试用例通过。

#### 测试 4.2：TaskProcessor 集成测试（需要真实 Temporal）

创建测试文件 `tests/async-task-component/task-processor.integration.test.ts`：

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { TaskProcessor } from '@/async-task-component/task-processor.js'
import { startTestServer, stopTestServer } from '../helpers/test-server.js'

describe('TaskProcessor Integration', () => {
  let taskProcessor: TaskProcessor
  let serverUrl: string

  beforeAll(async () => {
    // 启动测试服务器
    const server = await startTestServer()
    serverUrl = server.url
    
    // 创建待处理任务
    await createTestPendingTasks(serverUrl)
  })

  afterAll(async () => {
    await taskProcessor?.stop()
    await stopTestServer()
  })

  it('should fetch and process pending tasks', async () => {
    taskProcessor = new TaskProcessor({
      instanceId: 'test-instance',
      pollIntervalMs: 500,
      batchSize: 10,
      temporalAddress: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
      temporalNamespace: 'default',
      internalToken: 'test-token'
    })

    const pullConfig = {
      enabled: true,
      taskQueue: 'test-queue',
      workflowName: 'testWorkflow',
      buildWorkflowId: (t) => t.id,
      buildWorkflowParams: (t) => ({ apiCallId: t.id }),
      internalAPIs: {
        fetchPendingTasks: `${serverUrl}/api/test/fetchPendingTasks`,
        reportTaskEvent: `${serverUrl}/api/test/reportResult`
      }
    }

    await taskProcessor.start([{ namespace: 'test', config: pullConfig }])
    
    // 等待处理
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 验证任务状态已更新为 queued
    const tasks = await fetchTasks(serverUrl)
    const queuedTasks = tasks.filter(t => t.status === 'queued')
    expect(queuedTasks.length).toBeGreaterThan(0)
  })
})
```

```bash
# 需要启动 Temporal
npx vitest run tests/async-task-component/task-processor.integration.test.ts
```

**预期结果**：TaskProcessor 正确拉取并处理任务。

---

## 第五步：重构 startAsyncTask.ts

### 目标
移除 `startAsyncTask.ts` 中的数据库初始化逻辑，改用 HTTP 通信方式。

### 实施内容

#### 5.1 修改 startAsyncTask.ts

```typescript
// async-task-component/startAsyncTask.ts

import * as crypto from 'crypto'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { config as appConfig } from '@/config.js'
import { collectIntegrationWorkflows } from './workflow-collector.js'
import { WorkerManager } from './worker-manager.js'
import { TaskProcessor } from './task-processor.js'
import { entities, relations, interactions, activities, dicts } from '@/backend/index.js'
import AggregatedIntegrationClass from '@/integrations/entries/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const INSTANCE_ID = `worker-${process.env.HOSTNAME || crypto.randomUUID().slice(0, 8)}`

async function main() {
  console.log('AsyncTask Component Starting (Pull Mode)')
  console.log(`Instance ID: ${INSTANCE_ID}`)

  const asyncTaskConfig = (appConfig as any).components.asyncTask
  
  // ============================================
  // Part 1: 初始化 Integration（获取 PullModeConfig）
  // 注意：不需要数据库连接！
  // ============================================
  const integration = new AggregatedIntegrationClass({
    entities, relations, activities, interactions, dict: dicts
  })
  await integration.configure?.()
  
  // 收集所有启用 Pull Mode 的 Integration 配置
  const pullModeConfigs = integration
    .getIntegrations()
    .flatMap(({ namespace, integration }) => {
      const cfg = integration.getPullModeConfig?.()
      if (cfg?.enabled) {
        console.log(`[PullMode] Enabled for ${namespace}`)
        return [{ namespace, config: cfg }]
      }
      return []
    })

  console.log(`[PullMode] Found ${pullModeConfigs.length} enabled integrations`)

  // ============================================
  // Part 2: 启动 Temporal Workers
  // ============================================
  const integrationsPath = path.join(__dirname, '..', 'integrations')
  const workflowInfos = collectIntegrationWorkflows(integrationsPath, ['example_', 'docs'])
  const workerManager = new WorkerManager(
    asyncTaskConfig.temporal.address,
    asyncTaskConfig.temporal.namespace
  )

  if (workflowInfos.length > 0) {
    console.log(`[Workers] Starting ${workflowInfos.length} worker(s)`)
    await workerManager.connect()
    await workerManager.createWorkers(workflowInfos)
    await workerManager.startAll()
  }

  // ============================================
  // Part 3: 启动 Task Processor（无数据库连接！）
  // ============================================
  if (pullModeConfigs.length > 0) {
    const taskProcessor = new TaskProcessor({
      instanceId: INSTANCE_ID,
      pollIntervalMs: asyncTaskConfig.pullMode?.pollIntervalMs || 1000,
      batchSize: asyncTaskConfig.pullMode?.batchSize || 10,
      temporalAddress: asyncTaskConfig.temporal.address,
      temporalNamespace: asyncTaskConfig.temporal.namespace,
      internalToken: asyncTaskConfig.internalApiToken
    })

    await taskProcessor.start(pullModeConfigs)
    console.log('[TaskProcessor] Started')

    // 优雅关闭
    const shutdown = async () => {
      console.log('Shutting down...')
      await taskProcessor.stop()
      await workerManager.stopAll()
      await workerManager.disconnect()
      process.exit(0)
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  }

  console.log('AsyncTask Component is running')

  // 保持进程运行
  await new Promise(() => {})
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
```

#### 5.2 移除数据库相关导入和初始化

确保移除以下内容：
- `import { MongoStorage } from 'interaqt'`
- `storage.connect()` 调用
- 任何直接的 `storage.find()` / `storage.update()` 调用

### 测试

#### 测试 5.1：启动测试（无数据库依赖）

```bash
# 确保 Temporal 在运行，但不需要数据库
# 临时禁用数据库环境变量
unset DATABASE_URL

# 尝试启动 AsyncTask Component
npm run dev:async-task
```

**预期结果**：
- AsyncTask Component 成功启动
- 日志显示 "Pull Mode" 已启用
- 不会因为缺少数据库连接而失败

#### 测试 5.2：验证无数据库调用

```typescript
// tests/async-task-component/startAsyncTask.test.ts

import { describe, it, expect, vi } from 'vitest'

describe('startAsyncTask', () => {
  it('should not import database modules', async () => {
    // 检查 startAsyncTask.ts 文件中不包含数据库导入
    const fs = await import('fs')
    const content = fs.readFileSync(
      'async-task-component/startAsyncTask.ts', 
      'utf-8'
    )
    
    expect(content).not.toContain('MongoStorage')
    expect(content).not.toContain('storage.connect')
    expect(content).not.toContain('storage.find')
    expect(content).not.toContain('storage.update')
  })
})
```

```bash
npx vitest run tests/async-task-component/startAsyncTask.test.ts
```

**预期结果**：验证代码中不含数据库调用。

---

## 第六步：修改 Workflow 移除 queued 报告

### 目标
从所有 Workflow 中移除开头的 queued 状态报告，因为这个责任现在由 Task Processor 承担。

### 实施内容

#### 6.1 修改 fangzhouVideoGeneration workflow

```typescript
// integrations/fangzhouVideoGeneration/workflows/index.ts

export async function videoPollingWorkflow(
  params: VideoPollingWorkflowParams
): Promise<VideoPollingWorkflowResult> {
  
  // ============================================
  // 移除：不再在这里报告 queued 状态
  // Task Processor 已经在启动 workflow 之前报告了 queued
  // ============================================
  
  // Step 1: 创建外部任务
  const createResult = await createVideoTask({
    requestParams: params.requestParams,
    apiKey: params.apiKey,
    baseUrl: params.baseUrl,
    model: params.model
  })

  if (!createResult.success || !createResult.taskId) {
    await reportToMain({
      callbackUrl: params.callbackUrl,
      status: 'failed',
      apiCallId: params.apiCallId,
      error: createResult.error
    })
    return { success: false, status: 'failed', error: createResult.error }
  }

  // Step 2: 报告 processing 状态（保持不变）
  await reportToMain({
    callbackUrl: params.callbackUrl,
    status: 'processing',
    apiCallId: params.apiCallId,
    taskId: createResult.taskId
  })

  // Step 3: 轮询等待结果（保持不变）
  // ...
}
```

#### 6.2 修改 nanobanana2ImageGeneration workflow

同上，移除 queued 状态报告。

### 测试

#### 测试 6.1：Workflow 单元测试

```typescript
// tests/integrations/fangzhouVideoGeneration/workflow.test.ts

import { describe, it, expect, vi } from 'vitest'
import { videoPollingWorkflow } from '@/integrations/fangzhouVideoGeneration/workflows/index.js'

// Mock activities
vi.mock('../activities', () => ({
  createVideoTask: vi.fn(),
  pollVideoStatus: vi.fn(),
  reportToMain: vi.fn()
}))

describe('videoPollingWorkflow', () => {
  it('should NOT report queued status', async () => {
    const { reportToMain } = await import('../activities')
    
    // 设置 mock 返回值
    // ...
    
    await videoPollingWorkflow({
      apiCallId: 'test-id',
      requestParams: {},
      callbackUrl: 'http://test/callback',
      apiKey: 'key',
      baseUrl: 'http://api',
      model: 'model'
    })

    // 验证 reportToMain 没有被调用 status: 'queued'
    const queuedCalls = (reportToMain as any).mock.calls.filter(
      c => c[0].status === 'queued'
    )
    expect(queuedCalls.length).toBe(0)
  })

  it('should report processing status after task creation', async () => {
    const { reportToMain, createVideoTask } = await import('../activities')
    
    ;(createVideoTask as any).mockResolvedValue({ 
      success: true, 
      taskId: 'external-task-id' 
    })
    
    await videoPollingWorkflow({
      apiCallId: 'test-id',
      requestParams: {},
      callbackUrl: 'http://test/callback',
      apiKey: 'key',
      baseUrl: 'http://api',
      model: 'model'
    })

    // 验证 reportToMain 被调用 status: 'processing'
    const processingCalls = (reportToMain as any).mock.calls.filter(
      c => c[0].status === 'processing'
    )
    expect(processingCalls.length).toBe(1)
  })
})
```

```bash
npx vitest run tests/integrations/fangzhouVideoGeneration/workflow.test.ts
```

**预期结果**：Workflow 不再报告 queued 状态。

---

## 第七步：实现 getPullModeConfig()

### 目标
在每个需要支持拉模式的 Integration 中实现 `getPullModeConfig()` 方法，并将 `createSideEffects()` 改为返回空数组。

### 实施内容

#### 7.1 修改 fangzhouVideoGeneration Integration

```typescript
// integrations/fangzhouVideoGeneration/index.ts

import { 
  IIntegration, 
  IIntegrationConstructorArgs, 
  API, 
  PullModeConfig,
  buildAPIPath 
} from '@/integrations/index.js'

const FETCH_PENDING_TASKS_API_NAME = 'fetchPendingTasks'
const REPORT_RESULT_API_NAME = 'reportFangzhouVideoResult'
const TASK_QUEUE = 'integration-fangzhouvideogeneration-queue'

export function createFangzhouVideoGenerationIntegration(config: FangzhouVideoGenerationConfig) {
  
  return class FangzhouVideoGenerationIntegration implements IIntegration {
    private readonly namespace: string
    
    constructor(public args: IIntegrationConstructorArgs) {
      this.namespace = args.namespace
    }
    
    /**
     * 返回 Pull Mode 配置
     */
    getPullModeConfig(): PullModeConfig {
      return {
        enabled: true,
        taskQueue: TASK_QUEUE,
        workflowName: 'videoPollingWorkflow',
        buildWorkflowId: (apiCall) => `${apiCall.id}`,
        buildWorkflowParams: (apiCall) => ({
          apiCallId: apiCall.id,
          requestParams: apiCall[config.apiCallEntity.fields.requestParams],
          callbackUrl: `${config.mainEndpoint}/${buildAPIPath(this.namespace, REPORT_RESULT_API_NAME)}`,
          apiKey: config.external.apiKey,
          baseUrl: config.external.baseUrl,
          model: config.external.model
        }),
        internalAPIs: {
          fetchPendingTasks: `${config.mainEndpoint}/${buildAPIPath(this.namespace, FETCH_PENDING_TASKS_API_NAME)}`,
          reportTaskEvent: `${config.mainEndpoint}/${buildAPIPath(this.namespace, REPORT_RESULT_API_NAME)}`
        }
      }
    }
    
    /**
     * 移除 Side Effect - 拉模式下不需要
     */
    createSideEffects(): RecordMutationSideEffect<any>[] {
      return []  // 不再在 Main Component 中启动 workflow
    }
    
    // ... 其他方法保持不变
  }
}
```

#### 7.2 修改 nanobanana2ImageGeneration Integration

同上模式实现 `getPullModeConfig()` 并返回空的 Side Effects。

### 测试

#### 测试 7.1：getPullModeConfig 返回值测试

```typescript
// tests/integrations/getPullModeConfig.test.ts

import { describe, it, expect } from 'vitest'
import { createFangzhouVideoGenerationIntegration } from '@/integrations/fangzhouVideoGeneration/index.js'
import { createNanobanana2ImageGenerationIntegration } from '@/integrations/nanobanana2ImageGeneration/index.js'

describe('getPullModeConfig', () => {
  describe('fangzhouVideoGeneration', () => {
    it('should return valid PullModeConfig', () => {
      const IntegrationClass = createFangzhouVideoGenerationIntegration({
        mainEndpoint: 'http://main:3000',
        apiCallEntity: { /* ... */ },
        external: { apiKey: 'key', baseUrl: 'http://api', model: 'model' }
      })
      
      const integration = new IntegrationClass({
        namespace: 'fangzhouVideoGeneration',
        entities: [],
        relations: [],
        activities: [],
        interactions: [],
        dict: {}
      })
      
      const config = integration.getPullModeConfig()
      
      expect(config).toBeDefined()
      expect(config!.enabled).toBe(true)
      expect(config!.taskQueue).toBe('integration-fangzhouvideogeneration-queue')
      expect(config!.workflowName).toBe('videoPollingWorkflow')
      expect(typeof config!.buildWorkflowId).toBe('function')
      expect(typeof config!.buildWorkflowParams).toBe('function')
      expect(config!.internalAPIs.fetchPendingTasks).toContain('fetchPendingTasks')
      expect(config!.internalAPIs.reportTaskEvent).toContain('reportFangzhouVideoResult')
    })

    it('should build correct workflowId', () => {
      // ...
      const config = integration.getPullModeConfig()
      const workflowId = config!.buildWorkflowId({ id: 'task-123' })
      
      expect(workflowId).toBe('task-123')
    })

    it('should build correct workflowParams', () => {
      // ...
      const config = integration.getPullModeConfig()
      const params = config!.buildWorkflowParams({ 
        id: 'task-123', 
        requestParams: { prompt: 'test' } 
      })
      
      expect(params.apiCallId).toBe('task-123')
      expect(params.requestParams).toEqual({ prompt: 'test' })
      expect(params.callbackUrl).toContain('reportFangzhouVideoResult')
    })
  })

  describe('nanobanana2ImageGeneration', () => {
    it('should return valid PullModeConfig', () => {
      // 同上测试
    })
  })
})
```

```bash
npx vitest run tests/integrations/getPullModeConfig.test.ts
```

**预期结果**：所有 Integration 返回正确的 PullModeConfig。

#### 测试 7.2：createSideEffects 返回空数组测试

```typescript
// tests/integrations/createSideEffects.test.ts

describe('createSideEffects (Pull Mode)', () => {
  it('fangzhouVideoGeneration should return empty array', () => {
    const integration = new FangzhouVideoGenerationIntegration(args)
    const sideEffects = integration.createSideEffects()
    
    expect(sideEffects).toEqual([])
  })

  it('nanobanana2ImageGeneration should return empty array', () => {
    const integration = new Nanobanana2ImageGenerationIntegration(args)
    const sideEffects = integration.createSideEffects()
    
    expect(sideEffects).toEqual([])
  })
})
```

```bash
npx vitest run tests/integrations/createSideEffects.test.ts
```

**预期结果**：Pull Mode 的 Integration 不再产生 Side Effects。

---

## 第八步：配置更新

### 目标
在 `app.config.json` 中添加 Pull Mode 相关配置。

### 实施内容

#### 8.1 更新 app.config.json

```json
{
  "components": {
    "main": {
      // ... 现有配置
    },
    "asyncTask": {
      "temporal": {
        "address": "temporal:7233",
        "namespace": "default"
      },
      "pullMode": {
        "pollIntervalMs": 1000,
        "batchSize": 10
      },
      "internalApiToken": "${INTERNAL_API_TOKEN}"
    }
  }
}
```

#### 8.2 更新 deploy.dev.json 和 deploy.prod.json

添加 `INTERNAL_API_TOKEN` 环境变量配置。

### 测试

#### 测试 8.1：配置加载测试

```typescript
// tests/config/asyncTask.config.test.ts

import { describe, it, expect } from 'vitest'
import { config } from '@/config.js'

describe('AsyncTask Config', () => {
  it('should have temporal configuration', () => {
    expect(config.components.asyncTask.temporal).toBeDefined()
    expect(config.components.asyncTask.temporal.address).toBeDefined()
    expect(config.components.asyncTask.temporal.namespace).toBeDefined()
  })

  it('should have pullMode configuration', () => {
    expect(config.components.asyncTask.pullMode).toBeDefined()
    expect(config.components.asyncTask.pullMode.pollIntervalMs).toBeGreaterThan(0)
    expect(config.components.asyncTask.pullMode.batchSize).toBeGreaterThan(0)
  })

  it('should have internalApiToken when env is set', () => {
    // 测试环境变量替换
  })
})
```

```bash
npx vitest run tests/config/asyncTask.config.test.ts
```

**预期结果**：配置正确加载。

---

## 第九步：端到端集成测试

### 目标
验证整个拉模式流程从任务创建到完成的完整链路。

### 实施内容

#### 9.1 端到端测试

```typescript
// tests/e2e/pull-mode.e2e.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { 
  startMainComponent, 
  stopMainComponent,
  startAsyncTaskComponent,
  stopAsyncTaskComponent,
  startTemporal,
  stopTemporal
} from '../helpers/e2e-setup.js'

describe('Pull Mode E2E', () => {
  beforeAll(async () => {
    await startTemporal()
    await startMainComponent()
    await startAsyncTaskComponent()
    
    // 等待所有组件就绪
    await waitForReady()
  }, 60000)

  afterAll(async () => {
    await stopAsyncTaskComponent()
    await stopMainComponent()
    await stopTemporal()
  })

  it('should process task from pending to completed', async () => {
    // Step 1: 创建任务
    const createResponse = await fetch(`${MAIN_URL}/api/video/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'test video' })
    })
    
    const { taskId } = await createResponse.json()
    expect(taskId).toBeDefined()

    // Step 2: 等待任务被拉取并变为 queued
    await waitForStatus(taskId, 'queued', 10000)
    
    // Step 3: 等待任务变为 processing
    await waitForStatus(taskId, 'processing', 30000)
    
    // Step 4: 等待任务完成
    await waitForStatus(taskId, 'completed', 120000)
    
    // Step 5: 验证最终状态
    const finalStatus = await getTaskStatus(taskId)
    expect(finalStatus.status).toBe('completed')
    expect(finalStatus.result).toBeDefined()
  }, 180000)

  it('should recover stuck tasks', async () => {
    // 创建一个任务并模拟 stuck
    const { taskId } = await createTask()
    
    // 手动将任务设置为 queued 但不启动 workflow
    await setTaskStatus(taskId, 'queued', Date.now() / 1000 - 600) // 10分钟前
    
    // 等待 TaskProcessor 检测到并恢复
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // 验证任务被重新处理
    const status = await getTaskStatus(taskId)
    expect(['queued', 'processing', 'completed']).toContain(status.status)
  }, 30000)

  it('should handle Temporal unavailable gracefully', async () => {
    // 停止 Temporal
    await stopTemporal()
    
    // 创建任务
    const { taskId } = await createTask()
    
    // 任务应该保持在 pending 状态
    await new Promise(resolve => setTimeout(resolve, 3000))
    const status = await getTaskStatus(taskId)
    expect(status.status).toBe('pending')
    
    // 重启 Temporal
    await startTemporal()
    
    // 等待任务被处理
    await waitForStatus(taskId, 'queued', 30000)
  }, 60000)

  it('should handle multiple TaskProcessor instances', async () => {
    // 启动第二个 AsyncTask Component
    await startAsyncTaskComponent({ instanceId: 'worker-2' })
    
    // 创建多个任务
    const taskIds = await Promise.all([
      createTask(),
      createTask(),
      createTask()
    ])
    
    // 等待所有任务完成
    await Promise.all(taskIds.map(t => waitForStatus(t.taskId, 'completed', 120000)))
    
    // 验证每个任务只被处理一次（workflowId 幂等性）
    for (const { taskId } of taskIds) {
      const events = await getTaskEvents(taskId)
      const queuedEvents = events.filter(e => e.status === 'queued')
      expect(queuedEvents.length).toBe(1)
    }
    
    await stopAsyncTaskComponent({ instanceId: 'worker-2' })
  }, 180000)
})
```

```bash
# 需要 Docker 环境启动 Temporal
npx vitest run tests/e2e/pull-mode.e2e.test.ts
```

**预期结果**：所有端到端测试通过。

---

## 第十步：性能与压力测试

### 目标
验证拉模式在高负载下的性能表现。

### 实施内容

#### 10.1 性能测试

```typescript
// tests/performance/pull-mode.perf.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest'

describe('Pull Mode Performance', () => {
  it('should handle 100 concurrent tasks', async () => {
    const startTime = Date.now()
    
    // 创建 100 个任务
    const tasks = await Promise.all(
      Array.from({ length: 100 }, () => createTask())
    )
    
    const createTime = Date.now() - startTime
    console.log(`Created 100 tasks in ${createTime}ms`)
    
    // 等待所有任务变为 queued
    const queuedStart = Date.now()
    await Promise.all(
      tasks.map(t => waitForStatus(t.taskId, 'queued', 60000))
    )
    const queuedTime = Date.now() - queuedStart
    console.log(`All tasks queued in ${queuedTime}ms`)
    
    expect(queuedTime).toBeLessThan(60000) // 60秒内完成
  }, 120000)

  it('should maintain consistent poll latency under load', async () => {
    const pollLatencies: number[] = []
    
    // 监控 poll 延迟
    const monitor = setInterval(async () => {
      const start = Date.now()
      await fetch(`${MAIN_URL}/api/fangzhouVideoGeneration/fetchPendingTasks`)
      pollLatencies.push(Date.now() - start)
    }, 100)

    // 创建负载
    await Promise.all(Array.from({ length: 50 }, () => createTask()))
    
    // 等待一段时间
    await new Promise(resolve => setTimeout(resolve, 10000))
    
    clearInterval(monitor)
    
    // 分析延迟
    const avgLatency = pollLatencies.reduce((a, b) => a + b, 0) / pollLatencies.length
    const maxLatency = Math.max(...pollLatencies)
    
    console.log(`Avg poll latency: ${avgLatency.toFixed(2)}ms`)
    console.log(`Max poll latency: ${maxLatency}ms`)
    
    expect(avgLatency).toBeLessThan(100) // 平均延迟小于 100ms
    expect(maxLatency).toBeLessThan(500) // 最大延迟小于 500ms
  }, 30000)
})
```

```bash
npx vitest run tests/performance/pull-mode.perf.test.ts
```

**预期结果**：性能指标满足要求。

---

## 执行检查清单

每完成一个步骤后，使用以下检查清单确认：

### 第一步完成检查
- [ ] `PullModeConfig` 类型已添加到 `integrations/index.ts`
- [ ] `IIntegration` 接口已扩展
- [ ] `buildAPIPath` 函数已添加
- [ ] TypeScript 编译通过
- [ ] 单元测试通过
- [ ] 现有 Integration 测试通过

### 第二步完成检查
- [ ] `createFetchPendingTasksAPI` 工厂函数已创建
- [ ] fangzhouVideoGeneration 已集成 fetchPendingTasks API
- [ ] nanobanana2ImageGeneration 已集成 fetchPendingTasks API
- [ ] API 单元测试通过
- [ ] HTTP 端点测试通过

### 第三步完成检查
- [ ] reportResult API 支持 queued 状态
- [ ] 二次确认逻辑已实现
- [ ] 单元测试通过
- [ ] 并发安全测试通过

### 第四步完成检查
- [ ] `TaskProcessor` 类已创建
- [ ] HTTP 通信逻辑已实现
- [ ] 单元测试（Mock）通过
- [ ] 集成测试通过

### 第五步完成检查
- [ ] `startAsyncTask.ts` 已重构
- [ ] 移除所有数据库依赖
- [ ] 启动测试通过
- [ ] 无数据库调用验证通过

### 第六步完成检查
- [ ] Workflow 已移除 queued 报告
- [ ] Workflow 单元测试通过

### 第七步完成检查
- [ ] 所有 Integration 实现 `getPullModeConfig()`
- [ ] 所有 Integration `createSideEffects()` 返回空数组
- [ ] 配置测试通过
- [ ] Side Effects 测试通过

### 第八步完成检查
- [ ] `app.config.json` 已更新
- [ ] deploy 配置已更新
- [ ] 配置加载测试通过

### 第九步完成检查
- [ ] 端到端测试全部通过
- [ ] 故障恢复测试通过
- [ ] 多实例测试通过

### 第十步完成检查
- [ ] 性能测试通过
- [ ] 压力测试通过
- [ ] 性能指标满足要求

---

## 回滚策略

如果任何步骤出现问题，可以按以下方式回滚：

1. **第1-3步**：只是添加新代码，不影响现有功能，可直接删除新增代码
2. **第4-5步**：恢复 `startAsyncTask.ts` 到原始版本
3. **第6步**：恢复 Workflow 中的 queued 报告
4. **第7步**：恢复 Integration 的 `createSideEffects()` 返回原有 Side Effects
5. **第8步**：恢复配置文件

关键原则：每步完成后确保测试通过，再进入下一步。如果某步测试失败，修复问题而不是跳过。

