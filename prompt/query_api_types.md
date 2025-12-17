# Query API attributeQuery validation
我们的前端使用的接口是通过 `npm run generate-frontend-api` 生成的，现在对于 interaction 生成的接口已经有比较好的 payload 类型。但是对于 query 类的 interaction 的 attributeQuery 字段还没有严格类型。所有的 Interaction api 都共用了一个非常宽松的 attributeQuery 字段类型，你来帮我实现严格的类型。按照下面的任务一个一个执行

# 任务一 制定计划
要求：
1. 先完整阅读项目，了解后端的定义和 api 是如何生成的。
2. 充分理解后端的 Entity/Relation 是图的关系，是有循环的。因为 attributeQuery 可以获取关联实体的对象，这意味它是可以递归下去的。
3. 制定严格类型生成的计划。注意，我们可以创建新的脚本工具先直接加载整个后端，从Entity/Relation 信息中生成出更方便生成类型的数据结构。因为 typescript 类型并不能完美处理无限递归的问题，所以我们既要有严格类型检测方案，又要有使用 zod 在运行时也进行检测的方案，zod 可以保证检测递归的情况。
4. 制定的执行计划写成 TODO 的形式放到 `prompt/output` 下。方便跟踪进度。
5. 方案只关注技术本身，不要写人力、时间等多余信息。

# 任务二 执行计划
完全理解当前改造任务，严格按照 `prompt/output/attributeQuery-strict-types-plan.md` 执行。
特别注意：
1. 当前改造任务的重点是生成脚本的改造。改造完之后你应该运行脚本，验证新的生成结果，而不是直接去修改生成结果。