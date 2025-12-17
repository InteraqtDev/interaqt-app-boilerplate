# openAPI 改造

我们的项目中 @app.ts 脚本会将 backend 中定义的所有 Interaction 和所有 integration 中定义的 custom api 暴露成 http api 给前端。现在前端已经可以通过 `npm run generate-frontend-api` 命令来生成前端需要的接口信息了。接下来我们需要将整个 api 生成过程改造成使用 openAPI 协议的形式，并使用 openAPI 的工具生成更加准确的、类型严格的前端需要的信息。你来帮我改造：
1. 注意，后端的 interaction 中，query 类的 interaction 中有些参数例如 attributeQuery，是可以无限递归的，因为它支持查询关系。你要正确处理这种情况。
2. 前端只要保证最终用户仍然是像使用 @frontend/api/APIClient.ts 一样来使用就够了，你可以忽略已有的实现，设计一个更好的实现方法。
3. 完整阅读项目已有的所有内容，确保你完整理解了北京