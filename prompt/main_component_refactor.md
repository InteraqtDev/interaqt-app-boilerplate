# main component 文件目录重构

## 任务一
目前 main component 的文件基本都在根目录下，难以管理，你来帮我重构：
1. 新建 main-component 目录。
2. 将下面文件迁移进去，并且修正所有的引用：
 - app.ts
 - initialData.ts
 - database.ts
 - dbclients
3. 确保项目没有任何类型错误

## 任务二 将 Integration 需要的抽象提取出来
将 Integration 需要的抽象从 main-component/app.ts 中提取出来放到 Integration 的类型文件中。应该是 main-component/app.ts 中去引用 Integration 中的类型。注意所有的 example integration 也需要修改。应该保证整个项目没有类型错误。

## 任务三
将根目录下的 setup 和 start 类型的脚本，移动到对应的 component 目录下去。并修正所有引用这些脚本的地方。