#!/usr/bin/env node
import { Command } from "commander";
import { Deployer } from "./deployer.js";
import { Builder } from "./builder.js";
import { ConfigGenerator } from "./config-generator.js";
import { ConfigLoader } from "./config-loader.js";
import { EndpointManager } from "./endpoint-manager.js";
import { LocalProvider } from "./providers/local.js";
import { logger } from "./utils/logger.js";
import { resolve } from "path";

const program = new Command();

program.name("deploy-tool").description("部署工具 - 基于 Terraform 的自动化部署").version("1.0.0");

program
  .command("build")
  .description("构建并推送 Docker 镜像")
  .requiredOption("--env <environment>", "环境名称 (dev/prod/test)")
  .option("-c, --config <path>", "配置文件路径（如不指定则自动生成）")
  .option("--config-dir <path>", "配置源文件目录路径")
  .option("--platform <platform>", "目标平台 (如 linux/amd64)", "linux/amd64")
  .option("--tag <tag>", "镜像标签", "latest")
  .option("--push", "构建后推送镜像", true)
  .option("--no-push", "只构建不推送")
  .option("--push-only", "跳过构建，只推送已有镜像")
  .action(async (options) => {
    try {
      let configPath: string | undefined;

      // 如果用户指定了配置文件路径，直接使用
      if (options.config) {
        configPath = resolve(options.config);
        logger.info(`使用指定的配置文件: ${configPath}`);
      } else {
        // 否则自动生成配置
        logger.info(`自动生成 ${options.env} 环境配置`);
        const configDir = options.configDir ? resolve(options.configDir) : undefined;

        await ConfigGenerator.generateFromFiles(options.env, configDir);
        // 生成后使用默认路径
        configPath = undefined;
      }

      const builder = new Builder(configPath);

      const result = await builder.build({
        environment: options.env,
        platform: options.platform,
        tag: options.tag,
        push: options.push,
        pushOnly: options.pushOnly,
      });

      if (result.success) {
        process.exit(0);
      } else {
        logger.error(result.message);
        process.exit(1);
      }
    } catch (error: any) {
      logger.error(`构建失败: ${error.message}`);
      if (error.stack) {
        logger.debug(error.stack);
      }
      process.exit(1);
    }
  });

program
  .command("update")
  .description("一键更新：构建镜像 → 推送 → 触发滚动更新")
  .requiredOption("--env <environment>", "环境名称 (dev/prod/test)")
  .option("-c, --config <path>", "配置文件路径（如不指定则自动生成）")
  .option("--config-dir <path>", "配置源文件目录路径")
  .option("--platform <platform>", "目标平台 (如 linux/amd64)", "linux/amd64")
  .option("--tag <tag>", "镜像标签", "latest")
  .option("--skip-build", "跳过构建步骤（假设镜像已推送）")
  .option("-t, --target <targets>", "要重启的目标，逗号分隔（默认 all）", "all")
  .action(async (options) => {
    try {
      let configPath: string | undefined;

      // 如果用户指定了配置文件路径，直接使用
      if (options.config) {
        configPath = resolve(options.config);
        logger.info(`使用指定的配置文件: ${configPath}`);
      } else {
        // 否则自动生成配置
        logger.info(`自动生成 ${options.env} 环境配置`);
        const configDir = options.configDir ? resolve(options.configDir) : undefined;

        await ConfigGenerator.generateFromFiles(options.env, configDir);
        configPath = undefined;
      }

      // 步骤 1: 构建并推送镜像（除非跳过）
      if (!options.skipBuild) {
        logger.info("");
        logger.header("步骤 1/2: 构建并推送镜像");

        const builder = new Builder(configPath);
        const buildResult = await builder.build({
          environment: options.env,
          platform: options.platform,
          tag: options.tag,
          push: true,
        });

        if (!buildResult.success) {
          logger.error(buildResult.message);
          process.exit(1);
        }
      } else {
        logger.info("");
        logger.info("跳过构建步骤（--skip-build）");
      }

      // 步骤 2: 触发滚动更新
      logger.info("");
      logger.header("步骤 2/2: 触发滚动更新");

      const deployer = new Deployer(configPath);
      const targets = options.target.split(",").map((t: string) => t.trim().toLowerCase());
      const restartResult = await deployer.restart(targets);

      if (!restartResult.success) {
        logger.error(restartResult.message);
        process.exit(1);
      }

      // 完成
      logger.info("");
      logger.success("✅ 更新完成！");
      logger.info("");
      logger.info("💡 新代码已部署，Pod 正在滚动更新中");

      process.exit(0);
    } catch (error: any) {
      logger.error(`更新失败: ${error.message}`);
      if (error.stack) {
        logger.debug(error.stack);
      }
      process.exit(1);
    }
  });

program
  .command("generate-config")
  .description("生成 app.config.json 配置文件")
  .requiredOption("--env <environment>", "环境名称 (dev/prod/test)")
  .option("--config-dir <path>", "配置文件目录路径")
  .action(async (options) => {
    try {
      logger.header(`生成 ${options.env} 环境配置`);

      const configDir = options.configDir ? resolve(options.configDir) : undefined;

      await ConfigGenerator.generateFromFiles(options.env, configDir);

      logger.success("\n配置生成完成！\n");
      process.exit(0);
    } catch (error: any) {
      logger.error(`配置生成失败: ${error.message}`);
      if (error.stack) {
        logger.debug(error.stack);
      }
      process.exit(1);
    }
  });

program
  .command("deploy")
  .description("部署应用到 Kubernetes")
  .requiredOption("--env <environment>", "环境名称 (dev/prod/test)")
  .option("-c, --config <path>", "配置文件路径（如不指定则自动生成）")
  .option("--config-dir <path>", "配置源文件目录路径")
  .option("--plan-only", "只生成执行计划，不部署")
  .option("--force", "强制部署：如果已有部署则先销毁再重新部署")
  .action(async (options) => {
    try {
      let configPath: string | undefined;

      // 如果用户指定了配置文件路径，直接使用
      if (options.config) {
        configPath = resolve(options.config);
        logger.info(`使用指定的配置文件: ${configPath}`);
      } else {
        // 否则自动生成配置
        logger.info(`自动生成 ${options.env} 环境配置`);
        const configDir = options.configDir ? resolve(options.configDir) : undefined;

        await ConfigGenerator.generateFromFiles(options.env, configDir);
        // 生成后使用默认路径
        configPath = undefined;
      }

      const deployer = new Deployer(configPath);

      if (options.planOnly) {
        logger.info("只生成执行计划模式");
        const plan = await deployer.plan();

        logger.info(`\nNamespace: ${plan.namespace}`);
        logger.info(`\nCloud 依赖 (${plan.cloudDependencies.length}):`);
        plan.cloudDependencies.forEach((dep) => {
          logger.info(`  - ${dep.componentName}.${dep.middlewareName} (${dep.type}): ${dep.endpoint}`);
        });

        logger.info(`\nContainer 中间件 (${plan.containerMiddleware.length}):`);
        plan.containerMiddleware.forEach((mw) => {
          logger.info(`  - ${mw.componentName}.${mw.middlewareName} (${mw.type}/${mw.use})`);
        });

        logger.info(`\n组件 (${plan.components.length}):`);
        plan.components.forEach((comp) => {
          logger.info(`  - ${comp.componentName} (${comp.deploymentType}): ${comp.port}`);
        });

        process.exit(0);
      }

      const result = await deployer.deploy(options.force || false);

      if (result.success) {
        process.exit(0);
      } else {
        logger.error(result.message);
        process.exit(1);
      }
    } catch (error: any) {
      logger.error(`部署失败: ${error.message}`);
      if (error.stack) {
        logger.debug(error.stack);
      }
      process.exit(1);
    }
  });

program
  .command("destroy")
  .description("销毁部署的资源")
  .option("--env <environment>", "环境名称 (如需自动生成配置)")
  .option("-c, --config <path>", "配置文件路径（如不指定则使用默认路径或自动生成）")
  .option("--config-dir <path>", "配置源文件目录路径")
  .action(async (options) => {
    try {
      let configPath: string | undefined;

      // 如果指定了 env，自动生成配置
      if (options.env) {
        logger.info(`自动生成 ${options.env} 环境配置`);
        const configDir = options.configDir ? resolve(options.configDir) : undefined;
        await ConfigGenerator.generateFromFiles(options.env, configDir);
      }

      configPath = options.config ? resolve(options.config) : undefined;
      const deployer = new Deployer(configPath);

      const result = await deployer.destroy();

      if (result.success) {
        process.exit(0);
      } else {
        logger.error(result.message);
        process.exit(1);
      }
    } catch (error: any) {
      logger.error(`销毁失败: ${error.message}`);
      if (error.stack) {
        logger.debug(error.stack);
      }
      process.exit(1);
    }
  });

program
  .command("port-forward")
  .description("恢复本地端口转发（用于 Docker 重启后手动恢复）")
  .requiredOption("--env <environment>", "环境名称 (dev/prod/test)")
  .option("-c, --config <path>", "配置文件路径（如不指定则自动生成）")
  .option("--config-dir <path>", "配置源文件目录路径")
  .action(async (options) => {
    try {
      let configPath: string | undefined;

      // 如果用户指定了配置文件路径，直接使用
      if (options.config) {
        configPath = resolve(options.config);
        logger.info(`使用指定的配置文件: ${configPath}`);
      } else {
        // 否则自动生成配置
        logger.info(`自动生成 ${options.env} 环境配置`);
        const configDir = options.configDir ? resolve(options.configDir) : undefined;

        await ConfigGenerator.generateFromFiles(options.env, configDir);
        // 生成后使用默认路径
        configPath = undefined;
      }

      const deployer = new Deployer(configPath);

      const result = await deployer.portForward();

      if (result.success) {
        process.exit(0);
      } else {
        logger.error(result.message);
        process.exit(1);
      }
    } catch (error: any) {
      logger.error(`端口转发恢复失败: ${error.message}`);
      if (error.stack) {
        logger.debug(error.stack);
      }
      process.exit(1);
    }
  });

program
  .command("plan")
  .description("查看部署计划")
  .option("--env <environment>", "环境名称 (如需自动生成配置)")
  .option("-c, --config <path>", "配置文件路径（如不指定则使用默认路径或自动生成）")
  .option("--config-dir <path>", "配置源文件目录路径")
  .action(async (options) => {
    try {
      let configPath: string | undefined;

      // 如果指定了 env，自动生成配置
      if (options.env) {
        logger.info(`自动生成 ${options.env} 环境配置`);
        const configDir = options.configDir ? resolve(options.configDir) : undefined;
        await ConfigGenerator.generateFromFiles(options.env, configDir);
      }

      configPath = options.config ? resolve(options.config) : undefined;
      const deployer = new Deployer(configPath);

      const plan = await deployer.plan();

      logger.header("部署计划");

      console.log(`\n📦 Namespace: ${plan.namespace}\n`);

      console.log(`☁️  Cloud 依赖 (${plan.cloudDependencies.length}):`);
      if (plan.cloudDependencies.length === 0) {
        console.log("  (无)");
      } else {
        plan.cloudDependencies.forEach((dep) => {
          console.log(`  - ${dep.componentName}.${dep.middlewareName}`);
          console.log(`    类型: ${dep.type}`);
          console.log(`    Endpoint: ${dep.endpoint}`);
        });
      }

      console.log(`\n📦 Container 中间件 (${plan.containerMiddleware.length}):`);
      if (plan.containerMiddleware.length === 0) {
        console.log("  (无)");
      } else {
        plan.containerMiddleware.forEach((mw) => {
          console.log(`  - ${mw.componentName}.${mw.middlewareName}`);
          console.log(`    类型: ${mw.type}`);
          console.log(`    使用: ${mw.use}`);
          console.log(`    副本: ${mw.replicas}`);
        });
      }

      console.log(`\n🚀 组件 (${plan.components.length}):`);
      plan.components.forEach((comp) => {
        console.log(`  - ${comp.componentName}`);
        console.log(`    部署类型: ${comp.deploymentType}`);
        console.log(`    端口: ${comp.port}`);
        console.log(`    副本: ${comp.replicas}`);
      });

      console.log();

      process.exit(0);
    } catch (error: any) {
      logger.error(`生成计划失败: ${error.message}`);
      if (error.stack) {
        logger.debug(error.stack);
      }
      process.exit(1);
    }
  });

program
  .command("restart")
  .description("重启 Deployment 以拉取最新镜像（触发滚动更新）")
  .requiredOption("--env <environment>", "环境名称 (dev/prod/test)")
  .option("-c, --config <path>", "配置文件路径（如不指定则自动生成）")
  .option("--config-dir <path>", "配置源文件目录路径")
  .option("-t, --target <targets>", "要重启的目标，逗号分隔（默认 all）", "all")
  .action(async (options) => {
    try {
      let configPath: string | undefined;

      // 如果用户指定了配置文件路径，直接使用
      if (options.config) {
        configPath = resolve(options.config);
        logger.info(`使用指定的配置文件: ${configPath}`);
      } else {
        // 否则自动生成配置
        logger.info(`自动生成 ${options.env} 环境配置`);
        const configDir = options.configDir ? resolve(options.configDir) : undefined;

        await ConfigGenerator.generateFromFiles(options.env, configDir);
        // 生成后使用默认路径
        configPath = undefined;
      }

      const deployer = new Deployer(configPath);

      // 解析目标
      const targets = options.target.split(",").map((t: string) => t.trim().toLowerCase());

      const result = await deployer.restart(targets);

      if (result.success) {
        process.exit(0);
      } else {
        logger.error(result.message);
        process.exit(1);
      }
    } catch (error: any) {
      logger.error(`重启失败: ${error.message}`);
      if (error.stack) {
        logger.debug(error.stack);
      }
      process.exit(1);
    }
  });

program
  .command("update-public-urls")
  .description("更新 app.config.host.json 中的 publicUrl（当本机 IP 变化时使用）")
  .option("-c, --config <path>", "配置文件路径（如不指定则使用默认路径）")
  .action(async (options) => {
    try {
      logger.header("更新 publicUrl");

      const configPath = options.config ? resolve(options.config) : ConfigLoader.getDefaultConfigPath();

      // 加载配置
      const config = await ConfigLoader.loadConfig(configPath);

      // 验证是否是 local provider
      if (config.provider !== "local") {
        logger.error("update-public-urls 命令只适用于 local 环境");
        process.exit(1);
      }

      // 创建 EndpointManager 并更新 publicUrl
      const provider = new LocalProvider();
      const endpointManager = new EndpointManager(config, configPath, provider);

      await endpointManager.updatePublicUrls();

      logger.success("\npublicUrl 更新完成！\n");
      process.exit(0);
    } catch (error: any) {
      logger.error(`更新 publicUrl 失败: ${error.message}`);
      if (error.stack) {
        logger.debug(error.stack);
      }
      process.exit(1);
    }
  });

program.parse();
