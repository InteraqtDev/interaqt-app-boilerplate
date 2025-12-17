# service multiple endipoint
当前项目的 deploy-tool 可以支持自动部署各种 component 和 middleware 并在部署完之后填充 endpoint 字段。我现在发现，有的 middleware 可能会需要暴露多个 endpoint，例如 temporal 除了 service 的 endpoint，还会有 admin ui 的 endpoint。并且根据具体的情况，可能用户还会要指定某些 endpoint 能 public access，例如 temporal admin ui 。接下来你来帮我按照下面的任务，一个一个执行，实现改造。

## 任务一 制定计划
1. 完整阅读 deploy-tool ，理解它的原理和用户如何使用。
2. 设计新的 endpoint 方案，要能支持用户配置某个 endpoint 能 public access。特别注意不需要向后兼容，默认都是多 endpoint，其中主 endpoint 约定命名为 main。
3. 计划写成 TODO 形式，分步实现，并且每一步都要写好测试计划。
4. 关注技术实现，不要写其他的人力、时间等信息。
5. 计划写到 `prompt/output` 中。

## 任务二 执行计划
我们已经完成任务一，接下来你严格按照 `prompt/output/multiple-endpoint-implementation-plan.md` 进行执行。注意:
1. 你应该先完全理解 `deploy-tool` 。可以直接阅读文件夹下的源码和文档。
2. 执行完改造之后你应该销毁已有的部署，直接重新执行部署，并且验证 port forward 都是正确的。
3. 因为会新生成 app.config.json 和 app.config.host.json，所以你要找到业务代码中会受到影响的部分，修正业务代码。