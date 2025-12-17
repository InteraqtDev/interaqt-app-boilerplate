import { FinalConfig, ValidationResult, FinalMiddleware, FinalComponent, EndpointDefinition } from "../types.js";
import { MiddlewareConfigFactory, EndpointSpec } from "../terraform/middleware/index.js";

/**
 * Provider 基类
 * 定义所有云服务提供商需要实现的接口
 */
export abstract class BaseProvider {
  /**
   * 获取 Provider 名称
   */
  abstract getName(): string;

  /**
   * 验证配置是否符合该 Provider 的要求
   */
  abstract validateConfig(config: FinalConfig): ValidationResult;

  /**
   * 获取 K8s context（如果使用 Kubernetes）
   * 返回 null 表示不使用 K8s
   */
  abstract getK8sContext(): string | null;

  /**
   * 解析中间件的所有 endpoint
   * 返回 Record<endpointName, endpointValue>
   * @param componentName 组件名称
   * @param middlewareName 中间件名称
   * @param middleware 中间件配置
   * @param namespace Kubernetes 命名空间
   * @param endpointDefinitions endpoint 定义列表
   */
  abstract resolveMiddlewareEndpoints(
    componentName: string,
    middlewareName: string,
    middleware: FinalMiddleware,
    namespace: string,
    endpointDefinitions: EndpointSpec[]
  ): Record<string, string>;

  /**
   * @deprecated 请使用 resolveMiddlewareEndpoints 替代
   * 解析中间件的主 endpoint（向后兼容）
   * 对于 cloud 类型，返回配置中的 endpoint
   * 对于 container 类型，返回 K8s 内部 DNS
   */
  resolveMiddlewareEndpoint(componentName: string, middlewareName: string, middleware: FinalMiddleware, namespace: string): string {
    // 获取 endpoint 定义
    const endpointDefinitions = this.getMiddlewareEndpointDefinitions(middleware.type);
    const endpoints = this.resolveMiddlewareEndpoints(componentName, middlewareName, middleware, namespace, endpointDefinitions);
    // 返回 main endpoint
    return endpoints["main"] || Object.values(endpoints)[0] || "";
  }

  /**
   * 获取中间件的 endpoint 定义
   * @param type 中间件类型
   */
  protected getMiddlewareEndpointDefinitions(type: string): EndpointSpec[] {
    try {
      const config = MiddlewareConfigFactory.create(type);
      // 使用最小化的环境配置获取 endpoint 定义
      const minimalEnv = {
        provider: "local" as const,
        namespace: "default",
        middlewareName: "temp",
        config: {},
      };
      return config.getEndpointDefinitions(minimalEnv);
    } catch (error) {
      // 如果无法创建配置，返回默认的单 endpoint
      return [
        {
          name: "main",
          port: 8080,
          protocol: "http",
          publicAccess: false,
        },
      ];
    }
  }

  /**
   * 解析组件的 endpoint
   * 对于 local 类型，返回 host.docker.internal
   * 对于 container 类型，返回 K8s 内部 DNS
   */
  abstract resolveComponentEndpoint(componentName: string, component: FinalComponent, namespace: string): string;

  /**
   * 获取命名空间名称
   */
  getNamespace(environment: string): string {
    return `lit-${environment}`;
  }

  /**
   * 获取服务名称
   */
  getServiceName(name: string): string {
    return `${name}-svc`;
  }

  /**
   * 获取中间件的默认端口
   *
   * 改进：从 Middleware 配置类获取，而不是硬编码映射表
   * 这样新增 middleware 时无需修改 Provider
   *
   * @param type middleware 类型
   * @returns 默认端口号
   */
  protected getMiddlewarePort(type: string): number {
    try {
      const config = MiddlewareConfigFactory.create(type);
      return config.getDefaultPort();
    } catch (error) {
      // 如果无法创建配置（未知类型），使用默认值
      console.warn(`无法获取 middleware ${type} 的端口配置，使用默认值 8080`);
      return 8080;
    }
  }

  /**
   * 获取中间件的默认协议
   *
   * 从 Middleware 配置类获取协议信息
   * 用于生成 endpoint URL 的协议部分
   *
   * @param type middleware 类型
   * @returns 协议名称（如 http, postgresql, redis 等）
   */
  protected getMiddlewareProtocol(type: string): string {
    try {
      const config = MiddlewareConfigFactory.create(type);
      return config.getDefaultProtocol();
    } catch (error) {
      // 如果无法创建配置（未知类型），使用默认值
      console.warn(`无法获取 middleware ${type} 的协议配置，使用默认值 http`);
      return "http";
    }
  }
}
