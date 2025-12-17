# 可灵（Kling）AI 图生视频 API 文档

## 概述

可灵（Kling）AI 的图生视频（Image-to-Video）API 允许用户通过输入静态图像，生成动态视频内容。该 API 支持多种生成模式，包括标准模式（std）和高品质模式（pro）。

## 接口信息

- **请求方法：** `POST`
- **请求地址：** `/v1/videos/image2video`
- **内容类型：** `application/json`
- **认证方式：** Bearer Token

## 支持的模型

| 模型名称           | 模型 ID                  | 支持功能                             |
| ------------------ | ------------------------ | ------------------------------------ |
| Kling v1.6         | `kling-v1-6`             | 文生视频、图生视频、多图参考生视频   |
| Kling v2 Master    | `kling-v2-master`        | 文生视频、图生视频、多图参考生视频   |
| Kling v2.1         | `kling-v2-1`             | 文生视频、图生视频、多图参考生视频   |
| Kling v2.1 Master  | `kling-v2-1-master`      | 文生视频、图生视频、多图参考生视频   |

## 请求参数

| 参数名           | 类型   | 必填 | 默认值 | 描述                                                                                   |
| ---------------- | ------ | ---- | ------ | -------------------------------------------------------------------------------------- |
| `model_name`     | string | 是   | -      | 模型名称，参考支持的模型列表                                                           |
| `mode`           | string | 是   | -      | 生成模式，可选值：`std`（标准模式），`pro`（高品质模式）                               |
| `image`          | string | 是   | -      | 输入图像的 URL 或 Base64 编码                                                          |
| `image_tail`     | string | 否   | -      | 尾帧图像的 URL 或 Base64 编码（用于控制视频结束画面）                                  |
| `prompt`         | string | 否   | -      | 文本提示词，描述希望生成的视频内容，≤2500 字符，支持中英文                             |
| `negative_prompt`| string | 否   | -      | 反向提示词，描述希望避免出现在视频中的内容，≤2500 字符                                 |
| `duration`       | int    | 否   | 5      | 视频时长，单位为秒，支持的值：5、10                                                    |
| `aspect_ratio`   | string | 否   | 16:9   | 视频宽高比，可选值：`16:9`、`9:16`、`1:1`、`3:2`、`2:3`、`3:4`、`4:3`                  |
| `cfg_scale`      | float  | 否   | 0.5    | 生成视频的自由度，取值范围：[0, 1]，值越大，与提示词的相关性越强                       |
| `camera_control` | object | 否   | -      | 相机控制参数，包括类型和配置                                                           |

### camera_control 参数说明

| 参数名   | 类型   | 描述                                                                       |
| -------- | ------ | -------------------------------------------------------------------------- |
| `type`   | string | 相机运动类型，可选值：`zoom`（缩放）、`pan`（平移）、`tilt`（倾斜）等      |
| `config` | object | 具体配置，包含 `value` 字段，表示运动幅度，正值为正向运动，负值为反向运动  |

### 图片要求

- **支持格式**：JPG、JPEG、PNG
- **文件大小**：≤10MB
- **分辨率要求**：建议使用清晰的高分辨率图片
- **输入方式**：URL 链接或 Base64 编码字符串

## 响应参数

| 参数名           | 类型   | 描述                                                     |
| ---------------- | ------ | -------------------------------------------------------- |
| `task_id`        | string | 任务 ID，可用于查询任务状态                              |
| `task_status`    | string | 任务状态：`submitted`、`processing`、`completed`、`failed` |
| `created_at`     | number | 任务创建时间戳（毫秒）                                   |
| `updated_at`     | number | 任务更新时间戳（毫秒）                                   |

## 示例请求

### 基础请求

```json
{
  "model_name": "kling-v1-6",
  "mode": "pro",
  "image": "https://example.com/input.jpg",
  "prompt": "让图片中的人物微笑并轻轻点头",
  "duration": 10,
  "aspect_ratio": "16:9"
}
```

### 带相机控制的请求

```json
{
  "model_name": "kling-v1-6",
  "mode": "pro",
  "image": "https://example.com/input.jpg",
  "prompt": "风景画面缓缓展开，云朵飘动，光影变化",
  "duration": 10,
  "aspect_ratio": "16:9",
  "cfg_scale": 0.7,
  "camera_control": {
    "type": "zoom",
    "config": {
      "value": -5
    }
  }
}
```

### 带尾帧控制的请求

```json
{
  "model_name": "kling-v1-6",
  "mode": "pro",
  "image": "https://example.com/start.jpg",
  "image_tail": "https://example.com/end.jpg",
  "prompt": "从起始画面平滑过渡到结束画面",
  "duration": 10
}
```

## 示例响应

```json
{
  "task_id": "CmYgjmbyMToAAAAAAF6svw",
  "task_status": "submitted",
  "created_at": 1727338013674,
  "updated_at": 1727338013674
}
```

## 任务查询

通过 `task_id` 查询任务状态和结果：

- **请求方法：** `GET`
- **请求地址：** `/v1/videos/image2video/{task_id}`

### 查询响应示例

```json
{
  "task_id": "CmYgjmbyMToAAAAAAF6svw",
  "task_status": "completed",
  "task_status_msg": "任务完成",
  "created_at": 1727338013674,
  "updated_at": 1727338113674,
  "task_result": {
    "videos": [
      {
        "id": "video_001",
        "url": "https://example.com/output.mp4",
        "duration": 10
      }
    ]
  }
}
```

## 任务状态说明

| 状态值       | 描述                                     |
| ------------ | ---------------------------------------- |
| `submitted`  | 任务已提交，等待处理                     |
| `processing` | 任务处理中                               |
| `completed`  | 任务完成，可获取生成的视频               |
| `failed`     | 任务失败，请检查参数或重试               |

## 错误码

| 错误码 | 描述                     |
| ------ | ------------------------ |
| 400    | 请求参数错误             |
| 401    | 认证失败，Token 无效     |
| 403    | 权限不足                 |
| 429    | 请求频率超限             |
| 500    | 服务器内部错误           |

## 注意事项

1. **认证**：所有请求需在请求头中包含 `Authorization` 字段，格式为 `Bearer {YOUR_API_KEY}`
2. **图片格式**：`image` 参数支持 URL 或 Base64 编码的图像
3. **提示词**：`prompt` 和 `negative_prompt` 的长度不超过 2500 个字符
4. **时长**：`duration` 参数目前支持 5 秒和 10 秒的视频时长
5. **宽高比**：`aspect_ratio` 参数决定了生成视频的宽高比，需根据需求选择
6. **自由度**：`cfg_scale` 参数控制生成内容与提示词的贴合程度，值越大，贴合度越高
7. **相机控制**：`camera_control` 参数用于控制相机运动效果，需根据需求配置
8. **尾帧图像**：使用 `image_tail` 可以控制视频结束时的画面，实现起始帧到结束帧的平滑过渡
9. **任务查询**：建议轮询间隔为 5-10 秒

## 多图参考生视频

除了单图生视频，可灵 AI 还支持多图参考生成视频功能。

### 请求参数

| 参数名       | 类型   | 必填 | 描述                                               |
| ------------ | ------ | ---- | -------------------------------------------------- |
| `image_list` | array  | 是   | 多张参考图片的 URL 或 Base64 编码数组              |
| `prompt`     | string | 是   | 文本提示词，描述希望如何使用这些参考图片生成视频   |

### 示例请求

```json
{
  "model_name": "kling-v2-master",
  "mode": "pro",
  "image_list": [
    "https://example.com/ref1.jpg",
    "https://example.com/ref2.jpg",
    "https://example.com/ref3.jpg"
  ],
  "prompt": "综合三张参考图片的风格，创建一个动态的艺术视频",
  "duration": 10,
  "aspect_ratio": "16:9"
}
```

## 参考文档

- 可灵 AI 开放平台：https://klingai.com
- 可灵 API 文档（第三方）：https://doc.dmxapi.com/kling-img2video.html

