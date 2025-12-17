# 如何编写 deploy.{env}.json

## 概述

`deploy.{env}.json` 是**运维层配置**文件，定义了如何将应用部署到特定环境。与 `application.json` 不同，这个文件是环境相关的，提供了具体的部署配置和连接信息。

## 文件位置

```
project/
├── config/
│   ├── application.json      # 应用层配置（定义需求）
│   ├── deploy.dev.json        # 开发环境配置
│   ├── deploy.test.json       # 测试环境配置
│   └── deploy.prod.json       # 生产环境配置
```

## 配置结构

```json
{
  "provider": "local | volcengine | aws | aliyun",
  "environment": "dev | test | prod",
  "components": {
    "组件名称": {
      "deploymentType": "local | container",
      "replicas": 副本数,
      "host": "主机地址",
      "port": 端口号,
      "middlewareDependencies": { /* 中间件部署配置 */ },
      "externalServices": { /* 外部服务配置 */ },
      "applicationConfig": { /* 应用配置值 */ }
    }
  }
}
```

## 详细说明

### 1. 根级配置

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `provider` | string | ✅ | 云服务提供商：`local`、`volcengine`、`aws`、`aliyun` |
| `environment` | string | ✅ | 环境名称：`dev`、`test`、`prod` 或自定义 |
| `components` | object | ✅ | 组件部署配置，key 必须与 `application.json` 一致 |

**Provider 说明：**

| Provider | 说明 | 适用场景 |
|----------|------|---------|
| `local` | 本地 Docker Desktop Kubernetes | 开发环境 |
| `volcengine` | 火山引擎 VKE | 生产环境 |
| `aws` | AWS EKS | 生产环境 |
| `aliyun` | 阿里云 ACK | 生产环境 |

### 2. Component（组件）部署配置

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `deploymentType` | string | ✅ | 部署类型：`local` 或 `container` |
| `replicas` | number | ✅ | 副本数量（`local` 类型固定为 1） |
| `host` | string | ✅ | 主机地址 |
| `port` | number | ✅ | 端口号 |
| `middlewareDependencies` | object | ✅ | 中间件部署配置（可以为空对象 `{}`） |
| `externalServices` | object | ✅ | 外部服务配置（可以为空对象 `{}`） |
| `applicationConfig` | object | ✅ | 应用配置值（可以为空对象 `{}`） |

**DeploymentType 规则：**

- 当 `provider` 为 `local` 时：
  - 组件的 `deploymentType` 可以是 `local` 或 `container`
  - `local`: 应用在本地运行，不部署到 K8s
  - `container`: 应用部署到本地 K8s

- 当 `provider` 为云服务时（`volcengine`、`aws`、`aliyun`）：
  - 组件的 `deploymentType` 只能是 `container`

### 3. MiddlewareDependency（中间件）部署配置

```json
"middlewareDependencies": {
  "mainDb": {
    "deploymentType": "container",
    "use": "postgresql",
    "replicas": 1,
    "config": {
      "username": "pgadmin",
      "password": "pgadmin",
      "database": "litdb"
    }
  },
  "objectStorage": {
    "deploymentType": "cloud",
    "endpoint": "https://tos-cn-beijing.volces.com",
    "config": {
      "region": "cn-beijing",
      "bucket": "my-bucket",
      "accessKeyId": "AKIAIOSFODNN7EXAMPLE",
      "secretAccessKey": "wJalrXUt..."
    }
  }
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `deploymentType` | string | ✅ | `container`（部署到 K8s）或 `cloud`（使用云服务） |
| `use` | string | 条件必填 | 当 `deploymentType` 为 `container` 时必填，指定中间件软件 |
| `version` | string | ❌ | 具体使用的版本号（如 `7.0.15`、`5.4.5`），用于容器镜像标签 |
| `replicas` | number | ❌ | 副本数量（仅 `container` 类型） |
| `endpoint` | string | ❌ | **可选**：云服务端点。不配置时自动部署云服务并填充 endpoint |
| `dependencies` | string[] | ❌ | 依赖的其他中间件名称列表，用于表达中间件间的依赖关系 |
| `config` | object | ✅ | 中间件配置，必须包含 `application.json` 中的 `requiredFields` |

**部署类型对比：**

| 部署类型 | 使用场景 | 必填字段 | endpoint 来源 |
|---------|---------|---------|---------------|
| `container` | 开发/测试环境 | `use` | 自动生成 K8s DNS |
| `cloud` | 生产环境 | - | **自动部署**（无 endpoint）或**使用现有服务**（有 endpoint） |

**Cloud 类型的 endpoint 说明：**
- ✅ **不配置 endpoint**：deploy-tool 自动调用云平台 API 创建服务并获取 endpoint
- ✅ **配置 endpoint**：使用现有的云服务，跳过自动部署

详见：[云服务自动部署指南](./cloud-service-deployment.md)

**常见中间件的 use 值：**

| 中间件类型 | use 值 |
|-----------|-------|
| PostgreSQL | `postgresql` |
| MinIO | `minio` |
| Kafka | `kafka` |
| Redis | `redis` |
| Centrifugo | `centrifugo` |

**版本号说明：**

`application.json` 和 `deploy.{env}.json` 中的 `version` 字段含义不同：

| 配置文件 | version 含义 | 示例 | 用途 |
|---------|-------------|------|------|
| `application.json` | 版本要求（语义化版本范围） | `>=5.0.0`、`^7.0.0` | 声明应用兼容的版本范围 |
| `deploy.{env}.json` | 具体版本号 | `7.0.15`、`5.4.5` | 指定实际部署的版本（容器镜像标签） |

**示例：**

```json
// application.json - 声明版本要求
{
  "middlewareDependencies": {
    "redis": {
      "type": "redis",
      "version": ">=7.0.0"  // 要求 7.0 或更高版本
    }
  }
}

// deploy.dev.json - 指定具体版本
{
  "middlewareDependencies": {
    "redis": {
      "deploymentType": "container",
      "use": "redis",
      "version": "7.0.15",  // 实际使用 7.0.15 版本
      "config": { ... }
    }
  }
}
```

**最佳实践：**
- ✅ 开发环境使用稳定的具体版本（便于问题复现）
- ✅ 测试环境和生产环境版本保持一致
- ✅ 更新版本前先在开发/测试环境验证
- ✅ 记录版本更新的原因和测试结果

#### 中间件依赖与变量引用

**中间件间的依赖关系：**

有些中间件依赖于其他中间件才能正常工作。例如，Centrifugo 在多实例部署时需要 Redis 作为消息代理。可以使用 `dependencies` 字段表达这种依赖关系：

```json
"middlewareDependencies": {
  "redis": {
    "deploymentType": "container",
    "use": "redis",
    "replicas": 1,
    "config": {
      "password": "redis123456"
    }
  },
  "centrifugo": {
    "deploymentType": "container",
    "use": "centrifugo",
    "replicas": 1,
    "dependencies": ["redis"],  // 声明依赖于 redis
    "config": {
      "tokenHmacSecretKey": "your-secret-key",
      "engine": "redis",
      "redisAddress": "${ref:middleware.redis.endpoint}",
      "redisPassword": "${ref:middleware.redis.config.password}",
      "redisDb": "0"
    }
  }
}
```

**变量引用语法：**

在配置值中可以使用 `${ref:...}` 语法引用配置中的其他值。**引用路径从 JSON 根节点开始**，这样可以支持跨组件引用。

| 引用格式 | 说明 | 示例 |
|---------|------|------|
| `${ref:components.<component>.middlewareDependencies.<name>.endpoint}` | 引用中间件的 endpoint | `${ref:components.communication.middlewareDependencies.redis.endpoint}` |
| `${ref:components.<component>.middlewareDependencies.<name>.config.<field>}` | 引用中间件配置字段 | `${ref:components.communication.middlewareDependencies.redis.config.password}` |
| `${ref:components.<component>.host}` | 引用组件的 host | `${ref:components.main.host}` |
| `${ref:components.<component>.port}` | 引用组件的 port | `${ref:components.main.port}` |

**引用路径规则：**

1. **从根节点开始**：所有引用都从 `deploy.{env}.json` 的根节点开始
2. **使用点号分隔**：路径使用 `.` 分隔各个层级
3. **支持跨组件引用**：可以引用任何组件的任何配置值
4. **区分大小写**：路径中的所有名称都区分大小写

**注意事项：**

1. `dependencies` 数组中使用的是中间件的**名称**（如 `redis`），而不是类型
2. 引用语法在配置生成时(`generate-config.ts`)会被自动解析和替换
3. 支持跨组件引用，但要确保被引用的资源存在
4. 依赖的中间件会在被依赖的中间件之前部署
5. 支持多层嵌套引用（A引用B，B引用C）

**完整示例 - Centrifugo 依赖 Redis：**

```json
{
  "components": {
    "communication": {
      "deploymentType": "local",
      "replicas": 1,
      "host": "localhost",
      "port": 3001,
      "middlewareDependencies": {
        "redis": {
          "deploymentType": "container",
          "use": "redis",
          "replicas": 1,
          "config": {
            "password": "redis123456"
          }
        },
        "centrifugo": {
          "deploymentType": "container",
          "use": "centrifugo",
          "replicas": 1,
          "dependencies": ["redis"],
          "config": {
            "tokenHmacSecretKey": "your-centrifugo-secret-key",
            "engine": "redis",
            "redisAddress": "${ref:components.communication.middlewareDependencies.redis.endpoint}",
            "redisPassword": "${ref:components.communication.middlewareDependencies.redis.config.password}",
            "redisDb": "0",
            "allowedOrigins": ["http://localhost:3000"]
          }
        }
      },
      "externalServices": {},
      "applicationConfig": {}
    }
  }
}
```

**跨组件引用场景：**

引用语法从根节点开始的设计，使得可以实现跨组件引用，这在以下场景中非常有用：

1. **多个组件共享同一个中间件实例**：

```json
{
  "components": {
    "communication": {
      "middlewareDependencies": {
        "redis": {
          "deploymentType": "container",
          "use": "redis",
          "config": { "password": "redis123" }
        }
      }
    },
    "asyncTask": {
      "middlewareDependencies": {
        "sharedRedis": {
          "deploymentType": "container",
          "use": "redis",
          "config": {
            // 复用 communication 组件的 Redis 配置
            "endpoint": "${ref:components.communication.middlewareDependencies.redis.endpoint}",
            "password": "${ref:components.communication.middlewareDependencies.redis.config.password}"
          }
        }
      }
    }
  }
}
```

2. **组件间的服务发现**：

```json
{
  "components": {
    "main": {
      "host": "192.168.1.100",
      "port": 3000
    },
    "worker": {
      "applicationConfig": {
        "apiEndpoint": "http://${ref:components.main.host}:${ref:components.main.port}"
      }
    }
  }
}
```

**为什么从根节点开始？**

- ✅ 支持跨组件引用，不限制引用范围
- ✅ 路径清晰明确，不会产生歧义
- ✅ 配置更灵活，可以引用任何层级的值
- ✅ 便于配置复用，减少重复配置

### 4. ExternalService（外部服务）配置

```json
"externalServices": {
  "volcFangzhouImage": {
    "config": {
      "apiKey": "your-api-key",
      "baseUrl": "https://ark.cn-beijing.volces.com/api/v3/images/generations",
      "model": "doubao-seedream-4-0-250828"
    }
  },
  "volcTts": {
    "config": {}  // 空对象表示该服务未启用
  }
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `config` | object | ✅ | 外部服务配置，必须包含 `application.json` 中的 `requiredFields` |

**启用/禁用外部服务：**

- `config: { ... }` - 服务启用，必须提供所有必填字段
- `config: {}` - 服务禁用，不需要提供任何字段

### 5. ApplicationConfig（应用配置）

```json
"applicationConfig": {
  "jwt": {
    "secret": "your-secret-jwt-key-change-this-in-production",
    "userIdField": "username"
  },
  "rootUser": {
    "password": "admin123456"
  },
  "nodeEnv": "development"
}
```

**说明：**
- 必须包含 `application.json` 中定义的所有配置项及其必填字段
- 可以添加额外的配置项（不在 `application.json` 中定义的）

## 完整示例

### 开发环境配置 (deploy.dev.json)

```json
{
  "provider": "local",
  "environment": "dev",
  "components": {
    "main": {
      "deploymentType": "local",
      "replicas": 1,
      "host": "localhost",
      "port": 3000,
      "middlewareDependencies": {
        "mainDb": {
          "deploymentType": "container",
          "use": "postgresql",
          "replicas": 1,
          "config": {
            "username": "pgadmin",
            "password": "pgadmin",
            "database": "litdb"
          }
        },
        "objectStorage": {
          "deploymentType": "container",
          "use": "minio",
          "replicas": 1,
          "config": {
            "region": "cn-beijing",
            "bucket": "lit",
            "accessKeyId": "minioadmin",
            "secretAccessKey": "minioadmin"
          }
        },
        "messageQueue": {
          "deploymentType": "container",
          "use": "kafka",
          "replicas": 1,
          "config": {
            "instanceId": "local-kafka",
            "username": "",
            "password": "",
            "ssl": false
          }
        }
      },
      "externalServices": {
        "volcFangzhouImage": {
          "config": {
            "apiKey": "your-dev-api-key",
            "baseUrl": "https://ark.cn-beijing.volces.com/api/v3/images/generations",
            "model": "doubao-seedream-4-0-250828"
          }
        }
      },
      "applicationConfig": {
        "jwt": {
          "secret": "dev-secret-key",
          "userIdField": "username"
        },
        "rootUser": {
          "password": "admin123456"
        },
        "nodeEnv": "development"
      }
    },
    "communication": {
      "deploymentType": "local",
      "replicas": 1,
      "host": "localhost",
      "port": 3001,
      "middlewareDependencies": {},
      "externalServices": {},
      "applicationConfig": {}
    }
  }
}
```

### 生产环境配置 (deploy.prod.json)

```json
{
  "provider": "volcengine",
  "environment": "prod",
  "components": {
    "main": {
      "deploymentType": "container",
      "replicas": 3,
      "host": "192.168.233.128",
      "port": 3000,
      "middlewareDependencies": {
        "mainDb": {
          "deploymentType": "cloud",
          "endpoint": "pgm-xxx.postgres.rds.volcengineapi.com:5432",
          "config": {
            "username": "lituser",
            "password": "secure-password-change-me",
            "database": "litdb"
          }
        },
        "objectStorage": {
          "deploymentType": "cloud",
          "endpoint": "https://tos-cn-beijing.volces.com",
          "config": {
            "region": "cn-beijing",
            "bucket": "lit-prod",
            "accessKeyId": "AKIAIOSFODNN7EXAMPLE",
            "secretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
          }
        },
        "messageQueue": {
          "deploymentType": "cloud",
          "endpoint": "kafka-xxx.kafka.ivolces.com:9092",
          "config": {
            "instanceId": "kafka-prod-xxx",
            "username": "kafka-user",
            "password": "kafka-password",
            "ssl": true
          }
        }
      },
      "externalServices": {
        "volcFangzhouImage": {
          "config": {
            "apiKey": "your-prod-api-key",
            "baseUrl": "https://ark.cn-beijing.volces.com/api/v3/images/generations",
            "model": "doubao-seedream-4-0-250828"
          }
        }
      },
      "applicationConfig": {
        "jwt": {
          "secret": "prod-secret-key-very-secure-change-this",
          "userIdField": "username"
        },
        "rootUser": {
          "password": "prod-admin-password-very-secure"
        },
        "nodeEnv": "production"
      }
    },
    "communication": {
      "deploymentType": "container",
      "replicas": 2,
      "host": "192.168.233.129",
      "port": 3001,
      "middlewareDependencies": {},
      "externalServices": {},
      "applicationConfig": {}
    }
  }
}
```

## 编写步骤

### 第一步：确定基本信息

```json
{
  "provider": "local",        // 本地开发用 local，生产用云服务商
  "environment": "dev",       // 环境名称
  "components": {}
}
```

### 第二步：配置组件部署信息

```json
"components": {
  "main": {
    "deploymentType": "local",  // 开发环境可以用 local
    "replicas": 1,
    "host": "localhost",
    "port": 3000,
    "middlewareDependencies": {},
    "externalServices": {},
    "applicationConfig": {}
  }
}
```

### 第三步：配置中间件

根据环境选择部署方式：

**开发环境 - 使用容器化中间件：**

```json
"mainDb": {
  "deploymentType": "container",
  "use": "postgresql",
  "replicas": 1,
  "config": {
    "username": "pgadmin",
    "password": "pgadmin",
    "database": "litdb"
  }
}
```

**生产环境 - 自动部署云服务（推荐）：**

```json
"mainDb": {
  "deploymentType": "cloud",
  // 不配置 endpoint，自动部署 RDS PostgreSQL
  "config": {
    "username": "lituser",
    "password": "secure-password",
    "database": "litdb",
    // 可选：自定义云服务规格
    "cloudSpec": {
      "instanceType": "rds.postgres.s1.large",
      "storage": 200
    }
  }
}
```

**生产环境 - 使用现有云服务：**

```json
"mainDb": {
  "deploymentType": "cloud",
  "endpoint": "pgm-xxx.postgres.rds.volcengineapi.com:5432",
  // 有 endpoint，使用现有服务
  "config": {
    "username": "lituser",
    "password": "secure-password",
    "database": "litdb"
  }
}
```

### 第四步：配置外部服务

```json
"externalServices": {
  "volcFangzhouImage": {
    "config": {
      "apiKey": "your-api-key",
      "baseUrl": "https://...",
      "model": "model-name"
    }
  }
}
```

### 第五步：配置应用参数

```json
"applicationConfig": {
  "jwt": {
    "secret": "your-jwt-secret",
    "userIdField": "username"
  },
  "rootUser": {
    "password": "admin-password"
  }
}
```

### 第六步：验证配置

运行配置生成命令验证：

```bash
cd config
node generate-config.ts --env dev
```

如果有错误，会显示详细的错误信息。

## 配置验证规则

`generate-config.ts` 会进行以下验证：

### 1. 组件完整性验证

✅ `deploy.{env}.json` 中的组件必须与 `application.json` 一致

```
❌ Component 'main' 在 deploy.dev.json 中不存在
```

### 2. 必填字段验证

✅ 所有 `requiredFields` 必须在 `config` 中提供

```
❌ Middleware 'mainDb' 缺少必填字段: password
❌ External service 'volcTts' 缺少必填字段: apiKey
```

### 3. 部署类型验证

✅ `deploymentType` 必须符合 `provider` 的限制

```
❌ 当 provider 为 'local' 时，component 'main' 的 deploymentType 
   只能是 'local' 或 'container'，当前为 'cloud'
```

### 4. Container 类型验证

✅ Container 类型中间件必须指定 `use` 字段

```
❌ Middleware 'mainDb' 的 deploymentType 为 'container'，必须指定 'use' 字段
```

### 5. Cloud 类型验证

✅ Cloud 类型中间件的 `endpoint` 字段可选
- 无 endpoint：自动部署云服务
- 有 endpoint：使用现有云服务

如果 provider 不支持该中间件的云服务自动部署，会提示错误：

```
❌ Provider volcengine 不支持 clickhouse 的云服务自动部署
   请手动配置 endpoint 或使用 container 部署类型
```

## Endpoint 管理

`endpoint` 字段会由 deploy-tool 自动填写：

### Container 类型中间件

自动生成 Kubernetes 内部 DNS：

```
<service-name>.<namespace>.svc.cluster.local:<port>
```

例如：
```
postgresql-maindb.default.svc.cluster.local:5432
minio-objectstorage.default.svc.cluster.local:9000
```

### Cloud 类型中间件

**自动部署时**：由云平台分配 endpoint

```json
{
  "deploymentType": "cloud",
  // 无 endpoint，自动部署
  "config": { ... }
}
// 部署后自动填充：
// "endpoint": "postgres-lit-prod-maindb.rds.cn-beijing.volces.com:5432"
```

**使用现有服务时**：使用配置中的 `endpoint`

```json
{
  "deploymentType": "cloud",
  "endpoint": "https://tos-cn-beijing.volces.com",
  "config": { ... }
}
```

### Local 类型组件

自动生成为：

```
host.docker.internal:<port>
```

### Container 类型组件

自动生成 Kubernetes 内部 DNS：

```
<service-name>.<namespace>.svc.cluster.local:<port>
```

## 最佳实践

### 1. 环境分离

```
开发环境 (dev):
  - Provider: local
  - 中间件: container
  - 副本数: 1
  - 弱密码可接受

测试环境 (test):
  - Provider: volcengine/aws/aliyun
  - 中间件: container 或 cloud
  - 副本数: 1-2
  - 中等强度密码

生产环境 (prod):
  - Provider: volcengine/aws/aliyun
  - 中间件: cloud（推荐）
  - 副本数: 3+
  - 强密码，定期轮换
```

### 2. 安全配置

**❌ 不要在配置文件中使用明文密码（生产环境）：**

```json
// 不好的做法 - 明文密码
"config": {
  "password": "admin123"
}
```

**✅ 生产环境应该使用密钥管理服务：**

```json
// 推荐做法 - 引用密钥管理服务
// 注意：当前版本不支持，未来版本会支持
"config": {
  "password": "${secrets.db.password}"
}
```

**当前版本建议：**
- 不要将生产环境配置提交到版本控制
- 使用 `.gitignore` 排除 `deploy.prod.json`
- 在部署时从安全位置读取配置

### 3. 副本数配置

```json
// 开发环境
"replicas": 1

// 测试环境
"replicas": 2

// 生产环境 - 根据负载调整
"replicas": 3  // 或更多
```

### 4. Host 配置

```json
// 开发环境
"host": "localhost"

// 容器化部署
"host": "0.0.0.0"  // 监听所有接口

// 生产环境
"host": "192.168.x.x"  // 具体 IP
```

### 5. 渐进式配置

从最简单的配置开始，逐步添加复杂性：

```json
// 阶段 1: 最小配置
{
  "provider": "local",
  "environment": "dev",
  "components": {
    "main": {
      "deploymentType": "local",
      "replicas": 1,
      "host": "localhost",
      "port": 3000,
      "middlewareDependencies": {},
      "externalServices": {},
      "applicationConfig": {}
    }
  }
}

// 阶段 2: 添加数据库
// ... 添加 mainDb

// 阶段 3: 添加对象存储
// ... 添加 objectStorage

// 阶段 4: 添加消息队列
// ... 添加 messageQueue
```

## 常见配置场景

### 场景 1: 纯本地开发

```json
{
  "provider": "local",
  "environment": "dev",
  "components": {
    "main": {
      "deploymentType": "local",  // 应用本地运行
      "replicas": 1,
      "host": "localhost",
      "port": 3000,
      "middlewareDependencies": {
        "mainDb": {
          "deploymentType": "container",  // 数据库容器化
          "use": "postgresql",
          // ...
        }
      }
    }
  }
}
```

### 场景 2: 全容器化开发

```json
{
  "provider": "local",
  "environment": "dev",
  "components": {
    "main": {
      "deploymentType": "container",  // 应用也容器化
      "replicas": 1,
      "host": "0.0.0.0",
      "port": 3000,
      "middlewareDependencies": {
        "mainDb": {
          "deploymentType": "container",
          "use": "postgresql",
          // ...
        }
      }
    }
  }
}
```

### 场景 3: 混合部署（推荐生产环境）

```json
{
  "provider": "volcengine",
  "environment": "prod",
  "components": {
    "main": {
      "deploymentType": "container",  // 应用容器化
      "replicas": 3,
      "host": "0.0.0.0",
      "port": 3000,
      "middlewareDependencies": {
        "mainDb": {
          "deploymentType": "cloud",  // 数据库使用云服务
          "endpoint": "pgm-xxx.postgres.rds.volcengineapi.com:5432",
          // ...
        },
        "objectStorage": {
          "deploymentType": "cloud",  // 对象存储使用云服务
          "endpoint": "https://tos-cn-beijing.volces.com",
          // ...
        }
      }
    }
  }
}
```

### 场景 4: 完全云原生

```json
{
  "provider": "volcengine",
  "environment": "prod",
  "components": {
    "main": {
      "deploymentType": "container",
      "replicas": 5,
      "host": "0.0.0.0",
      "port": 3000,
      "middlewareDependencies": {
        "mainDb": {
          "deploymentType": "cloud",
          "endpoint": "pgm-xxx...",
          // 使用云 RDS
        },
        "objectStorage": {
          "deploymentType": "cloud",
          "endpoint": "https://tos...",
          // 使用云对象存储
        },
        "messageQueue": {
          "deploymentType": "cloud",
          "endpoint": "kafka-xxx...",
          // 使用云 Kafka
        }
      }
    }
  }
}
```

## 常见问题

### Q1: dev、test、prod 配置应该如何区分？

| 环境 | Provider | 中间件 | 副本数 | 配置强度 |
|------|----------|--------|--------|----------|
| dev | local | container | 1 | 弱（方便开发） |
| test | local/cloud | container/cloud | 1-2 | 中等 |
| prod | cloud | cloud | 3+ | 强（安全为主） |

### Q2: 什么时候用 container，什么时候用 cloud？

**使用 container：**
- ✅ 开发环境
- ✅ 测试环境
- ✅ 成本敏感的场景
- ✅ 需要完全控制的场景

**使用 cloud：**
- ✅ 生产环境（推荐）
- ✅ 需要高可用性
- ✅ 需要自动备份
- ✅ 需要托管运维

### Q3: 如何处理敏感信息？

**当前版本：**
1. 不要提交 `deploy.prod.json` 到版本控制
2. 在 `.gitignore` 中添加：
   ```
   config/deploy.prod.json
   config/deploy.*.local.json
   ```
3. 在部署脚本中从安全位置读取配置

**未来版本：**
- 支持引用环境变量：`${ENV_VAR}`
- 支持引用密钥管理服务：`${secrets.path.to.secret}`

### Q4: endpoint 字段什么时候需要手动配置？

**需要手动配置：**
- ✅ Cloud 类型的中间件，且想使用**已有的云服务**时

**不需要手动配置：**
- ❌ Cloud 类型的中间件，想**自动部署云服务**时
- ❌ Container 类型的中间件（自动生成 K8s DNS）
- ❌ Local 类型的组件（自动生成 host.docker.internal）

**Cloud 类型配置规则：**
```json
// 选项 1：自动部署云服务（推荐）
{
  "deploymentType": "cloud",
  // 无 endpoint
  "config": { ... }
}

// 选项 2：使用现有云服务
{
  "deploymentType": "cloud",
  "endpoint": "existing-service.cloud.com:5432",
  "config": { ... }
}
```

### Q5: 多个组件如何共享中间件？

每个组件都需要独立配置中间件依赖：

```json
{
  "components": {
    "main": {
      "middlewareDependencies": {
        "mainDb": { /* 配置 */ }
      }
    },
    "worker": {
      "middlewareDependencies": {
        "mainDb": { /* 相同的配置 */ }
      }
    }
  }
}
```

### Q6: 如何验证配置是否正确？

```bash
# 生成配置并验证
cd config
node generate-config.ts --env dev

# 查看生成的配置
cat ../app.config.json

# 使用 deploy-tool 验证
cd ../deploy-tool
npm run plan
```

## 相关文档

- [如何编写 application.json](./how-to-write-application-json.md) - 应用层配置指南
- [云服务提供商配置指南](./cloud-provider-configuration.md) - 云服务详细配置
- [文档中心](./README.md) - 所有文档索引

## TypeScript 类型定义

参考 `config/types.ts`：

```typescript
interface DeploymentConfig {
  provider: 'local' | 'aliyun' | 'aws' | 'volcengine';
  environment: string;
  components: {
    [componentName: string]: DeploymentComponent;
  };
}

interface DeploymentComponent {
  deploymentType: 'local' | 'container';
  replicas: number;
  host: string;
  port: number;
  middlewareDependencies: {
    [dependencyName: string]: DeployedMiddleware;
  };
  externalServices: {
    [serviceName: string]: DeployedExternalService;
  };
  applicationConfig: {
    [configName: string]: any;
  };
}
```

---

**文档版本**: v1.0.0  
**最后更新**: 2025-11-22

