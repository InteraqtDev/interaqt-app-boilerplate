import { BaseProvider } from "./base.js";
import { FinalConfig, ValidationResult, FinalMiddleware, FinalComponent } from "../types.js";
import { EndpointSpec } from "../terraform/middleware/index.js";

/**
 * 本地 Provider
 * 使用 Docker Desktop Kubernetes 进行部署
 */
export class LocalProvider extends BaseProvider {
  getName(): string {
    return "local";
  }

  validateConfig(config: FinalConfig): ValidationResult {
    const errors: string[] = [];

    // 验证 provider 字段
    if (config.provider && config.provider !== "local") {
      errors.push(`配置的 provider 为 ${config.provider}，但当前使用 LocalProvider`);
    }

    // 验证组件部署类型
    for (const [componentName, component] of Object.entries(config.components)) {
      const deploymentType = component.deploymentType || "local";

      if (!["local", "container"].includes(deploymentType)) {
        errors.push(`组件 ${componentName} 的 deploymentType 为 ${deploymentType}，` + `local provider 只支持 'local' 或 'container'`);
      }
    }

    // 验证中间件部署类型
    for (const [componentName, component] of Object.entries(config.components)) {
      for (const [middlewareName, middleware] of Object.entries(component.middlewareDependencies || {})) {
        if (!["container", "cloud"].includes(middleware.deploymentType)) {
          errors.push(`组件 ${componentName} 的中间件 ${middlewareName} deploymentType 为 ${middleware.deploymentType}，` + `只支持 'container' 或 'cloud'`);
        }

        // container 类型必须有 use 字段
        if (middleware.deploymentType === "container" && !middleware.use) {
          errors.push(`组件 ${componentName} 的中间件 ${middlewareName} 是 container 类型，必须指定 use 字段`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  getK8sContext(): string | null {
    // Docker Desktop Kubernetes 的默认 context
    return "docker-desktop";
  }

  /**
   * 解析中间件的所有 endpoint
   * 对于 cloud 类型：返回配置中的 endpoints
   * 对于 container 类型：生成 K8s 内部 DNS
   */
  resolveMiddlewareEndpoints(componentName: string, middlewareName: string, middleware: FinalMiddleware, namespace: string, endpointDefinitions: EndpointSpec[]): Record<string, string> {
    const result: Record<string, string> = {};
    const serviceName = middlewareName.toLowerCase();

    // cloud 类型：直接返回配置中的 endpoints
    if (middleware.deploymentType === "cloud") {
      for (const def of endpointDefinitions) {
        // 从现有 endpoints 配置中获取值
        const existingEndpoint = middleware.endpoints?.[def.name];
        result[def.name] = existingEndpoint?.value || "";
      }
      return result;
    }

    // container 类型：使用 K8s 内部 DNS
    // 格式：{protocol}://{service}-svc.{namespace}.svc.cluster.local:{port}
    // 对于 main endpoint，简化为 {service}-svc
    // 对于其他 endpoint，使用 {service}-{endpointName}-svc
    for (const def of endpointDefinitions) {
      // 优先使用 endpoint 定义中的 serviceName（如 distributed 模式下的 temporal-frontend）
      // 否则按默认规则生成：main -> {service}-svc，其他 -> {service}-{name}-svc
      let fullServiceName: string;
      if (def.serviceName) {
        fullServiceName = `${def.serviceName}-svc`;
      } else {
        const svcSuffix = def.name === "main" ? "svc" : `${def.name}-svc`;
        fullServiceName = `${serviceName}-${svcSuffix}`;
      }
      const host = `${fullServiceName}.${namespace}.svc.cluster.local:${def.port}`;
      // 如果没有协议，直接返回 hostname:port 格式（某些服务如 Temporal gRPC 需要这种格式）
      result[def.name] = def.protocol ? `${def.protocol}://${host}` : host;
    }

    return result;
  }

  resolveComponentEndpoint(componentName: string, component: FinalComponent, namespace: string): string {
    // local provider 下，所有类型都使用 http://localhost
    return `http://localhost:${component.port}`;
  }
}
