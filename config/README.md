# 配置系统说明

本配置系统实现了分层配置管理，将应用层配置和运维层配置分离，通过工具自动合并生成最终配置。

## 配置文件结构

```
config/
├── application.json       # 应用层配置：定义各组件的依赖需求
├── deploy.dev.json        # 开发环境配置：开发环境的具体部署信息
├── deploy.prod.json       # 生产环境配置：生产环境的具体部署信息
├── types.ts              # TypeScript 类型定义
├── generate-config.ts    # 配置生成脚本
└── README.md             # 本文件
```

## 使用方法

### 生成配置

```bash
# 生成开发环境配置
npm run generate-config -- --env dev

# 生成生产环境配置
npm run generate-config -- --env prod
```

生成的 `app.config.json` 文件将输出到项目根目录。

### 在代码中使用配置

```typescript
import config from './app.config.json';

// 获取主组件的数据库配置
const dbConfig = config.components.main.middlewareDependencies.mainDb.config;

// 获取通信组件的 URL
const commUrl = config.componentUrls.communication;

// 获取外部服务配置
const imageGenConfig = config.components.main.externalServices.volcFangzhouImage;
if (imageGenConfig.enabled) {
  // 使用该服务
  const apiKey = imageGenConfig.config.apiKey;
}
```

## 配置层说明

### 1. 应用层配置 (application.json)

定义各组件（main、communication、asyncTask）的依赖需求，包括：

- **middlewareDependencies**: 中间件依赖（如数据库、对象存储、消息队列）
- **externalServices**: 外部服务依赖（如图像生成、视频生成、TTS）
- **applicationConfig**: 应用配置需求（如 JWT、根用户配置）

每个依赖都定义了：
- `type`: 依赖类型
- `requiredFields`: 必填字段列表
- `version`: 版本要求（可选）

### 2. 运维层配置 (deploy.{env}.json)

定义特定环境下的实际部署信息，包括：

- **provider**: 云服务提供商（local/volcengine/aws/aliyun）
- **environment**: 环境名称
- **components**: 各组件的部署配置
  - `deploymentType`: 部署类型（local/container）
  - `host`: 主机地址
  - `port`: 端口
  - `middlewareDependencies`: 中间件的具体配置
  - `externalServices`: 外部服务的具体配置
  - `applicationConfig`: 应用的具体配置

### 3. 最终配置 (app.config.json)

由工具合并生成的完整配置，包含：

- 应用层的元信息
- 运维层的实际配置
- 自动生成的组件 URL 映射表
- 预留的 `address` 字段（由 deploy tool 填写）

## 配置验证

脚本在生成配置前会进行以下验证：

### 1. 必填字段检查

确保运维层配置包含应用层要求的所有必填字段。

### 2. deploymentType 规则检查

**Component 规则：**
- 当 `provider` 为 `local` 时，component 的 `deploymentType` 只能是 `local` 或 `container`
- 当 `provider` 不是 `local` 时，component 的 `deploymentType` 只能是 `container`

**Middleware 规则：**
- Middleware 的 `deploymentType` 可以是 `container` 或 `cloud`
- 无论 provider 是什么，middleware 都可以使用 `cloud`（例如：本地开发时使用云服务）
- 当 middleware 的 `deploymentType` 为 `container` 时，必须指定 `use` 字段
- Middleware 可以在 deploy 配置中直接指定 `endpoint` 字段（可选）

### 3. 外部服务启用判断

如果外部服务的 `config` 为空对象 `{}`，则：
- 跳过必填字段验证
- 在最终配置中将 `enabled` 设为 `false`

## 配置示例

### 外部服务禁用示例

在生产环境中，如果不使用某个外部服务，可以将其 config 设为空对象：

```json
{
  "externalServices": {
    "volcFangzhouImage": {
      "config": {}
    }
  }
}
```

生成的最终配置将自动设置：

```json
{
  "externalServices": {
    "volcFangzhouImage": {
      "provider": "volcengine",
      "service": "fangzhou-image-gen",
      "enabled": false,
      "config": {}
    }
  }
}
```

## 添加新环境

创建新的部署配置文件：

```bash
cp config/deploy.dev.json config/deploy.test.json
# 编辑 deploy.test.json，修改环境相关配置
```

生成新环境的配置：

```bash
npm run generate-config -- --env test
```

## TypeScript 类型支持

配置文件提供了完整的 TypeScript 类型定义（`types.ts`），支持：

- IDE 智能提示
- 编译时类型检查
- 配置文件的结构验证

## 注意事项

1. **敏感信息保护**: 生产环境配置文件中的密码、密钥等敏感信息应通过加密或环境变量管理
2. **配置版本控制**: 建议将 `deploy.*.json` 纳入版本控制，但 `app.config.json` 应添加到 `.gitignore`
3. **配置更新**: 修改任何配置文件后，需要重新运行生成脚本
4. **endpoint 字段**: 最终配置中的 `endpoint` 字段由 deploy tool 自动填写，请勿手动修改
