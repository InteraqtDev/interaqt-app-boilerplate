# Deploy Communication Component

我们的应用分成三个部分，第一个部分是业务逻辑组件，已经部署好。
第二个是通信组件，现在开始部署。它依赖于 centrifugo。

接下来你来按照我的指导，一个一个完成下面的任务。注意，要求你产出文档时，应该关注任务本身，文档简洁，不要发散地写人力、时间预计等不相关信息。

## 任务一 补充 `application.json` 和 `deploy.{env}.json`
学会我们的专属部署工具 `deploy-tool` 的用法。按照它的指导，补充 `application.json` 和 `deploy.{env}.json` 中通信 component 的信息。

注意，centrifugo 需要 redis 等消息队列。如果需要。你需要
1. 只在 `deploy.{env}.json` 中的 middleware dependency 中也要加入 redis，因为应用层不关心这个信息，应用层只需要知道 centrifugo 就行了。
2. centrifugo 在部署时就要填入 redis 的信息。
  2.1. 需要再设计一个依赖字段，让 centrifugo 这个 middleware 表达依赖于 redis。表达依赖的时候已改使用依赖的名字（例如 `mq`），而不是类型。
  2.2. 设计一个变量表达方式，将 centrifugo 中需要的填的 redis 相关的信息使用引用的方式来表达 redis middleware 部署后的 endpoint/username/password 等信息。

这个阶段只要完成配置编写即可。

## 任务二 依赖声明与引用注入的实现方案设计
在我们的 `deploy.{env}.json` 中已经设计了引用表达的方式，需要依赖 terraform 的 depends_on 和 output/input 来实现。你来完成实现方案的设计，要求：
0. 阅读 deploy-tool 相关文档，完全理解 component/middleware 等概念。
1. 阅读 `deploy.dev.json` 中引用依赖的例子：centrifugo 依赖 redis，完全理解。
2. 深入阅读 `deploy-tool` 源码，完全掌握，要求你的设计的实现方案代码结构优雅。
3. 注意，云服务的 endpoint 是需要部署完云服务才会分配的，我们也允许引用云服务的 endpoint。你要重点说明怎么处理这种情况，完整流程是怎样的。

你只要产出方案实现文档，不需要实施。

## 任务三 依赖声明与引用注入的实现与测试
严格按照 `prompt/output/terraform-unified-deployment-design.md` 进行依赖声明与引用注入的实现。
要求：
0. 完整前面的文档，了解任务的上下文。
1. 按阶段实施，每个阶段都写测试用例进行测试。确保测试用例全部通过再进行下一步。
2. 完全完成之后，将依赖声明与引用注入的具体实现写成文档放到 `deploy-tool/docs` 下。

## 任务四 重新部署并验证 centrifugo 部署成功
我们已经完成了上面的所有任务，现在来重新部署，并验证 centrifugo 部署成功。要求：
1. 仔细阅读 `deploy-tool` 下的代码和文档，完全了解部署工具功能和代码结构。
2. 开始重新部署，并最终验证 centrifugo 部署成功。如果没有成功，你需要深入源码进行 debug。注意：
  2.1. 我们的目的是让部署工具完全正确，不要视图用任何手动操作去完成部署，例如直接使用 `kubectl`。每一次你修复后你都应该重新尝试部署，验证工具完全正确。
  2.2. 也不要在工具中进行任何的简单修复绕过问题，一定要用最正确的方法，最优雅的代码。如果实在无法完成，就总结问题并退出。