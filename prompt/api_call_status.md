# API Call Status Refactor

API call entity 的 status 类型，现在是 pending|processing|completed|failed ，需要增加一个 queued，表示已被 temporal worker 拉取。变成：pending|queued|processing|completed|failed 。
状态机转换规则变成：
integration 中现在发出的事件也应该完全符合新的状态机：
- pending -> queued
- queued -> processing|failed
- processing -> completed|failed
- failed -> queued

## 任务一 增加 queued 状态
API call entity 的设计是从 `.claude/agents/task-1-requirements-analysis-handler.md` 开始的。你来修改文档，并且要找到 `.claude/agents` 下所有 sub agents 相关的地方，做相应的修改。注意，直接覆盖原本的信息，不要写新旧信息对比。

## 任务二 status computation 状态机修改
生成 status 字段状态机 computation 的 agent 是 `.claude/agents/computation-generation-handler.md`。
status 字段本来是受 api call event entity 影响。api call event entity 现在也要增加queued状态上报类型 。
在 status 的 computation 状态机中，要按照新的规则来写：

- pending -> queued
- queued -> processing|failed
- processing -> completed|failed
- failed -> queued

你来找到文档中相应的地方进行修改。

## 任务三 继续增加 queued -> failed 的状态机转换
我们已经完成了任务二，因为考虑到可能直接调用外部 api 失败，所以应该增加一个 queued -> failed 的状态机转换。
你来帮我找到 `.claude/agents` 下所有 sub agents 相关的地方，做相应的修改。

## 任务四 startedAt 的 computation 类型
startedAt 字段也是一个状态机，当从 pending -> queued 或者从 failed -> queued 时，就记录时间。
由于 startedAt 字段和 status 字段很类似，computation 的决策是在很早的任务就开始的，所以你应该找到 `.claude/agents` 下所有 sub agents 相关的地方，做相应的修改。


## 任务五 attempts 的 computtion 类型
attempts 字段也是一个状态机，当从 queud -> failed 或者从 processing -> completed|failed 时，就 +1 。
由于 attempts 字段和 startedAt 字段很类似，computation 的决策是在很早的任务就开始的，所以你应该找到 `.claude/agents` 下所有 sub agents 相关的地方，做相应的修改。

## 任务六 修改 integration 中的事件信息
integration 中现在发出的事件也应该完全符合新的状态机：
- pending -> queued
- queued -> processing|failed
- processing -> completed|failed
- failed -> queued

你来找到 `.claude/agents` 下对应的 integration 的文档进行修改。注意，对于异步返回结果类型的外部 api，processing 事件是在真实调用外部提交任务的 api 后才触发的。但对于同步返回结果类型的外部 api，processing 事件应该是在调用 api 前发出的，并且 externalId 直接使用 api call id 就行。

## 任务七 修改已有的代码
我们已经完成上面的所有任务。现在要开始按照新的设计修改已有的代码。
你先完整理解上面的任务，并且阅读当前 `backend` 下的代码和 `integration` 下的代码。
指定一个完整的计划，按照模块一个一个地来进行修改。注意，每个模块修改完还要修改对应 `tests` 下的测试用例，确保测试用例全部通过，再修改下一个模块。 

## 任务八 全部使用 api call id 替代 externalId
由于有了 temporal workflow 的上下文，所以我们所有的发出的 api call event 都可以有正确的 api call id，并且 status/startedAt/attempts 这几个字段的状态机也只要使用 api Call id 进行匹配就行了，不再需要区别对待。
你来帮我修改 `.claude/agents` 下所有相关的文档。注意：
1. 保留原本的 externalId 字段，以及对应的设置逻辑。在 processing 这个事件中还是传递 externalId，方便之后 debug。
2. 直接替换原本的信息，不要在文档里做新旧信息的对比。

## 任务九 完成代码修复
我们已经成功完成任务八，接下来你来完成 `backend` 和 `integration` 下所有的代码修改。要求：
1. 先完全整理解新修改的内容。
2. 制定一个完整的计划，一个模块一个模块的修改。每个模块都要保证 `tests` 下的测试用例完全通过。
