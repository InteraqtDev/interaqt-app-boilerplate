/**
 * Component 配置模块导出
 */

// 导出抽象层 - 只导出类
export { BaseComponentConfig } from "./base.js";

// 导出类型
export type { ComponentConfig, ComponentContext, ImageConfig, ContainerSpec, ServiceSpec, ResourceRequirements, ContainerPort, ServicePort, EnvVar, ProbeConfig, Probe, HttpProbe, TcpProbe, ExecProbe } from "./base.js";

// 导出工厂
export { ComponentConfigFactory } from "./factory.js";
export type { ComponentType } from "./factory.js";

// 导出具体实现（可选，通常通过工厂使用）
export { NodeJSAppConfig } from "./implementations/nodejs-app.js";
