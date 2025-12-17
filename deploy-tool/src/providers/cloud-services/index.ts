/**
 * Provider 云服务配置导出
 */

export * from "./types.js";
export * from "./volcengine.js";
export * from "./aws.js";
export * from "./aliyun.js";

import { ProviderCloudServices } from "./types.js";
import { VolcengineCloudServices } from "./volcengine.js";
import { AWSCloudServices } from "./aws.js";
import { AliyunCloudServices } from "./aliyun.js";

/**
 * 获取 Provider 的云服务配置
 */
export function getProviderCloudServices(provider: string): ProviderCloudServices | null {
  switch (provider) {
    case "volcengine":
      return VolcengineCloudServices;
    case "aws":
      return AWSCloudServices;
    case "aliyun":
      return AliyunCloudServices;
    default:
      return null;
  }
}

/**
 * 检查 Provider 是否支持某个中间件的云服务
 */
export function supportsCloudService(provider: string, middlewareType: string): boolean {
  const cloudServices = getProviderCloudServices(provider);
  if (!cloudServices) {
    return false;
  }
  return middlewareType in cloudServices.services;
}

/**
 * 获取云服务信息
 */
export function getCloudServiceInfo(provider: string, middlewareType: string) {
  const cloudServices = getProviderCloudServices(provider);
  if (!cloudServices) {
    return null;
  }
  return cloudServices.services[middlewareType] || null;
}
