我们自己设计一个 deploy-tool 在 deploy-tool 目录下。我们的需求是：
1. 所有的 middleware 先部署，并且所有部署好了的 endpoint 地址都写入到一个中心化的 app.config.json 中。
2. main 组件应该最后部署，因为代码中依赖了 app.config.json。
3. 由于部署是直接部署 build 的镜像，而 app.config.json 是部署时还在更新的，所以需要一定的机制能够注入到 main component 的部署时去。
4. main component 的前端 build 明确依赖了最终生成好的 app.config.json 中的 publicUrl，所以需要最后在线上 build。

你来帮我完整深入分析 deploy-tool 下的代码，告诉我现在 deploy-tool 的流程是怎样的，能不能完成上面的需求，如果不能完成，哪里还有问题。