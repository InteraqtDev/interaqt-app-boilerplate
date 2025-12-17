/**
 * 阿里云云服务映射配置
 * 定义阿里云支持的云服务及其配置信息
 */

import { ProviderCloudServices } from "./types.js";

/**
 * 阿里云区域配置
 * 参考: https://help.aliyun.com/document_detail/40654.html
 */
export const AliyunRegions: Record<
  string,
  {
    name: string;
    endpoint: string;
    availabilityZones: string[];
    services: {
      rds: string;
      redis: string;
      kafka: string;
      oss: string;
      ack: string;
    };
  }
> = {
  "cn-hongkong": {
    name: "香港",
    endpoint: "cn-hongkong",
    availabilityZones: ["cn-hongkong-b", "cn-hongkong-c"],
    services: {
      rds: "rds.cn-hongkong.aliyuncs.com",
      redis: "r-kvstore.cn-hongkong.aliyuncs.com",
      kafka: "alikafka.cn-hongkong.aliyuncs.com",
      oss: "oss-cn-hongkong.aliyuncs.com",
      ack: "cs.cn-hongkong.aliyuncs.com",
    },
  },
  "cn-shanghai": {
    name: "上海",
    endpoint: "cn-shanghai",
    availabilityZones: ["cn-shanghai-a", "cn-shanghai-b", "cn-shanghai-c", "cn-shanghai-d", "cn-shanghai-e", "cn-shanghai-f", "cn-shanghai-g"],
    services: {
      rds: "rds.cn-shanghai.aliyuncs.com",
      redis: "r-kvstore.cn-shanghai.aliyuncs.com",
      kafka: "alikafka.cn-shanghai.aliyuncs.com",
      oss: "oss-cn-shanghai.aliyuncs.com",
      ack: "cs.cn-shanghai.aliyuncs.com",
    },
  },
  "cn-beijing": {
    name: "北京",
    endpoint: "cn-beijing",
    availabilityZones: ["cn-beijing-a", "cn-beijing-b", "cn-beijing-c", "cn-beijing-d", "cn-beijing-e", "cn-beijing-f", "cn-beijing-g", "cn-beijing-h", "cn-beijing-i", "cn-beijing-j", "cn-beijing-k"],
    services: {
      rds: "rds.cn-beijing.aliyuncs.com",
      redis: "r-kvstore.cn-beijing.aliyuncs.com",
      kafka: "alikafka.cn-beijing.aliyuncs.com",
      oss: "oss-cn-beijing.aliyuncs.com",
      ack: "cs.cn-beijing.aliyuncs.com",
    },
  },
  "cn-shenzhen": {
    name: "深圳",
    endpoint: "cn-shenzhen",
    availabilityZones: ["cn-shenzhen-a", "cn-shenzhen-b", "cn-shenzhen-c", "cn-shenzhen-d", "cn-shenzhen-e", "cn-shenzhen-f"],
    services: {
      rds: "rds.cn-shenzhen.aliyuncs.com",
      redis: "r-kvstore.cn-shenzhen.aliyuncs.com",
      kafka: "alikafka.cn-shenzhen.aliyuncs.com",
      oss: "oss-cn-shenzhen.aliyuncs.com",
      ack: "cs.cn-shenzhen.aliyuncs.com",
    },
  },
  "ap-southeast-1": {
    name: "新加坡",
    endpoint: "ap-southeast-1",
    availabilityZones: ["ap-southeast-1a", "ap-southeast-1b", "ap-southeast-1c"],
    services: {
      rds: "rds.ap-southeast-1.aliyuncs.com",
      redis: "r-kvstore.ap-southeast-1.aliyuncs.com",
      kafka: "alikafka.ap-southeast-1.aliyuncs.com",
      oss: "oss-ap-southeast-1.aliyuncs.com",
      ack: "cs.ap-southeast-1.aliyuncs.com",
    },
  },
};

/**
 * 阿里云云服务映射
 *
 * 参考文档：
 * - RDS: https://www.aliyun.com/product/rds
 * - Redis: https://www.aliyun.com/product/kvstore
 * - Kafka: https://www.aliyun.com/product/kafka
 * - OSS: https://www.aliyun.com/product/oss
 */
export const AliyunCloudServices: ProviderCloudServices = {
  providerName: "aliyun",
  services: {
    /**
     * PostgreSQL
     * 使用阿里云 RDS PostgreSQL
     */
    postgresql: {
      serviceName: "RDS PostgreSQL",
      serviceType: "PostgreSQL",
      defaultSpec: "pg.n2.medium.1",
      deployerName: "aliyun-rds",
      supportAutoDeploy: true,
      docUrl: "https://help.aliyun.com/product/26090.html",
    },

    /**
     * MySQL
     * 使用阿里云 RDS MySQL
     */
    mysql: {
      serviceName: "RDS MySQL",
      serviceType: "MySQL",
      defaultSpec: "mysql.n2.medium.1",
      deployerName: "aliyun-rds",
      supportAutoDeploy: true,
      docUrl: "https://help.aliyun.com/product/26090.html",
    },

    /**
     * Redis
     * 使用阿里云 Redis
     */
    redis: {
      serviceName: "Redis",
      serviceType: "Redis",
      defaultSpec: "redis.master.small.default",
      deployerName: "aliyun-redis",
      supportAutoDeploy: true,
      docUrl: "https://help.aliyun.com/product/26340.html",
    },

    /**
     * Kafka
     * 使用阿里云 Kafka
     */
    kafka: {
      serviceName: "Kafka",
      serviceType: "Kafka",
      defaultSpec: "alikafka.hw.2xlarge",
      deployerName: "aliyun-kafka",
      supportAutoDeploy: true,
      docUrl: "https://help.aliyun.com/product/68151.html",
    },

    /**
     * MinIO / 对象存储
     * 使用阿里云 OSS
     */
    minio: {
      serviceName: "OSS",
      serviceType: "ObjectStorage",
      defaultSpec: "standard",
      deployerName: "aliyun-oss",
      supportAutoDeploy: true,
      docUrl: "https://help.aliyun.com/product/31815.html",
    },
  },
};
