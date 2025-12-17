import { spawn } from "child_process";
import { existsSync } from "fs";
import { resolve as pathResolve, dirname, join } from "path";
import { ConfigLoader } from "./config-loader.js";
import { FinalConfig } from "./types.js";
import { logger } from "./utils/logger.js";

export interface BuildOptions {
  /** 环境名称 */
  environment: string;
  /** 目标平台 (linux/amd64, linux/arm64 等) */
  platform?: string;
  /** 镜像标签 (默认 latest) */
  tag?: string;
  /** 是否推送镜像 */
  push?: boolean;
  /** 是否跳过构建直接推送（用于已构建的镜像） */
  pushOnly?: boolean;
  /** Dockerfile 路径 */
  dockerfile?: string;
  /** 构建上下文路径 */
  context?: string;
}

export interface BuildResult {
  success: boolean;
  message: string;
  images?: string[];
  details?: any;
}

/**
 * 镜像构建器
 * 负责构建和推送 Docker 镜像
 */
export class Builder {
  private configPath: string;
  private config!: FinalConfig;
  private projectRoot: string;

  constructor(configPath?: string) {
    this.configPath = configPath || ConfigLoader.getDefaultConfigPath();
    // 项目根目录是配置文件所在目录
    this.projectRoot = dirname(this.configPath);
  }

  /**
   * 构建并推送镜像
   */
  async build(options: BuildOptions): Promise<BuildResult> {
    try {
      logger.header(`构建镜像 - 环境: ${options.environment}`);

      // 加载配置
      this.config = await ConfigLoader.loadConfig(this.configPath);
      logger.step("读取配置文件");

      // 检查 Docker 是否可用
      const dockerAvailable = await this.checkDocker();
      if (!dockerAvailable) {
        return {
          success: false,
          message: "Docker 未运行或无法访问，请启动 Docker Desktop",
        };
      }
      logger.step("Docker 已就绪");

      // 获取镜像信息
      const imageInfo = this.getImageInfo(options);
      if (!imageInfo) {
        return {
          success: false,
          message: "无法从配置中获取镜像仓库信息，请检查 deploy.{env}.json 中的 imageRepository 配置",
        };
      }

      logger.info("");
      logger.info("📦 镜像配置:");
      logger.info(`   仓库: ${imageInfo.registry}`);
      logger.info(`   名称: ${imageInfo.name}`);
      logger.info(`   标签: ${imageInfo.tag}`);
      logger.info(`   完整地址: ${imageInfo.fullImage}`);
      if (options.platform) {
        logger.info(`   目标平台: ${options.platform}`);
      }
      logger.info("");

      const builtImages: string[] = [];

      // 构建镜像
      if (!options.pushOnly) {
        logger.stage(1, options.push ? 2 : 1, "构建 Docker 镜像");

        const buildResult = await this.buildImage(imageInfo, options);
        if (!buildResult.success) {
          return buildResult;
        }

        builtImages.push(imageInfo.fullImage);
        if (options.tag !== "latest") {
          builtImages.push(`${imageInfo.registry}/${imageInfo.name}:latest`);
        }

        logger.success("镜像构建成功");
      }

      // 推送镜像
      if (options.push || options.pushOnly) {
        logger.stage(options.pushOnly ? 1 : 2, options.pushOnly ? 1 : 2, "推送镜像到仓库");

        // 检查登录状态
        const loginOk = await this.checkRegistryLogin(imageInfo.registry);
        if (!loginOk) {
          logger.warn("未检测到仓库登录信息，尝试登录...");
          const loginResult = await this.dockerLogin(imageInfo.registry);
          if (!loginResult) {
            return {
              success: false,
              message: `登录镜像仓库 ${imageInfo.registry} 失败`,
            };
          }
        }

        // 推送镜像
        const pushResult = await this.pushImage(imageInfo, options);
        if (!pushResult.success) {
          return pushResult;
        }

        logger.success("镜像推送成功");
      }

      // 完成
      logger.info("");
      logger.success("✅ 镜像构建完成！");
      logger.info("");
      logger.info("📋 下一步:");
      logger.info(`   使用 'deploy-tool restart --env ${options.environment}' 触发滚动更新`);
      logger.info(`   或使用 'deploy-tool deploy --env ${options.environment} --force' 重新部署`);

      return {
        success: true,
        message: "镜像构建成功",
        images: builtImages,
      };
    } catch (error: any) {
      logger.error(`构建失败: ${error.message}`);
      return {
        success: false,
        message: `构建失败: ${error.message}`,
        details: { error: error.stack },
      };
    }
  }

  /**
   * 获取镜像信息
   */
  private getImageInfo(options: BuildOptions): { registry: string; name: string; tag: string; fullImage: string } | null {
    const providerName = this.config.provider || "local";
    const providerConfig = (this.config as any)[providerName];

    // 从 provider 配置中获取 imageRepository
    let imageRepository = providerConfig?.imageRepository;

    // 如果没有配置，尝试从组件的 image 字段解析
    if (!imageRepository) {
      const mainComponent = this.config.components.main;
      if (mainComponent?.image) {
        // 解析 image 地址，提取 registry 和 name
        // 格式: registry/namespace/name:tag
        const imageParts = mainComponent.image.split(":");
        const imageWithoutTag = imageParts[0];
        const parts = imageWithoutTag.split("/");
        if (parts.length >= 2) {
          // registry = 除最后一部分外的所有部分
          imageRepository = parts.slice(0, -1).join("/");
        }
      }
    }

    if (!imageRepository) {
      return null;
    }

    const tag = options.tag || "latest";
    const name = "main"; // 主应用镜像名称

    return {
      registry: imageRepository,
      name,
      tag,
      fullImage: `${imageRepository}/${name}:${tag}`,
    };
  }

  /**
   * 检查 Docker 是否可用
   */
  private async checkDocker(): Promise<boolean> {
    return new Promise((resolve) => {
      const cmd = spawn("docker", ["info"], { stdio: "pipe" });

      cmd.on("close", (code) => {
        resolve(code === 0);
      });

      cmd.on("error", () => {
        resolve(false);
      });
    });
  }

  /**
   * 检查镜像仓库登录状态
   */
  private async checkRegistryLogin(registry: string): Promise<boolean> {
    return new Promise((resolve) => {
      // 尝试通过 docker info 检查登录状态
      const cmd = spawn("docker", ["info"], { stdio: "pipe" });

      let output = "";
      cmd.stdout?.on("data", (data) => {
        output += data.toString();
      });

      cmd.on("close", () => {
        // 检查输出中是否包含 registry 相关的登录信息
        // 这不是100%准确，但可以作为基本检查
        resolve(output.includes("Username") || output.includes(registry));
      });

      cmd.on("error", () => {
        resolve(false);
      });
    });
  }

  /**
   * 登录 Docker 仓库
   */
  private async dockerLogin(registry: string): Promise<boolean> {
    return new Promise((resolve) => {
      logger.info(`请登录镜像仓库: ${registry}`);

      const cmd = spawn("docker", ["login", registry], {
        stdio: "inherit", // 继承 stdio 以便用户输入凭据
      });

      cmd.on("close", (code) => {
        resolve(code === 0);
      });

      cmd.on("error", () => {
        resolve(false);
      });
    });
  }

  /**
   * 构建镜像
   */
  private async buildImage(
    imageInfo: { registry: string; name: string; tag: string; fullImage: string },
    options: BuildOptions
  ): Promise<BuildResult> {
    const dockerfile = options.dockerfile || join(this.projectRoot, "Dockerfile");
    const context = options.context || this.projectRoot;

    // 检查 Dockerfile 是否存在
    if (!existsSync(dockerfile)) {
      return {
        success: false,
        message: `Dockerfile 不存在: ${dockerfile}`,
      };
    }

    return new Promise((promiseResolve) => {
      const args = ["build"];

      // 添加平台参数
      if (options.platform) {
        args.push("--platform", options.platform);
      }

      // 添加标签
      args.push("-t", imageInfo.fullImage);

      // 同时添加 latest 标签
      if (imageInfo.tag !== "latest") {
        args.push("-t", `${imageInfo.registry}/${imageInfo.name}:latest`);
      }

      // 添加 Dockerfile 路径
      args.push("-f", dockerfile);

      // 显示构建进度
      args.push("--progress=plain");

      // 添加构建上下文
      args.push(context);

      logger.info(`执行: docker ${args.join(" ")}`);
      logger.info("");

      const cmd = spawn("docker", args, {
        stdio: "inherit", // 显示构建输出
        cwd: this.projectRoot,
      });

      cmd.on("close", (code) => {
        if (code === 0) {
          promiseResolve({ success: true, message: "构建成功" });
        } else {
          promiseResolve({ success: false, message: `构建失败，退出码: ${code}` });
        }
      });

      cmd.on("error", (error) => {
        promiseResolve({ success: false, message: `构建失败: ${error.message}` });
      });
    });
  }

  /**
   * 推送镜像
   */
  private async pushImage(
    imageInfo: { registry: string; name: string; tag: string; fullImage: string },
    options: BuildOptions
  ): Promise<BuildResult> {
    // 推送指定标签
    logger.info(`推送镜像: ${imageInfo.fullImage}`);

    const pushResult = await this.dockerPush(imageInfo.fullImage);
    if (!pushResult) {
      return { success: false, message: `推送 ${imageInfo.fullImage} 失败` };
    }

    // 如果不是 latest，也推送 latest 标签
    if (imageInfo.tag !== "latest") {
      const latestImage = `${imageInfo.registry}/${imageInfo.name}:latest`;
      logger.info(`推送镜像: ${latestImage}`);

      const latestResult = await this.dockerPush(latestImage);
      if (!latestResult) {
        return { success: false, message: `推送 ${latestImage} 失败` };
      }
    }

    return { success: true, message: "推送成功" };
  }

  /**
   * 执行 docker push
   */
  private async dockerPush(image: string): Promise<boolean> {
    return new Promise((resolve) => {
      const cmd = spawn("docker", ["push", image], {
        stdio: "inherit",
      });

      cmd.on("close", (code) => {
        resolve(code === 0);
      });

      cmd.on("error", () => {
        resolve(false);
      });
    });
  }
}

