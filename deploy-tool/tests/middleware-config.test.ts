/**
 * Middleware 配置测试
 * 验证重构后的 middleware 配置系统
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  MiddlewareConfigFactory,
  MiddlewareEnvironment,
  PostgreSQLMiddlewareConfig,
  PGliteMiddlewareConfig,
  MinIOMiddlewareConfig,
  KafkaMiddlewareConfig,
  RedisMiddlewareConfig,
  CentrifugoMiddlewareConfig
} from '../src/terraform/middleware/index.js';

describe('Middleware Config Factory', () => {
  beforeEach(() => {
    // 每个测试前重新初始化工厂
    MiddlewareConfigFactory.clear();
    MiddlewareConfigFactory.initialize();
  });

  it('should have all built-in middleware types registered', () => {
    const types = MiddlewareConfigFactory.getRegisteredTypes();
    expect(types).toContain('postgresql');
    expect(types).toContain('pglite');
    expect(types).toContain('minio');
    expect(types).toContain('kafka');
    expect(types).toContain('redis');
    expect(types).toContain('centrifugo');
  });

  it('should create PostgreSQL config', () => {
    const config = MiddlewareConfigFactory.create('postgresql');
    expect(config).toBeInstanceOf(PostgreSQLMiddlewareConfig);
    
    const mockEnv: MiddlewareEnvironment = {
      provider: 'local',
      namespace: 'test',
      middlewareName: 'postgres',
      config: {}
    };
    expect(config.getImage(mockEnv)).toBe('postgres:14');
  });

  it('should create Kafka config', () => {
    const config = MiddlewareConfigFactory.create('kafka');
    expect(config).toBeInstanceOf(KafkaMiddlewareConfig);
    
    const mockEnv: MiddlewareEnvironment = {
      provider: 'local',
      namespace: 'test',
      middlewareName: 'kafka',
      config: {}
    };
    expect(config.getImage(mockEnv)).toBe('apache/kafka:3.8.1');
  });

  it('should throw error for unknown middleware type', () => {
    expect(() => {
      MiddlewareConfigFactory.create('unknown-type');
    }).toThrow('Unknown middleware type: unknown-type');
  });

  it('should be case insensitive', () => {
    const config1 = MiddlewareConfigFactory.create('PostgreSQL');
    const config2 = MiddlewareConfigFactory.create('KAFKA');
    
    expect(config1).toBeInstanceOf(PostgreSQLMiddlewareConfig);
    expect(config2).toBeInstanceOf(KafkaMiddlewareConfig);
  });

  it('should support custom registration', () => {
    class CustomMiddlewareConfig extends PostgreSQLMiddlewareConfig {
      getImage(env: MiddlewareEnvironment): string {
        return 'custom:latest';
      }
    }

    MiddlewareConfigFactory.register('custom', () => new CustomMiddlewareConfig());
    
    const config = MiddlewareConfigFactory.create('custom');
    const mockEnv: MiddlewareEnvironment = {
      provider: 'local',
      namespace: 'test',
      middlewareName: 'custom',
      config: {}
    };
    expect(config.getImage(mockEnv)).toBe('custom:latest');
  });
});

describe('PostgreSQL Middleware Config', () => {
  let config: PostgreSQLMiddlewareConfig;
  let localEnv: MiddlewareEnvironment;
  let cloudEnv: MiddlewareEnvironment;

  beforeEach(() => {
    config = new PostgreSQLMiddlewareConfig();
    
    localEnv = {
      provider: 'local',
      namespace: 'test-ns',
      middlewareName: 'postgres',
      config: {
        username: 'testuser',
        password: 'testpass',
        database: 'testdb'
      }
    };

    cloudEnv = {
      provider: 'volcengine',
      namespace: 'prod-ns',
      middlewareName: 'postgres',
      config: {
        username: 'produser',
        password: 'prodpass',
        database: 'proddb'
      }
    };
  });

  it('should return correct image', () => {
    expect(config.getImage(localEnv)).toBe('postgres:14');
  });

  it('should generate container spec with custom config', () => {
    const spec = config.getContainerSpec(localEnv);
    
    expect(spec.image).toBe('postgres:14');
    expect(spec.ports).toHaveLength(1);
    expect(spec.ports[0].container_port).toBe(5432);
    
    expect(spec.env).toEqual([
      { name: 'POSTGRES_USER', value: 'testuser' },
      { name: 'POSTGRES_PASSWORD', value: 'testpass' },
      { name: 'POSTGRES_DB', value: 'testdb' }
    ]);
  });

  it('should use NodePort for local environment', () => {
    const spec = config.getServiceSpec(localEnv);
    expect(spec.type).toBe('NodePort');
  });

  it('should use LoadBalancer for cloud environment', () => {
    const spec = config.getServiceSpec(cloudEnv);
    expect(spec.type).toBe('LoadBalancer');
  });

  it('should have proper resource requirements', () => {
    const resources = config.getResources();
    
    expect(resources.limits.cpu).toBe('1000m');
    expect(resources.limits.memory).toBe('1Gi');
    expect(resources.requests.cpu).toBe('100m');
    expect(resources.requests.memory).toBe('256Mi');
  });
});

describe('Kafka Middleware Config - Local Environment Handling', () => {
  let config: KafkaMiddlewareConfig;
  let localEnv: MiddlewareEnvironment;
  let cloudEnv: MiddlewareEnvironment;

  beforeEach(() => {
    config = new KafkaMiddlewareConfig();
    
    localEnv = {
      provider: 'local',
      namespace: 'test-ns',
      middlewareName: 'kafka',
      config: {}
    };

    cloudEnv = {
      provider: 'volcengine',
      namespace: 'prod-ns',
      middlewareName: 'kafka',
      config: {}
    };
  });

  it('should use localhost for ADVERTISED_LISTENERS in local environment', () => {
    const spec = config.getContainerSpec(localEnv);
    
    const advertisedListenersEnv = spec.env.find(
      e => e.name === 'KAFKA_ADVERTISED_LISTENERS'
    );
    
    expect(advertisedListenersEnv).toBeDefined();
    expect(advertisedListenersEnv!.value).toBe('PLAINTEXT://localhost:9092');
  });

  it('should use Service DNS for ADVERTISED_LISTENERS in cloud environment', () => {
    const spec = config.getContainerSpec(cloudEnv);
    
    const advertisedListenersEnv = spec.env.find(
      e => e.name === 'KAFKA_ADVERTISED_LISTENERS'
    );
    
    expect(advertisedListenersEnv).toBeDefined();
    expect(advertisedListenersEnv!.value).toBe(
      'PLAINTEXT://kafka-svc.prod-ns.svc.cluster.local:9092'
    );
  });

  it('should have all required Kafka environment variables', () => {
    const spec = config.getContainerSpec(localEnv);
    
    const requiredEnvVars = [
      'KAFKA_NODE_ID',
      'KAFKA_PROCESS_ROLES',
      'KAFKA_LISTENERS',
      'KAFKA_ADVERTISED_LISTENERS',
      'KAFKA_CONTROLLER_LISTENER_NAMES',
      'KAFKA_LISTENER_SECURITY_PROTOCOL_MAP',
      'KAFKA_CONTROLLER_QUORUM_VOTERS',
      'KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR',
      'KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR',
      'KAFKA_TRANSACTION_STATE_LOG_MIN_ISR',
      'KAFKA_LOG_DIRS',
      'CLUSTER_ID'
    ];

    const envVarNames = spec.env.map(e => e.name);
    
    for (const required of requiredEnvVars) {
      expect(envVarNames).toContain(required);
    }
  });

  it('should use NodePort for local environment', () => {
    const spec = config.getServiceSpec(localEnv);
    expect(spec.type).toBe('NodePort');
  });

  it('should use LoadBalancer for cloud environment', () => {
    const spec = config.getServiceSpec(cloudEnv);
    expect(spec.type).toBe('LoadBalancer');
  });

  it('should have higher resource requirements than other middleware', () => {
    const resources = config.getResources();
    
    expect(resources.limits.cpu).toBe('2000m');
    expect(resources.limits.memory).toBe('4Gi');
    expect(resources.requests.cpu).toBe('200m');
    expect(resources.requests.memory).toBe('1Gi');
  });
});

describe('MinIO Middleware Config', () => {
  let config: MinIOMiddlewareConfig;
  let env: MiddlewareEnvironment;

  beforeEach(() => {
    config = new MinIOMiddlewareConfig();
    
    env = {
      provider: 'local',
      namespace: 'test-ns',
      middlewareName: 'minio',
      config: {
        accessKeyId: 'myaccesskey',
        secretAccessKey: 'mysecretkey'
      }
    };
  });

  it('should have two ports (API and Console)', () => {
    const spec = config.getContainerSpec(env);
    
    expect(spec.ports).toHaveLength(2);
    expect(spec.ports[0].container_port).toBe(9000);
    expect(spec.ports[0].name).toBe('api');
    expect(spec.ports[1].container_port).toBe(9001);
    expect(spec.ports[1].name).toBe('console');
  });

  it('should have correct startup args', () => {
    const spec = config.getContainerSpec(env);
    
    expect(spec.args).toEqual(['server', '/data', '--console-address', ':9001']);
  });

  it('should use custom credentials from config', () => {
    const spec = config.getContainerSpec(env);
    
    expect(spec.env).toEqual([
      { name: 'MINIO_ROOT_USER', value: 'myaccesskey' },
      { name: 'MINIO_ROOT_PASSWORD', value: 'mysecretkey' }
    ]);
  });

  it('should expose both ports in service', () => {
    const spec = config.getServiceSpec(env);
    
    expect(spec.ports).toHaveLength(2);
    expect(spec.ports[0].port).toBe(9000);
    expect(spec.ports[1].port).toBe(9001);
  });
});

describe('PGlite Middleware Config', () => {
  let config: PGliteMiddlewareConfig;
  let env: MiddlewareEnvironment;

  beforeEach(() => {
    config = new PGliteMiddlewareConfig();
    
    env = {
      provider: 'local',
      namespace: 'test-ns',
      middlewareName: 'pglite',
      config: {}
    };
  });

  it('should have lower resource requirements than PostgreSQL', () => {
    const pgliteResources = config.getResources();
    const postgresConfig = new PostgreSQLMiddlewareConfig();
    const postgresResources = postgresConfig.getResources();
    
    // 将资源字符串转换为数字进行比较
    const parseMemory = (mem: string) => {
      const match = mem.match(/(\d+)(Mi|Gi)/);
      if (!match) return 0;
      const value = parseInt(match[1]);
      const unit = match[2];
      return unit === 'Gi' ? value * 1024 : value;
    };

    const pgliteLimitMem = parseMemory(pgliteResources.limits.memory);
    const postgresLimitMem = parseMemory(postgresResources.limits.memory);
    
    expect(pgliteLimitMem).toBeLessThan(postgresLimitMem);
  });
});

describe('Redis Middleware Config', () => {
  let config: RedisMiddlewareConfig;
  let localEnv: MiddlewareEnvironment;
  let cloudEnv: MiddlewareEnvironment;

  beforeEach(() => {
    config = new RedisMiddlewareConfig();
    
    localEnv = {
      provider: 'local',
      namespace: 'test-ns',
      middlewareName: 'redis',
      config: {
        password: 'redis123456',
        maxmemory: '512mb',
        policy: 'allkeys-lru'
      }
    };

    cloudEnv = {
      provider: 'volcengine',
      namespace: 'prod-ns',
      middlewareName: 'redis',
      config: {
        password: 'prodpass',
        maxmemory: '1gb'
      }
    };
  });

  it('should return correct image with default version', () => {
    const env: MiddlewareEnvironment = {
      provider: 'local',
      namespace: 'test-ns',
      middlewareName: 'redis',
      config: {}
    };
    expect(config.getImage(env)).toBe('redis:7-alpine');
  });

  it('should return correct image with custom version', () => {
    const env: MiddlewareEnvironment = {
      provider: 'local',
      namespace: 'test-ns',
      middlewareName: 'redis',
      version: '7.0.15',
      config: {}
    };
    expect(config.getImage(env)).toBe('redis:7.0.15');
  });

  it('should generate container spec with password and config', () => {
    const spec = config.getContainerSpec(localEnv);
    
    expect(spec.image).toBe('redis:7-alpine');
    expect(spec.ports).toHaveLength(1);
    expect(spec.ports[0].container_port).toBe(6379);
    expect(spec.ports[0].name).toBe('redis');
    
    // 验证命令行参数包含配置
    expect(spec.args).toContain('--requirepass');
    expect(spec.args).toContain('redis123456');
    expect(spec.args).toContain('--maxmemory');
    expect(spec.args).toContain('512mb');
    expect(spec.args).toContain('--maxmemory-policy');
    expect(spec.args).toContain('allkeys-lru');
  });

  it('should handle missing optional config', () => {
    const env: MiddlewareEnvironment = {
      provider: 'local',
      namespace: 'test-ns',
      middlewareName: 'redis',
      config: {
        password: 'testpass'
      }
    };
    
    const spec = config.getContainerSpec(env);
    
    // 只有密码参数
    expect(spec.args).toContain('--requirepass');
    expect(spec.args).toContain('testpass');
    expect(spec.args).not.toContain('--maxmemory');
    expect(spec.args).not.toContain('--maxmemory-policy');
  });

  it('should use NodePort for local environment', () => {
    const spec = config.getServiceSpec(localEnv);
    expect(spec.type).toBe('NodePort');
    expect(spec.ports[0].port).toBe(6379);
  });

  it('should use LoadBalancer for cloud environment', () => {
    const spec = config.getServiceSpec(cloudEnv);
    expect(spec.type).toBe('LoadBalancer');
  });

  it('should have appropriate resource requirements', () => {
    const resources = config.getResources();
    
    expect(resources.limits.cpu).toBe('500m');
    expect(resources.limits.memory).toBe('512Mi');
    expect(resources.requests.cpu).toBe('50m');
    expect(resources.requests.memory).toBe('128Mi');
  });
});

describe('Centrifugo Middleware Config', () => {
  let config: CentrifugoMiddlewareConfig;
  let localEnv: MiddlewareEnvironment;
  let cloudEnv: MiddlewareEnvironment;

  beforeEach(() => {
    config = new CentrifugoMiddlewareConfig();
    
    localEnv = {
      provider: 'local',
      namespace: 'test-ns',
      middlewareName: 'centrifugo',
      config: {
        tokenHmacSecretKey: 'test-secret-key',
        engine: 'redis',
        redisAddress: 'redis-svc.test-ns.svc.cluster.local:6379',
        redisPassword: 'redis123456',
        redisDb: '0',
        allowedOrigins: ['http://localhost:3000', 'http://localhost:5173']
      }
    };

    cloudEnv = {
      provider: 'volcengine',
      namespace: 'prod-ns',
      middlewareName: 'centrifugo',
      config: {
        tokenHmacSecretKey: 'prod-secret-key',
        engine: 'redis',
        redisAddress: 'redis-svc.prod-ns.svc.cluster.local:6379',
        redisPassword: 'prodpass',
        admin: true,
        adminPassword: 'adminpass',
        apiKey: 'myapikey'
      }
    };
  });

  it('should return correct image with default version', () => {
    const env: MiddlewareEnvironment = {
      provider: 'local',
      namespace: 'test-ns',
      middlewareName: 'centrifugo',
      config: {}
    };
    expect(config.getImage(env)).toBe('centrifugo/centrifugo:v6.5.1');
  });

  it('should return correct image with custom version', () => {
    const env: MiddlewareEnvironment = {
      provider: 'local',
      namespace: 'test-ns',
      middlewareName: 'centrifugo',
      version: 'v5.4.0',
      config: {}
    };
    expect(config.getImage(env)).toBe('centrifugo/centrifugo:v5.4.0');
  });

  it('should generate container spec with Redis engine config', () => {
    const spec = config.getContainerSpec(localEnv);
    
    expect(spec.image).toBe('centrifugo/centrifugo:v6.5.1');
    expect(spec.ports).toHaveLength(1);
    expect(spec.ports[0].container_port).toBe(8000);
    expect(spec.ports[0].name).toBe('http');
    
    // 验证环境变量 (Centrifugo v6+ 使用新的命名)
    const envNames = spec.env.map(e => e.name);
    expect(envNames).toContain('CENTRIFUGO_CLIENT_TOKEN_HMAC_SECRET_KEY');
    expect(envNames).toContain('CENTRIFUGO_ENGINE_TYPE');
    expect(envNames).toContain('CENTRIFUGO_ENGINE_REDIS_ADDRESS');
    expect(envNames).toContain('CENTRIFUGO_ENGINE_REDIS_PASSWORD');
    expect(envNames).toContain('CENTRIFUGO_ENGINE_REDIS_DB');
    expect(envNames).toContain('CENTRIFUGO_CLIENT_ALLOWED_ORIGINS');
  });

  it('should set correct environment variable values', () => {
    const spec = config.getContainerSpec(localEnv);
    
    const getEnvValue = (name: string) => {
      const env = spec.env.find(e => e.name === name);
      return env?.value;
    };
    
    expect(getEnvValue('CENTRIFUGO_CLIENT_TOKEN_HMAC_SECRET_KEY')).toBe('test-secret-key');
    expect(getEnvValue('CENTRIFUGO_ENGINE_TYPE')).toBe('redis');
    expect(getEnvValue('CENTRIFUGO_ENGINE_REDIS_ADDRESS')).toBe('redis-svc.test-ns.svc.cluster.local:6379');
    expect(getEnvValue('CENTRIFUGO_ENGINE_REDIS_PASSWORD')).toBe('redis123456');
    expect(getEnvValue('CENTRIFUGO_ENGINE_REDIS_DB')).toBe('0');
    expect(getEnvValue('CENTRIFUGO_CLIENT_ALLOWED_ORIGINS')).toBe('http://localhost:3000 http://localhost:5173');
  });

  it('should include admin config when provided', () => {
    const spec = config.getContainerSpec(cloudEnv);
    
    const envNames = spec.env.map(e => e.name);
    expect(envNames).toContain('CENTRIFUGO_ADMIN_ENABLED');
    expect(envNames).toContain('CENTRIFUGO_ADMIN_PASSWORD');
    expect(envNames).toContain('CENTRIFUGO_HTTP_API_KEY');
    
    const getEnvValue = (name: string) => {
      const env = spec.env.find(e => e.name === name);
      return env?.value;
    };
    
    expect(getEnvValue('CENTRIFUGO_ADMIN_ENABLED')).toBe('true');
    expect(getEnvValue('CENTRIFUGO_ADMIN_PASSWORD')).toBe('adminpass');
    expect(getEnvValue('CENTRIFUGO_HTTP_API_KEY')).toBe('myapikey');
  });

  it('should handle minimal config (only secret key)', () => {
    const env: MiddlewareEnvironment = {
      provider: 'local',
      namespace: 'test-ns',
      middlewareName: 'centrifugo',
      config: {
        tokenHmacSecretKey: 'minimal-secret'
      }
    };
    
    const spec = config.getContainerSpec(env);
    
    // 只有必需的 secret key
    const envNames = spec.env.map(e => e.name);
    expect(envNames).toContain('CENTRIFUGO_CLIENT_TOKEN_HMAC_SECRET_KEY');
    expect(envNames).not.toContain('CENTRIFUGO_ENGINE_TYPE');
  });

  it('should use NodePort for local environment', () => {
    const spec = config.getServiceSpec(localEnv);
    expect(spec.type).toBe('NodePort');
    expect(spec.ports[0].port).toBe(8000);
  });

  it('should use LoadBalancer for cloud environment', () => {
    const spec = config.getServiceSpec(cloudEnv);
    expect(spec.type).toBe('LoadBalancer');
  });

  it('should have appropriate resource requirements', () => {
    const resources = config.getResources();
    
    expect(resources.limits.cpu).toBe('1000m');
    expect(resources.limits.memory).toBe('1Gi');
    expect(resources.requests.cpu).toBe('100m');
    expect(resources.requests.memory).toBe('256Mi');
  });
});

