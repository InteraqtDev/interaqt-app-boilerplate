# SenderName 显示 'Unknown' 问题修复

## 问题现象

前端收到的消息中 `senderName` 显示为 'Unknown'：

```json
{
  "type": "new-message",
  "messageId": 1,
  "content": "1111",
  "senderId": 1,
  "senderName": "Unknown",  // ❌ 应该是实际用户名
  "chatRoomId": 1,
  "timestamp": "2025-11-25T02:30:37.000Z"
}
```

## 根本原因

**文件**：`integrations/centrifugo/index.ts`

**问题代码**（第252行）：
```typescript
const messageData = {
  // ...
  senderName: message.sender?.username || 'Unknown',  // ❌ message.sender?.username 为 undefined
  // ...
}
```

**原因分析**：

在 RecordMutationSideEffect 中，`event.record` 包含的关联对象（如 `sender`）通常只包含最基本的信息（通常只有 `id`），不包含完整的属性（如 `username`）。

这是 interaqt 框架的设计：为了性能考虑，side-effect 接收到的数据是最小化的，需要完整数据时必须手动查询。

## 解决方案

在 side-effect 中，**手动查询完整的 sender 信息**：

```typescript
// 查询完整的 sender 信息（包含 username）
const sender = await this.system.storage.findOne(
  'User',
  this.globals.MatchExp.atom({ key: 'id', value: ['=', senderId] }),
  undefined,
  ['id', 'username']  // 指定需要查询的字段
)

// 使用查询到的完整数据
const messageData = {
  // ...
  senderName: sender.username,  // ✅ 使用查询到的 username
  // ...
}
```

## 修复后的完整代码

```typescript
// integrations/centrifugo/index.ts (第234-270行)

const senderId = message.sender?.id
if (!senderId) {
  console.error('[Centrifugo] Message missing sender', { messageId: message.id })
  return {
    success: false,
    error: { message: 'Message missing sender' }
  }
}

// ✅ 查询完整的 sender 信息
const sender = await this.system.storage.findOne(
  'User',
  this.globals.MatchExp.atom({ key: 'id', value: ['=', senderId] }),
  undefined,
  ['id', 'username']
)

if (!sender) {
  console.error('[Centrifugo] Sender not found', { senderId })
  return {
    success: false,
    error: { message: 'Sender not found' }
  }
}

// 构造消息体
const messageData = {
  type: 'new-message',
  messageId: message.id,
  content: message.content,
  senderId: sender.id,
  senderName: sender.username,  // ✅ 现在有正确的 username
  chatRoomId: chatRoomId,
  timestamp: new Date(message.createdAt * 1000).toISOString()
}
```

## 测试验证

修复后，需要：

1. **重启后端服务**（加载修复后的代码）
2. **发送消息**
3. **检查前端收到的消息**：
   ```json
   {
     "senderName": "t1",  // ✅ 应该显示实际用户名
     ...
   }
   ```

## 参考

类似的实现可以在以下文件中找到：
- `integrations/kafka.old/index.ts` (第492-497行)
- `integrations/centrifugo/index.ts` (第366-371行) - generateChannelSubscriptionToken API

## 总结

**问题**：Side-effect 中关联对象只包含 id  
**修复**：使用 `storage.findOne` 查询完整的用户信息  
**状态**：✅ 已修复，等待重启测试

