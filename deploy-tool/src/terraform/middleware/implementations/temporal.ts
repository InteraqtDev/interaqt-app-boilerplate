/**
 * Temporal Middleware 配置
 *
 * Temporal 是持久化执行平台，用于：
 * - 长耗时异步任务（图像/视频生成、文件处理）
 * - 多步骤工作流（订单处理、审批流程）
 * - 分布式事务协调（Saga 模式）
 * - 定时/周期任务
 *
 * 使用 auto-setup 镜像实现一体部署模式：
 * - 内置 SQLite 存储（开发环境）
 * - 可配置使用 PostgreSQL（生产环境）
 * - 包含所有 Temporal Server 组件
 * - 使用 sidecar 容器运行 Web UI
 *
 * ⚠️ 重要限制：replicas 应该保持为 1
 * 原因：
 * 1. auto-setup 镜像在启动时会进行数据库 schema 初始化
 *    多个实例同时启动可能导致竞争条件
 * 2. Temporal Server 多实例需要特殊的集群配置（如 membership gossip）
 *    auto-setup 镜像不支持这种配置
 *
 * 如果需要高可用：
 * - 使用官方 Helm Chart 部署 Temporal 集群
 * - 或者配置 deploymentType: "cloud" 使用托管服务
 */
import { BaseMiddlewareConfig, MiddlewareEnvironment, ContainerSpec, ServiceSpec, ResourceRequirements, EnvVar, EndpointSpec, SidecarContainerSpec, DeploymentMode, DistributedServiceSpec } from "../base.js";

export class TemporalMiddlewareConfig extends BaseMiddlewareConfig {
  getImage(env: MiddlewareEnvironment): string {
    // 使用配置中的版本，如果没有则使用默认版本
    // auto-setup 镜像包含所有 Temporal Server 组件，适合一体部署
    const version = env.version || "1.24.1";
    return `temporalio/auto-setup:${version}`;
  }

  getContainerSpec(env: MiddlewareEnvironment): ContainerSpec {
    return {
      image: this.getImage(env),
      command: [],
      args: [],
      ports: [{ container_port: 7233, name: "grpc", protocol: "TCP" }],
      env: this.getEnvironmentVariables(env),
    };
  }

  /**
   * 返回 sidecar 容器配置
   * Temporal Web UI 需要独立的容器运行
   *
   * 注意：UI 连接到 Temporal Service 而不是 localhost，这样即使 replicas > 1 也能正常工作
   * 但是 Temporal Server 本身使用 auto-setup 镜像时，replicas 应该保持为 1
   * 因为 auto-setup 会进行数据库 schema 初始化，多实例同时启动可能导致竞争条件
   */
  getSidecarContainers(env: MiddlewareEnvironment): SidecarContainerSpec[] {
    // UI 镜像配置：
    // - 如果配置了 uiImage，直接使用完整镜像地址
    // - 否则使用默认镜像 temporalio/ui:{uiVersion}
    const uiVersion = env.config.uiVersion || "2.26.2";
    const uiImage = env.config.uiImage || `temporalio/ui:${uiVersion}`;

    // 构建 Temporal Server 的 Service 地址
    // 格式: {serviceName}-svc.{namespace}.svc.cluster.local:7233
    const serviceName = env.middlewareName.toLowerCase();
    const temporalServiceAddress = `${serviceName}-svc.${env.namespace}.svc.cluster.local:7233`;

    return [
      {
        name: "temporal-ui",
        image: uiImage,
        command: [],
        args: [],
        ports: [{ container_port: 8080, name: "web", protocol: "TCP" }],
        env: [
          {
            // 连接到 Temporal Service 而不是 localhost
            // 这样即使通过负载均衡访问 UI，UI 也能访问到所有 Temporal Server 实例
            name: "TEMPORAL_ADDRESS",
            value: temporalServiceAddress,
          },
          {
            name: "TEMPORAL_CORS_ORIGINS",
            value: "http://localhost:3000,http://localhost:5173",
          },
        ],
        resources: {
          limits: { cpu: "500m", memory: "512Mi" },
          requests: { cpu: "50m", memory: "64Mi" },
        },
      },
    ];
  }

  getServiceSpec(env: MiddlewareEnvironment): ServiceSpec {
    return {
      ports: [
        { name: "grpc", port: 7233, target_port: 7233, protocol: "TCP" },
        { name: "web", port: 8080, target_port: 8080, protocol: "TCP" },
      ],
      type: this.getServiceType(env),
    };
  }

  getResources(): ResourceRequirements {
    return {
      limits: { cpu: "2000m", memory: "2Gi" },
      requests: { cpu: "200m", memory: "512Mi" },
    };
  }

  /**
   * 生成 initContainer 配置
   * 等待 PostgreSQL 就绪后再启动 Temporal
   */
  getInitContainers(env: MiddlewareEnvironment): Array<{
    name: string;
    image: string;
    command: string[];
    args: string[];
    env: Array<{ name: string; value: string }>;
    volume_mounts: Array<{ name: string; mount_path: string }>;
  }> {
    // 从配置中提取 PostgreSQL 地址
    const postgresSeeds = env.config.postgresSeeds || "";
    const { host, port } = this.parseEndpoint(postgresSeeds);

    if (!host) {
      // 如果没有配置 PostgreSQL，不添加 initContainer
      return [];
    }

    // 从 config 读取 initImage，默认使用 busybox:1.36
    const initImage = env.config.initImage || "busybox:1.36";

    return [
      {
        name: "wait-for-postgres",
        image: initImage,
        command: ["sh", "-c"],
        args: [`echo 'Waiting for PostgreSQL at ${host}:${port}...' && ` + `until nc -z ${host} ${port}; do echo 'PostgreSQL not ready, waiting...'; sleep 2; done && ` + `echo 'PostgreSQL is ready!'`],
        env: [],
        volume_mounts: [],
      },
    ];
  }

  /**
   * Temporal 使用 gRPC 协议
   * Client 通过 host:7233 连接
   */
  getDefaultProtocol(): string {
    return "http"; // 实际是 gRPC，但 endpoint 格式使用 http://host:port
  }

  /**
   * 返回 gRPC 端口作为默认端口
   */
  getDefaultPort(): number {
    return 7233;
  }

  /**
   * Temporal 暴露两个 endpoint：
   * - main: gRPC 服务（7233）
   * - admin: Web UI（8080）
   * @param env 部署环境上下文
   */
  getEndpointDefinitions(env: MiddlewareEnvironment): EndpointSpec[] {
    // publicAccess 配置 - 支持两种格式：
    // 1. config.publicAccess: boolean | { main: boolean, admin: boolean }
    // 2. endpoints.main.publicAccess / endpoints.admin.publicAccess (优先)
    const publicAccessConfig = env.config.publicAccess;
    const endpointsConfig = env.config.endpoints as Record<string, { publicAccess?: boolean }> | undefined;

    const mainPublicAccess = endpointsConfig?.main?.publicAccess ?? (typeof publicAccessConfig === "boolean" ? publicAccessConfig : (publicAccessConfig?.main ?? false));
    const adminPublicAccess = endpointsConfig?.admin?.publicAccess ?? (typeof publicAccessConfig === "boolean" ? publicAccessConfig : (publicAccessConfig?.admin ?? false));

    // distributed 模式下，main 指向 frontend service，admin 指向 admintools service
    const isDistributed = this.isDistributedMode(env);
    const baseName = env.middlewareName?.toLowerCase() || "temporal";

    return [
      {
        name: "main",
        port: 7233,
        protocol: "", // Temporal SDK 期望 hostname:port 格式，不需要协议前缀
        publicAccess: mainPublicAccess,
        description: "gRPC service endpoint for Temporal SDK",
        // distributed 模式下指向 frontend service
        serviceName: isDistributed ? `${baseName}-frontend` : undefined,
      },
      {
        name: "admin",
        port: 8080,
        protocol: "http",
        publicAccess: adminPublicAccess,
        description: "Temporal Web UI",
        // distributed 模式下指向 admintools service
        serviceName: isDistributed ? `${baseName}-admintools` : undefined,
      },
    ];
  }

  /**
   * 从 endpoint URL 中解析主机名和端口
   * 例如：postgresql://host:5432 -> { host: "host", port: "5432" }
   * 例如：host.svc.cluster.local:5432 -> { host: "host.svc.cluster.local", port: "5432" }
   */
  private parseEndpoint(endpoint: string): { host: string; port: string } {
    // 移除协议前缀
    let cleaned = endpoint.replace(/^[a-z]+:\/\//i, "");

    // 解析主机和端口
    const parts = cleaned.split(":");
    return {
      host: parts[0] || "",
      port: parts[1] || "5432",
    };
  }

  /**
   * 获取环境变量
   *
   * Temporal auto-setup 镜像支持的环境变量：
   * - DB: 数据库类型 (postgresql, mysql, cassandra)
   * - DB_PORT: 数据库端口
   * - POSTGRES_SEEDS/MYSQL_SEEDS: 数据库主机名（不含端口）
   * - POSTGRES_USER/MYSQL_USER: 数据库用户名
   * - POSTGRES_PWD/MYSQL_PWD: 数据库密码
   * - DYNAMIC_CONFIG_FILE_PATH: 动态配置文件路径
   * - TEMPORAL_CLI_ADDRESS: CLI 连接地址
   * - BIND_ON_IP: 绑定的 IP 地址（设置为 0.0.0.0 允许 port-forward 连接）
   * - TEMPORAL_BROADCAST_ADDRESS: 广播地址（使用 BIND_ON_IP=0.0.0.0 时必须设置）
   */
  private getEnvironmentVariables(env: MiddlewareEnvironment): EnvVar[] {
    const envVars: EnvVar[] = [];

    // 绑定到所有接口，以支持 kubectl port-forward
    // 注意：当 BIND_ON_IP=0.0.0.0 时，必须设置 TEMPORAL_BROADCAST_ADDRESS
    envVars.push({
      name: "BIND_ON_IP",
      value: "0.0.0.0",
    });

    // 设置广播地址为 localhost（单节点部署模式）
    envVars.push({
      name: "TEMPORAL_BROADCAST_ADDRESS",
      value: "127.0.0.1",
    });

    // 数据库配置 - auto-setup 支持的驱动: mysql8, postgres12, postgres12_pgx, cassandra
    // 注意：使用 postgres12 而不是 postgresql
    let dbType = env.config.db || "postgres12";
    if (dbType === "postgres" || dbType === "postgresql") {
      dbType = "postgres12"; // 兼容配置中使用 postgres/postgresql 的情况
    }
    envVars.push({
      name: "DB",
      value: dbType,
    });

    // 如果使用 PostgreSQL
    if (dbType === "postgres12" || dbType === "postgres12_pgx") {
      // 解析 postgresSeeds（可能是完整的 endpoint URL）
      if (env.config.postgresSeeds) {
        const { host, port } = this.parseEndpoint(env.config.postgresSeeds);
        envVars.push({
          name: "POSTGRES_SEEDS",
          value: host,
        });
        // 使用解析出的端口，或使用配置的端口
        envVars.push({
          name: "DB_PORT",
          value: env.config.postgresPort || port || "5432",
        });
      } else if (env.config.postgresPort) {
        envVars.push({
          name: "DB_PORT",
          value: String(env.config.postgresPort),
        });
      }

      if (env.config.postgresUser) {
        envVars.push({
          name: "POSTGRES_USER",
          value: env.config.postgresUser,
        });
      }
      if (env.config.postgresPwd) {
        envVars.push({
          name: "POSTGRES_PWD",
          value: env.config.postgresPwd,
        });
      }

      // 显式设置数据库创建和 schema 设置选项
      envVars.push({
        name: "SKIP_DB_CREATE",
        value: "false",
      });
      envVars.push({
        name: "SKIP_SCHEMA_SETUP",
        value: "false",
      });
    }

    // 日志级别配置
    if (env.config.logLevel) {
      envVars.push({
        name: "LOG_LEVEL",
        value: env.config.logLevel,
      });
    }

    // 默认命名空间配置
    if (env.config.defaultNamespace) {
      envVars.push({
        name: "DEFAULT_NAMESPACE",
        value: env.config.defaultNamespace,
      });
    }

    // 跳过默认命名空间创建
    if (env.config.skipDefaultNamespaceCreation !== undefined) {
      envVars.push({
        name: "SKIP_DEFAULT_NAMESPACE_CREATION",
        value: String(env.config.skipDefaultNamespaceCreation),
      });
    }

    // 启用 Elasticsearch（用于高级搜索）
    if (env.config.enableEs) {
      envVars.push({
        name: "ENABLE_ES",
        value: "true",
      });
      if (env.config.esSeeds) {
        envVars.push({
          name: "ES_SEEDS",
          value: env.config.esSeeds,
        });
      }
      if (env.config.esPort) {
        envVars.push({
          name: "ES_PORT",
          value: String(env.config.esPort),
        });
      }
    }

    return envVars;
  }

  // ========== Distributed Mode Support ==========

  /**
   * Temporal 支持 standalone 和 distributed 两种部署模式
   */
  getSupportedModes(): DeploymentMode[] {
    return ["standalone", "distributed"];
  }

  /**
   * 获取分布式模式下的服务列表
   *
   * Temporal 分布式架构包含 4 个核心服务：
   * - frontend: 接收客户端请求，提供 gRPC API
   * - history: 管理工作流执行历史，处理状态持久化
   * - matching: 任务队列管理，将任务分配给 worker
   * - worker: 内部工作流（系统级任务，非用户 worker）
   *
   * 重要配置：
   * - NUM_HISTORY_SHARDS: 历史分片数，一旦设置不可更改
   *   - 决定了集群的最大扩展能力
   *   - 推荐值：开发 4，生产 512-1024
   */
  getDistributedServices(env: MiddlewareEnvironment): DistributedServiceSpec[] {
    const mode = this.getDeploymentMode(env);
    if (mode !== "distributed") {
      return [];
    }

    // 版本配置
    const version = env.version || "1.24.1";
    const baseImage = env.config.image || `temporalio/server:${version}`;
    const adminToolsImage = env.config.adminToolsImage || `temporalio/admin-tools:${version}`;

    // 数据库配置
    const dbType = this.normalizeDbType(env.config.db || "postgres12");
    const { host: dbHost, port: dbPort } = this.parseEndpoint(env.config.postgresSeeds || "");

    // 分片配置（重要：一旦设置不可更改）
    const numHistoryShards = env.config.numHistoryShards || 4;

    // 副本数配置
    const replicas = {
      frontend: env.config.frontendReplicas || 1,
      history: env.config.historyReplicas || 1,
      matching: env.config.matchingReplicas || 1,
      worker: env.config.workerReplicas || 1,
    };

    // 服务地址
    const namespace = env.namespace;
    const baseName = env.middlewareName.toLowerCase();

    // 公共环境变量
    const commonEnv: EnvVar[] = [
      { name: "DB", value: dbType },
      { name: "DB_PORT", value: dbPort || "5432" },
      { name: "POSTGRES_SEEDS", value: dbHost },
      { name: "POSTGRES_USER", value: env.config.postgresUser || "temporal" },
      { name: "POSTGRES_PWD", value: env.config.postgresPwd || "" },
      { name: "NUM_HISTORY_SHARDS", value: String(numHistoryShards) },
      { name: "BIND_ON_IP", value: "0.0.0.0" },
      { name: "LOG_LEVEL", value: env.config.logLevel || "info" },
    ];

    // Frontend 服务地址（其他服务需要连接）
    const frontendAddress = `${baseName}-frontend-svc.${namespace}.svc.cluster.local:7233`;

    // Init container 镜像
    // distributed 模式下，用户应配置 initImage 为 auto-setup 镜像以支持 schema 初始化
    const initImage = env.config.initImage || "busybox:1.36";

    // 数据库连接信息
    const dbUser = env.config.postgresUser || "temporal";
    const dbPwd = env.config.postgresPwd || "";

    // 等待数据库就绪 + schema 初始化（仅 frontend 需要）
    // 使用 temporal-sql-tool 初始化 temporal 和 temporal_visibility 两个数据库
    const waitForDbAndInitSchema = dbHost
      ? [
          {
            name: "wait-for-db-and-init-schema",
            image: initImage,
            command: ["sh", "-c"],
            args: [
              // 等待数据库就绪
              `until nc -z ${dbHost} ${dbPort || 5432}; do echo 'Waiting for DB...'; sleep 2; done && ` +
                // 创建并初始化 temporal 数据库
                `echo "Initializing Temporal schema..." && ` +
                `temporal-sql-tool --plugin ${dbType} --ep ${dbHost} -p ${dbPort || 5432} -u ${dbUser} --pw "${dbPwd}" --db temporal create || echo "Database temporal may already exist" && ` +
                `temporal-sql-tool --plugin ${dbType} --ep ${dbHost} -p ${dbPort || 5432} -u ${dbUser} --pw "${dbPwd}" --db temporal setup-schema -v 0.0 || echo "Schema may already be set up" && ` +
                `temporal-sql-tool --plugin ${dbType} --ep ${dbHost} -p ${dbPort || 5432} -u ${dbUser} --pw "${dbPwd}" --db temporal update-schema -d /etc/temporal/schema/postgresql/v12/temporal/versioned && ` +
                // 创建并初始化 temporal_visibility 数据库
                `temporal-sql-tool --plugin ${dbType} --ep ${dbHost} -p ${dbPort || 5432} -u ${dbUser} --pw "${dbPwd}" --db temporal_visibility create || echo "Database temporal_visibility may already exist" && ` +
                `temporal-sql-tool --plugin ${dbType} --ep ${dbHost} -p ${dbPort || 5432} -u ${dbUser} --pw "${dbPwd}" --db temporal_visibility setup-schema -v 0.0 || echo "Schema may already be set up" && ` +
                `temporal-sql-tool --plugin ${dbType} --ep ${dbHost} -p ${dbPort || 5432} -u ${dbUser} --pw "${dbPwd}" --db temporal_visibility update-schema -d /etc/temporal/schema/postgresql/v12/visibility/versioned && ` +
                `echo "Temporal schema initialization complete"`,
            ],
            env: [],
            volume_mounts: [],
          },
        ]
      : [];

    // 等待数据库就绪（其他服务使用，不含 schema 初始化）
    const waitForDbInit = dbHost
      ? [
          {
            name: "wait-for-db",
            image: initImage,
            command: ["sh", "-c"],
            args: [`until nc -z ${dbHost} ${dbPort || 5432}; do echo 'Waiting for DB...'; sleep 2; done`],
            env: [],
            volume_mounts: [],
          },
        ]
      : [];

    // 等待 Frontend 就绪并创建 default namespace 的 init container
    const frontendHost = `${baseName}-frontend-svc.${namespace}.svc.cluster.local`;
    const waitForFrontendInit = [
      {
        name: "wait-for-frontend-and-setup-namespace",
        image: initImage,
        command: ["sh", "-c"],
        args: [`echo "Waiting for Temporal frontend..." && ` + `until nc -z ${frontendHost} 7233; do echo 'Waiting for frontend...'; sleep 2; done && ` + `echo "Frontend is available, waiting for Temporal to be ready..." && ` + `export TEMPORAL_ADDRESS=${frontendHost}:7233 && ` + `sleep 5 && ` + `echo "Creating default namespace..." && ` + `temporal operator namespace create --retention 72h --description "Default namespace" default || echo "Namespace default may already exist" && ` + `echo "Namespace setup complete"`],
        env: [],
        volume_mounts: [],
      },
    ];

    // publicAccess 配置 - 支持两种格式：
    // 1. config.publicAccess: boolean | { main: boolean, admin: boolean }
    // 2. endpoints.main.publicAccess / endpoints.admin.publicAccess (优先)
    const publicAccessConfig = env.config.publicAccess;
    const endpointsConfig = env.config.endpoints as Record<string, { publicAccess?: boolean }> | undefined;

    const frontendPublicAccess = endpointsConfig?.main?.publicAccess ?? (typeof publicAccessConfig === "boolean" ? publicAccessConfig : (publicAccessConfig?.main ?? false));
    const adminPublicAccess = endpointsConfig?.admin?.publicAccess ?? (typeof publicAccessConfig === "boolean" ? publicAccessConfig : (publicAccessConfig?.admin ?? false));

    const services: DistributedServiceSpec[] = [
      // 1. Frontend Service - 接收客户端请求
      {
        name: "frontend",
        replicas: replicas.frontend,
        image: baseImage,
        command: [],
        args: ["start", "--service=frontend"],
        ports: [
          { container_port: 7233, name: "grpc", protocol: "TCP" as const },
          { container_port: 6933, name: "membership", protocol: "TCP" as const },
        ],
        env: [...commonEnv, { name: "SERVICES", value: "frontend" }, { name: "FRONTEND_GRPC_PORT", value: "7233" }, { name: "FRONTEND_MEMBERSHIP_PORT", value: "6933" }],
        resources: {
          limits: { cpu: "1000m", memory: "1Gi" },
          requests: { cpu: "100m", memory: "256Mi" },
        },
        servicePorts: [{ name: "grpc", port: 7233, target_port: 7233, protocol: "TCP" }],
        serviceType: frontendPublicAccess ? "LoadBalancer" : "ClusterIP",
        waitForLoadBalancer: frontendPublicAccess && env.provider !== "local",
        initContainers: waitForDbAndInitSchema,
      },

      // 2. History Service - 管理工作流执行历史
      {
        name: "history",
        replicas: replicas.history,
        image: baseImage,
        command: [],
        args: ["start", "--service=history"],
        ports: [
          { container_port: 7234, name: "grpc", protocol: "TCP" as const },
          { container_port: 6934, name: "membership", protocol: "TCP" as const },
        ],
        env: [...commonEnv, { name: "SERVICES", value: "history" }, { name: "HISTORY_GRPC_PORT", value: "7234" }, { name: "HISTORY_MEMBERSHIP_PORT", value: "6934" }, { name: "PUBLIC_FRONTEND_ADDRESS", value: frontendAddress }],
        resources: {
          limits: { cpu: "1000m", memory: "1Gi" },
          requests: { cpu: "100m", memory: "256Mi" },
        },
        servicePorts: [{ name: "grpc", port: 7234, target_port: 7234, protocol: "TCP" }],
        serviceType: "ClusterIP",
        dependsOn: ["frontend"],
        initContainers: [...waitForDbInit, ...waitForFrontendInit],
      },

      // 3. Matching Service - 任务队列管理
      {
        name: "matching",
        replicas: replicas.matching,
        image: baseImage,
        command: [],
        args: ["start", "--service=matching"],
        ports: [
          { container_port: 7235, name: "grpc", protocol: "TCP" as const },
          { container_port: 6935, name: "membership", protocol: "TCP" as const },
        ],
        env: [...commonEnv, { name: "SERVICES", value: "matching" }, { name: "MATCHING_GRPC_PORT", value: "7235" }, { name: "MATCHING_MEMBERSHIP_PORT", value: "6935" }, { name: "PUBLIC_FRONTEND_ADDRESS", value: frontendAddress }],
        resources: {
          limits: { cpu: "1000m", memory: "1Gi" },
          requests: { cpu: "100m", memory: "256Mi" },
        },
        servicePorts: [{ name: "grpc", port: 7235, target_port: 7235, protocol: "TCP" }],
        serviceType: "ClusterIP",
        dependsOn: ["frontend"],
        initContainers: [...waitForDbInit, ...waitForFrontendInit],
      },

      // 4. Worker Service - 内部系统任务
      {
        name: "worker",
        replicas: replicas.worker,
        image: baseImage,
        command: [],
        args: ["start", "--service=worker"],
        ports: [
          { container_port: 7239, name: "grpc", protocol: "TCP" as const },
          { container_port: 6939, name: "membership", protocol: "TCP" as const },
        ],
        env: [...commonEnv, { name: "SERVICES", value: "worker" }, { name: "WORKER_GRPC_PORT", value: "7239" }, { name: "WORKER_MEMBERSHIP_PORT", value: "6939" }, { name: "PUBLIC_FRONTEND_ADDRESS", value: frontendAddress }],
        resources: {
          limits: { cpu: "500m", memory: "512Mi" },
          requests: { cpu: "50m", memory: "128Mi" },
        },
        servicePorts: [{ name: "grpc", port: 7239, target_port: 7239, protocol: "TCP" }],
        serviceType: "ClusterIP",
        dependsOn: ["frontend"],
        initContainers: [...waitForDbInit, ...waitForFrontendInit],
      },

      // 5. Admin Tools (Web UI) - 可选
      {
        name: "admintools",
        replicas: 1,
        image: env.config.uiImage || `temporalio/ui:${env.config.uiVersion || "2.26.2"}`,
        command: [],
        args: [],
        ports: [{ container_port: 8080, name: "web", protocol: "TCP" as const }],
        env: [
          { name: "TEMPORAL_ADDRESS", value: frontendAddress },
          { name: "TEMPORAL_CORS_ORIGINS", value: "http://localhost:3000,http://localhost:5173" },
        ],
        resources: {
          limits: { cpu: "500m", memory: "512Mi" },
          requests: { cpu: "50m", memory: "64Mi" },
        },
        servicePorts: [{ name: "web", port: 8080, target_port: 8080, protocol: "TCP" }],
        serviceType: adminPublicAccess ? "LoadBalancer" : "ClusterIP",
        waitForLoadBalancer: adminPublicAccess && env.provider !== "local",
        dependsOn: ["frontend"],
        initContainers: waitForFrontendInit,
      },
    ];

    return services;
  }

  /**
   * 规范化数据库类型
   */
  private normalizeDbType(dbType: string): string {
    if (dbType === "postgres" || dbType === "postgresql") {
      return "postgres12";
    }
    return dbType;
  }
}
