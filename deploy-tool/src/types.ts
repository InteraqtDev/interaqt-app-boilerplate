// Deploy Tool 类型定义

// 从父项目导入的配置类型
export interface FinalConfig {
  version: string;
  environment: string;
  provider?: "local" | "aliyun" | "aws" | "volcengine";
  generatedAt: string;
  components: {
    [componentName: string]: FinalComponent;
  };
  componentUrls: {
    [componentName: string]: string;
  };
}

export interface FinalComponent {
  name: string;
  enabled: boolean;
  deploymentType?: "local" | "container";
  /** 自定义镜像地址（可选，覆盖默认生成的镜像地址） */
  image?: string;
  host?: string;
  port?: number;
  publicUrl?: string;
  endpoint?: string;
  replicas?: number;
  /** 是否需要公网访问（云环境用 LoadBalancer，否则用 ClusterIP） */
  publicAccess?: boolean;
  /** 跳过应用部署，只部署中间件依赖（默认 false） */
  skipApplication?: boolean;
  /** 自定义启动命令（如 "npm run start:async-task"） */
  startCommand?: string;
  /** 跳过健康检查（默认 false，设为 true 禁用健康检查，适用于非 HTTP 服务） */
  skipHealthCheck?: boolean;
  middlewareDependencies?: {
    [dependencyName: string]: FinalMiddleware;
  };
  externalServices?: {
    [serviceName: string]: FinalExternalService;
  };
  applicationConfig?: Record<string, any>;
}

/**
 * Endpoint 定义
 * 每个 endpoint 定义一个服务暴露点
 */
export interface EndpointDefinition {
  /** 端口号 */
  port: number;
  /** 协议类型 (http, grpc, postgresql, redis, etc.) */
  protocol: string;
  /** 是否需要公网访问 */
  publicAccess: boolean;
  /** 可选描述 */
  description?: string;
  /** 填充后的实际 endpoint 地址（集群内部地址，供后端使用） */
  value?: string;
  /** 公网访问地址（仅当 publicAccess: true 时填充，供前端直连使用） */
  publicUrl?: string;
}

export interface FinalMiddleware {
  type: string;
  version?: string;
  deploymentType: "container" | "cloud";
  use?: string;
  /** 自定义镜像地址（可选，覆盖 use 配置类生成的默认镜像） */
  image?: string;
  /** 多 endpoint 支持，主 endpoint 约定命名为 "main" */
  endpoints: Record<string, EndpointDefinition>;
  replicas?: number;
  dependencies?: string[];
  config: Record<string, any>;
}

export interface FinalExternalService {
  provider: string;
  service: string;
  enabled: boolean;
  config: Record<string, any>;
}

// Deploy Tool 专用类型

export interface DeploymentPlan {
  namespace: string;
  cloudDependencies: CloudDependency[];
  containerMiddleware: ContainerMiddleware[];
  components: ComponentDeployment[];
}

export interface CloudDependency {
  componentName: string;
  middlewareName: string;
  type: string;
  endpoint: string;
}

export interface ContainerMiddleware {
  componentName: string;
  middlewareName: string;
  type: string;
  version?: string;
  use: string;
  /** 自定义镜像地址（可选，覆盖 use 配置类生成的默认镜像） */
  image?: string;
  replicas: number;
  config: Record<string, any>;
}

export interface ComponentDeployment {
  componentName: string;
  deploymentType: "local" | "container";
  replicas: number;
  port?: number;
  config: FinalComponent;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface DeployResult {
  success: boolean;
  message: string;
  details?: any;
}

export interface EndpointInfo {
  componentName: string;
  middlewareName?: string;
  /** endpoint 名称（如 "main", "admin"），仅对 middleware 类型有意义 */
  endpointName?: string;
  endpoint: string;
  type: "component" | "middleware";
}

// Terraform 相关类型

export interface TerraformOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface PlanResult {
  changes: {
    add: number;
    change: number;
    destroy: number;
  };
  output: string;
}

export interface ApplyResult {
  success: boolean;
  output: string;
  resources: string[];
}

export interface DestroyResult {
  success: boolean;
  output: string;
}

// Provider 配置

export interface ProviderConfig {
  name: "local" | "volcengine" | "aws" | "aliyun";
  kubeconfig?: string;
  context?: string;
}

// 日志级别

export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  SUCCESS = "success",
}

// 部署阶段

export enum DeploymentStage {
  LOAD_CONFIG = "load_config",
  VALIDATE_CONFIG = "validate_config",
  VALIDATE_CLOUD_DEPS = "validate_cloud_deps",
  FILL_ENDPOINTS = "fill_endpoints",
  GENERATE_TERRAFORM = "generate_terraform",
  DEPLOY_MIDDLEWARE = "deploy_middleware",
  DEPLOY_COMPONENTS = "deploy_components",
  VERIFY = "verify",
}
