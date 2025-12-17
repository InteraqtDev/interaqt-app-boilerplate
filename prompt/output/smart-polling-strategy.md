# 智能任务轮询策略设计方案（基于 Temporal 官方推荐）

## 1. 核心发现

### 1.1 Temporal 内置的 WorkerTuner

Temporal SDK 提供了 **`WorkerTuner`** 用于资源感知的并发控制，这是官方推荐的做法。

```typescript
// @temporalio/worker 提供的 WorkerTuner 类型
export type WorkerTuner = ResourceBasedTuner | TunerHolder

// 资源感知调优器
export interface ResourceBasedTuner {
  tunerOptions: {
    targetMemoryUsage: number  // 目标内存使用率 (0-1)
    targetCpuUsage: number     // 目标 CPU 使用率 (0-1)
  }
  workflowTaskSlotOptions?: ResourceBasedSlotOptions
  activityTaskSlotOptions?: ResourceBasedSlotOptions
  localActivityTaskSlotOptions?: ResourceBasedSlotOptions
}

export interface ResourceBasedSlotOptions {
  minimumSlots?: number    // 最小槽位数
  maximumSlots?: number    // 最大槽位数
  rampThrottle?: Duration  // 新增槽位的节流间隔
}
```

### 1.2 三种槽位供应器

| 类型 | 描述 | 使用场景 |
|------|------|----------|
| `ResourceBasedTuner` | 根据 CPU/内存自动调整槽位 | **生产推荐** |
| `FixedSizeSlotSupplier` | 固定数量槽位 | 简单场景 |
| `CustomSlotSupplier` | 完全自定义 | 特殊需求 |

### 1.3 队列深度查询 API

Temporal 提供了 `describeTaskQueue` API 用于查询任务队列状态：

```typescript
// 通过 workflowService 调用
const response = await client.workflowService.describeTaskQueue({
  namespace: 'default',
  taskQueue: { name: 'my-task-queue' },
  reportStats: true,  // 获取统计信息
})

// 响应中的关键字段
interface TaskQueueStats {
  approximateBacklogCount: Long   // 积压任务的近似数量
  approximateBacklogAge: Duration // 队列最老任务的年龄
  tasksAddRate: number            // 30秒平均任务添加速率
  tasksDispatchRate: number       // 30秒平均任务分发速率
}
```

---

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Async Task Component                                 │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    TaskProcessor                                      │   │
│  │                                                                        │   │
│  │  职责：                                                                │   │
│  │  1. HTTP 轮询获取待处理任务                                            │   │
│  │  2. 查询 Task Queue 深度，实现背压控制                                  │   │
│  │  3. 调用 workflow.start() 提交任务                                     │   │
│  │  4. 报告状态给 Main Component                                          │   │
│  │                                                                        │   │
│  │  特点：                                                                │   │
│  │  • 自适应轮询间隔（避免空轮询）                                         │   │
│  │  • 队列深度感知（防止队列无限堆积）                                      │   │
│  │                                                                        │   │
│  └───────────────────────────────┬──────────────────────────────────────┘   │
│                                  │                                           │
│                                  │ workflow.start()                          │
│                                  ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      Temporal Server                                  │   │
│  │                                                                        │   │
│  │  Task Queue：                                                          │   │
│  │  • 存储等待执行的任务                                                   │   │
│  │  • 提供队列深度查询 API                                                 │   │
│  │  • TaskProcessor 通过查询深度来控制提交速率                             │   │
│  │                                                                        │   │
│  └───────────────────────────────┬──────────────────────────────────────┘   │
│                                  │                                           │
│                                  │ Worker 拉取任务                           │
│                                  ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │              Temporal Worker + ResourceBasedTuner                     │   │
│  │                                                                        │   │
│  │  ┌────────────────────────────────────────────────────────────────┐   │   │
│  │  │                   ResourceBasedTuner                            │   │   │
│  │  │                                                                  │   │   │
│  │  │  targetCpuUsage: 0.7        targetMemoryUsage: 0.8              │   │   │
│  │  │                                                                  │   │   │
│  │  │  ┌─────────────────┐  ┌─────────────────┐                       │   │   │
│  │  │  │ Workflow Slots  │  │ Activity Slots  │                       │   │   │
│  │  │  │ min: 2          │  │ min: 1          │                       │   │   │
│  │  │  │ max: 100        │  │ max: 200        │                       │   │   │
│  │  │  │ ramp: 10ms      │  │ ramp: 50ms      │                       │   │   │
│  │  │  └─────────────────┘  └─────────────────┘                       │   │   │
│  │  │                                                                  │   │   │
│  │  │  自动根据 CPU/内存 动态调整可用槽位数                              │   │   │
│  │  └────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                        │   │
│  │  当 CPU > 70% 或 内存 > 80% 时：                                       │   │
│  │  • 减少从 Task Queue 拉取任务的并发                                    │   │
│  │  • 任务在 Task Queue 中等待                                            │   │
│  │  • TaskProcessor 通过查询队列深度感知积压                               │   │
│  │                                                                        │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 核心理念

**两层背压机制**：

1. **TaskProcessor 层**：通过查询 Task Queue 深度，当积压超过阈值时暂停拉取新任务
2. **Worker 层**：通过 ResourceBasedTuner 根据 CPU/内存控制任务执行并发

**重要说明**：`workflow.start()` 是异步非阻塞的，它只是向 Temporal Server 提交任务，不会等待 Worker 有空闲槽位。因此需要 TaskProcessor 主动查询队列深度来实现背压。

---

## 3. 实现方案

### 3.1 Worker Manager 改造（使用 ResourceBasedTuner）

```typescript
// async-task-component/worker-manager.ts

import { Worker, NativeConnection, bundleWorkflowCode } from '@temporalio/worker'
import type { IntegrationWorkflowInfo } from './workflow-collector.js'

export interface WorkerTunerConfig {
  /** 目标 CPU 使用率 (0-1) */
  targetCpuUsage: number
  /** 目标内存使用率 (0-1) */
  targetMemoryUsage: number
  /** Workflow 槽位配置 */
  workflowSlots: {
    minimum: number
    maximum: number
    rampThrottleMs: number
  }
  /** Activity 槽位配置 */
  activitySlots: {
    minimum: number
    maximum: number
    rampThrottleMs: number
  }
}

const DEFAULT_TUNER_CONFIG: WorkerTunerConfig = {
  targetCpuUsage: 0.7,
  targetMemoryUsage: 0.8,
  workflowSlots: {
    minimum: 2,
    maximum: 100,
    rampThrottleMs: 10
  },
  activitySlots: {
    minimum: 1,
    maximum: 200,
    rampThrottleMs: 50
  }
}

export class WorkerManager {
  private connection: NativeConnection | null = null
  private workers: Map<string, WorkerInstance> = new Map()
  private readonly temporalAddress: string
  private readonly namespace: string
  private readonly tunerConfig: WorkerTunerConfig

  constructor(
    temporalAddress: string, 
    namespace: string = 'default',
    tunerConfig: WorkerTunerConfig = DEFAULT_TUNER_CONFIG
  ) {
    this.temporalAddress = temporalAddress
    this.namespace = namespace
    this.tunerConfig = tunerConfig
  }

  async createWorkers(workflowInfos: IntegrationWorkflowInfo[]): Promise<void> {
    if (!this.connection) {
      throw new Error('Not connected to Temporal Server')
    }

    for (const info of workflowInfos) {
      try {
        const workflowBundle = await bundleWorkflowCode({
          workflowsPath: path.join(info.workflowsPath, 'index.ts'),
        })

        // 使用 Temporal 官方的 ResourceBasedTuner
        const worker = await Worker.create({
          connection: this.connection,
          namespace: this.namespace,
          taskQueue: info.taskQueue,
          workflowBundle,
          activities: await this.loadActivities(info),
          
          // ✅ 关键：使用 ResourceBasedTuner
          tuner: {
            tunerOptions: {
              targetCpuUsage: this.tunerConfig.targetCpuUsage,
              targetMemoryUsage: this.tunerConfig.targetMemoryUsage,
            },
            workflowTaskSlotOptions: {
              minimumSlots: this.tunerConfig.workflowSlots.minimum,
              maximumSlots: this.tunerConfig.workflowSlots.maximum,
              rampThrottle: `${this.tunerConfig.workflowSlots.rampThrottleMs}ms`,
            },
            activityTaskSlotOptions: {
              minimumSlots: this.tunerConfig.activitySlots.minimum,
              maximumSlots: this.tunerConfig.activitySlots.maximum,
              rampThrottle: `${this.tunerConfig.activitySlots.rampThrottleMs}ms`,
            },
          },
        })

        this.workers.set(info.integrationName, {
          worker,
          integrationName: info.integrationName,
          taskQueue: info.taskQueue,
          running: false,
        })

        console.log(`[WorkerManager] Worker created with ResourceBasedTuner for ${info.integrationName}`)

      } catch (error: any) {
        console.error(`[WorkerManager] Failed to create worker for ${info.integrationName}:`, error.message)
      }
    }
  }

  // ... 其他方法保持不变 ...
}
```

### 3.2 Task Processor（自适应轮询 + 队列深度背压）

```typescript
// async-task-component/task-processor.ts

import { Client, Connection, WorkflowExecutionAlreadyStartedError } from '@temporalio/client'
import { PullModeConfig } from '@/integrations/index.js'

export interface TaskProcessorConfig {
  instanceId: string
  temporalAddress: string
  temporalNamespace: string
  internalToken?: string
  
  /** 自适应轮询配置 */
  polling: {
    /** 最小轮询间隔 (ms) */
    minIntervalMs: number
    /** 最大轮询间隔 (ms) */
    maxIntervalMs: number
    /** 退避乘数 */
    backoffMultiplier: number
    /** 触发退避的连续空轮询次数 */
    emptyPollsBeforeBackoff: number
    /** 每次拉取的批量大小 */
    batchSize: number
  }
  
  /** 队列深度背压配置 */
  backpressure: {
    /** 最大允许的队列积压数量 */
    maxQueueBacklog: number
    /** 队列深度查询间隔 (ms) */
    queueCheckIntervalMs: number
    /** 积压过高时的等待时间 (ms) */
    backoffWhenOverloadedMs: number
  }
}

const DEFAULT_CONFIG: TaskProcessorConfig = {
  instanceId: 'worker-default',
  temporalAddress: 'localhost:7233',
  temporalNamespace: 'default',
  polling: {
    minIntervalMs: 100,
    maxIntervalMs: 5000,
    backoffMultiplier: 1.5,
    emptyPollsBeforeBackoff: 3,
    batchSize: 10
  },
  backpressure: {
    maxQueueBacklog: 100,
    queueCheckIntervalMs: 5000,
    backoffWhenOverloadedMs: 2000
  }
}

/**
 * TaskProcessor
 * 
 * 核心职责：
 * - 从 Main Component 拉取待处理任务
 * - 查询 Task Queue 深度实现背压
 * - 提交 workflow 到 Temporal
 * - 自适应轮询避免空轮询浪费
 */
export class TaskProcessor {
  private isRunning = false
  private temporalClient?: Client
  private temporalConnection?: Connection
  private pullModeConfigs: Array<{ namespace: string; config: PullModeConfig }> = []
  
  // 自适应轮询状态
  private currentIntervalMs: number
  private consecutiveEmptyPolls = 0
  
  // 队列深度缓存（避免每次提交都查询）
  private queueBacklogCache: Map<string, { count: number; timestamp: number }> = new Map()

  constructor(private config: TaskProcessorConfig = DEFAULT_CONFIG) {
    this.currentIntervalMs = config.polling.minIntervalMs
  }

  async start(
    pullModeConfigs: Array<{ namespace: string; config: PullModeConfig }>
  ): Promise<void> {
    this.pullModeConfigs = pullModeConfigs
    this.isRunning = true
    
    console.log(`[TaskProcessor:${this.config.instanceId}] Starting with adaptive polling + queue backpressure`)
    console.log(`  Polling: ${this.config.polling.minIntervalMs}ms - ${this.config.polling.maxIntervalMs}ms`)
    console.log(`  Backpressure: max backlog ${this.config.backpressure.maxQueueBacklog}`)
    
    await this.connectTemporal()
    this.startPollingLoop()
    
    console.log(`[TaskProcessor:${this.config.instanceId}] Started successfully`)
  }

  async stop(): Promise<void> {
    console.log(`[TaskProcessor:${this.config.instanceId}] Stopping...`)
    this.isRunning = false
    await this.temporalConnection?.close()
    console.log(`[TaskProcessor:${this.config.instanceId}] Stopped`)
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

  private startPollingLoop(): void {
    this.runPollingLoop().catch(error => {
      console.error(`[TaskProcessor:${this.config.instanceId}] Polling loop fatal error:`, error)
    })
  }

  private async runPollingLoop(): Promise<void> {
    while (this.isRunning) {
      let totalTasksProcessed = 0

      for (const { namespace, config } of this.pullModeConfigs) {
        try {
          // 检查队列是否过载
          const isOverloaded = await this.isQueueOverloaded(config.taskQueue)
          if (isOverloaded) {
            console.log(`[TaskProcessor:${this.config.instanceId}] Queue ${config.taskQueue} overloaded, skipping`)
            continue
          }
          
          const processed = await this.processTaskType(namespace, config)
          totalTasksProcessed += processed
        } catch (error: any) {
          console.error(`[TaskProcessor:${this.config.instanceId}] Error processing ${namespace}:`, error.message)
        }
      }

      // 自适应轮询间隔调整
      this.adjustPollingInterval(totalTasksProcessed)
      
      // 等待下次轮询
      await this.sleep(this.currentIntervalMs)
    }
  }

  /**
   * 检查队列是否过载（背压控制核心）
   */
  private async isQueueOverloaded(taskQueue: string): Promise<boolean> {
    const backlog = await this.getQueueBacklog(taskQueue)
    return backlog > this.config.backpressure.maxQueueBacklog
  }

  /**
   * 获取队列积压数量（带缓存）
   */
  private async getQueueBacklog(taskQueue: string): Promise<number> {
    const now = Date.now()
    const cached = this.queueBacklogCache.get(taskQueue)
    
    // 使用缓存（在配置的间隔内）
    if (cached && (now - cached.timestamp) < this.config.backpressure.queueCheckIntervalMs) {
      return cached.count
    }
    
    try {
      const response = await this.temporalClient!.workflowService.describeTaskQueue({
        namespace: this.config.temporalNamespace,
        taskQueue: { name: taskQueue },
        reportStats: true,
      })
      
      // 优先使用新版 stats，fallback 到旧版 taskQueueStatus
      const backlog = response.stats?.approximateBacklogCount 
        ?? response.taskQueueStatus?.backlogCountHint 
        ?? 0n
      
      const count = Number(backlog)
      
      // 更新缓存
      this.queueBacklogCache.set(taskQueue, { count, timestamp: now })
      
      return count
    } catch (error: any) {
      console.warn(`[TaskProcessor:${this.config.instanceId}] Failed to get queue backlog:`, error.message)
      // 查询失败时返回 0，允许继续处理
      return 0
    }
  }

  /**
   * 自适应轮询间隔调整
   * 
   * 策略：
   * - 有任务：重置到最小间隔
   * - 无任务：连续 N 次后开始指数退避
   */
  private adjustPollingInterval(taskCount: number): void {
    if (taskCount > 0) {
      // 有任务：快速轮询
      this.consecutiveEmptyPolls = 0
      this.currentIntervalMs = this.config.polling.minIntervalMs
    } else {
      // 无任务：开始退避
      this.consecutiveEmptyPolls++
      
      if (this.consecutiveEmptyPolls >= this.config.polling.emptyPollsBeforeBackoff) {
        this.currentIntervalMs = Math.min(
          this.currentIntervalMs * this.config.polling.backoffMultiplier,
          this.config.polling.maxIntervalMs
        )
      }
    }
  }

  private async processTaskType(namespace: string, pullConfig: PullModeConfig): Promise<number> {
    if (!this.temporalClient) return 0
    
    const tasks = await this.fetchPendingTasks(pullConfig)
    if (tasks.length === 0) return 0

    console.log(`[TaskProcessor:${this.config.instanceId}] Processing ${tasks.length} task(s) for ${namespace}`)

    let processed = 0
    for (const task of tasks) {
      // 每个任务提交前再次检查队列状态（可选，更精细的控制）
      const isOverloaded = await this.isQueueOverloaded(pullConfig.taskQueue)
      if (isOverloaded) {
        console.log(`[TaskProcessor:${this.config.instanceId}] Queue became overloaded, pausing batch`)
        await this.sleep(this.config.backpressure.backoffWhenOverloadedMs)
        break
      }
      
      const success = await this.processTask(task, namespace, pullConfig)
      if (success) processed++
    }
    
    return processed
  }

  private async fetchPendingTasks(pullConfig: PullModeConfig): Promise<any[]> {
    const url = pullConfig.internalAPIs.fetchPendingTasks
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders()
        },
        body: JSON.stringify({ limit: this.config.polling.batchSize })
      })
      
      if (!response.ok) {
        console.error(`[TaskProcessor:${this.config.instanceId}] Fetch failed: ${response.status}`)
        return []
      }
      
      const { tasks } = await response.json() as { tasks: any[] }
      return tasks || []
    } catch (error: any) {
      console.error(`[TaskProcessor:${this.config.instanceId}] Fetch error:`, error.message)
      return []
    }
  }

  private async processTask(
    apiCall: any,
    namespace: string,
    pullConfig: PullModeConfig
  ): Promise<boolean> {
    const workflowId = `${namespace}:${pullConfig.buildWorkflowId(apiCall)}`
    
    try {
      // Step 1: 报告 queued 状态
      const reported = await this.reportTaskEvent(pullConfig, apiCall.id, 'queued')
      if (!reported) {
        console.log(`[TaskProcessor:${this.config.instanceId}] Queued report failed, skipping`, { 
          apiCallId: apiCall.id 
        })
        return false
      }

      // Step 2: 启动 Temporal workflow
      await this.temporalClient!.workflow.start(pullConfig.workflowName, {
        taskQueue: pullConfig.taskQueue,
        workflowId,
        args: [pullConfig.buildWorkflowParams(apiCall)]
      })

      console.log(`[TaskProcessor:${this.config.instanceId}] Workflow started`, { 
        apiCallId: apiCall.id, 
        workflowId 
      })
      
      return true

    } catch (error: any) {
      if (error instanceof WorkflowExecutionAlreadyStartedError) {
        // 幂等：workflow 已存在
        console.log(`[TaskProcessor:${this.config.instanceId}] Workflow already exists (idempotent)`, { 
          workflowId 
        })
        return true
      }

      console.error(`[TaskProcessor:${this.config.instanceId}] Workflow start failed`, { 
        apiCallId: apiCall.id, 
        error: error.message 
      })

      // 报告失败
      await this.reportTaskEventWithRetry(
        pullConfig,
        apiCall.id,
        'failed',
        { error: `Workflow start failed: ${error.message}` }
      )
      
      return false
    }
  }

  private async reportTaskEvent(
    pullConfig: PullModeConfig,
    apiCallId: string,
    status: string,
    data?: any
  ): Promise<boolean> {
    const url = pullConfig.internalAPIs.reportTaskEvent
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders()
        },
        body: JSON.stringify({ apiCallId, status, ...data })
      })
      
      if (!response.ok) {
        const text = await response.text()
        console.error(`[TaskProcessor:${this.config.instanceId}] Report failed: ${response.status} - ${text}`)
        return false
      }
      
      const result = await response.json() as { success: boolean }
      return result.success
    } catch (error: any) {
      console.error(`[TaskProcessor:${this.config.instanceId}] Report error:`, error.message)
      return false
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
      
      const delay = 1000 * Math.pow(2, attempt)
      await this.sleep(delay)
    }
    return false
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}
    if (this.config.internalToken) {
      headers['Authorization'] = `Bearer ${this.config.internalToken}`
    }
    return headers
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /** 获取当前状态（用于监控） */
  getStatus(): { 
    currentIntervalMs: number
    consecutiveEmptyPolls: number
    queueBacklogs: Record<string, number>
  } {
    const queueBacklogs: Record<string, number> = {}
    for (const [queue, cache] of this.queueBacklogCache) {
      queueBacklogs[queue] = cache.count
    }
    
    return {
      currentIntervalMs: this.currentIntervalMs,
      consecutiveEmptyPolls: this.consecutiveEmptyPolls,
      queueBacklogs
    }
  }
}
```

### 3.3 startAsyncTask.ts 更新

```typescript
// async-task-component/startAsyncTask.ts

import * as path from 'path'
import * as crypto from 'crypto'
import { fileURLToPath } from 'url'
import { config as appConfig } from '../config.js'
import { collectIntegrationWorkflows } from './workflow-collector.js'
import { WorkerManager, WorkerTunerConfig } from './worker-manager.js'
import { TaskProcessor, TaskProcessorConfig } from './task-processor.js'
import { entities, relations, interactions, activities, dicts } from '@/backend/index.js'
import AggregatedIntegrationClass from '@/integrations/entries/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const INSTANCE_ID = `worker-${process.env.HOSTNAME || crypto.randomUUID().slice(0, 8)}`

const BLACKLIST_PREFIXES = ['example_', 'kafka.old', 'docs']

async function main() {
  console.log('========================================')
  console.log('AsyncTask Component Starting')
  console.log('========================================')
  console.log(`Instance ID: ${INSTANCE_ID}`)
  console.log('')

  const temporalAddress = getTemporalAddress()
  const namespace = getNamespace()
  const config = getAsyncTaskConfig()
  const integrationsPath = path.join(__dirname, '../integrations')

  console.log('[StartAsyncTask] Configuration:')
  console.log(`  Temporal Server: ${temporalAddress}`)
  console.log(`  Namespace: ${namespace}`)
  console.log('')

  // ============================================
  // Part 1: Initialize Integrations
  // ============================================
  console.log('[StartAsyncTask] Initializing integrations...')
  
  const integration = new AggregatedIntegrationClass({
    entities, relations, activities, interactions, dict: dicts
  })
  await integration.configure?.()
  
  const pullModeConfigs = integration
    .getIntegrations()
    .flatMap((integ) => {
      const cfg = integ.getPullModeConfig?.()
      if (cfg?.enabled) {
        console.log(`  [PullMode] Enabled for ${integ.namespace}`)
        return [{ namespace: integ.namespace, config: cfg }]
      }
      return []
    })

  // ============================================
  // Part 2: Start Temporal Workers with ResourceBasedTuner
  // ============================================
  console.log('[StartAsyncTask] Collecting integration workflows...')
  const workflowInfos = collectIntegrationWorkflows(integrationsPath, BLACKLIST_PREFIXES)

  let workerManager: WorkerManager | null = null

  if (workflowInfos.length > 0) {
    console.log(`[StartAsyncTask] Found ${workflowInfos.length} integration(s) with workflows`)
    
    // 使用 ResourceBasedTuner 配置
    const tunerConfig: WorkerTunerConfig = {
      targetCpuUsage: config.tuner?.targetCpuUsage ?? 0.7,
      targetMemoryUsage: config.tuner?.targetMemoryUsage ?? 0.8,
      workflowSlots: {
        minimum: config.tuner?.workflowSlots?.minimum ?? 2,
        maximum: config.tuner?.workflowSlots?.maximum ?? 100,
        rampThrottleMs: config.tuner?.workflowSlots?.rampThrottleMs ?? 10
      },
      activitySlots: {
        minimum: config.tuner?.activitySlots?.minimum ?? 1,
        maximum: config.tuner?.activitySlots?.maximum ?? 200,
        rampThrottleMs: config.tuner?.activitySlots?.rampThrottleMs ?? 50
      }
    }

    console.log('[StartAsyncTask] ResourceBasedTuner config:')
    console.log(`  Target CPU: ${tunerConfig.targetCpuUsage * 100}%`)
    console.log(`  Target Memory: ${tunerConfig.targetMemoryUsage * 100}%`)
    console.log(`  Workflow slots: ${tunerConfig.workflowSlots.minimum}-${tunerConfig.workflowSlots.maximum}`)
    console.log(`  Activity slots: ${tunerConfig.activitySlots.minimum}-${tunerConfig.activitySlots.maximum}`)
    console.log('')

    workerManager = new WorkerManager(temporalAddress, namespace, tunerConfig)
    
    await workerManager.connect()
    await workerManager.createWorkers(workflowInfos)
    await workerManager.startAll()
  }

  // ============================================
  // Part 3: Start TaskProcessor with Adaptive Polling + Queue Backpressure
  // ============================================
  let taskProcessor: TaskProcessor | null = null

  if (pullModeConfigs.length > 0) {
    console.log('[StartAsyncTask] Starting TaskProcessor...')
    
    const processorConfig: TaskProcessorConfig = {
      instanceId: INSTANCE_ID,
      temporalAddress,
      temporalNamespace: namespace,
      internalToken: config.internalApiToken,
      polling: {
        minIntervalMs: config.polling?.minIntervalMs ?? 100,
        maxIntervalMs: config.polling?.maxIntervalMs ?? 5000,
        backoffMultiplier: config.polling?.backoffMultiplier ?? 1.5,
        emptyPollsBeforeBackoff: config.polling?.emptyPollsBeforeBackoff ?? 3,
        batchSize: config.polling?.batchSize ?? 10
      },
      backpressure: {
        maxQueueBacklog: config.backpressure?.maxQueueBacklog ?? 100,
        queueCheckIntervalMs: config.backpressure?.queueCheckIntervalMs ?? 5000,
        backoffWhenOverloadedMs: config.backpressure?.backoffWhenOverloadedMs ?? 2000
      }
    }

    console.log('[StartAsyncTask] TaskProcessor config:')
    console.log(`  Polling: ${processorConfig.polling.minIntervalMs}ms - ${processorConfig.polling.maxIntervalMs}ms`)
    console.log(`  Backpressure: max backlog ${processorConfig.backpressure.maxQueueBacklog}`)
    console.log('')

    taskProcessor = new TaskProcessor(processorConfig)
    await taskProcessor.start(pullModeConfigs)
  }

  console.log('')
  console.log('========================================')
  console.log('AsyncTask Component is running')
  console.log('========================================')

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n[StartAsyncTask] Shutting down...')
    try {
      if (taskProcessor) await taskProcessor.stop()
      if (workerManager) {
        await workerManager.stopAll()
        await workerManager.disconnect()
      }
      console.log('[StartAsyncTask] Shutdown complete')
      process.exit(0)
    } catch (error) {
      console.error('[StartAsyncTask] Error during shutdown:', error)
      process.exit(1)
    }
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  await new Promise(() => {})
}

function getTemporalAddress(): string { /* ... */ }
function getNamespace(): string { /* ... */ }
function getAsyncTaskConfig(): any { /* ... */ }

main().catch(error => {
  console.error('[StartAsyncTask] Unhandled error:', error)
  process.exit(1)
})
```

---

## 4. 配置

配置写在 `config/deploy.dev.json` 和 `config/deploy.prod.json` 中的 `components.asyncTask.applicationConfig` 部分，由 deploy-tool 生成 `app.config.json`。

### 4.1 deploy.dev.json（开发环境）

```json
{
  "components": {
    "asyncTask": {
      "deploymentType": "local",
      "replicas": 1,
      "host": "localhost",
      "port": 3002,
      "middlewareDependencies": {
        "temporalDb": {
          "deploymentType": "container",
          "use": "postgresql",
          "version": "14",
          "replicas": 1,
          "config": {
            "type": "postgresql",
            "username": "temporal",
            "password": "temporal",
            "database": "temporal"
          }
        },
        "temporal": {
          "deploymentType": "container",
          "use": "temporal",
          "version": "1.23.1",
          "replicas": 1,
          "dependencies": ["components.asyncTask.middlewareDependencies.temporalDb"],
          "config": {
            "db": "postgresql",
            "postgresSeeds": "${ref:components.asyncTask.middlewareDependencies.temporalDb.endpoints.main.value}",
            "postgresUser": "${ref:components.asyncTask.middlewareDependencies.temporalDb.config.username}",
            "postgresPwd": "${ref:components.asyncTask.middlewareDependencies.temporalDb.config.password}",
            "postgresPort": "5432",
            "logLevel": "info",
            "defaultNamespace": "default"
          }
        }
      },
      "applicationConfig": {
        "tuner": {
          "targetCpuUsage": 0.7,
          "targetMemoryUsage": 0.8,
          "workflowSlots": {
            "minimum": 2,
            "maximum": 100,
            "rampThrottleMs": 10
          },
          "activitySlots": {
            "minimum": 1,
            "maximum": 200,
            "rampThrottleMs": 50
          }
        },
        "polling": {
          "minIntervalMs": 100,
          "maxIntervalMs": 5000,
          "backoffMultiplier": 1.5,
          "emptyPollsBeforeBackoff": 3,
          "batchSize": 10
        },
        "backpressure": {
          "maxQueueBacklog": 100,
          "queueCheckIntervalMs": 5000,
          "backoffWhenOverloadedMs": 2000
        }
      }
    }
  }
}
```

### 4.2 deploy.prod.json（生产环境）

```json
{
  "components": {
    "asyncTask": {
      "deploymentType": "container",
      "image": "spg-cn-beijing.cr.volces.com/lit/main:latest",
      "replicas": 2,
      "startCommand": "npm run start:async-task",
      "skipHealthCheck": true,
      "middlewareDependencies": {
        "temporalDb": {
          "$ref": "components.main.middlewareDependencies.mainDb",
          "config": {
            "database": "temporal"
          }
        },
        "temporal": {
          "deploymentType": "container",
          "use": "temporal",
          "version": "1.24.2",
          "image": "spg-cn-beijing.cr.volces.com/lit/temporal-server:1.29.0",
          "replicas": 1,
          "config": {
            "mode": "distributed",
            "numHistoryShards": 4,
            "frontendReplicas": 2,
            "historyReplicas": 2,
            "matchingReplicas": 2,
            "workerReplicas": 1
          }
        }
      },
      "applicationConfig": {
        "tuner": {
          "targetCpuUsage": 0.8,
          "targetMemoryUsage": 0.85,
          "workflowSlots": {
            "minimum": 5,
            "maximum": 200,
            "rampThrottleMs": 10
          },
          "activitySlots": {
            "minimum": 2,
            "maximum": 500,
            "rampThrottleMs": 50
          }
        },
        "polling": {
          "minIntervalMs": 50,
          "maxIntervalMs": 3000,
          "backoffMultiplier": 1.5,
          "emptyPollsBeforeBackoff": 5,
          "batchSize": 20
        },
        "backpressure": {
          "maxQueueBacklog": 200,
          "queueCheckIntervalMs": 3000,
          "backoffWhenOverloadedMs": 1000
        }
      }
    }
  }
}
```

### 4.3 配置说明

#### ResourceBasedTuner 配置（Worker 层）

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `targetCpuUsage` | 0.7 | 目标 CPU 使用率，超过后减少任务拉取 |
| `targetMemoryUsage` | 0.8 | 目标内存使用率，超过后减少任务拉取 |
| `workflowSlots.minimum` | 2 | 无论负载如何都保持的最小槽位数 |
| `workflowSlots.maximum` | 100 | 最大槽位数上限 |
| `workflowSlots.rampThrottleMs` | 10 | 增加槽位时的节流间隔 |
| `activitySlots.minimum` | 1 | Activity 最小槽位 |
| `activitySlots.maximum` | 200 | Activity 最大槽位 |
| `activitySlots.rampThrottleMs` | 50 | Activity 槽位增加节流 |

#### 自适应轮询配置（TaskProcessor 层）

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `minIntervalMs` | 100 | 有任务时的最小轮询间隔 |
| `maxIntervalMs` | 5000 | 空闲时的最大轮询间隔 |
| `backoffMultiplier` | 1.5 | 退避乘数 |
| `emptyPollsBeforeBackoff` | 3 | 触发退避的连续空轮询次数 |
| `batchSize` | 10 | 每次拉取的任务数量 |

#### 队列深度背压配置（TaskProcessor 层）

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `maxQueueBacklog` | 100 | 最大允许的队列积压数量，超过后暂停拉取新任务 |
| `queueCheckIntervalMs` | 5000 | 队列深度查询的缓存时间 |
| `backoffWhenOverloadedMs` | 2000 | 队列过载时的等待时间 |

---

## 5. 工作流程

```
┌────────────────────────────────────────────────────────────────────────────┐
│                            完整工作流程                                     │
└────────────────────────────────────────────────────────────────────────────┘

1. TaskProcessor 轮询（自适应间隔）
   │
   ├─ 有任务？
   │   ├─ 是 → 重置间隔到 100ms，继续快速轮询
   │   └─ 否 → 连续 3 次后开始退避（100ms → 150ms → 225ms → ... → 5000ms）
   │
   ▼
2. 查询 Task Queue 深度（带缓存）
   │
   ├─ 积压 > 100？
   │   ├─ 是 → 跳过本次拉取，等待 2 秒
   │   └─ 否 → 继续
   │
   ▼
3. 拉取待处理任务（HTTP）
   │
   ▼
4. 调用 workflow.start() 提交任务
   │
   │   注意：workflow.start() 是异步的，立即返回
   │   任务进入 Temporal Task Queue 等待 Worker 拉取
   │
   ▼
5. 任务进入 Temporal Task Queue
   │
   ├─────────────────────────────────────────────────────────────────────────┐
   │                   Temporal Worker 内部                                   │
   │                                                                          │
   │  ResourceBasedTuner 控制 Worker 从队列拉取任务的并发：                    │
   │  ┌─────────────────────────────────────────────────────────────────┐    │
   │  │ CPU < 70%? && Memory < 80%? && 有空闲槽位?                        │    │
   │  │   │                                                               │    │
   │  │   ├─ 全部满足 → 从队列拉取任务，分配槽位执行                       │    │
   │  │   │                                                               │    │
   │  │   └─ 不满足 → 等待资源释放，任务继续在队列中排队                   │    │
   │  └─────────────────────────────────────────────────────────────────┘    │
   │                                                                          │
   │  当 Worker 消费速度 < 提交速度时：                                       │
   │  • 队列积压增加                                                          │
   │  • TaskProcessor 查询到积压过高                                          │
   │  • TaskProcessor 暂停拉取新任务                                          │
   │  • 形成完整的背压链路                                                    │
   │                                                                          │
   └──────────────────────────────────────────────────────────────────────────┘
   │
   ▼
6. Workflow 执行完成，槽位释放
   │
   ▼
7. 回到步骤 1
```

---

## 6. 背压机制详解

### 6.1 两层背压

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           背压链路                                          │
│                                                                              │
│   Main Component          TaskProcessor          Task Queue          Worker │
│   (待处理任务)            (拉取/提交)            (积压)              (执行) │
│                                                                              │
│       ┌───┐                 ┌───┐                 ┌───┐              ┌───┐  │
│       │ T │ ──── 拉取 ────▶ │ T │ ──── 提交 ────▶ │ T │ ─── 拉取 ──▶ │ T │  │
│       │ T │                 │   │                 │ T │              │   │  │
│       │ T │                 │   │                 │ T │              │   │  │
│       │ T │                 │   │                 │ T │              │   │  │
│       └───┘                 └───┘                 └───┘              └───┘  │
│                                │                    │                       │
│                                │                    │                       │
│                         ┌──────┴──────┐      ┌──────┴──────┐               │
│                         │ 第一层背压   │      │ 第二层背压   │               │
│                         │             │      │             │               │
│                         │ 查询队列深度 │      │ ResourceBased│               │
│                         │ 积压 > 100  │      │ Tuner        │               │
│                         │ 暂停拉取    │      │ CPU/内存感知  │               │
│                         └─────────────┘      └─────────────┘               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 背压触发条件

| 层级 | 触发条件 | 效果 |
|------|---------|------|
| **TaskProcessor** | `approximateBacklogCount > maxQueueBacklog` | 暂停从 Main Component 拉取新任务 |
| **Worker** | `CPU > targetCpuUsage` 或 `Memory > targetMemoryUsage` | 减少从 Task Queue 拉取任务的并发 |

### 6.3 为什么需要两层？

- **仅靠 Worker 背压**：Task Queue 可能无限增长，任务延迟持续增加
- **仅靠 TaskProcessor 背压**：Worker 可能过载，CPU/内存爆满
- **两层结合**：既保护 Worker 不过载，又防止 Task Queue 无限堆积

---

## 7. 总结

### 核心原则

1. **信任 Temporal**：使用官方的 `ResourceBasedTuner` 保护 Worker 不过载
2. **主动查询队列深度**：TaskProcessor 通过 `describeTaskQueue` API 感知积压情况
3. **自适应轮询**：避免空轮询浪费资源
4. **两层背压**：形成完整的压力传导链路

### 最终架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Async Task Component                             │
│                                                                          │
│  TaskProcessor                              Temporal Worker              │
│  ────────────────────                       ─────────────────────────    │
│  • 自适应轮询间隔                            • ResourceBasedTuner         │
│  • HTTP 拉取任务                             • targetCpuUsage: 70%       │
│  • 查询队列深度（背压）                       • targetMemoryUsage: 80%    │
│  • workflow.start()                         • 动态槽位分配               │
│                                                                          │
│  背压逻辑：                                                               │
│  if (queueBacklog > 100) {                                               │
│    暂停拉取新任务                                                         │
│  }                                                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### 优势

1. **完整的背压链路**：从源头控制，防止任务堆积
2. **官方 API 支持**：使用 Temporal 提供的 `describeTaskQueue` 和 `ResourceBasedTuner`
3. **配置灵活**：所有参数可通过配置文件调整
4. **职责清晰**：TaskProcessor 控制输入速率，Worker 控制执行并发
