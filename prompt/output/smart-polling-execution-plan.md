# 智能任务轮询策略 - 分步执行计划

## 总体概述

| 当前状态 | 目标状态 |
|---------|---------|
| TaskProcessor: 固定轮询间隔 | TaskProcessor: 自适应轮询 + 队列深度背压 |
| WorkerManager: 默认 Worker 配置 | WorkerManager: ResourceBasedTuner 资源感知 |
| 配置: 简单 pullMode 配置 | 配置: 完整的 tuner/polling/backpressure 体系 |

---

## 执行路线图

```
┌─────────────────────────────────────────────────────────────────┐
│                        执行路线图                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Step 1: 自适应轮询                                              │
│  ├─ 改造 TaskProcessor                                          │
│  ├─ 添加 AdaptivePollingConfig                                  │
│  └─ 测试：单元测试 + 手动验证                                    │
│       │                                                          │
│       ▼                                                          │
│  Step 2: 队列深度背压                                            │
│  ├─ 添加 BackpressureConfig                                     │
│  ├─ 实现 describeTaskQueue 调用                                 │
│  └─ 测试：单元测试 + 集成测试                                    │
│       │                                                          │
│       ▼                                                          │
│  Step 3: ResourceBasedTuner                                      │
│  ├─ 改造 WorkerManager                                          │
│  ├─ 添加 WorkerTunerConfig                                      │
│  └─ 测试：单元测试 + 手动验证                                    │
│       │                                                          │
│       ▼                                                          │
│  Step 4: 配置体系                                                │
│  ├─ 更新 config/deploy.dev.json                                 │
│  ├─ 更新 config/deploy.prod.json                                │
│  ├─ 运行 deploy-tool generate-config 生成配置                   │
│  ├─ 更新 startAsyncTask.ts 通过 config.ts 读取                  │
│  └─ 测试：配置生成 + 配置读取验证                                │
│       │                                                          │
│       ▼                                                          │
│  Step 5: 集成 & 端到端测试                                       │
│  ├─ 完整启动流程验证                                             │
│  ├─ 添加状态监控                                                 │
│  └─ 测试：4 个端到端场景                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step 1: TaskProcessor 自适应轮询

### 1.1 目标

将固定轮询间隔改造为自适应轮询，实现：
- 有任务时快速轮询（最小间隔）
- 无任务时指数退避（逐渐增大间隔到最大值）
- 任务出现时立即恢复快速轮询

### 1.2 改动内容

**文件**: `async-task-component/task-processor.ts`

```typescript
// 新增配置接口
export interface AdaptivePollingConfig {
  minIntervalMs: number        // 最小轮询间隔 (默认 100ms)
  maxIntervalMs: number        // 最大轮询间隔 (默认 5000ms)  
  backoffMultiplier: number    // 退避乘数 (默认 1.5)
  emptyPollsBeforeBackoff: number  // 触发退避的连续空轮询次数 (默认 3)
  batchSize: number            // 每次拉取的批量大小 (默认 10)
}

// 新增状态字段
private currentIntervalMs: number
private consecutiveEmptyPolls: number = 0

// 改造 runPollingLoop 和新增 adjustPollingInterval 方法
```

### 1.3 测试方案

**单元测试** (`tests/task-processor-adaptive-polling.test.ts`):

```typescript
describe('TaskProcessor Adaptive Polling', () => {
  it('should start with minIntervalMs', () => {
    // 验证初始间隔为最小值
  })

  it('should keep minIntervalMs when tasks exist', () => {
    // Mock fetchPendingTasks 返回任务
    // 验证 currentIntervalMs 保持最小值
    // 验证 consecutiveEmptyPolls 重置为 0
  })

  it('should backoff after N consecutive empty polls', () => {
    // Mock fetchPendingTasks 返回空数组
    // 连续调用 N 次
    // 验证 currentIntervalMs 增大
  })

  it('should not exceed maxIntervalMs', () => {
    // 连续空轮询多次
    // 验证 currentIntervalMs <= maxIntervalMs
  })

  it('should reset to minIntervalMs when task appears', () => {
    // 先空轮询让间隔增大
    // 然后返回任务
    // 验证立即重置到 minIntervalMs
  })
})
```

**手动验证步骤**:

1. 启动 AsyncTask 组件
2. 观察日志：无任务时轮询间隔应逐渐增大
3. 创建一个任务，观察轮询间隔立即恢复到最小值

---

## Step 2: TaskProcessor 队列深度背压

### 2.1 目标

通过查询 Temporal Task Queue 深度实现背压控制：
- 队列积压超过阈值时暂停拉取新任务
- 带缓存的队列深度查询（避免频繁调用 API）
- 过载时的退避等待机制

### 2.2 改动内容

**文件**: `async-task-component/task-processor.ts`

```typescript
// 新增背压配置接口
export interface BackpressureConfig {
  maxQueueBacklog: number         // 最大允许积压数量 (默认 100)
  queueCheckIntervalMs: number    // 队列深度查询缓存时间 (默认 5000ms)
  backoffWhenOverloadedMs: number // 过载时等待时间 (默认 2000ms)
}

// 新增状态
private queueBacklogCache: Map<string, { count: number; timestamp: number }> = new Map()

// 新增方法
private async isQueueOverloaded(taskQueue: string): Promise<boolean>
private async getQueueBacklog(taskQueue: string): Promise<number>
```

**关键实现**:

```typescript
private async getQueueBacklog(taskQueue: string): Promise<number> {
  // 调用 Temporal API
  const response = await this.temporalClient!.workflowService.describeTaskQueue({
    namespace: this.config.temporalNamespace,
    taskQueue: { name: taskQueue },
    reportStats: true,
  })
  
  // 解析 approximateBacklogCount
  const backlog = response.stats?.approximateBacklogCount 
    ?? response.taskQueueStatus?.backlogCountHint 
    ?? 0n
  
  return Number(backlog)
}
```

### 2.3 测试方案

**单元测试** (`tests/task-processor-backpressure.test.ts`):

```typescript
describe('TaskProcessor Queue Backpressure', () => {
  it('should allow processing when backlog < maxQueueBacklog', () => {
    // Mock describeTaskQueue 返回低积压
    // 验证 isQueueOverloaded 返回 false
  })

  it('should block processing when backlog >= maxQueueBacklog', () => {
    // Mock describeTaskQueue 返回高积压
    // 验证 isQueueOverloaded 返回 true
  })

  it('should cache queue backlog within queueCheckIntervalMs', () => {
    // 连续两次调用 getQueueBacklog
    // 验证只有一次 API 调用
  })

  it('should refresh cache after queueCheckIntervalMs', () => {
    // 等待超过缓存时间
    // 验证再次调用 API
  })

  it('should handle describeTaskQueue API errors gracefully', () => {
    // Mock API 抛出错误
    // 验证返回 0（允许继续处理）
  })
})
```

**集成测试步骤**:

1. 启动 Temporal Server 和 AsyncTask 组件
2. 人为制造队列积压（启动 workflow 但不启动 worker）
3. 观察日志：当积压 > 阈值时应暂停拉取
4. 启动 worker 消化积压后，观察恢复拉取

---

## Step 3: WorkerManager 添加 ResourceBasedTuner

### 3.1 目标

使用 Temporal 官方的 `ResourceBasedTuner` 实现资源感知的并发控制：
- 根据 CPU/内存使用率自动调整槽位
- 防止 Worker 过载

### 3.2 改动内容

**文件**: `async-task-component/worker-manager.ts`

```typescript
// 新增 Tuner 配置接口
export interface WorkerTunerConfig {
  targetCpuUsage: number      // 目标 CPU 使用率 (0-1)
  targetMemoryUsage: number   // 目标内存使用率 (0-1)
  workflowSlots: {
    minimum: number
    maximum: number
    rampThrottleMs: number
  }
  activitySlots: {
    minimum: number
    maximum: number
    rampThrottleMs: number
  }
}

// 修改构造函数
constructor(
  temporalAddress: string, 
  namespace: string = 'default',
  tunerConfig?: WorkerTunerConfig  // 新增可选参数
)

// 修改 Worker.create 调用
const worker = await Worker.create({
  // ... 原有配置
  tuner: tunerConfig ? {
    tunerOptions: {
      targetCpuUsage: tunerConfig.targetCpuUsage,
      targetMemoryUsage: tunerConfig.targetMemoryUsage,
    },
    workflowTaskSlotOptions: { ... },
    activityTaskSlotOptions: { ... },
  } : undefined,
})
```

### 3.3 测试方案

**单元测试** (`tests/worker-manager-tuner.test.ts`):

```typescript
describe('WorkerManager ResourceBasedTuner', () => {
  it('should create worker without tuner when config not provided', () => {
    // 不传 tunerConfig
    // 验证 Worker 创建成功
  })

  it('should create worker with ResourceBasedTuner when config provided', () => {
    // 传入 tunerConfig
    // 验证 Worker 创建成功
    // 验证日志输出 tuner 配置
  })

  it('should use default values for missing tuner config fields', () => {
    // 传入部分配置
    // 验证使用默认值填充
  })
})
```

**手动验证步骤**:

1. 启动带 ResourceBasedTuner 的 Worker
2. 观察启动日志确认 tuner 配置生效
3. （可选）压测场景下观察 CPU/内存高时 Worker 拉取行为

---

## Step 4: 配置体系更新

### 4.1 配置工作流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         配置生成流程                                         │
│                                                                              │
│   config/deploy.dev.json                    config/deploy.prod.json         │
│           │                                          │                       │
│           └──────────────┬───────────────────────────┘                       │
│                          │                                                   │
│                          ▼                                                   │
│              deploy-tool generate-config --env dev/prod                      │
│                          │                                                   │
│                          ▼                                                   │
│           ┌──────────────┴──────────────┐                                   │
│           │                             │                                   │
│           ▼                             ▼                                   │
│    app.config.json              app.config.host.json                        │
│    (容器内使用)                   (本地开发使用)                              │
│           │                             │                                   │
│           └──────────────┬──────────────┘                                   │
│                          │                                                   │
│                          ▼                                                   │
│                      config.ts                                               │
│              (根据 CONFIG_MODE 选择配置)                                      │
│                          │                                                   │
│                          ▼                                                   │
│                    应用代码读取                                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 改动内容

#### 4.2.1 修改 `config/deploy.dev.json`

在 `components.asyncTask.applicationConfig` 中添加新配置：

```json
{
  "components": {
    "asyncTask": {
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

#### 4.2.2 修改 `config/deploy.prod.json`

生产环境配置（更激进的参数）：

```json
{
  "components": {
    "asyncTask": {
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

#### 4.2.3 更新 `async-task-component/startAsyncTask.ts` 配置读取

```typescript
import { config as appConfig } from '../config.js'

/**
 * 获取 AsyncTask 完整配置
 * 从 config.ts 读取，它会根据 CONFIG_MODE 环境变量选择正确的配置文件
 */
function getAsyncTaskConfig() {
  const asyncTaskConfig = (appConfig as any).components.asyncTask
  const appCfg = asyncTaskConfig?.applicationConfig || {}

  return {
    tuner: appCfg.tuner,
    polling: appCfg.polling,
    backpressure: appCfg.backpressure,
    internalApiToken: appCfg.internalApiToken
  }
}
```

### 4.3 生成配置命令

```bash
# 进入 deploy-tool 目录
cd deploy-tool

# 生成开发环境配置
npx tsx src/index.ts generate-config --env dev

# 或生成生产环境配置
npx tsx src/index.ts generate-config --env prod
```

这会生成：
- `app.config.json` - 容器内使用的配置
- `app.config.host.json` - 本地开发使用的配置（CONFIG_MODE=local）

### 4.4 测试方案

**验证步骤**:

1. **配置生成验证**
   ```bash
   cd deploy-tool
   npx tsx src/index.ts generate-config --env dev
   ```
   检查 `app.config.json` 中 `components.asyncTask.applicationConfig` 是否包含完整的 tuner/polling/backpressure 配置

2. **配置读取验证**
   ```bash
   # 本地模式
   CONFIG_MODE=local npm run dev:async-task
   ```
   观察启动日志确认配置被正确读取：
   ```
   [StartAsyncTask] Configuration:
     Target CPU: 70%
     Target Memory: 80%
     Polling: 100ms - 5000ms
     Backpressure: max backlog 100
   ```

3. **默认值验证**
   - 临时移除 `deploy.dev.json` 中的部分配置项
   - 重新生成配置并启动
   - 验证使用了代码中定义的默认值

---

## Step 5: 集成 & 端到端测试

### 5.1 目标

整合所有改动到 `startAsyncTask.ts`，并进行端到端测试

### 5.2 改动内容

**文件**: `async-task-component/startAsyncTask.ts`

```typescript
// 更新配置读取函数
function getAsyncTaskConfig(): {
  tuner?: WorkerTunerConfig
  polling?: AdaptivePollingConfig
  backpressure?: BackpressureConfig
  internalApiToken?: string
}

// 更新 WorkerManager 创建
const tunerConfig: WorkerTunerConfig = { ... }
workerManager = new WorkerManager(temporalAddress, namespace, tunerConfig)

// 更新 TaskProcessor 创建
const processorConfig: TaskProcessorConfig = {
  instanceId: INSTANCE_ID,
  temporalAddress,
  temporalNamespace: namespace,
  internalToken: config.internalApiToken,
  polling: { ... },
  backpressure: { ... }
}
taskProcessor = new TaskProcessor(processorConfig)

// 添加状态监控日志
setInterval(() => {
  if (taskProcessor) {
    const status = taskProcessor.getStatus()
    console.log(`[Monitor] Polling: ${status.currentIntervalMs}ms, EmptyPolls: ${status.consecutiveEmptyPolls}`)
    console.log(`[Monitor] Queue backlogs:`, status.queueBacklogs)
  }
}, 30000)  // 每 30 秒输出一次状态
```

### 5.3 端到端测试方案

**场景 1: 空闲状态自适应轮询**

```
1. 启动 Main Component 和 AsyncTask Component
2. 不创建任何任务
3. 预期行为：
   - 初始轮询间隔 100ms
   - 连续 3 次空轮询后开始退避
   - 间隔逐渐增大：100 → 150 → 225 → 337 → ... → 5000ms
4. 验证：观察日志中的 currentIntervalMs 变化
```

**场景 2: 任务出现时恢复快速轮询**

```
1. 等待轮询间隔增大到较大值
2. 通过 API 创建一个异步任务
3. 预期行为：
   - 下次轮询发现任务
   - 立即重置间隔到 100ms
4. 验证：观察日志中 currentIntervalMs 重置
```

**场景 3: 队列积压背压控制**

```
1. 停止 Temporal Worker（只保留 TaskProcessor）
2. 批量创建 150 个任务
3. 预期行为：
   - 任务提交到 Task Queue
   - 队列积压到 100 后，TaskProcessor 暂停拉取
   - 日志显示 "Queue xxx overloaded, skipping"
4. 启动 Worker 消化积压
5. 预期行为：
   - 积压降低后恢复拉取
6. 验证：观察 queueBacklogs 监控数据
```

**场景 4: Worker 资源感知**

```
1. 启动带 ResourceBasedTuner 的 Worker
2. 观察启动日志确认配置：
   - "Worker created with ResourceBasedTuner"
   - "Target CPU: 70%"
   - "Target Memory: 80%"
3. （高级）压测场景：提交大量 CPU 密集型任务
4. 预期行为：Worker 自动限制并发，不会 OOM
```

---

## 风险点与注意事项

| 风险 | 缓解措施 |
|------|---------|
| `describeTaskQueue` API 可能不支持旧版 Temporal | 添加 fallback 到 `taskQueueStatus.backlogCountHint` |
| ResourceBasedTuner 在某些环境可能不生效 | 保持可选配置，不传则使用默认行为 |
| 队列深度查询频率过高影响性能 | 使用缓存机制，默认 5 秒 |
| 配置项过多导致复杂度上升 | 所有配置项都有合理默认值 |

---

## 附录：配置参数说明

### ResourceBasedTuner 配置（Worker 层）

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

### 自适应轮询配置（TaskProcessor 层）

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `minIntervalMs` | 100 | 有任务时的最小轮询间隔 |
| `maxIntervalMs` | 5000 | 空闲时的最大轮询间隔 |
| `backoffMultiplier` | 1.5 | 退避乘数 |
| `emptyPollsBeforeBackoff` | 3 | 触发退避的连续空轮询次数 |
| `batchSize` | 10 | 每次拉取的任务数量 |

### 队列深度背压配置（TaskProcessor 层）

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `maxQueueBacklog` | 100 | 最大允许的队列积压数量，超过后暂停拉取新任务 |
| `queueCheckIntervalMs` | 5000 | 队列深度查询的缓存时间 |
| `backoffWhenOverloadedMs` | 2000 | 队列过载时的等待时间 |

