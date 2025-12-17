import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { spawn, ChildProcess } from "child_process";
import { connect as netConnect, Socket } from "net";
import { readFile, writeFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import { FinalConfig, DeployResult, DeploymentPlan, DeploymentStage } from "./types.js";
import { ConfigLoader } from "./config-loader.js";
import { EndpointManager } from "./endpoint-manager.js";
import { TerraformGenerator } from "./terraform/generator.js";
import { TerraformExecutor } from "./terraform/executor.js";
import { BaseProvider } from "./providers/base.js";
import { LocalProvider } from "./providers/local.js";
import { AliyunProvider } from "./providers/aliyun.js";
import { VolcengineProvider } from "./providers/volcengine.js";
import { validator } from "./utils/validator.js";
import { logger } from "./utils/logger.js";
import { CloudServiceInfo } from "./cloud-services/types.js";
import { supportsCloudService } from "./providers/cloud-services/index.js";
import { MiddlewareConfigFactory } from "./terraform/middleware/factory.js";
import { getLocalIP, buildPublicUrl } from "./utils/network.js";

// 获取当前模块的目录（deploy-tool 的 src 目录）
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 部署编排器
 * 协调整个部署流程
 */
export class Deployer {
  private configPath: string;
  private config!: FinalConfig;
  private endpointManager!: EndpointManager;
  private terraformGenerator!: TerraformGenerator;
  private terraformExecutor!: TerraformExecutor;
  private provider!: BaseProvider;
  private terraformOutputDir!: string;
  private terraformBaseDir: string;
  // 本地端口映射：middlewareName -> localPort
  private localPortMapping: Map<string, number> = new Map();

  constructor(configPath?: string) {
    this.configPath = configPath || ConfigLoader.getDefaultConfigPath();
    // terraformBaseDir 应该相对于 deploy-tool 工具本身的目录
    // tsx 运行时: __dirname = deploy-tool/src -> .. = deploy-tool
    // 编译后: __dirname = deploy-tool/dist/src -> ../.. = deploy-tool
    const deployToolRoot = __dirname.includes("/dist/") ? resolve(__dirname, "../..") : resolve(__dirname, "..");
    this.terraformBaseDir = resolve(deployToolRoot, "terraform", "generated");
  }

  /**
   * 根据环境设置 Terraform 输出目录
   * 每个环境使用独立的目录，避免配置冲突
   */
  private setTerraformOutputDir(environment: string): void {
    this.terraformOutputDir = resolve(this.terraformBaseDir, environment);
    logger.debug(`Terraform 输出目录: ${this.terraformOutputDir}`);
  }

  /**
   * 执行部署
   */
  async deploy(force: boolean = false): Promise<DeployResult> {
    const startTime = Date.now();

    try {
      // 阶段0: 预检查（在加载配置前）
      // 先做简单的配置加载以获取基本信息
      const tempConfig = await ConfigLoader.loadConfig(this.configPath);
      const tempProviderName = tempConfig.provider || "local";
      const tempProvider = this.createProvider(tempProviderName);
      const namespace = tempProvider.getNamespace(tempConfig.environment);

      // 提前设置 terraform 输出目录，用于 PID 文件路径等
      this.setTerraformOutputDir(tempConfig.environment);

      logger.header(`开始部署 - 环境: ${tempConfig.environment}`);

      // 检测是否已有部署
      const hasExistingDeployment = await this.checkExistingDeployment(namespace);

      if (hasExistingDeployment) {
        if (force) {
          logger.warn(`检测到 namespace ${namespace} 已存在，--force 模式，自动销毁旧部署...`);
          logger.info("");

          // 先清理 port-forward（如果是 local）
          if (tempProvider.getName() === "local") {
            await this.cleanupOldPortForwards(namespace);
            logger.success("Port-forward 进程已清理");
          }

          // 直接删除 namespace（更可靠且不影响当前配置）
          logger.info("删除旧 namespace...");
          const deleteResult = await this.deleteNamespace(namespace);
          if (!deleteResult) {
            logger.error("删除 namespace 失败，无法继续部署");
            return {
              success: false,
              message: `删除 namespace ${namespace} 失败`,
            };
          }

          logger.success("旧部署已销毁，继续新部署...");
          logger.info("");

          // 等待 namespace 完全删除
          logger.info("等待 namespace 完全删除...");
          await this.sleep(5000);
        } else {
          logger.error(`\n❌ 部署失败: namespace ${namespace} 已存在部署`);
          logger.error("");
          logger.error("建议操作:");
          logger.error(`  1. 先销毁现有部署: deploy-tool destroy --env ${tempConfig.environment}`);
          logger.error(`  2. 或使用强制模式: deploy-tool deploy --env ${tempConfig.environment} --force`);
          logger.error("");

          return {
            success: false,
            message: `部署失败: namespace ${namespace} 已存在`,
            details: { namespace, force: false },
          };
        }
      }

      // 阶段1: 加载和验证配置
      await this.loadConfig();

      // 阶段2: 检测并部署云服务（如果需要）
      await this.deployCloudServices();

      // 阶段3: 验证 cloud 类型依赖（部署后验证）
      await this.validateCloudDependencies();

      // 阶段4: 填写 container endpoints
      await this.fillEndpoints();

      // 阶段5: 生成 Terraform 配置（包含云服务和 K8s 资源的引用关系）
      await this.generateTerraform();

      // 阶段6: 通过 Terraform 统一部署所有资源
      await this.deployAll();

      // 阶段7: 从 Terraform output 更新云服务 endpoint（如果有）
      const hasNewPublicUrl = await this.updateEndpointsFromTerraform();

      // 阶段8: 如果有新的 publicUrl，需要二次部署更新 Pod 配置
      if (hasNewPublicUrl) {
        logger.stage(8, 8, "二次部署更新 Pod 配置（包含 publicUrl）");
        logger.info("检测到新的 publicUrl，重新生成配置并更新 Pod...");

        // 重新生成 Terraform 配置（此时 config 已包含 publicUrl）
        await this.terraformGenerator.generate();
        logger.step("Terraform 配置已更新");

        // 重新 apply（只会更新 Deployment，Service 保持不变）
        const applyResult = await this.terraformExecutor.apply();
        if (!applyResult.success) {
          throw new Error("二次部署 Terraform apply 失败");
        }
        logger.success("Pod 配置已更新，包含 publicUrl");
      }

      // 完成
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const elapsedMinutes = Math.floor(elapsedSeconds / 60);
      const remainingSeconds = elapsedSeconds % 60;
      const elapsed = elapsedMinutes > 0 ? `${elapsedMinutes}m ${remainingSeconds}s` : `${elapsedSeconds}s`;

      logger.summary("部署完成", {
        环境: this.config.environment,
        Provider: this.provider.getName(),
        Namespace: this.provider.getNamespace(this.config.environment),
        总耗时: elapsed,
      });

      // 对于本地环境，自动设置 port-forward
      if (this.provider.getName() === "local") {
        await this.setupPortForwards();
        // 为 publicAccess: true 的 endpoint 生成 publicUrl（模拟云环境行为）
        this.generateLocalPublicUrls();
      }

      // 保存更新后的配置（包含云服务 endpoint 和本地 publicUrl）
      await this.endpointManager.saveConfig();

      // 对于本地环境，生成 app.host.config.json 供宿主机使用
      if (this.provider.getName() === "local") {
        logger.info("");
        logger.step("生成宿主机配置文件 app.host.config.json");
        await this.endpointManager.generateHostConfig(this.localPortMapping);
      }

      return {
        success: true,
        message: "部署成功完成",
        details: {
          environment: this.config.environment,
          provider: this.provider.getName(),
          namespace: this.provider.getNamespace(this.config.environment),
          elapsed,
        },
      };
    } catch (error: any) {
      logger.error(`部署失败: ${error.message}`);
      return {
        success: false,
        message: `部署失败: ${error.message}`,
        details: { error: error.stack },
      };
    }
  }

  /**
   * 加载配置
   */
  private async loadConfig(): Promise<void> {
    logger.stage(1, 8, "加载和验证配置");

    // 加载配置文件
    this.config = await ConfigLoader.loadConfig(this.configPath);
    logger.step("读取配置文件");

    // 验证配置结构
    if (!ConfigLoader.validateConfigStructure(this.config)) {
      throw new Error("配置文件格式不正确");
    }
    logger.step("配置结构验证通过");

    // 初始化 Provider
    const providerName = this.config.provider || "local";
    this.provider = this.createProvider(providerName);
    logger.step(`使用 Provider: ${this.provider.getName()}`);

    // 验证配置完整性
    const validationResult = validator.validateConfig(this.config);
    if (!validationResult.valid) {
      logger.error("配置验证失败:");
      validationResult.errors.forEach((err) => logger.error(`  - ${err}`));
      throw new Error("配置验证失败");
    }
    logger.step("配置完整性验证通过");

    // 验证部署类型规则
    const deploymentTypeResult = validator.validateDeploymentTypes(this.config);
    if (!deploymentTypeResult.valid) {
      logger.error("部署类型验证失败:");
      deploymentTypeResult.errors.forEach((err) => logger.error(`  - ${err}`));
      throw new Error("部署类型验证失败");
    }
    logger.step("部署类型验证通过");

    // 设置环境隔离的 Terraform 输出目录
    this.setTerraformOutputDir(this.config.environment);

    // 初始化其他管理器
    this.endpointManager = new EndpointManager(this.config, this.configPath, this.provider);
    this.terraformGenerator = new TerraformGenerator(this.config, this.provider, this.terraformOutputDir);
    this.terraformExecutor = new TerraformExecutor(this.terraformOutputDir);
  }

  /**
   * 创建 Provider
   */
  private createProvider(providerName: string): BaseProvider {
    switch (providerName) {
      case "local":
        return new LocalProvider();
      case "aliyun":
        return new AliyunProvider();
      case "volcengine":
        return new VolcengineProvider();
      default:
        throw new Error(`不支持的 provider: ${providerName}`);
    }
  }

  /**
   * 检测并部署云服务
   */
  private async deployCloudServices(): Promise<void> {
    logger.stage(2, 8, "检测云服务");

    // 获取 provider
    const providerName = this.config.provider || "local";

    // local provider 不支持云服务
    if (providerName === "local") {
      logger.skip("Local provider 不使用云服务");
      return;
    }

    // 扫描需要部署的云服务
    const servicesToDeploy = this.findCloudServicesToDeploy();

    if (servicesToDeploy.length === 0) {
      logger.step("没有 cloud 类型的中间件");
      return;
    }

    // 记录将由 Terraform 部署的云服务
    logger.info(`发现 ${servicesToDeploy.length} 个云服务将由 Terraform 部署:`);
    for (const service of servicesToDeploy) {
      logger.info(`  - ${service.componentName}.${service.middlewareName} (${service.middlewareType})`);
    }

    logger.step("云服务将在 Terraform apply 阶段创建");
  }

  /**
   * 查找需要部署的云服务
   */
  private findCloudServicesToDeploy(): CloudServiceInfo[] {
    const services: CloudServiceInfo[] = [];
    const providerName = this.config.provider || "local";

    for (const [componentName, component] of Object.entries(this.config.components)) {
      for (const [middlewareName, middleware] of Object.entries(component.middlewareDependencies || {})) {
        // 只处理 cloud 类型且没有 endpoint 的中间件
        const mainEndpointValue = middleware.endpoints?.main?.value;
        if (middleware.deploymentType === "cloud" && (!mainEndpointValue || mainEndpointValue.trim() === "")) {
          // 检查 provider 是否支持该中间件的云服务
          if (supportsCloudService(providerName, middleware.type)) {
            services.push({
              needsDeploy: true,
              componentName,
              middlewareName,
              middlewareType: middleware.type,
              deployParams: {
                resourceName: this.generateCloudResourceName(componentName, middlewareName),
                environment: this.config.environment,
                componentName,
                middlewareName,
                middlewareType: middleware.type,
                config: middleware.config,
                cloudSpec: middleware.config.cloudSpec,
              },
            });

            logger.info(`  - ${componentName}.${middlewareName} (${middleware.type})`);
          } else {
            logger.warn(`Provider ${providerName} 不支持 ${middleware.type} 的云服务自动部署`);
          }
        }
      }
    }

    return services;
  }

  /**
   * 生成云资源名称
   */
  private generateCloudResourceName(componentName: string, middlewareName: string): string {
    const app = "lit";
    const env = this.config.environment;
    return `${app}-${env}-${middlewareName.toLowerCase()}`;
  }

  /**
   * 验证 cloud 类型依赖
   */
  private async validateCloudDependencies(): Promise<void> {
    logger.stage(3, 8, "验证云服务依赖");

    const providerName = this.config.provider || "local";

    // 对于云环境，cloud 类型的 endpoint 将由 Terraform 创建后填充，或使用已有资源
    // 这里检查 provider 是否支持所需的云服务
    if (providerName !== "local") {
      for (const [componentName, component] of Object.entries(this.config.components)) {
        for (const [middlewareName, middleware] of Object.entries(component.middlewareDependencies || {})) {
          if (middleware.deploymentType === "cloud") {
            // 如果已有 endpoint，使用现有云资源
            const mainEndpointValue = middleware.endpoints?.main?.value;
            if (mainEndpointValue && mainEndpointValue.trim() !== "") {
              logger.step(`${componentName}.${middlewareName} (${middleware.type}) - 使用现有资源`);
              continue;
            }

            // 需要创建新资源，检查 provider 是否支持
            if (!supportsCloudService(providerName, middleware.type)) {
              throw new Error(`Provider ${providerName} 不支持 ${middleware.type} 类型的云服务 ` + `(${componentName}.${middlewareName})`);
            }
            logger.step(`${componentName}.${middlewareName} (${middleware.type}) - 将由 Terraform 创建`);
          }
        }
      }
      return;
    }

    // local 环境：验证已有的 cloud endpoint
    const validationResult = this.endpointManager.validateCloudEndpoints();

    if (!validationResult.valid) {
      logger.error("Cloud 类型中间件验证失败");
      throw new Error("Cloud 类型中间件缺少 endpoint 配置");
    }

    logger.step("所有 cloud 类型中间件 endpoint 已配置");
  }

  /**
   * 填写 container endpoints
   * 注意：cloud 类型的 endpoint 由云服务部署阶段填充，或在 Terraform 部署后从 output 读取
   */
  private async fillEndpoints(): Promise<void> {
    logger.stage(4, 8, "填写 Endpoint");
    this.endpointManager.fillAllEndpoints();
    await this.endpointManager.saveConfig();
  }

  /**
   * 从 Terraform output 更新云服务 endpoint 和公网地址
   * 这个方法在 Terraform 部署完成后调用，用于同步云服务的实际 endpoint
   * @returns 是否有新的 publicUrl 被设置（需要二次部署更新 Pod 配置）
   */
  private async updateEndpointsFromTerraform(): Promise<boolean> {
    const providerName = this.config.provider || "local";

    if (providerName === "local") {
      logger.skip("Local provider 无需从 Terraform 更新 endpoint");
      return false;
    }

    // 记录是否有新的 publicUrl 被设置
    let hasNewPublicUrl = false;

    try {
      logger.stage(7, 8, "从 Terraform 同步 Endpoint");

      // 获取 Terraform outputs
      const outputs = await this.terraformExecutor.getOutputs();

      // 更新配置中的 endpoint
      for (const [outputName, outputValue] of Object.entries(outputs)) {
        // 处理云服务 endpoint（格式：{middlewareName}_endpoint）
        if (outputName.endsWith("_endpoint")) {
          // 解析 output 名称
          const middlewareName = outputName.replace("cloud_", "").replace("_endpoint", "");

          // 查找对应的 middleware 并更新 endpoint
          for (const [componentName, component] of Object.entries(this.config.components)) {
            const middleware = component.middlewareDependencies?.[middlewareName];
            if (middleware && middleware.deploymentType === "cloud") {
              // 确保 endpoints 结构存在
              if (!middleware.endpoints) {
                middleware.endpoints = {};
              }
              if (!middleware.endpoints.main) {
                middleware.endpoints.main = { port: 0, protocol: "unknown", publicAccess: false };
              }

              const oldEndpoint = middleware.endpoints.main.value;
              middleware.endpoints.main.value = String(outputValue);

              if (oldEndpoint !== middleware.endpoints.main.value) {
                logger.step(`更新 ${componentName}.${middlewareName} endpoint: ${middleware.endpoints.main.value}`);
              }
            }
          }
        }

        // 处理公网 IP（格式：{middlewareName}_{endpointName}_public_ip）
        if (outputName.endsWith("_public_ip")) {
          const publicIp = String(outputValue);
          if (!publicIp || publicIp === "null") {
            continue; // 跳过空值
          }

          // 解析 output 名称：{middlewareName}_{endpointName}_public_ip
          const match = outputName.match(/^(.+)_(.+)_public_ip$/);
          if (!match) {
            logger.warn(`无法解析 public_ip output 名称: ${outputName}`);
            continue;
          }

          const [, outputMiddlewareName, endpointName] = match;

          // 查找对应的 middleware 并更新 publicUrl
          // 注意：output 名称是小写，config 中 middleware 名称可能是驼峰，需要大小写不敏感匹配
          for (const [componentName, component] of Object.entries(this.config.components)) {
            // 大小写不敏感查找 middleware
            const middlewareEntry = Object.entries(component.middlewareDependencies || {}).find(([name]) => name.toLowerCase() === outputMiddlewareName.toLowerCase());
            if (!middlewareEntry) continue;

            const [middlewareName, middleware] = middlewareEntry;
            if (middleware.endpoints?.[endpointName]) {
              const endpoint = middleware.endpoints[endpointName];
              // 构建完整的 publicUrl：{protocol}://{ip}:{port}
              const protocol = endpoint.protocol || "http";
              const port = endpoint.port;
              // 如果协议为空（如某些 gRPC 服务），只用 ip:port 格式
              const publicUrl = protocol ? `${protocol}://${publicIp}:${port}` : `${publicIp}:${port}`;

              // 检测是否是新的 publicUrl
              const oldPublicUrl = endpoint.publicUrl;
              if (oldPublicUrl !== publicUrl) {
                hasNewPublicUrl = true;
              }

              endpoint.publicUrl = publicUrl;
              logger.step(`更新 ${componentName}.${middlewareName}.endpoints.${endpointName}.publicUrl = ${publicUrl}`);
            }
          }
        }
      }

      // 保存更新后的配置
      await this.endpointManager.saveConfig();
      logger.success("Endpoint 同步完成");
    } catch (error: any) {
      logger.warn(`从 Terraform 同步 endpoint 失败: ${error.message}`);
      logger.info("云服务 endpoint 可能已经在配置中设置，继续执行");
    }

    return hasNewPublicUrl;
  }

  /**
   * 为本地环境的 publicAccess: true endpoint 生成 publicUrl
   * 使用本机 IP 地址，使局域网内其他设备可以访问
   */
  private generateLocalPublicUrls(): void {
    const localIP = getLocalIP();
    logger.step(`检测到本机 IP: ${localIP}`);
    logger.step("为 publicAccess: true 的 endpoint 生成 publicUrl");

    for (const [componentName, component] of Object.entries(this.config.components)) {
      for (const [middlewareName, middleware] of Object.entries(component.middlewareDependencies || {})) {
        if (middleware.deploymentType !== "container" || !middleware.endpoints) {
          continue;
        }

        for (const [endpointName, endpoint] of Object.entries(middleware.endpoints)) {
          if (endpoint.publicAccess) {
            // 使用端口映射获取本地端口
            const mappingKey = `${middlewareName.toLowerCase()}-${endpointName}`;
            const localPort = this.localPortMapping.get(mappingKey) || endpoint.port;

            // 构建 publicUrl，使用本机 IP（使局域网可访问）
            const protocol = endpoint.protocol || "http";
            endpoint.publicUrl = buildPublicUrl(localPort, protocol || undefined, localIP);

            logger.step(`${componentName}.${middlewareName}.endpoints.${endpointName}.publicUrl = ${endpoint.publicUrl}`);
          }
        }
      }
    }
  }

  /**
   * 生成 Terraform 配置
   * 包含云服务资源和 K8s 资源，以及它们之间的引用关系
   */
  private async generateTerraform(): Promise<void> {
    logger.stage(5, 8, "生成 Terraform 配置");

    await this.terraformGenerator.generate();
    logger.success("Terraform 配置生成完成");
  }

  /**
   * 部署所有资源
   * Terraform 会自动处理依赖关系：
   * 1. 先部署云服务 Module（如果有）
   * 2. 获取云服务的 output（endpoint 等）
   * 3. 再部署引用这些 output 的 K8s 资源
   */
  private async deployAll(): Promise<void> {
    logger.stage(6, 8, "部署资源");

    // 检查 terraform 是否已安装
    const terraformInstalled = await TerraformExecutor.checkTerraformInstalled();
    if (!terraformInstalled) {
      throw new Error("Terraform 未安装，请先安装 Terraform >= 1.5.0");
    }

    const terraformVersion = await TerraformExecutor.getTerraformVersion();
    logger.info(`使用 Terraform 版本: ${terraformVersion}`);

    // 初始化 Terraform
    await this.terraformExecutor.init();

    // 验证配置
    const isValid = await this.terraformExecutor.validate();
    if (!isValid) {
      throw new Error("Terraform 配置验证失败");
    }

    // 生成执行计划
    const planResult = await this.terraformExecutor.plan();
    logger.info(`执行计划: 添加 ${planResult.changes.add} 个资源, 修改 ${planResult.changes.change} 个资源, 删除 ${planResult.changes.destroy} 个资源`);

    // 如果没有变更，跳过 apply
    if (planResult.changes.add === 0 && planResult.changes.change === 0 && planResult.changes.destroy === 0) {
      logger.info("没有需要部署的资源");
      return;
    }

    // 应用变更（Terraform 会自动处理云服务和 K8s 资源的部署顺序）
    const applyResult = await this.terraformExecutor.apply();
    if (!applyResult.success) {
      throw new Error("Terraform apply 失败");
    }

    logger.success(`成功部署 ${applyResult.resources.length} 个资源`);
  }

  /**
   * 恢复本地端口转发
   * 用于 Docker 重启后手动恢复 port-forward
   */
  async portForward(): Promise<DeployResult> {
    try {
      // 加载配置
      this.config = await ConfigLoader.loadConfig(this.configPath);

      // 初始化 Provider
      const providerName = this.config.provider || "local";
      this.provider = this.createProvider(providerName);

      // 验证是否是 local provider
      if (this.provider.getName() !== "local") {
        return {
          success: false,
          message: "port-forward 命令只适用于 local 环境",
        };
      }

      // 设置 Terraform 输出目录（用于 PID 文件路径）
      this.setTerraformOutputDir(this.config.environment);

      // 初始化 EndpointManager（用于生成宿主机配置）
      this.endpointManager = new EndpointManager(this.config, this.configPath, this.provider);

      const namespace = this.provider.getNamespace(this.config.environment);

      logger.header(`恢复端口转发 - 环境: ${this.config.environment}`);

      // 检查 namespace 是否存在
      const hasDeployment = await this.checkExistingDeployment(namespace);
      if (!hasDeployment) {
        return {
          success: false,
          message: `namespace ${namespace} 不存在，请先执行部署`,
        };
      }

      // 设置 port-forward
      await this.setupPortForwards();

      // 生成宿主机配置文件
      logger.info("");
      logger.step("生成宿主机配置文件 app.host.config.json");
      await this.endpointManager.generateHostConfig(this.localPortMapping);

      logger.success("\n端口转发恢复完成！");

      return {
        success: true,
        message: "端口转发恢复成功",
        details: {
          environment: this.config.environment,
          namespace,
        },
      };
    } catch (error: any) {
      logger.error(`端口转发恢复失败: ${error.message}`);
      return {
        success: false,
        message: `端口转发恢复失败: ${error.message}`,
        details: { error: error.stack },
      };
    }
  }

  /**
   * 重启指定的 Deployment（触发滚动更新，拉取最新镜像）
   * @param targets 要重启的目标，可以是 'all'、组件名、或组件名数组
   */
  async restart(targets: string | string[] = "all"): Promise<DeployResult> {
    try {
      // 加载配置
      this.config = await ConfigLoader.loadConfig(this.configPath);

      // 初始化 Provider
      const providerName = this.config.provider || "local";
      this.provider = this.createProvider(providerName);

      const namespace = this.provider.getNamespace(this.config.environment);

      logger.header(`重启 Deployment - 环境: ${this.config.environment}`);

      // 检查 namespace 是否存在
      const hasDeployment = await this.checkExistingDeployment(namespace);
      if (!hasDeployment) {
        return {
          success: false,
          message: `namespace ${namespace} 不存在，请先执行部署`,
        };
      }

      // 收集需要重启的 Deployment
      const deployments = this.collectDeploymentsToRestart(targets);

      if (deployments.length === 0) {
        return {
          success: false,
          message: "没有找到需要重启的 Deployment",
        };
      }

      logger.info(`将重启以下 ${deployments.length} 个 Deployment:`);
      deployments.forEach((d) => logger.info(`  - ${d}`));
      logger.info("");

      // 执行 kubectl rollout restart
      const restartedDeployments: string[] = [];
      const failedDeployments: string[] = [];

      for (const deployment of deployments) {
        try {
          await this.rolloutRestart(namespace, deployment);
          restartedDeployments.push(deployment);
          logger.success(`  ✓ ${deployment} 已触发滚动更新`);
        } catch (error: any) {
          failedDeployments.push(deployment);
          logger.error(`  ✗ ${deployment} 重启失败: ${error.message}`);
        }
      }

      logger.info("");

      if (failedDeployments.length > 0) {
        logger.warn(`${failedDeployments.length} 个 Deployment 重启失败`);
        return {
          success: false,
          message: `部分 Deployment 重启失败: ${failedDeployments.join(", ")}`,
          details: { restarted: restartedDeployments, failed: failedDeployments },
        };
      }

      logger.success(`成功触发 ${restartedDeployments.length} 个 Deployment 滚动更新`);
      logger.info("");
      logger.info("💡 提示: 滚动更新会拉取最新镜像并逐步替换旧 Pod");
      logger.info("   使用 'kubectl get pods -n " + namespace + " -w' 查看更新进度");

      return {
        success: true,
        message: `成功重启 ${restartedDeployments.length} 个 Deployment`,
        details: { restarted: restartedDeployments },
      };
    } catch (error: any) {
      logger.error(`重启失败: ${error.message}`);
      return {
        success: false,
        message: `重启失败: ${error.message}`,
        details: { error: error.stack },
      };
    }
  }

  /**
   * 收集需要重启的 Deployment 名称
   */
  private collectDeploymentsToRestart(targets: string | string[]): string[] {
    const deployments: string[] = [];

    // 转换为数组
    const targetList = typeof targets === "string" ? [targets] : targets;

    for (const [componentName, component] of Object.entries(this.config.components)) {
      const deploymentType = component.deploymentType || "local";

      // 只处理 container 类型的组件
      if (deploymentType !== "container") continue;

      // 检查是否匹配目标
      const isAll = targetList.includes("all");
      const matchesComponent = targetList.includes(componentName.toLowerCase());

      if (isAll || matchesComponent) {
        // 添加组件本身（如果不是 skipApplication）
        if (!component.skipApplication) {
          deployments.push(componentName.toLowerCase());
        }
      }
    }

    return [...new Set(deployments)]; // 去重
  }

  /**
   * 执行 kubectl rollout restart
   */
  private async rolloutRestart(namespace: string, deploymentName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const cmd = spawn("kubectl", ["rollout", "restart", `deployment/${deploymentName}`, "-n", namespace]);

      let stderr = "";
      cmd.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      cmd.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(stderr || `Exit code: ${code}`));
        }
      });

      cmd.on("error", (error) => {
        reject(error);
      });
    });
  }

  /**
   * 销毁部署
   */
  async destroy(): Promise<DeployResult> {
    try {
      logger.header("开始销毁部署");

      // 加载配置
      await this.loadConfig();

      const namespace = this.provider.getNamespace(this.config.environment);

      // 对于本地环境，先清理 port-forward 进程
      if (this.provider.getName() === "local") {
        logger.info("清理 port-forward 进程...");
        await this.cleanupOldPortForwards(namespace);
        logger.success("Port-forward 进程已清理");
      }

      // 检查 terraform 是否已安装
      const terraformInstalled = await TerraformExecutor.checkTerraformInstalled();
      if (!terraformInstalled) {
        throw new Error("Terraform 未安装");
      }

      // 执行销毁
      const destroyResult = await this.terraformExecutor.destroy();
      if (!destroyResult.success) {
        throw new Error("Terraform destroy 失败");
      }

      logger.success("部署已销毁");

      return {
        success: true,
        message: "部署已成功销毁",
      };
    } catch (error: any) {
      logger.error(`销毁失败: ${error.message}`);
      return {
        success: false,
        message: `销毁失败: ${error.message}`,
      };
    }
  }

  /**
   * 生成部署计划
   */
  async plan(): Promise<DeploymentPlan> {
    await this.loadConfig();

    const namespace = this.provider.getNamespace(this.config.environment);
    const plan: DeploymentPlan = {
      namespace,
      cloudDependencies: [],
      containerMiddleware: [],
      components: [],
    };

    // 收集 cloud 类型依赖
    for (const [componentName, component] of Object.entries(this.config.components)) {
      for (const [middlewareName, middleware] of Object.entries(component.middlewareDependencies || {})) {
        if (middleware.deploymentType === "cloud") {
          plan.cloudDependencies.push({
            componentName,
            middlewareName,
            type: middleware.type,
            endpoint: middleware.endpoints?.main?.value || "",
          });
        } else if (middleware.deploymentType === "container" && middleware.use) {
          plan.containerMiddleware.push({
            componentName,
            middlewareName,
            type: middleware.type,
            use: middleware.use,
            replicas: middleware.replicas || 1,
            config: middleware.config,
          });
        }
      }
    }

    // 收集组件
    for (const [componentName, component] of Object.entries(this.config.components)) {
      const deploymentType = component.deploymentType || "local";
      plan.components.push({
        componentName,
        deploymentType,
        replicas: component.replicas || 1,
        port: component.port,
        config: component,
      });
    }

    return plan;
  }

  /**
   * 检测是否已有部署
   */
  private async checkExistingDeployment(namespace: string): Promise<boolean> {
    try {
      const checkCmd = spawn("kubectl", ["get", "namespace", namespace]);

      const exitCode = await new Promise<number>((resolve) => {
        checkCmd.on("close", (code) => {
          resolve(code || 0);
        });
      });

      // 退出码 0 表示 namespace 存在
      return exitCode === 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * 删除 namespace
   */
  private async deleteNamespace(namespace: string): Promise<boolean> {
    try {
      const deleteCmd = spawn("kubectl", ["delete", "namespace", namespace]);

      const exitCode = await new Promise<number>((resolve) => {
        deleteCmd.on("close", (code) => {
          resolve(code || 0);
        });
      });

      return exitCode === 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * 为本地环境设置 port-forward
   * 自动为所有 container 类型的中间件和组件创建端口转发
   */
  private async setupPortForwards(): Promise<void> {
    logger.stage(7, 7, "设置本地端口转发");

    const namespace = this.provider.getNamespace(this.config.environment);

    // 先清理之前的 port-forward 进程
    await this.cleanupOldPortForwards(namespace);

    // 清空端口映射
    this.localPortMapping.clear();

    const portForwards: Array<{
      service: string;
      deployment: string;
      containerPort: number; // 容器内端口
      localPort: number; // 本地端口
      middlewareName: string; // 中间件名称（用于记录映射）
    }> = [];

    // 用于追踪已使用的本地端口
    const usedLocalPorts = new Set<number>();

    // 辅助函数：分配本地端口，处理冲突
    const allocateLocalPort = (preferredPort: number): number => {
      let port = preferredPort;
      while (usedLocalPorts.has(port)) {
        port++;
      }
      usedLocalPorts.add(port);
      return port;
    };

    // 收集所有需要 port-forward 的服务
    for (const [componentName, component] of Object.entries(this.config.components)) {
      // 收集中间件（支持多 endpoints）
      for (const [middlewareName, middleware] of Object.entries(component.middlewareDependencies || {})) {
        if (middleware.deploymentType === "container") {
          // 获取中间件的所有 endpoint 定义
          const endpointDefinitions = this.getMiddlewareEndpointDefinitions(middleware.type, middleware.config);
          const deploymentName = middlewareName.toLowerCase();

          for (const endpoint of endpointDefinitions) {
            const containerPort = endpoint.port;
            const localPort = allocateLocalPort(containerPort);
            // Service 命名规则：main 用 {name}-svc，其他用 {name}-{endpointName}-svc
            const svcSuffix = endpoint.name === "main" ? "svc" : `${endpoint.name}-svc`;
            const serviceName = `${middlewareName.toLowerCase()}-${svcSuffix}`;
            // 映射 key：{middlewareName}-{endpointName}，与 generateHostConfig 一致
            const mappingKey = `${middlewareName.toLowerCase()}-${endpoint.name}`;

            portForwards.push({
              service: serviceName,
              deployment: deploymentName,
              containerPort,
              localPort,
              middlewareName: mappingKey,
            });

            // 记录端口映射
            this.localPortMapping.set(mappingKey, localPort);
          }
        }
      }

      // 收集组件（只有 container 类型且有端口的组件需要 port-forward）
      const deploymentType = component.deploymentType || "local";
      if (deploymentType === "container" && component.port) {
        const containerPort = component.port;
        const localPort = allocateLocalPort(containerPort);
        const serviceName = `${componentName.toLowerCase()}-svc`;
        const deploymentName = componentName.toLowerCase();

        portForwards.push({
          service: serviceName,
          deployment: deploymentName,
          containerPort,
          localPort,
          middlewareName: componentName.toLowerCase(),
        });

        // 记录端口映射
        this.localPortMapping.set(componentName.toLowerCase(), localPort);
      }
    }

    if (portForwards.length === 0) {
      logger.info("没有需要 port-forward 的服务");
      return;
    }

    logger.info(`\n准备为 ${portForwards.length} 个服务设置端口转发...`);

    // 第一步：检查本地端口是否被占用
    logger.info("检查端口占用情况...\n");
    const occupiedPorts: Array<{
      port: number;
      service: string;
      processInfo: { pid: string; command: string };
    }> = [];

    for (const { service, localPort } of portForwards) {
      // 直接获取占用端口的进程信息
      const processInfo = await this.getPortOccupyingProcess(localPort);
      if (processInfo) {
        occupiedPorts.push({ port: localPort, service, processInfo });
        logger.warn(`  ⚠ 端口 ${localPort} (${service}) 已被占用`);
      }
    }

    // 如果有端口被占用，报错并退出
    if (occupiedPorts.length > 0) {
      logger.error("\n❌ 部署失败: 以下端口已被占用，无法创建 port-forward\n");

      for (const { port, service, processInfo } of occupiedPorts) {
        logger.error(`端口 ${port} (${service}):`);
        logger.error(`  PID: ${processInfo.pid}`);
        logger.error(`  进程: ${processInfo.command}`);
        logger.error("");
      }

      throw new Error(`${occupiedPorts.length} 个端口被占用，无法继续部署`);
    }

    logger.success("✓ 所有端口可用\n");

    // 第二步：等待所有 Pod 就绪
    logger.info("等待所有 Pod 就绪...\n");

    for (const { deployment } of portForwards) {
      await this.waitForPodReady(namespace, deployment);
    }

    logger.info("");

    // 第三步：启动 port-forward 进程并记录 PID
    const pids: number[] = [];

    for (const { service, containerPort, localPort } of portForwards) {
      const cmd = "kubectl";
      // port-forward 格式：localPort:containerPort
      const args = ["port-forward", "--address", "0.0.0.0", "-n", namespace, `svc/${service}`, `${localPort}:${containerPort}`];

      logger.info(`启动 port-forward: ${service} -> 0.0.0.0:${localPort} (container: ${containerPort})`);

      // 使用 nohup 方式启动，确保进程持续运行
      const proc = spawn(cmd, args, {
        detached: true,
        stdio: "ignore", // 完全忽略 stdio，让进程独立运行
        env: process.env,
      });

      // 记录 PID
      if (proc.pid) {
        pids.push(proc.pid);
      }

      // 让进程在后台运行，不阻塞主进程
      proc.unref();

      logger.success(`  ✓ ${service} -> 0.0.0.0:${localPort} 已启动（PID: ${proc.pid}）`);

      // 等待一小段时间让进程真正启动
      await this.sleep(200);
    }

    // 保存所有 PID 到文件
    await this.savePids(namespace, pids);

    // 等待所有 port-forward 真正生效
    logger.info("\n等待端口转发生效...");
    await this.sleep(2000);

    // 验证所有端口是否可访问
    let allReady = true;
    for (const { service, localPort } of portForwards) {
      const isAccessible = await this.testPort(localPort);
      if (isAccessible) {
        logger.success(`  ✓ localhost:${localPort} 可访问`);
      } else {
        logger.warn(`  ⚠ localhost:${localPort} 暂时不可访问，可能需要稍等`);
        allReady = false;
      }
    }

    if (!allReady) {
      logger.warn("\n部分端口暂时不可访问，请稍等几秒后再启动应用");
    }

    logger.info("\n所有端口转发已启动！");
    logger.info("");
    logger.info("📝 提示:");
    logger.info("  - 端口转发进程在后台运行");
    logger.info("  - 关闭终端不会终止 port-forward");
    logger.info('  - 要停止所有 port-forward，使用: pkill -f "port-forward.*lit-dev"');
    logger.info("  - 或者执行: deploy-tool destroy --env dev");
    logger.info("");
    logger.success("现在可以启动应用: npm run start:dev");
    logger.info("");
  }

  /**
   * 等待 Pod 就绪
   */
  private async waitForPodReady(namespace: string, deploymentName: string): Promise<void> {
    const maxAttempts = 60; // 最多等待60秒
    const labelSelector = `app=${deploymentName}`;

    logger.waiting(`等待 ${deploymentName} Pod 就绪...`);

    for (let i = 0; i < maxAttempts; i++) {
      try {
        // 使用 kubectl 检查 Pod 状态
        const checkCmd = spawn("kubectl", ["get", "pods", "-n", namespace, "-l", labelSelector, "-o", "jsonpath={.items[0].status.phase}"]);

        const phase = await new Promise<string>((resolve) => {
          let output = "";
          checkCmd.stdout?.on("data", (data) => {
            output += data.toString();
          });
          checkCmd.on("close", () => {
            resolve(output.trim());
          });
        });

        if (phase === "Running") {
          logger.success(`  ✓ ${deploymentName} Pod 已就绪`);
          return;
        }

        await this.sleep(1000);
      } catch (error) {
        // 继续等待
      }
    }

    logger.warn(`  ⚠ ${deploymentName} Pod 等待超时，将尝试启动 port-forward`);
  }

  /**
   * 清理旧的 port-forward 进程
   */
  private async cleanupOldPortForwards(namespace: string): Promise<void> {
    const pidFile = this.getPidFilePath(namespace);

    if (!existsSync(pidFile)) {
      return;
    }

    try {
      const content = await readFile(pidFile, "utf-8");
      const pids = JSON.parse(content) as number[];

      if (pids.length > 0) {
        logger.info(`清理之前的 port-forward 进程 (${pids.length} 个)...`);

        for (const pid of pids) {
          try {
            // 尝试杀死进程
            process.kill(pid, "SIGTERM");
            logger.step(`清理进程 PID ${pid}`);
          } catch (error: any) {
            // 进程可能已经不存在，忽略错误
            if (error.code !== "ESRCH") {
              logger.debug(`清理 PID ${pid} 失败: ${error.message}`);
            }
          }
        }

        // 等待进程真正退出
        await this.sleep(500);
      }

      // 删除旧的 PID 文件
      await unlink(pidFile);
    } catch (error: any) {
      logger.debug(`清理旧进程失败: ${error.message}`);
    }
  }

  /**
   * 保存 PID 到文件
   */
  private async savePids(namespace: string, pids: number[]): Promise<void> {
    const pidFile = this.getPidFilePath(namespace);

    try {
      await writeFile(pidFile, JSON.stringify(pids, null, 2), "utf-8");
      logger.debug(`PID 已保存到: ${pidFile}`);
    } catch (error: any) {
      logger.warn(`保存 PID 失败: ${error.message}`);
    }
  }

  /**
   * 获取 PID 文件路径
   * 存储在环境隔离的 Terraform 输出目录中
   */
  private getPidFilePath(namespace: string): string {
    // 使用环境隔离的 terraform 输出目录
    // 如果 terraformOutputDir 尚未设置，使用 terraformBaseDir
    const baseDir = this.terraformOutputDir || this.terraformBaseDir;
    return resolve(baseDir, `.port-forward-${namespace}.pids`);
  }

  /**
   * 获取中间件的默认端口
   *
   * 改进：从 Middleware 配置类获取，而不是硬编码映射表
   * 这样与 Provider 保持一致，且新增 middleware 时无需修改
   */
  private getPortFromMiddleware(type: string): number {
    try {
      const config = MiddlewareConfigFactory.create(type);
      return config.getDefaultPort();
    } catch (error) {
      // 如果无法创建配置（未知类型），使用默认值
      logger.warn(`无法获取 middleware ${type} 的端口配置，使用默认值 8080`);
      return 8080;
    }
  }

  /**
   * 获取中间件的所有 endpoint 定义
   *
   * 从 Middleware 配置类获取完整的 endpoint 列表
   * 支持多 endpoint 的中间件（如 Temporal 的 main + admin）
   *
   * @param type middleware 类型
   * @param middlewareConfig middleware 配置
   * @returns endpoint 定义列表
   */
  private getMiddlewareEndpointDefinitions(
    type: string,
    middlewareConfig: Record<string, any> = {},
  ): Array<{
    name: string;
    port: number;
    protocol: string;
    publicAccess: boolean;
  }> {
    try {
      const config = MiddlewareConfigFactory.create(type);
      const env = {
        provider: (this.config.provider as any) || "local",
        namespace: this.provider.getNamespace(this.config.environment),
        middlewareName: "temp",
        config: middlewareConfig,
      };
      return config.getEndpointDefinitions(env);
    } catch (error) {
      // 如果无法创建配置（未知类型），返回默认的单 endpoint
      logger.warn(`无法获取 middleware ${type} 的 endpoint 定义，使用默认配置`);
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
   * 获取占用端口的进程信息
   * 只检测正在监听（LISTEN）该端口的进程，忽略已关闭或其他状态的连接
   */
  private async getPortOccupyingProcess(port: number): Promise<{ pid: string; command: string } | null> {
    return new Promise((resolve) => {
      // 使用 -sTCP:LISTEN 只匹配正在监听的进程，避免误报已关闭的连接
      const proc = spawn("lsof", ["-nP", "-iTCP:" + port, "-sTCP:LISTEN", "-t"]);

      let output = "";
      proc.stdout?.on("data", (data) => {
        output += data.toString();
      });

      proc.on("close", async (code) => {
        if (code !== 0 || !output.trim()) {
          resolve(null);
          return;
        }

        // 获取第一个 PID
        const pid = output.trim().split("\n")[0];

        // 获取进程命令
        const cmdProc = spawn("ps", ["-p", pid, "-o", "command="]);
        let command = "";

        cmdProc.stdout?.on("data", (data) => {
          command += data.toString();
        });

        cmdProc.on("close", () => {
          resolve({ pid, command: command.trim() });
        });
      });

      proc.on("error", () => {
        resolve(null);
      });
    });
  }

  /**
   * 测试端口是否可访问
   */
  private async testPort(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new Socket();

      socket.setTimeout(1000);

      socket.on("connect", () => {
        socket.destroy();
        resolve(true);
      });

      socket.on("timeout", () => {
        socket.destroy();
        resolve(false);
      });

      socket.on("error", () => {
        resolve(false);
      });

      socket.connect(port, "localhost");
    });
  }

  /**
   * 睡眠指定毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
