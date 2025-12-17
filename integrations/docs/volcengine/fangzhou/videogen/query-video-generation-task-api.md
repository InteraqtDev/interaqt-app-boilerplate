# 查询视频生成任务 API

**最近更新时间：2025.10.24 20:17:54**  
**首次发布时间：2025.04.10 20:43:38**

## 接口概述

```
GET https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/{id}
```

查询视频生成任务的状态。

> **说明**  
> 仅支持查询最近 7 天的历史数据。时间计算统一采用UTC时间戳，返回的7天历史数据范围以用户实际发起查询请求的时刻为基准（精确到秒），时间戳区间为 [T-7天, T)。

## 快速入口

### 体验中心
- [体验中心](https://console.volcengine.com/ark/region:ark+cn-beijing/experience/vision)
- [模型列表](https://www.volcengine.com/docs/82379/1330310)
- [模型计费](https://www.volcengine.com/docs/82379/1099320#%E8%A7%86%E9%A2%91%E7%94%9F%E6%88%90%E6%A8%A1%E5%9E%8B)
- [API Key](https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey?apikey=%7B%7D)

### 鉴权说明
- [调用教程](https://www.volcengine.com/docs/82379/1366799)
- [接口文档](https://www.volcengine.com/docs/82379/1521309)
- [常见问题](https://www.volcengine.com/docs/82379/1359411)
- [开通模型](https://console.volcengine.com/ark/region:ark+cn-beijing/openManagement?LLM=%7B%7D&OpenTokenDrawer=false)

## 请求参数

### Query String Parameters

| 参数名 | 类型 | 必选 | 说明 |
|--------|------|------|------|
| id | string | 是 | 您需要查询的视频生成任务的 ID |

> **说明**  
> 上面参数为Query String Parameters，在URL String中传入。

## 响应参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| id | string | 视频生成任务 ID |
| model | string | 任务使用的模型名称和版本，格式为：`模型名称-版本` |
| status | string | 任务状态，取值如下：<br/>• `queued`：排队中<br/>• `running`：任务运行中<br/>• `cancelled`：取消任务，取消状态24h自动删除（只支持排队中状态的任务被取消）<br/>• `succeeded`：任务成功<br/>• `failed`：任务失败 |
| error | object / null | 错误提示信息，任务成功返回 `"null"`，任务失败时返回错误数据，错误信息具体参见[错误处理](https://www.volcengine.com/docs/82379/1299023#%E6%96%B9%E8%88%9F%E9%94%99%E8%AF%AF%E7%A0%81) |
| error.code | string | 错误码 |
| error.message | string | 错误提示信息 |
| created_at | integer | 任务创建时间的 Unix 时间戳（秒） |
| updated_at | integer | 任务当前状态更新时间的 Unix 时间戳（秒） |
| content | object | 视频生成任务的输出内容 |
| content.video_url | string | 生成视频的 URL，格式为 mp4。为保障信息安全，生成的视频会在24小时后被清理，请及时转存 |
| content.last_frame_url | string | 视频的尾帧图像 URL。有效期为 24小时，请及时转存。<br/>**说明**：[创建视频生成任务](https://www.volcengine.com/docs/82379/1520757)时设置 `"return_last_frame": true` 时，会返回该参数 |
| seed | integer | 本次请求使用的种子整数值 |
| resolution | string | 生成视频的分辨率 |
| ratio | string | 生成视频的宽高比 |
| duration | integer | 生成视频的时长，单位：秒。<br/>**说明** 🆕：duration 和 frames 参数只会返回一个。[创建视频生成任务](https://www.volcengine.com/docs/82379/1520757)时未指定 frames，会返回 duration |
| frames | integer 🆕 | 生成视频的帧数。<br/>**说明**：duration 和 frames 参数只会返回一个。[创建视频生成任务](https://www.volcengine.com/docs/82379/1520757)时指定了 frames，会返回 frames |
| framespersecond | integer | 生成视频的帧率 |
| usage | object | 本次请求的 token 用量 |
| usage.completion_tokens | integer | 模型输出视频花费的 token 数量 |
| usage.total_tokens | integer | 本次请求消耗的总 token 数量。视频生成模型不统计输入 token，输入 token 为 0，故 total_tokens=completion_tokens |

## 示例代码

### 请求示例

```bash
curl -X GET https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/cgt-2025**** \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ARK_API_KEY"
```

### 响应示例

```json
{
  "id": "cgt-2025******-****",
  "model": "doubao-seedance-1-0-pro-250528",
  "status": "succeeded",
  "content": {
    "video_url": "https://ark-content-generation-cn-beijing.tos-cn-beijing.volces.com/doubao-seedance-1-0-pro/****"
  },
  "seed": 10,
  "resolution": "720p",
  "ratio": "16:9",
  "duration": 5,
  "framespersecond": 24,
  "usage": {
    "completion_tokens": 108900,
    "total_tokens": 108900
  },
  "created_at": 1743414619,
  "updated_at": 1743414673
}
```

## 相关文档

- 上一篇：[创建视频生成任务 API](https://www.volcengine.com/docs/82379/1520757)
- 下一篇：[查询视频生成任务列表](https://www.volcengine.com/docs/82379/1521675)

## 参考链接

- [API 在线调试](https://api.volcengine.com/api-explorer/?action=GetContentsGenerationsTask&data=%7B%22id%22%3A%22cgt-20250331175019-68d9t%22%7D&groupName=%E8%A7%86%E9%A2%91%E7%94%9F%E6%88%90API&query=%7B%7D&serviceCode=ark&version=2024-01-01)

