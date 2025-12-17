我们的 integration 对外的 api 调用是使用 async-task-component 基于 temporal 完成的。原本是 push 任务，现在改为了 async-task-component 拉任务的形式。
nanobanana2ImageGeneration 和 fangzhouVideoGeneration 这两个 integration 已经改造了。
你通过深入阅读项目源码，来帮我更新 
- `.claude/agents/task-4-implement-integration-handler.md`
- `.claude/agents/integration-generation-handler.md`
- `.claude/agents/task-4-error-check-handler.md`
文档中过时的内容。注意：
1. 直接覆盖过时的信息，不要做新旧信息的对比。
2. 文档中的目标是正确指导 integration 怎么写就够了，不用过多解释和介绍 async-task-component 的实现。
