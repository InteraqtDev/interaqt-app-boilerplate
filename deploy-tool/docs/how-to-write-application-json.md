# 如何编写 application.json

## 概述

`application.json` 是**应用层配置**文件，定义了应用的组件结构、依赖需求和必填字段。这个文件与部署环境无关，描述的是应用本身需要什么，而不关心这些需求如何被满足。

## 文件位置

```
project/
├── config/
│   └── application.json    # 应用层配置（你要编写的）
```

## 配置结构

```json
{
  "version": "1.0.0",
  "components": {
    "组件名称": {
      "name": "组件显示名称",
      "port": 端口号,
      "middlewareDependencies": { /* 中间件依赖 */ },
      "externalServices": { /* 外部服务 */ },
      "applicationConfig": { /* 应用配置 */ }
    }
  }
}
```

## 详细说明

### 1. 根级配置

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `version` | string | ✅ | 配置文件版本号，如 `"1.0.0"` |
| `components` | object | ✅ | 组件配置对象，key 为组件名称 |

### 2. Component（组件）配置

每个组件包含以下字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 组件的显示名称，用于日志和文档 |
| `port` | number | ✅ | 组件默认端口号 |
| `middlewareDependencies` | object | ✅ | 中间件依赖配置（可以为空对象 `{}`） |
| `externalServices` | object | ✅ | 外部服务配置（可以为空对象 `{}`） |
| `applicationConfig` | object | ✅ | 应用级配置（可以为空对象 `{}`） |

### 3. MiddwareDependency（中间件依赖）配置

定义组件依赖的中间件及其必填字段：

```json
"middlewareDependencies": {
  "mainDb": {
    "type": "postgresql",
    "version": ">=14.0.0",
    "publicAccess": false,
    "requiredFields": ["username", "password", "database"]
  },
  "objectStorage": {
    "type": "minio",
    "version": "RELEASE.2024-11-07T00-52-20Z",
    "publicAccess": true,
    "requiredFields": ["region", "bucket", "accessKeyId", "secretAccessKey"]
  }
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | ✅ | 中间件类型，如 `postgresql`、`minio`、`kafka` |
| `version` | string | ❌ | 版本要求，支持语义化版本范围 |
| `publicAccess` | boolean | ✅ | 是否需要公网访问 |
| `requiredFields` | string[] | ✅ | 必填配置字段列表 |

**常见中间件类型及其必填字段：**

| 中间件类型 | 常见必填字段 |
|-----------|-------------|
| `postgresql` | `username`, `password`, `database` |
| `minio` | `region`, `bucket`, `accessKeyId`, `secretAccessKey` |
| `kafka` | `instanceId` |
| `redis` | `password` |
| `centrifugo` | `tokenHmacSecretKey` |

### 4. ExternalService（外部服务）配置

定义组件使用的外部服务及其必填字段：

```json
"externalServices": {
  "volcFangzhouImage": {
    "provider": "volcengine",
    "service": "fangzhou-image-gen",
    "requiredFields": ["apiKey", "baseUrl", "model"]
  },
  "volcTts": {
    "provider": "volcengine",
    "service": "tts",
    "requiredFields": [
      "appId",
      "accessToken",
      "secretKey",
      "resourceId",
      "speaker",
      "apiEndpoint"
    ]
  }
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `provider` | string | ✅ | 服务提供商，如 `volcengine`、`aws`、`aliyun` |
| `service` | string | ✅ | 服务类型标识 |
| `requiredFields` | string[] | ✅ | 必填配置字段列表 |

### 5. ApplicationConfig（应用配置）

定义应用自身需要的配置项：

```json
"applicationConfig": {
  "jwt": {
    "requiredFields": ["secret", "userIdField"]
  },
  "rootUser": {
    "requiredFields": ["password"]
  }
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `requiredFields` | string[] | ✅ | 该配置项的必填字段列表 |

## 完整示例

```json
{
  "version": "1.0.0",
  "components": {
    "main": {
      "name": "业务逻辑组件",
      "port": 3000,
      "middlewareDependencies": {
        "mainDb": {
          "type": "postgresql",
          "version": ">=14.0.0",
          "publicAccess": false,
          "requiredFields": ["username", "password", "database"]
        },
        "objectStorage": {
          "type": "minio",
          "version": "RELEASE.2024-11-07T00-52-20Z",
          "publicAccess": true,
          "requiredFields": [
            "region",
            "bucket",
            "accessKeyId",
            "secretAccessKey"
          ]
        },
        "messageQueue": {
          "type": "kafka",
          "version": ">=2.8.0",
          "publicAccess": false,
          "requiredFields": ["instanceId"]
        }
      },
      "externalServices": {
        "volcFangzhouImage": {
          "provider": "volcengine",
          "service": "fangzhou-image-gen",
          "requiredFields": ["apiKey", "baseUrl", "model"]
        },
        "volcTts": {
          "provider": "volcengine",
          "service": "tts",
          "requiredFields": [
            "appId",
            "accessToken",
            "secretKey",
            "resourceId",
            "speaker",
            "apiEndpoint"
          ]
        }
      },
      "applicationConfig": {
        "jwt": {
          "requiredFields": ["secret", "userIdField"]
        },
        "rootUser": {
          "requiredFields": ["password"]
        }
      }
    },
    "communication": {
      "name": "通信组件",
      "port": 3001,
      "middlewareDependencies": {
        "centrifugo": {
          "type": "centrifugo",
          "version": ">=5.0.0",
          "publicAccess": true,
          "requiredFields": ["tokenHmacSecretKey"]
        }
      },
      "externalServices": {},
      "applicationConfig": {}
    },
    "asyncTask": {
      "name": "长任务容器组件",
      "port": 3002,
      "middlewareDependencies": {},
      "externalServices": {},
      "applicationConfig": {}
    }
  }
}
```

## 编写步骤

### 第一步：定义组件

首先列出应用包含的所有组件：

```json
{
  "version": "1.0.0",
  "components": {
    "main": {
      "name": "主应用",
      "port": 3000,
      "middlewareDependencies": {},
      "externalServices": {},
      "applicationConfig": {}
    }
  }
}
```

### 第二步：添加中间件依赖

根据组件的实际需求，添加中间件依赖：

```json
"middlewareDependencies": {
  "mainDb": {
    "type": "postgresql",
    "version": ">=14.0.0",
    "publicAccess": false,
    "requiredFields": ["username", "password", "database"]
  }
}
```

**关键问题：**
- 这个组件需要哪些中间件？（数据库、对象存储、消息队列等）
- 每个中间件需要哪些必填字段？
- 是否需要公网访问？

### 第三步：添加外部服务

如果组件使用了外部 API 服务：

```json
"externalServices": {
  "imageGenService": {
    "provider": "volcengine",
    "service": "image-gen",
    "requiredFields": ["apiKey", "baseUrl"]
  }
}
```

**关键问题：**
- 需要调用哪些外部 API？
- 这些 API 需要哪些认证信息和配置？

### 第四步：添加应用配置

定义应用自身的配置需求：

```json
"applicationConfig": {
  "jwt": {
    "requiredFields": ["secret", "userIdField"]
  },
  "rootUser": {
    "requiredFields": ["password"]
  }
}
```

## 配置验证

`generate-config.ts` 会验证以下内容：

1. ✅ `deploy.{env}.json` 中是否包含所有定义的组件
2. ✅ 每个组件是否提供了所有必填字段
3. ✅ 中间件配置是否完整
4. ✅ 外部服务配置是否完整
5. ✅ 应用配置是否完整

如果验证失败，会得到详细的错误信息：

```
❌ 配置验证失败，发现以下错误：

📦 Component: main
   - Middleware 'mainDb' 缺少必填字段: password
   - External service 'volcTts' 缺少必填字段: apiKey

共 2 个错误
```

## 最佳实践

### 1. 合理组织组件

```json
{
  "components": {
    "main": {
      "name": "主业务逻辑",
      "port": 3000,
      /* 包含核心业务逻辑的中间件依赖 */
    },
    "worker": {
      "name": "后台任务处理",
      "port": 3001,
      /* 包含异步任务相关的中间件依赖 */
    },
    "api": {
      "name": "API 网关",
      "port": 3002,
      /* 可能不需要直接的中间件依赖 */
    }
  }
}
```

### 2. 明确必填字段

只把真正必须的字段列为 `requiredFields`：

```json
// ✅ 好的做法
"requiredFields": ["username", "password", "database"]

// ❌ 不好的做法 - 包含了可选字段
"requiredFields": [
  "username",
  "password",
  "database",
  "maxConnections",  // 应该是可选的
  "timeout"           // 应该是可选的
]
```

### 3. 使用语义化版本

```json
// ✅ 推荐
"version": ">=14.0.0"
"version": "^2.8.0"

// ✅ 可接受
"version": "RELEASE.2024-11-07T00-52-20Z"

// ❌ 不推荐
"version": "latest"
```

### 4. 合理设置 publicAccess

```json
// 数据库一般不需要公网访问
"mainDb": {
  "type": "postgresql",
  "publicAccess": false
}

// 对象存储可能需要公网访问（如果有 CDN 或客户端直传）
"objectStorage": {
  "type": "minio",
  "publicAccess": true
}
```

### 5. 对不使用的部分使用空对象

```json
"communication": {
  "name": "通信组件",
  "port": 3001,
  "middlewareDependencies": {},  // 不依赖中间件
  "externalServices": {},         // 不使用外部服务
  "applicationConfig": {}         // 不需要额外配置
}
```

## 常见问题

### Q1: 如何添加新的中间件类型？

在 `middlewareDependencies` 中添加新条目：

```json
"middlewareDependencies": {
  "cache": {
    "type": "redis",
    "version": ">=6.0.0",
    "publicAccess": false,
    "requiredFields": ["password"]
  }
}
```

### Q2: 如果某个配置字段是可选的怎么办？

**不要**把可选字段添加到 `requiredFields`，可选字段应该在 `deploy.{env}.json` 中按需提供。

### Q3: 外部服务和中间件的区别是什么？

- **中间件**：基础设施组件，可以部署为容器或使用云服务（PostgreSQL、MinIO、Kafka）
- **外部服务**：第三方 API 服务，通常只有配置信息（火山引擎 API、AWS API）

### Q4: 如何处理多环境差异？

`application.json` **不应该**包含环境特定的配置。所有环境差异都应该在 `deploy.{env}.json` 中处理：

- ✅ 在 `application.json` 中定义需求
- ✅ 在 `deploy.dev.json` 中提供开发环境的值
- ✅ 在 `deploy.prod.json` 中提供生产环境的值

### Q5: 可以在 application.json 中使用环境变量吗？

**不可以**。`application.json` 是纯 JSON 文件，不支持环境变量。环境相关的值应该在 `deploy.{env}.json` 中配置。

## 相关文档

- [如何编写 deploy.{env}.json](./how-to-write-deploy-json.md) - 运维层配置指南
- [云服务提供商配置指南](./cloud-provider-configuration.md) - 云服务配置详解
- [文档中心](./README.md) - 所有文档索引

## TypeScript 类型定义

如果需要类型提示，可以参考 `config/types.ts` 中的类型定义：

```typescript
interface ApplicationConfig {
  version: string;
  components: {
    [componentName: string]: ApplicationComponent;
  };
}

interface ApplicationComponent {
  name: string;
  port: number;
  middlewareDependencies: {
    [dependencyName: string]: MiddlewareDependency;
  };
  externalServices: {
    [serviceName: string]: ExternalService;
  };
  applicationConfig: {
    [configName: string]: ConfigRequirement;
  };
}
```

---

## 云服务自动部署

从 v1.0 开始，deploy-tool 支持**云服务自动部署**。

### 重要变化

**旧方式（v0.x）**：
- Cloud 类型的中间件必须手动配置 endpoint
- 需要先在云平台创建服务，再配置到 `deploy.{env}.json`

**新方式（v1.0+）**：
- ✅ Cloud 类型的中间件 endpoint **可选**
- ✅ 不配置 endpoint 时，deploy-tool **自动创建云服务**
- ✅ 自动获取 endpoint 并填充到配置

### 使用示例

在 `deploy.{env}.json` 中：

```json
{
  "provider": "volcengine",
  "components": {
    "main": {
      "middlewareDependencies": {
        "mainDb": {
          "deploymentType": "cloud",
          // 不需要配置 endpoint，会自动部署 RDS
          "config": {
            "username": "user",
            "password": "pass",
            "database": "litdb"
          }
        }
      }
    }
  }
}
```

### 支持的云服务

- **火山引擎**：PostgreSQL, MySQL, Redis, Kafka, TOS, MongoDB, Elasticsearch
- **AWS**：RDS, ElastiCache, MSK, S3, DocumentDB, OpenSearch
- **阿里云**：RDS, Redis, Kafka, OSS, MongoDB, Elasticsearch

### 详细文档

完整使用方法和配置选项，请参考：
- [云服务自动部署指南](./cloud-service-deployment.md)

---

**文档版本**: v1.0.0  
**最后更新**: 2025-11-23

