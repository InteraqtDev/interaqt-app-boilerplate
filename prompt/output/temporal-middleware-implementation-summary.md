# Temporal Middleware 实现总结

## 任务概述

为 asyncTask component 添加 temporal middleware，使用 temporal 的一体部署模式，通过 deploy-tool 完成本地部署。

## 实现内容

### 1. 创建 Temporal Middleware 配置类

**文件**: `deploy-tool/src/terraform/middleware/implementations/temporal.ts`

实现了 `TemporalMiddlewareConfig` 类，包含：
- 镜像配置：使用 `temporalio/auto-setup` 镜像
- 容器规格：gRPC 端口 7233，Web UI 端口 8080
- 环境变量：PostgreSQL 数据库连接配置
- Init Container：等待 PostgreSQL 就绪后再启动 Temporal
- 资源限制：2 CPU / 2Gi 内存

### 2. 注册到 Middleware 工厂

**文件**: `deploy-tool/src/terraform/middleware/factory.ts`

在工厂中注册了 temporal middleware：
```typescript
this.register("temporal", () => new TemporalMiddlewareConfig());
```

### 3. 更新配置文件

**application.json 变更**:
- 为 asyncTask 组件添加 `temporalDb` 中间件（PostgreSQL 数据库）
- 为 asyncTask 组件添加 `temporal` 中间件依赖

**deploy.dev.json 变更**:
- 配置 temporalDb 使用 PostgreSQL 14
- 配置 temporal 使用 auto-setup:1.23.1
- 设置数据库连接参数（使用引用语法引用 temporalDb 的配置）

### 4. 修复的问题

在实现过程中遇到并解决了以下问题：

1. **Endpoint 命名不一致**: LocalProvider 使用 `middleware.use` 而 TerraformGenerator 使用 `middlewareName`，导致服务名不匹配。修复后统一使用 `middlewareName.toLowerCase()`

2. **DB 类型标识**: auto-setup 镜像需要 `postgresql` 而不是 `postgres`

3. **版本兼容性**: auto-setup 1.24.1 存在持久化配置问题，切换到 1.23.1 后正常运行

4. **Visibility 数据库**: 确保 PostgreSQL 初始化时创建 `temporal_visibility` 数据库

## 部署验证

### 部署命令

```bash
cd deploy-tool
npm run build
npm run deploy -- --env dev --force
```

### 验证结果

```bash
kubectl get pods -n lit-dev
```

输出：
```
NAME                             READY   STATUS    RESTARTS   AGE
temporal-66747fb5c8-8ghlr        1/1     Running   0          97s
temporaldb-6dc76bb554-bvx52      1/1     Running   0          97s
```

### 服务暴露

```bash
kubectl get svc -n lit-dev | grep temporal
```

输出：
```
temporal-svc        NodePort   10.100.72.125    <none>        7233:31518/TCP,8080:31719/TCP
temporaldb-svc      NodePort   10.102.150.238   <none>        5432:30119/TCP
```

- **gRPC 端口**: 7233 (NodePort: 31518)
- **Web UI 端口**: 8080 (NodePort: 31719)

## 配置说明

### Temporal 配置参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `db` | 数据库类型 | `postgresql` |
| `postgresSeeds` | PostgreSQL 主机地址 | 使用引用语法 |
| `postgresUser` | 数据库用户名 | `temporal` |
| `postgresPwd` | 数据库密码 | `temporal` |
| `logLevel` | 日志级别 | `info` |
| `defaultNamespace` | 默认命名空间 | `default` |

### 版本说明

- **推荐版本**: 1.23.1（已验证稳定）
- **镜像**: temporalio/auto-setup

## 后续使用

### Worker 连接配置

应用中的 Worker 需要使用以下配置连接 Temporal：

```typescript
import { NativeConnection, Worker } from '@temporalio/worker';

const connection = await NativeConnection.connect({
  address: 'temporal-svc.lit-dev.svc.cluster.local:7233',
});

const worker = await Worker.create({
  connection,
  namespace: 'default',
  taskQueue: 'your-task-queue',
  workflowsPath: require.resolve('./workflows'),
  activities,
});
```

### Client 连接配置

```typescript
import { Connection, Client } from '@temporalio/client';

const connection = await Connection.connect({
  address: 'temporal-svc.lit-dev.svc.cluster.local:7233',
});

const client = new Client({
  connection,
  namespace: 'default',
});
```

## 文件变更列表

1. `deploy-tool/src/terraform/middleware/implementations/temporal.ts` - 新增
2. `deploy-tool/src/terraform/middleware/factory.ts` - 修改
3. `deploy-tool/src/terraform/middleware/index.ts` - 修改
4. `deploy-tool/src/providers/local.ts` - 修改（修复 endpoint 命名）
5. `config/application.json` - 修改
6. `config/deploy.dev.json` - 修改

---

**完成日期**: 2025-12-01

