# OpenAPI 改造计划

> ✅ **已完成** - 2025-12-07

## 目标

将后端所有 Integration 的 custom API 改造为使用 Zod + OpenAPI 规范定义，同时保持前端 `APIClient` 使用方式不变。

## 改造范围

### 需要改造的 Integration

| Integration | API 名称 | 参数 | 返回类型 |
|-------------|---------|------|---------|
| `auth` | `register` | `{username, email, password}` | `{success, message, userId}` |
| `auth` | `login` | `{identifier, password}` | `{token, user}` |
| `objectstorage` | `getUploadUrl` | `{fileName, contentType?, expiresIn?}` | `{success, uploadUrl, objectKey, downloadUrl, expiresAt}` |
| `nanobanana2-image` | `queryNanobanana2ImageGenerationStatus` | `{apiCallId}` | `{success, message}` |
| `sora2-video` | `querySora2VideoGenerationStatus` | `{apiCallId}` | `{success, message}` |

### 前端使用方式（需保持不变）

```typescript
// AuthContext.tsx
await apiClient.custom.login({ identifier, password })
await apiClient.custom.register({ username, email, password })

// ChannelManagePanel.tsx
await apiClient.custom.getUploadUrl({ fileName, contentType, expiresIn })
await apiClient.custom.queryNanobanana2ImageGenerationStatus({ apiCallId })
await apiClient.custom.querySora2VideoGenerationStatus({ apiCallId })
```

---

## 详细计划

### Phase 1: 基础设施搭建

#### Task 1.1: 安装依赖

```bash
npm install zod @hono/zod-openapi
npm install -D openapi-typescript
```

#### Task 1.2: 创建共享 Schema 基础设施

创建文件 `integrations/shared/schemas.ts`，定义：
- 通用错误响应 schema
- 通用成功响应 schema
- Schema 类型导出工具

#### Task 1.3: 扩展 app.ts 中的 API 定义

修改 `createAPI` 函数，支持传入 Zod schema：

```typescript
export type APIConfigWithSchema<TParams, TResponse> = {
  paramsSchema?: z.ZodSchema<TParams>
  responseSchema?: z.ZodSchema<TResponse>
  useNamedParams?: boolean
  allowAnonymous?: boolean
  useRequestContext?: boolean
  // OpenAPI 元数据
  summary?: string
  description?: string
  tags?: string[]
}
```

---

### Phase 2: Integration 改造

#### Task 2.1: 改造 auth integration

文件：`integrations/auth/index.ts`

新增：`integrations/auth/schemas.ts`

```typescript
// schemas.ts
import { z } from 'zod'

export const RegisterRequestSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

export const RegisterResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  userId: z.string()
})

export const LoginRequestSchema = z.object({
  identifier: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required')
})

export const LoginResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string(),
    username: z.string(),
    email: z.string()
  })
})
```

改造后的 API 定义：

```typescript
createAPIs(): APIs {
  return {
    register: createAPI(
      async function(this: Controller, context, params) {
        // 实现不变
      },
      {
        paramsSchema: RegisterRequestSchema,
        responseSchema: RegisterResponseSchema,
        useNamedParams: true,
        allowAnonymous: true,
        summary: 'Register new user',
        tags: ['Auth']
      }
    ),
    // ...
  }
}
```

#### Task 2.2: 改造 objectstorage integration

文件：`integrations/objectstorage/index.ts`

新增：`integrations/objectstorage/schemas.ts`

```typescript
export const GetUploadUrlRequestSchema = z.object({
  fileName: z.string().min(1, 'fileName is required'),
  contentType: z.string().optional(),
  expiresIn: z.number().positive().optional()
})

export const GetUploadUrlResponseSchema = z.object({
  success: z.boolean(),
  uploadUrl: z.string().url(),
  objectKey: z.string(),
  downloadUrl: z.string().url(),
  expiresAt: z.number()
})
```

#### Task 2.3: 改造 nanobanana2-image integration

文件：`integrations/nanobanana2-image/index.ts`

新增：`integrations/nanobanana2-image/schemas.ts`

```typescript
export const QueryStatusRequestSchema = z.object({
  apiCallId: z.string().min(1, 'apiCallId is required')
})

export const QueryStatusResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional()
})
```

#### Task 2.4: 改造 sora2-video integration

文件：`integrations/sora2-video/index.ts`

新增：`integrations/sora2-video/schemas.ts`

（Schema 与 nanobanana2-image 类似，可复用共享 schema）

---

### Phase 3: OpenAPI Spec 生成

#### Task 3.1: 创建 OpenAPI spec 生成脚本

文件：`scripts/generate-openapi-spec.ts`

功能：
1. 收集所有 integration 的 API 定义
2. 从 Zod schema 提取 JSON Schema
3. 生成完整的 OpenAPI 3.1 spec
4. 输出到 `frontend/api/openapi.json`

```typescript
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

function generateOpenAPISpec(apis: Record<string, API>) {
  const paths: Record<string, any> = {}
  const schemas: Record<string, any> = {}

  for (const [apiName, api] of Object.entries(apis)) {
    if (api.paramsSchema) {
      const paramsSchemaName = `${capitalize(apiName)}Request`
      schemas[paramsSchemaName] = zodToJsonSchema(api.paramsSchema)
    }
    if (api.responseSchema) {
      const responseSchemaName = `${capitalize(apiName)}Response`
      schemas[responseSchemaName] = zodToJsonSchema(api.responseSchema)
    }
    // 生成 path 定义...
  }

  return {
    openapi: '3.1.0',
    info: { title: 'Interaqt API', version: '1.0.0' },
    paths,
    components: { schemas }
  }
}
```

#### Task 3.2: 更新 package.json scripts

```json
{
  "scripts": {
    "generate-openapi-spec": "npx tsx scripts/generate-openapi-spec.ts",
    "generate-openapi-types": "openapi-typescript frontend/api/openapi.json -o frontend/api/openapi-types.generated.ts",
    "generate-frontend-api": "npm run generate-openapi-spec && npm run generate-openapi-types && npx tsx scripts/generate-frontend-api.ts && npx tsx scripts/generate-custom-endpoints.ts"
  }
}
```

---

### Phase 4: 前端类型生成

#### Task 4.1: 更新 custom-endpoints 生成脚本

修改 `scripts/generate-custom-endpoints.ts`：

1. 从 `openapi.json` 读取 schema
2. 生成更精确的 TypeScript 类型
3. 保持 `CustomAPIMethodMap` 接口格式兼容

```typescript
// 新的类型提取逻辑
function extractParamsType(api: API, apiName: string) {
  if (api.paramsSchema) {
    // 从 OpenAPI spec 中读取已生成的类型名
    const typeName = `components['schemas']['${capitalize(apiName)}Request']`
    return { interfaceName: typeName, isEmpty: false }
  }
  // fallback 到旧逻辑
}
```

#### Task 4.2: 更新 APIClient.ts

确保 `APIClient` 继续工作，只需要更新类型导入：

```typescript
// 从新的类型文件导入
import type { paths, components } from './openapi-types.generated'
import type { CustomAPIMethodMap } from './custom-endpoints.generated'
```

---

### Phase 5: 验证和测试

#### Task 5.1: 验证前端编译无错误

```bash
cd frontend && npm run type-check
```

#### Task 5.2: 验证 API 调用正常

测试所有 custom API 端点：
- [ ] `register`
- [ ] `login`
- [ ] `getUploadUrl`
- [ ] `queryNanobanana2ImageGenerationStatus`
- [ ] `querySora2VideoGenerationStatus`

---

## 文件变更清单

### 新增文件

| 文件路径 | 描述 |
|---------|------|
| `integrations/auth/schemas.ts` | Auth API schemas（独立） |
| `integrations/objectstorage/schemas.ts` | ObjectStorage API schemas（独立） |
| `integrations/nanobanana2-image/schemas.ts` | Nanobanana2 API schemas（独立） |
| `integrations/sora2-video/schemas.ts` | Sora2 API schemas（独立） |
| `scripts/generate-openapi-spec.ts` | OpenAPI spec 生成脚本 |

> 注意：每个 integration 的 schemas 都是独立声明的，不使用共享 schemas，方便之后的迁移。

### 修改文件

| 文件路径 | 修改内容 |
|---------|---------|
| `package.json` | 添加依赖和 scripts |
| `app.ts` | 扩展 `createAPI` 支持 schema |
| `integrations/auth/index.ts` | 使用新的 schema 定义 |
| `integrations/objectstorage/index.ts` | 使用新的 schema 定义 |
| `integrations/nanobanana2-image/index.ts` | 使用新的 schema 定义 |
| `integrations/sora2-video/index.ts` | 使用新的 schema 定义 |
| `scripts/generate-custom-endpoints.ts` | 从 OpenAPI spec 提取类型 |
| `frontend/api/custom-endpoints.generated.ts` | 生成更精确的类型 |

### 生成文件（自动生成）

| 文件路径 | 描述 |
|---------|------|
| `frontend/api/openapi.json` | OpenAPI 3.1 spec |
| `frontend/api/openapi-types.generated.ts` | 从 OpenAPI 生成的 TS 类型 |

---

## 向后兼容性保证

### APIClient 使用方式不变

改造前：
```typescript
await apiClient.custom.login({ identifier, password })
```

改造后（完全相同）：
```typescript
await apiClient.custom.login({ identifier, password })
```

### 类型更加精确

改造前：
```typescript
export type GetUploadUrlResponse = any;
```

改造后：
```typescript
export type GetUploadUrlResponse = {
  success: boolean;
  uploadUrl: string;
  objectKey: string;
  downloadUrl: string;
  expiresAt: number;
};
```

---

## 执行顺序

```
Phase 1 (基础设施) → Phase 2 (Integration 改造) → Phase 3 (Spec 生成) → Phase 4 (前端类型) → Phase 5 (验证)
```

预计总耗时：2-3 小时

