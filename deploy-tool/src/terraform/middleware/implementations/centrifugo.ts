/**
 * Centrifugo Middleware 配置
 *
 * Centrifugo 是可扩展的实时消息服务器，支持：
 * - WebSocket 连接
 * - HTTP API
 * - Redis 引擎（用于多节点部署）
 * - 发布订阅模式
 *
 * 配置方式：
 * - 使用 ConfigMap 挂载配置文件
 * - 使用 initContainer 等待 Redis 就绪
 */
import { BaseMiddlewareConfig, MiddlewareEnvironment, ContainerSpec, ServiceSpec, ResourceRequirements, EnvVar } from "../base.js";

export class CentrifugoMiddlewareConfig extends BaseMiddlewareConfig {
  getImage(env: MiddlewareEnvironment): string {
    // 使用配置中的版本，如果没有则使用默认版本
    // 注意：版本号可能包含 'v' 前缀，保持原样
    const version = env.version || "v6.5.1";
    return `centrifugo/centrifugo:${version}`;
  }

  getContainerSpec(env: MiddlewareEnvironment): ContainerSpec {
    return {
      image: this.getImage(env),
      command: ["centrifugo"],
      args: ["--config=/etc/centrifugo/config.json"], // 使用 JSON 配置文件
      ports: [{ container_port: 8000, name: "http", protocol: "TCP" }],
      env: this.getEnvironmentVariables(env),
    };
  }

  /**
   * 获取 volume mounts
   * Centrifugo 需要挂载配置文件
   */
  getVolumeMounts(): Array<{ name: string; mount_path: string; read_only: boolean }> {
    return [
      {
        name: "config",
        mount_path: "/etc/centrifugo",
        read_only: true,
      },
    ];
  }

  /**
   * 生成 initContainer 配置
   * 等待 Redis 就绪后再启动 Centrifugo
   */
  getInitContainers(env: MiddlewareEnvironment): Array<{
    name: string;
    image: string;
    command: string[];
    args: string[];
    env: Array<{ name: string; value: string }>;
    volume_mounts: Array<{ name: string; mount_path: string }>;
  }> {
    // 从配置中提取 Redis 地址
    const redisAddress = env.config.redisAddress || "";
    const match = redisAddress.match(/redis:\/\/([^:]+):(\d+)/);

    if (!match) {
      // 如果没有配置 Redis 或者格式不对，不添加 initContainer
      return [];
    }

    const redisHost = match[1];
    const redisPort = match[2];

    // 从 config 读取 initImage，默认使用 busybox:1.36
    const initImage = env.config.initImage || "busybox:1.36";

    return [
      {
        name: "wait-for-redis",
        image: initImage,
        command: ["sh", "-c"],
        args: [`echo 'Waiting for Redis at ${redisHost}:${redisPort}...' && ` + `until nc -z ${redisHost} ${redisPort}; do echo 'Redis not ready, waiting...'; sleep 2; done && ` + `echo 'Redis is ready!'`],
        env: [],
        volume_mounts: [],
      },
    ];
  }

  getServiceSpec(env: MiddlewareEnvironment): ServiceSpec {
    return {
      ports: [{ name: "http", port: 8000, target_port: 8000, protocol: "TCP" }],
      type: this.getServiceType(env),
    };
  }

  getResources(): ResourceRequirements {
    return {
      limits: { cpu: "1000m", memory: "1Gi" },
      requests: { cpu: "100m", memory: "256Mi" },
    };
  }

  /**
   * 获取环境变量
   *
   * Centrifugo 主要通过环境变量配置
   * 注意：Centrifugo v6+ 使用更具体的环境变量命名
   */
  private getEnvironmentVariables(env: MiddlewareEnvironment): EnvVar[] {
    const envVars: EnvVar[] = [];

    // Token HMAC Secret Key（必需）
    if (env.config.tokenHmacSecretKey) {
      envVars.push({
        name: "CENTRIFUGO_CLIENT_TOKEN_HMAC_SECRET_KEY",
        value: env.config.tokenHmacSecretKey,
      });
    }

    // Redis 引擎配置
    if (env.config.engine === "redis") {
      envVars.push({
        name: "CENTRIFUGO_ENGINE_TYPE",
        value: "redis",
      });

      // Redis 地址
      if (env.config.redisAddress) {
        envVars.push({
          name: "CENTRIFUGO_ENGINE_REDIS_ADDRESS",
          value: env.config.redisAddress,
        });
      }

      // Redis 密码
      if (env.config.redisPassword) {
        envVars.push({
          name: "CENTRIFUGO_ENGINE_REDIS_PASSWORD",
          value: env.config.redisPassword,
        });
      }

      // Redis 数据库
      if (env.config.redisDb !== undefined) {
        envVars.push({
          name: "CENTRIFUGO_ENGINE_REDIS_DB",
          value: String(env.config.redisDb),
        });
      }
    }

    // 允许的来源（CORS）
    // 注意：Centrifugo 环境变量中的数组值使用空格分隔，不是逗号
    if (env.config.allowedOrigins && Array.isArray(env.config.allowedOrigins)) {
      envVars.push({
        name: "CENTRIFUGO_CLIENT_ALLOWED_ORIGINS",
        value: env.config.allowedOrigins.join(" "),
      });
    }

    // 启用 admin 页面（可选）
    if (env.config.admin !== undefined) {
      envVars.push({
        name: "CENTRIFUGO_ADMIN_ENABLED",
        value: String(env.config.admin),
      });
    }

    // Admin 密码（可选）
    if (env.config.adminPassword) {
      envVars.push({
        name: "CENTRIFUGO_ADMIN_PASSWORD",
        value: env.config.adminPassword,
      });
    }

    // Admin secret（可选）
    if (env.config.adminSecret) {
      envVars.push({
        name: "CENTRIFUGO_ADMIN_SECRET",
        value: env.config.adminSecret,
      });
    }

    // HTTP API Key（必需）
    if (env.config.apiKey) {
      envVars.push({
        name: "CENTRIFUGO_HTTP_API_KEY",
        value: env.config.apiKey,
      });
    }

    // Namespace 配置通过 YAML 配置文件加载

    return envVars;
  }

  /**
   * 生成 Centrifugo JSON 配置文件内容
   * 用于创建 ConfigMap
   *
   * Centrifugo v6 配置结构（根据官方文档）
   * 参考：https://centrifugal.dev/docs/server/channels#channel-namespaces
   *
   * 关键：namespaces 在 channel.namespaces 下，不是 client.namespaces！
   */
  getConfigFileContent(env: MiddlewareEnvironment): string | undefined {
    const config: any = {
      http_api: {
        key: env.config.apiKey || "",
      },
      client: {
        token: {
          hmac_secret_key: env.config.tokenHmacSecretKey || "",
        },
        allowed_origins: env.config.allowedOrigins || [],
      },
      channel: {
        namespaces: [], // ✅ 正确的位置：channel.namespaces
      },
    };

    // Namespaces 配置
    const namespaces = this.generateNamespaceConfig(env);
    if (namespaces.length > 0) {
      config.channel.namespaces = namespaces.map((ns) => ({
        name: ns.name,
        // 基本权限
        allow_subscribe_for_client: ns.subscribe || false,
        allow_publish_for_client: ns.publish || false,
        // 在线状态
        presence: ns.presence || false,
        allow_presence_for_client: ns.presence || false,
        allow_presence_for_subscriber: ns.presence || false,
        // 历史记录
        history_size: ns.history_size || 0,
        history_ttl: ns.history_lifetime ? `${ns.history_lifetime}s` : "0s",
        // 恢复功能
        allow_recovery: ns.history_recover || false,
        force_recovery: ns.history_recover || false,
      }));
    }

    // Admin configuration
    if (env.config.admin !== undefined) {
      config.admin = {
        enabled: env.config.admin,
      };

      if (env.config.adminPassword) {
        config.admin.password = env.config.adminPassword;
      }

      if (env.config.adminSecret) {
        config.admin.secret = env.config.adminSecret;
      }
    }

    return JSON.stringify(config, null, 2);
  }

  /**
   * 生成 Centrifugo Namespace 配置
   *
   * Namespace 是 Centrifugo 的核心概念，用于：
   * 1. 控制频道的访问权限（谁可以订阅、谁可以发布）
   * 2. 配置频道的行为（历史记录、在线状态、恢复功能）
   * 3. 隔离不同的频道组（如 chat-room:*, notification:*）
   *
   * 频道命名格式: <namespace>:<identifier>
   * 例如: chat-room:123 -> namespace 是 "chat-room"
   *
   * Centrifugo v6 字段说明：
   * - history_lifetime (秒): 历史消息保留时间（而非 history_ttl）
   * - history_size: 保留的历史消息数量
   * - history_recover: 支持断线重连恢复
   */
  private generateNamespaceConfig(env: MiddlewareEnvironment): any[] {
    const namespaces: any[] = [];

    // 从配置中获取 namespace 定义
    const configuredNamespaces = env.config.namespaces as any[] | undefined;

    if (configuredNamespaces && Array.isArray(configuredNamespaces)) {
      // 使用用户自定义的 namespace 配置，并转换字段名
      namespaces.push(
        ...configuredNamespaces.map((ns) => ({
          name: ns.name,
          publish: ns.publish,
          subscribe: ns.subscribe,
          presence: ns.presence,
          history_size: ns.history_size,
          // Centrifugo v6 使用 history_lifetime 而不是 history_ttl
          history_lifetime: ns.history_ttl || ns.history_lifetime,
          history_recover: ns.history_recover,
        })),
      );
    } else {
      // 默认配置：chat-room namespace
      namespaces.push({
        name: "chat-room",
        publish: true,
        subscribe: true,
        presence: true,
        history_size: env.config.historySize || 100,
        history_lifetime: env.config.historyLifetime || 300, // 使用秒数而非字符串
        history_recover: true,
      });
    }

    return namespaces;
  }

  /**
   * Centrifugo 使用 http:// 协议
   */
  getDefaultProtocol(): string {
    return "http";
  }
}
