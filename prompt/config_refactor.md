# config refactor

我们现在在应用逻辑中所需要的很多 key 、地址等信息是通过环境变量配置的。我们要改成使用 json 文件的形式，因为它能更好地结构化。

我们的系统由三个组件组成：业务逻辑组件/通信组件/长任务容器组件。

在我们的设计中，配置信息是分层的：
- 应用层。分不同的组件，每个组件表达：
  - 依赖什么中间件、独立工具以及他们的版本。例如 Postgres/minio/redis。表达某些运维相关的但又在代码里必填的字段。
  - 依赖什么外部服务，以及必要的参数。表达需要运维填写的其他配置，例如需要的外部 api 的地址、key 等。
- 运维层。分不同环境，例如 dev/prod/test。表达该环境下每个组件的每个依赖的具体运维信息。
  - 对于中间件依赖。表达：
    - 使用兼容的云服务还是自己部署到容器里
    - 必须的配置信息
    - 应用层要求的在应用层必填的字段。
  - 对于外部服务。表达：
    - 应用层要求必填的外部字段。

最终有一个命令行工具根据 应用层信息 + 运维层信息，生成一个完整的 app.config.json 文件。
在应用的每个组件里，只要引入这个文件，就能获取所有信息。
注意，应用的各个组件是独立部署，并且之间是要通信的，生成的 config 里也要有组件的地址。

现在你来按照上面的计划帮我一个一个执行下面的任务，完成一个就停下来等我 review。你的所有任务文档产出都放到 `prompt/output/deploy` 下。特别注意，你应该专注于要你完成的具体任务，不要发散，不要自己写实施计划之类的内容。

## 任务1. 设计应用层和运维层和最终 `app.config.json` 的 json 结构
设计应用层和运维层的 json 结构。注意他们的文件都放在 `config` 目录下。应用层所有组件的表达写在一个文件里。运维层的不同环境要拆不同的文件。
注意：
- 组件可能对同一类型的依赖可能有多个，例如依赖两个 postgresql 数据库，所以你应该让用户能自己取名做索引，而不是自动用类型做索引。

## 任务2. 实现 `app.config.json` 的生成脚本
实现一个脚本来根据 application.json 和 deploy.{env}.json 来生成 app.config.json。它接受参数来指定 env。
在脚本中应该先检查：
- deploy.{env}.json 中，是否有所有 application.json 中 middlewareDependencies/externalServices/applicationConfig requiredFields。如果缺少就立刻报错说明缺少什么。
- deploy.{env}.json 中是否有 deploymentType 规则冲突：
  - 当顶层 provider 为 local 时，component 的 deploymentType 是 local|container。当顶层 provider 不是 local 时，component deploymentType 只能是 container|cloud。
  - 当 middleware deploymentType 为 container 时，必须有 use 字段表达具体使用什么软件。

脚本中应该给每个 component 和 middlewareDependencies 生成一个空白的 endpoint 字段。之后 deploy tool 来填写。

## 任务3. 完成部署工具的设计和实施计划
接下来你来设计部署工具，要求：
0. 完整阅读上面的任务，理解我们已经有的配置。理解已经有的产出：`prompt/output/deploy/task-1-json-schema-design.md` , `prompt/output/deploy/task-2-generate-config-script.md`
1. 工具所有源码放到 `deploy-tool` 中。
2. 工具底层使用 terraform，因为我们不仅要管理 k8s，未来还要管理域名。
3. 集成或者拷贝上一步生成 app.config.json 的脚本，根据其中的信息来完成部署。部署的顺序应该是：
  3.1. 所有 cloud 类型的 dependency，获取服务的 endpoint，下一步使用。如果已经有 endpoint，说明就不用部署了。
  3.2. 填写所有 middleware/components 的 endpoint 字段，如果是 container 部署的，按照 k8s 内部 dns `<service-name>.<namespace>.svc.cluster.local` 来写。component deploymentType 为 local 时，使用 `host.docker.internal:{port}`。填写完重新将所有数据写到 `app.config.json` 中
  3.3. 部署 container 类型的 dependency。
  3.4. 部署所有 components。
4. provider 为 local 时，碰到 deploymentType 为 local 的情况，说明用户自己启动，不需要部署。deploymentType 为 container 时，使用本地 docker desktop k8s 进行部署。
5. 你的设计中，具体实施步骤应该分阶段，并且每个阶段都要有明确的测试方法，提出测试用例编写要求。

## 任务4. 实现部署工具
完整阅读上面的内容，理解我们的工具目标。严格按照 `prompt/output/deploy/task-3-deploy-tool-design.md` 进行实现。
注意：
- 每个阶段都应该直接执行测试用例。用例通过了才能继续。
- 执行过程中不能通过任何简化或者其他方法绕过问题，遇到实在解决不了的问题应该停下来问我。