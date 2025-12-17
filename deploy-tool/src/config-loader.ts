import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { resolve } from "path";
import { FinalConfig } from "./types.js";
import { logger } from "./utils/logger.js";

/**
 * 配置加载器
 * 负责加载和解析 app.config.json
 */
export class ConfigLoader {
  /**
   * 从文件加载配置
   */
  static async loadConfig(configPath: string): Promise<FinalConfig> {
    const absolutePath = resolve(configPath);

    logger.info(`加载配置文件: ${absolutePath}`);

    if (!existsSync(absolutePath)) {
      throw new Error(`配置文件不存在: ${absolutePath}`);
    }

    try {
      const content = await readFile(absolutePath, "utf-8");
      const config = JSON.parse(content) as FinalConfig;

      logger.success("配置文件加载成功");

      return config;
    } catch (error: any) {
      logger.error(`加载配置文件失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 验证配置格式的基本完整性
   */
  static validateConfigStructure(config: any): config is FinalConfig {
    if (!config || typeof config !== "object") {
      return false;
    }

    const required = ["version", "environment", "components"];
    for (const field of required) {
      if (!(field in config)) {
        logger.error(`配置缺少必填字段: ${field}`);
        return false;
      }
    }

    if (typeof config.components !== "object" || config.components === null) {
      logger.error("components 字段格式不正确");
      return false;
    }

    return true;
  }

  /**
   * 获取配置文件的默认路径
   * 默认在父目录查找（因为 deploy-tool 是子目录）
   */
  static getDefaultConfigPath(): string {
    // 如果当前目录有 app.config.json，使用当前目录
    const localPath = resolve(process.cwd(), "app.config.json");

    if (existsSync(localPath)) {
      return localPath;
    }

    // 否则在父目录查找（deploy-tool 作为子项目时）
    const parentPath = resolve(process.cwd(), "..", "app.config.json");

    if (existsSync(parentPath)) {
      return parentPath;
    }

    // 默认返回当前目录
    return localPath;
  }
}
