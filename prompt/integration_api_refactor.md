# integration createAPIs 抽象重构任务

## 任务一 API 结构重构
现在 API 类型的设计应该改成更简单的对象的结构，不应该使用函数与配置对象的并集的形式。要求：
- 函数直接用 callback 属性。
- 增加一个 name 属性表达名字。
- 增加一个 namespace 属性表达 namespace。

integration createAPIs 返回值也应该改成数组结构，直接返回新的 API 数组，不再需要 createAPI 这个工具函数。

你来帮我执行。
注意：
1. 所有用到 integration api 的地方都要检查是否有代码需要修改。
2. 所有的 integration 都要按照新的形式改写。包括 example integration。
3. 修改完应该没有任何类型错误。

## 任务二 integration 参数
integration createAPIs 中 API 需要的 namespace 名字，应该是 integration 类在实例化时从构造函数中传入的，而不是自己硬编码的。
namespace 名字的确定应该是在 `integrations/entries/index.ts` 中，这个文件是脚本生成的，所以应该：
1. 修改 createAggregatedIntegration 函数的参数，使用 kv 结构的参数，key 就是 namespace。
2. 修改生成 entry index 的脚本，生成新的 kv 结构参数。

还需要：
1. 修改所有的 Integration 构造函数，接收 namespace 参数，并在 createAPIs 中使用。

## 任务三 integration 中需要回调函数地址
有时我们的 integration 中的 createAPIs 也需要知道 api 最终 url 地址。例如 `integrations/nanobanana2ImageGeneration/index.ts` 中需要把回调地址传给 workflow。
这个地址的拼接是 app.ts 负责的，所以应该由 app.ts 提供一个工具函数来生成拼接地址，app.ts 也使用这个函数来生成地址，保持一致。integration 中直接从 app.ts 中 import 这个工具函数即可。
注意，我们生成的 api 地址现在统一使用 `api/custom/:namespace/apiName` 的形式，不再向后兼容。
你来完成所有修改。

## 任务四 前端修改
因为我们的 custom api 的格式和路径都变了，所以前端也需要修改。目前能确认的前端受到影响的范围有：
1. 前端的类型文件、api 地址等是通过 `npm run generate-frontend-api` 生成的。所以生成脚本需要做对应的修改。
2. 前端的 APIClient 也需要增加 namespace 层级，调用 custom api 时应该使用 `apiClient.custom.{namespace}.{apiName}` 的形式。
你来深入理解前端受到的影响，并完成修改。
注意：最终应该没有任何类型错误。
