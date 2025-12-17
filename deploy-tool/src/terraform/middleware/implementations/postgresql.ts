/**
 * PostgreSQL Middleware 配置
 */
import { BaseMiddlewareConfig, MiddlewareEnvironment, ContainerSpec, ServiceSpec, ResourceRequirements, EnvVar } from "../base.js";

export class PostgreSQLMiddlewareConfig extends BaseMiddlewareConfig {
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
    return {
      limits: { cpu: "1000m", memory: "1Gi" },
      requests: { cpu: "100m", memory: "256Mi" },
    };
  }

  /**
   * PostgreSQL 默认端口
   */
  getDefaultPort(): number {
    return 5432;
  }

  /**
   * PostgreSQL 使用 postgresql:// 协议
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
