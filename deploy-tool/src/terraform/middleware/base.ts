/**
 * Middleware 配置抽象层
 * 定义所有 middleware 配置的通用接口和基类
 *
 * 支持两种部署模式：
 * - standalone: 单实例部署（默认），一个 Deployment + 一个/多个 Service
 * - distributed: 分布式部署，多个 Deployment + 多个 Service（如 Temporal 的 frontend/history/matching/worker）
 */

// ============================================================================
// Deployment Mode 定义
// ============================================================================

/**
 * 部署模式
 */
export type DeploymentMode = "standalone" | "distributed";

/**
 * 分布式部署中的单个服务规格
 * 用于 distributed 模式下定义每个独立服务
 */
export interface DistributedServiceSpec {
  /** 服务名称，如 "frontend", "history" */
  name: string;
  /** 副本数 */
  replicas: number;
  /** 容器镜像 */
  image: string;
  /** 启动命令 */
  command: string[];
  /** 命令参数 */
  args: string[];
  /** 容器端口 */
  ports: ContainerPort[];
  /** 环境变量 */
  env: EnvVar[];
  /** 资源配置 */
  resources: ResourceRequirements;
  /** 对应的 Service 端口配置 */
  servicePorts: ServicePort[];
  /** Service 类型 */
  serviceType: "ClusterIP" | "NodePort" | "LoadBalancer";
  /** 是否需要等待 LoadBalancer 分配 IP */
  waitForLoadBalancer?: boolean;
  /** 依赖的其他服务（用于生成 depends_on） */
  dependsOn?: string[];
  /** Init containers */
  initContainers?: Array<{
    name: string;
    image: string;
    command: string[];
    args: string[];
    env: EnvVar[];
    volume_mounts: Array<{ name: string; mount_path: string }>;
  }>;
  /** Volume 配置 */
  volumes?: any[];
  /** Volume mounts */
  volumeMounts?: Array<{ name: string; mount_path: string; read_only?: boolean }>;
}

// ============================================================================
// Endpoint 定义
// ============================================================================

/**
 * Endpoint 规格定义
 * 用于描述一个服务暴露点的完整信息
 */
export interface EndpointSpec {
  /** endpoint 名称，如 "main", "admin" */
  name: string;
  /** 端口号 */
  port: number;
  /** 协议类型 (http, grpc, postgresql, redis, etc.) */
  protocol: string;
  /** 是否需要公网访问 */
  publicAccess: boolean;
  /** 可选描述 */
  description?: string;
  /**
   * 可选：覆盖默认 Service 名称
   * 用于 distributed 模式下指定实际的 Service 名称
   * 例如 distributed temporal 的 main endpoint 指向 "temporal-frontend"
   * 最终 Service 名为 "{serviceName}-svc"
   */
  serviceName?: string;
}

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 部署环境上下文
 */
export interface MiddlewareEnvironment {
  /** 云提供商 */
  provider: "local" | "aliyun" | "aws" | "volcengine";
  /** Kubernetes 命名空间 */
  namespace: string;
  /** Middleware 名称 */
  middlewareName: string;
  /** 版本号 (可选) */
  version?: string;
  /** 用户配置 */
  config: Record<string, any>;
}

/**
 * 容器端口配置
 */
export interface ContainerPort {
  container_port: number;
  name: string;
  protocol: "TCP" | "UDP";
}

/**
 * 环境变量配置
 */
export interface EnvVar {
  name: string;
  value: string;
}

/**
 * 容器规格
 */
export interface ContainerSpec {
  /** 容器镜像 */
  image: string;
  /** 启动命令 */
  command: string[];
  /** 命令参数 */
  args: string[];
  /** 容器端口 */
  ports: ContainerPort[];
  /** 环境变量 */
  env: EnvVar[];
}

/**
 * Sidecar 容器规格
 * 用于需要多容器部署的中间件（如 Temporal 的 Server + Web UI）
 */
export interface SidecarContainerSpec {
  /** 容器名称 */
  name: string;
  /** 容器镜像 */
  image: string;
  /** 启动命令 */
  command: string[];
  /** 命令参数 */
  args: string[];
  /** 容器端口 */
  ports: ContainerPort[];
  /** 环境变量 */
  env: EnvVar[];
  /** 资源配置 */
  resources: ResourceRequirements;
}

/**
 * Service 端口配置
 */
export interface ServicePort {
  name: string;
  port: number;
  target_port: number;
  protocol: "TCP" | "UDP";
}

/**
 * Service 规格
 */
export interface ServiceSpec {
  /** Service 端口列表 */
  ports: ServicePort[];
  /** Service 类型 */
  type: "ClusterIP" | "NodePort" | "LoadBalancer";
}

/**
 * 资源配置
 */
export interface ResourceRequirements {
  limits: {
    cpu: string;
    memory: string;
  };
  requests: {
    cpu: string;
    memory: string;
  };
}

// ============================================================================
// 抽象接口
// ============================================================================

/**
 * Middleware 配置接口
 * 所有 middleware 配置类必须实现此接口
 */
export interface MiddlewareConfig {
  /**
   * 获取容器镜像名称
   * @param env 部署环境上下文
   */
  getImage(env: MiddlewareEnvironment): string;

  /**
   * 获取容器规格配置
   * @param env 部署环境上下文
   */
  getContainerSpec(env: MiddlewareEnvironment): ContainerSpec;

  /**
   * 获取 Service 规格配置
   * @param env 部署环境上下文
   */
  getServiceSpec(env: MiddlewareEnvironment): ServiceSpec;

  /**
   * 获取资源需求配置
   */
  getResources(): ResourceRequirements;

  /**
   * 获取默认端口
   * 从 ServiceSpec 中提取的主端口号
   */
  getDefaultPort(): number;

  /**
   * 获取默认协议
   * 用于生成 endpoint URL 的协议（如 http, postgresql, redis 等）
   */
  getDefaultProtocol(): string;

  /**
   * 获取所有 endpoint 定义
   * 默认返回单个 "main" endpoint
   * 子类可以覆盖以返回多个 endpoint（如 Temporal 的 main + admin）
   * @param env 部署环境上下文
   */
  getEndpointDefinitions(env: MiddlewareEnvironment): EndpointSpec[];

  // ========== Distributed Mode Support ==========

  /**
   * 获取支持的部署模式列表
   * 默认只支持 standalone
   */
  getSupportedModes(): DeploymentMode[];

  /**
   * 获取当前部署模式
   * @param env 部署环境上下文
   */
  getDeploymentMode(env: MiddlewareEnvironment): DeploymentMode;

  /**
   * 判断是否为分布式模式
   * @param env 部署环境上下文
   */
  isDistributedMode(env: MiddlewareEnvironment): boolean;

  /**
   * 获取分布式服务列表（仅在 distributed 模式下有效）
   * @param env 部署环境上下文
   */
  getDistributedServices(env: MiddlewareEnvironment): DistributedServiceSpec[];
}

// ============================================================================
// 基础实现
// ============================================================================

/**
 * Middleware 配置基类
 * 提供环境判断等通用功能
 */
export abstract class BaseMiddlewareConfig implements MiddlewareConfig {
  /**
   * 判断是否为本地环境
   */
  protected isLocalEnvironment(env: MiddlewareEnvironment): boolean {
    return env.provider === "local";
  }

  /**
   * 判断是否为云环境
   */
  protected isCloudEnvironment(env: MiddlewareEnvironment): boolean {
    return !this.isLocalEnvironment(env);
  }

  /**
   * 获取 Service 类型
   * Local 环境: NodePort（Docker Desktop 方便本地访问）
   * 云环境: 默认 ClusterIP（内部服务），可通过 config.publicAccess 设为 LoadBalancer
   */
  protected getServiceType(env: MiddlewareEnvironment): "NodePort" | "LoadBalancer" | "ClusterIP" {
    if (this.isLocalEnvironment(env)) {
      return "NodePort";
    }
    // 云环境默认用 ClusterIP，只有明确需要公网访问的才用 LoadBalancer
    return env.config.publicAccess ? "LoadBalancer" : "ClusterIP";
  }

  /**
   * 构建 Kubernetes Service DNS 名称
   * 格式: {serviceName}.{namespace}.svc.cluster.local
   */
  protected buildServiceDNS(env: MiddlewareEnvironment, port?: number): string {
    const serviceName = `${env.middlewareName.toLowerCase()}-svc`;
    const dns = `${serviceName}.${env.namespace}.svc.cluster.local`;
    return port ? `${dns}:${port}` : dns;
  }

  /**
   * 获取默认端口
   *
   * 从 ServiceSpec 中提取第一个端口
   * 子类通常不需要覆盖此方法，除非有特殊需求
   *
   * @returns 主端口号，如果没有则返回 8080
   */
  getDefaultPort(): number {
    // 使用最小化的环境配置来获取 ServiceSpec
    const minimalEnv: MiddlewareEnvironment = {
      provider: "local",
      namespace: "default",
      middlewareName: "temp",
      config: {},
    };

    const serviceSpec = this.getServiceSpec(minimalEnv);

    // 返回第一个端口，如果没有则返回 8080
    return serviceSpec.ports[0]?.port || 8080;
  }

  /**
   * 获取默认协议
   *
   * 用于生成 endpoint URL 的协议部分
   * 子类应该覆盖此方法以返回正确的协议
   *
   * @returns 协议名称，默认返回 'http'
   */
  getDefaultProtocol(): string {
    return "http";
  }

  /**
   * 获取所有 endpoint 定义
   *
   * 默认实现：返回单个 main endpoint
   * 子类可以覆盖以返回多个 endpoint
   *
   * @param env 部署环境上下文
   * @returns endpoint 规格列表
   */
  getEndpointDefinitions(env: MiddlewareEnvironment): EndpointSpec[] {
    const port = this.getDefaultPort();
    const protocol = this.getDefaultProtocol();
    // publicAccess 可以是 boolean 或 { main: boolean, admin: boolean } 形式
    const publicAccessConfig = env.config.publicAccess;
    const publicAccess = typeof publicAccessConfig === "boolean" ? publicAccessConfig : (publicAccessConfig?.main ?? false);

    return [
      {
        name: "main",
        port,
        protocol,
        publicAccess,
        description: "Primary service endpoint",
      },
    ];
  }

  // ========================================================================
  // 部署模式相关方法
  // ========================================================================

  /**
   * 获取支持的部署模式列表
   * 默认只支持 standalone 模式
   * 子类可以覆盖以支持更多模式（如 distributed）
   */
  getSupportedModes(): DeploymentMode[] {
    return ["standalone"];
  }

  /**
   * 获取当前部署模式
   * 从 config.mode 读取，默认为 standalone
   */
  getDeploymentMode(env: MiddlewareEnvironment): DeploymentMode {
    const mode = env.config.mode || "standalone";
    const supportedModes = this.getSupportedModes();
    if (!supportedModes.includes(mode)) {
      throw new Error(`Unsupported deployment mode '${mode}' for this middleware. Supported modes: ${supportedModes.join(", ")}`);
    }
    return mode;
  }

  /**
   * 判断是否为分布式部署模式
   */
  isDistributedMode(env: MiddlewareEnvironment): boolean {
    return this.getDeploymentMode(env) === "distributed";
  }

  /**
   * 获取分布式部署的服务规格列表
   * 仅在 distributed 模式下使用
   * 默认返回空数组，子类需要覆盖实现
   *
   * @param env 部署环境上下文
   * @returns 分布式服务规格列表
   */
  getDistributedServices(env: MiddlewareEnvironment): DistributedServiceSpec[] {
    return [];
  }

  // ========================================================================
  // 抽象方法 - 子类必须实现
  // ========================================================================

  abstract getImage(env: MiddlewareEnvironment): string;
  abstract getContainerSpec(env: MiddlewareEnvironment): ContainerSpec;
  abstract getServiceSpec(env: MiddlewareEnvironment): ServiceSpec;
  abstract getResources(): ResourceRequirements;
}
