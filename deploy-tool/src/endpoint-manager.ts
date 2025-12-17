import { writeFile, readFile } from "fs/promises";
import { dirname, basename, join } from "path";
import { existsSync } from "fs";
import { FinalConfig, ValidationResult, EndpointInfo, EndpointDefinition } from "./types.js";
import { BaseProvider } from "./providers/base.js";
import { logger } from "./utils/logger.js";
import { MiddlewareConfigFactory, MiddlewareEnvironment } from "./terraform/middleware/index.js";
import { getLocalIP, buildPublicUrl } from "./utils/network.js";

/**
 * Endpoint 管理器
 * 负责验证和填写配置中的 endpoint 字段
 */
export class EndpointManager {
  private config: FinalConfig;
  private configPath: string;
  private provider: BaseProvider;

  constructor(config: FinalConfig, configPath: string, provider: BaseProvider) {
    this.config = config;
    this.configPath = configPath;
    this.provider = provider;
  }

  /**
   * 验证所有 cloud 类型 middleware 的 endpoint 已配置
   */
  validateCloudEndpoints(): ValidationResult {
    const errors: string[] = [];

    for (const [componentName, component] of Object.entries(this.config.components)) {
      for (const [middlewareName, middleware] of Object.entries(component.middlewareDependencies || {})) {
        if (middleware.deploymentType === "cloud") {
          // 检查是否有任何 endpoint 配置
          const endpoints = middleware.endpoints || {};
          const hasValidEndpoints = Object.values(endpoints).some((ep) => ep.value && ep.value.trim() !== "");

          if (!hasValidEndpoints) {
            errors.push(`组件 ${componentName} 的中间件 ${middlewareName} (type: ${middleware.type}) 是 cloud 类型，但缺少 endpoint 配置`);
          } else {
            const endpointValues = Object.entries(endpoints)
              .filter(([_, ep]) => ep.value)
              .map(([name, ep]) => `${name}: ${ep.value}`)
              .join(", ");
            logger.skip(`${componentName}.${middlewareName} (cloud) - 已配置 endpoints: ${endpointValues}`);
          }
        }
      }
    }

    if (errors.length > 0) {
      logger.error("Cloud 类型中间件 endpoint 验证失败:");
      errors.forEach((err) => logger.error(`  - ${err}`));
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取中间件的 endpoint（返回 main endpoint 的值）
   * @deprecated 请使用 getMiddlewareEndpoints 获取所有 endpoint
   */
  getMiddlewareEndpoint(componentName: string, middlewareName: string): string {
    const endpoints = this.getMiddlewareEndpoints(componentName, middlewareName);
    return endpoints.main?.value || Object.values(endpoints)[0]?.value || "";
  }

  /**
   * 获取中间件的所有 endpoint
   */
  getMiddlewareEndpoints(componentName: string, middlewareName: string): Record<string, EndpointDefinition> {
    const component = this.config.components[componentName];
    if (!component) {
      throw new Error(`组件 ${componentName} 不存在`);
    }

    const middleware = component.middlewareDependencies?.[middlewareName];
    if (!middleware) {
      throw new Error(`组件 ${componentName} 的中间件 ${middlewareName} 不存在`);
    }

    return middleware.endpoints || {};
  }

  /**
   * 获取组件的 endpoint
   */
  getComponentEndpoint(componentName: string): string | undefined {
    const component = this.config.components[componentName];
    if (!component) {
      throw new Error(`组件 ${componentName} 不存在`);
    }

    return component.endpoint;
  }

  /**
   * 填写中间件的所有 endpoint
   */
  fillMiddlewareEndpoints(componentName: string, middlewareName: string, endpoints: Record<string, string>): void {
    const component = this.config.components[componentName];
    if (!component) {
      throw new Error(`组件 ${componentName} 不存在`);
    }

    const middleware = component.middlewareDependencies?.[middlewareName];
    if (!middleware) {
      throw new Error(`组件 ${componentName} 的中间件 ${middlewareName} 不存在`);
    }

    // 确保 endpoints 对象存在
    if (!middleware.endpoints) {
      middleware.endpoints = {};
    }

    // 填充每个 endpoint 的 value
    for (const [name, value] of Object.entries(endpoints)) {
      if (!middleware.endpoints[name]) {
        middleware.endpoints[name] = { port: 0, protocol: "", publicAccess: false };
      }
      middleware.endpoints[name].value = value;
    }

    // 为了向后兼容，添加顶层 endpoint 字段（等于 endpoints.main.value）
    if (endpoints.main) {
      (middleware as any).endpoint = endpoints.main;
    }

    const endpointInfo = Object.entries(endpoints)
      .map(([name, value]) => `${name}: ${value}`)
      .join(", ");
    logger.step(`${componentName}.${middlewareName}.endpoints = { ${endpointInfo} }`);
  }

  /**
   * @deprecated 请使用 fillMiddlewareEndpoints 替代
   */
  fillMiddlewareEndpoint(componentName: string, middlewareName: string, endpoint: string): void {
    this.fillMiddlewareEndpoints(componentName, middlewareName, { main: endpoint });
  }

  /**
   * 填写组件的 endpoint
   */
  fillComponentEndpoint(componentName: string, endpoint: string): void {
    const component = this.config.components[componentName];
    if (!component) {
      throw new Error(`组件 ${componentName} 不存在`);
    }

    component.endpoint = endpoint;
    logger.step(`${componentName}.endpoint = ${endpoint}`);
  }

  /**
   * 自动填写所有 endpoint 字段
   */
  fillAllEndpoints(): void {
    const namespace = this.getNamespace();

    logger.stage(3, 5, "填写服务 Endpoint");

    for (const [componentName, component] of Object.entries(this.config.components)) {
      // 使用 Provider 生成组件 endpoint
      const componentEndpoint = this.provider.resolveComponentEndpoint(componentName, component, namespace);
      this.fillComponentEndpoint(componentName, componentEndpoint);

      // 填写中间件 endpoint
      for (const [middlewareName, middleware] of Object.entries(component.middlewareDependencies || {})) {
        // cloud 类型的 endpoint 已经配置，跳过
        if (middleware.deploymentType === "cloud") {
          continue;
        }

        // container 类型使用 Provider 生成 endpoint
        if (middleware.deploymentType === "container") {
          // 获取 endpoint 定义（port/protocol/description 由中间件配置类提供）
          // 注意：使用 middleware.use（如 "postgresql"）而不是 middleware.type（如 "database"）
          const endpointDefinitions = this.getMiddlewareEndpointDefinitions(middleware.use || middleware.type, middleware.config, middlewareName);

          // 确保 middleware.endpoints 结构存在
          if (!middleware.endpoints) {
            middleware.endpoints = {};
          }

          // 初始化 endpoints 结构
          // port/protocol/description 从中间件配置类获取
          // publicAccess 保留配置文件中的值（如果有），否则使用中间件默认值
          for (const def of endpointDefinitions) {
            const existingPublicAccess = middleware.endpoints[def.name]?.publicAccess;
            middleware.endpoints[def.name] = {
              port: def.port,
              protocol: def.protocol,
              publicAccess: existingPublicAccess ?? def.publicAccess,
              description: def.description,
            };
          }

          // 使用 Provider 解析所有 endpoint
          const endpoints = this.provider.resolveMiddlewareEndpoints(componentName, middlewareName, middleware, namespace, endpointDefinitions);

          this.fillMiddlewareEndpoints(componentName, middlewareName, endpoints);
        }
      }
    }

    logger.step("所有 endpoint 已填写完成");
  }

  /**
   * 获取中间件的 endpoint 定义
   */
  private getMiddlewareEndpointDefinitions(type: string, config: Record<string, any> = {}, middlewareName: string = "temp") {
    try {
      const middlewareConfig = MiddlewareConfigFactory.create(type);
      const env: MiddlewareEnvironment = {
        provider: (this.config.provider as any) || "local",
        namespace: this.getNamespace(),
        middlewareName,
        config,
      };
      return middlewareConfig.getEndpointDefinitions(env);
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
   * 生成组件的 endpoint
   */
  private generateComponentEndpoint(componentName: string, port: number, deploymentType: "local" | "container", namespace: string): string {
    const provider = this.config.provider || "local";

    // local provider: 使用 localhost（LoadBalancer 会暴露到 localhost）
    if (provider === "local") {
      return `localhost:${port}`;
    }

    // 其他 provider
    if (deploymentType === "local") {
      // 本地部署：使用 host.docker.internal，供容器访问
      return `host.docker.internal:${port}`;
    } else {
      // 容器部署：使用 K8s 内部 DNS
      // 服务名转换为小写，符合 K8s 命名规范
      const serviceName = componentName.toLowerCase();
      return `${serviceName}-svc.${namespace}.svc.cluster.local:${port}`;
    }
  }

  /**
   * 生成中间件的 endpoint
   */
  private generateMiddlewareEndpoint(middlewareName: string, port: number, namespace: string): string {
    const provider = this.config.provider || "local";

    // local provider: 使用 localhost（LoadBalancer 会暴露到 localhost）
    if (provider === "local") {
      return `localhost:${port}`;
    }

    // 其他 provider: 使用 K8s 内部 DNS
    // 服务名转换为小写，符合 K8s 命名规范
    const serviceName = middlewareName.toLowerCase();
    return `${serviceName}-svc.${namespace}.svc.cluster.local:${port}`;
  }

  /**
   * @deprecated 此方法已废弃，端口信息现在由 Middleware 配置类提供
   * 请使用 Provider.getMiddlewarePort() 替代
   *
   * 保留此方法仅为向后兼容，将在下一个大版本中移除
   */
  private getMiddlewarePort(type: string): number {
    console.warn("EndpointManager.getMiddlewarePort() 已废弃，请使用 Provider.getMiddlewarePort()");

    // 保留原有逻辑以保持向后兼容
    const portMap: Record<string, number> = {
      postgresql: 5432,
      minio: 9000,
      kafka: 9092,
      redis: 6379,
      centrifugo: 8000,
      mongodb: 27017,
    };

    return portMap[type] || 8080;
  }

  /**
   * 获取命名空间名称
   */
  private getNamespace(): string {
    return `lit-${this.config.environment}`;
  }

  /**
   * 保存配置到文件
   */
  async saveConfig(): Promise<void> {
    try {
      const configJson = JSON.stringify(this.config, null, 2);
      await writeFile(this.configPath, configJson, "utf-8");
      logger.step("配置已保存到 " + this.configPath);
    } catch (error: any) {
      logger.error(`保存配置失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取所有 endpoint 信息
   */
  getAllEndpoints(): EndpointInfo[] {
    const endpoints: EndpointInfo[] = [];

    for (const [componentName, component] of Object.entries(this.config.components)) {
      // 组件 endpoint
      if (component.endpoint) {
        endpoints.push({
          componentName,
          endpoint: component.endpoint,
          type: "component",
        });
      }

      // 中间件 endpoint（支持多 endpoint）
      for (const [middlewareName, middleware] of Object.entries(component.middlewareDependencies || {})) {
        if (middleware.endpoints) {
          for (const [endpointName, endpointDef] of Object.entries(middleware.endpoints)) {
            if (endpointDef.value) {
              endpoints.push({
                componentName,
                middlewareName,
                endpointName,
                endpoint: endpointDef.value,
                type: "middleware",
              });
            }
          }
        }
      }
    }

    return endpoints;
  }

  /**
   * 生成 host 配置文件
   * 用于 local 部署时，供宿主机上运行的组件访问
   * - endpoint.value 使用 localhost（供本机服务间通信）
   * - endpoint.publicUrl 使用本机 IP（供局域网其他设备访问）
   * @param localPortMapping 本地端口映射：middlewareName-endpointName -> localPort，用于处理端口冲突
   */
  async generateHostConfig(localPortMapping?: Map<string, number>): Promise<void> {
    // 获取本机 IP 用于 publicUrl
    const localIP = getLocalIP();
    logger.step(`检测到本机 IP: ${localIP}`);

    // 深拷贝配置
    const hostConfig: FinalConfig = JSON.parse(JSON.stringify(this.config));

    // 替换所有 container 类型 middleware 的 endpoint
    for (const [componentName, component] of Object.entries(hostConfig.components)) {
      for (const [middlewareName, middleware] of Object.entries(component.middlewareDependencies || {})) {
        if (middleware.deploymentType === "container") {
          // 从中间件配置类获取完整的 endpoint 定义（port/protocol/description）
          const endpointDefinitions = this.getMiddlewareEndpointDefinitions(middleware.type, middleware.config, middlewareName);

          // 确保 middleware.endpoints 存在
          if (!middleware.endpoints) {
            middleware.endpoints = {};
          }

          // 初始化所有 endpoint
          for (const def of endpointDefinitions) {
            const existingEndpoint = middleware.endpoints[def.name];
            middleware.endpoints[def.name] = {
              port: def.port,
              protocol: def.protocol,
              publicAccess: existingEndpoint?.publicAccess ?? def.publicAccess,
              description: def.description,
            };
          }

          // 遍历所有 endpoint 生成地址
          for (const [endpointName, endpointDef] of Object.entries(middleware.endpoints)) {
            // 生成映射 key
            const mappingKey = `${middlewareName.toLowerCase()}-${endpointName}`;
            // 优先使用端口映射中的本地端口，否则使用容器端口
            const localPort = localPortMapping?.get(mappingKey) || endpointDef.port;

            // value 使用 localhost（供本机服务间通信）
            endpointDef.value = endpointDef.protocol ? `${endpointDef.protocol}://localhost:${localPort}` : `localhost:${localPort}`;

            // publicUrl 使用本机 IP（供局域网访问），仅对 publicAccess: true 的 endpoint
            if (endpointDef.publicAccess) {
              endpointDef.publicUrl = buildPublicUrl(localPort, endpointDef.protocol || undefined, localIP);
              logger.step(`Host config: ${componentName}.${middlewareName}.endpoints.${endpointName}.publicUrl = ${endpointDef.publicUrl}`);
            }

            logger.step(`Host config: ${componentName}.${middlewareName}.endpoints.${endpointName}.value = ${endpointDef.value}`);
          }
        }
      }

      // 更新 component 的 publicUrl 使用本机 IP
      if (component.port) {
        component.publicUrl = buildPublicUrl(component.port, "http", localIP);
        logger.step(`Host config: ${componentName}.publicUrl = ${component.publicUrl}`);
      }
    }

    // 保存到 app.host.config.json
    const hostConfigPath = this.getHostConfigPath();

    try {
      const configJson = JSON.stringify(hostConfig, null, 2);
      await writeFile(hostConfigPath, configJson, "utf-8");
      logger.success("Host 配置已保存到 " + hostConfigPath);
    } catch (error: any) {
      logger.error(`保存 Host 配置失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取 host 配置文件路径
   */
  getHostConfigPath(): string {
    const dir = dirname(this.configPath);
    const originalName = basename(this.configPath);
    const hostConfigName = originalName.replace(/\.json$/, ".host.json").replace(/^app\.config\.json$/, "app.config.host.json");
    return join(dir, hostConfigName);
  }

  /**
   * 更新 host 配置文件中的 publicUrl
   * 用于网络地址变化后更新 publicUrl（不影响其他配置）
   */
  async updatePublicUrls(): Promise<void> {
    const hostConfigPath = this.getHostConfigPath();

    // 检查 host 配置文件是否存在
    if (!existsSync(hostConfigPath)) {
      throw new Error(`Host 配置文件不存在: ${hostConfigPath}，请先运行 deploy 或 port-forward 命令`);
    }

    // 读取现有的 host 配置
    const hostConfigContent = await readFile(hostConfigPath, "utf-8");
    const hostConfig: FinalConfig = JSON.parse(hostConfigContent);

    // 获取新的本机 IP
    const localIP = getLocalIP();
    logger.step(`检测到本机 IP: ${localIP}`);

    let updateCount = 0;

    // 更新所有 component 和 middleware 的 publicUrl
    for (const [componentName, component] of Object.entries(hostConfig.components)) {
      // 更新 component 的 publicUrl
      if (component.port) {
        const oldPublicUrl = component.publicUrl;
        component.publicUrl = buildPublicUrl(component.port, "http", localIP);

        if (oldPublicUrl !== component.publicUrl) {
          logger.step(`更新 ${componentName}.publicUrl: ${oldPublicUrl} -> ${component.publicUrl}`);
          updateCount++;
        }
      }

      // 更新 middleware 的 publicUrl
      for (const [middlewareName, middleware] of Object.entries(component.middlewareDependencies || {})) {
        if (middleware.deploymentType === "container" && middleware.endpoints) {
          for (const [endpointName, endpointDef] of Object.entries(middleware.endpoints)) {
            if (endpointDef.publicAccess) {
              // 从现有 value 中提取端口（格式：protocol://localhost:port 或 localhost:port）
              const portMatch = endpointDef.value?.match(/:(\d+)$/);
              const port = portMatch ? parseInt(portMatch[1], 10) : endpointDef.port;

              const oldPublicUrl = endpointDef.publicUrl;
              endpointDef.publicUrl = buildPublicUrl(port, endpointDef.protocol || undefined, localIP);

              if (oldPublicUrl !== endpointDef.publicUrl) {
                logger.step(`更新 ${componentName}.${middlewareName}.endpoints.${endpointName}.publicUrl: ${oldPublicUrl} -> ${endpointDef.publicUrl}`);
                updateCount++;
              }
            }
          }
        }
      }
    }

    if (updateCount === 0) {
      logger.info("所有 publicUrl 已是最新，无需更新");
      return;
    }

    // 保存更新后的配置
    try {
      const configJson = JSON.stringify(hostConfig, null, 2);
      await writeFile(hostConfigPath, configJson, "utf-8");
      logger.success(`已更新 ${updateCount} 个 publicUrl，配置已保存到 ${hostConfigPath}`);
    } catch (error: any) {
      logger.error(`保存 Host 配置失败: ${error.message}`);
      throw error;
    }
  }
}
