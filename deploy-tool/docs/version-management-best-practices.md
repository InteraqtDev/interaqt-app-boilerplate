# 中间件版本管理最佳实践

## 概述

在部署配置中，正确管理中间件的版本至关重要，可以确保不同环境和不同时间部署的一致性和可复现性。

## 版本管理原则

### ❌ 不推荐：使用 `latest` 标签

```json
{
  "centrifugo": {
    "version": "latest"  // ❌ 不推荐
  }
}
```

**问题**：
- 不同时间部署会得到不同的版本
- 不同环境可能运行不同的版本
- 无法回滚到特定版本
- 难以排查版本相关的问题
- 违反基础设施即代码（IaC）的可复现性原则

### ✅ 推荐：使用固定版本号

```json
{
  "centrifugo": {
    "version": "v6.5.1"  // ✅ 推荐
  }
}
```

**优势**：
- 保证部署的可复现性
- 版本升级可控且可追踪
- 便于回滚到已知的稳定版本
- 易于排查和定位问题
- 符合 GitOps 最佳实践

## 当前项目配置

### 已配置的中间件版本

| 中间件 | 版本 | 镜像 | 说明 |
|--------|------|------|------|
| **PostgreSQL** | `16` | `postgres:16` | 主数据库 |
| **MinIO** | `RELEASE.2024-11-07T00-52-20Z` | `minio/minio:RELEASE.2024-11-07T00-52-20Z` | 对象存储 |
| **Kafka** | `3.8.1` | `apache/kafka:3.8.1` | 消息队列 |
| **Redis** | `7.0.15` | `redis:7.0.15` | 缓存/队列 |
| **Centrifugo** | `v6.5.1` | `centrifugo/centrifugo:v6.5.1` | 实时通信 |

### 配置示例

`config/deploy.dev.json`:

```json
{
  "components": {
    "main": {
      "middlewareDependencies": {
        "mainDb": {
          "deploymentType": "container",
          "use": "postgresql",
          "version": "16",
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
          "version": "RELEASE.2024-11-07T00-52-20Z",
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
          "version": "3.8.1",
          "replicas": 1,
          "config": {
            "instanceId": "local-kafka",
            "username": "",
            "password": "",
            "ssl": false
          }
        }
      }
    },
    "communication": {
      "middlewareDependencies": {
        "redis": {
          "deploymentType": "container",
          "use": "redis",
          "version": "7.0.15",
          "replicas": 1,
          "config": {
            "password": "redis123456"
          }
        },
        "centrifugo": {
          "deploymentType": "container",
          "use": "centrifugo",
          "version": "v6.5.1",
          "replicas": 1,
          "dependencies": ["components.communication.middlewareDependencies.redis"],
          "config": {
            "tokenHmacSecretKey": "your-centrifugo-secret-key-change-in-production",
            "engine": "redis",
            "redisAddress": "${ref:components.communication.middlewareDependencies.redis.endpoint}",
            "redisPassword": "${ref:components.communication.middlewareDependencies.redis.config.password}",
            "redisDb": "0",
            "allowedOrigins": ["http://localhost:3000", "http://localhost:5173"]
          }
        }
      }
    }
  }
}
```

## 版本号规范

### 1. application.json - 版本范围

`config/application.json` 中定义的是**版本需求**（语义化版本范围）：

```json
{
  "middlewareDependencies": {
    "mainDb": {
      "type": "postgresql",
      "version": ">=14.0.0",  // 版本范围，表示需求
      "publicAccess": false,
      "requiredFields": ["username", "password", "database"]
    }
  }
}
```

**作用**：
- 表达应用对中间件的最低版本要求
- 用于验证部署配置是否满足应用需求
- 不直接用于 Docker 镜像标签

### 2. deploy.{env}.json - 具体版本

`config/deploy.{env}.json` 中定义的是**具体版本**：

```json
{
  "middlewareDependencies": {
    "mainDb": {
      "deploymentType": "container",
      "use": "postgresql",
      "version": "16",  // 具体版本，用于 Docker 镜像标签
      "config": { ... }
    }
  }
}
```

**作用**：
- 指定实际部署的中间件版本
- 直接用作 Docker 镜像标签
- 必须满足 `application.json` 中定义的版本范围

## 版本升级流程

### 1. 查找最新稳定版本

```bash
# 方法 1: Docker Hub
docker pull <image>:latest
docker inspect <image>:latest | grep version

# 方法 2: 官方文档
# 访问中间件官网查看最新稳定版本

# 方法 3: GitHub Release
# 查看官方 GitHub 仓库的 Releases 页面
```

### 2. 测试新版本

```bash
# 在开发环境测试
# 更新 deploy.dev.json
vim config/deploy.dev.json

# 重新部署
cd deploy-tool
npm run destroy -- --env dev
npm run deploy -- --env dev

# 验证功能
# 运行测试套件
# 检查日志
```

### 3. 更新生产配置

```bash
# 确认测试通过后，更新生产配置
vim config/deploy.prod.json

# 部署到生产环境
npm run deploy -- --env prod
```

### 4. 记录变更

```bash
# 提交到版本控制
git add config/deploy.*.json
git commit -m "chore: upgrade centrifugo to v6.5.1"
git push
```

## 不同中间件的版本格式

### PostgreSQL
- 格式: 主版本号（如 `16`, `15`, `14`）
- 示例: `postgres:16`
- 说明: 使用主版本号，自动获取最新的补丁版本

### Redis
- 格式: 完整版本号（如 `7.0.15`）
- 示例: `redis:7.0.15`
- 说明: 建议使用完整版本号以确保一致性

### Kafka
- 格式: 语义化版本（如 `3.8.1`）
- 示例: `apache/kafka:3.8.1`
- 说明: 使用完整的三位版本号

### MinIO
- 格式: Release 标签（如 `RELEASE.2024-11-07T00-52-20Z`）
- 示例: `minio/minio:RELEASE.2024-11-07T00-52-20Z`
- 说明: 使用官方的 Release 标签

### Centrifugo
- 格式: 带 `v` 前缀的语义化版本（如 `v6.5.1`）
- 示例: `centrifugo/centrifugo:v6.5.1`
- 说明: 保留 `v` 前缀

## 验证版本配置

### 检查生成的 Terraform 配置

```bash
# 查看生成的镜像标签
cat deploy-tool/terraform/generated/middleware-*.tf | grep image

# 示例输出：
# image = "postgres:16"
# image = "minio/minio:RELEASE.2024-11-07T00-52-20Z"
# image = "apache/kafka:3.8.1"
# image = "redis:7.0.15"
# image = "centrifugo/centrifugo:v6.5.1"
```

### 检查运行中的 Pod

```bash
# 查看 Pod 使用的镜像
kubectl get pods -n lit-dev -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[0].image}{"\n"}{end}'

# 查看 Pod 日志中的版本信息
kubectl logs -n lit-dev <pod-name> | grep version
```

## 常见问题

### Q1: 版本范围符号导致部署失败

**错误信息**:
```
Failed to apply default image tag "postgres:>=14.0.0": 
couldn't parse image name "postgres:>=14.0.0": invalid reference format
```

**原因**: `application.json` 中的版本范围（如 `>=14.0.0`）被直接用作 Docker 镜像标签。

**解决方法**: 在 `deploy.{env}.json` 中添加具体的 `version` 字段：

```json
{
  "mainDb": {
    "version": "16",  // 添加这一行
    "deploymentType": "container",
    "use": "postgresql"
  }
}
```

### Q2: 如何选择合适的版本？

**建议**:
1. 优先使用最新的稳定版本
2. 避免使用 beta/rc/alpha 等测试版本
3. 查看官方文档的推荐版本
4. 考虑长期支持（LTS）版本
5. 在测试环境充分验证后再用于生产

### Q3: 何时需要升级版本？

**升级场景**:
- 修复安全漏洞
- 获取新功能
- 性能优化
- Bug 修复
- 依赖其他组件升级

**注意事项**:
- 阅读升级文档和变更日志
- 检查是否有破坏性变更
- 在非生产环境先测试
- 准备回滚方案

## 版本管理检查清单

部署前检查：

- [ ] 所有中间件都指定了具体版本
- [ ] 没有使用 `latest` 标签
- [ ] 版本号格式正确（无版本范围符号）
- [ ] 版本满足 `application.json` 的要求
- [ ] 已在测试环境验证
- [ ] 版本配置已提交到版本控制
- [ ] 团队成员知晓版本变更

## 参考资料

### 官方文档
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Redis Docker Hub](https://hub.docker.com/_/redis)
- [Kafka Docker Hub](https://hub.docker.com/r/apache/kafka)
- [MinIO Docker Hub](https://hub.docker.com/r/minio/minio)
- [Centrifugo Docker Hub](https://hub.docker.com/r/centrifugo/centrifugo)

### 最佳实践
- [Docker 镜像标签最佳实践](https://docs.docker.com/develop/dev-best-practices/)
- [Kubernetes 容器镜像](https://kubernetes.io/docs/concepts/containers/images/)
- [GitOps 原则](https://www.gitops.tech/)

---

**文档版本**: v1.0.0  
**最后更新**: 2025-11-23  
**维护者**: Deploy Tool Team

