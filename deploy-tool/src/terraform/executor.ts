import { spawn } from "child_process";
import { existsSync } from "fs";
import { TerraformOutput, PlanResult, ApplyResult, DestroyResult } from "../types.js";
import { logger } from "../utils/logger.js";

/**
 * Terraform 执行器
 * 通过 child_process 调用 terraform CLI
 */
export class TerraformExecutor {
  private workDir: string;

  constructor(workDir: string) {
    this.workDir = workDir;
  }

  /**
   * 初始化 Terraform
   */
  async init(): Promise<void> {
    logger.progress("执行 terraform init");

    if (!existsSync(this.workDir)) {
      throw new Error(`工作目录不存在: ${this.workDir}`);
    }

    const result = await this.execTerraform(["init", "-input=false"]);

    if (result.exitCode !== 0) {
      logger.error("terraform init 失败");
      logger.error(result.stderr);
      throw new Error("terraform init failed");
    }

    logger.success("terraform init 完成");
  }

  /**
   * 生成执行计划
   */
  async plan(): Promise<PlanResult> {
    logger.progress("执行 terraform plan");

    if (!existsSync(this.workDir)) {
      throw new Error(`Terraform 工作目录不存在: ${this.workDir}`);
    }

    const result = await this.execTerraform(["plan", "-input=false", "-out=tfplan"]);

    if (result.exitCode !== 0) {
      logger.error("terraform plan 失败");
      logger.error(result.stderr);
      throw new Error("terraform plan failed");
    }

    // 解析变更数量（简化版，实际应该解析输出）
    const changes = this.parsePlanOutput(result.stdout);

    logger.success(`terraform plan 完成 (添加: ${changes.add}, 修改: ${changes.change}, 删除: ${changes.destroy})`);

    return {
      changes,
      output: result.stdout,
    };
  }

  /**
   * 应用变更
   */
  async apply(autoApprove: boolean = true): Promise<ApplyResult> {
    logger.progress("执行 terraform apply");

    if (!existsSync(this.workDir)) {
      throw new Error(`Terraform 工作目录不存在: ${this.workDir}`);
    }

    const args = ["apply", "-input=false"];
    if (autoApprove) {
      args.push("-auto-approve");
    }

    const result = await this.execTerraform(args);

    if (result.exitCode !== 0) {
      logger.error("terraform apply 失败");
      logger.error(result.stderr);
      return {
        success: false,
        output: result.stderr,
        resources: [],
      };
    }

    // 提取创建的资源（简化版）
    const resources = this.extractResources(result.stdout);

    logger.success("terraform apply 完成");

    return {
      success: true,
      output: result.stdout,
      resources,
    };
  }

  /**
   * 销毁资源
   */
  async destroy(autoApprove: boolean = true): Promise<DestroyResult> {
    logger.progress("执行 terraform destroy");

    // 检查工作目录是否存在
    if (!existsSync(this.workDir)) {
      const errorMsg = `Terraform 工作目录不存在: ${this.workDir}。请先执行部署或确保目录存在。`;
      logger.error(errorMsg);
      return {
        success: false,
        output: errorMsg,
      };
    }

    const args = ["destroy", "-input=false"];
    if (autoApprove) {
      args.push("-auto-approve");
    }

    const result = await this.execTerraform(args);

    if (result.exitCode !== 0) {
      logger.error("terraform destroy 失败");
      logger.error(result.stderr);
      return {
        success: false,
        output: result.stderr,
      };
    }

    logger.success("terraform destroy 完成");

    return {
      success: true,
      output: result.stdout,
    };
  }

  /**
   * 获取输出值
   */
  async output(key?: string): Promise<string> {
    if (!existsSync(this.workDir)) {
      throw new Error(`Terraform 工作目录不存在: ${this.workDir}`);
    }

    const args = ["output", "-json"];
    if (key) {
      args.push(key);
    }

    const result = await this.execTerraform(args);

    if (result.exitCode !== 0) {
      logger.error("terraform output 失败");
      logger.error(result.stderr);
      throw new Error("terraform output failed");
    }

    return result.stdout.trim();
  }

  /**
   * 获取所有 Terraform outputs
   * @returns 键值对对象，key 为 output 名称，value 为 output 值
   */
  async getOutputs(): Promise<Record<string, any>> {
    if (!existsSync(this.workDir)) {
      throw new Error(`Terraform 工作目录不存在: ${this.workDir}`);
    }

    const execResult = await this.execTerraform(["output", "-json"]);

    if (execResult.exitCode !== 0) {
      // 如果没有 output，返回空对象
      if (execResult.stderr.includes("no outputs")) {
        return {};
      }
      logger.error("terraform output 失败");
      logger.error(execResult.stderr);
      throw new Error("terraform output failed");
    }

    try {
      const outputs = JSON.parse(execResult.stdout);

      // Terraform output 格式: { "name": { "value": "...", "sensitive": false } }
      // 转换为简单的键值对
      const resultMap: Record<string, any> = {};
      for (const [key, value] of Object.entries(outputs)) {
        resultMap[key] = (value as any).value;
      }

      return resultMap;
    } catch (error: any) {
      logger.error(`解析 Terraform outputs 失败: ${error.message}`);
      return {};
    }
  }

  /**
   * 验证配置
   */
  async validate(): Promise<boolean> {
    logger.progress("执行 terraform validate");

    if (!existsSync(this.workDir)) {
      logger.error(`Terraform 工作目录不存在: ${this.workDir}`);
      return false;
    }

    const result = await this.execTerraform(["validate"]);

    if (result.exitCode !== 0) {
      logger.error("terraform validate 失败");
      logger.error(result.stderr);
      return false;
    }

    logger.success("terraform validate 通过");
    return true;
  }

  /**
   * 格式化配置文件
   */
  async fmt(): Promise<void> {
    logger.progress("执行 terraform fmt");

    const result = await this.execTerraform(["fmt", "-recursive"]);

    if (result.exitCode !== 0) {
      logger.warn("terraform fmt 有警告");
      logger.warn(result.stderr);
    } else {
      logger.success("terraform fmt 完成");
    }
  }

  /**
   * 执行 terraform 命令
   */
  private execTerraform(args: string[]): Promise<TerraformOutput> {
    return new Promise((resolve) => {
      logger.debug(`执行 terraform 命令: terraform ${args.join(" ")}`);
      logger.debug(`当前工作目录: ${this.workDir}`);

      const childProcess = spawn("terraform", args, {
        cwd: this.workDir,
        stdio: ["pipe", "pipe", "pipe"],
        env: process.env,
      });

      let stdout = "";
      let stderr = "";
      const isVerbose = process.env.VERBOSE === "true";

      childProcess.stdout?.on("data", (data) => {
        const text = data.toString();
        stdout += text;
        // 对于 apply，始终显示进度信息
        if (args[0] === "apply" || isVerbose) {
          // 实时显示创建/更新的资源
          const lines = text.split("\n");
          for (const line of lines) {
            if (line.includes("Creating...") || line.includes("Creation complete") || line.includes("Modifying...") || line.includes("Still creating...") || line.includes("Still modifying...")) {
              logger.info(`  ${line.trim()}`);
            }
          }
        }
      });

      childProcess.stderr?.on("data", (data) => {
        const text = data.toString();
        stderr += text;
        // 实时输出错误信息
        if (isVerbose) {
          console.error(text);
        }
      });

      childProcess.on("close", (code) => {
        logger.debug(`terraform 命令完成，退出码: ${code}`);
        resolve({
          stdout,
          stderr,
          exitCode: code || 0,
        });
      });

      childProcess.on("error", (error) => {
        logger.error(`执行 terraform 命令失败: ${error.message}`);
        resolve({
          stdout,
          stderr: error.message,
          exitCode: 1,
        });
      });
    });
  }

  /**
   * 解析 plan 输出
   * 简化版实现，提取变更数量
   */
  private parsePlanOutput(output: string): { add: number; change: number; destroy: number } {
    // 移除 ANSI 颜色代码
    const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, "");

    // 匹配 "Plan: X to add, Y to change, Z to destroy"
    const match = cleanOutput.match(/Plan: (\d+) to add, (\d+) to change, (\d+) to destroy/);

    if (match) {
      return {
        add: parseInt(match[1], 10),
        change: parseInt(match[2], 10),
        destroy: parseInt(match[3], 10),
      };
    }

    // 如果没有变更
    if (cleanOutput.includes("No changes")) {
      return { add: 0, change: 0, destroy: 0 };
    }

    // 默认返回
    return { add: 0, change: 0, destroy: 0 };
  }

  /**
   * 提取创建的资源
   * 简化版实现
   */
  private extractResources(output: string): string[] {
    const resources: string[] = [];

    // 匹配 "module.xxx.kubernetes_xxx.this: Creating..."
    // 或 "module.xxx.kubernetes_xxx.this: Creation complete"
    const regex = /module\.([^:]+):\s+(Creating|Creation complete)/g;
    let match;

    while ((match = regex.exec(output)) !== null) {
      if (!resources.includes(match[1])) {
        resources.push(match[1]);
      }
    }

    return resources;
  }

  /**
   * 检查 terraform 是否已安装
   */
  static async checkTerraformInstalled(): Promise<boolean> {
    try {
      const childProcess = spawn("terraform", ["version"], {
        stdio: ["pipe", "pipe", "pipe"],
        env: process.env,
      });

      return new Promise((resolve) => {
        childProcess.on("close", (code) => {
          resolve(code === 0);
        });

        childProcess.on("error", () => {
          resolve(false);
        });
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取 terraform 版本
   */
  static async getTerraformVersion(): Promise<string> {
    try {
      const childProcess = spawn("terraform", ["version"], {
        stdio: ["pipe", "pipe", "pipe"],
        env: process.env,
      });

      return new Promise((resolve, reject) => {
        let output = "";

        childProcess.stdout?.on("data", (data) => {
          output += data.toString();
        });

        childProcess.on("close", (code) => {
          if (code === 0) {
            // 提取版本号 "Terraform vX.Y.Z"
            const match = output.match(/Terraform v([\d.]+)/);
            resolve(match ? match[1] : output.trim());
          } else {
            reject(new Error("Failed to get terraform version"));
          }
        });

        childProcess.on("error", (error) => {
          reject(error);
        });
      });
    } catch (error: any) {
      throw new Error(`Failed to get terraform version: ${error.message}`);
    }
  }
}
