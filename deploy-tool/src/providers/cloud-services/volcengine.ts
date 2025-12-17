/**
 * 火山引擎云服务映射配置
 * 定义火山引擎支持的云服务及其配置信息
 */

import { ProviderCloudServices } from "./types.js";

/**
 * 火山引擎云服务映射
 *
 * 参考文档：
 * - RDS: https://www.volcengine.com/docs/6313
 * - Redis: https://www.volcengine.com/docs/6293
 * - Kafka: https://www.volcengine.com/docs/6431
 * - TOS: https://www.volcengine.com/docs/6349
 */
export const VolcengineCloudServices: ProviderCloudServices = {
  providerName: "volcengine",
  services: {
    /**
     * PostgreSQL
     * 使用火山引擎 RDS PostgreSQL
     */
    postgresql: {
      serviceName: "RDS PostgreSQL",
      serviceType: "PostgreSQL",
      defaultSpec: "rds.postgres.s1.medium",
      deployerName: "volcengine-rds",
      supportAutoDeploy: true,
      docUrl: "https://www.volcengine.com/docs/6313/79536",
    },

    /**
     * MySQL
     * 使用火山引擎 RDS MySQL
     */
    mysql: {
      serviceName: "RDS MySQL",
      serviceType: "MySQL",
      defaultSpec: "rds.mysql.s1.medium",
      deployerName: "volcengine-rds",
      supportAutoDeploy: true,
      docUrl: "https://www.volcengine.com/docs/6313/79536",
    },

    /**
     * Redis
     * 使用火山引擎 Redis
     */
    redis: {
      serviceName: "Redis",
      serviceType: "Redis",
      defaultSpec: "redis.shard.1g.basic",
      deployerName: "volcengine-redis",
      supportAutoDeploy: true,
      docUrl: "https://www.volcengine.com/docs/6293/79761",
    },

    /**
     * Kafka
     * 使用火山引擎 Kafka
     */
    kafka: {
      serviceName: "Kafka",
      serviceType: "Kafka",
      defaultSpec: "kafka.20xrate.hw",
      deployerName: "volcengine-kafka",
      supportAutoDeploy: true,
      docUrl: "https://www.volcengine.com/docs/6431/71907",
    },

    /**
     * MinIO / 对象存储
     * 使用火山引擎 TOS（对象存储服务）
     */
    minio: {
      serviceName: "TOS",
      serviceType: "ObjectStorage",
      defaultSpec: "standard",
      deployerName: "volcengine-tos",
      supportAutoDeploy: true,
      docUrl: "https://www.volcengine.com/docs/6349/74822",
    },
  },
};
