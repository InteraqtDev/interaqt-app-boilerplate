/**
 * AsyncTask Component 启动脚本
 * 
 * 基于 Temporal 的异步任务执行组件启动入口
 * 
 * 功能：
 * 1. 连接到 Temporal Server
 * 2. 收集 integrations 目录下所有的 workflows
 * 3. 为每个 integration 创建独立的 Worker（支持 ResourceBasedTuner）
 * 4. 启动所有 Workers 监听各自的 Task Queue
 * 5. [Pull Mode] 启动 TaskProcessor 轮询待处理任务（自适应轮询 + 队列深度背压）
 * 
 * Pull Mode 特性：
 * - 不需要数据库连接
 * - 通过 HTTP API 与 Main Component 通信
 * - 支持水平扩展多个实例
 * - 自适应轮询：有任务时快速轮询，空闲时退避
 * - 队列深度背压：防止 Task Queue 无限堆积
 * 
 * 使用方式：
 *   npm run dev:async-task
 *   或
 *   tsx async-task-component/startAsyncTask.ts
 */

import * as path from 'path'
import * as crypto from 'crypto'
import { fileURLToPath } from 'url'
import { config as appConfig } from '../config.js'
import { collectIntegrationWorkflows } from './workflow-collector.js'
import { WorkerManager, WorkerTunerConfig } from './worker-manager.js'
import { TaskProcessor, TaskProcessorConfig, AdaptivePollingConfig, BackpressureConfig } from './task-processor.js'
import { entities, relations, interactions, activities, dicts } from '@/backend/index.js'
import AggregatedIntegrationClass from '@/integrations/entries/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Generate unique instance ID for logging
const INSTANCE_ID = `worker-${process.env.HOSTNAME || crypto.randomUUID().slice(0, 8)}`

/**
 * 获取 Temporal Server 地址
 * 从配置中读取 asyncTask 组件的 temporal middleware 配置
 */
function getTemporalAddress(): string {
  const asyncTaskConfig = (appConfig as any).components.asyncTask
  const temporalConfig = asyncTaskConfig?.middlewareDependencies?.temporal

  const endpointValue = temporalConfig?.endpoints.main.value
  if (!endpointValue) {
    throw new Error('Temporal endpoint (endpoints.main.value) not found in configuration')
  }

  // 从 endpoint 提取地址（格式可能是 grpc://host:port 或 http://host:port）
  // 移除协议前缀 (grpc://, http://, https://)
  const endpoint = endpointValue.replace(/^(grpc|https?):\/\//, '')
    
  console.log(`[StartAsyncTask] Using Temporal endpoint from config: ${endpoint}`)
  return endpoint
}

/**
 * 获取 Temporal Namespace
 */
function getNamespace(): string {
  const asyncTaskConfig = (appConfig as any).components.asyncTask
  const temporalConfig = asyncTaskConfig?.middlewareDependencies?.temporal
  
  const namespace = temporalConfig?.config?.defaultNamespace || 'default'
  console.log(`[StartAsyncTask] Using namespace: ${namespace}`)
  return namespace
}

/**
 * 获取 AsyncTask 完整配置
 * 从 config.ts 读取，它会根据 CONFIG_MODE 环境变量选择正确的配置文件
 */
function getAsyncTaskConfig(): {
  tuner?: WorkerTunerConfig
  polling?: Partial<AdaptivePollingConfig>
  backpressure?: Partial<BackpressureConfig>
  internalApiToken?: string
} {
  const asyncTaskConfig = (appConfig as any).components.asyncTask
  const appCfg = asyncTaskConfig?.applicationConfig || {}

  return {
    tuner: appCfg.tuner,
    polling: appCfg.polling,
    backpressure: appCfg.backpressure,
    internalApiToken: appCfg.internalApiToken
  }
}

/**
 * Integration 黑名单前缀
 * 以这些前缀开头的 integration 不会被收集 workflows
 */
const BLACKLIST_PREFIXES = [
  'example_',      // 示例 integration
  'kafka.old',     // 废弃的 kafka integration
  'docs'           // 文档目录
]

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
  console.log(`  Integrations Path: ${integrationsPath}`)
  console.log(`  Blacklist Prefixes: ${BLACKLIST_PREFIXES.join(', ')}`)
  console.log('')

  // ============================================
  // Part 1: Initialize Integrations (for PullModeConfig)
  // Note: NO database connection needed!
  // ============================================
  console.log('[StartAsyncTask] Initializing integrations for PullMode config...')
  
  const integration = new AggregatedIntegrationClass({
    entities, relations, activities, interactions, dict: dicts
  })
  
  // Only call configure() - NOT setup() which requires database
  await integration.configure?.()
  
  // Collect PullModeConfigs from all enabled integrations
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

  console.log(`[StartAsyncTask] Found ${pullModeConfigs.length} integration(s) with PullMode enabled`)
  console.log('')

  // ============================================
  // Part 2: Start Temporal Workers with ResourceBasedTuner
  // ============================================
  console.log('[StartAsyncTask] Collecting integration workflows...')
  const workflowInfos = collectIntegrationWorkflows(integrationsPath, BLACKLIST_PREFIXES)

  let workerManager: WorkerManager | null = null

  if (workflowInfos.length === 0) {
    console.log('[StartAsyncTask] No integrations with workflows found.')
  } else {
    console.log(`[StartAsyncTask] Found ${workflowInfos.length} integration(s) with workflows:`)
    for (const info of workflowInfos) {
      console.log(`  - ${info.integrationName} (queue: ${info.taskQueue})`)
    }
    console.log('')

    // 使用 ResourceBasedTuner 配置
    const tunerConfig: WorkerTunerConfig | undefined = config.tuner ? {
      targetCpuUsage: config.tuner.targetCpuUsage ?? 0.7,
      targetMemoryUsage: config.tuner.targetMemoryUsage ?? 0.8,
      workflowSlots: {
        minimum: config.tuner.workflowSlots?.minimum ?? 2,
        maximum: config.tuner.workflowSlots?.maximum ?? 100,
        rampThrottleMs: config.tuner.workflowSlots?.rampThrottleMs ?? 10
      },
      activitySlots: {
        minimum: config.tuner.activitySlots?.minimum ?? 1,
        maximum: config.tuner.activitySlots?.maximum ?? 200,
        rampThrottleMs: config.tuner.activitySlots?.rampThrottleMs ?? 50
      }
    } : undefined

    if (tunerConfig) {
      console.log('[StartAsyncTask] ResourceBasedTuner config:')
      console.log(`  Target CPU: ${tunerConfig.targetCpuUsage * 100}%`)
      console.log(`  Target Memory: ${tunerConfig.targetMemoryUsage * 100}%`)
      console.log(`  Workflow slots: ${tunerConfig.workflowSlots.minimum}-${tunerConfig.workflowSlots.maximum}`)
      console.log(`  Activity slots: ${tunerConfig.activitySlots.minimum}-${tunerConfig.activitySlots.maximum}`)
      console.log('')
    }

    // Create and start workers
    workerManager = new WorkerManager(temporalAddress, namespace, tunerConfig)
    
    console.log('[StartAsyncTask] Connecting to Temporal Server...')
    await workerManager.connect()

    console.log('[StartAsyncTask] Creating workers...')
    await workerManager.createWorkers(workflowInfos)

    console.log('[StartAsyncTask] Starting workers...')
    await workerManager.startAll()

    console.log('[StartAsyncTask] Workers status:')
    const status = workerManager.getStatus()
    for (const s of status) {
      console.log(`  - ${s.integrationName}: ${s.running ? 'running' : 'stopped'} (queue: ${s.taskQueue})`)
    }
    console.log('')
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
    console.log(`  Batch size: ${processorConfig.polling.batchSize}`)
    console.log(`  Backpressure: max backlog ${processorConfig.backpressure.maxQueueBacklog}`)
    console.log('')

    taskProcessor = new TaskProcessor(processorConfig)
    await taskProcessor.start(pullModeConfigs)
    console.log('[StartAsyncTask] TaskProcessor started')
  } else {
    console.log('[StartAsyncTask] No PullMode integrations, TaskProcessor not started')
  }

  console.log('')
  console.log('========================================')
  console.log('AsyncTask Component is running')
  console.log('========================================')
  console.log('')
  console.log('Press Ctrl+C to stop')

  // 添加状态监控日志（每 30 秒输出一次状态）
  const monitorInterval = setInterval(() => {
    if (taskProcessor) {
      const status = taskProcessor.getStatus()
      console.log(`[Monitor] Polling interval: ${status.currentIntervalMs}ms, Empty polls: ${status.consecutiveEmptyPolls}`)
      const queueNames = Object.keys(status.queueBacklogs)
      if (queueNames.length > 0) {
        console.log(`[Monitor] Queue backlogs:`, status.queueBacklogs)
      }
    }
  }, 30000)

  // Graceful shutdown handler
  const shutdown = async () => {
    console.log('\n[StartAsyncTask] Shutting down...')
    
    clearInterval(monitorInterval)
    
    try {
      if (taskProcessor) {
        await taskProcessor.stop()
      }
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

  // Keep process running
  await new Promise(() => {})
}

// Run main function
main().catch(error => {
  console.error('[StartAsyncTask] Unhandled error:', error)
  process.exit(1)
})
