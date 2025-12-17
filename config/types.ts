// TypeScript 类型定义，用于配置文件的类型检查和 IDE 提示

/**
 * 应用层配置
 */
export interface ApplicationConfig {
  version: string;
  components: {
    [componentName: string]: ApplicationComponent;
  };
}

export interface ApplicationComponent {
  name: string;
  port: number;
  middlewareDependencies: {
    [dependencyName: string]: MiddlewareDependency;
  };
  externalServices: {
    [serviceName: string]: ExternalService;
  };
  applicationConfig: {
    [configName: string]: ConfigRequirement;
  };
}

/**
 * 应用层 Endpoint 配置（只需指定 publicAccess）
 * port/protocol/description 由中间件配置类决定
 */
export interface AppEndpointConfig {
  publicAccess?: boolean;
}

/**
 * 中间配置的 Endpoint 定义（由 config generator 生成，只有 publicAccess）
 * port/protocol/description/value/publicUrl 由 deploy tool 后续填充
 */
export interface IntermediateEndpointDefinition {
  publicAccess: boolean;
  port?: number;
  protocol?: string;
  description?: string;
  value?: string;
  publicUrl?: string; // 公网访问 URL，由 deploy tool 填充
}

/**
 * 最终配置中的 Endpoint 定义（所有字段由 deploy tool 填充完成）
 */
export interface FinalEndpointDefinition {
  port: number;
  protocol: string;
  publicAccess: boolean;
  description?: string;
  value: string; // 必填，由 deploy tool 生成
}

export interface MiddlewareDependency {
  type: string;
  version?: string;
  description?: string;
  endpoints?: Record<string, AppEndpointConfig>;
  requiredFields: string[];
  config?: Record<string, any>;
}

export interface ExternalService {
  provider: string;
  service: string;
  requiredFields: string[];
}

export interface ConfigRequirement {
  requiredFields: string[];
}

/**
 * 运维层配置
 */
export interface DeploymentConfig {
  provider: 'local' | 'aliyun' | 'aws' | 'volcengine';
  environment: string;
  components: {
    [componentName: string]: DeploymentComponent;
  };
}

export interface DeploymentComponent {
  deploymentType: 'local' | 'container';
  replicas: number;
  host: string;
  port: number;
  middlewareDependencies: {
    [dependencyName: string]: DeployedMiddleware;
  };
  externalServices: {
    [serviceName: string]: DeployedExternalService;
  };
  applicationConfig: {
    [configName: string]: any;
  };
}

export interface DeployedMiddleware {
  deploymentType: 'container' | 'cloud';
  use?: string;
  version?: string; // 可选：具体使用的版本号（如 7.0.15）
  replicas: number;
  endpoint?: string; // 可选：直接指定 endpoint，如果指定则在生成配置时使用
  dependencies?: string[]; // 可选：依赖的其他中间件名称列表
  config: Record<string, any>;
}

export interface DeployedExternalService {
  config: Record<string, any>;
}

/**
 * 最终生成的配置
 */
export interface FinalConfig {
  version: string;
  environment: string;
  provider: string;
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
  host: string;
  port: number;
  publicUrl: string;
  endpoint: string; // 空白字段，由 deploy tool 填写
  middlewareDependencies: {
    [dependencyName: string]: FinalMiddleware;
  };
  externalServices: {
    [serviceName: string]: FinalExternalService;
  };
  applicationConfig: Record<string, any>;
}

export interface FinalMiddleware {
  type: string;
  version?: string;
  deploymentType: 'container' | 'cloud';
  use?: string;
  endpoints: Record<string, IntermediateEndpointDefinition>; // 由 config generator 生成，deploy tool 填充完整
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

