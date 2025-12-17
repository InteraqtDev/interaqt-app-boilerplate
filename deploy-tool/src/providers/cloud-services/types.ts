/**
 * Provider 云服务配置类型定义
 */

/**
 * 云服务映射信息
 */
export interface CloudServiceInfo {
  /** 云服务名称，如 "RDS PostgreSQL", "ElastiCache Redis" */
  serviceName: string;
  /** 服务类型，如 "PostgreSQL", "Redis" */
  serviceType: string;
  /** 默认规格，如 "rds.postgres.s1.medium" */
  defaultSpec?: string;
  /** 部署器名称，如 "volcengine-rds" */
  deployerName: string;
  /** 是否支持自动部署 */
  supportAutoDeploy: boolean;
  /** 文档链接 */
  docUrl?: string;
}

/**
 * 云服务映射
 * 中间件类型 -> 云服务信息
 */
export interface CloudServiceMapping {
  [middlewareType: string]: CloudServiceInfo;
}

/**
 * Provider 云服务配置
 */
export interface ProviderCloudServices {
  /** Provider 名称 */
  providerName: string;
  /** 云服务映射 */
  services: CloudServiceMapping;
}
