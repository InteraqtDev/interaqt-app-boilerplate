# SideEffect Pull Mode

我们现在有大量的副作用类型的调用使用 temporal 承接的。temporal 的 workflow 收集和 worker 启动脚本是 `startAsyncTask.ts`。
workflow 的启动是在 integration 中，例如 `integrations/fangzhouVideoGeneration`。现在的启动是一种事件监听启动的方式。它可能出现的问题是调用启动时，可能 temporal 服务宕机了，这样 workflow 就直接启动失败了，并且由于事件不会再触发，所以不会再启动了。

我现在想把需要 workflow 启动的任务改成拉的形式。并且希望我能通过简单的启动更多的 `startAsyncTask.ts` 脚本，或者在k8s中启动更多的实例，就能增大副作用消化的能力。你来帮我写一个具体的改造实施方案，详细解释。注意，只要关注技术实现本身，不要关注人力、时间等其他信息。

## 任务一 改造

## 任务二 拉新任务时的智能判断
我们已经成功完成任务一拉模型的改造，任务一的设计文档在 `prompt/output/side-effect-pull-mode-refactor-plan.md` 中。
我们现在的发现 `async-task-component/task-processor.ts` 只有定时轮询的形式太过粗暴。它应该还要考虑本地 temporal 负载情况，cpu 消耗情况。你联网搜索告诉我有没有甚好的最佳实践？如果没有，跟根据业界最好的经验告诉我一个方案。