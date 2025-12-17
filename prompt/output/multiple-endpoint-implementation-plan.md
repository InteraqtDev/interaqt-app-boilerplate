# 多 Endpoint 支持改造计划

## 1. 背景与目标

### 1.1 当前问题
- 当前 deploy-tool 中 middleware 只支持单一 `endpoint: string`
- 某些中间件需要暴露多个 endpoint（例如 Temporal 有 gRPC 服务端口 7233 和 Admin UI 端口 8080）
- 无法为不同 endpoint 配置不同的 public access 策略

### 1.2 改造目标
1. Middleware 支持配置多个 endpoint
2. 每个 endpoint 可以单独配置 `publicAccess` 属性
3. 主 endpoint 约定命名为 `main`
4. **不需要向后兼容**，全面采用多 endpoint 方案

### 1.3 典型用例
```json
// Temporal 中间件需要暴露两个 endpoint
{
  "temporal": {
    "endpoints": {
      "main": {
        "port": 7233,
        "protocol": "grpc",
        "publicAccess": false,
        "description": "gRPC service endpoint"
      },
      "admin": {
        "port": 8080,
        "protocol": "http",
        "publicAccess": true,
        "description": "Web UI endpoint"
      }
    }
  }
}
```

---

## 2. 架构改造概览

### 2.1 影响的核心模块

| 模块 | 文件 | 改造内容 |
|------|------|----------|
| 类型定义 | `src/types.ts` | 新增多 endpoint 类型定义 |
| Middleware 基类 | `src/terraform/middleware/base.ts` | 新增 endpoint 定义接口 |
| Middleware 实现 | `src/terraform/middleware/implementations/*.ts` | 实现多 endpoint 定义 |
| Provider 基类 | `src/providers/base.ts` | 调整 endpoint 解析方法 |
| Provider 实现 | `src/providers/local.ts` 等 | 实现多 endpoint 解析 |
| Endpoint 管理器 | `src/endpoint-manager.ts` | 支持多 endpoint 填充和验证 |
| Terraform 生成器 | `src/terraform/generator.ts` | 为每个 endpoint 生成 Service |
| 部署编排器 | `src/deployer.ts` | 处理多端口 port-forward |

### 2.2 数据结构变化

```typescript
// 旧结构
interface FinalMiddleware {
  endpoint: string;  // 单一 endpoint
  // ...
}

// 新结构
interface EndpointDefinition {
  port: number;
  protocol: string;           // http, grpc, postgresql, redis, etc.
  publicAccess: boolean;      // 是否需要公网访问
  description?: string;       // 可选描述
  value?: string;             // 填充后的实际地址
}

interface FinalMiddleware {
  endpoints: {
    [name: string]: EndpointDefinition;  // 多 endpoint，主 endpoint 为 "main"
  };
  // ...
}
```

---

## 3. 详细实施步骤

### TODO 1: 更新类型定义 (`src/types.ts`)

**改造内容：**
1. 新增 `EndpointDefinition` 接口
2. 修改 `FinalMiddleware.endpoint` 为 `FinalMiddleware.endpoints`
3. 更新 `EndpointInfo` 类型以支持多 endpoint

**代码变更：**
```typescript
// 新增
export interface EndpointDefinition {
  port: number;
  protocol: string;
  publicAccess: boolean;
  description?: string;
  value?: string;  // 填充后的实际 endpoint 地址
}

// 修改
export interface FinalMiddleware {
  type: string;
  version?: string;
  deploymentType: "container" | "cloud";
  use?: string;
  image?: string;
  endpoints: Record<string, EndpointDefinition>;  // 替换原来的 endpoint: string
  replicas?: number;
  dependencies?: string[];
  config: Record<string, any>;
}

// 更新
export interface EndpointInfo {
  componentName: string;
  middlewareName?: string;
  endpointName: string;      // 新增：endpoint 名称（如 "main", "admin"）
  endpoint: string;
  type: "component" | "middleware";
}
```

**测试计划：**
- 编译检查：确保类型修改后无 TypeScript 编译错误
- 单元测试：更新 `tests/unit/` 中使用旧类型的测试用例

---

### TODO 2: 扩展 Middleware 配置基类 (`src/terraform/middleware/base.ts`)

**改造内容：**
1. 新增 `EndpointSpec` 接口定义
2. 在 `MiddlewareConfig` 接口添加 `getEndpointDefinitions()` 方法
3. 在 `BaseMiddlewareConfig` 基类实现默认逻辑

**代码变更：**
```typescript
// 新增接口
export interface EndpointSpec {
  name: string;              // endpoint 名称，如 "main", "admin"
  port: number;
  protocol: string;
  publicAccess: boolean;
  description?: string;
}

// 扩展 MiddlewareConfig 接口
export interface MiddlewareConfig {
  // ... 现有方法 ...
  
  /**
   * 获取所有 endpoint 定义
   * 默认返回单个 "main" endpoint
   */
  getEndpointDefinitions(env: MiddlewareEnvironment): EndpointSpec[];
}

// BaseMiddlewareConfig 默认实现
abstract class BaseMiddlewareConfig {
  /**
   * 默认实现：返回单个 main endpoint
   * 子类可以覆盖以返回多个 endpoint
   */
  getEndpointDefinitions(env: MiddlewareEnvironment): EndpointSpec[] {
    const port = this.getDefaultPort();
    const protocol = this.getDefaultProtocol();
    const publicAccess = env.config.publicAccess ?? false;
    
    return [{
      name: 'main',
      port,
      protocol,
      publicAccess,
      description: 'Primary service endpoint'
    }];
  }
}
```

**测试计划：**
- 单元测试：验证默认实现返回正确的单个 main endpoint
- 单元测试：验证 publicAccess 从 config 正确读取

---

### TODO 3: 更新 Temporal Middleware 实现 (`src/terraform/middleware/implementations/temporal.ts`)

**改造内容：**
1. 覆盖 `getEndpointDefinitions()` 方法，返回两个 endpoint
2. 更新 `getServiceSpec()` 以支持多 Service 生成

**代码变更：**
```typescript
export class TemporalMiddlewareConfig extends BaseMiddlewareConfig {
  /**
   * Temporal 暴露两个 endpoint：
   * - main: gRPC 服务（7233）
   * - admin: Web UI（8080）
   */
  getEndpointDefinitions(env: MiddlewareEnvironment): EndpointSpec[] {
    return [
      {
        name: 'main',
        port: 7233,
        protocol: 'grpc',
        publicAccess: env.config.publicAccess?.main ?? false,
        description: 'gRPC service endpoint for Temporal SDK'
      },
      {
        name: 'admin',
        port: 8080,
        protocol: 'http',
        publicAccess: env.config.publicAccess?.admin ?? false,
        description: 'Temporal Web UI'
      }
    ];
  }
  
  // 保持原有的 getContainerSpec 和 getServiceSpec
  // getServiceSpec 仍返回所有端口，但 ServiceType 会在 generator 中根据 endpoint 分别设置
}
```

**测试计划：**
- 单元测试：验证 `getEndpointDefinitions()` 返回两个正确的 endpoint
- 单元测试：验证 publicAccess 可以分别配置

---

### TODO 4: 更新其他 Middleware 实现

**涉及文件：**
- `implementations/postgresql.ts`
- `implementations/minio.ts`
- `implementations/kafka.ts`
- `implementations/redis.ts`
- `implementations/centrifugo.ts`
- `implementations/pglite.ts`

**改造内容：**
- 所有中间件使用基类的默认实现（单个 main endpoint）即可
- 验证 `getDefaultPort()` 和 `getDefaultProtocol()` 已正确实现
- 如果某个中间件也需要多 endpoint，类似 Temporal 处理

**测试计划：**
- 单元测试：验证所有中间件的 `getEndpointDefinitions()` 返回正确格式

---

### TODO 5: 更新 Provider 基类和实现

**涉及文件：**
- `src/providers/base.ts`
- `src/providers/local.ts`
- `src/providers/aliyun.ts`
- `src/providers/volcengine.ts`

**改造内容：**
1. 新增 `resolveMiddlewareEndpoints()` 方法，返回多个 endpoint
2. 保留 `resolveMiddlewareEndpoint()` 返回 main endpoint（向后兼容内部调用）

**代码变更：**
```typescript
// base.ts
export abstract class BaseProvider {
  /**
   * 解析中间件的所有 endpoint
   */
  abstract resolveMiddlewareEndpoints(
    componentName: string,
    middlewareName: string,
    middleware: FinalMiddleware,
    namespace: string,
    endpointDefinitions: EndpointSpec[]
  ): Record<string, string>;
}

// local.ts
export class LocalProvider extends BaseProvider {
  resolveMiddlewareEndpoints(
    componentName: string,
    middlewareName: string,
    middleware: FinalMiddleware,
    namespace: string,
    endpointDefinitions: EndpointSpec[]
  ): Record<string, string> {
    const result: Record<string, string> = {};
    
    for (const def of endpointDefinitions) {
      const serviceName = middlewareName.toLowerCase();
      // 格式：{protocol}://{service}-{endpointName}-svc.{namespace}.svc.cluster.local:{port}
      // 对于 main endpoint，简化为 {service}-svc
      const svcSuffix = def.name === 'main' ? 'svc' : `${def.name}-svc`;
      result[def.name] = `${def.protocol}://${serviceName}-${svcSuffix}.${namespace}.svc.cluster.local:${def.port}`;
    }
    
    return result;
  }
}
```

**测试计划：**
- 单元测试：验证多 endpoint 解析的正确性
- 单元测试：验证 main endpoint 的服务名简化

---

### TODO 6: 更新 EndpointManager (`src/endpoint-manager.ts`)

**改造内容：**
1. 修改 `fillAllEndpoints()` 处理多 endpoint
2. 更新 `validateCloudEndpoints()` 验证所有 endpoint
3. 新增 `getMiddlewareEndpoints()` 返回所有 endpoint
4. 更新 `generateHostConfig()` 处理多 endpoint 的本地端口替换

**关键代码变更：**
```typescript
/**
 * 填写中间件的所有 endpoint
 */
fillMiddlewareEndpoints(
  componentName: string,
  middlewareName: string,
  endpoints: Record<string, string>
): void {
  const middleware = this.config.components[componentName]?.middlewareDependencies?.[middlewareName];
  if (!middleware) throw new Error(`Middleware ${middlewareName} not found`);
  
  for (const [name, value] of Object.entries(endpoints)) {
    if (!middleware.endpoints[name]) {
      middleware.endpoints[name] = { port: 0, protocol: '', publicAccess: false };
    }
    middleware.endpoints[name].value = value;
  }
}

/**
 * 获取中间件的所有 endpoint
 */
getMiddlewareEndpoints(componentName: string, middlewareName: string): Record<string, EndpointDefinition> {
  const middleware = this.config.components[componentName]?.middlewareDependencies?.[middlewareName];
  if (!middleware) throw new Error(`Middleware ${middlewareName} not found`);
  return middleware.endpoints;
}

/**
 * 生成 host 配置文件 - 处理多 endpoint
 */
async generateHostConfig(localPortMapping?: Map<string, number>): Promise<void> {
  // 深拷贝配置
  const hostConfig = JSON.parse(JSON.stringify(this.config));
  
  // 替换所有 container 类型 middleware 的 endpoint 为 localhost
  for (const [componentName, component] of Object.entries(hostConfig.components)) {
    for (const [middlewareName, middleware] of Object.entries(component.middlewareDependencies || {})) {
      if (middleware.deploymentType === 'container') {
        for (const [endpointName, endpointDef] of Object.entries(middleware.endpoints)) {
          if (endpointDef.value) {
            // 替换为 localhost，考虑端口映射
            const mappingKey = `${middlewareName.toLowerCase()}-${endpointName}`;
            const localPort = localPortMapping?.get(mappingKey) || endpointDef.port;
            endpointDef.value = `${endpointDef.protocol}://localhost:${localPort}`;
          }
        }
      }
    }
  }
  
  // 保存文件
  // ...
}
```

**测试计划：**
- 单元测试：验证多 endpoint 填充逻辑
- 单元测试：验证 host config 生成时多 endpoint 的正确替换
- 集成测试：验证完整流程

---

### TODO 7: 更新 Terraform Generator (`src/terraform/generator.ts`)

**改造内容：**
1. 为每个需要暴露的 endpoint 生成独立的 Kubernetes Service
2. 根据 `publicAccess` 设置 ServiceType（`LoadBalancer` vs `ClusterIP/NodePort`）
3. 生成 endpoint 对应的 Terraform output

**关键代码变更：**
```typescript
/**
 * 生成单个中间件的配置 - 支持多 Service
 */
private async generateMiddlewareConfig(
  middleware: ContainerMiddleware,
  namespace: string,
  endpointDefinitions: EndpointSpec[],
  dependencyRefs: Map<string, string>
): Promise<void> {
  // ... 生成 Deployment（与现有逻辑类似）...
  
  // 为每个 endpoint 生成独立的 Service
  let servicesConfig = '';
  for (const endpoint of endpointDefinitions) {
    const serviceSuffix = endpoint.name === 'main' ? 'svc' : `${endpoint.name}-svc`;
    const serviceName = `${middleware.middlewareName.toLowerCase()}-${serviceSuffix}`;
    
    const serviceType = this.getServiceTypeForEndpoint(endpoint);
    
    servicesConfig += `
module "service_${serviceName.replace(/-/g, '_')}" {
  source = "${this.modulesPath}/kubernetes/service"

  service_name = "${serviceName}"
  namespace    = module.namespace.namespace_name
  app_name     = "${middleware.middlewareName.toLowerCase()}"

  ports = [
    {
      name        = "${endpoint.name}"
      port        = ${endpoint.port}
      target_port = ${endpoint.port}
      protocol    = "TCP"
    }
  ]

  service_type              = "${serviceType}"
  wait_for_load_balancer    = ${endpoint.publicAccess && this.shouldWaitForLoadBalancer()}

  depends_on = [
    module.middleware_${middleware.middlewareName.toLowerCase()}
  ]
}
`;
  }
  
  // 写入文件
  // ...
}

/**
 * 根据 endpoint 配置确定 ServiceType
 */
private getServiceTypeForEndpoint(endpoint: EndpointSpec): string {
  const provider = this.config.provider || 'local';
  
  if (provider === 'local') {
    return 'NodePort';  // 本地环境统一用 NodePort
  }
  
  // 云环境根据 publicAccess 决定
  return endpoint.publicAccess ? 'LoadBalancer' : 'ClusterIP';
}
```

**测试计划：**
- 单元测试：验证多 Service 生成的 Terraform 配置正确
- 单元测试：验证 publicAccess 影响 ServiceType
- 集成测试：验证生成的 Terraform 配置可以 validate

---

### TODO 8: 更新 Deployer (`src/deployer.ts`)

**改造内容：**
1. 更新 `setupPortForwards()` 为每个 endpoint 创建 port-forward
2. 更新 `localPortMapping` 处理多端口映射
3. 更新端口冲突检测和分配逻辑

**关键代码变更：**
```typescript
/**
 * 为本地环境设置 port-forward - 支持多 endpoint
 */
private async setupPortForwards(): Promise<void> {
  // ...
  
  // 收集所有需要 port-forward 的服务
  for (const [componentName, component] of Object.entries(this.config.components)) {
    for (const [middlewareName, middleware] of Object.entries(component.middlewareDependencies || {})) {
      if (middleware.deploymentType === 'container') {
        // 遍历所有 endpoint
        for (const [endpointName, endpointDef] of Object.entries(middleware.endpoints)) {
          const containerPort = endpointDef.port;
          const localPort = allocateLocalPort(containerPort);
          
          // Service 名称格式与 generator 一致
          const serviceSuffix = endpointName === 'main' ? 'svc' : `${endpointName}-svc`;
          const serviceName = `${middlewareName.toLowerCase()}-${serviceSuffix}`;
          
          portForwards.push({
            service: serviceName,
            deployment: middlewareName.toLowerCase(),
            containerPort,
            localPort,
            endpointKey: `${middlewareName.toLowerCase()}-${endpointName}`
          });
          
          // 记录端口映射
          this.localPortMapping.set(`${middlewareName.toLowerCase()}-${endpointName}`, localPort);
        }
      }
    }
  }
  
  // ... 后续 port-forward 逻辑 ...
}
```

**测试计划：**
- 集成测试：验证多端口 port-forward 正确建立
- 集成测试：验证端口冲突检测和分配

---

### TODO 9: 更新配置文件格式

**涉及文件：**
- `config/application.json`
- `config/deploy.dev.json`
- `config/deploy.prod.json`（示例）

**application.json 变更：**
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

**deploy.dev.json 变更：**
```json
{
  "middlewareDependencies": {
    "temporal": {
      "deploymentType": "container",
      "use": "temporal",
      "endpoints": {
        "main": {
          "publicAccess": false
        },
        "admin": {
          "publicAccess": true
        }
      },
      "config": { /* ... */ }
    }
  }
}
```

**测试计划：**
- 验证 config 生成器正确合并 endpoint 配置
- 验证 deploy-tool 正确解析新格式

---

### TODO 10: 更新配置生成器 (`config/generate-config.ts`)

**改造内容：**
1. 合并 `application.json` 和 `deploy.{env}.json` 中的 endpoints 配置
2. 验证 endpoint 配置的完整性

**测试计划：**
- 单元测试：验证 endpoint 配置合并逻辑
- 集成测试：验证生成的 app.config.json 格式正确

---

### TODO 11: 更新文档

**涉及文件：**
- `docs/how-to-write-deploy-json.md`
- `docs/how-to-write-application-json.md`
- `docs/endpoint-generation.md`
- `docs/how-to-add-middleware.md`
- `README.md`

**文档更新内容：**
1. 更新配置格式说明，使用新的 endpoints 结构
2. 添加多 endpoint 配置示例（以 Temporal 为例）
3. 说明 publicAccess 配置对 Service 类型的影响
4. 更新端口映射相关说明

**测试计划：**
- Review 文档确保示例可运行
- 验证文档中的配置示例与实际代码一致

---

### TODO 12: 更新测试用例

**涉及文件：**
- `tests/unit/endpoint-manager.test.ts`
- `tests/unit/terraform-generator.test.ts`
- `tests/unit/local-provider.test.ts`
- `tests/middleware-config.test.ts`
- `tests/integration/*.test.ts`

**测试更新内容：**
1. 更新测试数据使用新的 endpoints 结构
2. 新增多 endpoint 场景测试
3. 新增 publicAccess 配置测试
4. 新增 Temporal 多 endpoint 专项测试

**测试计划：**
- 运行 `npm test` 确保所有测试通过
- 代码覆盖率不低于现有水平

---

## 4. 实施顺序与依赖关系

```
TODO 1 (types.ts)
    ↓
TODO 2 (middleware/base.ts)
    ↓
TODO 3 (temporal.ts) + TODO 4 (其他 middleware)
    ↓
TODO 5 (providers)
    ↓
TODO 6 (endpoint-manager.ts)
    ↓
TODO 7 (terraform/generator.ts)
    ↓
TODO 8 (deployer.ts)
    ↓
TODO 9 (配置文件) + TODO 10 (config generator)
    ↓
TODO 11 (文档) + TODO 12 (测试)
```

---

## 5. 测试策略总览

### 5.1 单元测试
| 测试点 | 文件 | 验证内容 |
|--------|------|----------|
| 类型定义 | - | 编译通过 |
| Middleware 配置 | `middleware-config.test.ts` | `getEndpointDefinitions()` 返回正确 |
| Provider | `local-provider.test.ts` | 多 endpoint 解析正确 |
| EndpointManager | `endpoint-manager.test.ts` | 多 endpoint 填充/验证 |
| TerraformGenerator | `terraform-generator.test.ts` | 生成多 Service 配置 |

### 5.2 集成测试
| 测试点 | 文件 | 验证内容 |
|--------|------|----------|
| 完整部署流程 | `deployer.test.ts` | Temporal 多 endpoint 部署 |
| Port-forward | `deployer.test.ts` | 多端口映射正确 |
| 配置生成 | `config-generator.test.ts` | endpoints 配置合并 |

### 5.3 手动验证
1. 本地环境部署 Temporal，验证 7233 和 8080 端口都可访问
2. 验证 admin endpoint 设置 publicAccess 后使用 LoadBalancer（云环境）
3. 验证 port-forward 进程正确建立多个端口转发

---

## 6. 风险与注意事项

### 6.1 破坏性变更
- 此次改造是**非向后兼容**的
- 所有现有配置文件需要更新
- 需要在文档中明确标注版本变更

### 6.2 Service 命名约定
- main endpoint: `{middlewareName}-svc`
- 其他 endpoint: `{middlewareName}-{endpointName}-svc`
- 确保命名符合 K8s 规范（小写、连字符）

### 6.3 端口冲突处理
- 本地环境多个 middleware 可能使用相同端口
- `allocateLocalPort()` 需要正确处理冲突
- 端口映射需要记录并传递给 host config 生成

---

## 7. 文档版本

- **版本**: v1.0.0
- **创建日期**: 2025-12-07
- **作者**: AI Assistant

