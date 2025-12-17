import chalk from "chalk";
import { LogLevel } from "../types.js";

/**
 * 日志工具类
 * 提供带颜色的日志输出
 */
export class Logger {
  private prefix: string;

  constructor(prefix: string = "DeployTool") {
    this.prefix = prefix;
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${this.prefix}] [${level.toUpperCase()}] ${message}`;
  }

  debug(message: string): void {
    console.log(chalk.gray(this.formatMessage(LogLevel.DEBUG, message)));
  }

  info(message: string): void {
    console.log(chalk.blue(this.formatMessage(LogLevel.INFO, message)));
  }

  warn(message: string): void {
    console.log(chalk.yellow(this.formatMessage(LogLevel.WARN, message)));
  }

  error(message: string): void {
    console.error(chalk.red(this.formatMessage(LogLevel.ERROR, message)));
  }

  success(message: string): void {
    console.log(chalk.green(this.formatMessage(LogLevel.SUCCESS, message)));
  }

  // 特殊格式的日志

  stage(stageNumber: number, totalStages: number, description: string): void {
    console.log();
    console.log(chalk.bold.cyan(`📋 阶段 ${stageNumber}/${totalStages}: ${description}`));
  }

  step(message: string, success: boolean = true): void {
    const icon = success ? "✓" : "✗";
    const color = success ? chalk.green : chalk.red;
    console.log(color(`  ${icon} ${message}`));
  }

  progress(message: string): void {
    console.log(chalk.blue(`  ⚙ ${message}`));
  }

  waiting(message: string): void {
    console.log(chalk.yellow(`  ⏳ ${message}`));
  }

  skip(message: string): void {
    console.log(chalk.gray(`  ⊙ ${message}`));
  }

  divider(): void {
    console.log(chalk.gray("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
  }

  header(title: string): void {
    console.log();
    this.divider();
    console.log(chalk.bold.cyan(`🚀 ${title}`));
    this.divider();
  }

  summary(title: string, items: Record<string, any>): void {
    console.log();
    this.divider();
    console.log(chalk.bold.green(`✨ ${title}`));
    console.log();
    console.log(chalk.bold("📊 部署摘要:"));
    for (const [key, value] of Object.entries(items)) {
      console.log(`  ${key}: ${value}`);
    }
  }

  table(headers: string[], rows: string[][]): void {
    // 简单的表格输出
    console.log();
    console.log(chalk.bold(headers.join(" | ")));
    console.log(headers.map((h) => "-".repeat(h.length)).join("-+-"));
    rows.forEach((row) => {
      console.log(row.join(" | "));
    });
  }
}

// 默认导出单例
export const logger = new Logger();
