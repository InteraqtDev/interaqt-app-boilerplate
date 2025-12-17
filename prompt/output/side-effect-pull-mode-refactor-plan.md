# 副作用任务从推模式改为拉模式的改造方案（API 通信架构）

## 1. 问题分析

### 1.1 当前架构（推模式）

```
┌─────────────────────┐     事件触发      ┌──────────────────┐     启动 workflow     ┌─────────────────┐
│   Main Component    │ ──────────────────▶│   Integration    │ ─────────────────────▶│ Temporal Server │
│   (记录变更事件)     │   RecordMutation   │   Side Effect    │   workflow.start()   │                 │
└─────────────────────┘   SideEffect       └──────────────────┘                       └─────────────────┘
                                                    │                                        │
                                                    ▼                                        ▼
                                           如果 Temporal 宕机                        ┌─────────────────┐
                                           workflow 启动失败                         │    Worker       │
                                           任务丢失！                                │ (startAsyncTask)│
                                                                                     └─────────────────┘
```

**问题点**：
1. Side Effect 中直接调用 `temporalClient.workflow.start()`
2. 如果 Temporal 服务不可用，调用失败，任务永久丢失

### 1.2 目标架构（拉模式 - API 通信）

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              Main Component                                          │
│  ┌─────────────────┐      ┌──────────────────────────────────────────────────────┐  │
│  │  用户调用 API    │      │  Integration 提供的 Internal APIs                    │  │
│  │  创建 APICall   │      │                                                      │  │
│  │  status:pending │      │  GET  /internal/{ns}/tasks/pending  → 返回待处理任务  │  │
│  └─────────────────┘      │  POST /internal/{ns}/tasks/:id/events → 创建 Event   │  │
│          │                └──────────────────────────────────────────────────────┘  │
│          ▼                                      ▲                                    │
│  ┌─────────────────┐                           │ HTTP 调用                          │
│  │    Database     │◀──────────────────────────┤                                    │
│  │  (唯一操作者)    │                           │                                    │
│  └─────────────────┘                           │                                    │
└─────────────────────────────────────────────────┼────────────────────────────────────┘
                                                  │
                                                  │
┌─────────────────────────────────────────────────┼────────────────────────────────────┐
│                        Async Task Component     │                                    │
│                                                 │                                    │
│  ┌─────────────────────────────────────────────┴──────────────────────────────────┐ │
│  │                           Task Processor                                        │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                             │ │
│  │  │ Instance 1  │  │ Instance 2  │  │ Instance N  │   (无数据库连接)             │ │
│  │  │ HTTP 拉取   │  │ HTTP 拉取   │  │ HTTP 拉取   │                             │ │
│  │  │ HTTP 报告   │  │ HTTP 报告   │  │ HTTP 报告   │                             │ │
│  │  │ 幂等启动wf  │  │ 幂等启动wf  │  │ 幂等启动wf  │                             │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                             │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
│                                        │                                             │
│                                        ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐│
│  │                          Temporal Workers (执行 workflow)                        ││
│  └─────────────────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**核心设计**：
1. **Main Component 是唯一的数据库操作者**：所有数据读写都通过 Main Component 的 API
2. **Async Task Component 通过 HTTP 通信**：fetch 任务和 report 事件都通过 HTTP 调用 Main Component
3. **workflowId 使用确定性 ID（`${namespace}:${APICall.id}`）**：幂等启动
4. **移除 Side Effect**：不再在 Main Component 中启动 workflow
5. **Workflow 移除 queued 报告**：由 Task Processor 负责触发 `pending -> queued`

### 1.3 关键设计原则

> ⚠️ **必须遵守**：状态变更通过创建 Event 实体触发 StateMachine，**不能直接调用 `storage.update()` 修改 status**。

---

## 2. 详细设计

### 2.1 字段映射（零新增字段）

完全复用现有 APICall 实体字段：

| 字段 | 拉模式用途 |
|---------|-----------|
| `status` | 任务状态筛选（pending/failed/queued） |
| `startedAt` | Stuck 任务检测（超时恢复） |
| `attempts` | 限制最大重试次数 |
| `externalId` | 外部系统 taskId |
| `requestParams` | 构建 workflow 参数 |
| `createdAt` | 任务排序（FIFO） |
| `error` | 记录错误信息 |

### 2.2 PullModeConfig 配置

```typescript
// integrations/index.ts

export type PullModeConfig = {
  enabled: boolean
  
  // Temporal 配置
  taskQueue: string
  workflowName: string
  buildWorkflowId: (apiCall: any) => string
  buildWorkflowParams: (apiCall: any) => any
  
  // Internal API 端点（完整 URL，由 getPullModeConfig 构建）
  internalAPIs: {
    fetchPendingTasks: string   // e.g. 'http://main:3000/api/fangzhou/fetchPendingTasks'
    reportTaskEvent: string     // 复用现有 reportResult API
  }
}

export type IIntegration = {
  configure?:() => Promise<any>
  setup?:(controller: Controller) => Promise<any>
  createSideEffects:() => RecordMutationSideEffect<any>[]
  createAPIs?: () => API[]
  createMiddlewares?: () => MiddlewareHandler[]
  getPullModeConfig?: () => PullModeConfig | null
}
```

### 2.3 Integration 实现

Integration 需要：
1. 在 `getPullModeConfig()` 中构建配置（需要用到 `this.namespace`）
2. 在 `createAPIs()` 中添加 `fetchPendingTasks` API
3. 复用现有 `reportResult` API 来报告 queued 事件
4. `createSideEffects()` 返回空数组

```typescript
// integrations/fangzhouVideoGeneration/index.ts

import { Controller, RecordMutationSideEffect, MatchExp } from 'interaqt'
import { IIntegration, IIntegrationConstructorArgs, API, buildAPIPath } from '@/integrations/index'

export const FETCH_PENDING_TASKS_API_NAME = 'fetchPendingTasks'
export const REPORT_RESULT_API_NAME = 'reportFangzhouVideoResult'

const TASK_QUEUE = 'integration-fangzhouvideogeneration-queue'

export function createFangzhouVideoGenerationIntegration(config: FangzhouVideoGenerationConfig) {
  
  return class FangzhouVideoGenerationIntegration implements IIntegration {
    private readonly namespace: string
    
    constructor(public args: IIntegrationConstructorArgs) {
      this.namespace = args.namespace
    }
    
    /**
     * 返回 Pull Mode 配置
     * 注意：需要在方法内部构建，因为需要用到 this.namespace
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
          // 使用 buildAPIPath 构建回调 URL
          callbackUrl: `${config.mainEndpoint}/${buildAPIPath(this.namespace, REPORT_RESULT_API_NAME)}`,
          apiKey: config.external.apiKey,
          baseUrl: config.external.baseUrl,
          model: config.external.model
        }),
        internalAPIs: {
          // 使用 buildAPIPath 构建完整 URL
          fetchPendingTasks: `${config.mainEndpoint}/${buildAPIPath(this.namespace, FETCH_PENDING_TASKS_API_NAME)}`,
          // 复用现有 reportResult API 来报告 queued 事件
          reportTaskEvent: `${config.mainEndpoint}/${buildAPIPath(this.namespace, REPORT_RESULT_API_NAME)}`
        }
      }
    }
    
    createSideEffects(): RecordMutationSideEffect<any>[] {
      return []  // 移除 Side Effect
    }
    
    createAPIs(): API[] {
      const self = this
      const { apiCallEntity, eventEntity } = config
      
      return [
        // ============================================
        // Internal API: 拉取待处理任务（新增）
        // ============================================
        {
          name: FETCH_PENDING_TASKS_API_NAME,
          namespace: this.namespace,
          allowAnonymous: false,
          callback: async function(this: Controller, context) {
            const MAX_ATTEMPTS = 5
            const STUCK_TIMEOUT_SECONDS = 300
            const nowSeconds = Math.floor(Date.now() / 1000)
            const limit = context.query?.limit || 10
            
            const pendingCondition = MatchExp.atom({
              key: apiCallEntity.fields.status,
              value: ['=', 'pending']
            })
            
            const failedCondition = MatchExp.atom({
              key: apiCallEntity.fields.status,
              value: ['=', 'failed']
            }).and({
              key: apiCallEntity.fields.attempts,
              value: ['<', MAX_ATTEMPTS]
            })
            
            const stuckCondition = MatchExp.atom({
              key: apiCallEntity.fields.status,
              value: ['=', 'queued']
            }).and({
              key: apiCallEntity.fields.startedAt,
              value: ['<', nowSeconds - STUCK_TIMEOUT_SECONDS]
            }).and({
              key: apiCallEntity.fields.attempts,
              value: ['<', MAX_ATTEMPTS]
            })
            
            const match = pendingCondition.or(failedCondition).or(stuckCondition)
            
            const tasks = await this.system.storage.find(
              apiCallEntity.entityName,
              match,
              { limit, orderBy: { [apiCallEntity.fields.createdAt]: 'asc' } },
              ['id', apiCallEntity.fields.status, apiCallEntity.fields.startedAt,
               apiCallEntity.fields.attempts, apiCallEntity.fields.requestParams]
            )
            
            return { tasks: tasks || [] }
          }
        },
        
        // ============================================
        // Public API: Workflow 回调（现有，扩展支持 queued 状态）
        // ============================================
        {
          name: REPORT_RESULT_API_NAME,
          namespace: this.namespace,
          allowAnonymous: true,  // Temporal worker 调用
          callback: async function(this: Controller, context, params: ReportResultRequest) {
            // ... 现有逻辑 ...
            // 新增对 'queued' 状态的处理（由 Task Processor 调用）
            if (params.status === 'queued') {
              await self.createIntegrationEvent(this, params.apiCallId, null, 'queued', null, null)
              return { success: true, message: 'Queued event created' }
            }
            // ... 其余 processing/completed/failed 处理逻辑不变 ...
          }
        },
        
        // ... queryStatus API 保持不变 ...
      ]
    }
    
    private async createIntegrationEvent(
      controller: Controller,
      entityId: string | null,
      externalId: string | null,
      status: string,
      data: any | null,
      errorMessage: string | null
    ) {
      // ... 现有逻辑不变 ...
    }
  }
}
```

### 2.4 Task Processor（通过 HTTP 通信）

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
  internalToken?: string     // Internal API 认证 token
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
        await this.processTaskType(namespace, config)
      }
      await this.sleep(this.config.pollIntervalMs)
    }
  }

  /**
   * 通过 HTTP 从 Main Component 拉取待处理任务
   * internalAPIs.fetchPendingTasks 已经是完整 URL
   */
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

  /**
   * 通过 HTTP 向 Main Component 报告事件
   * 复用现有 reportResult API，传入 status='queued' 和 apiCallId
   */
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
    
    return response.ok
  }

  private async processTaskType(namespace: string, pullConfig: PullModeConfig): Promise<void> {
    if (!this.temporalClient) return
    
    const tasks = await this.fetchPendingTasks(pullConfig)
    if (tasks.length === 0) return

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
      // Step 1: 通过 HTTP 报告 queued 事件（复用 reportResult API）
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
        return  // 幂等：已存在视为成功
      }

      // Workflow 启动失败，报告 failed 事件
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

### 2.5 Workflow 适配

移除 workflow 开头的 queued 报告（由 Task Processor 负责）：

```typescript
// integrations/fangzhouVideoGeneration/workflows/index.ts

export async function videoPollingWorkflow(
  params: VideoPollingWorkflowParams
): Promise<VideoPollingWorkflowResult> {
  
  // 不再报告 queued（已由 Task Processor 通过 HTTP 报告）
  
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
      apiCallId: params.apiCallId
    })
    return { success: false, status: 'failed', error: createResult.error }
  }

  // Step 2: 报告 processing 状态
  await reportToMain({
    callbackUrl: params.callbackUrl,
    status: 'processing',
    apiCallId: params.apiCallId,
    taskId: createResult.taskId
  })

  // Step 3: 轮询等待结果...
}
```

### 2.6 startAsyncTask.ts（无数据库连接）

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
  console.log('AsyncTask Component Starting')
  console.log(`Instance ID: ${INSTANCE_ID}`)

  const asyncTaskConfig = (appConfig as any).components.asyncTask
  
  // ============================================
  // Part 1: 初始化 Integration（获取 PullModeConfig）
  // ============================================
  const integration = new AggregatedIntegrationClass({
    entities, relations, activities, interactions, dict: dicts
  })
  await integration.configure?.()
  
  // PullModeConfig 中的 internalAPIs 已经包含完整 URL
  const pullModeConfigs = integration
    .getIntegrations()
    .flatMap(({ namespace, integration }) => {
      const cfg = integration.getPullModeConfig?.()
      return cfg?.enabled ? [{ namespace, config: cfg }] : []
    })

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
    await workerManager.connect()
    await workerManager.createWorkers(workflowInfos)
    await workerManager.startAll()
  }

  // ============================================
  // Part 3: 启动 Task Processor（无数据库连接！）
  // ============================================
  const taskProcessor = new TaskProcessor({
    instanceId: INSTANCE_ID,
    pollIntervalMs: 1000,
    batchSize: 10,
    temporalAddress: asyncTaskConfig.temporal.address,
    temporalNamespace: asyncTaskConfig.temporal.namespace,
    internalToken: asyncTaskConfig.internalApiToken
  })

  // pullModeConfigs 中已包含完整的 API URLs
  await taskProcessor.start(pullModeConfigs)

  console.log('AsyncTask Component is running')

  // 优雅关闭
  const shutdown = async () => {
    await taskProcessor.stop()
    await workerManager.stopAll()
    await workerManager.disconnect()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  await new Promise(() => {})
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
```

---

## 3. 并发安全策略

### 3.1 多层防护机制

#### 第一层：二次确认状态

`reportTaskEvent` API 在创建 Event 前会检查当前状态：

```typescript
// Integration 的 reportTaskEvent API 中
const currentTask = await this.system.storage.findOne(...)
if (currentTask.status !== 'pending' && currentTask.status !== 'failed') {
  return { success: false, error: 'Task already processed' }
}
```

#### 第二层：StateMachine 状态转换约束

即使创建了重复的 queued Event，StateMachine 只响应有效的状态转换：
- `pending -> queued`：✅ 第一个 Event 有效
- `queued -> queued`：❌ 无效

#### 第三层：Temporal workflowId 幂等性

```typescript
const workflowId = `${namespace}:${apiCall.id}`  // 确定性 ID
// Temporal 保证相同 workflowId 只启动一次
```

### 3.2 Stuck 任务恢复

`fetchPendingTasks` API 会返回超时的 queued 任务：

```typescript
// status = 'queued' AND startedAt < (now - 5分钟) AND attempts < MAX
const stuckCondition = MatchExp.atom({ key: 'status', value: ['=', 'queued'] })
  .and({ key: 'startedAt', value: ['<', nowSeconds - 300] })
  .and({ key: 'attempts', value: ['<', 5] })
```

---

## 4. 数据流

```
1. 用户调用 API 创建 FangzhouCall 记录
   - status: pending
   - startedAt: NULL

2. Task Processor 通过 HTTP 拉取待处理任务
   GET /api/fangzhouVideoGeneration/fetchPendingTasks
   
3. Task Processor 通过 HTTP 报告 queued 事件（复用 reportResult API）
   POST /api/fangzhouVideoGeneration/reportFangzhouVideoResult
   { apiCallId: 'xxx', status: 'queued' }
   
4. Task Processor 幂等启动 Temporal workflow
   workflowId = `fangzhouVideoGeneration:${apiCall.id}`

5. Workflow 执行并通过同一 callback API 更新状态
   POST /api/fangzhouVideoGeneration/reportFangzhouVideoResult
   { apiCallId: 'xxx', status: 'processing' | 'completed' | 'failed' }
```

---

## 5. 水平扩展

```bash
# 启动多个实例
npm run dev:async-task &  # worker-a1b2c3
npm run dev:async-task &  # worker-d4e5f6
```

每个实例：
- 有独立的 `INSTANCE_ID`
- 通过 HTTP 从 Main Component 拉取任务（无数据库连接）
- 正确性依赖 workflowId 幂等性

K8s 部署：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: async-task-worker
spec:
  replicas: 5
  template:
    spec:
      containers:
      - name: worker
        image: your-registry/async-task:latest
        env:
        - name: MAIN_ENDPOINT
          value: "http://main-component:3000"
        - name: INTERNAL_API_TOKEN
          valueFrom:
            secretKeyRef:
              name: async-task-secrets
              key: internal-token
```

---

## 6. 优势总结

| 对比项 | 推模式（当前） | 拉模式（API 通信） |
|--------|---------------|-------------------|
| **数据库连接** | Main + AsyncTask 都需要 | **只有 Main Component** |
| **架构边界** | 模糊 | **清晰分离** |
| **Temporal 宕机** | 任务丢失 | 任务持久化，自动重试 |
| **Stuck 任务** | 无法恢复 | 自动检测并恢复 |
| **安全性** | AsyncTask 需要 DB 凭据 | **只需 API Token** |
| **一致性** | workflow 用 HTTP，Task Processor 用 Storage | **统一使用 HTTP** |

---

## 7. 迁移步骤

### Phase 1：代码改造

1. 在 `IIntegration` 接口中添加 `getPullModeConfig()` 方法
2. 修改 Integration 实现：
   - 添加 `fetchPendingTasks` 和 `reportTaskEvent` Internal APIs
   - `createSideEffects()` 返回空数组
   - 实现 `getPullModeConfig()`
3. 创建新的 `TaskProcessor`（HTTP 通信版本）
4. 修改 `startAsyncTask.ts`（移除数据库初始化）
5. 修改 Workflow 移除 queued 状态报告

### Phase 2：配置更新

在 `app.config.json` 中添加（注意 `mainEndpoint` 在各 Integration 配置中已存在）：

```json
{
  "components": {
    "asyncTask": {
      "temporal": {
        "address": "temporal:7233",
        "namespace": "default"
      },
      "internalApiToken": "your-secret-token"
    }
  }
}
```

### Phase 3：部署

1. 部署更新后的 Main Component
2. 部署新的 Async Task Component
3. 验证任务处理流程

---

## 8. 架构总结

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              共用代码库                                  │
│                                                                         │
│  ┌─────────────────┐         ┌─────────────────────────────────────┐   │
│  │  startMain.ts   │         │        startAsyncTask.ts           │   │
│  │                 │         │                                     │   │
│  │  ┌───────────┐  │         │  ┌─────────────────────────────┐   │   │
│  │  │ Database  │  │  HTTP   │  │     Task Processor          │   │   │
│  │  └───────────┘  │◀────────┼──│     (无数据库连接)           │   │   │
│  │       ▲         │         │  │                             │   │   │
│  │       │         │         │  │  fetchPendingTasks API      │   │   │
│  │  Integration    │         │  │  reportResult API           │   │   │
│  │  APIs           │         │  │  启动 Workflow              │   │   │
│  │                 │         │  └─────────────────────────────┘   │   │
│  │                 │         │                                     │   │
│  │                 │         │  ┌─────────────────────────────┐   │   │
│  │                 │         │  │     Temporal Workers        │   │   │
│  │                 │         │  │     (执行 workflow)         │   │   │
│  └─────────────────┘         │  └─────────────────────────────┘   │   │
│                              └─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

**核心理念**：
1. **Main Component 是唯一的数据库操作者**
2. **Async Task Component 通过 HTTP 调用 Integration APIs**
3. **复用现有 reportResult API**：Task Processor 和 Workflow 使用同一个 API 报告状态
4. **零新增字段**：复用现有 APICall 字段
5. **多层并发安全**：二次确认 + StateMachine 约束 + workflowId 幂等
