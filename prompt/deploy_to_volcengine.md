# 部署任务

接下来我们开始为当前项目创建部署脚本，安装部署工具。注意，我们希望开发体验和部署基本一致。
我们的部署平台是火山引擎的容器服务，可以认为是火山引擎提供的 k8s。
我们的部署工具选用 helm。

## 任务一 使用 helm 创建开发环境 ✅ 已完成

为了使开发环境和部署一致。我们先来利用 helm 创建开发环境。
在当前的项目中，有以下几个是需要部署的独立服务：
- PostgreSQL 17（最新版）
- Kafka 3.6（KRaft 模式）
- MinIO（S3 兼容，替代 RustFS）

我们在使用这些服务的时候，应该体验和真实部署一致。你在创建部署文件时，就要考虑之后真实部署时，如何无痛切换。
你可以通过查看 `.env.production` 了解我们是用了什么环境变量连接到真实的外部服务上去的。
注意，我们本地开发和未来线上的数据库都应该使用 postgreSQL 最新版。

### 完成情况

✅ 已创建完整的 Helm Chart 配置
✅ 已创建所有 Kubernetes 资源模板（PostgreSQL, Kafka, MinIO）
✅ 已创建本地环境配置文件 `.env.local`
✅ 已创建部署管理脚本和 Makefile
✅ 已创建详细的部署文档

### 产出文件

**Helm Chart 配置：**
- `helm/Chart.yaml` - Chart 元数据
- `helm/values.yaml` - 默认配置
- `helm/values.development.yaml` - 开发环境配置
- `helm/.helmignore` - Helm 打包忽略规则

**Kubernetes 资源模板：**
- `helm/templates/_helpers.tpl` - 模板辅助函数
- `helm/templates/namespace.yaml` - 命名空间
- `helm/templates/postgresql.yaml` - PostgreSQL 部署
- `helm/templates/kafka.yaml` - Kafka 部署
- `helm/templates/minio.yaml` - MinIO 部署

**管理工具：**
- `helm/scripts/deploy-dev.sh` - 一键部署管理脚本
- `helm/scripts/validate.sh` - Chart 验证脚本
- `helm/Makefile` - 常用命令快捷方式

**环境配置：**
- `.env.local` - 本地 Helm 环境配置

**文档：**
- `helm/README.md` - 完整部署文档
- `helm/QUICKSTART.md` - 快速开始指南
- `DEPLOYMENT_LOCAL.md` - 本地部署总览

### 快速使用

```bash
# 一键部署
./helm/scripts/deploy-dev.sh deploy

# 启动端口转发
./helm/scripts/deploy-dev.sh port-forward

# 配置环境
cp .env.local .env

# 启动应用
npm run start
```

### 与生产环境的一致性

✅ 数据库类型：PostgreSQL 17（本地和生产都应使用相同版本）
✅ 消息队列：Kafka 协议（兼容火山引擎 Kafka）
✅ 对象存储：S3 兼容 API（兼容火山引擎 TOS）
✅ 容器编排：Kubernetes（与火山引擎容器服务一致）
✅ 配置方式：环境变量（切换环境只需修改 .env 文件）

### 详细文档

请查看：
- 快速开始：`helm/QUICKSTART.md`
- 完整文档：`helm/README.md`
- 部署总览：`DEPLOYMENT_LOCAL.md`


## 任务二 使用 helm 实现到火山引擎的部署


