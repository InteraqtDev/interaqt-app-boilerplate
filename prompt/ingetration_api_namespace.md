# Integration api namespace

所有 integration 提供的 api 在 server 启动时提供的 url 是平铺展开的，这样可能出现不同 integration 的同名 api 分配的 url 相同的问题。现在我们决定在 url 使用 integration name 来增加一个层级，这样就能避免这个问题。你来帮我按照下面的任务一个一个完成。

## 任务一 url 中增加 integration name 层级

要求：
1. 为了完成这个任务，`app.ts` 中接受到 aggregated integration createAPIs 创建出来的 api 应该都带上 integration name。这个 name 应该 `createAggregatedIntegration` 中自动加上。
2. createAggregatedIntegration 的参数应该改成 kv 形式，key 就是 integration name。
3. 调用 createAggregatedIntegration 的 entry index 文件是脚本生成的，需要对应修改脚本。

## 任务二 integration name 传入，回调 url 拼接工具

## 任务三 前端更新

