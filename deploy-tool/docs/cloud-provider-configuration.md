# 云服务提供商配置指南

本文档介绍如何配置 deploy-tool 以使用云服务提供商（火山引擎、AWS、阿里云等）。

## 目录

- [概述](#概述)
- [配置结构](#配置结构)
- [本地开发环境（Local Provider）](#本地开发环境local-provider)
- [火山引擎（Volcengine Provider）](#火山引擎volcengine-provider)
- [实现自定义 Provider](#实现自定义-provider)
- [常见配置场景](#常见配置场景)
- [故障排查](#故障排查)

---

## 概述

deploy-tool 使用 **Provider 模式** 来支持不同的云服务提供商。每个 Provider 负责：

1. 验证配置是否符合该平台的要求
2. 获取 Kubernetes 集群的连接信息
3. 解析中间件和组件的 endpoint
4. 生成适配该平台的 Terraform 配置

### 当前支持的 Provider

| Provider | 状态 | 说明 |
|----------|------|------|
| local | ✅ 已实现 | 使用 Docker Desktop Kubernetes |
| volcengine | ⏳ 接口预留 | 火山引擎 VKE |
| aws | ⏳ 接口预留 | AWS EKS |
| aliyun | ⏳ 接口预留 | 阿里云 ACK |

---

## 配置结构

### 配置文件层次

deploy-tool 使用三层配置结构：

```
config/
├── application.json       # 应用层：定义需求
├── deploy.dev.json        # 运维层：开发环境配置
├── deploy.prod.json       # 运维层：生产环境配置
└── deploy.test.json       # 运维层：测试环境配置
```

### Provider 配置位置

Provider 在 **运维层配置** 中指定：

```json
{
  "provider": "local",        // 或 "volcengine", "aws", "aliyun"
  "environment": "dev",
  "components": {
    // ...
  }
}
```

---

## 本地开发环境（Local Provider）

### 适用场景

- 本地开发和测试
- 使用 Docker Desktop 的 Kubernetes
- 快速验证配置

### 前置要求

1. **Docker Desktop**
   - 版本: >= 4.0.0
   - 启用 Kubernetes

2. **kubectl**
   ```bash
   # 验证安装
   kubectl version --client
   
   # 检查集群
   kubectl cluster-info
   ```

3. **Terraform**
   ```bash
   # 验证安装
   terraform version
   # 需要 >= 1.5.0
   ```

### 配置示例

**deploy.dev.json**:

```json
{
  "provider": "local",
  "environment": "dev",
  "components": {
    "main": {
      "deploymentType": "local",        // 本地运行，不部署
      "host": "localhost",
      "port": 3000,
      "middlewareDependencies": {
        "mainDb": {
          "deploymentType": "container",  // 部署到本地 K8s
          "use": "postgresql",
          "replicas": 1,
          "config": {
            "username": "devuser",
            "password": "devpass",
            "database": "devdb"
          }
        },
        "objectStorage": {
          "deploymentType": "cloud",      // 使用云服务
          "endpoint": "https://tos-cn-beijing.volces.com",
          "config": {
            "region": "cn-beijing",
            "bucket": "dev-bucket",
            "accessKeyId": "YOUR_ACCESS_KEY",
            "secretAccessKey": "YOUR_SECRET_KEY"
          }
        }
      }
    },
    "communication": {
      "deploymentType": "container",      // 部署到本地 K8s
      "host": "localhost",
      "port": 3001,
      "middlewareDependencies": {}
    }
  }
}
```

### 部署类型规则

当 `provider: "local"` 时：

| 资源类型 | 允许的 deploymentType | 说明 |
|---------|---------------------|------|
| Component | `local` | 用户自己启动，不部署 |
| Component | `container` | 部署到本地 Docker Desktop K8s |
| Middleware | `container` | 部署到本地 Docker Desktop K8s |
| Middleware | `cloud` | 使用云服务（如云数据库、对象存储） |

### Endpoint 生成规则

| 类型 | deploymentType | Endpoint 格式 |
|------|----------------|--------------|
| Component | local | `host.docker.internal:3000` |
| Component | container | `<name>-svc.lit-dev.svc.cluster.local:3000` |
| Middleware | container | `<name>-svc.lit-dev.svc.cluster.local:5432` |
| Middleware | cloud | 使用配置中的 endpoint |

### 部署步骤

```bash
# 1. 切换 kubectl context 到 docker-desktop
kubectl config use-context docker-desktop

# 2. 生成配置
cd /path/to/project
npm run generate-config -- --env dev

# 3. 部署
cd deploy-tool
npm run deploy
```

---

## 火山引擎（Volcengine Provider）

### 适用场景

- 生产环境部署
- 使用火山引擎 VKE（Kubernetes）
- 使用火山引擎云服务（TOS、Kafka 等）

### 前置要求

1. **火山引擎账号**
   - 已开通 VKE 服务
   - 已创建 Kubernetes 集群

2. **VKE Kubeconfig**
   ```bash
   # 从火山引擎控制台下载 kubeconfig
   # 或使用 CLI 工具获取
   ```

3. **Terraform Volcengine Provider**
   - deploy-tool 会自动配置
   - 需要 Access Key 和 Secret Key

### 配置步骤

#### 步骤1: 创建 VKE 集群

1. 登录火山引擎控制台
2. 进入 **容器服务 > VKE**
3. 创建集群
   - 选择地域
   - 配置节点规格
   - 配置网络
4. 下载 kubeconfig 文件

#### 步骤2: 配置云服务

**TOS（对象存储）**:

1. 创建 Bucket
2. 获取访问地址（endpoint）
3. 创建 Access Key

**Kafka**:

1. 创建 Kafka 实例
2. 获取连接地址
3. 配置访问凭证

#### 步骤3: 配置 deploy.prod.json

```json
{
  "provider": "volcengine",
  "environment": "prod",
  "volcengine": {
    "region": "cn-beijing",
    "vkeClusterId": "your-cluster-id",
    "kubeconfigPath": "/path/to/kubeconfig",
    "accessKeyId": "YOUR_ACCESS_KEY",
    "secretAccessKey": "YOUR_SECRET_KEY"
  },
  "components": {
    "main": {
      "deploymentType": "container",      // 云环境必须是 container
      "replicas": 3,                      // 生产环境多副本
      "host": "10.0.1.100",
      "port": 3000,
      "middlewareDependencies": {
        "mainDb": {
          "deploymentType": "cloud",      // 使用云数据库
          "endpoint": "postgres-xxx.rds.volces.com:5432",
          "config": {
            "username": "produser",
            "password": "PROD_PASSWORD",
            "database": "proddb"
          }
        },
        "objectStorage": {
          "deploymentType": "cloud",      // 使用 TOS
          "endpoint": "https://tos-cn-beijing.volces.com",
          "config": {
            "region": "cn-beijing",
            "bucket": "prod-bucket",
            "accessKeyId": "PROD_ACCESS_KEY",
            "secretAccessKey": "PROD_SECRET_KEY"
          }
        },
        "messageQueue": {
          "deploymentType": "cloud",      // 使用云 Kafka
          "endpoint": "kafka-xxx.kafka.cn-beijing.volces.com:9491",
          "config": {
            "instanceId": "kafka-xxx",
            "username": "prod-kafka-user",
            "password": "KAFKA_PASSWORD",
            "ssl": true
          }
        }
      }
    },
    "communication": {
      "deploymentType": "container",
      "replicas": 2,
      "host": "10.0.1.101",
      "port": 3001,
      "middlewareDependencies": {}
    }
  }
}
```

#### 步骤4: 配置 Kubeconfig

**方式1：使用环境变量**

```bash
export KUBECONFIG=/path/to/volcengine-kubeconfig
```

**方式2：在配置中指定**

```json
{
  "volcengine": {
    "kubeconfigPath": "/path/to/volcengine-kubeconfig"
  }
}
```

#### 步骤5: 部署

```bash
# 1. 验证集群连接
kubectl --kubeconfig=/path/to/volcengine-kubeconfig get nodes

# 2. 生成配置
npm run generate-config -- --env prod

# 3. 查看部署计划
cd deploy-tool
npm run plan

# 4. 执行部署
npm run deploy
```

### 部署类型规则

当 `provider: "volcengine"` 时：

| 资源类型 | 允许的 deploymentType | 说明 |
|---------|---------------------|------|
| Component | `container` | 必须部署到 VKE |
| Component | ~~`local`~~ | ❌ 不允许 |
| Middleware | `container` | 部署到 VKE |
| Middleware | `cloud` | 使用火山引擎云服务 |

### Endpoint 生成规则

| 类型 | deploymentType | Endpoint 格式 |
|------|----------------|--------------|
| Component | container | `<name>-svc.lit-prod.svc.cluster.local:3000` |
| Middleware | container | `<name>-svc.lit-prod.svc.cluster.local:5432` |
| Middleware | cloud | 使用配置中的 endpoint |

### 安全建议

1. **使用 Secrets 管理敏感信息**
   ```bash
   # 创建 Secret
   kubectl create secret generic db-credentials \
     --from-literal=username=produser \
     --from-literal=password=PROD_PASSWORD \
     -n lit-prod
   ```

2. **使用 RBAC 控制访问**
   ```yaml
   # 创建 ServiceAccount
   apiVersion: v1
   kind: ServiceAccount
   metadata:
     name: lit-app-sa
     namespace: lit-prod
   ```

3. **配置网络策略**
   ```yaml
   # 限制 Pod 间通信
   apiVersion: networking.k8s.io/v1
   kind: NetworkPolicy
   metadata:
     name: lit-network-policy
     namespace: lit-prod
   spec:
     podSelector:
       matchLabels:
         app.kubernetes.io/part-of: lit
     policyTypes:
     - Ingress
     - Egress
   ```

---

## 实现自定义 Provider

如果需要支持其他云服务提供商（如 AWS、阿里云），可以实现自定义 Provider。

### 步骤1: 创建 Provider 类

创建文件：`src/providers/custom.ts`

```typescript
import { BaseProvider } from './base.js';
import { FinalConfig, ValidationResult, FinalMiddleware, FinalComponent } from '../types.js';

export class CustomProvider extends BaseProvider {
  
  getName(): string {
    return 'custom';
  }

  validateConfig(config: FinalConfig): ValidationResult {
    const errors: string[] = [];

    // 验证配置规则
    if (config.provider !== 'custom') {
      errors.push(`配置的 provider 不匹配`);
    }

    // 验证组件部署类型
    for (const [componentName, component] of Object.entries(config.components)) {
      const deploymentType = component.deploymentType || 'local';
      
      if (deploymentType !== 'container') {
        errors.push(
          `自定义 provider 要求组件 ${componentName} 的 deploymentType 必须是 container`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  getK8sContext(): string | null {
    // 返回 K8s context 名称
    // 或返回 null 如果使用 kubeconfig 文件
    return 'custom-k8s-context';
  }

  resolveMiddlewareEndpoint(
    componentName: string,
    middlewareName: string,
    middleware: FinalMiddleware,
    namespace: string
  ): string {
    // cloud 类型：返回配置的 endpoint
    if (middleware.deploymentType === 'cloud') {
      return middleware.endpoint || '';
    }

    // container 类型：生成 K8s 内部 DNS
    const port = this.getMiddlewarePort(middleware.type);
    const serviceName = this.getServiceName(middlewareName.toLowerCase());
    return `${serviceName}.${namespace}.svc.cluster.local:${port}`;
  }

  resolveComponentEndpoint(
    componentName: string,
    component: FinalComponent,
    namespace: string
  ): string {
    // 生成 K8s 内部 DNS
    const serviceName = this.getServiceName(componentName.toLowerCase());
    return `${serviceName}.${namespace}.svc.cluster.local:${component.port}`;
  }
}
```

### 步骤2: 注册 Provider

修改 `src/deployer.ts` 的 `createProvider()` 方法：

```typescript
private createProvider(providerName: string): BaseProvider {
  switch (providerName) {
    case 'local':
      return new LocalProvider();
    case 'volcengine':
      return new VolcengineProvider();
    case 'custom':
      return new CustomProvider();  // 添加这一行
    default:
      throw new Error(`不支持的 provider: ${providerName}`);
  }
}
```

### 步骤3: 配置使用

在 `deploy.{env}.json` 中使用：

```json
{
  "provider": "custom",
  "environment": "prod",
  "components": {
    // ...
  }
}
```

---

## 常见配置场景

### 场景1: 本地开发 + 云服务

本地运行应用，但使用云服务的数据库和对象存储。

```json
{
  "provider": "local",
  "environment": "dev",
  "components": {
    "main": {
      "deploymentType": "local",          // 本地运行
      "host": "localhost",
      "port": 3000,
      "middlewareDependencies": {
        "mainDb": {
          "deploymentType": "cloud",      // 云数据库
          "endpoint": "postgres-dev.rds.volces.com:5432",
          "config": {
            "username": "devuser",
            "password": "devpass",
            "database": "devdb"
          }
        },
        "objectStorage": {
          "deploymentType": "cloud",      // 云对象存储
          "endpoint": "https://tos-cn-beijing.volces.com",
          "config": {
            "region": "cn-beijing",
            "bucket": "dev-bucket",
            "accessKeyId": "YOUR_KEY",
            "secretAccessKey": "YOUR_SECRET"
          }
        }
      }
    }
  }
}
```

### 场景2: 全容器化本地开发

所有服务都部署到本地 Kubernetes。

```json
{
  "provider": "local",
  "environment": "dev",
  "components": {
    "main": {
      "deploymentType": "container",
      "host": "localhost",
      "port": 3000,
      "middlewareDependencies": {
        "mainDb": {
          "deploymentType": "container",
          "use": "postgresql",
          "replicas": 1,
          "config": {
            "username": "devuser",
            "password": "devpass",
            "database": "devdb"
          }
        },
        "cache": {
          "deploymentType": "container",
          "use": "redis",
          "replicas": 1,
          "config": {
            "password": "devpass"
          }
        }
      }
    }
  }
}
```

### 场景3: 生产环境全云服务

应用部署到云 K8s，所有中间件使用云服务。

```json
{
  "provider": "volcengine",
  "environment": "prod",
  "components": {
    "main": {
      "deploymentType": "container",
      "replicas": 3,
      "host": "10.0.1.100",
      "port": 3000,
      "middlewareDependencies": {
        "mainDb": {
          "deploymentType": "cloud",
          "endpoint": "postgres-prod.rds.volces.com:5432",
          "config": {
            "username": "produser",
            "password": "PROD_PASS",
            "database": "proddb"
          }
        },
        "cache": {
          "deploymentType": "cloud",
          "endpoint": "redis-prod.redis.volces.com:6379",
          "config": {
            "password": "PROD_REDIS_PASS"
          }
        },
        "objectStorage": {
          "deploymentType": "cloud",
          "endpoint": "https://tos-cn-beijing.volces.com",
          "config": {
            "region": "cn-beijing",
            "bucket": "prod-bucket",
            "accessKeyId": "PROD_KEY",
            "secretAccessKey": "PROD_SECRET"
          }
        }
      }
    }
  }
}
```

### 场景4: 混合部署

应用部署到云 K8s，部分中间件容器化，部分使用云服务。

```json
{
  "provider": "volcengine",
  "environment": "prod",
  "components": {
    "main": {
      "deploymentType": "container",
      "replicas": 3,
      "middlewareDependencies": {
        "mainDb": {
          "deploymentType": "cloud",       // 使用云数据库
          "endpoint": "postgres-prod.rds.volces.com:5432",
          "config": {}
        },
        "cache": {
          "deploymentType": "container",   // Redis 容器化
          "use": "redis",
          "replicas": 2,
          "config": {
            "password": "redis-pass"
          }
        }
      }
    }
  }
}
```

---

## 故障排查

### 问题1: Cloud 类型中间件缺少 endpoint

**情况 1：Provider 支持云服务自动部署**

✅ 不需要手动配置 endpoint！deploy-tool 会自动部署云服务并填充 endpoint。

**情况 2：想使用已有的云服务**

在 `deploy.{env}.json` 中添加 `endpoint` 字段：

```json
{
  "middlewareDependencies": {
    "objectStorage": {
      "deploymentType": "cloud",
      "endpoint": "https://tos-cn-beijing.volces.com",  // 使用现有服务
      "config": {}
    }
  }
}
```

**情况 3：Provider 不支持该中间件的云服务自动部署**

会看到错误提示：
```
Provider volcengine 不支持 clickhouse 的云服务自动部署
```

解决方法：
- 选项 1：手动配置 endpoint
- 选项 2：改用 `container` 部署类型
- 选项 3：为该中间件添加云服务支持（参考 [云服务自动部署指南](./cloud-service-deployment.md#如何新增云服务支持)）

### 问题2: Provider 不支持 local 部署类型

**错误信息**:
```
组件 main 的 deploymentType 为 local，但 provider 为 volcengine，只能使用 container
```

**解决方法**:

云服务提供商不支持 local 类型，修改为 container：

```json
{
  "components": {
    "main": {
      "deploymentType": "container",  // 改为 container
      // ...
    }
  }
}
```

### 问题3: Kubeconfig 连接失败

**错误信息**:
```
无法连接到 Kubernetes 集群
```

**解决方法**:

1. **检查 kubeconfig 文件**:
   ```bash
   kubectl --kubeconfig=/path/to/config get nodes
   ```

2. **检查 context**:
   ```bash
   kubectl config get-contexts
   kubectl config use-context <context-name>
   ```

3. **检查网络连接**:
   ```bash
   # 测试集群 API 连接
   kubectl cluster-info
   ```

### 问题4: Container 类型中间件缺少 use 字段

**错误信息**:
```
Middleware 'mainDb' 的 deploymentType 为 'container'，必须指定 'use' 字段
```

**解决方法**:

为 container 类型的中间件添加 `use` 字段：

```json
{
  "middlewareDependencies": {
    "mainDb": {
      "deploymentType": "container",
      "use": "postgresql",  // 添加这一行
      "config": {}
    }
  }
}
```

### 问题5: Terraform apply 失败

**错误信息**:
```
Error creating Service: services "main-svc" already exists
```

**解决方法**:

资源已存在，需要先销毁：

```bash
# 销毁现有部署
npm run destroy

# 重新部署
npm run deploy
```

或者使用 Terraform 的状态导入：

```bash
cd terraform/generated
terraform import module.service_main.kubernetes_service.this lit-dev/main-svc
```

---

## 云服务自动部署

从 v1.0 开始，deploy-tool 支持**云服务自动部署**功能。

### 基本用法

**不需要配置 endpoint**，deploy-tool 会自动创建云服务：

```json
{
  "provider": "volcengine",
  "components": {
    "main": {
      "middlewareDependencies": {
        "mainDb": {
          "deploymentType": "cloud",
          // 不配置 endpoint，自动部署 RDS PostgreSQL
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

**火山引擎**：PostgreSQL, MySQL, Redis, Kafka, TOS, MongoDB, Elasticsearch  
**AWS**：RDS, ElastiCache, MSK, S3, DocumentDB, OpenSearch  
**阿里云**：RDS, Redis, Kafka, OSS, MongoDB, Elasticsearch

### 详细文档

完整的使用方法、配置选项和故障排查，请参考：
- [云服务自动部署指南](./cloud-service-deployment.md)

---

## 最佳实践

### 1. 环境隔离

使用不同的 namespace 和配置文件：

```
config/
├── deploy.dev.json    # 开发: lit-dev namespace
├── deploy.test.json   # 测试: lit-test namespace
└── deploy.prod.json   # 生产: lit-prod namespace
```

### 2. 敏感信息管理

不要在配置文件中硬编码敏感信息：

**错误做法❌**:
```json
{
  "config": {
    "password": "my-secret-password"
  }
}
```

**正确做法✅**:
```json
{
  "config": {
    "password": "${DB_PASSWORD}"  // 使用环境变量
  }
}
```

然后在部署前设置环境变量：
```bash
export DB_PASSWORD="my-secret-password"
```

### 3. 使用 .gitignore

排除敏感配置文件：

```gitignore
# .gitignore
config/deploy.prod.json
config/deploy.*.local.json
*.key
*.pem
```

### 4. 配置版本控制

在配置中添加版本信息：

```json
{
  "version": "1.0.0",
  "provider": "volcengine",
  "configVersion": "2025-11-20",  // 配置文件版本
  "components": {}
}
```

### 5. 使用配置模板

创建配置模板，方便快速配置新环境：

```bash
cp config/deploy.prod.json.template config/deploy.prod.json
# 然后填写实际值
```

---

## 下一步

配置完成后：

1. ✅ 验证配置：`npm run plan`
2. ✅ 测试部署：先在测试环境部署
3. ✅ 监控部署：检查 Pod 状态和日志
4. ✅ 文档化：记录配置细节和注意事项

---

**需要帮助？**

参考文档：
- deploy-tool/README.md
- deploy-tool/docs/how-to-add-middleware.md
- Terraform Kubernetes Provider 文档
- 各云服务提供商的 Kubernetes 文档

