# Temporal 使用指南（TypeScript）

## 目录

1. [概述](#1-概述)
2. [核心概念](#2-核心概念)
3. [环境搭建](#3-环境搭建)
4. [基础使用](#4-基础使用)
5. [高级特性](#5-高级特性)
6. [错误处理与重试](#6-错误处理与重试)
7. [测试](#7-测试)
8. [生产部署](#8-生产部署)
9. [最佳实践](#9-最佳实践)

---

## 1. 概述

### 1.1 什么是 Temporal

Temporal 是一个开源的**持久化执行（Durable Execution）**平台，用于构建可靠的分布式应用。它将复杂的状态管理、重试逻辑、故障恢复等底层细节抽象化，让开发者专注于业务逻辑。

**核心价值：**

- **持久化执行**：Workflow 的每个步骤都被持久化，进程崩溃后可以从上次完成的步骤继续
- **自动重试**：外部调用失败时自动重试，配置灵活
- **可观测性**：内置 Web UI，可视化查看所有 Workflow 的执行状态
- **可扩展性**：原生支持多 Worker 实例，Task Queue 自动负载均衡

### 1.2 适用场景

- **长耗时异步任务**：图像/视频生成、文件处理、数据导入导出
- **多步骤工作流**：订单处理、审批流程、用户注册
- **定时/周期任务**：报表生成、数据同步、清理任务
- **分布式事务**：跨服务的事务协调、补偿逻辑（Saga 模式）
- **人机交互流程**：需要等待人工审批的业务流程

### 1.3 架构概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Your Application                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌───────────────────────┐         ┌────────────────────────────────────┐  │
│   │     Client 代码        │         │          Worker 进程               │  │
│   │                       │         │                                    │  │
│   │  • 启动 Workflow      │         │  • 执行 Workflow 逻辑              │  │
│   │  • 查询 Workflow 状态  │         │  • 执行 Activity 逻辑              │  │
│   │  • 发送 Signal        │         │  • 长轮询 Task Queue              │  │
│   │  • 取消 Workflow      │         │                                    │  │
│   └───────────┬───────────┘         └───────────────┬────────────────────┘  │
│               │                                     │                        │
└───────────────┼─────────────────────────────────────┼────────────────────────┘
                │  gRPC                               │  gRPC (长轮询)
                ▼                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Temporal Server                                    │
│                                                                              │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│   │   Frontend      │  │    Matching     │  │        History              │ │
│   │   Service       │  │    Service      │  │        Service              │ │
│   │                 │  │                 │  │                             │ │
│   │  接收 Client    │  │  Task Queue     │  │  持久化 Workflow 历史        │ │
│   │  请求           │  │  任务分发        │  │  恢复 Workflow 状态          │ │
│   └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      Persistence (数据库)                           │   │
│   │                 PostgreSQL / MySQL / Cassandra                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**关键特点：**

- **拉取模式**：Worker 主动从 Task Queue 拉取任务，无需暴露端口
- **无需注册**：Worker 启动后自动连接，无需注册 endpoint
- **原生负载均衡**：多个 Worker 监听同一 Task Queue，自动分配任务

---

## 2. 核心概念

### 2.1 Workflow

Workflow 是业务流程的定义，描述了一系列需要按顺序或并行执行的步骤。

**特点：**

- **确定性**：相同输入产生相同输出，不能有随机或时间依赖
- **持久化**：每个步骤完成后自动持久化，崩溃后可恢复
- **沙箱执行**：在隔离的 V8 环境中运行，不能直接进行 I/O 操作

```typescript
// workflows.ts - Workflow 定义
import { proxyActivities } from '@temporalio/workflow'
import type * as activities from './activities'

// 通过代理调用 Activity
const { sendEmail, processPayment, updateInventory } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
})

// Workflow 函数
export async function orderWorkflow(orderId: string, items: OrderItem[]): Promise<OrderResult> {
  // 步骤 1: 处理支付
  const paymentResult = await processPayment(orderId, items)
  
  // 步骤 2: 更新库存
  await updateInventory(items)
  
  // 步骤 3: 发送确认邮件
  await sendEmail(orderId, 'order_confirmed')
  
  return {
    orderId,
    status: 'completed',
    paymentId: paymentResult.transactionId
  }
}
```

### 2.2 Activity

Activity 是实际执行业务逻辑的单元，可以进行任何 I/O 操作（网络请求、数据库、文件系统等）。

**特点：**

- **可重试**：失败时自动重试，配置灵活
- **可超时**：支持多种超时配置
- **心跳**：长时间运行的 Activity 可以发送心跳信号

```typescript
// activities.ts - Activity 定义
import { ApplicationFailure, Context } from '@temporalio/activity'

export async function sendEmail(orderId: string, template: string): Promise<void> {
  // 实际的邮件发送逻辑
  const response = await fetch('https://api.email.com/send', {
    method: 'POST',
    body: JSON.stringify({ orderId, template })
  })
  
  if (!response.ok) {
    // 可重试的错误
    throw new Error(`Failed to send email: ${response.status}`)
  }
}

export async function processPayment(orderId: string, items: OrderItem[]): Promise<PaymentResult> {
  try {
    const result = await paymentGateway.charge(orderId, calculateTotal(items))
    return result
  } catch (error) {
    if (error.code === 'CARD_DECLINED') {
      // 不可重试的错误
      throw ApplicationFailure.nonRetryable('Card declined', 'PAYMENT_FAILED')
    }
    throw error // 其他错误可重试
  }
}

// 长时间运行的 Activity，需要发送心跳
export async function processLargeFile(fileUrl: string): Promise<ProcessResult> {
  const ctx = Context.current()
  const chunks = await downloadInChunks(fileUrl)
  
  for (let i = 0; i < chunks.length; i++) {
    // 发送心跳，包含进度信息
    ctx.heartbeat({ progress: (i + 1) / chunks.length * 100 })
    await processChunk(chunks[i])
  }
  
  return { success: true, processedChunks: chunks.length }
}
```

### 2.3 Worker

Worker 是执行 Workflow 和 Activity 的进程，负责从 Task Queue 拉取任务并执行。

```typescript
// worker.ts
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
    taskQueue: 'order-processing',
    workflowsPath: require.resolve('./workflows'),  // Workflow 独立打包
    activities,                                      // Activity 直接引用
  })

  console.log('Worker started')
  
  // 启动 Worker（阻塞运行）
  await worker.run()
}

run().catch((err) => {
  console.error('Worker failed:', err)
  process.exit(1)
})
```

### 2.4 Client

Client 用于与 Temporal Server 交互，启动 Workflow、查询状态、发送 Signal 等。

```typescript
// client.ts
import { Client, Connection } from '@temporalio/client'
import { orderWorkflow } from './workflows'

async function main() {
  // 连接到 Temporal Server
  const connection = await Connection.connect({
    address: 'localhost:7233'
  })

  const client = new Client({
    connection,
    namespace: 'default'
  })

  // 启动 Workflow
  const handle = await client.workflow.start(orderWorkflow, {
    taskQueue: 'order-processing',
    workflowId: `order-${Date.now()}`,
    args: ['order-123', [{ productId: 'p1', quantity: 2 }]]
  })

  console.log(`Started workflow ${handle.workflowId}`)

  // 等待结果
  const result = await handle.result()
  console.log('Workflow result:', result)
}

main()
```

### 2.5 Task Queue

Task Queue 是 Worker 和 Temporal Server 之间的桥梁，用于分发任务。

**特点：**

- 同一 Task Queue 可以有多个 Worker
- Workflow 和 Activity 可以使用不同的 Task Queue
- 支持任务路由（Sticky Execution）

```typescript
// 多个 Worker 监听同一个 Task Queue
// Worker 1
const worker1 = await Worker.create({
  taskQueue: 'order-processing',
  // ...
})

// Worker 2 (另一个进程/机器)
const worker2 = await Worker.create({
  taskQueue: 'order-processing',
  // ...
})

// 任务会自动分配到空闲的 Worker
```

### 2.6 概念对比表

| Temporal 概念 | 类比 | 说明 |
|--------------|------|------|
| Workflow | 函数/流程定义 | 业务流程的代码表示 |
| Activity | 远程调用 | 实际执行 I/O 操作的函数 |
| Worker | 消费者 | 拉取并执行任务的进程 |
| Client | 生产者 | 启动 Workflow、查询状态的客户端 |
| Task Queue | 消息队列 | Worker 拉取任务的队列 |
| Workflow ID | 业务主键 | 唯一标识一个 Workflow 实例 |
| Run ID | 执行 ID | 每次执行的唯一标识 |

---

## 3. 环境搭建

### 3.1 安装 Temporal Server

#### 方式一：Docker Compose（推荐开发环境）

```yaml
# docker-compose.yml
version: "3.8"
services:
  temporal:
    image: temporalio/auto-setup:1.24.1
    ports:
      - "7233:7233"   # gRPC 端口
      - "8080:8080"   # Web UI 端口
    environment:
      - DB=postgresql
      - DB_PORT=5432
      - POSTGRES_USER=temporal
      - POSTGRES_PWD=temporal
      - POSTGRES_SEEDS=postgres
      - DYNAMIC_CONFIG_FILE_PATH=config/dynamicconfig/development-cass.yaml
    depends_on:
      - postgres
    volumes:
      - ./dynamicconfig:/etc/temporal/config/dynamicconfig

  postgres:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=temporal
      - POSTGRES_PASSWORD=temporal

  temporal-ui:
    image: temporalio/ui:2.21.0
    ports:
      - "8081:8080"
    environment:
      - TEMPORAL_ADDRESS=temporal:7233
      - TEMPORAL_CORS_ORIGINS=http://localhost:3000
```

启动：

```bash
docker-compose up -d
```

#### 方式二：Temporal CLI（快速本地开发）

```bash
# 安装 Temporal CLI
brew install temporal

# 启动本地开发服务器（SQLite 存储）
temporal server start-dev

# 启动带命名空间的开发服务器
temporal server start-dev --namespace my-namespace
```

#### 方式三：Temporal Cloud（生产环境）

访问 https://cloud.temporal.io 注册账号，获取连接凭证。

### 3.2 安装 SDK

```bash
# 安装核心包
npm install @temporalio/client @temporalio/worker @temporalio/workflow @temporalio/activity

# 安装开发依赖（可选）
npm install -D @temporalio/testing
```

### 3.3 项目结构

推荐的项目结构：

```
src/
├── activities/           # Activity 定义
│   ├── email.ts
│   ├── payment.ts
│   └── index.ts          # 统一导出
├── workflows/            # Workflow 定义（独立打包）
│   ├── order.ts
│   ├── subscription.ts
│   └── index.ts
├── worker.ts             # Worker 启动脚本
├── client.ts             # Client 使用示例
└── types.ts              # 共享类型定义
```

### 3.4 TypeScript 配置

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 4. 基础使用

### 4.1 第一个 Workflow

让我们创建一个简单的问候 Workflow：

```typescript
// src/workflows/greeting.ts
import { proxyActivities, sleep } from '@temporalio/workflow'
import type * as activities from '../activities'

const { getGreeting, sendNotification } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
})

export async function greetingWorkflow(name: string): Promise<string> {
  // 步骤 1: 获取问候语
  const greeting = await getGreeting(name)
  
  // 步骤 2: 等待 5 秒
  await sleep('5 seconds')
  
  // 步骤 3: 发送通知
  await sendNotification(greeting)
  
  return greeting
}
```

```typescript
// src/activities/index.ts
export async function getGreeting(name: string): Promise<string> {
  return `Hello, ${name}! Welcome to Temporal.`
}

export async function sendNotification(message: string): Promise<void> {
  console.log(`📬 Notification sent: ${message}`)
}
```

```typescript
// src/worker.ts
import { Worker, NativeConnection } from '@temporalio/worker'
import * as activities from './activities'

async function run() {
  const connection = await NativeConnection.connect({
    address: 'localhost:7233'
  })

  const worker = await Worker.create({
    connection,
    namespace: 'default',
    taskQueue: 'greeting-queue',
    workflowsPath: require.resolve('./workflows'),
    activities,
  })

  console.log('🚀 Worker started')
  await worker.run()
}

run().catch(console.error)
```

```typescript
// src/client.ts
import { Client, Connection } from '@temporalio/client'
import { greetingWorkflow } from './workflows/greeting'

async function main() {
  const connection = await Connection.connect({
    address: 'localhost:7233'
  })

  const client = new Client({ connection })

  // 启动 Workflow
  const handle = await client.workflow.start(greetingWorkflow, {
    taskQueue: 'greeting-queue',
    workflowId: `greeting-${Date.now()}`,
    args: ['Alice']
  })

  console.log(`Started workflow: ${handle.workflowId}`)

  // 等待结果
  const result = await handle.result()
  console.log(`Result: ${result}`)
}

main()
```

### 4.2 Workflow 选项

启动 Workflow 时可以配置多种选项：

```typescript
const handle = await client.workflow.start(orderWorkflow, {
  // 必需选项
  taskQueue: 'order-processing',
  workflowId: `order-${orderId}`,
  args: [orderId, items],
  
  // 超时设置
  workflowExecutionTimeout: '24 hours',  // 整个 Workflow 最长执行时间
  workflowRunTimeout: '1 hour',           // 单次 Run 最长时间
  workflowTaskTimeout: '10 seconds',      // 单个决策任务超时
  
  // 重试策略
  retryPolicy: {
    initialInterval: '1 second',
    backoffCoefficient: 2,
    maximumInterval: '1 minute',
    maximumAttempts: 3
  },
  
  // 搜索属性（用于查询）
  searchAttributes: {
    CustomerId: ['customer-123'],
    OrderStatus: ['pending']
  },
  
  // 备忘录（元数据）
  memo: {
    createdBy: 'admin',
    priority: 'high'
  },
  
  // 启动延迟
  startDelay: '5 minutes',
  
  // Cron 调度
  cronSchedule: '0 0 * * *',  // 每天午夜执行
})
```

### 4.3 Activity 选项

配置 Activity 的超时和重试：

```typescript
// workflows.ts
import { proxyActivities } from '@temporalio/workflow'
import type * as activities from './activities'

// 默认配置
const defaultActivities = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
})

// 长时间运行的 Activity
const longRunningActivities = proxyActivities<typeof activities>({
  startToCloseTimeout: '30 minutes',
  heartbeatTimeout: '30 seconds',  // 需要心跳
})

// 自定义重试策略
const retryableActivities = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
  retry: {
    initialInterval: '1 second',
    backoffCoefficient: 2,
    maximumInterval: '30 seconds',
    maximumAttempts: 5,
    nonRetryableErrorTypes: ['PaymentDeclined', 'ValidationError']
  }
})

// 不同的 Task Queue
const highPriorityActivities = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
  taskQueue: 'high-priority-queue'
})
```

**超时类型说明：**

| 超时类型 | 说明 | 默认值 |
|---------|------|-------|
| `scheduleToCloseTimeout` | 从调度到完成的总时间 | 无限制 |
| `startToCloseTimeout` | 从开始执行到完成的时间 | 必须设置 |
| `scheduleToStartTimeout` | 等待 Worker 开始执行的时间 | 无限制 |
| `heartbeatTimeout` | 两次心跳之间的最大间隔 | 无心跳 |

### 4.4 异步启动（Fire-and-Forget）

```typescript
// 启动后立即返回，不等待结果
const handle = await client.workflow.start(orderWorkflow, {
  taskQueue: 'order-processing',
  workflowId: `order-${orderId}`,
  args: [orderId, items]
})

console.log(`Workflow started: ${handle.workflowId}`)

// 稍后获取 handle 并查询状态
const existingHandle = client.workflow.getHandle(workflowId)
const status = await existingHandle.describe()
console.log(`Status: ${status.status.name}`)

// 等待结果（可选）
const result = await existingHandle.result()
```

### 4.5 并发执行 Activity

```typescript
// workflows.ts
import { proxyActivities } from '@temporalio/workflow'
import type * as activities from './activities'

const { fetchUserData, fetchOrderHistory, fetchRecommendations } = proxyActivities<typeof activities>({
  startToCloseTimeout: '30 seconds',
})

export async function userDashboardWorkflow(userId: string) {
  // 并发执行多个 Activity
  const [userData, orderHistory, recommendations] = await Promise.all([
    fetchUserData(userId),
    fetchOrderHistory(userId),
    fetchRecommendations(userId)
  ])

  return {
    user: userData,
    orders: orderHistory,
    recommendations
  }
}
```

---

## 5. 高级特性

### 5.1 Query（查询）

Query 用于在不影响 Workflow 执行的情况下读取其状态。

```typescript
// workflows.ts
import { defineQuery, setHandler, proxyActivities } from '@temporalio/workflow'
import type * as activities from './activities'

// 定义 Query
export const getProgressQuery = defineQuery<{ processed: number; total: number }>('getProgress')
export const getCurrentStepQuery = defineQuery<string>('getCurrentStep')

const { processItem } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
})

export async function batchProcessingWorkflow(items: string[]): Promise<void> {
  let processed = 0
  let currentStep = 'initializing'

  // 注册 Query 处理器
  setHandler(getProgressQuery, () => ({
    processed,
    total: items.length
  }))
  
  setHandler(getCurrentStepQuery, () => currentStep)

  // 处理每个项目
  for (const item of items) {
    currentStep = `processing ${item}`
    await processItem(item)
    processed++
  }

  currentStep = 'completed'
}
```

```typescript
// client.ts
const handle = client.workflow.getHandle(workflowId)

// 查询进度
const progress = await handle.query(getProgressQuery)
console.log(`Progress: ${progress.processed}/${progress.total}`)

// 查询当前步骤
const step = await handle.query(getCurrentStepQuery)
console.log(`Current step: ${step}`)
```

### 5.2 Signal（信号）

Signal 用于向运行中的 Workflow 发送消息，可以改变其执行流程。

```typescript
// workflows.ts
import { defineSignal, setHandler, condition, proxyActivities } from '@temporalio/workflow'
import type * as activities from './activities'

// 定义 Signal
export const approveSignal = defineSignal<[string]>('approve')  // 带参数
export const cancelSignal = defineSignal('cancel')               // 无参数

const { executeOrder, sendEmail } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
})

export async function orderApprovalWorkflow(orderId: string, amount: number): Promise<string> {
  let approved = false
  let approverComment = ''
  let cancelled = false

  // 注册 Signal 处理器
  setHandler(approveSignal, (comment: string) => {
    approved = true
    approverComment = comment
  })

  setHandler(cancelSignal, () => {
    cancelled = true
  })

  // 等待审批（最多 24 小时）
  const wasApproved = await condition(
    () => approved || cancelled,
    '24 hours'
  )

  if (cancelled) {
    await sendEmail(orderId, 'order_cancelled')
    return 'cancelled'
  }

  if (!wasApproved) {
    // 超时
    await sendEmail(orderId, 'approval_timeout')
    return 'timeout'
  }

  // 执行订单
  await executeOrder(orderId, amount)
  await sendEmail(orderId, 'order_completed', approverComment)

  return 'completed'
}
```

```typescript
// client.ts
const handle = client.workflow.getHandle(workflowId)

// 发送审批 Signal
await handle.signal(approveSignal, 'Looks good, approved!')

// 或者取消
await handle.signal(cancelSignal)
```

### 5.3 Update（更新）

Update 结合了 Signal 和 Query：可以修改 Workflow 状态并获取返回值。

```typescript
// workflows.ts
import { defineUpdate, setHandler } from '@temporalio/workflow'

// 定义 Update
export const addItemUpdate = defineUpdate<
  { success: boolean; newTotal: number },  // 返回类型
  [string, number]                          // 参数类型
>('addItem')

export async function shoppingCartWorkflow(userId: string) {
  const items: Map<string, number> = new Map()

  // 注册 Update 处理器
  setHandler(addItemUpdate, (productId: string, quantity: number) => {
    const current = items.get(productId) || 0
    items.set(productId, current + quantity)
    
    // 计算新总数
    const newTotal = Array.from(items.values()).reduce((a, b) => a + b, 0)
    
    return { success: true, newTotal }
  })

  // 等待结账信号...
}
```

```typescript
// client.ts
const handle = client.workflow.getHandle(workflowId)

// 发送 Update 并获取结果
const result = await handle.executeUpdate(addItemUpdate, {
  args: ['product-123', 2]
})
console.log(`New total: ${result.newTotal}`)
```

### 5.4 定时器和延迟

```typescript
// workflows.ts
import { sleep, proxyActivities } from '@temporalio/workflow'
import type * as activities from './activities'

const { sendReminder, processPayment } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
})

export async function subscriptionWorkflow(userId: string): Promise<void> {
  // 等待固定时间
  await sleep('1 day')
  
  // 循环处理
  while (true) {
    await processPayment(userId)
    
    // 发送续费提醒
    await sleep('25 days')
    await sendReminder(userId, 'renewal_coming')
    
    // 等待续费日
    await sleep('5 days')
  }
}
```

### 5.5 子 Workflow

```typescript
// workflows.ts
import { 
  proxyActivities, 
  startChild, 
  executeChild,
  ParentClosePolicy 
} from '@temporalio/workflow'

// 子 Workflow
export async function paymentWorkflow(orderId: string, amount: number): Promise<PaymentResult> {
  const { processPayment } = proxyActivities<typeof import('./activities')>({
    startToCloseTimeout: '5 minutes',
  })
  return await processPayment(orderId, amount)
}

// 父 Workflow
export async function orderWorkflow(orderId: string, items: OrderItem[]): Promise<OrderResult> {
  const amount = calculateTotal(items)
  
  // 方式 1: 启动并等待子 Workflow 完成
  const paymentResult = await executeChild(paymentWorkflow, {
    workflowId: `payment-${orderId}`,
    args: [orderId, amount],
    // 父 Workflow 取消时的行为
    parentClosePolicy: ParentClosePolicy.TERMINATE  // 终止子 Workflow
  })
  
  // 方式 2: 启动子 Workflow，不等待
  const childHandle = await startChild(notificationWorkflow, {
    workflowId: `notification-${orderId}`,
    args: [orderId, 'order_completed'],
    parentClosePolicy: ParentClosePolicy.ABANDON  // 继续运行
  })
  
  return {
    orderId,
    paymentId: paymentResult.transactionId,
    status: 'completed'
  }
}
```

### 5.6 Continue As New

用于长时间运行的 Workflow，避免历史记录过大：

```typescript
// workflows.ts
import { 
  continueAsNew, 
  proxyActivities,
  sleep 
} from '@temporalio/workflow'
import type * as activities from './activities'

const { processTask } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
})

export async function longRunningWorkflow(
  state: WorkflowState,
  iteration: number = 0
): Promise<void> {
  // 处理任务
  const newState = await processTask(state)
  
  // 每 100 次迭代重新开始
  if (iteration >= 100) {
    // 以新状态继续，历史记录重置
    await continueAsNew<typeof longRunningWorkflow>(newState, 0)
  }
  
  await sleep('1 minute')
  await continueAsNew<typeof longRunningWorkflow>(newState, iteration + 1)
}
```

### 5.7 Cron 调度

```typescript
// client.ts
const handle = await client.workflow.start(reportWorkflow, {
  taskQueue: 'reports',
  workflowId: 'daily-report',
  args: [],
  // Cron 表达式
  cronSchedule: '0 9 * * MON-FRI',  // 工作日早上 9 点
})

// 或使用 Schedule API（更灵活）
const schedule = await client.schedule.create({
  scheduleId: 'daily-report-schedule',
  spec: {
    intervals: [{ every: '24h' }],  // 每 24 小时
    // 或使用 cron
    // cronExpressions: ['0 9 * * MON-FRI']
  },
  action: {
    type: 'startWorkflow',
    workflowType: 'reportWorkflow',
    taskQueue: 'reports',
    args: []
  }
})
```

### 5.8 搜索属性

```typescript
// client.ts - 启动时设置
const handle = await client.workflow.start(orderWorkflow, {
  taskQueue: 'orders',
  workflowId: orderId,
  args: [orderData],
  searchAttributes: {
    CustomerId: [orderData.customerId],
    OrderStatus: ['pending'],
    OrderTotal: [orderData.total]
  }
})

// workflows.ts - 动态更新
import { upsertSearchAttributes } from '@temporalio/workflow'

export async function orderWorkflow(order: OrderData) {
  // 处理订单...
  
  // 更新搜索属性
  upsertSearchAttributes({
    OrderStatus: ['processing'],
    UpdatedAt: [new Date().toISOString()]
  })
  
  // ...
}

// client.ts - 查询
const result = await client.workflow.list({
  query: `CustomerId = "customer-123" AND OrderStatus = "pending"`
})

for await (const workflow of result) {
  console.log(workflow.workflowId)
}
```

---

## 6. 错误处理与重试

### 6.1 Activity 重试配置

```typescript
// workflows.ts
const activities = proxyActivities<typeof import('./activities')>({
  startToCloseTimeout: '5 minutes',
  retry: {
    // 初始重试间隔
    initialInterval: '1 second',
    // 指数退避系数
    backoffCoefficient: 2,
    // 最大重试间隔
    maximumInterval: '1 minute',
    // 最大重试次数（包括首次）
    maximumAttempts: 5,
    // 不重试的错误类型
    nonRetryableErrorTypes: [
      'ValidationError',
      'AuthenticationError',
      'NotFoundError'
    ]
  }
})
```

### 6.2 不可重试错误

```typescript
// activities.ts
import { ApplicationFailure } from '@temporalio/activity'

export async function validateOrder(order: OrderData): Promise<void> {
  if (!order.items || order.items.length === 0) {
    // 抛出不可重试的错误
    throw ApplicationFailure.nonRetryable(
      'Order must have at least one item',
      'ValidationError',
      { orderId: order.id }  // 可选的详情
    )
  }
  
  if (order.total < 0) {
    throw ApplicationFailure.create({
      message: 'Invalid order total',
      type: 'ValidationError',
      nonRetryable: true,
      details: { total: order.total }
    })
  }
}
```

### 6.3 Workflow 错误处理

```typescript
// workflows.ts
import { 
  proxyActivities, 
  ApplicationFailure,
  isCancellation
} from '@temporalio/workflow'

export async function orderWorkflow(orderId: string): Promise<OrderResult> {
  const { validateOrder, processPayment, sendEmail } = proxyActivities<typeof activities>({
    startToCloseTimeout: '5 minutes',
    retry: { maximumAttempts: 3 }
  })

  try {
    await validateOrder(orderId)
    await processPayment(orderId)
    await sendEmail(orderId, 'success')
    
    return { status: 'completed' }
  } catch (error) {
    // 检查是否是取消
    if (isCancellation(error)) {
      // 执行清理逻辑
      await sendEmail(orderId, 'cancelled')
      throw error  // 重新抛出以完成取消
    }
    
    // 检查错误类型
    if (error instanceof ApplicationFailure) {
      if (error.type === 'PaymentFailed') {
        await sendEmail(orderId, 'payment_failed')
        return { status: 'payment_failed', error: error.message }
      }
    }
    
    // 其他错误
    throw error
  }
}
```

### 6.4 Saga 模式（补偿逻辑）

```typescript
// workflows.ts
type CompensationFn = () => Promise<void>

export async function bookTripWorkflow(trip: TripData): Promise<TripResult> {
  const compensations: CompensationFn[] = []
  
  try {
    // 步骤 1: 预订航班
    const flight = await bookFlight(trip.flight)
    compensations.push(() => cancelFlight(flight.id))
    
    // 步骤 2: 预订酒店
    const hotel = await bookHotel(trip.hotel)
    compensations.push(() => cancelHotel(hotel.id))
    
    // 步骤 3: 预订租车
    const car = await bookCar(trip.car)
    compensations.push(() => cancelCar(car.id))
    
    return {
      status: 'confirmed',
      flight,
      hotel,
      car
    }
  } catch (error) {
    // 执行补偿（逆序）
    console.log('Booking failed, running compensations...')
    
    for (const compensate of compensations.reverse()) {
      try {
        await compensate()
      } catch (compensationError) {
        console.error('Compensation failed:', compensationError)
        // 记录但继续执行其他补偿
      }
    }
    
    throw error
  }
}
```

### 6.5 Activity 心跳和取消

```typescript
// activities.ts
import { 
  Context, 
  CancelledFailure,
  heartbeat 
} from '@temporalio/activity'

export async function processLargeFile(fileUrl: string): Promise<ProcessResult> {
  const ctx = Context.current()
  const chunks = await downloadFile(fileUrl)
  
  const results: ChunkResult[] = []
  
  for (let i = 0; i < chunks.length; i++) {
    // 检查是否被取消
    ctx.heartbeat({
      progress: (i / chunks.length) * 100,
      processedChunks: i
    })
    
    // 如果 Activity 被取消，heartbeat 会抛出 CancelledFailure
    try {
      const result = await processChunk(chunks[i])
      results.push(result)
    } catch (error) {
      if (error instanceof CancelledFailure) {
        // 执行清理
        await cleanupPartialResults(results)
        throw error  // 重新抛出
      }
      throw error
    }
  }
  
  return { results, totalChunks: chunks.length }
}
```

---

## 7. 测试

### 7.1 单元测试 Activity

```typescript
// activities.test.ts
import { describe, it, expect, vi } from 'vitest'
import { sendEmail, processPayment } from './activities'

describe('Activities', () => {
  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true })
      global.fetch = mockFetch
      
      await sendEmail('order-123', 'confirmation')
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('email'),
        expect.objectContaining({
          method: 'POST'
        })
      )
    })
    
    it('should throw on API error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })
      global.fetch = mockFetch
      
      await expect(sendEmail('order-123', 'confirmation'))
        .rejects.toThrow('Failed to send email')
    })
  })
})
```

### 7.2 单元测试 Workflow

使用 `@temporalio/testing` 进行 Workflow 测试：

```typescript
// workflows.test.ts
import { TestWorkflowEnvironment } from '@temporalio/testing'
import { Worker } from '@temporalio/worker'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { orderWorkflow } from './workflows'

describe('Order Workflow', () => {
  let testEnv: TestWorkflowEnvironment
  let worker: Worker

  beforeAll(async () => {
    // 创建测试环境（内置时间控制）
    testEnv = await TestWorkflowEnvironment.createLocal()
    
    // 创建 Worker（使用 mock activities）
    worker = await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue: 'test-queue',
      workflowsPath: require.resolve('./workflows'),
      activities: {
        validateOrder: async () => {},
        processPayment: async () => ({ transactionId: 'txn-123' }),
        sendEmail: async () => {}
      }
    })
  })

  afterAll(async () => {
    await testEnv.teardown()
  })

  it('should complete order successfully', async () => {
    // 运行 Worker 和 Workflow
    const result = await worker.runUntil(async () => {
      const handle = await testEnv.client.workflow.start(orderWorkflow, {
        taskQueue: 'test-queue',
        workflowId: 'test-order-1',
        args: ['order-123']
      })
      return await handle.result()
    })

    expect(result.status).toBe('completed')
  })

  it('should handle payment failure', async () => {
    // 使用失败的 mock
    const failingWorker = await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue: 'test-queue-fail',
      workflowsPath: require.resolve('./workflows'),
      activities: {
        validateOrder: async () => {},
        processPayment: async () => {
          throw new Error('Payment declined')
        },
        sendEmail: async () => {}
      }
    })

    await expect(failingWorker.runUntil(async () => {
      const handle = await testEnv.client.workflow.start(orderWorkflow, {
        taskQueue: 'test-queue-fail',
        workflowId: 'test-order-2',
        args: ['order-123']
      })
      return await handle.result()
    })).rejects.toThrow('Payment declined')
  })
})
```

### 7.3 时间控制测试

```typescript
// time-controlled.test.ts
import { TestWorkflowEnvironment } from '@temporalio/testing'
import { describe, it, expect } from 'vitest'
import { subscriptionWorkflow } from './workflows'

describe('Subscription Workflow with Time Control', () => {
  it('should process monthly renewals', async () => {
    const testEnv = await TestWorkflowEnvironment.createTimeSkipping()
    
    const worker = await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue: 'test-queue',
      workflowsPath: require.resolve('./workflows'),
      activities: mockActivities
    })

    const renewalCount = { count: 0 }
    mockActivities.processPayment = async () => {
      renewalCount.count++
    }

    const handle = await testEnv.client.workflow.start(subscriptionWorkflow, {
      taskQueue: 'test-queue',
      workflowId: 'subscription-test',
      args: ['user-123']
    })

    // 快进 3 个月
    await testEnv.sleep('90 days')
    
    // 验证续费次数
    expect(renewalCount.count).toBe(3)
    
    // 取消 Workflow
    await handle.cancel()
    await testEnv.teardown()
  })
})
```

### 7.4 集成测试

```typescript
// integration.test.ts
import { Client, Connection } from '@temporalio/client'
import { Worker, NativeConnection } from '@temporalio/worker'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as activities from './activities'
import { orderWorkflow } from './workflows'

describe('Integration Tests', () => {
  let client: Client
  let worker: Worker

  beforeAll(async () => {
    // 连接到真实的 Temporal Server（或 Docker 容器）
    const connection = await Connection.connect({
      address: 'localhost:7233'
    })
    
    client = new Client({ connection })
    
    const nativeConnection = await NativeConnection.connect({
      address: 'localhost:7233'
    })
    
    worker = await Worker.create({
      connection: nativeConnection,
      taskQueue: 'integration-test',
      workflowsPath: require.resolve('./workflows'),
      activities
    })
    
    // 后台运行 Worker
    worker.run().catch(console.error)
  })

  afterAll(async () => {
    worker.shutdown()
  })

  it('should complete full order flow', async () => {
    const handle = await client.workflow.start(orderWorkflow, {
      taskQueue: 'integration-test',
      workflowId: `integration-test-${Date.now()}`,
      args: ['order-123']
    })

    const result = await handle.result()
    
    expect(result.status).toBe('completed')
    expect(result.paymentId).toBeDefined()
  })
})
```

---

## 8. 生产部署

### 8.1 Worker 配置

```typescript
// worker.ts
import { Worker, NativeConnection, Runtime } from '@temporalio/worker'
import * as activities from './activities'

async function run() {
  // 配置运行时
  Runtime.install({
    logger: {
      // 使用结构化日志
      log: (level, message, attrs) => {
        console.log(JSON.stringify({ level, message, ...attrs }))
      }
    },
    telemetryOptions: {
      metrics: {
        prometheus: { bindAddress: '0.0.0.0:9090' }
      }
    }
  })

  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
    tls: process.env.TEMPORAL_TLS === 'true' ? {
      clientCertPair: {
        crt: Buffer.from(process.env.TEMPORAL_CLIENT_CERT!),
        key: Buffer.from(process.env.TEMPORAL_CLIENT_KEY!)
      }
    } : undefined
  })

  const worker = await Worker.create({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'production',
    workflowsPath: require.resolve('./workflows'),
    activities,
    
    // 并发配置
    maxConcurrentActivityTaskExecutions: 100,
    maxConcurrentWorkflowTaskExecutions: 100,
    maxConcurrentLocalActivityExecutions: 100,
    
    // 资源限制
    maxCachedWorkflows: 1000,
    
    // 优雅关闭
    shutdownGraceTime: '30 seconds',
    
    // Sticky Execution（提高性能）
    stickyQueueScheduleToStartTimeout: '10 seconds',
  })

  // 优雅关闭
  process.on('SIGTERM', () => {
    worker.shutdown()
  })
  
  process.on('SIGINT', () => {
    worker.shutdown()
  })

  console.log('Worker starting...')
  await worker.run()
}

run().catch((err) => {
  console.error('Worker failed:', err)
  process.exit(1)
})
```

### 8.2 Kubernetes 部署

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: temporal-worker
spec:
  replicas: 3
  selector:
    matchLabels:
      app: temporal-worker
  template:
    metadata:
      labels:
        app: temporal-worker
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
    spec:
      containers:
        - name: worker
          image: your-registry/temporal-worker:v1.0.0
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          env:
            - name: TEMPORAL_ADDRESS
              value: "temporal-frontend.temporal:7233"
            - name: TEMPORAL_NAMESPACE
              value: "production"
            - name: TEMPORAL_TASK_QUEUE
              value: "order-processing"
          ports:
            - containerPort: 9090
              name: metrics
          livenessProbe:
            httpGet:
              path: /health
              port: 9090
            initialDelaySeconds: 10
            periodSeconds: 5
          readinessProbe:
            httpGet:
              path: /ready
              port: 9090
            initialDelaySeconds: 5
            periodSeconds: 5
      terminationGracePeriodSeconds: 60
```

### 8.3 Temporal Server 部署（Helm）

```bash
# 添加 Helm 仓库
helm repo add temporal https://go.temporal.io/helm-charts

# 安装 Temporal
helm install temporal temporal/temporal \
  --namespace temporal \
  --create-namespace \
  --set server.replicaCount=3 \
  --set cassandra.enabled=false \
  --set postgresql.enabled=true \
  --set elasticsearch.enabled=true \
  --set prometheus.enabled=true \
  --set grafana.enabled=true
```

### 8.4 Temporal Cloud

```typescript
// client.ts - 连接 Temporal Cloud
import { Client, Connection } from '@temporalio/client'

const connection = await Connection.connect({
  address: 'your-namespace.tmprl.cloud:7233',
  tls: {
    clientCertPair: {
      crt: Buffer.from(process.env.TEMPORAL_CLIENT_CERT!),
      key: Buffer.from(process.env.TEMPORAL_CLIENT_KEY!)
    }
  }
})

const client = new Client({
  connection,
  namespace: 'your-namespace.your-account'
})
```

### 8.5 监控与告警

```typescript
// 自定义 Metrics
import { Runtime } from '@temporalio/worker'

Runtime.install({
  telemetryOptions: {
    metrics: {
      prometheus: { bindAddress: '0.0.0.0:9090' }
    }
  }
})

// Prometheus 查询示例
// - temporal_workflow_completed_total
// - temporal_workflow_failed_total
// - temporal_activity_execution_latency
// - temporal_worker_task_slots_available
```

Grafana Dashboard 推荐：
- Temporal Server Dashboard: ID 10277
- Temporal SDK Dashboard: ID 10278

---

## 9. 最佳实践

### 9.1 Workflow 设计原则

1. **保持确定性**
   - 不要使用随机数、当前时间、外部 I/O
   - 使用 `workflow.random()` 和 `workflow.now()` 代替
   
   ```typescript
   // ❌ 错误
   const id = Math.random().toString()
   const now = new Date()
   
   // ✅ 正确
   import { uuid4, now } from '@temporalio/workflow'
   const id = uuid4()
   const currentTime = now()
   ```

2. **使用 Activity 进行 I/O**
   - 所有外部调用（HTTP、数据库、文件）都放在 Activity 中
   
   ```typescript
   // ❌ 错误 - 在 Workflow 中直接调用
   export async function myWorkflow() {
     const response = await fetch('https://api.example.com')
   }
   
   // ✅ 正确 - 使用 Activity
   export async function myWorkflow() {
     const response = await activities.fetchData()
   }
   ```

3. **版本管理**
   - 使用 `patched` 进行向后兼容的更改
   
   ```typescript
   import { patched } from '@temporalio/workflow'
   
   export async function myWorkflow() {
     if (patched('new-feature-v2')) {
       // 新逻辑
       await activities.newLogic()
     } else {
       // 旧逻辑（为正在运行的 Workflow 保留）
       await activities.oldLogic()
     }
   }
   ```

### 9.2 Activity 设计原则

1. **幂等性**
   - Activity 可能会重试，确保幂等
   
   ```typescript
   // ✅ 使用业务 ID 作为幂等键
   export async function chargeCustomer(orderId: string, amount: number) {
     const idempotencyKey = `charge-${orderId}`
     return await paymentGateway.charge(amount, { idempotencyKey })
   }
   ```

2. **合理的超时配置**
   
   ```typescript
   // 快速操作
   const fastActivities = proxyActivities<...>({
     startToCloseTimeout: '30 seconds',
   })
   
   // 长时间操作
   const slowActivities = proxyActivities<...>({
     startToCloseTimeout: '30 minutes',
     heartbeatTimeout: '30 seconds',  // 需要心跳
   })
   ```

3. **长时间运行的 Activity 发送心跳**
   
   ```typescript
   export async function processLargeData(dataId: string) {
     const ctx = Context.current()
     const chunks = await loadData(dataId)
     
     for (let i = 0; i < chunks.length; i++) {
       ctx.heartbeat({ progress: i / chunks.length })
       await processChunk(chunks[i])
     }
   }
   ```

### 9.3 错误处理

1. **区分可重试和不可重试错误**
   
   ```typescript
   import { ApplicationFailure } from '@temporalio/activity'
   
   export async function validateInput(data: InputData) {
     if (!data.email) {
       // 不可重试 - 输入验证失败
       throw ApplicationFailure.nonRetryable('Email is required', 'ValidationError')
     }
     
     try {
       await externalApi.validate(data)
     } catch (error) {
       if (error.code === 'RATE_LIMITED') {
         // 可重试 - 抛出普通错误
         throw new Error('Rate limited, will retry')
       }
       throw error
     }
   }
   ```

2. **在 Workflow 中优雅处理失败**
   
   ```typescript
   export async function orderWorkflow(orderId: string) {
     try {
       await activities.processPayment(orderId)
     } catch (error) {
       // 补偿逻辑
       await activities.notifyCustomer(orderId, 'payment_failed')
       throw error
     }
   }
   ```

### 9.4 性能优化

1. **使用 Local Activity 减少延迟**
   
   ```typescript
   import { proxyLocalActivities } from '@temporalio/workflow'
   
   // 对于快速、低失败率的操作
   const localActivities = proxyLocalActivities<...>({
     startToCloseTimeout: '5 seconds',
   })
   ```

2. **批量处理**
   
   ```typescript
   export async function batchProcessWorkflow(items: string[]) {
     // 并发处理，控制并发数
     const batchSize = 10
     for (let i = 0; i < items.length; i += batchSize) {
       const batch = items.slice(i, i + batchSize)
       await Promise.all(batch.map(item => activities.processItem(item)))
     }
   }
   ```

3. **避免大型 Payload**
   - 使用 ID 引用而不是传递大对象
   - 考虑使用外部存储（S3、数据库）
   
   ```typescript
   // ❌ 避免
   const handle = await client.workflow.start(processWorkflow, {
     args: [{ largeData: /* 10MB 数据 */ }]
   })
   
   // ✅ 推荐
   const dataId = await uploadToStorage(largeData)
   const handle = await client.workflow.start(processWorkflow, {
     args: [{ dataId }]
   })
   ```

### 9.5 日志和可观测性

```typescript
// activities.ts
import { log } from '@temporalio/activity'

export async function processOrder(orderId: string) {
  log.info('Processing order', { orderId })
  
  try {
    const result = await doProcess(orderId)
    log.info('Order processed successfully', { orderId, result })
    return result
  } catch (error) {
    log.error('Order processing failed', { orderId, error: error.message })
    throw error
  }
}

// workflows.ts
import { log } from '@temporalio/workflow'

export async function orderWorkflow(orderId: string) {
  log.info('Starting order workflow', { orderId })
  // ...
}
```

---

## 附录

### A. 常用命令

```bash
# 查看 Workflow 列表
temporal workflow list

# 查看 Workflow 详情
temporal workflow describe --workflow-id <workflow-id>

# 查看 Workflow 历史
temporal workflow show --workflow-id <workflow-id>

# 发送 Signal
temporal workflow signal --workflow-id <workflow-id> --name approve

# 取消 Workflow
temporal workflow cancel --workflow-id <workflow-id>

# 终止 Workflow
temporal workflow terminate --workflow-id <workflow-id>

# 查询 Workflow
temporal workflow query --workflow-id <workflow-id> --name getProgress
```

### B. 常见问题

**Q: Workflow 代码更新后，正在运行的 Workflow 会受影响吗？**

A: 使用 `patched()` API 可以确保向后兼容。新代码只会影响新启动的 Workflow。

**Q: Activity 失败后，Temporal 如何知道重试？**

A: Temporal 会自动重试抛出的错误，除非：
- 错误是 `ApplicationFailure.nonRetryable()`
- 达到最大重试次数
- 错误类型在 `nonRetryableErrorTypes` 中

**Q: Worker 崩溃后会发生什么？**

A: Temporal Server 会检测到心跳超时，将任务重新分配给其他 Worker。Workflow 会从上次持久化的状态继续。

**Q: 如何处理长时间运行的 Workflow？**

A: 使用 `continueAsNew()` 定期重启，避免历史记录过大。

### C. 资源链接

- [Temporal 官方文档](https://docs.temporal.io)
- [TypeScript SDK 参考](https://typescript.temporal.io)
- [Temporal GitHub](https://github.com/temporalio/temporal)
- [示例项目](https://github.com/temporalio/samples-typescript)
- [Temporal 社区 Slack](https://temporal.io/slack)

---

*最后更新: 2025-12-01*








