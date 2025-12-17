/**
 * Task Processor - HTTP-based task polling and workflow dispatching
 * 
 * This component:
 * 1. Periodically polls Main Component for pending tasks via HTTP
 * 2. Reports "queued" status via HTTP before starting workflow
 * 3. Starts Temporal workflows with idempotent workflowIds
 * 
 * Key features:
 * - Adaptive polling: fast polling when tasks exist, backoff when idle
 * - Queue backpressure: monitors Temporal Task Queue depth, pauses when overloaded
 * - NO database connection - all communication via HTTP APIs
 * - Idempotent workflow starting - same workflowId won't create duplicates
 * - Graceful handling of failures - reports errors back to Main Component
 */

import { Client, Connection, WorkflowExecutionAlreadyStartedError } from '@temporalio/client'
import { PullModeConfig } from '@/integrations/index.js'

/**
 * 自适应轮询配置
 */
export interface AdaptivePollingConfig {
  /** 最小轮询间隔 (ms) - 有任务时使用 */
  minIntervalMs: number
  /** 最大轮询间隔 (ms) - 空闲时最大退避 */
  maxIntervalMs: number
  /** 退避乘数 */
  backoffMultiplier: number
  /** 触发退避的连续空轮询次数 */
  emptyPollsBeforeBackoff: number
  /** 每次拉取的批量大小 */
  batchSize: number
}

/**
 * 队列深度背压配置
 */
export interface BackpressureConfig {
  /** 最大允许的队列积压数量，超过后暂停拉取新任务 */
  maxQueueBacklog: number
  /** 队列深度查询的缓存时间 (ms) */
  queueCheckIntervalMs: number
  /** 队列过载时的等待时间 (ms) */
  backoffWhenOverloadedMs: number
}

export interface TaskProcessorConfig {
  /** Unique instance identifier for logging */
  instanceId: string
  /** Temporal server address */
  temporalAddress: string
  /** Temporal namespace */
  temporalNamespace: string
  /** Token for authenticating to Main Component APIs */
  internalToken?: string
  
  /** 自适应轮询配置 */
  polling: AdaptivePollingConfig
  
  /** 队列深度背压配置 */
  backpressure: BackpressureConfig
}

const DEFAULT_POLLING_CONFIG: AdaptivePollingConfig = {
  minIntervalMs: 100,
  maxIntervalMs: 5000,
  backoffMultiplier: 1.5,
  emptyPollsBeforeBackoff: 3,
  batchSize: 10
}

const DEFAULT_BACKPRESSURE_CONFIG: BackpressureConfig = {
  maxQueueBacklog: 100,
  queueCheckIntervalMs: 5000,
  backoffWhenOverloadedMs: 2000
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

  constructor(private config: TaskProcessorConfig) {
    // 确保使用默认值填充缺失的配置
    this.config.polling = { ...DEFAULT_POLLING_CONFIG, ...config.polling }
    this.config.backpressure = { ...DEFAULT_BACKPRESSURE_CONFIG, ...config.backpressure }
    this.currentIntervalMs = this.config.polling.minIntervalMs
  }

  /**
   * Start the task processor
   * Connects to Temporal and begins the polling loop
   */
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

  /**
   * Stop the task processor gracefully
   */
  async stop(): Promise<void> {
    console.log(`[TaskProcessor:${this.config.instanceId}] Stopping...`)
    this.isRunning = false
    await this.temporalConnection?.close()
    console.log(`[TaskProcessor:${this.config.instanceId}] Stopped`)
  }

  private async connectTemporal(): Promise<void> {
    console.log(`[TaskProcessor:${this.config.instanceId}] Connecting to Temporal at ${this.config.temporalAddress}`)
    
    this.temporalConnection = await Connection.connect({
      address: this.config.temporalAddress
    })
    
    this.temporalClient = new Client({
      connection: this.temporalConnection,
      namespace: this.config.temporalNamespace
    })
    
    console.log(`[TaskProcessor:${this.config.instanceId}] Connected to Temporal`)
  }

  private startPollingLoop(): void {
    // Start polling in background (non-blocking)
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
        ?? (response as any).taskQueueStatus?.backlogCountHint 
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

  /**
   * Fetch pending tasks from Main Component via HTTP
   * Uses the fetchPendingTasks API provided by each integration
   */
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
        console.error(`[TaskProcessor:${this.config.instanceId}] Failed to fetch tasks: ${response.status}`)
        return []
      }
      
      const { tasks } = await response.json() as { tasks: any[] }
      return tasks || []
    } catch (error: any) {
      console.error(`[TaskProcessor:${this.config.instanceId}] Fetch error:`, error.message)
      return []
    }
  }

  /**
   * Report task event to Main Component via HTTP
   * Uses the reportTaskEvent API (same as reportResult) provided by each integration
   */
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
      
      const result = await response.json() as { success: boolean; error?: string }
      return result.success
    } catch (error: any) {
      console.error(`[TaskProcessor:${this.config.instanceId}] Report error:`, error.message)
      return false
    }
  }

  /**
   * Process a single task:
   * 1. Report "queued" status to Main Component
   * 2. Start Temporal workflow with idempotent workflowId
   */
  private async processTask(
    apiCall: any,
    namespace: string,
    pullConfig: PullModeConfig
  ): Promise<boolean> {
    const workflowId = `${namespace}:${pullConfig.buildWorkflowId(apiCall)}`
    
    try {
      // Step 1: Report "queued" event via HTTP
      // This is the "claim" step - if it fails, another processor might get it
      const reported = await this.reportTaskEvent(pullConfig, apiCall.id, 'queued')
      
      if (!reported) {
        // Task might have been claimed by another processor, or status check failed
        console.log(`[TaskProcessor:${this.config.instanceId}] Queued report failed, skipping`, { 
          apiCallId: apiCall.id 
        })
        return false
      }

      // Step 2: Start Temporal workflow with idempotent ID
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
        // Idempotent: workflow already exists, this is OK
        console.log(`[TaskProcessor:${this.config.instanceId}] Workflow already exists (idempotent)`, { 
          workflowId 
        })
        return true
      }

      console.error(`[TaskProcessor:${this.config.instanceId}] Workflow start failed`, { 
        apiCallId: apiCall.id, 
        error: error.message 
      })

      // Report failure so task can be retried
      await this.reportTaskEventWithRetry(
        pullConfig,
        apiCall.id,
        'failed',
        { error: `Workflow start failed: ${error.message}` }
      )
      
      return false
    }
  }

  /**
   * Report event with exponential backoff retry
   */
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
      
      const delay = 1000 * Math.pow(2, attempt)  // 1s, 2s, 4s
      console.log(`[TaskProcessor:${this.config.instanceId}] Retrying report in ${delay}ms`)
      await this.sleep(delay)
    }
    
    console.error(`[TaskProcessor:${this.config.instanceId}] Failed to report after ${maxRetries} retries`)
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
