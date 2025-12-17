/**
 * PGlite Middleware 配置
 *
 * 注意: PGlite 是嵌入式数据库，通常不需要单独部署
 * 这里为了配置一致性保留，使用标准 PostgreSQL 镜像
 */
import { BaseMiddlewareConfig, MiddlewareEnvironment, ContainerSpec, ServiceSpec, ResourceRequirements, EnvVar } from "../base.js";

export class PGliteMiddlewareConfig extends BaseMiddlewareConfig {
  getImage(env: MiddlewareEnvironment): string {
    // 使用配置中的版本，如果没有则使用默认版本
    const version = env.version || "14";
    return `postgres:${version}`;
  }

  getContainerSpec(env: MiddlewareEnvironment): ContainerSpec {
    return {
      image: this.getImage(env),
      command: [],
      args: [],
      ports: [{ container_port: 5432, name: "postgres", protocol: "TCP" }],
      env: this.getEnvironmentVariables(env),
    };
  }

  getServiceSpec(env: MiddlewareEnvironment): ServiceSpec {
    return {
      ports: [{ name: "postgres", port: 5432, target_port: 5432, protocol: "TCP" }],
      type: this.getServiceType(env),
    };
  }

  getResources(): ResourceRequirements {
    // PGlite 资源需求较小
    return {
      limits: { cpu: "500m", memory: "512Mi" },
      requests: { cpu: "50m", memory: "128Mi" },
    };
  }

  /**
   * PGlite 使用 postgresql:// 协议（兼容 PostgreSQL）
   */
  getDefaultProtocol(): string {
    return "postgresql";
  }

  /**
   * 获取环境变量
   */
  private getEnvironmentVariables(env: MiddlewareEnvironment): EnvVar[] {
    return [
      { name: "POSTGRES_USER", value: env.config.username || "postgres" },
      { name: "POSTGRES_PASSWORD", value: env.config.password || "postgres" },
      { name: "POSTGRES_DB", value: env.config.database || "postgres" },
    ];
  }
}
