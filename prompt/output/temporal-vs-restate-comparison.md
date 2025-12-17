# Temporal vs Restate 异步任务实现对比

## 概述

本文档详细对比当前基于 Restate 的异步任务实现与使用 Temporal 的替代方案，包括架构差异、代码示例、迁移成本和各自的优缺点。

---

## 1. 架构对比

### 1.1 Restate 架构（当前实现）

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Main App      │ ──────> │  Restate Server │ ──────> │ AsyncTask       │
│  (业务应用)      │   HTTP   │  (协调器/代理)   │   HTTP   │ Component       │
│                 │         │                 │         │ (Worker)        │
│ submit()  ──────┼────────>│ 路由 + 状态管理  │────────>│ 执行 workflow   │
│ getStatus() ────┼────────>│ 查询状态        │<────────┼ 返回结果        │
└─────────────────┘         └─────────────────┘         └─────────────────┘
     localhost:3000              localhost:8080              localhost:9080
```

**特点：**
- Sidecar/代理模式，Worker 代码独立运行
- HTTP/gRPC 通信
- 需要手动注册 endpoint
- 无原生多实例负载均衡

### 1.2 Temporal 架构（替代方案）

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Main App      │ ──────> │ Temporal Server │ <────── │ Temporal Worker │
│  (业务应用)      │  gRPC    │  (协调器)        │  gRPC    │ (拉取任务)       │
│                 │         │                 │         │                 │
│ submit()  ──────┼────────>│ 任务入队        │         │ 长轮询获取任务   │
│ getStatus() ────┼────────>│ 查询历史        │         │ 执行并报告结果   │
└─────────────────┘         └─────────────────┘         └─────────────────┘
     localhost:3000              localhost:7233              localhost:xxxx
                                                            (无需固定端口)
```

**特点：**
- Worker 主动拉取任务（长轮询）
- 无需注册 endpoint
- 原生支持多实例负载均衡
- 更成熟的生态系统

---

## 2. 核心概念对比

| 概念 | Restate | Temporal |
|------|---------|----------|
| 任务单元 | Workflow | Workflow |
| 执行步骤 | ctx.run() / Side Effect | Activity |
| 状态存储 | K/V State (ctx.set/get) | Workflow State (自动持久化) |
| 重试机制 | 配置在 ctx.run() 中 | 配置在 Activity Options 中 |
| 任务路由 | 基于 Key 分区 | 基于 Task Queue |
| 多实例 | 需要外部 LB | 原生支持 |
| 通信方式 | HTTP/gRPC (推送) | gRPC (拉取) |

---

## 3. 代码实现对比

### 3.1 当前 Restate 实现

#### RestateAsyncTask.ts (核心类)

```typescript
import * as restate from "@restatedev/restate-sdk"

export class RestateAsyncTask<TParams, TResult> {
  public readonly serviceName: string
  private restateServerUrl: string = 'http://localhost:8080'

  constructor(config: RestateAsyncTaskConfig<TParams, TResult>) {
    this.serviceName = `asyncTask_${config.name}`
  }

  // 提交任务 - 通过 HTTP 调用 Restate Server
  async submit(params: TParams): Promise<string> {
    const taskId = crypto.randomUUID()
    const url = `${this.restateServerUrl}/${this.serviceName}/${taskId}/run/send`
    
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ params })
    })
    
    return taskId
  }

  // 获取状态 - 通过 HTTP 调用 Restate Server
  async getStatus(taskId: string): Promise<TaskResult<TResult>> {
    const url = `${this.restateServerUrl}/${this.serviceName}/${taskId}/getStatus`
    const response = await fetch(url, { method: 'POST', body: '{}' })
    return response.json()
  }

  // 生成 Restate Workflow 定义
  getWorkflowDefinition(): WorkflowDefinition {
    return restate.workflow({
      name: this.serviceName,
      handlers: {
        run: async (ctx, input) => {
          ctx.set('status', 'processing')
          
          // 执行任务（带重试）
          const result = await ctx.run('execute', async () => {
            return await this.config.task(input.params)
          }, { maxRetryAttempts: 3 })
          
          ctx.set('status', 'completed')
          ctx.set('result', result)
          return { taskId: ctx.key, status: 'completed', result }
        },
        
        getStatus: restate.handlers.workflow.shared(async (ctx) => {
          return {
            taskId: ctx.key,
            status: await ctx.get('status'),
            result: await ctx.get('result')
          }
        })
      }
    })
  }
}
```

#### AsyncTaskComponent.ts (启动器)

```typescript
export class AsyncTaskComponent {
  private readonly tasks: RestateAsyncTask<unknown, unknown>[] = []

  async start(): Promise<void> {
    // 启动 Restate endpoint
    await restate.serve({
      port: 9080,
      services: this.tasks.map(t => t.getWorkflowDefinition())
    })
    
    // 需要手动注册到 Restate Server
    await this.registerEndpoint()
  }

  private async registerEndpoint(): Promise<void> {
    await fetch('http://localhost:9070/deployments', {
      method: 'POST',
      body: JSON.stringify({ uri: 'http://host.docker.internal:9080' })
    })
  }
}
```

### 3.2 Temporal 替代实现

#### TemporalAsyncTask.ts (核心类)

```typescript
import { Client, Connection } from '@temporalio/client'
import { proxyActivities, defineWorkflow } from '@temporalio/workflow'

export class TemporalAsyncTask<TParams, TResult> {
  public readonly workflowType: string
  public readonly taskQueue: string
  private client: Client

  constructor(config: TemporalAsyncTaskConfig<TParams, TResult>) {
    this.workflowType = `asyncTask_${config.name}`
    this.taskQueue = config.taskQueue || 'async-tasks'
  }

  async connect(): Promise<void> {
    const connection = await Connection.connect({
      address: 'localhost:7233'
    })
    this.client = new Client({ connection })
  }

  // 提交任务 - 通过 Temporal Client
  async submit(params: TParams): Promise<string> {
    const taskId = crypto.randomUUID()
    
    // 启动 workflow，立即返回（不等待完成）
    await this.client.workflow.start(this.workflowType, {
      taskQueue: this.taskQueue,
      workflowId: taskId,
      args: [params]
    })
    
    return taskId
  }

  // 获取状态 - 查询 workflow
  async getStatus(taskId: string): Promise<TaskResult<TResult>> {
    const handle = this.client.workflow.getHandle(taskId)
    
    try {
      const description = await handle.describe()
      
      if (description.status.name === 'RUNNING') {
        return { taskId, status: 'processing' }
      } else if (description.status.name === 'COMPLETED') {
        const result = await handle.result()
        return { taskId, status: 'completed', result }
      } else if (description.status.name === 'FAILED') {
        return { taskId, status: 'failed', error: description.status.message }
      }
    } catch (e) {
      return { taskId, status: 'pending' }
    }
  }
}
```

#### workflows.ts (Workflow 定义 - 独立文件)

```typescript
// Temporal 要求 workflow 代码在独立的文件/包中
import { proxyActivities, defineSignal, setHandler } from '@temporalio/workflow'
import type * as activities from './activities'

// 代理 activities（实际执行的函数）
const { executeTask } = proxyActivities<typeof activities>({
  startToCloseTimeout: '30m',
  retry: {
    maximumAttempts: 3,
    initialInterval: '1s',
    maximumInterval: '30s',
    backoffCoefficient: 2
  }
})

// Workflow 定义
export async function imageGenWorkflow(params: ImageGenParams): Promise<ImageGenResult> {
  // 执行 activity（自动重试、持久化）
  const result = await executeTask(params)
  return result
}
```

#### activities.ts (Activity 定义)

```typescript
// Activities 是实际执行外部调用的地方
export async function executeTask(params: ImageGenParams): Promise<ImageGenResult> {
  // 调用外部 API
  const response = await callExternalImageApi(params)
  return {
    mergedImageUrl: response.url,
    width: response.width,
    height: response.height
  }
}
```

#### worker.ts (Worker 启动器)

```typescript
import { Worker, NativeConnection } from '@temporalio/worker'
import * as activities from './activities'

async function run() {
  // 连接到 Temporal Server
  const connection = await NativeConnection.connect({
    address: 'localhost:7233'
  })

  // 创建 Worker
  const worker = await Worker.create({
    connection,
    namespace: 'default',
    taskQueue: 'async-tasks',
    workflowsPath: require.resolve('./workflows'),
    activities
  })

  // 启动 Worker（长轮询拉取任务）
  // 无需注册 endpoint！Worker 自动从 Task Queue 拉取任务
  await worker.run()
}

run()
```

---

## 4. 多实例负载均衡对比

### 4.1 Restate 多实例

```
                    ┌─────────────────┐
                    │  Load Balancer   │  ← 需要外部 LB
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            ↓                ↓                ↓
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │ Instance A   │ │ Instance B   │ │ Instance C   │
    │ :9080        │ │ :9080        │ │ :9080        │
    └──────────────┘ └──────────────┘ └──────────────┘
```

- 需要配置外部负载均衡器（Nginx/K8s Service）
- 注册单一 LB 地址到 Restate Server
- 相同 Key 的请求可能路由到不同实例（需要 Sticky Session）

### 4.2 Temporal 多实例

```
                    ┌─────────────────┐
                    │ Temporal Server │
                    │   Task Queue    │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ↓                    ↓                    ↓
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Worker A     │     │ Worker B     │     │ Worker C     │
│ (长轮询)      │     │ (长轮询)      │     │ (长轮询)      │
└──────────────┘     └──────────────┘     └──────────────┘
```

- **无需外部负载均衡器**
- 所有 Worker 监听同一个 Task Queue
- Temporal Server 自动分配任务
- 同一个 Workflow 的所有 Activity 可能在不同 Worker 执行
- 原生支持公平调度

---

## 5. 迁移改动评估

### 5.1 需要修改的文件

| 文件/组件 | 改动程度 | 说明 |
|-----------|----------|------|
| `restate-async-task/` | **重写** | 整个包需要重写为 Temporal 版本 |
| `AsyncTaskComponent.ts` | **重写** | 改为 Temporal Worker 启动器 |
| `startAsyncTask.ts` | **中等** | 移除 registerEndpoint，简化启动逻辑 |
| `integrations/nanobanana2-image/` | **小改** | 只需更换 import 和实例化方式 |
| `config/deploy.*.json` | **修改** | restate → temporal 中间件配置 |
| `deploy-tool/` | **新增** | 添加 Temporal 中间件部署支持 |

### 5.2 新增依赖

```json
{
  "dependencies": {
    "@temporalio/client": "^1.9.0",
    "@temporalio/worker": "^1.9.0",
    "@temporalio/workflow": "^1.9.0",
    "@temporalio/activity": "^1.9.0"
  }
}
```

### 5.3 新增中间件

```json
// config/deploy.dev.json
{
  "asyncTask": {
    "middlewareDependencies": {
      "temporal": {
        "deploymentType": "container",
        "use": "temporal",
        "version": "1.22.0",
        "config": {
          "namespace": "default",
          "taskQueue": "async-tasks"
        }
      }
    }
  }
}
```

---

## 6. 优缺点对比

### 6.1 Restate 优点

| 优点 | 说明 |
|------|------|
| ✅ 轻量级 | 单一二进制，资源占用小 |
| ✅ 简单部署 | 一个容器即可运行 |
| ✅ HTTP 友好 | 直接通过 HTTP 调用，调试方便 |
| ✅ 新项目 | 设计更现代，概念更简洁 |
| ✅ 无状态 Worker | Worker 可以随时重启 |

### 6.2 Restate 缺点

| 缺点 | 说明 |
|------|------|
| ❌ 推送模式 | 需要 Worker 暴露端口，需要注册 endpoint |
| ❌ 多实例复杂 | 需要外部 LB，配置复杂 |
| ❌ 生态较新 | 社区小，文档有限 |
| ❌ 无原生 UI | 没有内置的管理界面 |
| ❌ 版本管理弱 | Workflow 版本控制不如 Temporal |

### 6.3 Temporal 优点

| 优点 | 说明 |
|------|------|
| ✅ 拉取模式 | Worker 无需暴露端口，无需注册 |
| ✅ 原生多实例 | Task Queue 自动负载均衡 |
| ✅ 成熟生态 | 大量生产案例，活跃社区 |
| ✅ 强大 UI | 内置 Web UI，可视化管理 |
| ✅ 版本控制 | 支持 Workflow 版本管理 |
| ✅ 可观测性 | 内置 metrics，易于监控 |
| ✅ 信号/查询 | 支持向运行中的 Workflow 发送信号 |

### 6.4 Temporal 缺点

| 缺点 | 说明 |
|------|------|
| ❌ 资源占用高 | 需要更多内存和 CPU |
| ❌ 部署复杂 | 依赖 Cassandra/MySQL + ElasticSearch |
| ❌ 学习曲线 | 概念较多（Workflow, Activity, Worker, Task Queue） |
| ❌ 代码隔离 | Workflow 代码必须在独立文件，不能 import 普通模块 |

---

## 7. 推荐方案

### 7.1 保持 Restate（当前方案）

**适用场景：**
- 小规模部署（单实例或少量实例）
- 资源受限环境
- 团队对 Temporal 不熟悉
- 不需要复杂的 Workflow 编排

**建议改进：**
1. 添加 K8s Service 支持多实例
2. 添加健康检查和优雅关闭
3. 添加 metrics 导出

### 7.2 迁移到 Temporal

**适用场景：**
- 需要原生多实例负载均衡
- 需要强大的可观测性
- 有复杂的 Workflow 编排需求
- 团队有 Temporal 经验

**迁移步骤：**
1. 创建 `temporal-async-task` 包替换 `restate-async-task`
2. 修改 AsyncTaskComponent 为 Temporal Worker
3. 更新 deploy-tool 添加 Temporal 中间件
4. 更新 integration 代码使用新包
5. 部署 Temporal Server 集群

---

## 8. 总结

| 维度 | Restate | Temporal | 推荐 |
|------|---------|----------|------|
| 部署简单度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Restate |
| 多实例支持 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Temporal |
| 可观测性 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Temporal |
| 学习成本 | ⭐⭐⭐⭐ | ⭐⭐⭐ | Restate |
| 生态成熟度 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Temporal |
| 资源效率 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Restate |

**结论：**
- 如果当前 Restate 方案能满足需求，建议继续使用并优化
- 如果需要大规模、高可用的异步任务系统，Temporal 是更好的选择
- 两者的 API 设计相似，迁移成本可控








