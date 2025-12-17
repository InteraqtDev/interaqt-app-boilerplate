/**
 * Middleware 配置模块导出
 */

// 导出抽象层 - 只导出类，类型通过 type export 导出
export { BaseMiddlewareConfig } from "./base.js";

// 导出类型
export type { MiddlewareConfig, MiddlewareEnvironment, ContainerSpec, ServiceSpec, ResourceRequirements, ContainerPort, ServicePort, EnvVar, EndpointSpec, SidecarContainerSpec } from "./base.js";

// 导出工厂
export { MiddlewareConfigFactory } from "./factory.js";

// 导出具体实现（可选，通常通过工厂使用）
export { PostgreSQLMiddlewareConfig } from "./implementations/postgresql.js";
export { PGliteMiddlewareConfig } from "./implementations/pglite.js";
export { MinIOMiddlewareConfig } from "./implementations/minio.js";
export { KafkaMiddlewareConfig } from "./implementations/kafka.js";
export { RedisMiddlewareConfig } from "./implementations/redis.js";
export { CentrifugoMiddlewareConfig } from "./implementations/centrifugo.js";
export { TemporalMiddlewareConfig } from "./implementations/temporal.js";
