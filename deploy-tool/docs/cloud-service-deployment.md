# 云服务自动部署指南

本文档介绍如何使用 deploy-tool 的云服务自动部署功能，以及如何为新的中间件添加云服务支持。

## 目录

- [功能概述](#功能概述)
- [使用方法](#使用方法)
- [支持的云服务](#支持的云服务)
- [如何新增云服务支持](#如何新增云服务支持)
- [高级配置](#高级配置)
- [故障排查](#故障排查)

---

## 功能概述

### 背景

在使用云服务时，传统方式需要：
1. 手动在云平台创建服务（如 RDS、Redis、Kafka 等）
2. 手动获取 endpoint 并填写到配置文件
3. 管理和维护云资源

这个过程繁琐且容易出错。

### 解决方案

deploy-tool 现在支持**云服务自动部署**：

```json
{
  "provider": "volcengine",
  "components": {
    "main": {
      "middlewareDependencies": {
        "mainDb": {
          "deploymentType": "cloud",
          // ❌ 不需要手动配置 endpoint
          "config": {
            "username": "lituser",
            "password": "secure-password",
            "database": "litdb"
          }
        }
      }
    }
  }
}
```

**当 `deploymentType` 为 `cloud` 且没有 `endpoint` 字段时，deploy-tool 将：**
1. 自动调用云平台 API 创建服务
2. 等待服务就绪
3. 获取 endpoint 并自动填充到配置

### 核心特性

- ✅ **自动部署**：无需手动创建云服务
- ✅ **幂等性**：重复部署时自动检测已有资源
- ✅ **多云支持**：支持火山引擎、AWS、阿里云
- ✅ **可扩展**：易于添加新的云服务支持

---

## 使用方法

### 基本用法

#### 步骤 1：配置中间件为 cloud 类型

在 `deploy.{env}.json` 中配置：

```json
{
  "provider": "volcengine",
  "environment": "prod",
  "components": {
    "main": {
      "middlewareDependencies": {
        "mainDb": {
          "deploymentType": "cloud",
          // 不需要 endpoint 字段
          "config": {
            "username": "lituser",
            "password": "secure-password",
            "database": "litdb"
          }
        }
      }
    }
  }
}
```

#### 步骤 2：执行部署

```bash
cd deploy-tool
npm run deploy -- --env prod
```

部署过程中会自动：
1. 检测需要部署的云服务
2. 调用云平台 API 创建服务
3. 等待服务就绪
4. 将 endpoint 填充到 `app.config.json`

#### 步骤 3：查看结果

部署完成后，查看 `app.config.json`：

```json
{
  "components": {
    "main": {
      "middlewareDependencies": {
        "mainDb": {
          "endpoint": "postgres-lit-prod-maindb.rds.cn-beijing.volcengineapi.com:5432",
          // endpoint 已自动填充
        }
      }
    }
  }
}
```

### 使用现有云服务

如果想使用已有的云服务，只需配置 `endpoint`：

```json
{
  "mainDb": {
    "deploymentType": "cloud",
    "endpoint": "my-existing-postgres.rds.cn-beijing.volcengineapi.com:5432",
    // 有 endpoint，跳过自动部署
    "config": { ... }
  }
}
```

**规则：有 endpoint = 使用现有服务，无 endpoint = 自动部署**

---

## 支持的云服务

### 火山引擎（Volcengine）

| 中间件类型 | 云服务名称 | 服务类型 | 默认规格 | 文档 |
|-----------|----------|---------|---------|------|
| `postgresql` | RDS PostgreSQL | PostgreSQL | `rds.postgres.s1.medium` | [文档](https://www.volcengine.com/docs/6313/79536) |
| `mysql` | RDS MySQL | MySQL | `rds.mysql.s1.medium` | [文档](https://www.volcengine.com/docs/6313/79536) |
| `redis` | Redis | Redis | `redis.shard.1g.basic` | [文档](https://www.volcengine.com/docs/6293/79761) |
| `kafka` | Kafka | Kafka | `kafka.20xrate.hw` | [文档](https://www.volcengine.com/docs/6431/71907) |
| `minio` | TOS | ObjectStorage | `standard` | [文档](https://www.volcengine.com/docs/6349/74822) |
| `mongodb` | MongoDB | MongoDB | `mongo.shard.1c2g` | [文档](https://www.volcengine.com/docs/6400/79433) |
| `elasticsearch` | Elasticsearch | Elasticsearch | `es.x4.large` | [文档](https://www.volcengine.com/docs/6367/79429) |

### AWS

| 中间件类型 | 云服务名称 | 服务类型 | 默认规格 | 文档 |
|-----------|----------|---------|---------|------|
| `postgresql` | RDS PostgreSQL | PostgreSQL | `db.t3.medium` | [文档](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html) |
| `mysql` | RDS MySQL | MySQL | `db.t3.medium` | [文档](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_MySQL.html) |
| `redis` | ElastiCache Redis | Redis | `cache.t3.medium` | [文档](https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/WhatIs.html) |
| `kafka` | MSK | Kafka | `kafka.m5.large` | [文档](https://docs.aws.amazon.com/msk/latest/developerguide/what-is-msk.html) |
| `minio` | S3 | ObjectStorage | `standard` | [文档](https://docs.aws.amazon.com/s3/index.html) |
| `mongodb` | DocumentDB | MongoDB | `db.t3.medium` | [文档](https://docs.aws.amazon.com/documentdb/) |
| `elasticsearch` | OpenSearch | Elasticsearch | `t3.medium.search` | [文档](https://docs.aws.amazon.com/opensearch-service/) |

### 阿里云（Aliyun）

| 中间件类型 | 云服务名称 | 服务类型 | 默认规格 | 文档 |
|-----------|----------|---------|---------|------|
| `postgresql` | RDS PostgreSQL | PostgreSQL | `pg.n2.medium.1` | [文档](https://help.aliyun.com/product/26090.html) |
| `mysql` | RDS MySQL | MySQL | `mysql.n2.medium.1` | [文档](https://help.aliyun.com/product/26090.html) |
| `redis` | Redis | Redis | `redis.master.small.default` | [文档](https://help.aliyun.com/product/26340.html) |
| `kafka` | Kafka | Kafka | `alikafka.hw.2xlarge` | [文档](https://help.aliyun.com/product/68151.html) |
| `minio` | OSS | ObjectStorage | `standard` | [文档](https://help.aliyun.com/product/31815.html) |
| `mongodb` | MongoDB | MongoDB | `dds.mongo.mid` | [文档](https://help.aliyun.com/product/60953.html) |
| `elasticsearch` | Elasticsearch | Elasticsearch | `elasticsearch.sn1ne.large` | [文档](https://help.aliyun.com/product/57736.html) |

---

## 如何新增云服务支持

### 场景

当你需要为一个新的中间件类型（如 ClickHouse）添加云服务支持时，可以按照以下步骤操作。

### 步骤 1：添加云服务映射

在对应的 Provider 云服务配置文件中添加映射。

**示例：为火山引擎添加 ClickHouse 支持**

编辑文件：`src/providers/cloud-services/volcengine.ts`

```typescript
export const VolcengineCloudServices: ProviderCloudServices = {
  providerName: 'volcengine',
  services: {
    // ... 现有的服务 ...
    
    /**
     * ClickHouse
     * 使用火山引擎 ClickHouse
     */
    clickhouse: {
      serviceName: 'ClickHouse',
      serviceType: 'ClickHouse',
      defaultSpec: 'clickhouse.s1.medium',
      deployerName: 'volcengine-clickhouse',
      supportAutoDeploy: true,
      docUrl: 'https://www.volcengine.com/docs/clickhouse'
    }
  }
};
```

**字段说明：**

| 字段 | 说明 | 示例 |
|------|------|------|
| `serviceName` | 云服务名称 | `"ClickHouse"` |
| `serviceType` | 服务类型 | `"ClickHouse"` |
| `defaultSpec` | 默认规格 | `"clickhouse.s1.medium"` |
| `deployerName` | 部署器名称 | `"volcengine-clickhouse"` |
| `supportAutoDeploy` | 是否支持自动部署 | `true` |
| `docUrl` | 文档链接（可选） | 云服务文档 URL |

### 步骤 2：创建云服务部署器（可选）

如果需要真实部署（不使用 Mock），创建部署器实现。

创建文件：`src/cloud-services/volcengine/clickhouse.ts`

```typescript
import { BaseCloudServiceDeployer } from '../base.js';
import { CloudServiceDeployParams, CloudServiceDeployResult } from '../types.js';

export class VolcengineClickHouseDeployer extends BaseCloudServiceDeployer {
  
  getName(): string {
    return 'volcengine-clickhouse';
  }

  async deploy(params: CloudServiceDeployParams): Promise<CloudServiceDeployResult> {
    this.log(`部署 ClickHouse 实例: ${params.resourceName}`);
    
    try {
      // 1. 调用火山引擎 ClickHouse API 创建实例
      const instance = await this.createClickHouseInstance(params);
      
      // 2. 等待实例就绪
      const endpoint = await this.waitForReady(instance.id);
      
      // 3. 返回结果
      return {
        success: true,
        endpoint,
        resourceId: instance.id,
        metadata: {
          instanceId: instance.id,
          region: params.cloudSpec?.region || 'cn-beijing'
        }
      };
    } catch (error: any) {
      this.logError(`部署失败: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async exists(resourceName: string): Promise<{ exists: boolean; endpoint?: string; resourceId?: string }> {
    // 实现检查逻辑
    // 调用 API 查询是否存在同名实例
    return { exists: false };
  }

  async destroy(resourceId: string): Promise<void> {
    // 实现销毁逻辑
    this.log(`销毁 ClickHouse 实例: ${resourceId}`);
  }

  private async createClickHouseInstance(params: CloudServiceDeployParams): Promise<any> {
    // 调用火山引擎 OpenAPI SDK
    // 参考文档实现
  }

  private async waitForReady(instanceId: string): Promise<string> {
    // 轮询实例状态，等待 Running
    // 返回 endpoint
  }
}
```

### 步骤 3：注册部署器

在工厂类中注册新的部署器。

编辑文件：`src/cloud-services/factory.ts`

```typescript
private static createVolcengineDeployer(middlewareType: string): BaseCloudServiceDeployer {
  switch (middlewareType.toLowerCase()) {
    case 'clickhouse':
      return new VolcengineClickHouseDeployer();
    
    // ... 其他类型 ...
    
    default:
      // 默认返回 Mock 部署器
      return new MockCloudServiceDeployer();
  }
}
```

### 步骤 4：更新文档

在本文档的"支持的云服务"章节添加新增的服务。

### 步骤 5：测试

创建测试配置并验证：

```json
{
  "provider": "volcengine",
  "components": {
    "analytics": {
      "middlewareDependencies": {
        "analyticsDb": {
          "deploymentType": "cloud",
          "config": {
            "username": "clickhouse_user",
            "password": "secure_password"
          }
        }
      }
    }
  }
}
```

执行部署：

```bash
npm run deploy -- --env test
```

---

## 高级配置

### 自定义云服务规格

可以在配置中指定云服务的规格：

```json
{
  "mainDb": {
    "deploymentType": "cloud",
    "config": {
      "username": "lituser",
      "password": "secure-password",
      "database": "litdb",
      // 自定义云服务规格
      "cloudSpec": {
        "instanceType": "rds.postgres.s1.large",  // 自定义规格
        "storage": 200,                            // 存储大小（GB）
        "region": "cn-beijing",                    // 区域
        "availabilityZone": "cn-beijing-a"         // 可用区
      }
    }
  }
}
```

### 资源命名规则

云资源自动命名格式：`{app}-{env}-{middleware}`

示例：
- `lit-dev-maindb` (开发环境的主数据库)
- `lit-prod-cache` (生产环境的缓存)
- `lit-test-messagequeue` (测试环境的消息队列)

### 资源标签

自动为云资源添加标签，用于管理和识别：

```json
{
  "app": "lit",
  "environment": "prod",
  "managedBy": "deploy-tool",
  "component": "main",
  "middleware": "mainDb",
  "middlewareType": "postgresql"
}
```

---

## 故障排查

### 问题 1：Provider 不支持某个中间件的云服务

**错误信息：**
```
Provider volcengine 不支持 clickhouse 的云服务自动部署
```

**解决方法：**
1. 检查该 Provider 的云服务映射配置
2. 如果确实不支持，需要手动配置 endpoint
3. 或者按照"如何新增云服务支持"添加支持

### 问题 2：云服务部署失败

**错误信息：**
```
部署云服务 mainDb 失败: API调用失败
```

**解决方法：**
1. 检查云平台 API 凭证是否正确
2. 检查网络连接
3. 检查配置参数是否符合云平台要求
4. 查看详细错误日志

### 问题 3：云服务创建成功但 endpoint 为空

**原因：**
云服务可能需要较长时间才能分配 endpoint

**解决方法：**
1. 等待更长时间
2. 登录云平台控制台手动查看
3. 手动配置 endpoint

### 问题 4：重复部署时重复创建资源

**原因：**
部署器的 `exists()` 方法未正确实现

**解决方法：**
1. 检查部署器代码
2. 确保 `exists()` 方法正确查询云资源
3. 使用统一的命名规则和标签

---

## 最佳实践

### 1. 环境隔离

不同环境使用不同的云资源：

```
开发环境: lit-dev-maindb
测试环境: lit-test-maindb
生产环境: lit-prod-maindb
```

### 2. 使用 Mock 模式进行测试

在开发和测试时使用 Mock 模式，避免创建真实云资源：

```typescript
// 在 deployer.ts 中
const deployer = CloudServiceDeployerFactory.create(
  providerName,
  middlewareType,
  true  // useMock = true
);
```

### 3. 配置版本控制

不要将包含敏感信息的配置提交到版本控制：

```gitignore
# .gitignore
config/deploy.prod.json
config/deploy.*.local.json
```

### 4. 监控和日志

- 记录所有云服务部署操作
- 监控云资源使用情况
- 定期检查未使用的资源

### 5. 成本控制

- 开发和测试环境使用小规格实例
- 定期清理不用的资源
- 使用资源标签进行成本分析

---

## 开发路线图

### 当前状态（v1.0）

- ✅ 基础框架和接口定义
- ✅ Mock 部署器实现
- ✅ 云服务映射配置（火山引擎、AWS、阿里云）
- ✅ 集成到部署流程

### 计划中（v1.1）

- [ ] 火山引擎真实部署器实现
  - [ ] RDS PostgreSQL
  - [ ] Redis
  - [ ] TOS
  - [ ] Kafka

### 未来（v2.0）

- [ ] AWS 真实部署器实现
- [ ] 阿里云真实部署器实现
- [ ] 云服务监控和告警
- [ ] 成本估算和优化建议
- [ ] 多区域部署支持

---

## 相关文档

- [deploy-tool README](../README.md)
- [如何编写 deploy.json](./how-to-write-deploy-json.md)
- [云服务提供商配置指南](./cloud-provider-configuration.md)
- [如何新增中间件](./how-to-add-middleware.md)

---

**文档版本**: v1.0.0  
**最后更新**: 2025-11-23

