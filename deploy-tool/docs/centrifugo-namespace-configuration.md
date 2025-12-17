# Centrifugo Namespace 配置指南

## 概述

Centrifugo 使用 **namespace** 来控制频道的访问权限和行为。每个频道名称格式为 `<namespace>:<identifier>`，例如 `chat-room:123`。

**关键点**:
- ✅ 必须配置 namespace，否则客户端无法订阅，服务器无法发布
- ✅ Namespace 配置控制：谁可以订阅、谁可以发布、历史记录、在线状态等
- ✅ 不同的 namespace 可以有不同的配置

---

## 配置方式

### 方式 1: 使用默认配置 (推荐)

如果不在配置文件中指定 `namespaces`，deploy-tool 会自动生成默认的 `chat-room` namespace：

**deploy.dev.json**:
```json
{
  "components": {
    "communication": {
      "middlewareDependencies": {
        "centrifugo": {
          "config": {
            "tokenHmacSecretKey": "your-secret",
            "apiKey": "your-api-key",
            "engine": "redis",
            "historySize": 100,      // 可选：历史消息数量，默认 100
            "historyTtl": "300s"     // 可选：历史消息保留时间，默认 300s
          }
        }
      }
    }
  }
}
```

**生成的 namespace 配置**:
```json
{
  "name": "chat-room",
  "publish": true,
  "subscribe": true,
  "presence": true,
  "history_size": 100,
  "history_ttl": "300s",
  "history_recover": true
}
```

### 方式 2: 自定义 Namespace 配置

如果需要配置多个 namespace 或自定义行为：

**deploy.dev.json**:
```json
{
  "components": {
    "communication": {
      "middlewareDependencies": {
        "centrifugo": {
          "config": {
            "tokenHmacSecretKey": "your-secret",
            "apiKey": "your-api-key",
            "namespaces": [
              {
                "name": "chat-room",
                "publish": true,
                "subscribe": true,
                "presence": true,
                "history_size": 100,
                "history_ttl": "600s",
                "history_recover": true
              },
              {
                "name": "notification",
                "publish": true,
                "subscribe": true,
                "presence": false,
                "history_size": 50,
                "history_ttl": "300s"
              },
              {
                "name": "public",
                "publish": true,
                "subscribe": true,
                "presence": false,
                "history_size": 0
              }
            ]
          }
        }
      }
    }
  }
}
```

---

## Namespace 配置参数

### 核心参数

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `name` | string | Namespace 名称，匹配频道前缀 | 必需 |
| `publish` | boolean | 允许服务器端发布消息 | `false` |
| `subscribe` | boolean | 允许客户端订阅 | `false` |
| `presence` | boolean | 启用在线状态功能 | `false` |

### 历史记录参数

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `history_size` | number | 保留的历史消息数量 | `0` |
| `history_ttl` | string | 历史消息保留时间 (如 "300s", "5m") | `"0s"` |
| `history_recover` | boolean | 支持断线重连后恢复消息 | `false` |

### 高级参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `force_push_join_leave` | boolean | 强制推送加入/离开事件 |
| `force_positioning` | boolean | 强制消息定位 |
| `force_recovery` | boolean | 强制消息恢复 |
| `allow_publish_for_client` | boolean | 允许客户端直接发布消息（不推荐）|
| `allow_presence_for_client` | boolean | 允许客户端查询在线状态 |
| `allow_history_for_client` | boolean | 允许客户端查询历史消息 |

---

## 使用场景

### 场景 1: 聊天室 (需要历史记录和在线状态)

```json
{
  "name": "chat-room",
  "publish": true,
  "subscribe": true,
  "presence": true,
  "history_size": 100,
  "history_ttl": "600s",
  "history_recover": true
}
```

**特点**:
- ✅ 支持实时聊天
- ✅ 保留 100 条历史消息
- ✅ 显示在线用户
- ✅ 断线重连后自动恢复未读消息

**频道示例**: `chat-room:1`, `chat-room:abc-xyz`

### 场景 2: 通知推送 (只需推送，不需历史)

```json
{
  "name": "notification",
  "publish": true,
  "subscribe": true,
  "presence": false,
  "history_size": 0
}
```

**特点**:
- ✅ 实时推送通知
- ❌ 不保留历史
- ❌ 不显示在线状态
- 💡 适用于一次性通知

**频道示例**: `notification:user-123`, `notification:broadcast`

### 场景 3: 公共广播 (大量订阅者)

```json
{
  "name": "public",
  "publish": true,
  "subscribe": true,
  "presence": false,
  "history_size": 10,
  "history_ttl": "60s"
}
```

**特点**:
- ✅ 支持大规模订阅
- ✅ 保留少量历史（10条）
- ❌ 不统计在线状态（节省资源）

**频道示例**: `public:news`, `public:updates`

---

## 工作原理

### 1. 频道名称解析

```
频道名称: chat-room:123
          ^^^^^^^^^ ^^^
          namespace  identifier
```

Centrifugo 会：
1. 解析频道名称，提取 namespace (`chat-room`)
2. 查找对应的 namespace 配置
3. 根据配置决定是否允许操作

### 2. 权限检查

**订阅时**:
```
客户端订阅 "chat-room:123"
  ↓
Centrifugo 检查 namespace "chat-room"
  ↓
subscribe: true? → 允许订阅 ✅
subscribe: false? → 拒绝订阅 ❌
```

**发布时**:
```
服务器发布到 "chat-room:123"
  ↓
Centrifugo 检查 namespace "chat-room"
  ↓
publish: true? → 允许发布 ✅
publish: false? → 拒绝发布 ❌
```

### 3. 历史记录工作机制

如果配置了 `history_size > 0`:
- Centrifugo 会保留最近的 N 条消息
- 客户端断线重连后，可以获取错过的消息
- 超过 TTL 的消息会被自动清理

---

## 常见问题

### Q1: 为什么消息无法推送？

**现象**: 日志显示 "Channel has no active subscribers" 或 "unknown channel"

**原因**: 没有配置对应的 namespace

**解决方案**: 
1. 检查频道名称格式 (如 `chat-room:123`)
2. 确保配置了对应的 namespace (`chat-room`)
3. 确保 `publish: true` 和 `subscribe: true`

### Q2: 客户端无法订阅频道？

**现象**: 前端调用 `subscription.subscribe()` 后没有响应

**原因**: Namespace 配置中 `subscribe: false` 或没有配置

**解决方案**: 设置 `subscribe: true`

### Q3: 如何调试 namespace 配置？

**方法 1**: 检查 Centrifugo pod 环境变量
```bash
kubectl exec -it <centrifugo-pod> -- env | grep CENTRIFUGO_NAMESPACES
```

**方法 2**: 查看 Centrifugo 日志
```bash
kubectl logs <centrifugo-pod>
```

**方法 3**: 使用 Centrifugo API
```bash
curl -X POST http://<centrifugo-url>/api \
  -H "Authorization: apikey <your-api-key>" \
  -d '{"method": "info"}'
```

### Q4: 是否可以动态修改 namespace？

**答案**: 需要重启 Centrifugo。Namespace 配置在启动时加载，不支持热更新。

### Q5: 如何配置不同环境的 namespace？

在不同的 `deploy.{env}.json` 中设置不同的配置：

**deploy.dev.json** (开发环境 - 宽松配置):
```json
{
  "namespaces": [{
    "name": "chat-room",
    "history_size": 10,
    "history_ttl": "60s"
  }]
}
```

**deploy.prod.json** (生产环境 - 严格配置):
```json
{
  "namespaces": [{
    "name": "chat-room",
    "history_size": 100,
    "history_ttl": "600s",
    "allow_publish_for_client": false
  }]
}
```

---

## 安全建议

### ✅ 推荐做法

1. **不要允许客户端直接发布**:
   ```json
   {
     "allow_publish_for_client": false  // 默认值，推荐
   }
   ```
   所有发布操作应通过后端 API 验证后进行。

2. **限制历史记录大小**:
   ```json
   {
     "history_size": 100,  // 不要设置过大
     "history_ttl": "600s"
   }
   ```
   避免占用过多内存。

3. **生产环境使用 subscription token**:
   确保客户端订阅时提供有效的 subscription token，验证权限。

### ❌ 不推荐做法

1. **不要在生产环境禁用 token 验证**
2. **不要设置过大的 history_size** (会占用大量内存)
3. **不要在公共频道启用 presence** (订阅者过多时性能差)

---

## 参考资料

- [Centrifugo 官方文档 - Channels](https://centrifugal.dev/docs/server/channels)
- [Centrifugo 官方文档 - Configuration](https://centrifugal.dev/docs/server/configuration)
- [Centrifugo 官方文档 - Server API](https://centrifugal.dev/docs/server/server_api)







