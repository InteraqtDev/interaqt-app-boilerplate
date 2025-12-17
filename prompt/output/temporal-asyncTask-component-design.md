# 基于 Temporal 的 AsyncTask Component 实现方案设计

## 1. 任务背景回顾

### 1.1 核心需求

项目中需要处理以下场景：
1. **长耗时外部 API 调用**：如图像生成、视频生成等，可能需要数分钟
2. **多步骤组合调用**：需要串联多个外部 API（如先生成图片再上传存储）
3. **可靠性要求**：自动重试、失败恢复、断点续执行

### 1.2 设计目标

- **异步执行**：Web 请求立即返回，任务在后台执行
- **状态查询**：提供 API 查询任务状态和结果
- **自动重试**：外部调用失败时自动重试
- **断点续执行**：多步任务在中间失败后可从上次完成的步骤继续
- **与现有模式兼容**：`submit()` / `getStatus()` 接口与现有异步任务模式一致

---

## 2. Temporal 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            Application                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  Main Component (port 3000)                                              │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Integration Layer                                                  │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │  NanoBanana2ImageIntegration                                │  │  │
│  │  │  ┌─────────────────────────────────────────────────────────┐│  │  │
│  │  │  │  TemporalAsyncTask (imageGenTask)                       ││  │  │
│  │  │  │  - submit(params) → taskId   (立即返回)                  ││  │  │
│  │  │  │  - getStatus(taskId) → status                           ││  │  │
│  │  │  └─────────────────────────────────────────────────────────┘│  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│  AsyncTask Component (Worker 进程)                                       │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Temporal Worker                                                   │  │
│  │  - 长轮询 Task Queue 获取任务                                      │  │
│  │  - 执行 Workflow 和 Activity                                       │  │
│  │  - 无需暴露端口，无需注册 endpoint                                  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ gRPC (长轮询拉取任务)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Temporal Server (独立部署)                                              │
│  - 任务调度和状态管理                                                    │
│  - 持久化存储 (PostgreSQL/MySQL + Elasticsearch)                        │
│  - Web UI (端口 8080)                                                   │
│  - 原生支持多 Worker 负载均衡                                            │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 与 Restate 架构的关键差异

| 特性 | Restate（当前） | Temporal（本方案） |
|------|----------------|-------------------|
| **通信模式** | 推送（Server → Worker） | 拉取（Worker ← Server） |
| **Worker 端口** | 需要暴露 9080 | 无需暴露端口 |
| **注册机制** | 需要 registerEndpoint | 无需注册 |
| **多实例** | 需要外部 LB | 原生 Task Queue 负载均衡 |
| **代码隔离** | Workflow 和业务代码混合 | Workflow 必须独立文件 |

---

## 3. 核心组件设计

### 3.1 TemporalAsyncTask 类

`TemporalAsyncTask` 是将普通外部调用函数包装成 Temporal Workflow 的工具类。

#### 类型定义

```typescript
// temporal-async-task/src/types.ts

/**
 * 单步调用函数类型
 */
export type SingleStepFunction<TParams, TResult> = (params: TParams) => Promise<TResult>

/**
 * 多步调用步骤定义
 */
export type StepDefinition<TStepResult = unknown> = {
  key: string                       // 步骤唯一标识（用于断点续执行）
  call: () => Promise<TStepResult>  // 需要执行的外部调用
}

/**
 * 多步调用 Generator 类型
 */
export type MultiStepGenerator<TParams, TResult> = (
  params: TParams
) => AsyncGenerator<StepDefinition, TResult, unknown>

/**
 * 重试策略配置
 */
export type RetryPolicy = {
  maxRetries: number          // 最大重试次数，默认 3
  initialDelay: number        // 初始延迟(ms)，默认 1000
  maxDelay: number            // 最大延迟(ms)，默认 30000
  backoffMultiplier?: number  // 退避乘数，默认 2
}

/**
 * TemporalAsyncTask 配置
 */
export type TemporalAsyncTaskConfig<TParams, TResult> = {
  name: string                // 任务名称，全局唯一
  task: SingleStepFunction<TParams, TResult> | MultiStepGenerator<TParams, TResult>
  taskQueue?: string          // Task Queue 名称，默认 'async-tasks'
  retryPolicy?: RetryPolicy
}

/**
 * 任务状态
 */
export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed'

/**
 * 任务结果
 */
export type TaskResult<TResult> = {
  taskId: string
  status: TaskStatus
  result?: TResult
  error?: string
  createdAt: number
  completedAt?: number
  currentStep?: string        // 当前执行步骤（多步任务）
  completedSteps?: string[]   // 已完成步骤列表
}
```

#### 类实现

```typescript
// temporal-async-task/src/TemporalAsyncTask.ts

import { Client, Connection, WorkflowExecutionAlreadyStartedError } from '@temporalio/client'
import { 
  TemporalAsyncTaskConfig, 
  TaskResult, 
  TaskStatus,
  SingleStepFunction,
  MultiStepGenerator,
  RetryPolicy
} from './types'

export class TemporalAsyncTask<TParams, TResult> {
  /** Workflow 类型名称 */
  public readonly workflowType: string
  /** Task Queue 名称 */
  public readonly taskQueue: string
  /** 任务配置 */
  private readonly config: TemporalAsyncTaskConfig<TParams, TResult>
  /** Temporal Client */
  private client?: Client
  /** 默认重试策略 */
  private readonly defaultRetryPolicy: Required<RetryPolicy> = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2
  }

  constructor(config: TemporalAsyncTaskConfig<TParams, TResult>) {
    this.config = config
    this.workflowType = `asyncTask_${config.name}`
    this.taskQueue = config.taskQueue || 'async-tasks'
  }

  /**
   * 设置 Temporal Client
   * 由 AsyncTaskComponent 在启动时调用
   */
  setClient(client: Client): void {
    this.client = client
  }

  /**
   * 获取任务名称
   */
  getName(): string {
    return this.config.name
  }

  /**
   * 获取任务函数（供 Worker 使用）
   */
  getTaskFunction(): SingleStepFunction<TParams, TResult> | MultiStepGenerator<TParams, TResult> {
    return this.config.task
  }

  /**
   * 获取重试策略
   */
  getRetryPolicy(): Required<RetryPolicy> {
    return {
      ...this.defaultRetryPolicy,
      ...this.config.retryPolicy
    }
  }

  /**
   * 判断是否是多步任务
   */
  isMultiStep(): boolean {
    const fn = this.config.task
    if (typeof fn !== 'function') return false
    const constructorName = fn.constructor?.name
    return constructorName === 'AsyncGeneratorFunction' || 
           constructorName === 'GeneratorFunction'
  }

  /**
   * 提交任务执行
   * 
   * 通过 Temporal Client 启动 Workflow，立即返回
   * Workflow 在后台异步执行
   * 
   * @param params 任务参数
   * @returns 任务 ID（即 Workflow ID）
   */
  async submit(params: TParams): Promise<string> {
    if (!this.client) {
      throw new Error('TemporalAsyncTask not initialized. Please ensure AsyncTaskComponent is started.')
    }

    const taskId = crypto.randomUUID()

    try {
      // 启动 Workflow，不等待完成
      await this.client.workflow.start(this.workflowType, {
        taskQueue: this.taskQueue,
        workflowId: taskId,
        args: [params]
      })
    } catch (error) {
      // 如果 Workflow 已存在（幂等性），返回现有 ID
      if (error instanceof WorkflowExecutionAlreadyStartedError) {
        return taskId
      }
      throw error
    }

    return taskId
  }

  /**
   * 获取任务状态
   * 
   * 通过 Temporal Client 查询 Workflow 状态
   * 
   * @param taskId 任务 ID
   * @returns 任务结果
   */
  async getStatus(taskId: string): Promise<TaskResult<TResult>> {
    if (!this.client) {
      throw new Error('TemporalAsyncTask not initialized. Please ensure AsyncTaskComponent is started.')
    }

    try {
      const handle = this.client.workflow.getHandle(taskId)
      const description = await handle.describe()

      // 解析 Workflow 状态
      const status = description.status.name
      const createdAt = description.startTime?.getTime() || 0

      if (status === 'RUNNING') {
        // 任务正在执行
        // 可以通过 Query 获取当前步骤（如果实现了）
        let currentStep: string | undefined
        let completedSteps: string[] | undefined

        try {
          const queryResult = await handle.query<{ currentStep?: string; completedSteps?: string[] }>('getProgress')
          currentStep = queryResult.currentStep
          completedSteps = queryResult.completedSteps
        } catch {
          // Query 可能未实现，忽略
        }

        return {
          taskId,
          status: 'processing',
          createdAt,
          currentStep,
          completedSteps
        }
      } else if (status === 'COMPLETED') {
        // 任务完成，获取结果
        const result = await handle.result()
        return {
          taskId,
          status: 'completed',
          result,
          createdAt,
          completedAt: description.closeTime?.getTime()
        }
      } else if (status === 'FAILED' || status === 'TERMINATED' || status === 'CANCELLED') {
        // 任务失败
        let errorMessage = 'Unknown error'
        try {
          await handle.result()
        } catch (error: any) {
          errorMessage = error.message || String(error)
        }

        return {
          taskId,
          status: 'failed',
          error: errorMessage,
          createdAt,
          completedAt: description.closeTime?.getTime()
        }
      } else {
        // PENDING 或其他状态
        return {
          taskId,
          status: 'pending',
          createdAt
        }
      }
    } catch (error: any) {
      // Workflow 不存在
      if (error.message?.includes('not found')) {
        return {
          taskId,
          status: 'pending',
          createdAt: 0
        }
      }
      throw error
    }
  }
}
```

### 3.2 Workflow 定义文件

Temporal 要求 Workflow 代码必须在独立文件中，不能直接 import 普通业务模块。

```typescript
// temporal-async-task/src/workflows/index.ts

/**
 * Temporal Workflow 定义
 * 
 * 注意：此文件在独立的 V8 隔离环境中运行
 * 不能 import 任何有副作用的模块（如 fs、网络库等）
 * 只能通过 proxyActivities 调用 Activity
 */

import { 
  proxyActivities, 
  defineQuery,
  setHandler,
  condition,
  sleep
} from '@temporalio/workflow'
import type * as activities from '../activities'

// 代理 Activities
const { executeSingleStep, executeMultiStep } = proxyActivities<typeof activities>({
  // Activity 执行超时
  startToCloseTimeout: '30 minutes',
  // 重试策略（在 Activity 级别配置）
  retry: {
    maximumAttempts: 4,  // maxRetries + 1
    initialInterval: '1 second',
    maximumInterval: '30 seconds',
    backoffCoefficient: 2
  }
})

// 定义进度查询
export const getProgressQuery = defineQuery<{ currentStep?: string; completedSteps?: string[] }>('getProgress')

/**
 * 单步任务 Workflow
 */
export async function singleStepWorkflow<TParams, TResult>(
  taskName: string,
  params: TParams
): Promise<TResult> {
  return await executeSingleStep(taskName, params)
}

/**
 * 多步任务 Workflow
 */
export async function multiStepWorkflow<TParams, TResult>(
  taskName: string,
  params: TParams
): Promise<TResult> {
  // 进度状态
  let currentStep: string | undefined
  let completedSteps: string[] = []

  // 注册进度查询处理器
  setHandler(getProgressQuery, () => ({
    currentStep,
    completedSteps
  }))

  // 执行多步任务
  const result = await executeMultiStep(
    taskName,
    params,
    (step: string) => {
      currentStep = step
    },
    (step: string) => {
      completedSteps = [...completedSteps, step]
    }
  )

  currentStep = undefined
  return result
}

/**
 * 通用任务 Workflow（根据任务类型自动选择）
 */
export async function asyncTaskWorkflow<TParams, TResult>(
  taskName: string,
  isMultiStep: boolean,
  params: TParams
): Promise<TResult> {
  if (isMultiStep) {
    return await multiStepWorkflow<TParams, TResult>(taskName, params)
  } else {
    return await singleStepWorkflow<TParams, TResult>(taskName, params)
  }
}
```

### 3.3 Activity 定义文件

Activity 是实际执行业务逻辑的地方，可以有副作用（网络调用、文件操作等）。

```typescript
// temporal-async-task/src/activities/index.ts

/**
 * Temporal Activity 定义
 * 
 * Activity 可以执行任何有副作用的操作
 * 包括网络调用、数据库操作等
 */

import { ApplicationFailure } from '@temporalio/activity'
import { taskRegistry } from '../registry'

/**
 * 执行单步任务
 */
export async function executeSingleStep<TParams, TResult>(
  taskName: string,
  params: TParams
): Promise<TResult> {
  const task = taskRegistry.get(taskName)
  if (!task) {
    throw ApplicationFailure.nonRetryable(`Task not found: ${taskName}`)
  }

  const taskFn = task.getTaskFunction()
  
  // 单步任务直接执行
  if (typeof taskFn === 'function' && taskFn.constructor.name !== 'AsyncGeneratorFunction') {
    return await (taskFn as (params: TParams) => Promise<TResult>)(params)
  }

  throw ApplicationFailure.nonRetryable(`Task ${taskName} is not a single-step task`)
}

/**
 * 执行多步任务
 */
export async function executeMultiStep<TParams, TResult>(
  taskName: string,
  params: TParams,
  onStepStart: (step: string) => void,
  onStepComplete: (step: string) => void
): Promise<TResult> {
  const task = taskRegistry.get(taskName)
  if (!task) {
    throw ApplicationFailure.nonRetryable(`Task not found: ${taskName}`)
  }

  const taskFn = task.getTaskFunction()
  
  // 验证是 Generator 函数
  if (typeof taskFn !== 'function' || 
      (taskFn.constructor.name !== 'AsyncGeneratorFunction' && 
       taskFn.constructor.name !== 'GeneratorFunction')) {
    throw ApplicationFailure.nonRetryable(`Task ${taskName} is not a multi-step task`)
  }

  // 执行 Generator
  const generator = (taskFn as (params: TParams) => AsyncGenerator<any, TResult, any>)(params)
  let iteratorResult = await generator.next()

  while (!iteratorResult.done) {
    const step = iteratorResult.value
    const stepKey = step.key
    
    onStepStart(stepKey)
    
    // 执行步骤
    const stepResult = await step.call()
    
    onStepComplete(stepKey)
    
    // 传递结果到下一步
    iteratorResult = await generator.next(stepResult)
  }

  return iteratorResult.value
}
```

### 3.4 任务注册表

```typescript
// temporal-async-task/src/registry.ts

import { TemporalAsyncTask } from './TemporalAsyncTask'

/**
 * 全局任务注册表
 * Worker 启动时注册所有任务，Activity 执行时查找任务
 */
class TaskRegistry {
  private tasks = new Map<string, TemporalAsyncTask<any, any>>()

  register(task: TemporalAsyncTask<any, any>): void {
    this.tasks.set(task.getName(), task)
  }

  get(name: string): TemporalAsyncTask<any, any> | undefined {
    return this.tasks.get(name)
  }

  getAll(): TemporalAsyncTask<any, any>[] {
    return Array.from(this.tasks.values())
  }

  clear(): void {
    this.tasks.clear()
  }
}

export const taskRegistry = new TaskRegistry()
```

### 3.5 AsyncTaskComponent 类

```typescript
// temporal-async-task/src/AsyncTaskComponent.ts

import { Worker, NativeConnection } from '@temporalio/worker'
import { Client, Connection } from '@temporalio/client'
import { TemporalAsyncTask } from './TemporalAsyncTask'
import { taskRegistry } from './registry'
import * as activities from './activities'

export type AsyncTaskComponentConfig = {
  /** Temporal Server 地址，默认 localhost:7233 */
  temporalAddress?: string
  /** Temporal Namespace，默认 default */
  namespace?: string
  /** Task Queue 名称，默认 async-tasks */
  taskQueue?: string
}

export class AsyncTaskComponent {
  private readonly config: Required<AsyncTaskComponentConfig>
  private readonly tasks: TemporalAsyncTask<any, any>[] = []
  private worker?: Worker
  private client?: Client
  private started = false

  constructor(config: AsyncTaskComponentConfig = {}) {
    this.config = {
      temporalAddress: config.temporalAddress || 'localhost:7233',
      namespace: config.namespace || 'default',
      taskQueue: config.taskQueue || 'async-tasks'
    }
  }

  /**
   * 注册 TemporalAsyncTask 实例
   */
  register(task: TemporalAsyncTask<any, any>): void {
    if (this.started) {
      throw new Error('Cannot register tasks after component has started')
    }
    this.tasks.push(task)
    taskRegistry.register(task)
    console.log(`[AsyncTaskComponent] Registered task: ${task.workflowType}`)
  }

  /**
   * 批量注册任务
   */
  registerAll(tasks: TemporalAsyncTask<any, any>[]): void {
    for (const task of tasks) {
      this.register(task)
    }
  }

  /**
   * 启动组件
   * 
   * 1. 连接到 Temporal Server
   * 2. 创建 Client 供任务提交和查询
   * 3. 启动 Worker 执行任务
   */
  async start(): Promise<void> {
    if (this.started) {
      console.log('[AsyncTaskComponent] Already started')
      return
    }

    if (this.tasks.length === 0) {
      console.log('[AsyncTaskComponent] No tasks registered, skipping start')
      return
    }

    console.log(`[AsyncTaskComponent] Starting with ${this.tasks.length} tasks...`)
    console.log(`[AsyncTaskComponent] Temporal Server: ${this.config.temporalAddress}`)
    console.log(`[AsyncTaskComponent] Namespace: ${this.config.namespace}`)
    console.log(`[AsyncTaskComponent] Task Queue: ${this.config.taskQueue}`)

    try {
      // 创建 Client 连接
      const clientConnection = await Connection.connect({
        address: this.config.temporalAddress
      })
      
      this.client = new Client({
        connection: clientConnection,
        namespace: this.config.namespace
      })

      // 为所有任务设置 Client
      for (const task of this.tasks) {
        task.setClient(this.client)
      }

      // 创建 Worker 连接
      const workerConnection = await NativeConnection.connect({
        address: this.config.temporalAddress
      })

      // 创建 Worker
      this.worker = await Worker.create({
        connection: workerConnection,
        namespace: this.config.namespace,
        taskQueue: this.config.taskQueue,
        workflowsPath: require.resolve('./workflows'),
        activities
      })

      // 启动 Worker（非阻塞）
      this.runWorker()

      this.started = true
      console.log('[AsyncTaskComponent] Worker started successfully')
      console.log('[AsyncTaskComponent] Registered workflows:')
      for (const task of this.tasks) {
        console.log(`  - ${task.workflowType}`)
      }

    } catch (error) {
      console.error('[AsyncTaskComponent] Failed to start:', error)
      throw error
    }
  }

  /**
   * 在后台运行 Worker
   */
  private async runWorker(): Promise<void> {
    if (!this.worker) return

    try {
      await this.worker.run()
    } catch (error) {
      console.error('[AsyncTaskComponent] Worker error:', error)
    }
  }

  /**
   * 停止组件
   */
  async stop(): Promise<void> {
    if (!this.started) {
      return
    }

    console.log('[AsyncTaskComponent] Stopping...')

    if (this.worker) {
      this.worker.shutdown()
      console.log('[AsyncTaskComponent] Worker stopped')
    }

    this.started = false
    console.log('[AsyncTaskComponent] Stopped')
  }

  /**
   * 获取 Client（供外部使用）
   */
  getClient(): Client | undefined {
    return this.client
  }

  /**
   * 检查组件是否已启动
   */
  isStarted(): boolean {
    return this.started
  }
}
```

---

## 4. 扩展 IIntegration 接口

```typescript
// integrations/index.ts

import { TemporalAsyncTask } from '@interaqt/temporal-async-task'

export type IIntegration = {
  configure?(): Promise<any>
  setup?(controller: Controller): Promise<any>
  createSideEffects(): RecordMutationSideEffect<any>[]
  createAPIs?(): APIs
  createMiddlewares?(): MiddlewareHandler[]
  // 新增：创建异步任务
  createAsyncTasks?(): TemporalAsyncTask<any, any>[]
}
```

---

## 5. 启动脚本设计

### 5.1 startAsyncTask.ts

```typescript
/**
 * AsyncTask Component 启动脚本（Temporal 版本）
 * 
 * 与 Restate 版本的关键差异：
 * - 无需 registerEndpoint
 * - Worker 自动从 Task Queue 拉取任务
 * - 原生支持多实例负载均衡
 */

import { AsyncTaskComponent, AsyncTaskComponentConfig } from './AsyncTaskComponent'
import { TemporalAsyncTask } from '@interaqt/temporal-async-task'
import { config as appConfig } from './config.js'
import AggregatedIntegrationClass from './aggregatedIntegration.js'
import { entities, relations, interactions, activities, dicts } from './backend/index.js'

const asyncTaskConfig = appConfig.components.asyncTask

/**
 * 获取 Temporal Server 地址
 */
function getTemporalAddress(): string {
  const temporalMiddleware = asyncTaskConfig.middlewareDependencies?.temporal
  if (!temporalMiddleware?.endpoint) {
    console.log('[StartAsyncTask] No temporal endpoint configured, using default: localhost:7233')
    return 'localhost:7233'
  }
  return temporalMiddleware.endpoint
}

/**
 * 收集所有 Integration 中的 TemporalAsyncTask 实例
 */
function collectAsyncTasks(): TemporalAsyncTask<unknown, unknown>[] {
  const integration = new AggregatedIntegrationClass({
    entities,
    relations,
    activities,
    interactions,
    dict: dicts
  })

  const asyncTasks = integration.createAsyncTasks?.() || []
  
  if (asyncTasks.length === 0) {
    console.log('[StartAsyncTask] No async tasks found in integrations')
  } else {
    console.log(`[StartAsyncTask] Found ${asyncTasks.length} async task(s) from integrations`)
    for (const task of asyncTasks) {
      console.log(`  - ${task.workflowType}`)
    }
  }

  return asyncTasks
}

async function main() {
  console.log('========================================')
  console.log('AsyncTask Component Starting (Temporal)')
  console.log('========================================')
  
  const temporalAddress = getTemporalAddress()
  const namespace = asyncTaskConfig.middlewareDependencies?.temporal?.config?.namespace || 'default'
  const taskQueue = asyncTaskConfig.middlewareDependencies?.temporal?.config?.taskQueue || 'async-tasks'
  
  console.log(`[StartAsyncTask] Configuration:`)
  console.log(`  Temporal Server: ${temporalAddress}`)
  console.log(`  Namespace: ${namespace}`)
  console.log(`  Task Queue: ${taskQueue}`)
  
  // 收集 async tasks
  let tasks: TemporalAsyncTask<unknown, unknown>[]
  try {
    tasks = collectAsyncTasks()
    console.log(`[StartAsyncTask] Collected ${tasks.length} async task(s)`)
  } catch (error) {
    console.error('[StartAsyncTask] Failed to collect async tasks:', error)
    process.exit(1)
  }
  
  // 创建 AsyncTaskComponent
  const componentConfig: AsyncTaskComponentConfig = {
    temporalAddress,
    namespace,
    taskQueue
  }
  
  const component = new AsyncTaskComponent(componentConfig)
  
  // 注册所有任务
  if (tasks.length > 0) {
    component.registerAll(tasks)
  }
  
  // 启动组件
  try {
    await component.start()
    // 注意：无需 registerEndpoint！
    // Worker 自动从 Task Queue 拉取任务
  } catch (error) {
    console.error('[StartAsyncTask] Failed to start AsyncTask Component:', error)
    process.exit(1)
  }
  
  console.log('========================================')
  console.log('AsyncTask Component is running')
  console.log('========================================')
  
  // 优雅关闭
  process.on('SIGINT', async () => {
    console.log('[StartAsyncTask] Received SIGINT, shutting down...')
    await component.stop()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    console.log('[StartAsyncTask] Received SIGTERM, shutting down...')
    await component.stop()
    process.exit(0)
  })
}

main().catch(error => {
  console.error('[StartAsyncTask] Unhandled error:', error)
  process.exit(1)
})
```

---

## 6. nanobanana2-image Integration 示例

```typescript
/**
 * Nano Banana 2 Image Generation Integration
 * 使用 TemporalAsyncTask 重构
 */

import {
  Controller,
  RecordMutationSideEffect,
  MatchExp
} from 'interaqt'
import { IIntegration, IIntegrationConstructorArgs } from '@/integrations/index'
import { APIs, createAPI } from '@/app'
import { TemporalAsyncTask } from '@interaqt/temporal-async-task'
import {
  callImageGenerationApi,
  ImageGenerationResponse,
  fetchImageAsBase64
} from '@/integrations/nanobanana2-image/volcApi'

type ImageGenTaskParams = {
  sourceImageUrl: string
  uploadedImageUrl: string
  prompt: string
}

type ImageGenTaskResult = {
  mergedImageUrl: string
  width: number
  height: number
  format: string
}

export type NanoBanana2ImageGenerationConfig = {
  apiCallEntity: { /* ... */ }
  eventEntity: { /* ... */ }
  api: { queryApiName: string }
  external: {
    apiKey: string
    baseUrl: string
    model: string
  }
}

export function createNanoBanana2ImageGenerationIntegration(config: NanoBanana2ImageGenerationConfig) {
  // 创建 TemporalAsyncTask 实例
  const imageGenTask = new TemporalAsyncTask<ImageGenTaskParams, ImageGenTaskResult>({
    name: 'nanobanana2_image_gen',
    task: async (params) => {
      // 获取图片并转换为 base64
      const sourceImageBase64 = await fetchImageAsBase64(params.sourceImageUrl)
      const uploadedImageBase64 = await fetchImageAsBase64(params.uploadedImageUrl)

      // 调用外部 API
      const apiResponse: ImageGenerationResponse = await callImageGenerationApi(
        {
          model: config.external.model,
          prompt: params.prompt,
          image: [sourceImageBase64, uploadedImageBase64],
          watermark: false
        },
        {
          apiKey: config.external.apiKey,
          baseUrl: config.external.baseUrl,
          model: config.external.model
        }
      )

      // 解析结果
      const imageUrl = apiResponse.data?.[0]?.url
      const cleanedImageUrl = imageUrl?.replace(/\\u0026/g, '&') || ''

      return {
        mergedImageUrl: cleanedImageUrl,
        width: 1024,
        height: 1024,
        format: 'image/jpeg'
      }
    },
    retryPolicy: {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 30000
    }
  })

  return class NanoBanana2ImageGenerationIntegration implements IIntegration {
    constructor(public args: IIntegrationConstructorArgs) {}

    /**
     * 创建异步任务
     */
    createAsyncTasks(): TemporalAsyncTask<any, any>[] {
      return [imageGenTask]
    }

    createSideEffects(): RecordMutationSideEffect<any>[] {
      const self = this

      return [
        RecordMutationSideEffect.create({
          name: `NanoBanana2ImageGeneration_handler`,
          record: { name: config.apiCallEntity.entityName },
          content: async function(this: Controller, event) {
            if (event.type !== 'create') return { success: true }

            const apiCall = event.record
            const requestParams = apiCall[config.apiCallEntity.fields.requestParams]

            console.log('[NanoBanana2ImageGeneration] Processing APICall', {
              apiCallId: apiCall.id,
              requestParams
            })

            try {
              // 使用 TemporalAsyncTask 提交任务
              // submit() 立即返回，任务在后台执行
              const taskId = await imageGenTask.submit({
                sourceImageUrl: requestParams.sourceImageUrl,
                uploadedImageUrl: requestParams.uploadedImageUrl,
                prompt: requestParams.prompt
              })

              console.log('[NanoBanana2ImageGeneration] Task submitted', {
                apiCallId: apiCall.id,
                taskId
              })

              // 创建 processing 事件
              await self.createIntegrationEvent(this, apiCall.id, taskId, 'processing', null, null)

              return { success: true, data: { apiCallId: apiCall.id, taskId } }
            } catch (error: any) {
              console.error('[NanoBanana2ImageGeneration] Error', { error: error.message })
              return { success: false, error: { message: error.message } }
            }
          }
        })
      ]
    }

    createAPIs(): APIs {
      const self = this

      return {
        [config.api.queryApiName]: createAPI(
          async function(this: Controller, context, params: { apiCallId: string }) {
            // 获取 APICall 记录
            const apiCall = await this.system.storage.findOne(
              config.apiCallEntity.entityName,
              MatchExp.atom({ key: 'id', value: ['=', params.apiCallId] })
            )

            if (!apiCall) {
              throw new Error(`APICall not found: ${params.apiCallId}`)
            }

            const externalId = apiCall[config.apiCallEntity.fields.externalId]
            const currentStatus = apiCall[config.apiCallEntity.fields.status]

            // 已完成或失败，直接返回
            if (currentStatus === 'completed' || currentStatus === 'failed') {
              return { success: true, message: `Task already ${currentStatus}` }
            }

            // 使用 TemporalAsyncTask 查询状态
            const taskResult = await imageGenTask.getStatus(externalId)

            // 如果状态变化，创建事件
            if (taskResult.status !== currentStatus && 
                (taskResult.status === 'completed' || taskResult.status === 'failed')) {
              await self.createIntegrationEvent(
                this, null, externalId, taskResult.status, taskResult.result, taskResult.error
              )
            }

            return {
              success: true,
              status: taskResult.status,
              currentStep: taskResult.currentStep,
              completedSteps: taskResult.completedSteps
            }
          },
          { params: { apiCallId: 'string' }, useNamedParams: true, allowAnonymous: false }
        )
      }
    }

    // ... createIntegrationEvent 方法
  }
}
```

---

## 7. 中间件配置

### 7.1 config/deploy.dev.json

```json
{
  "components": {
    "asyncTask": {
      "deploymentType": "local",
      "replicas": 1,
      "host": "localhost",
      "middlewareDependencies": {
        "temporal": {
          "deploymentType": "container",
          "use": "temporal",
          "version": "1.22.0",
          "replicas": 1,
          "config": {
            "namespace": "default",
            "taskQueue": "async-tasks",
            "webUIPort": 8080
          }
        }
      }
    }
  }
}
```

### 7.2 Temporal Server 部署

**Docker Compose（开发环境）：**

```yaml
# docker-compose.temporal.yml
version: '3.8'
services:
  temporal:
    image: temporalio/auto-setup:1.22.0
    ports:
      - "7233:7233"  # gRPC
      - "8080:8080"  # Web UI
    environment:
      - DB=postgresql
      - DB_PORT=5432
      - POSTGRES_USER=temporal
      - POSTGRES_PWD=temporal
      - POSTGRES_SEEDS=postgresql
    depends_on:
      - postgresql

  postgresql:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=temporal
      - POSTGRES_PASSWORD=temporal
```

---

## 8. 多实例部署

### 8.1 Temporal 原生多实例支持

```
                    ┌─────────────────┐
                    │ Temporal Server │
                    │   Task Queue:   │
                    │  "async-tasks"  │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ↓                    ↓                    ↓
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Worker A     │     │ Worker B     │     │ Worker C     │
│ (长轮询)      │     │ (长轮询)      │     │ (长轮询)      │
└──────────────┘     └──────────────┘     └──────────────┘
       ↑                    ↑                    ↑
       └────────────────────┴────────────────────┘
                   共享同一个 Task Queue
                   Temporal 自动分配任务
```

### 8.2 K8s 部署示例

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: asynctask-worker
spec:
  replicas: 3  # 多实例
  selector:
    matchLabels:
      app: asynctask-worker
  template:
    spec:
      containers:
        - name: worker
          image: your-app:latest
          command: ["npm", "run", "dev:async-task"]
          env:
            - name: TEMPORAL_ADDRESS
              value: "temporal-frontend.temporal.svc.cluster.local:7233"
            - name: TEMPORAL_NAMESPACE
              value: "default"
            - name: TEMPORAL_TASK_QUEUE
              value: "async-tasks"
```

**无需额外配置负载均衡器！** 所有 Worker 监听同一个 Task Queue，Temporal 自动分配任务。

---

## 9. 测试设计

### 9.1 单元测试

```typescript
// temporal-async-task/tests/TemporalAsyncTask.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TemporalAsyncTask } from '../src/TemporalAsyncTask'

describe('TemporalAsyncTask', () => {
  describe('单步任务', () => {
    it('应该成功创建任务配置', () => {
      const task = new TemporalAsyncTask({
        name: 'test_task',
        task: async (params: { value: number }) => ({ result: params.value * 2 })
      })

      expect(task.workflowType).toBe('asyncTask_test_task')
      expect(task.taskQueue).toBe('async-tasks')
      expect(task.isMultiStep()).toBe(false)
    })

    it('应该使用自定义 Task Queue', () => {
      const task = new TemporalAsyncTask({
        name: 'custom_queue_task',
        task: async () => 'result',
        taskQueue: 'custom-queue'
      })

      expect(task.taskQueue).toBe('custom-queue')
    })
  })

  describe('多步任务', () => {
    it('应该识别 Generator 函数', () => {
      const task = new TemporalAsyncTask({
        name: 'multi_step',
        task: async function* (params: { value: number }) {
          yield { key: 'step1', call: async () => params.value * 2 }
          return { result: 'done' }
        }
      })

      expect(task.isMultiStep()).toBe(true)
    })
  })
})
```

### 9.2 集成测试

```typescript
// temporal-async-task/tests/integration.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { AsyncTaskComponent } from '../src/AsyncTaskComponent'
import { TemporalAsyncTask } from '../src/TemporalAsyncTask'

describe('Temporal Integration', () => {
  let component: AsyncTaskComponent
  let testTask: TemporalAsyncTask<{ value: number }, { result: number }>

  beforeAll(async () => {
    testTask = new TemporalAsyncTask({
      name: 'integration_test',
      task: async (params) => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return { result: params.value * 2 }
      }
    })

    component = new AsyncTaskComponent({
      temporalAddress: 'localhost:7233',
      namespace: 'default',
      taskQueue: 'test-queue'
    })

    component.register(testTask)
    await component.start()
  })

  afterAll(async () => {
    await component.stop()
  })

  it('应该完成完整的任务提交和查询流程', async () => {
    // 提交任务
    const taskId = await testTask.submit({ value: 5 })
    expect(taskId).toBeDefined()

    // 等待任务完成
    await new Promise(resolve => setTimeout(resolve, 500))

    // 查询状态
    const result = await testTask.getStatus(taskId)
    expect(result.status).toBe('completed')
    expect(result.result).toEqual({ result: 10 })
  })
})
```

---

## 10. Temporal vs Restate 总结

| 维度 | Restate（当前） | Temporal（本方案） |
|------|----------------|-------------------|
| **启动脚本** | 需要 registerEndpoint | 无需注册 |
| **多实例** | 需要外部 LB | 原生 Task Queue 负载均衡 |
| **端口暴露** | Worker 需要暴露 9080 | 无需暴露端口 |
| **代码隔离** | 无要求 | Workflow 必须独立文件 |
| **资源占用** | 轻量 | 较重（需要 PostgreSQL） |
| **Web UI** | 无 | 内置 |
| **生态成熟度** | 新兴 | 成熟 |
| **学习曲线** | 简单 | 中等 |

**建议：**
- 如果需要原生多实例负载均衡和更好的可观测性，选择 Temporal
- 如果追求轻量级和简单部署，继续使用 Restate








