# 开始项目

## 1. 要求
- 安装 nodejs
- 安装 docker desktop，开启 kubernetes

## 2. 本地部署与环境准备

### 2.1 link 本地 deploy-tool
```
cd deploy-tool
npm link ./
```

### 2.2 创建 `config/deploy.dev.json`
运维参考 `config/deploy.dev.example.json`。
产品直接联系运维获取所需要的所有秘钥。

### 2.3 执行第一次组件与中间件等部署

执行一次部署是为了：
- 启动数据库
- 产出 app.config.json，里面包含了各种服务需要的地址

```
deploy-tool deploy --env dev // 执行 dev 环境的部署
```

通过 docker desktop 确定所有需要的 container 都是 running 状态

## 3. 应用启动准备

### 3.1 安装后端包
```
npm i
```

### 3.2 安装前端包
```
cd frontend
npm i
```

### 3.3 启动验证

启动主组件:
```
npm run dev:setup:main // 生成 integration entry & 初始化主组件数据库
npm run dev:start:main // 启动本地服务器
```

启动异步任务组件:
```
npm run dev:start:async-task
```
这一步只是启动验证所有的服务连接正常。
如果命令行没有任何报错，即可开始生成业务逻辑。
启动之前可以关闭掉之前启动的主程序和异步任务容器服务。

## 4. 使用 claude code 开始生成业务逻辑

注意，我们的业务逻辑和实现都是模块化的。如果过是第一个模块，名字一定要用 basic ，并且登录相关的需求都在这里声明。

### 4.1. 写模块需求
在 `requirements` 下创建模块需求文档。如 `requirements/basic.requirements.md`。如果有前端需求，单独创建 `requirements/basic.requirements.frontend.md`

### 4.2. 告知模型当前模块
创建 `.currentmodule` 文件，填入当前模块名，例如 `basic`。

### 4.3. 启动 claude code
启动之后只需要输入 `continue` 即可。

### 4.4. 等待完成
默认后端会从需求分析开始一直完成到外部 api 集成。当前进度会记录在 `agentspace/{module-name}.status.json` 中。如果中途失败退出，可以通过这个文件查看原因。一般能在 `agentspace/error` 目录下找到问题记录。

#### 4.4.1. 失败重置
我们提供了大 task 级别的重置。
```
npm run reset 1 // 重置所有产出
```
```
npm run reset 2 // 重置掉 task 2 以及之后的所有产出，task 1 的产出保留。重新开始任务时，将从 task 2 开始
```

### 4.5. 前端任务
我们在提示词中，默认只会完成后端所有任务。如果还需要完成前端，需要完成前端，需要单独跟 claude code 说: 完成当前模块的前端功能。


## 5. 本地开发启动应用
```
npm run dev:setup:main // 生成 integration entry & 初始化数据库
npm run dev:start:main // 启动本地服务器
```
```
npm run dev:start:async-task // 启动异步任务组件
```

都成功之后访问 http://localhost:3000