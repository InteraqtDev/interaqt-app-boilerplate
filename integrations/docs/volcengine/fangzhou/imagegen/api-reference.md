# 图片生成 API（Seedream 4.0 API）

**最近更新时间：2025.10.17 17:44:05**  
**首次发布时间：2025.05.13 17:18:46**

**接口地址**

```
POST https://ark.cn-beijing.volces.com/api/v3/images/generations
```

## 简介

本文介绍图片生成模型如 Seedream 4.0 的调用 API，包括输入输出参数，取值范围，注意事项等信息，供您使用接口时查阅字段含义。

## 不同模型支持的图片生成能力简介

### doubao-seedream-4.0

- **生成组图**（组图：基于您输入的内容，生成的一组内容关联的图片；需配置 `sequential_image_generation` 为 `auto`）
  - 多图生组图，根据您输入的 **多张参考图片（2-10）+文本提示词** 生成一组内容关联的图片（输入的参考图数量+最终生成的图片数量≤15张）。
  - 单图生组图，根据您输入的 **单张参考图片+文本提示词** 生成一组内容关联的图片（最多生成14张图片）。
  - 文生组图，根据您输入的 **文本提示词** 生成一组内容关联的图片（最多生成15张图片）。

- **生成单图**（配置 `sequential_image_generation` 为 `disabled`）
  - 多图生图，根据您输入的 **多张参考图片（2-10）+文本提示词** 生成单张图片。
  - 单图生图，根据您输入的 **单张参考图片+文本提示词** 生成单张图片。
  - 文生图，根据您输入的 **文本提示词** 生成单张图片。

### doubao-seedream-3.0-t2i

- 文生图，根据您输入的 **文本提示词** 生成单张图片。

### doubao-seededit-3.0-i2i

- 图生图，根据您输入的 **单张参考图片+文本提示词** 生成单张图片。

## 请求参数

### 请求体

#### model

- **类型**: `string`
- **必选**: 是
- **说明**: 本次请求使用模型的 Model ID 或推理接入点 (Endpoint ID)。

#### prompt

- **类型**: `string`
- **必选**: 是
- **说明**: 用于生成图像的提示词，支持中英文。（查看提示词指南：[Seedream 4.0](https://www.volcengine.com/docs/82379/1829186)、[Seedream 3.0](https://www.volcengine.com/docs/82379/1795150)）
- **建议**: 不超过300个汉字或600个英文单词。字数过多信息容易分散，模型可能因此忽略细节，只关注重点，造成图片缺失部分元素。

#### image

- **类型**: `string/array`
- **支持模型**: 仅 doubao-seedream-4.0、doubao-seededit-3.0-i2i 支持该参数
- **说明**: 输入的图片信息，支持 URL 或 Base64 编码。其中，doubao-seedream-4.0 支持单图或多图输入（[查看多图融合示例](https://www.volcengine.com/docs/82379/1824121#%E5%A4%9A%E5%9B%BE%E8%9E%8D%E5%90%88%EF%BC%88%E5%A4%9A%E5%9B%BE%E8%BE%93%E5%85%A5%E5%8D%95%E5%9B%BE%E8%BE%93%E5%87%BA%EF%BC%89)），doubao-seededit-3.0-i2 仅支持单图输入。
  - **图片URL**: 请确保图片URL可被访问。
  - **Base64编码**: 请遵循此格式 `data:image/<图片格式>;base64,<Base64编码>`。注意 `<图片格式>` 需小写，如 `data:image/png;base64,<base64_image>`。

> **说明**
> 
> 传入图片需要满足以下条件：
> - 图片格式：jpeg、png
> - 宽高比（宽/高）范围：[1/3, 3]
> - 宽高长度（px） > 14
> - 大小：不超过 10MB
> - 总像素：不超过 `6000×6000` px
> - doubao-seedream-4.0 最多支持传入 10 张参考图。

#### size

- **类型**: `string`
- **支持模型**: doubao-seedream-4.0、doubao-seedream-3.0-t2i、doubao-seededit-3.0-i2i
- **说明**: 指定生成图像的尺寸信息，支持以下两种方式，不可混用。

  **方式1** | [示例](https://www.volcengine.com/docs/82379/1824121#%E6%8C%87%E5%AE%9A%E5%9B%BE%E5%83%8F%E5%88%86%E8%BE%A8%E7%8E%87)：指定生成图像的分辨率，并在prompt中用自然语言描述图片宽高比、图片形状或图片用途，最终由模型判断生成图片的大小。
  - 可选值：`1K`、`2K`、`4K`

  **方式2** | [示例](https://www.volcengine.com/docs/82379/1824121#%E6%8C%87%E5%AE%9A%E5%9B%BE%E5%83%8F%E5%AE%BD%E9%AB%98%E5%83%8F%E7%B4%A0%E5%80%BC)：指定生成图像的宽高像素值：
  - 默认值：`2048x2048`
  - 总像素取值范围：[`1280x720`, `4096x4096`]
  - 宽高比取值范围：[1/16, 16]

  **推荐的宽高像素值**：

| 宽高比 | 宽高像素值 |
|--------|-----------|
| 1:1    | 2048x2048 |
| 4:3    | 2304x1728 |
| 3:4    | 1728x2304 |
| 16:9   | 2560x1440 |
| 9:16   | 1440x2560 |
| 3:2    | 2496x1664 |
| 2:3    | 1664x2496 |
| 21:9   | 3024x1296 |

#### seed

- **类型**: `integer`
- **默认值**: `-1`
- **支持模型**: 仅 doubao-seedream-3.0-t2i、doubao-seededit-3.0-i2i 支持该参数
- **说明**: 随机数种子，用于控制模型生成内容的随机性。取值范围为 [-1, 2147483647]。

> **注意**
> 
> - 相同的请求下，模型收到不同的seed值，如：不指定seed值或令seed取值为-1（会使用随机数替代）、或手动变更seed值，将生成不同的结果。
> - 相同的请求下，模型收到相同的seed值，会生成类似的结果，但不保证完全一致。

#### sequential_image_generation

- **类型**: `string`
- **默认值**: `disabled`
- **支持模型**: 仅 doubao-seedream-4.0 支持该参数 | [查看组图输出示例](https://www.volcengine.com/docs/82379/1824121#%E5%BF%AB%E9%80%9F%E5%BC%80%E5%A7%8B)
- **说明**: 控制是否关闭组图功能。

> **说明**
> 
> 组图：基于您输入的内容，生成的一组内容关联的图片。

- `auto`：自动判断模式，模型会根据用户提供的提示词自主判断是否返回组图以及组图包含的图片数量。
- `disabled`：关闭组图功能，模型只会生成一张图。

#### sequential_image_generation_options

- **类型**: `object`
- **支持模型**: 仅 doubao-seedream-4.0 支持该参数
- **说明**: 组图功能的配置。仅当 `sequential_image_generation` 为 `auto` 时生效。

**属性**:

##### sequential_image_generation_options.max_images

- **类型**: `integer`
- **默认值**: `15`
- **说明**: 指定本次请求，最多可生成的图片数量。
  - 取值范围： [1, 15]

> **说明**
> 
> 实际可生成的图片数量，除受到 max_images 影响外，还受到输入的参考图数量影响。输入的参考图数量+最终生成的图片数量≤15张。

#### stream

- **类型**: `Boolean`
- **默认值**: `false`
- **支持模型**: 仅 doubao-seedream-4.0 支持该参数 | [查看流式输出示例](https://www.volcengine.com/docs/82379/1824121#%E6%B5%81%E5%BC%8F%E8%BE%93%E5%87%BA)
- **说明**: 控制是否开启流式输出模式。
  - `false`：非流式输出模式，等待所有图片全部生成结束后再一次性返回所有信息。
  - `true`：流式输出模式，即时返回每张图片输出的结果。在生成单图和组图的场景下，流式输出模式均生效。

#### guidance_scale

- **类型**: `Float`
- **默认值**: 
  - doubao-seedream-3.0-t2i 默认值 `2.5`
  - doubao-seededit-3.0-i2i 默认值 `5.5`
  - doubao-seedream-4.0 不支持
- **说明**: 模型输出结果与prompt的一致程度，生成图像的自由度，又称为文本权重；值越大，模型自由度越小，与用户输入的提示词相关性越强。
  - 取值范围：[`1`, `10`]

#### response_format

- **类型**: `string`
- **默认值**: `url`
- **说明**: 指定生成图像的返回格式。生成的图片为 jpeg 格式，支持以下两种返回方式：
  - `url`：返回图片下载链接；链接在图片生成后24小时内有效，请及时下载图片。
  - `b64_json`：以 Base64 编码字符串的 JSON 格式返回图像数据。

#### watermark

- **类型**: `Boolean`
- **默认值**: `true`
- **说明**: 是否在生成的图片中添加水印。
  - `false`：不添加水印。
  - `true`：在图片右下角添加"AI生成"字样的水印标识。

#### optimize_prompt_options (new)

- **类型**: `object`
- **支持模型**: 仅 doubao-seedream-4.0 支持该参数
- **说明**: 提示词优化功能的配置。

**属性**:

##### optimize_prompt_options.mode

- **类型**: `string`
- **默认值**: `standard`
- **说明**: 设置提示词优化功能使用的模式。doubao-seedream-4.0 默认使用标准模式对用户输入的提示词进行优化。
  - `standard`：标准模式，生成内容的质量更高，耗时较长。
  - `fast`：快速模式，生成内容的耗时更短，质量一般。

## 响应参数

### 流式响应参数

请参见[文档](https://www.volcengine.com/docs/82379/1824137?lang=zh)。

### 非流式响应参数

#### model

- **类型**: `string`
- **说明**: 本次请求使用的模型 ID（`模型名称-版本`）。

#### created

- **类型**: `integer`
- **说明**: 本次请求创建时间的 Unix 时间戳（秒）。

#### data

- **类型**: `array`
- **说明**: 输出图像的信息。

> **说明**
> 
> doubao-seedream-4.0模型生成组图场景下，组图生成过程中某张图生成失败时：
> - 若失败原因为审核不通过：仍会继续请求下一个图片生成任务，即不影响同请求内其他图片的生成流程。
> - 若失败原因为内部服务异常（500）：不会继续请求下一个图片生成任务。

**可能类型**:

##### 图片信息

- **类型**: `object`
- **说明**: 生成成功的图片信息。

**属性**:

###### data.url

- **类型**: `string`
- **说明**: 图片的 url 信息，当 `response_format` 指定为 `url` 时返回。该链接将在生成后 24 小时内失效，请务必及时保存图像。

###### data.b64_json

- **类型**: `string`
- **说明**: 图片的 base64 信息，当 `response_format` 指定为 `b64_json` 时返回。

###### data.size

- **类型**: `string`
- **支持模型**: 仅 doubao-seedream-4.0 支持该字段。
- **说明**: 图像的宽高像素值，格式 `<宽像素>x<高像素>`，如 `2048×2048`。

##### 错误信息

- **类型**: `object`
- **说明**: 某张图片生成失败，错误信息。

**属性**:

###### data.error

- **类型**: `object`
- **说明**: 错误信息结构体。

**属性**:

**data.error.code**

某张图片生成错误的错误码，请参见[错误码](https://www.volcengine.com/docs/82379/1299023)。

**data.error.message**

某张图片生成错误的提示信息。

#### usage

- **类型**: `object`
- **说明**: 本次请求的用量信息。

**属性**:

##### usage.generated_images

- **类型**: `integer`
- **说明**: 模型成功生成的图片张数，不包含生成失败的图片。仅对成功生成图片按张数进行计费。

##### usage.output_tokens

- **类型**: `integer`
- **说明**: 模型生成的图片花费的 token 数量。
- **计算逻辑**: 计算 `sum(图片长*图片宽)/256`，然后取整。

##### usage.total_tokens

- **类型**: `integer`
- **说明**: 本次请求消耗的总 token 数量。当前不计算输入 token，故与 output_tokens 值一致。

#### error

- **类型**: `object`
- **说明**: 本次请求，如发生错误，对应的错误信息。

**属性**:

##### error.code

- **类型**: `string`
- **说明**: 请参见[错误码](https://www.volcengine.com/docs/82379/1299023)。

##### error.message

- **类型**: `string`
- **说明**: 错误提示信息

## 示例

### doubao-seedream-4.0-文生图

#### 输入示例

```bash
curl -X POST https://ark.cn-beijing.volces.com/api/v3/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ARK_API_KEY" \
  -d '{
    "model": "doubao-seedream-4-0-250828",
    "prompt": "星际穿越，黑洞，黑洞里冲出一辆快支离破碎的复古列车，抢视觉冲击力，电影大片，末日既视感，动感，对比色，oc渲染，光线追踪，动态模糊，景深，超现实主义，深蓝，画面通过细腻的丰富的色彩层次塑造主体与场景，质感真实，暗黑风背景的光影效果营造出氛围，整体兼具艺术幻想感，夸张的广角透视效果，耀光，反射，极致的光影，强引力，吞噬",
    "size": "2K",
    "sequential_image_generation": "disabled",
    "stream": false,
    "response_format": "url",
    "watermark": true
  }'
```

#### 输出示例

```json
{
  "model": "doubao-seedream-4-0-250828",
  "created": 1757321139,
  "data": [
    {
      "url": "https://...",
      "size": "3104x1312"
    }
  ],
  "usage": {
    "generated_images": 1,
    "output_tokens": xxx,
    "total_tokens": xxx
  }
}
```

## 快速入口

- [体验中心](https://console.volcengine.com/ark/region:ark+cn-beijing/experience/vision?type=GenImage)
- [模型列表](https://www.volcengine.com/docs/82379/1330310#%E5%9B%BE%E7%89%87%E7%94%9F%E6%88%90%E8%83%BD%E5%8A%9B)
- [模型计费](https://www.volcengine.com/docs/82379/1544106#%E5%9B%BE%E7%89%87%E7%94%9F%E6%88%90%E6%A8%A1%E5%9E%8B)
- [API Key](https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey?apikey=%7B%7D)

## 鉴权说明

- [调用教程](https://www.volcengine.com/docs/82379/1548482)
- [接口文档](https://www.volcengine.com/docs/82379/1666945)
- [常见问题](https://www.volcengine.com/docs/82379/1359411)
- [开通模型](https://console.volcengine.com/ark/region:ark+cn-beijing/openManagement?LLM=%7B%7D&OpenTokenDrawer=false)

