# MiniMax 海螺视频生成服务 API 文档

> 文档整理日期：2025-12-07
> 官方文档：https://platform.minimaxi.com/docs/api-reference/video-generation-intro

## 概述

MiniMax 海螺视频生成服务提供基于文本或图像的高质量视频生成能力，支持多种模型和生成模式，满足不同场景的需求。

## 支持模型

| 模型名称                 | 功能描述                                                                 | 支持模式 |
| ------------------------ | ------------------------------------------------------------------------ | -------- |
| MiniMax-Hailuo-2.3       | 全新视频生成模型，肢体动作、物理表现与指令遵循能力全面升级              | T2V, I2V |
| MiniMax-Hailuo-2.3-Fast  | 图生视频模型，生成速度大幅提升，以更高性价比兼顾画质与表现力            | I2V      |
| MiniMax-Hailuo-02        | 新一代视频生成模型，支持更高分辨率（1080P）和更长时长（10s），指令遵循能力更强 | T2V, I2V |

### 模型规格

| 模型名称                | 分辨率          | 时长支持      |
| ----------------------- | --------------- | ------------- |
| MiniMax-Hailuo-2.3      | 768P, 1080P     | 6s, 10s (768P仅10s) |
| MiniMax-Hailuo-2.3-Fast | 768P, 1080P     | 6s, 10s (768P仅10s) |
| MiniMax-Hailuo-02       | 512P, 768P, 1080P | 6s, 10s       |

> **注意**：1080P 分辨率目前仅支持 6s 时长。

## 接口说明

视频生成采用异步方式，整体包含 3 个 API：

1. **创建视频生成任务**：提交视频生成请求，成功创建后返回一个 `task_id`
2. **查询视频生成任务状态**：基于返回的 `task_id` 查询视频生成任务状态
3. **文件管理**：基于 `file_id` 进行视频生成结果的查看和下载

### 基础 URL

```
https://api.minimaxi.com
```

---

## API 参考

### 1. 创建视频生成任务

**请求方法**：`POST`

**请求地址**：

- 新版本：`https://api.minimaxi.com/v1/video_generation`
- 旧版本：`https://api.minimaxi.com/v3/async/minimax-video-01`

**请求头**：

| Header          | 值                      | 说明         |
| --------------- | ----------------------- | ------------ |
| Content-Type    | application/json        | 内容类型     |
| Authorization   | Bearer {API_KEY}        | API 密钥认证 |

**请求体参数**：

| 参数名                   | 类型    | 必填 | 说明                                                                                   |
| ------------------------ | ------- | ---- | -------------------------------------------------------------------------------------- |
| model                    | string  | 是   | 模型名称，可选值：`MiniMax-Hailuo-2.3`、`MiniMax-Hailuo-2.3-Fast`、`MiniMax-Hailuo-02` |
| prompt                   | string  | 是   | 文本提示词，描述想要生成的视频内容。长度范围：1-2000 个字符                            |
| image_url                | string  | 否   | 图生视频（I2V）模式下的首帧图片 URL                                                    |
| last_frame_image         | string  | 否   | 尾帧图片 URL，用于控制视频结束帧画面（MiniMax-Hailuo-02 支持）                         |
| duration                 | integer | 否   | 视频时长（秒），支持：`6`、`10`                                                        |
| resolution               | string  | 否   | 视频分辨率，支持：`512P`、`768P`、`1080P`                                              |
| enable_prompt_expansion  | boolean | 否   | 是否启用提示词优化，默认值：`true`                                                     |

**请求示例**：

```bash
curl --request POST \
  --url https://api.minimaxi.com/v1/video_generation \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "model": "MiniMax-Hailuo-2.3",
    "prompt": "一只金色的猫咪在阳光下慵懒地打着哈欠",
    "duration": 6,
    "resolution": "1080P",
    "enable_prompt_expansion": true
  }'
```

**图生视频请求示例**：

```bash
curl --request POST \
  --url https://api.minimaxi.com/v1/video_generation \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "model": "MiniMax-Hailuo-2.3",
    "prompt": "猫咪慢慢睁开眼睛，伸了个懒腰",
    "image_url": "https://example.com/cat.jpg",
    "duration": 6,
    "resolution": "768P"
  }'
```

**响应参数**：

| 参数名    | 类型   | 说明                     |
| --------- | ------ | ------------------------ |
| task_id   | string | 异步任务的唯一标识符     |

**响应示例**：

```json
{
  "task_id": "1234567890abcdef"
}
```

---

### 2. 查询视频生成任务状态

**请求方法**：`GET`

**请求地址**：

- 新版本：`https://api.minimaxi.com/v1/video_generation/{task_id}`
- 旧版本：`https://api.minimaxi.com/v3/async/minimax-video-01/{task_id}`

**请求头**：

| Header        | 值               | 说明         |
| ------------- | ---------------- | ------------ |
| Authorization | Bearer {API_KEY} | API 密钥认证 |

**响应参数**：

| 参数名   | 类型   | 说明                                                               |
| -------- | ------ | ------------------------------------------------------------------ |
| status   | string | 任务状态，可选值：`pending`、`processing`、`succeeded`、`failed`   |
| file_id  | string | 视频文件 ID，仅在任务成功（`succeeded`）时返回                      |
| error    | string | 错误信息，仅在任务失败（`failed`）时返回                            |

**请求示例**：

```bash
curl --request GET \
  --url https://api.minimaxi.com/v1/video_generation/1234567890abcdef \
  --header 'Authorization: Bearer YOUR_API_KEY'
```

**响应示例（任务成功）**：

```json
{
  "status": "succeeded",
  "file_id": "abcdef1234567890"
}
```

**响应示例（任务处理中）**：

```json
{
  "status": "processing"
}
```

**响应示例（任务失败）**：

```json
{
  "status": "failed",
  "error": "内容审核未通过"
}
```

---

### 3. 文件管理

**请求方法**：`GET`

**请求地址**：

- 新版本：`https://api.minimaxi.com/v1/files/{file_id}`
- 旧版本：`https://api.minimaxi.com/v3/files/{file_id}`

**请求头**：

| Header        | 值               | 说明         |
| ------------- | ---------------- | ------------ |
| Authorization | Bearer {API_KEY} | API 密钥认证 |

**响应参数**：

| 参数名       | 类型   | 说明                   |
| ------------ | ------ | ---------------------- |
| download_url | string | 视频文件的下载地址     |
| file_id      | string | 文件 ID                |
| created_at   | number | 文件创建时间戳         |

**请求示例**：

```bash
curl --request GET \
  --url https://api.minimaxi.com/v1/files/abcdef1234567890 \
  --header 'Authorization: Bearer YOUR_API_KEY'
```

**响应示例**：

```json
{
  "download_url": "https://cdn.minimaxi.com/files/abcdef1234567890.mp4",
  "file_id": "abcdef1234567890",
  "created_at": 1733580000
}
```

---

## 任务状态说明

| 状态        | 说明                                           |
| ----------- | ---------------------------------------------- |
| pending     | 任务已创建，等待处理                           |
| processing  | 任务正在处理中                                 |
| succeeded   | 任务处理成功，可通过 file_id 获取视频          |
| failed      | 任务处理失败，查看 error 字段获取错误原因      |

---

## 使用流程

```
┌─────────────────────────┐
│  1. 创建视频生成任务     │
│  POST /v1/video_generation │
└───────────┬─────────────┘
            │
            ▼ 返回 task_id
┌─────────────────────────┐
│  2. 查询任务状态         │
│  GET /v1/video_generation/{task_id} │
│  (轮询直到 succeeded)    │
└───────────┬─────────────┘
            │
            ▼ 返回 file_id
┌─────────────────────────┐
│  3. 获取视频文件         │
│  GET /v1/files/{file_id} │
└───────────┬─────────────┘
            │
            ▼ 返回 download_url
┌─────────────────────────┐
│  4. 下载视频             │
└─────────────────────────┘
```

---

## 代码示例

### TypeScript/JavaScript

```typescript
interface VideoGenerationRequest {
  model: 'MiniMax-Hailuo-2.3' | 'MiniMax-Hailuo-2.3-Fast' | 'MiniMax-Hailuo-02';
  prompt: string;
  image_url?: string;
  last_frame_image?: string;
  duration?: 6 | 10;
  resolution?: '512P' | '768P' | '1080P';
  enable_prompt_expansion?: boolean;
}

interface CreateTaskResponse {
  task_id: string;
}

interface QueryTaskResponse {
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  file_id?: string;
  error?: string;
}

interface FileResponse {
  download_url: string;
  file_id: string;
  created_at: number;
}

const API_BASE = 'https://api.minimaxi.com';
const API_KEY = 'your-api-key';

async function createVideoTask(request: VideoGenerationRequest): Promise<string> {
  const response = await fetch(`${API_BASE}/v1/video_generation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(request),
  });
  
  const data: CreateTaskResponse = await response.json();
  return data.task_id;
}

async function queryTaskStatus(taskId: string): Promise<QueryTaskResponse> {
  const response = await fetch(`${API_BASE}/v1/video_generation/${taskId}`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
    },
  });
  
  return response.json();
}

async function getVideoUrl(fileId: string): Promise<string> {
  const response = await fetch(`${API_BASE}/v1/files/${fileId}`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
    },
  });
  
  const data: FileResponse = await response.json();
  return data.download_url;
}

// 完整流程示例
async function generateVideo(prompt: string): Promise<string> {
  // 1. 创建任务
  const taskId = await createVideoTask({
    model: 'MiniMax-Hailuo-2.3',
    prompt,
    duration: 6,
    resolution: '1080P',
  });
  
  // 2. 轮询任务状态
  let status: QueryTaskResponse;
  do {
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5秒轮询间隔
    status = await queryTaskStatus(taskId);
  } while (status.status === 'pending' || status.status === 'processing');
  
  if (status.status === 'failed') {
    throw new Error(status.error || '视频生成失败');
  }
  
  // 3. 获取下载链接
  return getVideoUrl(status.file_id!);
}
```

---

## 视频生成 Agent（可选功能）

MiniMax 还提供视频生成 Agent 接口，支持基于模板的视频生成。

### Agent 模板示例

| 模板 ID              | 模板名称 | 模板说明                                         |
| -------------------- | -------- | ------------------------------------------------ |
| 392753057216684038   | 跳水     | 上传图片，生成图中主体完成完美跳水动作的视频     |
| 393881433990066176   | 吊环     | 上传宠物照片，生成图中主体完成完美吊环动作的视频 |

Agent API 文档请参考：https://platform.minimaxi.com/docs/api-reference/video-agent-intro

---

## 功能更新历史

### 2025 年 10 月 28 日
- 新增 MiniMax-Hailuo-2.3 和 MiniMax-Hailuo-2.3-Fast 两个模型
- MiniMax-Hailuo-2.3 模型支持文生视频（T2V）和图生视频（I2V）两种生成模式
- MiniMax-Hailuo-2.3-Fast 模型支持图生视频（I2V）生成模式
- 两个模型均支持 768P（6s，10s）和 1080P（6s）分辨率

### 2025 年 08 月 28 日
- MiniMax-Hailuo-02 首尾帧生成功能上线
- 新增参数 `last_frame_image`，用于控制视频结束帧画面
- 支持 768P（6s，10s），1080P（6s）

### 2025 年 08 月 02 日
- MiniMax-Hailuo-02 图生视频功能，支持 512 分辨率

---

## 注意事项

1. **API 密钥安全**：请妥善保管 API 密钥，避免泄露
2. **轮询间隔**：建议轮询间隔设置为 5-10 秒，避免频繁请求
3. **内容审核**：生成内容需符合平台内容政策，不合规内容将被拒绝
4. **文件有效期**：生成的视频文件下载链接可能有有效期限制
5. **并发限制**：请注意 API 调用频率限制

---

## 参考链接

- [MiniMax 开放平台](https://platform.minimaxi.com)
- [视频生成 API 文档](https://platform.minimaxi.com/docs/api-reference/video-generation-intro)
- [功能更新日志](https://platform.minimaxi.com/docs/release-notes/apis)
- [视频生成 Agent 文档](https://platform.minimaxi.com/docs/api-reference/video-agent-intro)
- [官方 MCP (GitHub)](https://github.com/MiniMax-AI/MiniMax-MCP)

