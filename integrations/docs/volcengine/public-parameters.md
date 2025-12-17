# Base URL及鉴权

**最近更新时间：2025.09.08 21:07:58**  
**首次发布时间：2024.07.10 15:12:25**

火山方舟API分为模型调用的API（数据面 API），及管理推理接入点等管控相关的管控面 API。他们支持的鉴权方式有所不同，下面介绍方舟API的鉴权方式。

## 概念解释

- **数据面 API**：是直接面向**业务数据传输、实时交互、用户请求处理**的接口，聚焦于 "实际业务数据的流转与处理"，是系统对外提供核心服务能力的载体。请求大模型服务的 Chat API、Responses API 均为数据面 API。

- **管控面 API**：面向**系统资源管理、配置控制、状态监控**的接口，聚焦于 "对数据面及系统资源的管理与调度"，是保障系统稳定运行的 "控制中枢"。方舟的管理API Key、管理基础模型等均数据管控面 API。

- **Base URL**：是构建完整 API 请求 URL 的 "基础模板"，包含**协议（如 http/https）、host（主机域名或 IP）、端口（可选）和基础路径（可选）**，是所有具体接口路径的 "公共前缀"。你可以根据Base URL 加接口/版本等参数拼接出完整接口 URL ，典型结构：`[协议]://[host]/[基础路径（可选）]`

## Base URL

方舟不同的接口使用的 Base URL 有所不同。

**数据面 API：**

- 模型调用：`https://ark.cn-beijing.volces.com/api/v3/`
- 应用调用：`https://ark.cn-beijing.volces.com/api/v3/bots/`

**管控面 API：**`https://ark.cn-beijing.volcengineapi.com/`

## 数据面 API 鉴权

支持两种鉴权方式，API Key 鉴权（简单方便），与 Access Key 鉴权（传统云上资源权限管控，可以分资源组云产品等维度管理，面向企业精细化管理）。

### API Key 签名鉴权

#### 前提条件

- [获取 API Key](https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey)
  - 使用 Access Key 鉴权请参考 [Access Key 签名鉴权](#access-key-签名鉴权)
- [开通模型服务](https://console.volcengine.com/ark/region:ark+cn-beijing/openManagement?LLM=%7B%7D&OpenTokenDrawer=false)
- 在[模型列表](https://www.volcengine.com/docs/82379/1330310)获取所需 Model ID
  - 通过 Endpoint ID 调用模型服务请参考[获取 Endpoint ID（创建自定义推理接入点）](https://www.volcengine.com/docs/82379/1099522)

#### 签名构造

API Key 签名鉴权方式要求在 HTTP 请求 header 中按如下方式添加 `Authorization` header:

```bash
Authorization: Bearer <ARK_API_KEY>
```

#### API 调用示例

```shell
curl https://ark.cn-beijing.volces.com/api/v3/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ARK_API_KEY>" \
  -d '{
    "model": "<Model ID>",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user",
        "content": "Hello!"
      }
    ]
  }'
```

### Access Key 签名鉴权

#### 前提条件

您已获取到Access Key。如需创建/查看Access Key，请参见[API访问密钥管理](https://www.volcengine.com/docs/6257/64983)。

> 由于主账号的Access Key拥有较大权限，建议您创建IAM用户并授予方舟等权限，然后使用IAM用户的Access Key来进行操作，具体请参见[使用IAM进行访问控制教程](https://www.volcengine.com/docs/82379/1263493)。

#### 方法：使用SDK（简单，推荐）

使用方舟提供的SDK，可直接使用 Access Key 进行鉴权，无需自行实现签名。具体请参见[使用Access Key鉴权](https://www.volcengine.com/docs/82379/1544136#fa44b913)。

> 通过Access Key 鉴权，只支持通过Endpoint ID调用，不支持通过Model ID 调用，即请求体中 `model` 字段需要配置为[Endpoint ID](https://www.volcengine.com/docs/82379/1099522#%E8%8E%B7%E5%8F%96-endpoint-id)。

#### 方法：自行实现签名（实现成本高，不推荐）

您可以使用下面方式来间接完成 Access Key 签名鉴权。

- 获取临时 API Key：使用 Access Key 调用[GetApiKey - 获取临时API Key](https://www.volcengine.com/docs/82379/1262825)接口，获取指定资源（推理接入点/应用）的临时 API Key。
- 使用临时 API Key，来鉴权模型/应用调用，方式同上，见[API Key 签名鉴权](#api-key-签名鉴权)。

## 管控面 API 鉴权

管控面的API，如管理API Key、管理推理接入点等接口。

### Access Key 签名鉴权

#### 前提条件

您已获取到Access Key。如需创建/查看Access Key，请参见[API访问密钥管理](https://www.volcengine.com/docs/6257/64983)。

> 由于主账号的Access Key拥有较大权限，建议您创建IAM用户并授予方舟等权限，然后使用IAM用户的Access Key来进行操作，具体请参见[使用IAM进行访问控制教程](https://www.volcengine.com/docs/82379/1263493)。

#### 方法：使用SDK（简单，推荐）

请参见[SDK 接入指南](https://api.volcengine.com/api-sdk/view?serviceCode=ark&version=2024-01-01&language=Java)。

#### 方法：自行实现签名（实现成本高，不推荐）

- 使用 Access Key 构造签名。具体方法请参见[签名方法](https://www.volcengine.com/docs/6369/67269)。

> 签名用到的方舟相关字段信息：

> - Service：`ark`
> - Region：`cn-beijing`

- 使用cURL发起请求，请求示例如下：

```shell
curl -X POST \
  'https://ark.cn-beijing.volcengineapi.com/?Action=ListEndpoints&Version=2024-01-01' \
  -H 'Authorization: HMAC-SHA256 Credential=AKL**/20240710/cn-beijing/ark/request, SignedHeaders=host;x-content-sha256;x-date, Signature=a7a****' \
  -H 'Content-Type: application/json' \
  -H 'Host: ark.cn-beijing.volcengineapi.com' \
  -H 'X-Content-Sha256: 44***' \
  -H 'X-Date: 20240710T042925Z' \
  -d '{}'
```
