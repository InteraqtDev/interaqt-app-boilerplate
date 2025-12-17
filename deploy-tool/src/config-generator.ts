import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { logger } from "./utils/logger.js";

// 获取当前模块的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 从 config/types.ts 导入的类型
 * 这里重新定义以避免循环依赖
 */
interface ApplicationConfig {
  version: string;
  components: {
    [componentName: string]: ApplicationComponent;
  };
}

interface ApplicationComponent {
  name: string;
  port: number;
  middlewareDependencies: {
    [dependencyName: string]: MiddlewareDependency;
  };
  externalServices: {
    [serviceName: string]: ExternalService;
  };
  applicationConfig: {
    [configName: string]: ConfigRequirement;
  };
}

interface EndpointDefinition {
  port: number;
  protocol: string;
  publicAccess: boolean;
  description?: string;
  value?: string;
}

interface MiddlewareDependency {
  type: string;
  version?: string;
  endpoints?: Record<string, EndpointDefinition>;
  requiredFields: string[];
  config?: Record<string, any>; // 可选的配置字段，用于业务逻辑配置
}

interface ExternalService {
  provider: string;
  service: string;
  requiredFields: string[];
}

interface ConfigRequirement {
  requiredFields: string[];
}

interface DeploymentConfig {
  provider: "local" | "aliyun" | "aws" | "volcengine";
  environment: string;
  components: {
    [componentName: string]: DeploymentComponent;
  };
}

interface DeploymentComponent {
  deploymentType: "local" | "container";
  /** 自定义镜像地址（可选） */
  image?: string;
  replicas: number;
  host: string;
  port: number;
  middlewareDependencies: {
    /**
     * 可以是：
     * - 完整的 DeployedMiddleware 对象
     * - ${ref:...} 格式的引用字符串
     * - { $ref: "...", config: {...} } 格式的带覆盖配置的引用
     */
    [dependencyName: string]: DeployedMiddleware | string | MiddlewareRefWithOverride;
  };
  externalServices: {
    [serviceName: string]: DeployedExternalService;
  };
  applicationConfig: {
    [configName: string]: any;
  };
}

interface DeployedMiddleware {
  deploymentType: "container" | "cloud";
  use?: string;
  /** 自定义镜像地址（可选，覆盖 use 配置类生成的默认镜像） */
  image?: string;
  version?: string;
  replicas: number;
  endpoint?: string;
  dependencies?: string[];
  config: Record<string, any>;
}

/**
 * 带覆盖配置的引用格式
 * 支持引用另一个 middleware 并覆盖部分配置
 */
interface MiddlewareRefWithOverride {
  /** 引用路径，如 "components.main.middlewareDependencies.mainDb" */
  $ref: string;
  /** 覆盖的配置，会深度合并到被引用的 middleware 配置中 */
  config?: Record<string, any>;
  /** 覆盖的依赖列表 */
  dependencies?: string[];
}

interface DeployedExternalService {
  config: Record<string, any>;
}

interface FinalConfig {
  version: string;
  environment: string;
  provider?: string;
  generatedAt: string;
  components: {
    [componentName: string]: any;
  };
  componentUrls: {
    [componentName: string]: string;
  };
}

interface ValidationError {
  component: string;
  type: "missing_field" | "deployment_type_conflict" | "missing_use_field" | "invalid_reference";
  message: string;
}

/**
 * 判断是否是字符串引用格式 ${ref:...}
 */
function isStringRef(value: any): value is string {
  return typeof value === "string" && value.startsWith("${ref:") && value.endsWith("}");
}

/**
 * 判断是否是对象引用格式 { $ref: "..." }
 */
function isObjectRef(value: any): value is MiddlewareRefWithOverride {
  return typeof value === "object" && value !== null && "$ref" in value && typeof value.$ref === "string";
}

/**
 * 判断是否是任意引用格式（字符串或对象）
 */
function isAnyRef(value: any): boolean {
  return isStringRef(value) || isObjectRef(value);
}

/**
 * 配置生成器
 * 将 application.json 和 deploy.{env}.json 合并生成 app.config.json
 */
export class ConfigGenerator {
  private errors: ValidationError[] = [];

  constructor(
    private applicationConfig: ApplicationConfig,
    private deploymentConfig: DeploymentConfig,
    private environment: string,
  ) {}

  /**
   * 生成最终配置
   */
  generate(): FinalConfig | null {
    // 先进行所有验证
    this.validateRequiredFields();
    this.validateDeploymentTypes();

    // 如果有错误，返回 null
    if (this.errors.length > 0) {
      this.printErrors();
      return null;
    }

    // 生成最终配置
    return this.mergeConfigs();
  }

  /**
   * 验证必填字段
   */
  private validateRequiredFields(): void {
    for (const [componentName, appComponent] of Object.entries(this.applicationConfig.components)) {
      const deployComponent = this.deploymentConfig.components[componentName];

      if (!deployComponent) {
        this.errors.push({
          component: componentName,
          type: "missing_field",
          message: `Component '${componentName}' 在 deploy.${this.environment}.json 中不存在`,
        });
        continue;
      }

      // 验证 middlewareDependencies 的必填字段
      for (const [depName, appDep] of Object.entries(appComponent.middlewareDependencies)) {
        const deployDep = deployComponent.middlewareDependencies[depName];

        if (!deployDep) {
          this.errors.push({
            component: componentName,
            type: "missing_field",
            message: `Middleware dependency '${depName}' 在 ${componentName} 的 deploy 配置中不存在`,
          });
          continue;
        }

        // 跳过引用类型的检查（稍后解析后再验证）
        // 支持字符串格式 "${ref:...}" 和对象格式 { $ref: "..." }
        if (isAnyRef(deployDep)) {
          continue;
        }

        // 检查必填字段（此时 deployDep 一定是 DeployedMiddleware 类型）
        const middlewareConfig = (deployDep as DeployedMiddleware).config;
        for (const field of appDep.requiredFields) {
          if (!(field in middlewareConfig)) {
            this.errors.push({
              component: componentName,
              type: "missing_field",
              message: `Middleware '${depName}' 缺少必填字段: ${field}`,
            });
          }
        }
      }

      // 验证 externalServices 的必填字段
      for (const [serviceName, appService] of Object.entries(appComponent.externalServices)) {
        const deployService = deployComponent.externalServices[serviceName];

        if (!deployService) {
          this.errors.push({
            component: componentName,
            type: "missing_field",
            message: `External service '${serviceName}' 在 ${componentName} 的 deploy 配置中不存在`,
          });
          continue;
        }

        // 如果 config 是空对象，跳过验证（表示该服务不启用）
        if (Object.keys(deployService.config).length === 0) {
          continue;
        }

        // 检查必填字段
        for (const field of appService.requiredFields) {
          if (!(field in deployService.config)) {
            this.errors.push({
              component: componentName,
              type: "missing_field",
              message: `External service '${serviceName}' 缺少必填字段: ${field}`,
            });
          }
        }
      }

      // 验证 applicationConfig 的必填字段
      for (const [configName, appConfigReq] of Object.entries(appComponent.applicationConfig)) {
        const deployAppConfig = deployComponent.applicationConfig[configName];

        if (!deployAppConfig) {
          this.errors.push({
            component: componentName,
            type: "missing_field",
            message: `Application config '${configName}' 在 ${componentName} 的 deploy 配置中不存在`,
          });
          continue;
        }

        // 检查必填字段
        for (const field of appConfigReq.requiredFields) {
          if (!(field in deployAppConfig)) {
            this.errors.push({
              component: componentName,
              type: "missing_field",
              message: `Application config '${configName}' 缺少必填字段: ${field}`,
            });
          }
        }
      }
    }
  }

  /**
   * 验证 deploymentType 规则
   */
  private validateDeploymentTypes(): void {
    const provider = this.deploymentConfig.provider;

    for (const [componentName, deployComponent] of Object.entries(this.deploymentConfig.components)) {
      // 验证 component 的 deploymentType
      if (provider === "local") {
        if (deployComponent.deploymentType !== "local" && deployComponent.deploymentType !== "container") {
          this.errors.push({
            component: componentName,
            type: "deployment_type_conflict",
            message: `当 provider 为 'local' 时，component '${componentName}' 的 deploymentType 只能是 'local' 或 'container'，当前为 '${deployComponent.deploymentType}'`,
          });
        }
      } else {
        if (deployComponent.deploymentType !== "container") {
          this.errors.push({
            component: componentName,
            type: "deployment_type_conflict",
            message: `当 provider 不是 'local' 时，component '${componentName}' 的 deploymentType 只能是 'container'，当前为 '${deployComponent.deploymentType}'`,
          });
        }
      }

      // 验证 middleware 的 deploymentType 和 use 字段
      for (const [depName, deployDep] of Object.entries(deployComponent.middlewareDependencies)) {
        // 跳过引用类型（稍后解析后再验证）
        if (isAnyRef(deployDep)) {
          continue;
        }
        if ((deployDep as DeployedMiddleware).deploymentType === "container" && !(deployDep as DeployedMiddleware).use) {
          this.errors.push({
            component: componentName,
            type: "missing_use_field",
            message: `Middleware '${depName}' 的 deploymentType 为 'container'，必须指定 'use' 字段`,
          });
        }
      }
    }
  }

  /**
   * 合并配置
   */
  private mergeConfigs(): FinalConfig {
    const finalConfig: FinalConfig = {
      version: this.applicationConfig.version,
      environment: this.environment,
      provider: this.deploymentConfig.provider,
      generatedAt: new Date().toISOString(),
      components: {},
      componentUrls: {},
    };

    // 合并各个组件的配置
    for (const [componentName, appComponent] of Object.entries(this.applicationConfig.components)) {
      const deployComponent = this.deploymentConfig.components[componentName];

      if (!deployComponent) {
        continue;
      }

      // 生成 publicUrl
      const publicUrl = `http://${deployComponent.host}:${deployComponent.port}`;

      finalConfig.components[componentName] = {
        name: appComponent.name,
        enabled: true,
        deploymentType: deployComponent.deploymentType,
        image: deployComponent.image, // 自定义镜像地址（可选）
        replicas: deployComponent.replicas,
        host: deployComponent.host,
        port: deployComponent.port,
        publicUrl: publicUrl,
        endpoint: "", // 空白的 endpoint 字段，由 deploy tool 填写
        publicAccess: (deployComponent as any).publicAccess, // 是否需要公网访问
        skipApplication: (deployComponent as any).skipApplication, // 跳过应用部署
        skipHealthCheck: (deployComponent as any).skipHealthCheck, // 跳过健康检查
        startCommand: (deployComponent as any).startCommand, // 自定义启动命令
        middlewareDependencies: {},
        externalServices: {},
        applicationConfig: {},
      };

      // 合并 middlewareDependencies
      for (const [depName, appDep] of Object.entries(appComponent.middlewareDependencies)) {
        const deployDep = deployComponent.middlewareDependencies[depName];

        if (deployDep) {
          // 处理引用类型（字符串或对象格式），暂时保存，稍后统一解析
          if (isAnyRef(deployDep)) {
            (finalConfig.components[componentName].middlewareDependencies as any)[depName] = deployDep;
          } else {
            // 合并 application.json 和 deploy.{env}.json 的 config
            // deploy.{env}.json 的 config 优先级更高，会覆盖 application.json 的同名字段
            const mergedConfig = {
              ...(appDep.config || {}), // application.json 的 config（业务逻辑配置）
              ...((deployDep as any).config || {}), // deploy.{env}.json 的 config（环境特定配置）
            };

            // 合并 endpoints 配置
            // application.json 定义基本结构，deploy.{env}.json 可以覆盖 publicAccess 等属性
            const mergedEndpoints = this.mergeEndpoints(appDep.endpoints, (deployDep as any).endpoints);

            finalConfig.components[componentName].middlewareDependencies[depName] = {
              type: appDep.type,
              version: (deployDep as any).version || appDep.version,
              deploymentType: (deployDep as any).deploymentType,
              use: (deployDep as any).use,
              image: (deployDep as any).image, // 自定义镜像地址（可选）
              replicas: (deployDep as any).replicas,
              endpoints: mergedEndpoints, // 使用合并后的 endpoints
              dependencies: (deployDep as any).dependencies,
              config: mergedConfig,
            };
          }
        }
      }

      // 添加 deploy.{env}.json 中额外的 middleware（在 application.json 中未定义的）
      // 这些通常是为了支持其他 middleware 而添加的依赖，例如 centrifugo 依赖的 redis
      for (const [depName, deployDep] of Object.entries(deployComponent.middlewareDependencies)) {
        // 如果这个 middleware 在 application.json 中没有定义，但在 deploy.{env}.json 中存在
        if (!appComponent.middlewareDependencies[depName]) {
          // 处理引用类型（字符串或对象格式），暂时保存，稍后统一解析
          if (isAnyRef(deployDep)) {
            (finalConfig.components[componentName].middlewareDependencies as any)[depName] = deployDep;
          } else {
            finalConfig.components[componentName].middlewareDependencies[depName] = {
              type: (deployDep as any).use || depName,
              version: (deployDep as any).version,
              deploymentType: (deployDep as any).deploymentType,
              use: (deployDep as any).use,
              image: (deployDep as any).image, // 自定义镜像地址（可选）
              replicas: (deployDep as any).replicas,
              endpoints: (deployDep as any).endpoints || {}, // 使用 endpoints
              dependencies: (deployDep as any).dependencies,
              config: (deployDep as any).config,
            };
          }
        }
      }

      // 合并 externalServices
      for (const [serviceName, appService] of Object.entries(appComponent.externalServices)) {
        const deployService = deployComponent.externalServices[serviceName];

        if (deployService) {
          const enabled = Object.keys(deployService.config).length > 0;

          finalConfig.components[componentName].externalServices[serviceName] = {
            provider: appService.provider,
            service: appService.service,
            enabled: enabled,
            config: deployService.config,
          };
        }
      }

      // 合并 applicationConfig
      finalConfig.components[componentName].applicationConfig = deployComponent.applicationConfig;

      // 添加到 componentUrls
      finalConfig.componentUrls[componentName] = publicUrl;
    }

    // 解析所有 ${ref:...} 引用的 middleware
    this.resolveMiddlewareReferences(finalConfig);

    return finalConfig;
  }

  /**
   * 解析所有引用的 middleware
   *
   * 支持的格式：
   * 1. 字符串格式: "mainDb": "${ref:components.main.middlewareDependencies.mainDb}"
   *    - 完全复制被引用的 middleware 对象
   *
   * 2. 对象格式: "temporalDb": { "$ref": "components.main.middlewareDependencies.mainDb", "config": { "database": "temporal" } }
   *    - 复制被引用的 middleware 对象，并用提供的字段覆盖/合并
   *    - config 字段会深度合并（覆盖同名字段）
   *    - 其他字段（如 dependencies）会直接覆盖
   */
  private resolveMiddlewareReferences(config: FinalConfig): void {
    // 解析 middleware 级别的引用（$ref 和 "${ref:...}"）
    // 注意：config 内部的 ${ref:...} 引用会在 generator.ts 中解析（在 endpoint 填充之后）
    for (const [componentName, component] of Object.entries(config.components)) {
      for (const [depName, dep] of Object.entries(component.middlewareDependencies)) {
        // 处理字符串格式引用: "${ref:...}"
        if (isStringRef(dep)) {
          const refPath = dep.slice(6, -1); // 提取 ${ref:...} 中的路径
          const resolved = this.resolveRefPath(refPath, config);

          if (resolved) {
            // 替换为解析后的 middleware 对象（深拷贝以避免引用问题）
            (component.middlewareDependencies as any)[depName] = JSON.parse(JSON.stringify(resolved));
          } else {
            this.errors.push({
              component: componentName,
              type: "invalid_reference",
              message: `无法解析 middleware 引用: ${dep}`,
            });
          }
        }
        // 处理对象格式引用: { $ref: "...", config: {...} }
        else if (isObjectRef(dep)) {
          const refPath = dep.$ref;
          const resolved = this.resolveRefPath(refPath, config);

          if (resolved) {
            // 深拷贝被引用的对象
            const merged = JSON.parse(JSON.stringify(resolved));

            // 合并覆盖的 config（深度合并）
            if (dep.config) {
              merged.config = {
                ...(merged.config || {}),
                ...dep.config,
              };
            }

            // 覆盖 dependencies（如果提供）
            if (dep.dependencies) {
              merged.dependencies = dep.dependencies;
            }

            (component.middlewareDependencies as any)[depName] = merged;
          } else {
            this.errors.push({
              component: componentName,
              type: "invalid_reference",
              message: `无法解析 middleware 引用: ${dep.$ref}`,
            });
          }
        }
      }
    }
  }

  /**
   * 解析引用路径，获取被引用的对象
   *
   * @param refPath 引用路径，如 "components.main.middlewareDependencies.mainDb"
   * @param config 完整配置
   * @returns 被引用的对象，如果解析失败返回 null
   */
  private resolveRefPath(refPath: string, config: FinalConfig): any | null {
    const parts = refPath.split(".");

    // 验证路径格式: components.X.middlewareDependencies.Y
    if (parts[0] !== "components" || parts.length < 4) {
      return null;
    }

    const targetComponentName = parts[1];
    const targetComponent = config.components[targetComponentName];

    if (!targetComponent) {
      return null;
    }

    // 沿路径获取值
    let current: any = targetComponent;
    for (let i = 2; i < parts.length; i++) {
      if (current === null || current === undefined) {
        return null;
      }
      current = current[parts[i]];
    }

    // 如果引用的目标本身也是引用字符串，递归解析
    if (typeof current === "string" && current.startsWith("${ref:") && current.endsWith("}")) {
      const nestedRefPath = current.slice(6, -1);
      return this.resolveRefPath(nestedRefPath, config);
    }

    return current;
  }

  /**
   * 合并 endpoints 配置
   * application.json 定义基本结构（port, protocol, description）
   * deploy.{env}.json 可以覆盖 publicAccess 等属性
   */
  private mergeEndpoints(appEndpoints?: Record<string, EndpointDefinition>, deployEndpoints?: Record<string, Partial<EndpointDefinition>>): Record<string, EndpointDefinition> {
    const result: Record<string, EndpointDefinition> = {};

    // 如果 application.json 没有定义 endpoints，返回空对象
    if (!appEndpoints) {
      return result;
    }

    // 遍历 application.json 中的 endpoints
    for (const [name, appDef] of Object.entries(appEndpoints)) {
      const deployDef = deployEndpoints?.[name];

      result[name] = {
        port: appDef.port,
        protocol: appDef.protocol,
        publicAccess: deployDef?.publicAccess ?? appDef.publicAccess,
        description: appDef.description,
        // value 字段由 deploy-tool 填充
      };
    }

    return result;
  }

  /**
   * 打印错误信息
   */
  private printErrors(): void {
    logger.error("\n配置验证失败，发现以下错误：\n");

    const errorsByComponent = new Map<string, ValidationError[]>();

    for (const error of this.errors) {
      if (!errorsByComponent.has(error.component)) {
        errorsByComponent.set(error.component, []);
      }
      errorsByComponent.get(error.component)!.push(error);
    }

    for (const [component, errors] of errorsByComponent.entries()) {
      logger.error(`📦 Component: ${component}`);
      for (const error of errors) {
        logger.error(`   - ${error.message}`);
      }
      logger.error("");
    }

    logger.error(`共 ${this.errors.length} 个错误\n`);
  }

  /**
   * 静态方法：从文件生成配置
   */
  static async generateFromFiles(environment: string, configDir?: string): Promise<FinalConfig> {
    // 确定配置文件目录
    const actualConfigDir = configDir || ConfigGenerator.findConfigDir();

    logger.info(`使用配置目录: ${actualConfigDir}`);
    logger.info(`生成环境: ${environment}`);

    const applicationConfigPath = resolve(actualConfigDir, "application.json");
    const deploymentConfigPath = resolve(actualConfigDir, `deploy.${environment}.json`);
    const outputPath = resolve(actualConfigDir, "..", "app.config.json");

    // 检查文件是否存在
    if (!existsSync(applicationConfigPath)) {
      throw new Error(`找不到应用配置文件: ${applicationConfigPath}`);
    }

    if (!existsSync(deploymentConfigPath)) {
      throw new Error(`找不到部署配置文件: ${deploymentConfigPath}`);
    }

    logger.step("读取 application.json");
    logger.step(`读取 deploy.${environment}.json`);

    // 读取配置文件
    const applicationConfig = JSON.parse(await readFile(applicationConfigPath, "utf-8")) as ApplicationConfig;

    const deploymentConfig = JSON.parse(await readFile(deploymentConfigPath, "utf-8")) as DeploymentConfig;

    // 生成配置
    const generator = new ConfigGenerator(applicationConfig, deploymentConfig, environment);
    const finalConfig = generator.generate();

    if (!finalConfig) {
      throw new Error("配置生成失败");
    }

    // 写入配置文件
    await writeFile(outputPath, JSON.stringify(finalConfig, null, 2), "utf-8");
    logger.success(`配置已保存到: ${outputPath}`);

    return finalConfig;
  }

  /**
   * 查找配置目录
   * 优先查找当前目录，然后查找父目录
   */
  private static findConfigDir(): string {
    // 检查当前目录
    const localConfigDir = resolve(process.cwd(), "config");
    if (existsSync(localConfigDir)) {
      return localConfigDir;
    }

    // 检查父目录（从 deploy-tool 目录运行时）
    const parentConfigDir = resolve(process.cwd(), "..", "config");
    if (existsSync(parentConfigDir)) {
      return parentConfigDir;
    }

    // 默认返回当前目录的 config
    return localConfigDir;
  }
}
