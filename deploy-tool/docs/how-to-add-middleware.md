# 如何新增中间件

本文档介绍如何在 deploy-tool 中添加新的中间件类型支持。

## 目录

- [概述](#概述)
- [步骤1：在 TerraformGenerator 中添加中间件规格](#步骤1在-terraformgenerator-中添加中间件规格)
- [步骤2：更新类型定义（可选）](#步骤2更新类型定义可选)
- [步骤3：测试新中间件](#步骤3测试新中间件)
- [完整示例：添加 Redis 支持](#完整示例添加-redis-支持)
- [常见问题](#常见问题)

---

## 概述

deploy-tool 使用 **规格驱动** 的方式管理中间件。每种中间件的部署配置（镜像、端口、环境变量等）定义在 `TerraformGenerator` 的 `getMiddlewareSpec()` 方法中。

**添加新中间件的核心步骤**：
1. 在 `getMiddlewareSpec()` 方法中添加中间件规格
2. （可选）更新类型定义
3. 测试新中间件的配置生成

---

## 步骤1：在 TerraformGenerator 中添加中间件规格

### 1.1 找到规格定义位置

打开文件：`src/terraform/generator.ts`

找到 `getMiddlewareSpec()` 方法（约第 180 行）：

```typescript
private getMiddlewareSpec(middleware: ContainerMiddleware): any {
  const specs: Record<string, any> = {
    postgresql: { ... },
    minio: { ... },
    kafka: { ... }
    // 在这里添加新的中间件
  };
  
  // ...
}
```

### 1.2 添加中间件规格

在 `specs` 对象中添加新的中间件配置。规格包含以下字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `image` | string | Docker 镜像名称和标签 |
| `ports` | array | 容器端口配置 |
| `env` | array | 环境变量配置 |
| `servicePorts` | array | Kubernetes Service 端口配置 |
| `resources` | object | 资源限制和请求 |

**端口对象格式**：
```typescript
{
  container_port: number,  // 容器端口
  name: string,           // 端口名称
  protocol: string        // 协议（通常是 'TCP'）
}
```

**环境变量对象格式**：
```typescript
{
  name: string,   // 环境变量名
  value: string   // 环境变量值（可以从 middleware.config 中获取）
}
```

**Service 端口对象格式**：
```typescript
{
  name: string,         // 端口名称
  port: number,         // Service 端口
  target_port: number,  // 目标端口（容器端口）
  protocol: string      // 协议
}
```

**资源配置格式**：
```typescript
{
  limits: {
    cpu: string,     // 如 '1000m'
    memory: string   // 如 '1Gi'
  },
  requests: {
    cpu: string,
    memory: string
  }
}
```

### 1.3 示例：添加 Redis

```typescript
private getMiddlewareSpec(middleware: ContainerMiddleware): any {
  const specs: Record<string, any> = {
    // ... 现有的中间件 ...
    
    redis: {
      image: 'redis:7-alpine',
      ports: [
        { container_port: 6379, name: 'redis', protocol: 'TCP' }
      ],
      env: [
        // Redis 配置（如果需要密码）
        { 
          name: 'REDIS_PASSWORD', 
          value: middleware.config.password || '' 
        }
      ],
      servicePorts: [
        { name: 'redis', port: 6379, target_port: 6379, protocol: 'TCP' }
      ],
      resources: {
        limits: { cpu: '500m', memory: '512Mi' },
        requests: { cpu: '50m', memory: '128Mi' }
      }
    }
  };
  
  // ... 其余代码保持不变 ...
}
```

### 1.4 从配置中读取参数

如果中间件需要从配置中读取参数，使用 `middleware.config`：

```typescript
redis: {
  image: 'redis:7-alpine',
  ports: [
    { container_port: 6379, name: 'redis', protocol: 'TCP' }
  ],
  env: [
    // 从配置中读取密码
    { name: 'REDIS_PASSWORD', value: middleware.config.password || '' },
    // 从配置中读取最大内存
    { name: 'REDIS_MAXMEMORY', value: middleware.config.maxmemory || '256mb' },
    // 从配置中读取驱逐策略
    { name: 'REDIS_MAXMEMORY_POLICY', value: middleware.config.policy || 'allkeys-lru' }
  ],
  servicePorts: [
    { name: 'redis', port: 6379, target_port: 6379, protocol: 'TCP' }
  ],
  resources: {
    limits: { cpu: '500m', memory: '512Mi' },
    requests: { cpu: '50m', memory: '128Mi' }
  }
}
```

---

## 步骤2：更新类型定义（可选）

如果新中间件需要特定的配置字段，可以在项目的配置文件中说明。

### 2.1 更新 application.json

在应用层配置中定义新中间件的要求：

```json
{
  "components": {
    "main": {
      "middlewareDependencies": {
        "cache": {
          "type": "redis",
          "version": ">=7.0.0",
          "required": true,
          "description": "缓存服务",
          "requiredFields": [
            "password"
          ],
          "optionalFields": [
            "maxmemory",
            "policy"
          ]
        }
      }
    }
  }
}
```

### 2.2 更新 deploy.{env}.json

在运维层配置中提供实际值：

```json
{
  "components": {
    "main": {
      "middlewareDependencies": {
        "cache": {
          "deploymentType": "container",
          "use": "redis",
          "replicas": 1,
          "config": {
            "password": "your-redis-password",
            "maxmemory": "512mb",
            "policy": "allkeys-lru"
          }
        }
      }
    }
  }
}
```

### 2.3 ~~更新 EndpointManager 的端口映射（可选）~~ ❌ 已废弃

**✨ 新方法（推荐）：** 端口信息现在由 Middleware 配置类自动提供，无需手动配置！

你的 Middleware 配置类已经通过 `getServiceSpec()` 定义了端口，系统会自动使用：

```typescript
// RedisMiddlewareConfig.getServiceSpec() 中已定义
getServiceSpec(env: MiddlewareEnvironment): ServiceSpec {
  return {
    ports: [
      { name: 'redis', port: 6379, target_port: 6379, protocol: 'TCP' }
    ],
    type: this.getServiceType(env)
  };
}

// BaseMiddlewareConfig 会自动从 ServiceSpec 提取端口
getDefaultPort(): number {
  const serviceSpec = this.getServiceSpec(minimalEnv);
  return serviceSpec.ports[0]?.port || 8080;  // ✅ 自动使用 6379
}
```

**如果不是 http 协议，覆盖 `getDefaultProtocol()`：**

```typescript
getDefaultProtocol(): string {
  return 'redis';  // 返回 redis:// 协议
}
```

**完成！** 不需要修改其他任何文件。

---

## 步骤3：测试新中间件

### 3.1 创建测试配置

创建一个测试用的 `app.config.json`：

```json
{
  "version": "1.0.0",
  "environment": "test",
  "provider": "local",
  "generatedAt": "2025-11-20T00:00:00.000Z",
  "components": {
    "testapp": {
      "name": "测试应用",
      "enabled": true,
      "deploymentType": "container",
      "host": "localhost",
      "port": 3000,
      "publicUrl": "http://localhost:3000",
      "endpoint": "",
      "replicas": 1,
      "middlewareDependencies": {
        "cache": {
          "type": "redis",
          "deploymentType": "container",
          "use": "redis",
          "endpoint": "",
          "replicas": 1,
          "config": {
            "password": "testpass123"
          }
        }
      },
      "externalServices": {},
      "applicationConfig": {}
    }
  },
  "componentUrls": {}
}
```

### 3.2 运行部署工具

```bash
cd deploy-tool

# 查看部署计划
npm run plan -- -c test-config.json

# 生成 Terraform 配置（不实际部署）
npm run deploy -- -c test-config.json --plan-only
```

### 3.3 检查生成的 Terraform 配置

查看生成的文件：`terraform/generated/middleware-cache.tf`

验证内容是否正确：
- 镜像名称
- 端口配置
- 环境变量
- Service 配置

### 3.4 编写单元测试（推荐）

在 `tests/unit/terraform-generator.test.ts` 中添加测试：

```typescript
test('应该为 Redis 生成正确的配置', async () => {
  // 创建包含 Redis 的配置
  const configWithRedis = {
    version: '1.0.0',
    environment: 'test',
    provider: 'local',
    generatedAt: new Date().toISOString(),
    components: {
      main: {
        name: '测试应用',
        enabled: true,
        deploymentType: 'container',
        host: 'localhost',
        port: 3000,
        publicUrl: 'http://localhost:3000',
        endpoint: '',
        replicas: 1,
        middlewareDependencies: {
          cache: {
            type: 'redis',
            deploymentType: 'container',
            use: 'redis',
            endpoint: '',
            replicas: 1,
            config: {
              password: 'testpass'
            }
          }
        },
        externalServices: {},
        applicationConfig: {}
      }
    },
    componentUrls: {}
  };

  const provider = new LocalProvider();
  const generator = new TerraformGenerator(configWithRedis, provider, './test-output');
  
  await generator.generate();

  // 验证文件生成
  const middlewareFile = join('./test-output', 'middleware-cache.tf');
  expect(existsSync(middlewareFile)).toBe(true);

  // 验证内容
  const content = await readFile(middlewareFile, 'utf-8');
  expect(content).toContain('image = "redis:7-alpine"');
  expect(content).toContain('"container_port": 6379');
  expect(content).toContain('REDIS_PASSWORD');
});
```

运行测试：

```bash
npm test
```

---

## 完整示例：添加 Redis 支持

### 1. 修改 `src/terraform/generator.ts`

在 `getMiddlewareSpec()` 方法的 `specs` 对象中添加：

```typescript
redis: {
  image: 'redis:7-alpine',
  ports: [
    { container_port: 6379, name: 'redis', protocol: 'TCP' }
  ],
  env: [
    { name: 'REDIS_PASSWORD', value: middleware.config.password || '' },
    { name: 'REDIS_MAXMEMORY', value: middleware.config.maxmemory || '256mb' }
  ],
  servicePorts: [
    { name: 'redis', port: 6379, target_port: 6379, protocol: 'TCP' }
  ],
  resources: {
    limits: { cpu: '500m', memory: '512Mi' },
    requests: { cpu: '50m', memory: '128Mi' }
  }
}
```

### 2. ~~修改 `src/endpoint-manager.ts`~~ ❌ 不再需要

**✨ 端口信息现在自动从 Middleware 配置类获取！**

系统会自动调用你的配置类：
- `getDefaultPort()` - 从 `getServiceSpec()` 自动提取
- `getDefaultProtocol()` - 如果不是 http，需要覆盖此方法

**示例：Redis 配置**

```typescript
export class RedisMiddlewareConfig extends BaseMiddlewareConfig {
  // ✅ 端口在这里定义
  getServiceSpec(env: MiddlewareEnvironment): ServiceSpec {
    return {
      ports: [{ name: 'redis', port: 6379, target_port: 6379, protocol: 'TCP' }]
    };
  }
  
  // ✅ 如果不是 http，覆盖协议方法
  getDefaultProtocol(): string {
    return 'redis';
  }
  
  // ✅ getDefaultPort() 由基类自动实现，无需编写
}
```

**完成！** 系统会自动：
- 从 `getServiceSpec()` 获取端口 6379
- 使用 `getDefaultProtocol()` 获取协议 'redis'
- 生成正确的 endpoint: `redis://service:6379`

### 3. 更新配置文件

**config/application.json**:

```json
{
  "components": {
    "main": {
      "middlewareDependencies": {
        "cache": {
          "type": "redis",
          "version": ">=7.0.0",
          "required": false,
          "description": "Redis 缓存",
          "requiredFields": ["password"],
          "optionalFields": ["maxmemory"]
        }
      }
    }
  }
}
```

**config/deploy.dev.json**:

```json
{
  "components": {
    "main": {
      "middlewareDependencies": {
        "cache": {
          "deploymentType": "container",
          "use": "redis",
          "replicas": 1,
          "config": {
            "password": "dev-redis-password",
            "maxmemory": "256mb"
          }
        }
      }
    }
  }
}
```

### 4. 测试

```bash
# 生成配置
cd /path/to/project
npm run generate-config -- --env dev

# 查看部署计划
cd deploy-tool
npm run plan

# 检查输出，应该看到 Redis 中间件
```

---

## 常见问题

### Q1: 如何添加持久化存储？

A: 在中间件规格中添加 `volumes` 配置。例如 PostgreSQL 的持久化：

```typescript
postgresql: {
  image: 'postgres:14',
  // ... 其他配置 ...
  volumes: [
    {
      name: 'data',
      persistentVolumeClaim: {
        claimName: `${middlewareName}-pvc`
      }
    }
  ],
  volumeMounts: [
    {
      name: 'data',
      mountPath: '/var/lib/postgresql/data',
      readOnly: false
    }
  ]
}
```

注意：目前 TerraformGenerator 的简化实现中 `volumes` 字段为空数组，如需持久化存储，需要扩展实现。

### Q2: 如何配置健康检查？

A: 在中间件规格中添加 `liveness_probe` 和 `readiness_probe`：

```typescript
redis: {
  // ... 其他配置 ...
  liveness_probe: {
    http_get: null,  // Redis 不使用 HTTP
    exec: {
      command: ['redis-cli', 'ping']
    },
    initial_delay_seconds: 30,
    period_seconds: 10,
    timeout_seconds: 5,
    failure_threshold: 3
  },
  readiness_probe: {
    exec: {
      command: ['redis-cli', 'ping']
    },
    initial_delay_seconds: 5,
    period_seconds: 5,
    timeout_seconds: 3,
    failure_threshold: 3
  }
}
```

注意：当前实现只支持 HTTP 探针，如需 exec 或 TCP 探针，需要扩展 Terraform Deployment 模块。

### Q3: 如何支持集群模式的中间件？

A: 对于集群模式（如 Redis Cluster、Kafka Cluster），有两种方式：

**方式1：使用 StatefulSet**（推荐）
- 创建新的 Terraform 模块 `terraform/modules/kubernetes/statefulset`
- 在 TerraformGenerator 中针对集群模式中间件使用 StatefulSet

**方式2：使用 Helm**
- 集成 Terraform Helm Provider
- 使用官方 Helm Chart 部署

### Q4: 新增的中间件如何在应用代码中使用？

A: 生成的 endpoint 会自动填写到 `app.config.json` 中，应用代码可以直接使用：

```typescript
import config from './app.config.json';

// 获取 Redis endpoint
const redisEndpoint = config.components.main.middlewareDependencies.cache.endpoint;
// 例如: "cache-svc.lit-dev.svc.cluster.local:6379"

// 连接 Redis
const redis = new Redis({
  host: redisEndpoint.split(':')[0],
  port: parseInt(redisEndpoint.split(':')[1]),
  password: config.components.main.middlewareDependencies.cache.config.password
});
```

### Q5: 如何为不同环境配置不同的资源限制？

A: 目前资源限制是硬编码的。如需按环境配置，有两种方式：

**方式1：在配置中添加资源字段**

在 `deploy.{env}.json` 中添加资源配置：

```json
{
  "middlewareDependencies": {
    "cache": {
      "deploymentType": "container",
      "use": "redis",
      "resources": {
        "limits": { "cpu": "1000m", "memory": "1Gi" },
        "requests": { "cpu": "100m", "memory": "256Mi" }
      }
    }
  }
}
```

然后在 `getMiddlewareSpec()` 中使用：

```typescript
redis: {
  // ... 其他配置 ...
  resources: middleware.config.resources || {
    limits: { cpu: '500m', memory: '512Mi' },
    requests: { cpu: '50m', memory: '128Mi' }
  }
}
```

**方式2：根据环境动态调整**

在 `getMiddlewareSpec()` 中根据环境名称调整：

```typescript
const isProd = this.config.environment === 'prod';
redis: {
  // ... 其他配置 ...
  resources: {
    limits: { 
      cpu: isProd ? '2000m' : '500m', 
      memory: isProd ? '2Gi' : '512Mi' 
    },
    requests: { 
      cpu: isProd ? '200m' : '50m', 
      memory: isProd ? '512Mi' : '128Mi' 
    }
  }
}
```

---

## 下一步

添加完新中间件后：

1. ✅ 提交代码
2. ✅ 更新 README.md 中的支持列表
3. ✅ 编写测试用例
4. ✅ 在实际环境中验证

---

**需要帮助？**

如有问题，请查看：
- 现有中间件的实现（PostgreSQL, MinIO, Kafka）
- Terraform Kubernetes Provider 文档
- deploy-tool/README.md

