# Endpoint 生成机制

## 概述

`deploy-tool` 在部署过程中自动生成和填写 middleware 和 component 的 endpoint。这个过程由 `EndpointManager` 和 `Provider` 协同完成，确保不同部署环境（本地/云）下的服务能够正确互相访问。

**v2.0 更新：多 Endpoint 支持**

从 v2.0 开始，deploy-tool 支持单个 middleware 暴露多个 endpoint。例如 Temporal 同时暴露：
- `main` (gRPC 7233) - SDK 连接端口
- `admin` (HTTP 8080) - Web UI 端口

每个 endpoint 可以单独配置 `publicAccess`，决定是否需要公网访问。

## 核心概念

### EndpointDefinition

每个 endpoint 包含以下属性：

```typescript
interface EndpointDefinition {
  port: number;           // 端口号
  protocol: string;       // 协议 (http, grpc, postgresql, redis, etc.)
  publicAccess: boolean;  // 是否需要公网访问
  description?: string;   // 可选描述
  value?: string;         // 填充后的实际地址
}
```

### Middleware 的 endpoints 结构

```json
{
  "temporal": {
    "type": "temporal",
    "endpoints": {
      "main": {
        "port": 7233,
        "protocol": "grpc",
        "publicAccess": false,
        "description": "gRPC service for Temporal SDK"
      },
      "admin": {
        "port": 8080,
        "protocol": "http",
        "publicAccess": true,
        "description": "Temporal Web UI"
      }
    }
  }
}
```

## 核心流程

### 1. 配置加载（Stage 1）

从 `config/deploy.{env}.json` 加载配置：
- **Cloud 类型的 middleware**：endpoints 可选
  - 有 endpoints：使用现有云服务
  - 无 endpoints：自动部署云服务
- **Container 类型的 middleware**：endpoints 可以为空，将自动生成
- **Component**：endpoint 可以为空，将自动生成

### 2. 云服务自动部署（Stage 2）

`Deployer.deployCloudServices()` 检测并自动部署云服务：
- 扫描所有 cloud 类型的 middleware
- 如果没有 endpoint，自动调用云平台 API 创建服务
- 等待服务就绪并获取 endpoint
- 将 endpoint 填充到配置中

详见：[云服务自动部署指南](./cloud-service-deployment.md)

### 3. Cloud Endpoint 验证（Stage 3）

`EndpointManager.validateCloudEndpoints()` 验证所有 cloud 类型的 middleware 是否已配置 endpoints：
- ✅ 已配置或已自动部署：通过验证
- ❌ 未配置且无法自动部署：抛出错误

### 4. 自动填写 Endpoint（Stage 4）

`EndpointManager.fillAllEndpoints()` 调用 Provider 为所有 container 类型的资源生成 endpoints：

#### Middleware Endpoint 生成规则

对于每个 endpoint，生成的 Service 名称规则：
- `main` endpoint: `{middlewareName}-svc`
- 其他 endpoint: `{middlewareName}-{endpointName}-svc`

| 部署类型 | Provider | Endpoint 来源 | 示例 |
|---------|----------|--------------|------|
| cloud | 任意 | 自动部署或使用配置 | `postgres.rds.cn-beijing.volces.com:5432` |
| container | local | `{protocol}://{service}-svc.{ns}.svc.cluster.local:{port}` | `grpc://temporal-svc.lit-dev.svc.cluster.local:7233` |
| container | 云环境 | 同上 | `http://temporal-admin-svc.lit-dev.svc.cluster.local:8080` |

### 5. Terraform 生成和部署（Stage 5-6）

使用生成的 endpoint 创建 Kubernetes 资源：
- **Deployment**：运行应用容器（暴露所有端口）
- **Service（每个 endpoint 一个）**：
  - `main` endpoint → `{name}-svc`
  - 其他 endpoint → `{name}-{endpointName}-svc`
  - ServiceType 根据 `publicAccess` 决定：
    - Local 环境：统一使用 `NodePort`
    - 云环境：`publicAccess=true` → `LoadBalancer`，否则 `ClusterIP`

### 6. Port Forward 设置（仅 Local 环境）

部署完成后，自动为所有 endpoint 执行 `kubectl port-forward`：

```bash
# Temporal 的两个 endpoint
kubectl port-forward -n lit-dev svc/temporal-svc 7233:7233        # main
kubectl port-forward -n lit-dev svc/temporal-admin-svc 8080:8080  # admin

# PostgreSQL 的单个 endpoint
kubectl port-forward -n lit-dev svc/postgresql-svc 5432:5432      # main
```

### 7. 生成宿主机配置（Stage 7）

为本地开发生成 `app.config.host.json`，将 K8s 内部地址替换为 localhost：

```json
{
  "temporal": {
    "endpoints": {
      "main": {
        "value": "grpc://localhost:7233"
      },
      "admin": {
        "value": "http://localhost:8080"
      }
    }
  }
}
```

## Endpoint 访问模式

### 本地开发环境（local provider）

```
┌─────────────────────────────────────────────────────────────┐
│                        Localhost                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Application (local process)                                │
│       ↓                                                     │
│  localhost:7233 (temporal main)  ←──┐                      │
│  localhost:8080 (temporal admin) ←──┼── Port Forward       │
│  localhost:5432 (postgresql)     ←──┘                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  Docker Desktop Kubernetes                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  temporal-svc:7233         ←→  temporal Pod                │
│  temporal-admin-svc:8080   ←→  temporal Pod                │
│  postgresql-svc:5432       ←→  postgresql Pod              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 云环境（volcengine/aws/aliyun provider）

```
┌─────────────────────────────────────────────────────────────┐
│                  Kubernetes Cluster                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  main-app Pod                                               │
│       ↓                                                     │
│  temporal-svc.lit-prod.svc.cluster.local:7233 (ClusterIP)  │
│  temporal-admin-svc.lit-prod.svc.cluster.local:8080 (LB)   │
│       ↓                                                     │
│  temporal Pod                                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
            │
            ↓ (LoadBalancer 暴露公网)
┌─────────────────────────────────────────────────────────────┐
│  Temporal Admin UI: http://<external-ip>:8080               │
└─────────────────────────────────────────────────────────────┘
```

## 配置示例

### application.json（定义 endpoint 结构）

```json
{
  "middlewareDependencies": {
    "temporal": {
      "type": "temporal",
      "version": ">=1.24.0",
      "endpoints": {
        "main": {
          "port": 7233,
          "protocol": "grpc",
          "publicAccess": false,
          "description": "gRPC service for Temporal SDK"
        },
        "admin": {
          "port": 8080,
          "protocol": "http",
          "publicAccess": true,
          "description": "Temporal Web UI"
        }
      },
      "requiredFields": []
    }
  }
}
```

### deploy.dev.json（覆盖 publicAccess）

```json
{
  "middlewareDependencies": {
    "temporal": {
      "deploymentType": "container",
      "use": "temporal",
      "config": {
        "publicAccess": {
          "main": false,
          "admin": true
        }
      }
    }
  }
}
```

### 部署后 app.config.json

```json
{
  "middlewareDependencies": {
    "temporal": {
      "type": "temporal",
      "deploymentType": "container",
      "endpoints": {
        "main": {
          "port": 7233,
          "protocol": "grpc",
          "publicAccess": false,
          "value": "grpc://temporal-svc.lit-dev.svc.cluster.local:7233"
        },
        "admin": {
          "port": 8080,
          "protocol": "http",
          "publicAccess": true,
          "value": "http://temporal-admin-svc.lit-dev.svc.cluster.local:8080"
        }
      }
    }
  }
}
```

### 部署后 app.config.host.json（本地访问）

```json
{
  "middlewareDependencies": {
    "temporal": {
      "endpoints": {
        "main": {
          "value": "grpc://localhost:7233"
        },
        "admin": {
          "value": "http://localhost:8080"
        }
      }
    }
  }
}
```

## 关键类和方法

### EndpointManager

- `validateCloudEndpoints()`: 验证 cloud 类型 endpoints
- `fillAllEndpoints()`: 自动填写所有 endpoints
- `fillMiddlewareEndpoints()`: 填写单个 middleware 的所有 endpoints
- `getMiddlewareEndpoints()`: 获取 middleware 的所有 endpoints
- `generateHostConfig()`: 生成宿主机配置文件

### BaseProvider

- `resolveMiddlewareEndpoints()`: 解析 middleware 的所有 endpoints
- `getMiddlewareEndpointDefinitions()`: 获取 middleware 的 endpoint 定义

### MiddlewareConfig

- `getEndpointDefinitions()`: 返回 middleware 支持的所有 endpoint 定义
  - 默认实现返回单个 `main` endpoint
  - Temporal 等多端口服务覆盖此方法返回多个 endpoint

### TerraformGenerator

- `generateServicesForEndpoints()`: 为每个 endpoint 生成独立的 Service
- `getServiceTypeForEndpoint()`: 根据 publicAccess 决定 ServiceType

## 常见问题

### Q: 如何让 Temporal Admin UI 可以公网访问？

A: 在 `deploy.{env}.json` 的 config 中配置：

```json
{
  "temporal": {
    "config": {
      "publicAccess": {
        "main": false,
        "admin": true
      }
    }
  }
}
```

云环境下 admin endpoint 会使用 LoadBalancer，获得公网 IP。

### Q: 多个 endpoint 的端口冲突怎么处理？

A: deploy-tool 会自动处理。如果首选端口被占用，会自动分配下一个可用端口，并更新 `localPortMapping`。

### Q: 如何在代码中访问特定的 endpoint？

A: 从配置中读取：

```typescript
const config = loadConfig('app.config.host.json');
const temporalMain = config.components.asyncTask.middlewareDependencies.temporal.endpoints.main.value;
const temporalAdmin = config.components.asyncTask.middlewareDependencies.temporal.endpoints.admin.value;
```

### Q: 可以给现有的 middleware 添加新的 endpoint 吗？

A: 可以。在 middleware 配置类中覆盖 `getEndpointDefinitions()` 方法即可。参见 `TemporalMiddlewareConfig` 的实现。
