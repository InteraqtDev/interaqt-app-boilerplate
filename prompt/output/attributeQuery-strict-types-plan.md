# AttributeQuery 严格类型生成计划

## 背景分析

### 当前问题

当前 `generated.ts` 中的 `AttributeQueryData` 类型过于宽松：

```typescript
export type AttributeQueryData = (string | [string, { attributeQuery?: AttributeQueryData }])[];
```

这个类型：
1. 允许任意字符串作为属性名（无法检测拼写错误）
2. 所有 query interaction 共用同一个类型（无法区分不同 Entity 的可用字段）
3. 无法在编译时或运行时检测非法的嵌套查询

### 后端数据模型分析

**Entities:**
| Entity | Properties |
|--------|------------|
| User | username, email, passwordHash, createdAt |
| Channel | name, description, prompt, referenceImageUrl, createdAt, _softDeletion |
| MediaContent | mediaUrl, fileName, contentType, fileSize, sourceType, generationSource, prompt, createdAt, _softDeletion |
| Nanobanana2Call | status, externalId, requestParams, responseData, createdAt, completedAt, error |
| Sora2Call | status, externalId, requestParams, responseData, createdAt, completedAt, error |
| Nanobanana2Event | eventType, entityId, externalId, status, createdAt, data |
| Sora2Event | eventType, entityId, externalId, status, createdAt, data |

**Relations（形成图结构）:**
| Relation | Source → Target | Type | Source Property | Target Property |
|----------|-----------------|------|-----------------|-----------------|
| UserChannelRelation | User → Channel | 1:n | channels | owner |
| ChannelNanobanana2CallRelation | Channel → Nanobanana2Call | 1:n | nanobanana2Calls | channel |
| ChannelSora2CallRelation | Channel → Sora2Call | 1:n | sora2Calls | channel |
| ChannelMediaContentRelation | Channel → MediaContent | 1:n | mediaContents | channel |
| ChannelFeedItemRelation | Channel ↔ MediaContent | n:n | feedItems | inFeeds |

**Query Interactions:**
| Interaction | Data Target | 允许字段 |
|-------------|-------------|----------|
| ViewUserChannels | Channel | id, name, description, createdAt, prompt, referenceImageUrl + relations |
| ViewChannelFeedStream | ChannelFeedItemRelation | id, order, addedAt, source(Channel), target(MediaContent) |
| ViewChannelMediaContent | MediaContent | id, mediaUrl, fileName, contentType, sourceType, prompt, createdAt + relations |
| ViewChannelDetails | Channel | id, name, description, prompt, referenceImageUrl, createdAt + relations |
| ViewNanobanana2ImageGenerationStatus | Nanobanana2Call | id, status, error, createdAt, completedAt, responseData + relations |
| ViewSora2VideoGenerationStatus | Sora2Call | id, status, error, createdAt, completedAt, responseData + relations |

### 技术挑战

1. **循环图结构**：Entity 通过 Relation 关联形成图，可能有循环路径
   - 例如：Channel → MediaContent → inFeeds → Channel
   
2. **TypeScript 递归类型限制**：无法完美处理无限递归

3. **需要同时提供**：
   - 编译时类型检测（TypeScript）
   - 运行时校验（Zod）

---

## 执行计划

### TODO 1: 创建 Schema 提取脚本

**文件**: `scripts/extract-schema.ts`

**目标**: 从后端 Entity/Relation 定义中提取结构化的 schema 数据

**输出**: `frontend/api/schema.json`

```typescript
interface ExtractedSchema {
  entities: {
    [name: string]: {
      properties: { name: string; type: string }[];
      relations: {
        propertyName: string;        // 在当前 Entity 上的属性名（如 'channels'）
        targetEntity: string;        // 关联的 Entity 名称
        relationType: '1:n' | 'n:1' | 'n:n';
        isSource: boolean;           // 是否是 Relation 的 source 端
        relationProperties?: { name: string; type: string }[];  // n:n 关系的额外属性
      }[];
    };
  };
  relations: {
    [name: string]: {
      source: string;
      target: string;
      type: string;
      properties?: { name: string; type: string }[];
    };
  };
  queryInteractions: {
    [name: string]: {
      dataTarget: string;           // Entity 或 Relation 名称
      dataTargetType: 'entity' | 'relation';
      allowedFields?: string[];     // dataPolicy 中定义的允许字段（可选）
    };
  };
}
```

**实现要点**:
- 加载 `backend/index.ts` 中的 entities, relations, interactions
- 遍历并提取每个 Entity 的 properties
- 遍历 Relation 建立双向关联映射
- 提取每个使用 GetAction 的 Interaction 的 data 目标

---

### TODO 2: 生成 TypeScript 严格类型

**文件**: `scripts/generate-attributeQuery-types.ts`

**目标**: 根据 schema.json 生成严格的 AttributeQuery 类型

**输出**: `frontend/api/attributeQuery-types.generated.ts`

**策略: 有限深度递归**

由于 Entity/Relation 图可能有循环，采用固定最大深度（默认 3 层）的策略：

```typescript
// 生成的类型示例

// 基础属性字面量类型
type ChannelPropertyName = 'id' | 'name' | 'description' | 'prompt' | 'referenceImageUrl' | 'createdAt';
type MediaContentPropertyName = 'id' | 'mediaUrl' | 'fileName' | 'contentType' | 'sourceType' | 'prompt' | 'createdAt';

// Depth 0: 只能查询自身属性
type ChannelAttributeQueryD0 = ChannelPropertyName;

// Depth 1: 可以查询自身属性 + 关联实体（关联实体只能查询其自身属性）
type ChannelRelationQueryD1 = 
  | ['owner', { attributeQuery: UserPropertyName[] }]
  | ['mediaContents', { attributeQuery: MediaContentPropertyName[] }]
  | ['feedItems', { attributeQuery: ChannelFeedItemPropertyName[] }];

type ChannelAttributeQueryD1 = ChannelPropertyName | ChannelRelationQueryD1;

// Depth 2: 关联实体可以再嵌套一层
type ChannelRelationQueryD2 = 
  | ['owner', { attributeQuery: UserAttributeQueryD1[] }]
  | ['mediaContents', { attributeQuery: MediaContentAttributeQueryD1[] }];

type ChannelAttributeQueryD2 = ChannelPropertyName | ChannelRelationQueryD2;

// 默认导出 Depth 3 作为标准类型
type ChannelAttributeQuery = ChannelAttributeQueryD3[];

// 每个 Query Interaction 的特定类型
export interface ViewUserChannelsQuery {
  match?: MatchExpression;
  attributeQuery?: ChannelAttributeQuery;
  modifier?: QueryModifier;
}

export interface ViewChannelFeedStreamQuery {
  match?: MatchExpression;
  attributeQuery?: ChannelFeedItemRelationAttributeQuery;
  modifier?: QueryModifier;
}
```

**实现要点**:
1. 读取 schema.json
2. 为每个 Entity 生成属性字面量类型
3. 递归生成不同深度的 AttributeQuery 类型
4. 为每个 Query Interaction 生成特定的 Query 类型
5. 更新 APIMethodMap 使用新的特定类型

---

### TODO 3: 生成 Zod 运行时校验 Schema

**文件**: `scripts/generate-attributeQuery-zod.ts`

**目标**: 生成 Zod schema 用于运行时校验

**输出**: `frontend/api/attributeQuery-zod.generated.ts`

**策略: 使用 z.lazy() 处理递归 + 最大深度限制**

```typescript
// 生成的 Zod schema 示例
import { z } from 'zod';

// 基础属性 schema
const ChannelPropertyName = z.enum(['id', 'name', 'description', 'prompt', 'referenceImageUrl', 'createdAt']);
const MediaContentPropertyName = z.enum(['id', 'mediaUrl', 'fileName', 'contentType', 'sourceType', 'prompt', 'createdAt']);

// 创建带深度限制的递归 schema 工厂
function createChannelAttributeQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  const createSchema = (depth: number): z.ZodType<any> => {
    if (depth <= 0) {
      return ChannelPropertyName;
    }
    
    return z.union([
      ChannelPropertyName,
      z.tuple([
        z.literal('owner'),
        z.object({ attributeQuery: z.array(createUserAttributeQuerySchema(depth - 1)).optional() })
      ]),
      z.tuple([
        z.literal('mediaContents'),
        z.object({ attributeQuery: z.array(createMediaContentAttributeQuerySchema(depth - 1)).optional() })
      ]),
      // ... 其他关系
    ]);
  };
  
  return z.array(createSchema(maxDepth));
}

// 导出每个 Interaction 的校验函数
export const ViewUserChannelsQuerySchema = z.object({
  match: MatchExpressionSchema.optional(),
  attributeQuery: createChannelAttributeQuerySchema(3).optional(),
  modifier: QueryModifierSchema.optional(),
});

// 校验函数
export function validateViewUserChannelsQuery(query: unknown): query is ViewUserChannelsQuery {
  return ViewUserChannelsQuerySchema.safeParse(query).success;
}

export function parseViewUserChannelsQuery(query: unknown) {
  return ViewUserChannelsQuerySchema.parse(query);
}
```

**实现要点**:
1. 读取 schema.json
2. 为每个 Entity 生成属性枚举 schema
3. 使用工厂函数 + 闭包实现带深度限制的递归 schema
4. 为每个 Query Interaction 生成完整的 Query schema
5. 导出校验函数和解析函数

---

### TODO 4: 更新 API 生成脚本

**文件**: `scripts/generate-frontend-api.ts` 和 `scripts/generate-interaction-api.ts`

**目标**: 集成新的严格类型

**修改内容**:

1. 引入生成的类型
```typescript
import { 
  ViewUserChannelsQuery,
  ViewChannelFeedStreamQuery,
  // ...
} from './attributeQuery-types.generated';
```

2. 更新 APIMethodMap
```typescript
export interface APIMethodMap {
  ViewUserChannels: (payload: undefined, query?: ViewUserChannelsQuery) => Promise<QueryResponse<Channel>>;
  ViewChannelFeedStream: (payload: undefined, query?: ViewChannelFeedStreamQuery) => Promise<QueryResponse<ChannelFeedItem>>;
  // ...
}
```

3. 可选：添加运行时校验中间件
```typescript
// 在 APIClient 中添加可选的运行时校验
if (config.enableRuntimeValidation) {
  validateQuery(interactionName, query);
}
```

---

### TODO 5: 更新 npm scripts

**文件**: `package.json`

**新增脚本**:
```json
{
  "scripts": {
    "extract-schema": "tsx scripts/extract-schema.ts",
    "generate-attributeQuery-types": "tsx scripts/generate-attributeQuery-types.ts",
    "generate-attributeQuery-zod": "tsx scripts/generate-attributeQuery-zod.ts",
    "generate-frontend-api": "npm run extract-schema && npm run generate-attributeQuery-types && npm run generate-attributeQuery-zod && tsx scripts/generate-interaction-api.ts"
  }
}
```

---

### TODO 6: 添加测试

**文件**: `tests/attributeQuery-types.test.ts`

**测试内容**:
1. TypeScript 编译时类型检测（通过 tsc 编译测试文件）
2. Zod 运行时校验测试
3. 边界情况测试（最大深度、循环路径等）

---

## 依赖关系

```
TODO 1 (extract-schema)
    ↓
    ├── TODO 2 (generate-types)
    │
    └── TODO 3 (generate-zod)
            ↓
        TODO 4 (update-api-scripts)
            ↓
        TODO 5 (npm-scripts)
            ↓
        TODO 6 (tests)
```

---

## 预期成果

1. **编译时类型安全**
   - 拼写错误会在编译时报错
   - 非法的嵌套查询会在编译时报错
   - IDE 自动补全可用字段

2. **运行时校验**
   - 可选的运行时参数校验
   - 详细的错误信息
   - 防止无限递归

3. **保持向后兼容**
   - 原有的宽松类型可保留为 fallback
   - 运行时校验默认关闭，可配置开启

---

## 备注

- 最大递归深度默认设为 3，可根据实际需求调整
- 对于 n:n 关系（如 ChannelFeedItemRelation），需要特殊处理关系本身的属性（通过 `&` 符号访问）
- 生成的代码应包含清晰的注释，说明类型的来源和生成时间

