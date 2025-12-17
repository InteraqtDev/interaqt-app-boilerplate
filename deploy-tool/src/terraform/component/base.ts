/**
 * Component 配置抽象层
 * 定义所有 component 配置的通用接口和基类
 */
import { FinalComponent } from "../../types.js";

// ============================================================================
// 类型定义
// ============================================================================

/**
 * Component 部署上下文
 */
export interface ComponentContext {
  /** Component 名称 */
  componentName: string;
  /** Component 完整配置 */
  config: FinalComponent;
  /** 部署环境 */
  environment: string;
  /** 云提供商 */
  provider: "local" | "aliyun" | "aws" | "volcengine";
  /** Kubernetes 命名空间 */
  namespace: string;
  /** 镜像仓库地址（可选，如 cr-cn-beijing.volces.com/namespace） */
  imageRepository?: string;
  /** 完整配置（用于解析跨组件引用） */
  fullConfig?: {
    components: { [name: string]: FinalComponent };
  };
}

/**
 * 镜像配置
 */
export interface ImageConfig {
  /** 镜像仓库/组织 */
  repository: string;
  /** 镜像名称 */
  name: string;
  /** 镜像标签 */
  tag: string;
  /** 自定义启动命令 */
  command?: string[];
  /** 命令参数 */
  args?: string[];
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
  /** 完整镜像地址 */
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

/**
 * HTTP 健康检查配置
 */
export interface HttpProbe {
  path: string;
  port: number;
  scheme: "HTTP" | "HTTPS";
}

/**
 * TCP 健康检查配置
 */
export interface TcpProbe {
  port: number;
}

/**
 * Exec 健康检查配置
 */
export interface ExecProbe {
  command: string[];
}

/**
 * 健康检查探针
 */
export interface Probe {
  type: "http" | "tcp" | "exec";
  config: HttpProbe | TcpProbe | ExecProbe;
  initial_delay_seconds: number;
  period_seconds: number;
  timeout_seconds: number;
  success_threshold: number;
  failure_threshold: number;
}

/**
 * 健康检查配置
 */
export interface ProbeConfig {
  liveness: Probe | null;
  readiness: Probe | null;
}

// ============================================================================
// 抽象接口
// ============================================================================

/**
 * Component 配置接口
 * 所有 component 配置类必须实现此接口
 */
export interface ComponentConfig {
  /**
   * 获取镜像配置
   * @param ctx Component 部署上下文
   */
  getImageConfig(ctx: ComponentContext): ImageConfig;

  /**
   * 获取容器规格配置
   * @param ctx Component 部署上下文
   */
  getContainerSpec(ctx: ComponentContext): ContainerSpec;

  /**
   * 获取 Service 规格配置
   * @param ctx Component 部署上下文
   */
  getServiceSpec(ctx: ComponentContext): ServiceSpec;

  /**
   * 获取资源需求配置
   * @param ctx Component 部署上下文
   */
  getResources(ctx: ComponentContext): ResourceRequirements;

  /**
   * 获取健康检查配置
   * @param ctx Component 部署上下文
   * @returns 健康检查配置，返回 null 表示禁用健康检查
   */
  getProbes(ctx: ComponentContext): ProbeConfig | null;
}

// ============================================================================
// 基础实现
// ============================================================================

/**
 * Component 配置基类
 * 提供环境判断、配置转换等通用功能
 */
export abstract class BaseComponentConfig implements ComponentConfig {
  /**
   * 判断是否为本地环境
   */
  protected isLocalEnvironment(ctx: ComponentContext): boolean {
    return ctx.provider === "local";
  }

  /**
   * 判断是否为云环境
   */
  protected isCloudEnvironment(ctx: ComponentContext): boolean {
    return !this.isLocalEnvironment(ctx);
  }

  /**
   * 获取 Service 类型
   * Local 环境: NodePort（Docker Desktop 方便本地访问）
   * 云环境: 默认 ClusterIP（内部服务），可通过 config.publicAccess 设为 LoadBalancer
   */
  protected getServiceType(ctx: ComponentContext): "NodePort" | "LoadBalancer" | "ClusterIP" {
    if (this.isLocalEnvironment(ctx)) {
      return "NodePort";
    }
    // 云环境默认用 ClusterIP，只有明确需要公网访问的才用 LoadBalancer
    return ctx.config.publicAccess ? "LoadBalancer" : "ClusterIP";
  }

  /**
   * 构建完整的镜像地址
   * 格式: {repository}/{name}:{tag} 或 {name}:{tag} (如果 repository 为空)
   */
  protected buildImageAddress(imageConfig: ImageConfig): string {
    if (imageConfig.repository) {
      return `${imageConfig.repository}/${imageConfig.name}:${imageConfig.tag}`;
    }
    return `${imageConfig.name}:${imageConfig.tag}`;
  }

  /**
   * 将 applicationConfig 转换为环境变量
   * 支持嵌套对象，键名转换为大写并用下划线连接
   *
   * @example
   * { database: { host: "localhost" } } => [{ name: "DATABASE_HOST", value: "localhost" }]
   */
  protected convertApplicationConfigToEnv(config: Record<string, any>, prefix: string = ""): EnvVar[] {
    const envVars: EnvVar[] = [];

    for (const [key, value] of Object.entries(config)) {
      const envKey = prefix ? `${prefix}_${key.toUpperCase()}` : key.toUpperCase();

      if (value === null || value === undefined) {
        continue;
      }

      if (typeof value === "object" && !Array.isArray(value)) {
        // 嵌套对象，递归处理
        envVars.push(...this.convertApplicationConfigToEnv(value, envKey));
      } else if (Array.isArray(value)) {
        // 数组转 JSON 字符串
        envVars.push({ name: envKey, value: JSON.stringify(value) });
      } else {
        // 基本类型（string、number、boolean）
        envVars.push({ name: envKey, value: String(value) });
      }
    }

    return envVars;
  }

  // ========================================================================
  // 抽象方法 - 子类必须实现
  // ========================================================================

  abstract getImageConfig(ctx: ComponentContext): ImageConfig;
  abstract getContainerSpec(ctx: ComponentContext): ContainerSpec;
  abstract getServiceSpec(ctx: ComponentContext): ServiceSpec;
  abstract getResources(ctx: ComponentContext): ResourceRequirements;
  abstract getProbes(ctx: ComponentContext): ProbeConfig | null;
}
