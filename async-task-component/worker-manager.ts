/**
 * Worker Manager
 * 
 * 负责管理 Temporal Workers 的生命周期
 * 
 * 功能：
 * 1. 连接到 Temporal Server
 * 2. 为每个 integration 创建独立的 Worker
 * 3. 使用 ResourceBasedTuner 实现资源感知的并发控制
 * 4. 管理 Workers 的启动和停止
 */

import { Worker, NativeConnection, bundleWorkflowCode, Runtime } from '@temporalio/worker'
import type { IntegrationWorkflowInfo } from './workflow-collector.js'
import * as path from 'path'

/**
 * Worker Tuner 配置
 * 使用 Temporal 官方的 ResourceBasedTuner 实现资源感知
 */
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

/**
 * 默认 Tuner 配置
 */
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

/**
 * Worker 状态
 */
export interface WorkerStatus {
  integrationName: string
  taskQueue: string
  running: boolean
  error?: string
}

/**
 * 单个 Worker 实例信息
 */
interface WorkerInstance {
  worker: Worker
  integrationName: string
  taskQueue: string
  running: boolean
  runPromise?: Promise<void>
}

/**
 * Worker Manager
 * 
 * 管理所有 Temporal Workers 的生命周期
 * 支持 ResourceBasedTuner 进行资源感知的并发控制
 */
export class WorkerManager {
  private connection: NativeConnection | null = null
  private workers: Map<string, WorkerInstance> = new Map()
  private readonly temporalAddress: string
  private readonly namespace: string
  private readonly tunerConfig?: WorkerTunerConfig

  constructor(
    temporalAddress: string, 
    namespace: string = 'default',
    tunerConfig?: WorkerTunerConfig
  ) {
    this.temporalAddress = temporalAddress
    this.namespace = namespace
    // 如果提供了 tunerConfig，与默认值合并
    this.tunerConfig = tunerConfig ? {
      ...DEFAULT_TUNER_CONFIG,
      ...tunerConfig,
      workflowSlots: { ...DEFAULT_TUNER_CONFIG.workflowSlots, ...tunerConfig.workflowSlots },
      activitySlots: { ...DEFAULT_TUNER_CONFIG.activitySlots, ...tunerConfig.activitySlots }
    } : undefined
  }

  /**
   * 连接到 Temporal Server
   */
  async connect(): Promise<void> {
    console.log(`[WorkerManager] Connecting to Temporal at ${this.temporalAddress}...`)
    
    try {
      this.connection = await NativeConnection.connect({
        address: this.temporalAddress,
      })
      console.log('[WorkerManager] Connected to Temporal Server')
    } catch (error: any) {
      console.error('[WorkerManager] Failed to connect to Temporal:', error.message)
      throw error
    }
  }

  /**
   * 断开与 Temporal Server 的连接
   */
  async disconnect(): Promise<void> {
    if (this.connection) {
      console.log('[WorkerManager] Disconnecting from Temporal...')
      await this.connection.close()
      this.connection = null
      console.log('[WorkerManager] Disconnected')
    }
  }

  /**
   * 为每个 integration 创建 Worker
   * 
   * @param workflowInfos - Integration workflow 信息列表
   */
  async createWorkers(workflowInfos: IntegrationWorkflowInfo[]): Promise<void> {
    if (!this.connection) {
      throw new Error('Not connected to Temporal Server. Call connect() first.')
    }

    for (const info of workflowInfos) {
      try {
        console.log(`[WorkerManager] Creating worker for ${info.integrationName}...`)
        
        // Bundle workflow code
        console.log(`[WorkerManager] Bundling workflow code from ${info.workflowsPath}...`)
        const workflowBundle = await bundleWorkflowCode({
          workflowsPath: path.join(info.workflowsPath, 'index.ts'),
        })

        // 准备 activities
        let activities: Record<string, any> | undefined
        if (info.activitiesPath) {
          console.log(`[WorkerManager] Loading activities from ${info.activitiesPath}...`)
          try {
            // 动态加载 activities 模块
            const activitiesModule = await import(path.join(info.activitiesPath, 'index.ts'))
            activities = {}
            
            // 收集所有导出的函数作为 activities
            for (const [name, value] of Object.entries(activitiesModule)) {
              if (typeof value === 'function') {
                activities[name] = value
                console.log(`[WorkerManager]   - Registered activity: ${name}`)
              }
            }
          } catch (error: any) {
            console.warn(`[WorkerManager] Failed to load activities for ${info.integrationName}:`, error.message)
          }
        }

        // 创建 Worker，根据是否有 tunerConfig 决定是否使用 ResourceBasedTuner
        const workerOptions: Parameters<typeof Worker.create>[0] = {
          connection: this.connection,
          namespace: this.namespace,
          taskQueue: info.taskQueue,
          workflowBundle,
          activities,
        }

        // 如果配置了 ResourceBasedTuner，添加 tuner 配置
        if (this.tunerConfig) {
          workerOptions.tuner = {
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
          }
          console.log(`[WorkerManager] Worker created with ResourceBasedTuner for ${info.integrationName}`)
          console.log(`[WorkerManager]   Target CPU: ${this.tunerConfig.targetCpuUsage * 100}%`)
          console.log(`[WorkerManager]   Target Memory: ${this.tunerConfig.targetMemoryUsage * 100}%`)
          console.log(`[WorkerManager]   Workflow slots: ${this.tunerConfig.workflowSlots.minimum}-${this.tunerConfig.workflowSlots.maximum}`)
          console.log(`[WorkerManager]   Activity slots: ${this.tunerConfig.activitySlots.minimum}-${this.tunerConfig.activitySlots.maximum}`)
        }

        const worker = await Worker.create(workerOptions)

        // 保存 Worker 实例
        this.workers.set(info.integrationName, {
          worker,
          integrationName: info.integrationName,
          taskQueue: info.taskQueue,
          running: false,
        })

        console.log(`[WorkerManager] Worker created for ${info.integrationName} (queue: ${info.taskQueue})`)

      } catch (error: any) {
        console.error(`[WorkerManager] Failed to create worker for ${info.integrationName}:`, error.message)
        // 继续创建其他 workers，不中断
      }
    }

    console.log(`[WorkerManager] Created ${this.workers.size} worker(s)`)
  }

  /**
   * 启动所有 Workers
   */
  async startAll(): Promise<void> {
    console.log('[WorkerManager] Starting all workers...')
    
    const startPromises: Promise<void>[] = []

    for (const [name, instance] of this.workers) {
      if (instance.running) {
        console.log(`[WorkerManager] Worker ${name} is already running`)
        continue
      }

      // 启动 worker（非阻塞）
      const runPromise = instance.worker.run().catch(error => {
        console.error(`[WorkerManager] Worker ${name} stopped with error:`, error.message)
        instance.running = false
        instance.runPromise = undefined
      })

      instance.running = true
      instance.runPromise = runPromise

      console.log(`[WorkerManager] Worker ${name} started`)
    }

    console.log(`[WorkerManager] All workers started`)
  }

  /**
   * 启动单个 Worker
   * 
   * @param integrationName - Integration 名称
   */
  async start(integrationName: string): Promise<void> {
    const instance = this.workers.get(integrationName)
    if (!instance) {
      throw new Error(`Worker not found for integration: ${integrationName}`)
    }

    if (instance.running) {
      console.log(`[WorkerManager] Worker ${integrationName} is already running`)
      return
    }

    // 启动 worker（非阻塞）
    const runPromise = instance.worker.run().catch(error => {
      console.error(`[WorkerManager] Worker ${integrationName} stopped with error:`, error.message)
      instance.running = false
      instance.runPromise = undefined
    })

    instance.running = true
    instance.runPromise = runPromise

    console.log(`[WorkerManager] Worker ${integrationName} started`)
  }

  /**
   * 停止所有 Workers
   */
  async stopAll(): Promise<void> {
    console.log('[WorkerManager] Stopping all workers...')

    const shutdownPromises: Promise<void>[] = []

    for (const [name, instance] of this.workers) {
      if (!instance.running) {
        continue
      }

      console.log(`[WorkerManager] Shutting down worker ${name}...`)
      
      // 优雅关闭 worker
      instance.worker.shutdown()
      instance.running = false

      if (instance.runPromise) {
        shutdownPromises.push(
          instance.runPromise.catch(() => {
            // 忽略关闭时的错误
          })
        )
      }
    }

    // 等待所有 workers 完成关闭
    await Promise.all(shutdownPromises)

    console.log('[WorkerManager] All workers stopped')
  }

  /**
   * 停止单个 Worker
   * 
   * @param integrationName - Integration 名称
   */
  async stop(integrationName: string): Promise<void> {
    const instance = this.workers.get(integrationName)
    if (!instance) {
      throw new Error(`Worker not found for integration: ${integrationName}`)
    }

    if (!instance.running) {
      console.log(`[WorkerManager] Worker ${integrationName} is not running`)
      return
    }

    console.log(`[WorkerManager] Shutting down worker ${integrationName}...`)
    
    instance.worker.shutdown()
    instance.running = false

    if (instance.runPromise) {
      await instance.runPromise.catch(() => {
        // 忽略关闭时的错误
      })
    }

    console.log(`[WorkerManager] Worker ${integrationName} stopped`)
  }

  /**
   * 获取所有 Workers 的状态
   */
  getStatus(): WorkerStatus[] {
    const statuses: WorkerStatus[] = []

    for (const [name, instance] of this.workers) {
      statuses.push({
        integrationName: name,
        taskQueue: instance.taskQueue,
        running: instance.running,
      })
    }

    return statuses
  }

  /**
   * 获取单个 Worker 的状态
   * 
   * @param integrationName - Integration 名称
   */
  getWorkerStatus(integrationName: string): WorkerStatus | undefined {
    const instance = this.workers.get(integrationName)
    if (!instance) {
      return undefined
    }

    return {
      integrationName: instance.integrationName,
      taskQueue: instance.taskQueue,
      running: instance.running,
    }
  }

  /**
   * 获取 Tuner 配置（用于监控）
   */
  getTunerConfig(): WorkerTunerConfig | undefined {
    return this.tunerConfig
  }
}
