/**
 * Middleware 配置工厂
 *
 * 负责创建和管理不同类型的 Middleware 配置实例
 * 使用工厂模式，支持动态注册和创建
 */
import { MiddlewareConfig } from "./base.js";
import { PostgreSQLMiddlewareConfig } from "./implementations/postgresql.js";
import { PGliteMiddlewareConfig } from "./implementations/pglite.js";
import { MinIOMiddlewareConfig } from "./implementations/minio.js";
import { KafkaMiddlewareConfig } from "./implementations/kafka.js";
import { RedisMiddlewareConfig } from "./implementations/redis.js";
import { CentrifugoMiddlewareConfig } from "./implementations/centrifugo.js";
import { TemporalMiddlewareConfig } from "./implementations/temporal.js";

/**
 * Middleware 配置工厂类
 */
export class MiddlewareConfigFactory {
  /**
   * 配置类注册表
   * key: middleware 类型（小写）
   * value: 配置类构造函数
   */
  private static registry = new Map<string, () => MiddlewareConfig>();

  /**
   * 初始化工厂，注册所有内置 middleware 类型
   */
  static initialize(): void {
    // 注册内置 middleware
    this.register("postgresql", () => new PostgreSQLMiddlewareConfig());
    this.register("pglite", () => new PGliteMiddlewareConfig());
    this.register("minio", () => new MinIOMiddlewareConfig());
    this.register("kafka", () => new KafkaMiddlewareConfig());
    this.register("redis", () => new RedisMiddlewareConfig());
    this.register("centrifugo", () => new CentrifugoMiddlewareConfig());
    this.register("temporal", () => new TemporalMiddlewareConfig());
  }

  /**
   * 注册 middleware 配置类
   *
   * @param type middleware 类型（会自动转为小写）
   * @param factory 配置类工厂函数
   *
   * @example
   * ```typescript
   * MiddlewareConfigFactory.register('redis', () => new RedisMiddlewareConfig());
   * ```
   */
  static register(type: string, factory: () => MiddlewareConfig): void {
    const normalizedType = type.toLowerCase();
    this.registry.set(normalizedType, factory);
  }

  /**
   * 创建 middleware 配置实例
   *
   * @param type middleware 类型
   * @returns middleware 配置实例
   * @throws 如果 middleware 类型未注册
   *
   * @example
   * ```typescript
   * const config = MiddlewareConfigFactory.create('postgresql');
   * const spec = config.getContainerSpec(env);
   * ```
   */
  static create(type: string): MiddlewareConfig {
    const normalizedType = type.toLowerCase();
    const factory = this.registry.get(normalizedType);

    if (!factory) {
      throw new Error(`Unknown middleware type: ${type}. ` + `Available types: ${Array.from(this.registry.keys()).join(", ")}`);
    }

    return factory();
  }

  /**
   * 检查 middleware 类型是否已注册
   *
   * @param type middleware 类型
   * @returns 是否已注册
   */
  static isRegistered(type: string): boolean {
    const normalizedType = type.toLowerCase();
    return this.registry.has(normalizedType);
  }

  /**
   * 获取所有已注册的 middleware 类型
   *
   * @returns 已注册的类型列表
   */
  static getRegisteredTypes(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * 清空注册表（主要用于测试）
   */
  static clear(): void {
    this.registry.clear();
  }
}

// 自动初始化工厂
MiddlewareConfigFactory.initialize();
