/**
 * Redis Middleware 配置
 *
 * Redis 是高性能的内存数据存储，用于：
 * - 缓存
 * - 会话存储
 * - 消息队列
 * - 发布订阅
 */
import { BaseMiddlewareConfig, MiddlewareEnvironment, ContainerSpec, ServiceSpec, ResourceRequirements, EnvVar } from "../base.js";

export class RedisMiddlewareConfig extends BaseMiddlewareConfig {
  getImage(env: MiddlewareEnvironment): string {
    // 使用配置中的版本，如果没有则使用默认版本
    const version = env.version || "7-alpine";
    return `redis:${version}`;
  }

  getContainerSpec(env: MiddlewareEnvironment): ContainerSpec {
    const args: string[] = [];

    // 如果配置了密码，添加 requirepass 参数
    if (env.config.password) {
      args.push("--requirepass", env.config.password);
    }

    // 如果配置了最大内存，添加 maxmemory 参数
    if (env.config.maxmemory) {
      args.push("--maxmemory", env.config.maxmemory);
    }

    // 如果配置了驱逐策略，添加 maxmemory-policy 参数
    if (env.config.policy) {
      args.push("--maxmemory-policy", env.config.policy);
    }

    return {
      image: this.getImage(env),
      command: [],
      args: args,
      ports: [{ container_port: 6379, name: "redis", protocol: "TCP" }],
      env: this.getEnvironmentVariables(env),
    };
  }

  getServiceSpec(env: MiddlewareEnvironment): ServiceSpec {
    return {
      ports: [{ name: "redis", port: 6379, target_port: 6379, protocol: "TCP" }],
      type: this.getServiceType(env),
    };
  }

  getResources(): ResourceRequirements {
    return {
      limits: { cpu: "500m", memory: "512Mi" },
      requests: { cpu: "50m", memory: "128Mi" },
    };
  }

  /**
   * Redis 使用 redis:// 协议
   */
  getDefaultProtocol(): string {
    return "redis";
  }

  /**
   * 获取环境变量
   */
  private getEnvironmentVariables(env: MiddlewareEnvironment): EnvVar[] {
    const envVars: EnvVar[] = [];

    // Redis 主要通过命令行参数配置，环境变量较少
    // 这里保留为扩展点

    return envVars;
  }
}
