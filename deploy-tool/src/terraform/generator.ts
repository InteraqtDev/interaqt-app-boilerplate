import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { FinalConfig, ContainerMiddleware, ComponentDeployment } from "../types.js";
import { BaseProvider } from "../providers/base.js";
import { logger } from "../utils/logger.js";
import { MiddlewareConfigFactory, MiddlewareEnvironment, EndpointSpec, SidecarContainerSpec } from "./middleware/index.js";
import { ComponentConfigFactory, ComponentContext } from "./component/index.js";

/**
 * Terraform 配置生成器
 * 根据配置生成 Terraform 配置文件
 */
export class TerraformGenerator {
  private config: FinalConfig;
  private provider: BaseProvider;
  private outputDir: string;
  /** modules 目录相对于 outputDir 的路径 */
  private modulesPath: string;

  constructor(config: FinalConfig, provider: BaseProvider, outputDir: string = "./terraform/generated") {
    this.config = config;
    this.provider = provider;
    this.outputDir = outputDir;
    // outputDir 现在是 terraform/generated/{env}，所以需要向上两级才能到 terraform/modules
    this.modulesPath = "../../modules";
  }

  /**
   * 生成所有 Terraform 配置
   */
  async generate(): Promise<void> {
    logger.info("开始生成 Terraform 配置");

    // 确保输出目录存在
    await this.ensureOutputDir();

    // 生成 provider 配置（支持多 provider）
    await this.generateProviderConfig();

    // 生成 namespace
    await this.generateNamespace();

    // 生成云服务资源（如果是云环境）
    await this.generateCloudResources();

    // 生成中间件配置（会引用云服务 output）
    await this.generateMiddlewareConfigs();

    // 生成组件配置
    await this.generateComponentConfigs();

    logger.success("Terraform 配置生成完成");
  }

  /**
   * 确保输出目录存在
   */
  private async ensureOutputDir(): Promise<void> {
    if (!existsSync(this.outputDir)) {
      await mkdir(this.outputDir, { recursive: true });
      logger.info(`创建输出目录: ${this.outputDir}`);
    }
  }

  /**
   * 生成 Provider 配置
   */
  private async generateProviderConfig(): Promise<void> {
    // 获取 kubeconfig 路径
    // 优先使用环境变量，否则使用家目录下的默认路径
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (!homeDir) {
      throw new Error("无法确定家目录路径，请设置 HOME 或 USERPROFILE 环境变量");
    }

    const kubeconfigPath = process.env.KUBECONFIG || `${homeDir}/.kube/config`;
    const providerName = this.config.provider || "local";

    logger.debug(`使用 kubeconfig 路径: ${kubeconfigPath}`);

    let config: string;

    if (providerName === "aliyun") {
      // 阿里云 Provider 配置
      config = `
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24.0"
    }
    alicloud = {
      source  = "aliyun/alicloud"
      version = "~> 1.200"
    }
    time = {
      source  = "hashicorp/time"
      version = "~> 0.9"
    }
  }
}

provider "kubernetes" {
  config_path = "${kubeconfigPath}"
}

provider "alicloud" {
  region     = var.alicloud_region
  access_key = var.alicloud_access_key
  secret_key = var.alicloud_secret_key
}

variable "alicloud_region" {
  description = "阿里云区域"
  type        = string
  default     = "cn-hongkong"
}

variable "alicloud_access_key" {
  description = "阿里云 Access Key ID"
  type        = string
  sensitive   = true
}

variable "alicloud_secret_key" {
  description = "阿里云 Access Key Secret"
  type        = string
  sensitive   = true
}
`;
    } else if (providerName === "volcengine") {
      // 火山引擎 Provider 配置
      config = `
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24.0"
    }
    volcengine = {
      source  = "volcengine/volcengine"
      version = "~> 0.0.1"
    }
    time = {
      source  = "hashicorp/time"
      version = "~> 0.9"
    }
  }
}

provider "kubernetes" {
  config_path = "${kubeconfigPath}"
}

provider "volcengine" {
  region     = var.volcengine_region
  access_key = var.volcengine_access_key
  secret_key = var.volcengine_secret_key
}

variable "volcengine_region" {
  description = "火山引擎区域"
  type        = string
  default     = "cn-beijing"
}

variable "volcengine_access_key" {
  description = "火山引擎 Access Key"
  type        = string
  sensitive   = true
}

variable "volcengine_secret_key" {
  description = "火山引擎 Secret Key"
  type        = string
  sensitive   = true
}
`;
    } else {
      // 默认 (local) - 仅 Kubernetes Provider
      config = `
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24.0"
    }
  }
}

provider "kubernetes" {
  config_path = "${kubeconfigPath}"
}
`;
    }

    const filePath = join(this.outputDir, "providers.tf");
    await writeFile(filePath, config.trim() + "\n", "utf-8");
    logger.step("生成 providers.tf");
  }

  /**
   * 生成 Namespace 配置
   */
  async generateNamespace(): Promise<string> {
    const namespace = this.provider.getNamespace(this.config.environment);

    const config = `
module "namespace" {
  source = "${this.modulesPath}/kubernetes/namespace"

  namespace_name = "${namespace}"
  environment    = "${this.config.environment}"

  labels = {
    app = "lit"
  }
}
`;

    // 确保输出目录存在
    await this.ensureOutputDir();

    const filePath = join(this.outputDir, "namespace.tf");
    await writeFile(filePath, config.trim() + "\n", "utf-8");
    logger.step(`生成 namespace.tf (${namespace})`);

    return config;
  }

  /**
   * 生成云服务资源配置
   */
  private async generateCloudResources(): Promise<void> {
    const providerName = this.config.provider || "local";

    if (providerName === "local") {
      logger.skip("Local provider 不生成云服务资源");
      return;
    }

    let cloudResourceCount = 0;

    for (const [componentName, component] of Object.entries(this.config.components)) {
      for (const [middlewareName, middleware] of Object.entries(component.middlewareDependencies || {})) {
        if (middleware.deploymentType === "cloud") {
          // 如果已有 endpoint，说明使用现有云资源，跳过 Terraform 创建
          const hasValidEndpoints = middleware.endpoints && Object.values(middleware.endpoints).some((ep) => ep.value && ep.value.trim() !== "");
          if (hasValidEndpoints) {
            const endpointInfo = Object.entries(middleware.endpoints || {})
              .filter(([_, ep]) => ep.value)
              .map(([name, ep]) => `${name}: ${ep.value}`)
              .join(", ");
            logger.skip(`${componentName}.${middlewareName} - 使用现有云资源: ${endpointInfo}`);
            continue;
          }

          // 生成 Terraform 云服务资源配置
          // Terraform 会创建云资源并输出 endpoint
          await this.generateCloudResource(providerName, componentName, middlewareName, middleware);
          cloudResourceCount++;
        }
      }
    }

    if (cloudResourceCount > 0) {
      logger.step(`生成 ${cloudResourceCount} 个云服务资源配置`);
    }
  }

  /**
   * 生成单个云服务资源
   */
  private async generateCloudResource(providerName: string, componentName: string, middlewareName: string, middleware: any): Promise<void> {
    const resourceName = this.getCloudResourceName(componentName, middlewareName);
    const moduleName = `cloud_${middlewareName.toLowerCase()}`;

    // 根据 middleware.type 选择对应的 cloud module
    const moduleSource = this.getCloudModuleSource(providerName, middleware.type);

    // 提取配置参数
    const moduleVars = this.buildCloudModuleVars(middleware, resourceName);

    const config = `
# Cloud Resource: ${middlewareName} (${middleware.type})
module "${moduleName}" {
  source = "${moduleSource}"

  resource_name = "${resourceName}"
  environment   = "${this.config.environment}"
  ${this.formatModuleVars(moduleVars)}
}

# Output: 供其他模块引用
output "${moduleName}_endpoint" {
  value = module.${moduleName}.endpoint
}

output "${moduleName}_connection_string" {
  value     = module.${moduleName}.connection_string
  sensitive = true
}
`;

    const filePath = join(this.outputDir, `cloud-${middlewareName.toLowerCase()}.tf`);
    await writeFile(filePath, config.trim() + "\n", "utf-8");
    logger.step(`生成 cloud-${middlewareName.toLowerCase()}.tf`);
  }

  /**
   * 获取云服务模块路径
   */
  private getCloudModuleSource(providerName: string, middlewareType: string): string {
    // 对象存储服务名称映射（不同云厂商使用不同名称）
    const objectStorageMap: Record<string, string> = {
      volcengine: "tos", // 火山引擎 TOS
      aliyun: "oss", // 阿里云 OSS
      aws: "s3", // AWS S3
    };

    const typeMap: Record<string, string> = {
      postgresql: "rds-postgresql",
      mysql: "rds-mysql",
      redis: "redis",
      kafka: "kafka",
      minio: objectStorageMap[providerName] || "oss",
      mongodb: "mongodb",
    };

    const moduleName = typeMap[middlewareType.toLowerCase()] || middlewareType;
    return `${this.modulesPath}/cloud/${providerName}/${moduleName}`;
  }

  /**
   * 获取云厂商顶层配置
   */
  private getProviderConfig(): any {
    const providerName = this.config.provider || "local";
    // 从配置中获取云厂商特定配置（如 this.config.aliyun 或 this.config.volcengine）
    return (this.config as any)[providerName] || {};
  }

  /**
   * 构建云服务模块变量
   */
  private buildCloudModuleVars(middleware: any, resourceName: string): Record<string, any> {
    const cloudSpec = middleware.config.cloudSpec || {};
    const providerConfig = this.getProviderConfig();

    // region 优先从 cloudSpec 读取，其次从顶层 provider 配置读取
    const vars: Record<string, any> = {
      region: cloudSpec.region || providerConfig.region || "cn-beijing",
    };

    // 网络配置优先从 cloudSpec 读取，其次从顶层 provider 配置读取
    const vswitchId = cloudSpec.vswitchId || providerConfig.vswitchId;
    const vpcId = cloudSpec.vpcId || providerConfig.vpcId;
    const subnetId = cloudSpec.subnetId || providerConfig.subnetId;
    const securityGroupId = cloudSpec.securityGroupId || providerConfig.securityGroupId;

    if (vswitchId) {
      vars.vswitch_id = vswitchId;
    }
    if (vpcId) {
      vars.vpc_id = vpcId;
    }
    if (subnetId) {
      vars.subnet_id = subnetId;
    }
    if (securityGroupId) {
      vars.security_group_id = securityGroupId;
    }

    // 根据类型添加特定配置
    switch (middleware.type) {
      case "postgresql":
      case "mysql":
        vars.storage_size = cloudSpec.storage || 100;
        vars.database_name = middleware.config.database;
        vars.username = middleware.config.username;
        vars.password = middleware.config.password;
        if (cloudSpec.instanceType) {
          vars.instance_type = cloudSpec.instanceType;
        }
        if (cloudSpec.engineVersion) {
          vars.engine_version = cloudSpec.engineVersion;
        }
        if (cloudSpec.storageType) {
          vars.storage_type = cloudSpec.storageType;
        }
        break;

      case "redis":
        vars.password = middleware.config.password;
        if (cloudSpec.instanceType) {
          vars.instance_class = cloudSpec.instanceType;
        }
        if (cloudSpec.engineVersion) {
          vars.engine_version = cloudSpec.engineVersion;
        }
        break;

      case "kafka":
        vars.partition_num = cloudSpec.partitions || 50;
        if (cloudSpec.diskSize) {
          vars.disk_size = cloudSpec.diskSize;
        }
        if (cloudSpec.ioMax) {
          vars.io_max = cloudSpec.ioMax;
        }
        break;

      case "minio":
        vars.bucket_name = middleware.config.bucket;
        break;
    }

    return vars;
  }

  /**
   * 格式化模块变量为 HCL
   */
  private formatModuleVars(vars: Record<string, any>): string {
    return Object.entries(vars)
      .map(([key, value]) => {
        if (typeof value === "string") {
          return `  ${key} = "${value}"`;
        }
        return `  ${key} = ${value}`;
      })
      .join("\n");
  }

  /**
   * 生成云资源名称
   */
  private getCloudResourceName(componentName: string, middlewareName: string): string {
    const app = "lit";
    const env = this.config.environment;
    return `${app}-${env}-${middlewareName.toLowerCase()}`;
  }

  /**
   * 生成中间件配置
   */
  private async generateMiddlewareConfigs(): Promise<void> {
    const namespace = this.provider.getNamespace(this.config.environment);
    const middlewareList: ContainerMiddleware[] = [];

    // 收集所有需要部署的中间件
    for (const [componentName, component] of Object.entries(this.config.components)) {
      for (const [middlewareName, middleware] of Object.entries(component.middlewareDependencies || {})) {
        // 只处理 container 类型的中间件
        if (middleware.deploymentType === "container" && middleware.use) {
          middlewareList.push({
            componentName,
            middlewareName,
            type: middleware.type,
            version: middleware.version,
            use: middleware.use,
            image: middleware.image, // 自定义镜像地址（可选）
            replicas: middleware.replicas || 1,
            config: middleware.config,
          });
        }
      }
    }

    // 为每个中间件生成配置（传递原始 middleware 对象以获取 dependencies）
    for (const middleware of middlewareList) {
      // 获取原始 middleware 对象以访问 dependencies 字段
      const component = this.config.components[middleware.componentName];
      const originalMiddleware = component.middlewareDependencies?.[middleware.middlewareName];

      // 构建依赖引用映射
      const dependencyRefs = this.buildDependencyRefs(middleware.componentName, middleware.middlewareName, originalMiddleware);

      await this.generateMiddlewareConfig(middleware, namespace, dependencyRefs);
    }

    if (middlewareList.length === 0) {
      logger.info("没有需要部署的 container 类型中间件");
    }
  }

  /**
   * 构建依赖引用映射
   * 将配置中的引用路径映射为 Terraform 模块引用或实际值
   *
   * 支持的引用格式：
   * - ${ref:path.endpoint} - 简写格式，等同于 path.endpoints.main.value
   * - ${ref:path.endpoints.main.value} - 完整格式
   * - ${ref:path.config.fieldName} - 引用 config 中的字段
   */
  private buildDependencyRefs(componentName: string, middlewareName: string, middleware: any): Map<string, string> {
    const refs = new Map<string, string>();
    const dependencies = (middleware as any).dependencies || [];

    for (const depPath of dependencies) {
      // 解析依赖路径
      const parsed = this.parseDependencyPath(depPath);
      if (!parsed) continue;

      const { componentName: depComponent, middlewareName: depMiddleware } = parsed;
      const depConfig = this.config.components[depComponent]?.middlewareDependencies?.[depMiddleware];

      if (!depConfig) continue;

      // 根据部署类型确定引用方式
      if (depConfig.deploymentType === "cloud") {
        // 引用云服务的 output（Terraform 模块引用）
        const moduleName = `cloud_${depMiddleware.toLowerCase()}`;
        // 支持 endpoints.{name}.value 格式的引用
        refs.set(`${depPath}.endpoints.main.value`, `module.${moduleName}.endpoint`);
        // 支持 .endpoint 简写格式（等同于 .endpoints.main.value）
        refs.set(`${depPath}.endpoint`, `module.${moduleName}.endpoint`);
        refs.set(`${depPath}.config.password`, `module.${moduleName}.password`);
      } else if (depConfig.deploymentType === "container") {
        // 引用 container 的 service endpoints（使用配置中已填充的实际值）
        if (depConfig.endpoints) {
          for (const [endpointName, endpointDef] of Object.entries(depConfig.endpoints)) {
            if ((endpointDef as any).value) {
              refs.set(`${depPath}.endpoints.${endpointName}.value`, (endpointDef as any).value);
              // 支持 .endpoint 简写格式（等同于 .endpoints.main.value）
              if (endpointName === "main") {
                refs.set(`${depPath}.endpoint`, (endpointDef as any).value);
              }
            }
          }
        }
        // 引用 config 中的其他字段
        if (depConfig.config) {
          for (const [configKey, configValue] of Object.entries(depConfig.config)) {
            if (typeof configValue === "string") {
              refs.set(`${depPath}.config.${configKey}`, configValue);
            }
          }
        }
      }
    }

    return refs;
  }

  /**
   * 解析依赖路径
   */
  private parseDependencyPath(path: string): { componentName: string; middlewareName: string } | null {
    const parts = path.split(".");
    if (parts.length !== 4 || parts[0] !== "components" || parts[2] !== "middlewareDependencies") {
      return null;
    }
    return {
      componentName: parts[1],
      middlewareName: parts[3],
    };
  }

  /**
   * 生成单个中间件的配置
   * 支持多 endpoint：为每个 endpoint 生成独立的 Service
   * 支持多部署模式：standalone（默认）和 distributed
   */
  private async generateMiddlewareConfig(middleware: ContainerMiddleware, namespace: string, dependencyRefs: Map<string, string> = new Map()): Promise<void> {
    // 检查是否为 distributed 模式
    const middlewareConfig = MiddlewareConfigFactory.create(middleware.use);
    const env: MiddlewareEnvironment = {
      provider: (this.config.provider as any) || "local",
      namespace,
      middlewareName: middleware.middlewareName,
      version: middleware.version,
      config: middleware.config,
    };

    // 如果是 distributed 模式，使用专门的方法生成
    if (middlewareConfig.isDistributedMode(env)) {
      await this.generateDistributedMiddlewareConfig(middleware, namespace, dependencyRefs, middlewareConfig, env);
      return;
    }

    // standalone 模式：使用现有逻辑
    const serviceName = middleware.middlewareName.toLowerCase();
    const appName = serviceName;

    // 先解析 middleware.config 中的引用
    const resolvedConfig = this.resolveConfigRefs(middleware.config, dependencyRefs);
    const middlewareWithResolvedConfig = {
      ...middleware,
      config: resolvedConfig,
    };

    // 根据中间件类型获取配置（已包含环境感知的 serviceType）
    const middlewareSpec = this.getMiddlewareSpec(middlewareWithResolvedConfig, namespace);

    // 获取 endpoint 定义
    // 合并 middleware.endpoints 中的 publicAccess 配置到 config 中
    const configWithPublicAccess = this.mergeEndpointsPublicAccess(resolvedConfig, middleware);
    const endpointDefinitions = this.getEndpointDefinitions(middleware.use, configWithPublicAccess);

    // 处理环境变量中的引用，转换为 Terraform 引用
    const envVars = this.processEnvVarsWithRefs(middlewareSpec.env, dependencyRefs);

    // 构建 depends_on（如果有依赖）
    const dependsOn = this.buildDependsOn(middleware, dependencyRefs);

    // 生成 ConfigMap（如果中间件需要）
    const configMapBlock = this.generateConfigMapIfNeeded(middleware, middlewareSpec, serviceName, namespace);

    // 获取 volume mounts 和 volumes
    const volumeMounts = middlewareSpec.volumeMounts || [];
    const volumes = middlewareSpec.volumes || [];

    // 获取 init containers
    const initContainers = middlewareSpec.initContainers || [];

    // 生成 Service 配置（为每个 endpoint 生成独立的 Service）
    const servicesConfig = this.generateServicesForEndpoints(serviceName, appName, endpointDefinitions, middleware.middlewareName);

    // 生成 sidecar 容器配置
    const sidecarContainers = middlewareSpec.sidecarContainers || [];
    const sidecarContainersConfig = sidecarContainers
      .map(
        (sidecar: SidecarContainerSpec) => `    {
      name    = "${sidecar.name}"
      image   = "${sidecar.image}"
      command = ${JSON.stringify(sidecar.command || [])}
      args    = ${JSON.stringify(sidecar.args || [])}
      ports   = ${JSON.stringify(sidecar.ports, null, 6)}
      env     = ${JSON.stringify(sidecar.env, null, 6)}
      volume_mounts = []
      resources = {
        limits = {
          cpu    = "${sidecar.resources.limits.cpu}"
          memory = "${sidecar.resources.limits.memory}"
        }
        requests = {
          cpu    = "${sidecar.resources.requests.cpu}"
          memory = "${sidecar.resources.requests.memory}"
        }
      }
      liveness_probe  = null
      readiness_probe = null
    }`,
      )
      .join(",\n");

    const allContainers = `[
    {
      name    = "${middleware.use}"
      image   = "${middlewareSpec.image}"
      command = ${JSON.stringify(middlewareSpec.command || [])}
      args    = ${JSON.stringify(middlewareSpec.args || [])}
      ports   = ${JSON.stringify(middlewareSpec.ports, null, 6)}
      env     = ${this.formatEnvVars(envVars)}
      volume_mounts = ${JSON.stringify(volumeMounts, null, 6)}
      resources = {
        limits = {
          cpu    = "${middlewareSpec.resources.limits.cpu}"
          memory = "${middlewareSpec.resources.limits.memory}"
        }
        requests = {
          cpu    = "${middlewareSpec.resources.requests.cpu}"
          memory = "${middlewareSpec.resources.requests.memory}"
        }
      }
      liveness_probe  = null
      readiness_probe = null
    }${sidecarContainersConfig ? ",\n" + sidecarContainersConfig : ""}
  ]`;

    const config = `${configMapBlock}
# Middleware: ${middleware.middlewareName} (${middleware.type})
module "middleware_${serviceName}" {
  source = "${this.modulesPath}/kubernetes/deployment"

  deployment_name = "${serviceName}"
  namespace       = module.namespace.namespace_name
  app_name        = "${appName}"
  component_type  = "middleware"
  replicas        = ${middleware.replicas}${dependsOn}

  init_containers = ${JSON.stringify(initContainers, null, 2)}

  containers = ${allContainers}

  volumes = ${JSON.stringify(volumes, null, 2)}
}

${servicesConfig}`;

    const filePath = join(this.outputDir, `middleware-${serviceName}.tf`);
    await writeFile(filePath, config.trim() + "\n", "utf-8");
    logger.step(`生成 middleware-${serviceName}.tf`);
  }

  /**
   * 生成分布式模式的中间件配置
   * 为每个服务生成独立的 Deployment 和 Service
   */
  private async generateDistributedMiddlewareConfig(middleware: ContainerMiddleware, namespace: string, dependencyRefs: Map<string, string>, middlewareConfig: any, env: MiddlewareEnvironment): Promise<void> {
    const baseName = middleware.middlewareName.toLowerCase();

    // 先解析 middleware.config 中的引用
    const resolvedConfig = this.resolveConfigRefs(middleware.config, dependencyRefs);
    // 合并 middleware.endpoints 中的 publicAccess 配置到 config 中
    const configWithPublicAccess = this.mergeEndpointsPublicAccess(resolvedConfig, middleware);
    // 把 middleware 顶层的 image 传入 config，供 getDistributedServices 使用
    const envWithResolvedConfig: MiddlewareEnvironment = {
      ...env,
      config: {
        ...configWithPublicAccess,
        image: middleware.image, // 顶层 image 优先
      },
    };

    // 获取分布式服务列表
    const distributedServices = middlewareConfig.getDistributedServices(envWithResolvedConfig);

    if (distributedServices.length === 0) {
      logger.warn(`中间件 ${middleware.middlewareName} 配置为 distributed 模式，但未定义任何服务`);
      return;
    }

    logger.info(`生成 ${middleware.middlewareName} 分布式部署配置 (${distributedServices.length} 个服务)`);

    // 构建 depends_on（如果有依赖云服务）
    const cloudDependsOn = this.buildDependsOn(middleware, dependencyRefs);

    // 生成 Terraform 配置
    const configBlocks: string[] = [];

    // 添加注释头
    configBlocks.push(`# Middleware: ${middleware.middlewareName} (${middleware.type}) - Distributed Mode`);
    configBlocks.push(`# Services: ${distributedServices.map((s: any) => s.name).join(", ")}`);
    configBlocks.push("");

    // 为每个服务生成 Deployment 和 Service
    for (const service of distributedServices) {
      const serviceName = `${baseName}-${service.name}`;
      const appName = serviceName;
      const moduleNameSafe = serviceName.replace(/-/g, "_");

      // 处理环境变量中的引用
      const processedEnv = this.processEnvVarsWithRefs(service.env, dependencyRefs);

      // 构建内部服务依赖（depends_on）
      let dependsOnBlock = "";
      const allDeps: string[] = [];

      // 云服务依赖
      if (cloudDependsOn) {
        const cloudDepsMatch = cloudDependsOn.match(/module\.\w+/g);
        if (cloudDepsMatch) {
          allDeps.push(...cloudDepsMatch);
        }
      }

      // 内部服务依赖
      if (service.dependsOn && service.dependsOn.length > 0) {
        for (const dep of service.dependsOn) {
          allDeps.push(`module.middleware_${baseName}_${dep}`);
        }
      }

      if (allDeps.length > 0) {
        dependsOnBlock = `

  depends_on = [
    ${allDeps.join(",\n    ")}
  ]`;
      }

      // 生成 Deployment
      const deploymentBlock = `
module "middleware_${moduleNameSafe}" {
  source = "${this.modulesPath}/kubernetes/deployment"

  deployment_name = "${serviceName}"
  namespace       = module.namespace.namespace_name
  app_name        = "${appName}"
  component_type  = "middleware"
  replicas        = ${service.replicas}${dependsOnBlock}

  init_containers = ${JSON.stringify(service.initContainers || [], null, 2)}

  containers = [
    {
      name    = "${service.name}"
      image   = "${service.image}"
      command = ${JSON.stringify(service.command || [])}
      args    = ${JSON.stringify(service.args || [])}
      ports   = ${JSON.stringify(service.ports, null, 6)}
      env     = ${this.formatEnvVars(processedEnv)}
      volume_mounts = ${JSON.stringify(service.volumeMounts || [], null, 6)}
      resources = {
        limits = {
          cpu    = "${service.resources.limits.cpu}"
          memory = "${service.resources.limits.memory}"
        }
        requests = {
          cpu    = "${service.resources.requests.cpu}"
          memory = "${service.resources.requests.memory}"
        }
      }
      liveness_probe  = null
      readiness_probe = null
    }
  ]

  volumes = ${JSON.stringify(service.volumes || [], null, 2)}
}`;
      configBlocks.push(deploymentBlock);

      // 生成 Service（如果有端口定义）
      if (service.servicePorts && service.servicePorts.length > 0) {
        const serviceBlock = `
module "service_${moduleNameSafe}" {
  source = "${this.modulesPath}/kubernetes/service"

  service_name = "${serviceName}-svc"
  namespace    = module.namespace.namespace_name
  app_name     = "${appName}"

  ports = ${JSON.stringify(service.servicePorts, null, 4)}

  service_type              = "${service.serviceType}"
  wait_for_load_balancer    = ${service.waitForLoadBalancer ?? false}

  depends_on = [
    module.middleware_${moduleNameSafe}
  ]
}`;
        configBlocks.push(serviceBlock);

        // 为 LoadBalancer 类型的 Service 生成 output（用于获取公网 IP）
        if (service.waitForLoadBalancer) {
          // 从 service.name 推断 endpoint 名称（如 frontend -> main, admintools -> admin）
          // distributed 模式下 service.name 通常是具体服务名，需要映射到 endpoint 名称
          const endpointName = this.mapServiceNameToEndpointName(service.name);
          const outputName = `${middleware.middlewareName.toLowerCase()}_${endpointName}_public_ip`;
          const outputBlock = `
output "${outputName}" {
  description = "Public IP for ${middleware.middlewareName} ${endpointName} endpoint"
  value       = module.service_${moduleNameSafe}.load_balancer_ip
}`;
          configBlocks.push(outputBlock);
        }
      }
    }

    // 写入文件
    const filePath = join(this.outputDir, `middleware-${baseName}.tf`);
    await writeFile(filePath, configBlocks.join("\n").trim() + "\n", "utf-8");
    logger.step(`生成 middleware-${baseName}.tf (distributed: ${distributedServices.length} services)`);
  }

  /**
   * 获取中间件的 endpoint 定义
   */
  private getEndpointDefinitions(use: string, config: Record<string, any>): EndpointSpec[] {
    try {
      const middlewareConfig = MiddlewareConfigFactory.create(use);
      const env: MiddlewareEnvironment = {
        provider: this.config.provider || "local",
        namespace: "default",
        middlewareName: "temp",
        config,
      };
      return middlewareConfig.getEndpointDefinitions(env);
    } catch (error) {
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
   * 合并 middleware.endpoints 中的 publicAccess 配置到 config
   *
   * 配置文件中 publicAccess 放在 endpoints 下：
   *   "endpoints": { "admin": { "publicAccess": true } }
   *
   * 但中间件配置类期望从 config.publicAccess 读取：
   *   "config": { "publicAccess": { "admin": true } }
   *
   * 此方法将两者合并，让中间件配置类能正确读取
   */
  private mergeEndpointsPublicAccess(config: Record<string, any>, middleware: ContainerMiddleware): Record<string, any> {
    // 从原始 middleware 对象获取 endpoints 配置
    const component = this.config.components[middleware.componentName];
    const originalMiddleware = component?.middlewareDependencies?.[middleware.middlewareName];
    const endpoints = originalMiddleware?.endpoints;

    if (!endpoints) {
      return config;
    }

    // 构建 publicAccess 对象
    const publicAccess: Record<string, boolean> = {};
    for (const [endpointName, endpointDef] of Object.entries(endpoints)) {
      if (typeof (endpointDef as any).publicAccess === "boolean") {
        publicAccess[endpointName] = (endpointDef as any).publicAccess;
      }
    }

    // 如果没有 publicAccess 配置，返回原 config
    if (Object.keys(publicAccess).length === 0) {
      return config;
    }

    // 合并到 config 中
    return {
      ...config,
      publicAccess,
    };
  }

  /**
   * 为每个 endpoint 生成 Service 配置
   */
  private generateServicesForEndpoints(serviceName: string, appName: string, endpointDefinitions: EndpointSpec[], middlewareName: string): string {
    const services: string[] = [];

    for (const endpoint of endpointDefinitions) {
      // 优先使用 endpoint 定义中的 serviceName（如 distributed 模式下的 temporal-frontend）
      // 否则按默认规则生成：main -> {service}-svc，其他 -> {service}-{name}-svc
      let fullServiceName: string;
      if (endpoint.serviceName) {
        fullServiceName = `${endpoint.serviceName}-svc`;
      } else {
        const svcSuffix = endpoint.name === "main" ? "svc" : `${endpoint.name}-svc`;
        fullServiceName = `${serviceName}-${svcSuffix}`;
      }
      const moduleNameSafe = fullServiceName.replace(/-/g, "_");

      // 根据 endpoint 配置确定 ServiceType
      const serviceType = this.getServiceTypeForEndpoint(endpoint);

      services.push(`
module "service_${moduleNameSafe}" {
  source = "${this.modulesPath}/kubernetes/service"

  service_name = "${fullServiceName}"
  namespace    = module.namespace.namespace_name
  app_name     = "${appName}"

  ports = [
    {
      name        = "${endpoint.name}"
      port        = ${endpoint.port}
      target_port = ${endpoint.port}
      protocol    = "TCP"
    }
  ]

  service_type              = "${serviceType}"
  wait_for_load_balancer    = ${endpoint.publicAccess && this.shouldWaitForLoadBalancer()}

  depends_on = [
    module.middleware_${serviceName}
  ]
}`);

      // 为 publicAccess: true 的 endpoint 生成 output（仅云环境）
      if (endpoint.publicAccess && this.shouldWaitForLoadBalancer()) {
        const outputName = `${middlewareName.toLowerCase()}_${endpoint.name}_public_ip`;
        services.push(`
output "${outputName}" {
  description = "Public IP for ${middlewareName} ${endpoint.name} endpoint"
  value       = module.service_${moduleNameSafe}.load_balancer_ip
}`);
      }
    }

    return services.join("\n");
  }

  /**
   * 根据 endpoint 配置确定 ServiceType
   */
  private getServiceTypeForEndpoint(endpoint: EndpointSpec): string {
    const provider = this.config.provider || "local";

    if (provider === "local") {
      return "NodePort"; // 本地环境统一用 NodePort
    }

    // 云环境根据 publicAccess 决定
    return endpoint.publicAccess ? "LoadBalancer" : "ClusterIP";
  }

  /**
   * 将 distributed 模式的服务名称映射到 endpoint 名称
   * 例如：frontend -> main, admintools -> admin
   */
  private mapServiceNameToEndpointName(serviceName: string): string {
    const mapping: Record<string, string> = {
      frontend: "main",
      admintools: "admin",
      // 可以根据需要添加更多映射
    };
    return mapping[serviceName] || serviceName;
  }

  /**
   * 生成 ConfigMap（如果中间件需要）
   */
  private generateConfigMapIfNeeded(middleware: ContainerMiddleware, middlewareSpec: any, serviceName: string, namespace: string): string {
    // 检查 middlewareSpec 是否包含 configFileContent
    if (!middlewareSpec.configFileContent) {
      return "";
    }

    // 转义配置文件内容中的特殊字符
    const configContent = middlewareSpec.configFileContent
      .replace(/\\/g, "\\\\") // 转义反斜杠
      .replace(/\$/g, "$$$$"); // 转义 $ 符号（Terraform 需要 $$）

    // 根据中间件类型选择配置文件格式
    // Centrifugo 使用 JSON 格式
    const configFileName = middleware.use === "centrifugo" ? "config.json" : "config.json";

    return `
# ConfigMap for ${middleware.middlewareName}
resource "kubernetes_config_map" "${serviceName}_config" {
  metadata {
    name      = "${serviceName}-config"
    namespace = module.namespace.namespace_name

    labels = {
      app        = "${serviceName}"
      managed-by = "deploy-tool"
    }
  }

  data = {
    "${configFileName}" = <<-EOT
${configContent}
EOT
  }
}

`;
  }

  /**
   * 解析配置对象中的引用
   * 递归处理对象和数组中的所有字符串值
   */
  private resolveConfigRefs(config: any, dependencyRefs: Map<string, string>): any {
    if (typeof config === "string") {
      // 字符串：查找并替换引用
      if (config.includes("${ref:")) {
        for (const [refPath, terraformRef] of dependencyRefs.entries()) {
          if (config.includes(`\${ref:${refPath}}`)) {
            return config.replace(`\${ref:${refPath}}`, terraformRef);
          }
        }
      }
      return config;
    } else if (Array.isArray(config)) {
      // 数组：递归处理每个元素
      return config.map((item) => this.resolveConfigRefs(item, dependencyRefs));
    } else if (config !== null && typeof config === "object") {
      // 对象：递归处理每个属性
      const resolved: any = {};
      for (const [key, value] of Object.entries(config)) {
        resolved[key] = this.resolveConfigRefs(value, dependencyRefs);
      }
      return resolved;
    }
    return config;
  }

  /**
   * 处理环境变量中的引用
   * 将 ${ref:...} 转换为 Terraform 的模块引用
   */
  private processEnvVarsWithRefs(envVars: any[], dependencyRefs: Map<string, string>): any[] {
    return envVars.map((env) => {
      if (typeof env.value === "string" && env.value.includes("${ref:")) {
        // 查找是否有对应的 Terraform 引用
        for (const [refPath, terraformRef] of dependencyRefs.entries()) {
          if (env.value.includes(`\${ref:${refPath}}`)) {
            return {
              ...env,
              value: env.value.replace(`\${ref:${refPath}}`, terraformRef),
              isTerraformRef: true,
            };
          }
        }
      }
      return env;
    });
  }

  /**
   * 格式化环境变量为 Terraform HCL
   */
  private formatEnvVars(envVars: any[]): string {
    const formatted = envVars.map((env) => {
      if ((env as any).isTerraformRef) {
        // Terraform 引用，不加引号
        return `        {
          name  = "${env.name}"
          value = ${env.value}
        }`;
      } else {
        // 普通字符串 - 需要转义内部的双引号和反斜杠
        const escapedValue = String(env.value)
          .replace(/\\/g, "\\\\") // 转义反斜杠
          .replace(/"/g, '\\"'); // 转义双引号
        return `        {
          name  = "${env.name}"
          value = "${escapedValue}"
        }`;
      }
    });

    return `[\n${formatted.join(",\n")}\n      ]`;
  }

  /**
   * 构建 depends_on 字符串
   */
  private buildDependsOn(middleware: ContainerMiddleware, dependencyRefs: Map<string, string>): string {
    // 从 dependencyRefs 中提取需要 depends_on 的 cloud 模块
    const cloudDeps = new Set<string>();

    for (const [refPath, terraformRef] of dependencyRefs.entries()) {
      // 如果是云服务引用（包含 module.cloud_）
      if (terraformRef.startsWith("module.cloud_")) {
        const match = terraformRef.match(/module\.(cloud_\w+)\./);
        if (match) {
          cloudDeps.add(match[1]);
        }
      }
    }

    if (cloudDeps.size === 0) {
      return "";
    }

    const deps = Array.from(cloudDeps)
      .map((dep) => `module.${dep}`)
      .join(",\n    ");
    return `

  depends_on = [
    ${deps}
  ]`;
  }

  /**
   * 获取中间件规格
   *
   * 使用工厂模式创建 middleware 配置实例
   * 自动处理环境差异（local vs cloud）
   */
  private getMiddlewareSpec(middleware: ContainerMiddleware, namespace: string): any {
    try {
      // 构建环境上下文
      const env: MiddlewareEnvironment = {
        provider: this.config.provider || "local",
        namespace,
        middlewareName: middleware.middlewareName,
        version: middleware.version,
        config: middleware.config,
      };

      // 通过工厂创建 middleware 配置
      const middlewareConfig = MiddlewareConfigFactory.create(middleware.use);

      // 获取各项配置
      const containerSpec = middlewareConfig.getContainerSpec(env);
      const serviceSpec = middlewareConfig.getServiceSpec(env);
      const resources = middlewareConfig.getResources();

      // 获取可选配置
      const volumeMounts = (middlewareConfig as any).getVolumeMounts?.() || [];
      const initContainers = (middlewareConfig as any).getInitContainers?.(env) || [];
      const configFileContent = (middlewareConfig as any).getConfigFileContent?.(env);
      const sidecarContainers: SidecarContainerSpec[] = (middlewareConfig as any).getSidecarContainers?.(env) || [];

      // 如果有 volumeMounts，生成对应的 volumes
      const volumes: any[] = [];
      if (volumeMounts.length > 0) {
        for (const mount of volumeMounts) {
          // 假设所有 volume 都是 ConfigMap（根据 mount.name 判断）
          volumes.push({
            name: mount.name,
            config_map: {
              name: `${middleware.middlewareName.toLowerCase()}-config`,
            },
            secret: null,
            persistent_volume_claim: null,
            empty_dir: null,
          });
        }
      }

      // 返回统一格式的配置
      // 镜像优先级：config.image > 配置类生成的默认镜像
      return {
        image: middleware.image || containerSpec.image,
        command: containerSpec.command,
        args: containerSpec.args,
        ports: containerSpec.ports,
        env: containerSpec.env,
        servicePorts: serviceSpec.ports,
        serviceType: serviceSpec.type,
        resources,
        volumeMounts,
        volumes,
        initContainers,
        configFileContent,
        sidecarContainers,
      };
    } catch (error) {
      // 处理未知的 middleware 类型
      logger.warn(`未知的中间件类型: ${middleware.use}, 使用默认配置`);
      logger.debug(`错误详情: ${error instanceof Error ? error.message : String(error)}`);

      // 返回默认配置
      return {
        image: middleware.use,
        command: [],
        args: [],
        ports: [{ container_port: 8080, name: "http", protocol: "TCP" }],
        env: [],
        servicePorts: [{ name: "http", port: 8080, target_port: 8080, protocol: "TCP" }],
        serviceType: this.config.provider === "local" ? "NodePort" : "LoadBalancer",
        resources: {
          limits: { cpu: "1000m", memory: "1Gi" },
          requests: { cpu: "100m", memory: "256Mi" },
        },
        sidecarContainers: [],
      };
    }
  }

  /**
   * 生成组件配置
   */
  private async generateComponentConfigs(): Promise<void> {
    const namespace = this.provider.getNamespace(this.config.environment);

    for (const [componentName, component] of Object.entries(this.config.components)) {
      const deploymentType = component.deploymentType || "local";

      // 跳过 local 类型的组件
      if (deploymentType === "local") {
        logger.skip(`组件 ${componentName} 是 local 类型，跳过部署`);
        continue;
      }

      // 跳过 skipApplication 为 true 的组件（只部署中间件）
      if (component.skipApplication === true) {
        logger.skip(`组件 ${componentName} 设置了 skipApplication，跳过应用部署（中间件已单独部署）`);
        continue;
      }

      // 生成 container 类型组件的配置
      await this.generateComponentConfig(componentName, component, namespace);
    }
  }

  /**
   * 生成单个组件的配置
   *
   * 使用工厂模式创建 component 配置实例
   * 自动处理环境差异、健康检查、环境变量等
   */
  private async generateComponentConfig(componentName: string, component: any, namespace: string): Promise<void> {
    const serviceName = componentName.toLowerCase();
    const appName = serviceName;
    const replicas = component.replicas || 1;

    try {
      // 构建部署上下文
      // 从云厂商配置中获取镜像仓库地址
      const providerConfig = this.getProviderConfig();
      const ctx: ComponentContext = {
        componentName,
        config: component,
        environment: this.config.environment,
        provider: this.config.provider || "local",
        namespace,
        imageRepository: providerConfig.imageRepository,
        fullConfig: { components: this.config.components },
      };

      // 通过工厂创建 component 配置
      const componentConfig = ComponentConfigFactory.create(ctx);

      // 获取各项配置
      const containerSpec = componentConfig.getContainerSpec(ctx);
      const serviceSpec = componentConfig.getServiceSpec(ctx);
      const resources = componentConfig.getResources(ctx);
      const probes = componentConfig.getProbes(ctx);

      // 获取 init container 和 volume 配置（如果组件支持）
      const initContainers = (componentConfig as any).getInitContainers?.(ctx) || [];
      const volumes = (componentConfig as any).getVolumes?.(ctx) || [];
      const volumeMounts = (componentConfig as any).getVolumeMounts?.(ctx) || [];

      // 生成 Service 配置（只有当有端口时才生成）
      const serviceConfig =
        serviceSpec.ports.length > 0
          ? `
module "service_${serviceName}" {
  source = "${this.modulesPath}/kubernetes/service"

  service_name = "${serviceName}-svc"
  namespace    = module.namespace.namespace_name
  app_name     = "${appName}"

  ports = ${JSON.stringify(serviceSpec.ports, null, 4)}

  service_type              = "${serviceSpec.type}"
  wait_for_load_balancer    = ${this.shouldWaitForLoadBalancer()}
}
`
          : "";

      // 生成 Terraform 配置
      const config = `
# Component: ${componentName}
module "component_${serviceName}" {
  source = "${this.modulesPath}/kubernetes/deployment"

  deployment_name = "${serviceName}"
  namespace       = module.namespace.namespace_name
  app_name        = "${appName}"
  component_type  = "component"
  replicas        = ${replicas}

  init_containers = ${JSON.stringify(initContainers, null, 2)}

  containers = [
    {
      name    = "${serviceName}"
      image   = "${containerSpec.image}"
      command = ${JSON.stringify(containerSpec.command)}
      args    = ${JSON.stringify(containerSpec.args)}
      ports   = ${JSON.stringify(containerSpec.ports, null, 6)}
      env     = ${JSON.stringify(containerSpec.env, null, 6)}
      volume_mounts = ${JSON.stringify(volumeMounts, null, 6)}
      resources = {
        limits = {
          cpu    = "${resources.limits.cpu}"
          memory = "${resources.limits.memory}"
        }
        requests = {
          cpu    = "${resources.requests.cpu}"
          memory = "${resources.requests.memory}"
        }
      }
      liveness_probe  = ${this.formatProbe(probes?.liveness)}
      readiness_probe = ${this.formatProbe(probes?.readiness)}
    }
  ]

  volumes = ${JSON.stringify(volumes, null, 2)}
}
${serviceConfig}`;

      const filePath = join(this.outputDir, `component-${serviceName}.tf`);
      await writeFile(filePath, config.trim() + "\n", "utf-8");
      logger.step(`生成 component-${serviceName}.tf`);
    } catch (error) {
      logger.error(`生成组件 ${componentName} 配置失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 格式化健康检查配置为 Terraform HCL 格式
   */
  private formatProbe(probe: any): string {
    if (!probe) {
      return "null";
    }

    const config = probe.config;
    let probeConfig = "";

    if (probe.type === "http") {
      probeConfig = `
      http_get = {
        path   = "${config.path}"
        port   = ${config.port}
        scheme = "${config.scheme}"
      }`;
    } else if (probe.type === "tcp") {
      probeConfig = `
      tcp_socket = {
        port = ${config.port}
      }`;
    } else if (probe.type === "exec") {
      probeConfig = `
      exec = {
        command = ${JSON.stringify(config.command)}
      }`;
    }

    return `{${probeConfig}
      initial_delay_seconds = ${probe.initial_delay_seconds}
      period_seconds        = ${probe.period_seconds}
      timeout_seconds       = ${probe.timeout_seconds}
      success_threshold     = ${probe.success_threshold}
      failure_threshold     = ${probe.failure_threshold}
    }`;
  }

  /**
   * 写入文件
   */
  async writeToFiles(outputDir: string): Promise<void> {
    this.outputDir = outputDir;
    await this.generate();
  }

  /**
   * 判断是否应该等待 LoadBalancer 分配 EXTERNAL-IP
   * 本地环境（Docker Desktop）: false，因为分配很慢且不稳定
   * 云环境: true，因为需要等待真实的负载均衡器就绪
   */
  private shouldWaitForLoadBalancer(): boolean {
    const provider = this.config.provider || "local";
    // 只有本地环境不等待，其他云环境都要等待
    return provider !== "local";
  }
}
