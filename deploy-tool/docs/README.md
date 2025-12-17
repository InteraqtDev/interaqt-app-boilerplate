# Deploy-Tool 文档中心

欢迎使用 deploy-tool 文档！这里包含了使用和扩展 deploy-tool 的所有信息。

## 📚 文档目录

### 快速开始

- [主 README](../README.md) - 项目概述和快速开始指南

### 配置指南

- [如何编写 application.json](./how-to-write-application-json.md)
  - 应用层配置完整指南
  - 组件、中间件、外部服务配置
  - 配置验证规则
  - 最佳实践和常见问题

- [如何编写 deploy.{env}.json](./how-to-write-deploy-json.md)
  - 运维层配置完整指南
  - 开发/测试/生产环境配置
  - 部署类型选择
  - 常见配置场景

- [云服务提供商配置指南](./cloud-provider-configuration.md) 
  - 本地开发环境配置
  - 火山引擎配置
  - 实现自定义 Provider
  - 常见配置场景
  - 故障排查

### 开发指南

- [云服务自动部署指南](./cloud-service-deployment.md)
  - 云服务自动部署功能说明
  - 支持的云服务列表
  - 如何新增云服务支持
  - 高级配置和故障排查

- [如何新增中间件](./how-to-add-middleware.md)
  - 添加中间件的完整流程
  - Redis 示例
  - 测试方法
  - 常见问题

## 🎯 按使用场景查找

### 我是第一次配置项目

1. 阅读 [如何编写 application.json](./how-to-write-application-json.md) - 了解应用层配置
2. 阅读 [如何编写 deploy.{env}.json](./how-to-write-deploy-json.md) - 了解运维层配置
3. 根据环境选择合适的配置方案

### 我想部署到本地开发环境

1. 阅读 [如何编写 deploy.{env}.json - 纯本地开发](./how-to-write-deploy-json.md#场景-1-纯本地开发)
2. 配置 `deploy.dev.json`
3. 运行 `npm run deploy`

### 我想部署到生产环境（云服务）

1. 阅读 [如何编写 deploy.{env}.json - 混合部署](./how-to-write-deploy-json.md#场景-3-混合部署推荐生产环境)
2. 阅读 [云服务提供商配置指南](./cloud-provider-configuration.md)
3. 配置云服务资源
4. 配置 `deploy.prod.json`
5. 运行 `npm run deploy`

### 我想添加新的中间件

1. 阅读 [如何新增中间件](./how-to-add-middleware.md)
2. 在 `TerraformGenerator` 中添加规格
3. 更新配置文件
4. 测试部署

### 我想支持新的云服务提供商

1. 阅读 [云服务提供商配置指南 - 实现自定义 Provider](./cloud-provider-configuration.md#实现自定义-provider)
2. 创建 Provider 类
3. 注册 Provider
4. 配置使用

### 我想为中间件添加云服务自动部署

1. 阅读 [云服务自动部署指南](./cloud-service-deployment.md)
2. 在 Provider 云服务配置中添加映射
3. （可选）实现真实的云服务部署器
4. 测试部署

## 🔍 按问题类型查找

### 配置问题

- [如何确定必填字段](./how-to-write-application-json.md#3-middwaredependency中间件依赖配置)
- [如何选择部署类型](./how-to-write-deploy-json.md#deploymenttype-规则)
- [Cloud 类型中间件缺少 endpoint](./cloud-provider-configuration.md#问题1-cloud-类型中间件缺少-endpoint)
- [Provider 不支持 local 部署类型](./cloud-provider-configuration.md#问题2-provider-不支持-local-部署类型)
- [Container 类型中间件缺少 use 字段](./cloud-provider-configuration.md#问题4-container-类型中间件缺少-use-字段)

### 部署问题

- [Kubeconfig 连接失败](./cloud-provider-configuration.md#问题3-kubeconfig-连接失败)
- [Terraform apply 失败](./cloud-provider-configuration.md#问题5-terraform-apply-失败)

### 中间件问题

- [如何添加持久化存储](./how-to-add-middleware.md#q1-如何添加持久化存储)
- [如何配置健康检查](./how-to-add-middleware.md#q2-如何配置健康检查)
- [如何支持集群模式的中间件](./how-to-add-middleware.md#q3-如何支持集群模式的中间件)

## 📖 核心概念

### Provider 模式

deploy-tool 使用 Provider 模式来支持不同的云服务提供商。每个 Provider 负责：
- 验证配置
- 获取 K8s 集群连接信息
- 解析 endpoint
- 生成适配该平台的 Terraform 配置

当前支持的 Provider：
- ✅ **local** - 本地 Docker Desktop Kubernetes
- ⏳ **volcengine** - 火山引擎 VKE（接口预留）
- ⏳ **aws** - AWS EKS（接口预留）
- ⏳ **aliyun** - 阿里云 ACK（接口预留）

### 配置层次

deploy-tool 使用三层配置：

1. **应用层** (`application.json`)
   - 定义组件的依赖需求
   - 定义必填字段
   - 与环境无关

2. **运维层** (`deploy.{env}.json`)
   - 提供具体的部署配置
   - 指定 provider
   - 提供中间件连接信息

3. **最终配置** (`app.config.json`)
   - 由工具合并生成
   - 应用代码直接使用
   - 包含所有 endpoint

### 部署类型

| 类型 | 说明 | 适用场景 |
|------|------|---------|
| **local** | 本地运行，不部署 | 开发时应用本地运行 |
| **container** | 部署到 Kubernetes | 应用容器化部署 |
| **cloud** | 使用云服务 | 中间件使用云服务 |

### Endpoint 管理

deploy-tool 自动管理所有服务的 endpoint：

- **Cloud 类型**: 使用配置中的 endpoint
- **Container 类型**: 自动生成 K8s DNS
- **Local 类型**: 自动生成 host.docker.internal

## 🛠️ 工具命令

```bash
# 查看部署计划
npm run plan

# 执行部署
npm run deploy

# 销毁部署
npm run destroy

# 只生成 Terraform 配置，不部署
npm run deploy -- --plan-only
```

## 📝 配置文件位置

```
project/
├── config/
│   ├── application.json       # 应用层配置（定义需求）→ 参考：how-to-write-application-json.md
│   ├── deploy.dev.json        # 开发环境配置（提供实现）→ 参考：how-to-write-deploy-json.md
│   ├── deploy.test.json       # 测试环境配置
│   └── deploy.prod.json       # 生产环境配置
├── app.config.json            # 生成的最终配置（自动生成，不要手动编辑）
└── deploy-tool/
    ├── terraform/generated/   # 生成的 Terraform 配置
    └── docs/                  # 文档（你在这里）
```

## 🔗 相关链接

### 项目文档

- [主 README](../README.md)
- [package.json](../package.json)
- [tsconfig.json](../tsconfig.json)

### 外部文档

- [Terraform 官方文档](https://www.terraform.io/docs)
- [Terraform Kubernetes Provider](https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs)
- [Kubernetes 官方文档](https://kubernetes.io/docs/)
- [Docker Desktop Kubernetes](https://docs.docker.com/desktop/kubernetes/)

### 云服务文档

- [火山引擎 VKE](https://www.volcengine.com/docs/6460/109822)
- [火山引擎 TOS](https://www.volcengine.com/docs/6349/74822)
- [火山引擎 Kafka](https://www.volcengine.com/docs/6431/71907)

## 💬 获取帮助

如果你遇到问题：

1. 查看 [故障排查](./cloud-provider-configuration.md#故障排查) 章节
2. 查看 [常见问题](./how-to-add-middleware.md#常见问题) 章节
3. 查看项目 Issues
4. 查看相关文档链接

## 🤝 贡献

欢迎贡献！如果你：

- 发现文档错误或不清楚的地方
- 想要添加新的示例
- 想要改进现有文档

请提交 PR 或创建 Issue。

---

**文档版本**: v1.0.0  
**最后更新**: 2025-11-20

