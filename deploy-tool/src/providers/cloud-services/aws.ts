/**
 * AWS 云服务映射配置
 * 定义 AWS 支持的云服务及其配置信息
 */

import { ProviderCloudServices } from "./types.js";

/**
 * AWS 云服务映射
 *
 * 参考文档：
 * - RDS: https://aws.amazon.com/rds/
 * - ElastiCache: https://aws.amazon.com/elasticache/
 * - MSK (Kafka): https://aws.amazon.com/msk/
 * - S3: https://aws.amazon.com/s3/
 */
export const AWSCloudServices: ProviderCloudServices = {
  providerName: "aws",
  services: {
    /**
     * PostgreSQL
     * 使用 AWS RDS PostgreSQL
     */
    postgresql: {
      serviceName: "RDS PostgreSQL",
      serviceType: "PostgreSQL",
      defaultSpec: "db.t3.medium",
      deployerName: "aws-rds",
      supportAutoDeploy: true,
      docUrl: "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html",
    },

    /**
     * MySQL
     * 使用 AWS RDS MySQL
     */
    mysql: {
      serviceName: "RDS MySQL",
      serviceType: "MySQL",
      defaultSpec: "db.t3.medium",
      deployerName: "aws-rds",
      supportAutoDeploy: true,
      docUrl: "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_MySQL.html",
    },

    /**
     * Redis
     * 使用 AWS ElastiCache Redis
     */
    redis: {
      serviceName: "ElastiCache Redis",
      serviceType: "Redis",
      defaultSpec: "cache.t3.medium",
      deployerName: "aws-elasticache",
      supportAutoDeploy: true,
      docUrl: "https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/WhatIs.html",
    },

    /**
     * Kafka
     * 使用 AWS MSK (Managed Streaming for Kafka)
     */
    kafka: {
      serviceName: "MSK",
      serviceType: "Kafka",
      defaultSpec: "kafka.m5.large",
      deployerName: "aws-msk",
      supportAutoDeploy: true,
      docUrl: "https://docs.aws.amazon.com/msk/latest/developerguide/what-is-msk.html",
    },

    /**
     * MinIO / 对象存储
     * 使用 AWS S3
     */
    minio: {
      serviceName: "S3",
      serviceType: "ObjectStorage",
      defaultSpec: "standard",
      deployerName: "aws-s3",
      supportAutoDeploy: true,
      docUrl: "https://docs.aws.amazon.com/s3/index.html",
    },

    /**
     * MongoDB
     * 使用 AWS DocumentDB (MongoDB 兼容)
     */
    mongodb: {
      serviceName: "DocumentDB",
      serviceType: "MongoDB",
      defaultSpec: "db.t3.medium",
      deployerName: "aws-documentdb",
      supportAutoDeploy: true,
      docUrl: "https://docs.aws.amazon.com/documentdb/",
    },

    /**
     * Elasticsearch
     * 使用 AWS OpenSearch Service
     */
    elasticsearch: {
      serviceName: "OpenSearch",
      serviceType: "Elasticsearch",
      defaultSpec: "t3.medium.search",
      deployerName: "aws-opensearch",
      supportAutoDeploy: true,
      docUrl: "https://docs.aws.amazon.com/opensearch-service/",
    },
  },
};
