/**
 * MinIO Middleware 配置
 *
 * MinIO 是 S3 兼容的对象存储服务
 * 提供 API 端口(9000)和管理控制台端口(9001)
 */
import { BaseMiddlewareConfig, MiddlewareEnvironment, ContainerSpec, ServiceSpec, ResourceRequirements, EnvVar } from "../base.js";

export class MinIOMiddlewareConfig extends BaseMiddlewareConfig {
  getImage(env: MiddlewareEnvironment): string {
    // 使用配置中的版本，如果没有则使用 latest
    const version = env.version || "latest";
    return `minio/minio:${version}`;
  }

  getContainerSpec(env: MiddlewareEnvironment): ContainerSpec {
    return {
      image: this.getImage(env),
      command: [],
      args: ["server", "/data", "--console-address", ":9001"],
      ports: [
        { container_port: 9000, name: "api", protocol: "TCP" },
        { container_port: 9001, name: "console", protocol: "TCP" },
      ],
      env: this.getEnvironmentVariables(env),
    };
  }

  getServiceSpec(env: MiddlewareEnvironment): ServiceSpec {
    return {
      ports: [
        { name: "api", port: 9000, target_port: 9000, protocol: "TCP" },
        { name: "console", port: 9001, target_port: 9001, protocol: "TCP" },
      ],
      type: this.getServiceType(env),
    };
  }

  getResources(): ResourceRequirements {
    return {
      limits: { cpu: "1000m", memory: "2Gi" },
      requests: { cpu: "100m", memory: "512Mi" },
    };
  }

  /**
   * MinIO 使用 http:// 协议
   */
  getDefaultProtocol(): string {
    return "http";
  }

  /**
   * 获取环境变量
   */
  private getEnvironmentVariables(env: MiddlewareEnvironment): EnvVar[] {
    return [
      { name: "MINIO_ROOT_USER", value: env.config.accessKeyId || "minioadmin" },
      { name: "MINIO_ROOT_PASSWORD", value: env.config.secretAccessKey || "minioadmin" },
    ];
  }
}
