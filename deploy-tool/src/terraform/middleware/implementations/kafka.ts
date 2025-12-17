/**
 * Kafka Middleware 配置
 *
 * Kafka 在不同环境下需要特殊配置：
 *
 * Local 环境（通过 port-forward 访问）：
 * - ADVERTISED_LISTENERS 设置为 localhost:9092
 * - 这样客户端通过 port-forward 连接时，Kafka 返回的 broker 地址是 localhost
 * - 客户端可以正常重连到 localhost:9092（port-forward 端口）
 *
 * 云环境（Pod 间直接通信）：
 * - ADVERTISED_LISTENERS 设置为 Service DNS 地址
 * - 格式: kafka-svc.namespace.svc.cluster.local:9092
 * - Pod 间通过 Kubernetes 内部网络直接通信
 */
import { BaseMiddlewareConfig, MiddlewareEnvironment, ContainerSpec, ServiceSpec, ResourceRequirements, EnvVar } from "../base.js";

export class KafkaMiddlewareConfig extends BaseMiddlewareConfig {
  getImage(env: MiddlewareEnvironment): string {
    // 使用配置中的版本，如果没有则使用默认版本
    const version = env.version || "3.8.1";
    return `apache/kafka:${version}`;
  }

  getContainerSpec(env: MiddlewareEnvironment): ContainerSpec {
    return {
      image: this.getImage(env),
      command: [],
      args: [],
      ports: [{ container_port: 9092, name: "kafka", protocol: "TCP" }],
      env: this.getEnvironmentVariables(env),
    };
  }

  getServiceSpec(env: MiddlewareEnvironment): ServiceSpec {
    return {
      ports: [{ name: "kafka", port: 9092, target_port: 9092, protocol: "TCP" }],
      type: this.getServiceType(env),
    };
  }

  getResources(): ResourceRequirements {
    // Kafka 资源配置（降低 requests 以节省集群资源）
    return {
      limits: { cpu: "2000m", memory: "4Gi" },
      requests: { cpu: "100m", memory: "512Mi" },
    };
  }

  /**
   * Kafka 使用 kafka:// 协议
   */
  getDefaultProtocol(): string {
    return "kafka";
  }

  /**
   * 获取环境变量
   *
   * 关键配置：KAFKA_ADVERTISED_LISTENERS
   * - Local: localhost:9092（配合 port-forward）
   * - Cloud: Service DNS（Pod 间通信）
   */
  private getEnvironmentVariables(env: MiddlewareEnvironment): EnvVar[] {
    // 基础环境变量（所有环境通用）
    const baseEnv: EnvVar[] = [
      { name: "KAFKA_NODE_ID", value: "1" },
      { name: "KAFKA_PROCESS_ROLES", value: "broker,controller" },
      { name: "KAFKA_LISTENERS", value: "PLAINTEXT://:9092,CONTROLLER://:9093" },
      { name: "KAFKA_CONTROLLER_LISTENER_NAMES", value: "CONTROLLER" },
      { name: "KAFKA_LISTENER_SECURITY_PROTOCOL_MAP", value: "CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT" },
      { name: "KAFKA_CONTROLLER_QUORUM_VOTERS", value: "1@localhost:9093" },
      { name: "KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR", value: "1" },
      { name: "KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR", value: "1" },
      { name: "KAFKA_TRANSACTION_STATE_LOG_MIN_ISR", value: "1" },
      { name: "KAFKA_LOG_DIRS", value: "/tmp/kraft-combined-logs" },
      { name: "CLUSTER_ID", value: "MkU3OEVBNTcwNTJENDM2Qk" },
    ];

    // ADVERTISED_LISTENERS 根据环境决定
    const advertisedListeners = this.getAdvertisedListeners(env);

    return [...baseEnv, { name: "KAFKA_ADVERTISED_LISTENERS", value: advertisedListeners }];
  }

  /**
   * 获取 Kafka ADVERTISED_LISTENERS 配置
   *
   * 这是 Kafka 在 local 环境的核心配置：
   *
   * Local 场景：
   * 1. 开发者通过 port-forward 暴露 Kafka 端口：
   *    kubectl port-forward svc/kafka-svc 9092:9092
   * 2. 应用连接 localhost:9092
   * 3. Kafka 返回 broker 地址给客户端
   * 4. 如果返回 Pod 内部地址，客户端无法连接
   * 5. 返回 localhost:9092，客户端可以继续使用 port-forward 连接
   *
   * Cloud 场景：
   * 1. 应用 Pod 和 Kafka Pod 在同一 Kubernetes 集群
   * 2. 使用 Service DNS 直接通信
   * 3. 无需 port-forward
   */
  private getAdvertisedListeners(env: MiddlewareEnvironment): string {
    if (this.isLocalEnvironment(env)) {
      // Local 环境: 返回 localhost，配合 port-forward 使用
      return "PLAINTEXT://localhost:9092";
    } else {
      // Cloud 环境: 返回 Service DNS
      const serviceDNS = this.buildServiceDNS(env, 9092);
      return `PLAINTEXT://${serviceDNS}`;
    }
  }
}
