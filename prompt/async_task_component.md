# Async Task Component

## 背景
当前的系统由三个 Component 组成：
- main: 处理状态数据相关的业务逻辑。
- communication: 保持 websocket 连接，提供向前端分发消息的能力。
- asyncTask: 提供将同步任务转化成异步返回的形式，提供多步任务的管理、任务的重试等机制。

现在你来按照下面的任务一步一步来实现 async task component。要求：
1. 所有文档产出，默认放到 `prompt/output` 下。
2. 每一个任务都专注于任务中的技术本身，没有要求的内容，不要发散。例如人力估算、时间成本之类的，用户没有要求就不要写。
3. 任何执行的过程都要严谨、诚实，遇到困难要直接解决困难，不能用任何方式绕过去。实在解决不了，应该停下等用户指导。


## 任务一 添加 temporal middleware
为 asyncTask component 添加 temporal middleware。使用 temporal 的一体部署模式。使用 `deploy-tool` 完成本地的部署，并且确保服务正常。
你所需要的添加 middleware 和如何部署的知识都在 `deploy-tool` 的文档中。

## 任务二 实现 async task component 
我们已经成功完成了 temporal middleware 的部署
我们的 async task compnent 底层使用 temporal 来实现。它自己的启动脚本质上就是 temporal 的 worker 脚本。它应该：
1. 收集 integrations 下所有的 integration 定义的 workflows（默认在 integration 的 workflows 目录下）。注意，应该有一个黑名单，把 example integration 都排除出去。
2. 为每个 integration workflows 都用单独的 Worker。
3. temporal server 已经正确部署好了。在 integrations 下新建一个测试用的，有 workflows 的 integration ，然后进行测试，确保一切正常。


## 任务三 改造 nanobanana2 integration
我们使用 async task component 的目的之一是将耗时长的同步返回的api 改造成异步返回的任务。
接下来你将 nanobananan2-image 这个 integration 使用已经实现好的 temporal workflow 机制改造成异步任务的版本。
注意：
1. 你应该完整阅读上面的内容，完全理解我们已经完成的工作，理解 workflow 的用法。
2. 将调用 nanobanana2 api + 上传图片到 object storage的部分改造成启动 workflow 并立刻返回，并像其他的异步任务 integration 一样，提供 api 来查询任务状态，在查询时才真正做状态同步。
3. 在 `tests` 下仿照已有的 integration 创建新的测试用例，并确保通过，功能正确。

## 任务四 改造 fangzhouVideoGeneration integration
有很多外部服务提交任务和查询任务结果是两个 api 独立完成的。我们已经在 integration 中实现了 custom api，允许用户手动来查询结果。现在需要借助 temporal workflow 的能力完成轮询自动查询。要求：
1. 也应该像任务三中的 nanobanana2 integration 一样提供上报任务结果的 api，给负责轮询结果的 workflow 使用。如果轮询的 workflow 查询到了结果，就调用 api 来上报结果。注意，api 在上报时还是应该重新查询一下是不是已经通过手动查询等手段有结果了，只有没结果才真正继续处理。
2. 手动查询接口如果查到了数据，也应该通过 signal 机制通知轮询 workflow 停止。
3. 在 `tests` 下仿照已有的 integration 创建新的测试用例，并确保通过，功能正确。所有代码都没有类型错误。

## 任务五 迁移 fangzhouVideoGeneration integration 发起外部 api 请求代码
我们决定把外部任务的调用、结果查询，以及通知当前系统状态改变的代码全部都交由 temporal 处理，这样架构更加整洁。
接下来你来帮我实现。要求：
1. 外部任务的调用、结果查询，以及通知当前系统状态改变的代码全部都交由 temporal 处理。
2. 去掉原本 integration 中手动查询外部 api 的代码。integration 中只负责和 temporal workflow 通信。

## 任务六 迁移 nanobanana2 integration 中的代码
我们已经完全完成任务五。实现了 integration 中主代码和 temporal 中workflow 的职责重构。现在你来按照同样标准重构 nanobanana2 integration，将外部任务的调用、结果查询，以及通知当前系统状态改变的代码全部都交由 temporal 处理。

## 任务七 更新 `.claude/agents/integration-generation-handler.md`
我们已经完全完成了上面的任务，实现了：外部任务的调用、结果查询，以及通知当前系统状态改变的代码全部都交由 temporal 处理，integration 只和 temporal workflow 交互。

我们之前指导 agent 生成 integration 的文档中使用的范式和现在不同，需要更新。你来更新。要求：
0. 你要完整阅读之前的两个 integration，充分理解两种不同情况的 api 在调用时我们是怎么处理的。
1. 只需要在文档中总结性地提到新的范式，因为我们会把参考的源码直接放到目录下，agent 在真正执行时是可以参考到的。但是你不能在文档里只写引用，不写范式内容。
2. 修改和新增的信息要严格控制 token 数，因为是给 agent 读的，尽量保持删改后的差不多即可。
3. 这是个线性的任务指导文档，所以你完整阅读，找到最合适的任务步骤位置来写，不能笼统地写。