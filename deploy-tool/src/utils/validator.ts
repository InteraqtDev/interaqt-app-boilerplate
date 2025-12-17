import { FinalConfig, ValidationResult } from "../types.js";

/**
 * 配置验证工具类
 */
export class Validator {
  /**
   * 验证配置的完整性
   */
  validateConfig(config: FinalConfig): ValidationResult {
    const errors: string[] = [];

    // 验证基本字段
    if (!config.version) {
      errors.push("缺少 version 字段");
    }
    if (!config.environment) {
      errors.push("缺少 environment 字段");
    }
    if (!config.components || Object.keys(config.components).length === 0) {
      errors.push("缺少 components 配置");
    }

    // 验证每个组件
    for (const [componentName, component] of Object.entries(config.components)) {
      if (!component.name) {
        errors.push(`组件 ${componentName} 缺少 name 字段`);
      }

      // 只有需要部署应用且需要健康检查的组件才验证 host 和 port
      const needsHostAndPort = !component.skipApplication && !component.skipHealthCheck;
      if (needsHostAndPort) {
        if (!component.host) {
          errors.push(`组件 ${componentName} 缺少 host 字段`);
        }
        if (!component.port) {
          errors.push(`组件 ${componentName} 缺少 port 字段`);
        }
      }

      // 验证中间件依赖
      for (const [middlewareName, middleware] of Object.entries(component.middlewareDependencies || {})) {
        if (!middleware.type) {
          errors.push(`组件 ${componentName} 的中间件 ${middlewareName} 缺少 type 字段`);
        }
        if (!middleware.deploymentType) {
          errors.push(`组件 ${componentName} 的中间件 ${middlewareName} 缺少 deploymentType 字段`);
        }
        if (middleware.deploymentType === "container" && !middleware.use) {
          errors.push(`组件 ${componentName} 的中间件 ${middlewareName} deploymentType 为 container 但缺少 use 字段`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证部署类型规则
   */
  validateDeploymentTypes(config: FinalConfig): ValidationResult {
    const errors: string[] = [];
    const provider = config.provider || "local";

    for (const [componentName, component] of Object.entries(config.components)) {
      const deploymentType = component.deploymentType || "local";

      // 规则1: provider 为 local 时，component deploymentType 只能是 local 或 container
      if (provider === "local") {
        if (!["local", "container"].includes(deploymentType)) {
          errors.push(`组件 ${componentName} 的 deploymentType 为 ${deploymentType}，但 provider 为 local，只能使用 local 或 container`);
        }
      } else {
        // 规则2: provider 不是 local 时，component deploymentType 只能是 container
        if (deploymentType !== "container") {
          errors.push(`组件 ${componentName} 的 deploymentType 为 ${deploymentType}，但 provider 为 ${provider}，只能使用 container`);
        }
      }

      // 验证中间件部署类型
      for (const [middlewareName, middleware] of Object.entries(component.middlewareDependencies || {})) {
        if (!["container", "cloud"].includes(middleware.deploymentType)) {
          errors.push(`组件 ${componentName} 的中间件 ${middlewareName} deploymentType 为 ${middleware.deploymentType}，只能是 container 或 cloud`);
        }

        // container 类型必须有 use 字段
        if (middleware.deploymentType === "container" && !middleware.use) {
          errors.push(`组件 ${componentName} 的中间件 ${middlewareName} deploymentType 为 container，必须指定 use 字段`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const validator = new Validator();
