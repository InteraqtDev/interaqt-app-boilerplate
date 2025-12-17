# Nanobanana2 Image Generation Temporal Workflow 实现总结

## 任务概述

将 `nanobanana2-image` integration 从同步模式改造为使用 Temporal workflow 的异步模式。

## 改造前后对比

### 改造前（同步模式）
1. 创建 APICall 时直接调用外部 API
2. 等待 API 返回结果
3. 立即创建 completed/failed 事件

### 改造后（异步模式）
1. 创建 APICall 时启动 Temporal workflow 并立即返回
2. 创建 processing 事件，workflow ID 作为 externalId
3. 前端通过轮询 queryApi 获取状态
4. queryApi 从 Temporal 查询 workflow 状态，状态变化时创建事件

## 实现的文件

### 1. Activities (`integrations/nanobanana2-image/activities/index.ts`)

定义了可重试的 activity 函数：

- `callNanobanana2Api`: 调用 nanobanana2 API 生成图片
- `uploadImageToStorage`: 上传图片到 S3/MinIO
- `generateAndUploadImage`: 完整的生成 + 上传流程（组合 activity）

Activity 特点：
- 有副作用（网络调用、文件上传）
- 可配置重试策略
- 支持超时控制

### 2. Workflows (`integrations/nanobanana2-image/workflows/index.ts`)

定义了核心 workflow：

- `imageGenerationWorkflow`: 编排图片生成流程

Workflow 特点：
- 可持久化：进程重启后能从断点恢复
- 可重试：activity 失败时自动重试
- 可查询：随时查询 workflow 状态
- 超时：10 分钟超时，最多重试 3 次

### 3. Integration (`integrations/nanobanana2-image/index.ts`)

重构后的 integration 实现：

**创建时：**
- 监听 APICall entity 创建事件
- 连接 Temporal client
- 启动 `imageGenerationWorkflow`
- 创建 processing 事件
- 立即返回（不等待 workflow 完成）

**查询时：**
- 接收 apiCallId 参数
- 从数据库获取 workflowId
- 查询 Temporal workflow 状态
- 状态变化时创建新事件
- 返回查询结果

### 4. 配置更新 (`integrations/nanobanana2-image/package.json`)

添加了 Temporal 依赖：
- `@temporalio/workflow`
- `@temporalio/activity`
- `@temporalio/client`
- `@aws-sdk/client-s3`

### 5. 测试用例 (`tests/genImage.nanobanana2-workflow.integration.test.ts`)

覆盖的测试场景：
- Workflow 收集验证
- 目录结构验证
- Temporal 连接测试
- Workflow 提交测试
- 状态查询测试
- 完整 workflow 执行测试

## 配置要求

Integration 需要以下配置：

```typescript
{
  apiCallEntity: { ... },    // APICall 实体配置
  eventEntity: { ... },      // 事件实体配置
  api: {
    queryApiName: string     // 查询 API 名称
  },
  external: {
    apiKey: string,          // nanobanana2 API Key
    baseUrl: string,         // API Base URL
    model: string            // 模型名称
  },
  storage: {
    accessKeyId: string,     // S3/MinIO 访问密钥
    secretAccessKey: string,
    region: string,
    endpoint: string,
    bucket: string,
    objectKeyPrefix: string
  },
  temporal: {
    address: string,         // Temporal Server 地址
    namespace: string        // Temporal 命名空间
  }
}
```

## Task Queue

- Task Queue 名称：`nanobanana2-image-tasks`
- AsyncTask Component 自动收集和启动 Worker

## 验证结果

### 测试通过
- ✅ Workflow 收集：nanobanana2-image workflows 被正确识别
- ✅ 目录结构：workflows/ 和 activities/ 目录存在
- ✅ Temporal 连接：成功连接到 Temporal Server
- ✅ Workflow 提交：成功提交 imageGenerationWorkflow
- ✅ 状态查询：可以查询 workflow 状态

### Worker 执行
- ✅ Worker 启动：nanobanana2-image worker 正常运行
- ✅ API 调用：成功调用 nanobanana2 API 生成图片
- ⚠️ 图片上传：需要确保 MinIO bucket 存在

## 注意事项

1. **Bucket 创建**：使用前需确保 MinIO/S3 bucket 已创建
2. **Worker 运行**：需要运行 `npm run dev:async-task` 启动 Worker
3. **Temporal 服务**：需要 Temporal Server 正常运行
4. **配置完整性**：所有配置字段都是必需的，无默认值

