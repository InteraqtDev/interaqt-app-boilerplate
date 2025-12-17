# 中间件的云端替代

我们常用的中间件，例如 postgres/kafka/redis 等在各个 provider 上都有完全兼容的云端替代。接下来你来帮我实现 `deploy-tool` 中使用云端替代的方案。要求：
0. 完整阅读 `deploy-tool` 下已有的代码和文档，对部署工具的流程、代码结构完全掌握。
1. 在 `deploy-tool` 中要内置了各个 provider 常见的中间件替换的云服务的信息。每个 provider 单独写，这样方便扩展和修改。
2. 实现当 deploymentType 为 `cloud` 时，并且没有 `endpoint` 字段时，就说明用户需要部署对应的云服务。deploy-tool要自动部署，并填充 endpoint 字段。
3. 在 `deploy-tool/docs` 下写新文档来说明如何新增 middleware 时，如何编写 provider 的云端替代。