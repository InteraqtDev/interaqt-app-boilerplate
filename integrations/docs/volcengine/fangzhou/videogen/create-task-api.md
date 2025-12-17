# 创建视频生成任务 API

> 最近更新时间：2025.11.04 10:30:14  
> 首次发布时间：2025.04.10 20:43:38

## 接口概述

```
POST https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks
```

本文介绍创建视频生成任务 API 的输入输出参数，供您使用接口时查阅字段含义。模型会依据传入的图片及文本信息生成视频，待生成完成后，您可以按条件查询任务并获取生成的视频。

## 快速入口

- [体验中心](https://console.volcengine.com/ark/region:ark+cn-beijing/experience/vision)
- [模型列表](https://www.volcengine.com/docs/82379/1330310#%E8%A7%86%E9%A2%91%E7%94%9F%E6%88%90%E8%83%BD%E5%8A%9B)
- [模型计费](https://www.volcengine.com/docs/82379/1099320#%E8%A7%86%E9%A2%91%E7%94%9F%E6%88%90%E6%A8%A1%E5%9E%8B)
- [API Key](https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey?apikey=%7B%7D)

## 鉴权说明

- [调用教程](https://www.volcengine.com/docs/82379/1366799)
- [接口文档](https://www.volcengine.com/docs/82379/1520758)
- [常见问题](https://www.volcengine.com/docs/82379/1359411)
- [开通模型](https://console.volcengine.com/ark/region:ark+cn-beijing/openManagement?LLM=%7B%7D&OpenTokenDrawer=false)

## 不同模型支持的视频生成能力简介

### doubao-seedance-pro
- **图生视频-首尾帧** (new)：根据您输入的首帧图片+尾帧图片+文本提示词（可选）+参数（可选）生成目标视频。
- **图生视频-首帧**：根据您输入的首帧图片+文本提示词（可选）+参数（可选）生成目标视频。
- **文生视频**：根据您输入的文本提示词+参数（可选）生成目标视频。

### doubao-seedance-pro-fast (new)
- **图生视频-首帧**：根据您输入的首帧图片+文本提示词（可选）+参数（可选）生成目标视频。
- **文生视频**：根据您输入的文本提示词+参数（可选）生成目标视频。

### doubao-seedance-lite
- **doubao-seedance-1-0-lite-t2v**：文生视频，根据您输入的文本提示词+参数（可选）生成目标视频。
- **doubao-seedance-1-0-lite-i2v**：
  - **图生视频-参考图** (new)：根据您输入的参考图片（1-4张）+文本提示词（可选）+ 参数（可选）生成目标视频。
  - **图生视频-首尾帧**：根据您输入的首帧图片+尾帧图片+文本提示词（可选）+参数（可选）生成目标视频。
  - **图生视频-首帧**：根据您输入的首帧图片+文本提示词（可选）+参数（可选）生成目标视频。

### wan2.1-14b (待下线)
- **wan2-1-14b-t2v**：文生视频，根据您输入的文本提示词+参数（可选）生成目标视频。
- **wan2-1-14b-i2v**：图生视频-首帧，根据您输入的首帧图片+文本提示词+参数（可选）生成目标视频。
- **wan2-1-14b-flf2v**：图生视频-首尾帧，根据您输入的首帧图片+尾帧图片+文本提示词+参数（可选）生成目标视频。

---

## 请求参数

### 请求体

#### model
- **类型**：`string`
- **必选**：是

您需要调用的模型的 ID（Model ID），[开通模型服务](https://console.volcengine.com/ark/region:ark+cn-beijing/openManagement?LLM=%7B%7D&OpenTokenDrawer=false)，并[查询 Model ID](https://www.volcengine.com/docs/82379/1330310)。

您也可通过 Endpoint ID 来调用模型，获得限流、计费类型（前付费/后付费）、运行状态查询、监控、安全等高级能力，可参考[获取 Endpoint ID](https://www.volcengine.com/docs/82379/1099522)。

---

#### content
- **类型**：`object[]`
- **必选**：是

输入给模型，生成视频的信息，支持文本信息和图片信息。

##### 文本信息 (object)
输入给模型生成视频的内容，文本内容部分。

**属性**：
- **content.type**：`string`
  - 输入内容的类型，此处应为 `text`。

- **content.text**：`string`
  - 输入给模型的文本内容，描述期望生成的视频，包括：
    - **文本提示词（必填）**：支持中英文。建议不超过500字。字数过多信息容易分散，模型可能因此忽略细节，只关注重点，造成视频缺失部分元素。提示词的更多使用技巧请参见 [Seedance 提示词指南](https://www.volcengine.com/docs/82379/1366799)。
    - **参数（选填）**：在文本提示词后追加`--[parameters]`，控制视频输出的规格，详情见[模型文本命令(选填)](#模型文本命令选填)。

##### 图片信息 (object)
输入给模型生成视频的内容，图片信息部分。

**属性**：
- **content.type**：`string`
  - 输入内容的类型，此处应为 `image_url`。支持图片URL或图片 Base64 编码。

- **content.image_url**：`object`
  - 输入给模型的图片对象。

- **content.role**：`String`（条件必填）
  - 图片的位置或用途。
  
  > **注意**：首帧图生视频、首尾帧图生视频、参考图生视频为 3 种互斥的场景，不支持混用。

**content.image_url.url**：`string`
- 图片信息，可以是图片URL或图片 Base64 编码。
  - **图片URL**：请确保图片URL可被访问。
  - **Base64编码**：请遵循此格式`data:image/<图片格式>;base64,<Base64编码>`，注意 `<图片格式>` 需小写，如 `data:image/png;base64,{base64_image}`。

**说明**：传入图片需要满足以下条件：
- 图片格式：jpeg、png、webp、bmp、tiff、gif。
- 宽高比（宽/高）：在范围 (0.4, 2.5)。
- 宽高长度（px）：(300, 6000)。
- 大小：小于30MB。

##### 图生视频-首帧
- **支持模型**：doubao-seedance-pro、doubao-seedance-pro-fast、doubao-seedance-lite-i2v、wan2-1-14b-i2v
- **字段role取值**：需要传入1个image_url对象，且字段role可不填，或字段role为：`first_frame`

##### 图生视频-首尾帧
- **支持模型**：doubao-seedance-pro、doubao-seedance-lite-i2v、wan2-1-14b-flf2v
- **字段role取值**：需要传入2个image_url对象，且字段role必填。
  - 首帧图片对应的字段role为：`first_frame`
  - 尾帧图片对应的字段role为：`last_frame`

**说明**：传入的首尾帧图片可相同。首尾帧图片的宽高比不一致时，以首帧图片为主，尾帧图片会自动裁剪适配。

##### 图生视频-参考图
- **支持模型**：doubao-seedance-1-0-lite-i2v
- **字段role取值**：需要传入1～4个image_url对象，且字段role必填。
  - 每张参考图片对应的字段role均为：`reference_image`

**说明**：
- 参考图生视频功能的文本提示词，可以用自然语言指定多张图片的组合。但若想有更好的指令遵循效果，推荐使用"[图1]xxx，[图2]xxx"的方式来指定图片。
- 示例1：戴着眼镜穿着蓝色T恤的男生和柯基小狗，坐在草坪上，3D卡通风格
- 示例2：[图1]戴着眼镜穿着蓝色T恤的男生和[图2]的柯基小狗，坐在[图3]的草坪上，3D卡通风格

---

#### callback_url
- **类型**：`string`

填写本次生成任务结果的回调通知地址。当视频生成任务有状态变化时，方舟将向此地址推送 POST 请求。

回调请求内容结构与[查询任务API](https://www.volcengine.com/docs/82379/1521309)的返回体一致。

回调返回的 status 包括以下状态：
- `queued`：排队中。
- `running`：任务运行中。
- `succeeded`：任务成功。（如发送失败，即5秒内没有接收到成功发送的信息，回调三次）
- `failed`：任务失败。（如发送失败，即5秒内没有接收到成功发送的信息，回调三次）

---

#### return_last_frame
- **类型**：`Boolean`
- **默认值**：`false`

Seedance 系列模型支持该参数。

- **true**：返回生成视频的尾帧图像。设置为 `"true"` 后，可通过[查询视频生成任务接口](https://www.volcengine.com/docs/82379/1521309)获取视频的尾帧图像。尾帧图像的格式为 png，宽高像素值与生成的视频保持一致，无水印。
  - 使用该参数可实现生成多个连续视频：以上一个生成视频的尾帧作为下一个视频任务的首帧，快速生成多个连续视频，调用示例详见[教程](https://www.volcengine.com/docs/82379/1366799?lang=zh#%E7%94%9F%E6%88%90%E5%A4%9A%E4%B8%AA%E8%BF%9E%E7%BB%AD%E8%A7%86%E9%A2%91)。
- **false**：不返回生成视频的尾帧图像。

---

## 模型文本命令(选填)

在文本提示词后追加 `--[parameters]`，控制视频输出的规格，包括宽高比、帧率、分辨率等。

不同模型，可能对应支持不同的参数与取值，详见[模型文本命令比较](https://www.volcengine.com/docs/82379/1366799#%E6%A8%A1%E5%9E%8B%E6%96%87%E6%9C%AC%E5%91%BD%E4%BB%A4%E6%AF%94%E8%BE%83)。当输入的参数或取值不符合所选的模型时，内容会被忽略或报错。

### resolution
- **类型**：`string`
- **简写**：`rs`
- **默认值**：
  - 不同模型默认值不同，一般是 `720p`
  - doubao-seedance-1-0-pro & pro-fast 默认值：`1080p`

视频分辨率，枚举值：
- `480p`
- `720p`
- `1080p`

不同模型支持的取值不同，详见[模型文本命令比较](https://www.volcengine.com/docs/82379/1366799#%E6%A8%A1%E5%9E%8B%E6%96%87%E6%9C%AC%E5%91%BD%E4%BB%A4%E6%AF%94%E8%BE%83)。

---

### ratio
- **类型**：`string`
- **简写**：`rt`
- **默认值**：
  - 不同模型默认值不同，一般是 `16:9`
  - wan2-1-14b-i2v，wan2-1-14b-flf2v，仅支持 `keep_ratio`
  - doubao-seedance-1-0-pro 图生视频，doubao-seedance-1-0-pro-fast 图生视频，doubao-seedance-1-0-lite-i2v 首帧或首尾帧图生视频，默认值：`adaptive`
  - 特别注意，doubao-seedance-1-0-lite-i2v 参考图生视频的默认值是 `16:9`

生成视频的宽高比例。不同模型支持的宽高比和具体像素值见下方表格。

枚举值：
- `16:9`
- `4:3`
- `1:1`
- `3:4`
- `9:16`
- `21:9`
- `keep_ratio`：所生成视频的宽高比与所上传图片的宽高比保持一致。
- `adaptive`：根据所上传图片的比例，自动选择最合适的宽高比。

> **注意**：图生视频，选择的宽高比与您上传的图片宽高比不一致时，方舟会对您的图片进行裁剪，裁剪时会居中裁剪，详细规则见[图片裁剪规则](https://www.volcengine.com/docs/82379/1366799)。

---

### duration
- **类型**：`Integer`
- **默认值**：`5秒`
- **简写**：`dur`

duration 和 frames 二选一即可，frames 的优先级高于 duration。如果您希望生成整数秒的视频，建议指定 duration。

生成视频时长，单位：秒。
- wan2.1-14b：仅支持 5 秒。
- doubao-seedance 系列模型：支持 2~12 秒 (new)。

---

### frames (new)
- **类型**：`Integer`
- **简写**：`frames`

> **仅 Seedance 系列模型支持该参数**

duration 和 frames 二选一即可，frames 的优先级高于 duration。如果您希望生成小数秒的视频，建议指定 frames。

生成视频的帧数。通过指定帧数，可以灵活控制生成视频的长度，生成小数秒的视频。

由于 frames 的取值限制，仅能支持有限小数秒，您需要根据公式推算最接近的帧数。

- 计算公式：帧数 = 时长 × 帧率（24）。
- 取值范围：支持 [29, 289] 区间内所有满足 `25 + 4n` 格式的整数值，其中 n 为正整数。

**例如**：假设需要生成 2.4 秒的视频，帧数=2.4×24=57.6。由于 frames 不支持 57.6，此时您只能选择一个最接近的值。根据 25+4n 计算出最接近的帧数为 57，实际生成的视频为 57/24=2.375 秒。

---

### framespersecond
- **类型**：`Integer`
- **简写**：`fps`
- **默认值**：
  - Wan2.1 默认值：`16`
  - Seedance 系列模型默认值：`24`

帧率，即一秒时间内视频画面数量。枚举值：
- `16`
- `24`

不同模型支持的取值不同，详见[模型文本命令比较](https://www.volcengine.com/docs/82379/1366799#%E6%A8%A1%E5%9E%8B%E6%96%87%E6%9C%AC%E5%91%BD%E4%BB%A4%E6%AF%94%E8%BE%83)。

---

### seed
- **类型**：`Integer`
- **默认值**：`-1`
- **简写**：`seed`

种子整数，用于控制生成内容的随机性。

取值范围：[-1, 2^32-1]之间的整数。

> **注意**：
> - 相同的请求下，模型收到不同的seed值，如：不指定seed值或令seed取值为-1（会使用随机数替代）、或手动变更seed值，将生成不同的结果。
> - 相同的请求下，模型收到相同的seed值，会生成类似的结果，但不保证完全一致。

---

### camerafixed
- **类型**：`Boolean`
- **默认值**：`false`
- **简写**：`cf`

是否固定摄像头。枚举值：
- `true`：固定摄像头。平台会在用户提示词中追加固定摄像头，实际效果不保证。
- `false`：不固定摄像头。

部分模型支持该参数，详见[模型文本命令比较](https://www.volcengine.com/docs/82379/1366799#%E6%A8%A1%E5%9E%8B%E6%96%87%E6%9C%AC%E5%91%BD%E4%BB%A4%E6%AF%94%E8%BE%83)。

---

### watermark
- **类型**：`Boolean`
- **默认值**：`false`
- **简写**：`wm`

生成视频是否包含水印。枚举值：
- `false`：不含水印。
- `true`：含有水印。

---

## 响应参数

### id
- **类型**：`string`

视频生成任务 ID。创建视频生成任务为异步接口，获取 ID 后，需要通过[查询视频生成任务 API](https://www.volcengine.com/docs/82379/1521309)来查询视频生成任务的状态。任务成功后，会输出生成视频的 `video_url`。

---

## 示例代码

### 文生视频

#### 请求示例

```bash
curl -X POST https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ARK_API_KEY" \
  -d '{
    "model": "doubao-seedance-1-0-pro-250528",
    "content": [
      {
        "type": "text",
        "text": "多个镜头。一名侦探进入一间光线昏暗的房间。他检查桌上的线索，手里拿起桌上的某个物品。镜头转向他正在思索。 --ratio 16:9"
      }
    ]
  }'
```

#### 响应示例

```json
{
  "id": "cgt-2025******-****"
}
```

---

## 相关文档

- 上一篇：[流式响应](https://www.volcengine.com/docs/82379/1599499)
- 下一篇：[查询视频生成任务 API](https://www.volcengine.com/docs/82379/1521309)

---

## 在线调试

您可以通过 [API Explorer](https://api.volcengine.com/api-explorer/?action=CreateContentsGenerationsTasks&data=%7B%7D&groupName=%E8%A7%86%E9%A2%91%E7%94%9F%E6%88%90API&query=%7B%7D&serviceCode=ark&version=2024-01-01) 在线调试该接口。

