/**
 * Component 配置工厂
 *
 * 负责创建和管理不同类型的 Component 配置实例
 * 支持类型推断和动态注册
 */
import { ComponentConfig, ComponentContext } from "./base.js";
import { NodeJSAppConfig } from "./implementations/nodejs-app.js";
import { FinalComponent } from "../../types.js";

/**
 * Component 类型定义
 */
export type ComponentType = "nodejs" | "python" | "go" | "static" | "custom";

/**
 * Component 配置工厂类
 */
export class ComponentConfigFactory {
  /**
   * 配置类注册表
   * key: component 类型
   * value: 配置类构造函数
   */
  private static registry = new Map<ComponentType, () => ComponentConfig>();

  /**
   * 初始化工厂，注册所有内置 component 类型
   */
  static initialize(): void {
    // 注册 Node.js 类型（默认类型）
    this.register("nodejs", () => new NodeJSAppConfig());
  }

  /**
   * 注册 component 配置类
   *
   * @param type component 类型
   * @param factory 配置类工厂函数
   *
   * @example
   * ```typescript
   * ComponentConfigFactory.register('python', () => new PythonAppConfig());
   * ```
   */
  static register(type: ComponentType, factory: () => ComponentConfig): void {
    this.registry.set(type, factory);
  }

  /**
   * 创建 component 配置实例
   *
   * 支持多种方式确定类型：
   * 1. 显式配置：config.type
   * 2. 镜像名称推断
   * 3. 默认：nodejs
   *
   * @param ctx Component 部署上下文
   * @returns component 配置实例
   *
   * @example
   * ```typescript
   * const config = ComponentConfigFactory.create(ctx);
   * const spec = config.getContainerSpec(ctx);
   * ```
   */
  static create(ctx: ComponentContext): ComponentConfig {
    const type = this.inferType(ctx);
    const factory = this.registry.get(type);

    if (!factory) {
      throw new Error(`Unknown component type: ${type}. ` + `Available types: ${Array.from(this.registry.keys()).join(", ")}`);
    }

    return factory();
  }

  /**
   * 推断 component 类型
   *
   * 推断逻辑：
   * 1. 检查 config 中是否有 type 字段（显式指定）
   * 2. 根据镜像名称推断（如包含 "python"、"nginx" 等）
   * 3. 默认返回 nodejs
   *
   * @param ctx Component 部署上下文
   * @returns 推断出的类型
   */
  private static inferType(ctx: ComponentContext): ComponentType {
    const config = ctx.config as any;

    // 1. 显式配置（优先级最高）
    if (config.type) {
      return config.type as ComponentType;
    }

    // 2. 根据镜像名称推断
    const imageName = ctx.componentName.toLowerCase();

    if (imageName.includes("python") || imageName.includes("py")) {
      return "python";
    }

    if (imageName.includes("go") || imageName.includes("golang")) {
      return "go";
    }

    if (imageName.includes("nginx") || imageName.includes("static") || imageName.includes("web")) {
      return "static";
    }

    // 3. 默认类型：Node.js
    return "nodejs";
  }

  /**
   * 检查 component 类型是否已注册
   *
   * @param type component 类型
   * @returns 是否已注册
   */
  static isRegistered(type: ComponentType): boolean {
    return this.registry.has(type);
  }

  /**
   * 获取所有已注册的 component 类型
   *
   * @returns 已注册的类型列表
   */
  static getRegisteredTypes(): ComponentType[] {
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
ComponentConfigFactory.initialize();
