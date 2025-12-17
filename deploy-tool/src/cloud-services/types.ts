/**
 * 云服务部署相关类型定义
 */

/**
 * 云服务部署参数
 */
export interface CloudServiceDeployParams {
  /** 资源名称 */
  resourceName: string;
  /** 环境名称 */
  environment: string;
  /** 组件名称 */
  componentName: string;
  /** 中间件名称 */
  middlewareName: string;
  /** 中间件类型 */
  middlewareType: string;
  /** 区域 */
  region?: string;
  /** 用户配置 */
  config: Record<string, any>;
  /** 云服务规格配置（可选） */
  cloudSpec?: CloudServiceSpec;
}

/**
 * 云服务规格配置
 */
export interface CloudServiceSpec {
  /** 实例类型/规格 */
  instanceType?: string;
  /** 存储大小（GB） */
  storage?: number;
  /** 区域 */
  region?: string;
  /** 可用区 */
  availabilityZone?: string;
  /** 其他自定义配置 */
  [key: string]: any;
}

/**
 * 云服务部署结果
 */
export interface CloudServiceDeployResult {
  /** 是否成功 */
  success: boolean;
  /** 服务 endpoint */
  endpoint?: string;
  /** 资源 ID */
  resourceId?: string;
  /** 错误信息 */
  error?: string;
  /** 其他信息 */
  metadata?: Record<string, any>;
}

/**
 * 云服务信息
 */
export interface CloudServiceInfo {
  /** 是否需要部署 */
  needsDeploy: boolean;
  /** 组件名称 */
  componentName: string;
  /** 中间件名称 */
  middlewareName: string;
  /** 中间件类型 */
  middlewareType: string;
  /** 部署参数 */
  deployParams?: CloudServiceDeployParams;
}
