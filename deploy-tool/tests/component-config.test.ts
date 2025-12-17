/**
 * Component 配置测试
 * 验证重构后的 component 配置系统
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  ComponentConfigFactory,
  ComponentContext,
  NodeJSAppConfig
} from '../src/terraform/component/index.js';

describe('Component Config Factory', () => {
  beforeEach(() => {
    // 每个测试前重新初始化工厂
    ComponentConfigFactory.clear();
    ComponentConfigFactory.initialize();
  });

  it('should have nodejs type registered by default', () => {
    const types = ComponentConfigFactory.getRegisteredTypes();
    expect(types).toContain('nodejs');
  });

  it('should create NodeJS config for default components', () => {
    const ctx: ComponentContext = {
      componentName: 'main-app',
      config: {
        name: 'main-app',
        enabled: true,
        host: 'localhost',
        port: 3000,
        publicUrl: 'http://localhost:3000',
        endpoint: '/api',
        middlewareDependencies: {},
        externalServices: {},
        applicationConfig: {}
      },
      environment: 'development',
      provider: 'local',
      namespace: 'test-ns'
    };

    const config = ComponentConfigFactory.create(ctx);
    expect(config).toBeInstanceOf(NodeJSAppConfig);
  });

  it('should infer type from component name', () => {
    const pythonCtx: ComponentContext = {
      componentName: 'python-worker',
      config: {
        name: 'python-worker',
        enabled: true,
        host: 'localhost',
        port: 5000,
        publicUrl: 'http://localhost:5000',
        endpoint: '/api',
        middlewareDependencies: {},
        externalServices: {},
        applicationConfig: {}
      },
      environment: 'development',
      provider: 'local',
      namespace: 'test-ns'
    };

    // 目前 python 未注册，应该抛出错误
    expect(() => ComponentConfigFactory.create(pythonCtx)).toThrow('Unknown component type: python');
  });

  it('should support custom registration', () => {
    class CustomAppConfig extends NodeJSAppConfig {
      getImageConfig(ctx: ComponentContext) {
        return {
          repository: 'custom-registry',
          name: 'my-app',
          tag: 'v1.0.0',
          command: ['node'],
          args: ['custom.js']
        };
      }
    }

    ComponentConfigFactory.register('custom' as any, () => new CustomAppConfig());
    
    const ctx: ComponentContext = {
      componentName: 'custom-app',
      config: {
        name: 'custom-app',
        enabled: true,
        host: 'localhost',
        port: 8080,
        publicUrl: 'http://localhost:8080',
        endpoint: '/api',
        middlewareDependencies: {},
        externalServices: {},
        applicationConfig: {},
        type: 'custom'
      } as any,
      environment: 'production',
      provider: 'volcengine',
      namespace: 'prod-ns'
    };

    const config = ComponentConfigFactory.create(ctx);
    const imageConfig = config.getImageConfig(ctx);
    
    expect(imageConfig.repository).toBe('custom-registry');
    expect(imageConfig.name).toBe('my-app');
    expect(imageConfig.tag).toBe('v1.0.0');
  });
});

describe('NodeJS App Config', () => {
  let config: NodeJSAppConfig;
  let localCtx: ComponentContext;
  let cloudCtx: ComponentContext;

  beforeEach(() => {
    config = new NodeJSAppConfig();

    localCtx = {
      componentName: 'main-app',
      config: {
        name: 'main-app',
        enabled: true,
        host: 'localhost',
        port: 3000,
        publicUrl: 'http://localhost:3000',
        endpoint: '/api',
        middlewareDependencies: {},
        externalServices: {},
        applicationConfig: {
          database: {
            host: 'postgres-svc',
            port: 5432,
            name: 'mydb'
          },
          redis: {
            host: 'redis-svc',
            port: 6379
          },
          features: {
            enableCache: true,
            maxConnections: 100
          }
        }
      },
      environment: 'development',
      provider: 'local',
      namespace: 'dev-ns'
    };

    cloudCtx = {
      componentName: 'main-app',
      config: {
        name: 'main-app',
        enabled: true,
        host: 'main-app.example.com',
        port: 3000,
        publicUrl: 'https://main-app.example.com',
        endpoint: '/api',
        middlewareDependencies: {},
        externalServices: {},
        applicationConfig: {}
      },
      environment: 'production',
      provider: 'volcengine',
      namespace: 'prod-ns'
    };
  });

  describe('Image Configuration', () => {
    it('should generate correct image config', () => {
      const imageConfig = config.getImageConfig(localCtx);

      expect(imageConfig.repository).toBe('lit');
      expect(imageConfig.name).toBe('main-app');
      expect(imageConfig.tag).toBe('latest');
      expect(imageConfig.command).toEqual([]);
      expect(imageConfig.args).toEqual([]);
    });

    it('should use IMAGE_TAG environment variable if set', () => {
      process.env.IMAGE_TAG = 'v2.5.0';
      
      const imageConfig = config.getImageConfig(localCtx);
      expect(imageConfig.tag).toBe('v2.5.0');
      
      delete process.env.IMAGE_TAG;
    });
  });

  describe('Container Specification', () => {
    it('should generate container spec with correct ports', () => {
      const containerSpec = config.getContainerSpec(localCtx);

      expect(containerSpec.image).toBe('lit/main-app:latest');
      expect(containerSpec.ports).toHaveLength(1);
      expect(containerSpec.ports[0].container_port).toBe(3000);
      expect(containerSpec.ports[0].name).toBe('http');
      expect(containerSpec.ports[0].protocol).toBe('TCP');
    });

    it('should include base environment variables', () => {
      const containerSpec = config.getContainerSpec(localCtx);
      
      const nodeEnv = containerSpec.env.find(e => e.name === 'NODE_ENV');
      const port = containerSpec.env.find(e => e.name === 'PORT');

      expect(nodeEnv?.value).toBe('development');
      expect(port?.value).toBe('3000');
    });

    it('should convert applicationConfig to environment variables', () => {
      const containerSpec = config.getContainerSpec(localCtx);
      
      // 测试嵌套对象转换
      const dbHost = containerSpec.env.find(e => e.name === 'DATABASE_HOST');
      const dbPort = containerSpec.env.find(e => e.name === 'DATABASE_PORT');
      const dbName = containerSpec.env.find(e => e.name === 'DATABASE_NAME');

      expect(dbHost?.value).toBe('postgres-svc');
      expect(dbPort?.value).toBe('5432');
      expect(dbName?.value).toBe('mydb');

      // 测试 Redis 配置
      const redisHost = containerSpec.env.find(e => e.name === 'REDIS_HOST');
      const redisPort = containerSpec.env.find(e => e.name === 'REDIS_PORT');

      expect(redisHost?.value).toBe('redis-svc');
      expect(redisPort?.value).toBe('6379');

      // 测试 features 配置
      const enableCache = containerSpec.env.find(e => e.name === 'FEATURES_ENABLECACHE');
      const maxConnections = containerSpec.env.find(e => e.name === 'FEATURES_MAXCONNECTIONS');

      expect(enableCache?.value).toBe('true');
      expect(maxConnections?.value).toBe('100');
    });
  });

  describe('Service Specification', () => {
    it('should use NodePort for local environment', () => {
      const serviceSpec = config.getServiceSpec(localCtx);
      expect(serviceSpec.type).toBe('NodePort');
    });

    it('should use LoadBalancer for cloud environment', () => {
      const serviceSpec = config.getServiceSpec(cloudCtx);
      expect(serviceSpec.type).toBe('LoadBalancer');
    });

    it('should configure correct service ports', () => {
      const serviceSpec = config.getServiceSpec(localCtx);

      expect(serviceSpec.ports).toHaveLength(1);
      expect(serviceSpec.ports[0].name).toBe('http');
      expect(serviceSpec.ports[0].port).toBe(3000);
      expect(serviceSpec.ports[0].target_port).toBe(3000);
      expect(serviceSpec.ports[0].protocol).toBe('TCP');
    });
  });

  describe('Resource Configuration', () => {
    it('should use smaller resources for local environment', () => {
      const resources = config.getResources(localCtx);

      expect(resources.limits.cpu).toBe('500m');
      expect(resources.limits.memory).toBe('512Mi');
      expect(resources.requests.cpu).toBe('100m');
      expect(resources.requests.memory).toBe('128Mi');
    });

    it('should use larger resources for cloud environment', () => {
      const resources = config.getResources(cloudCtx);

      expect(resources.limits.cpu).toBe('1000m');
      expect(resources.limits.memory).toBe('1Gi');
      expect(resources.requests.cpu).toBe('200m');
      expect(resources.requests.memory).toBe('256Mi');
    });
  });

  describe('Health Checks (Probes)', () => {
    it('should configure HTTP liveness probe', () => {
      const probes = config.getProbes(localCtx);

      expect(probes.liveness).not.toBeNull();
      expect(probes.liveness?.type).toBe('http');
      
      const httpConfig = probes.liveness?.config as any;
      expect(httpConfig.path).toBe('/health');
      expect(httpConfig.port).toBe(3000);
      expect(httpConfig.scheme).toBe('HTTP');
      
      expect(probes.liveness?.initial_delay_seconds).toBe(30);
      expect(probes.liveness?.period_seconds).toBe(10);
      expect(probes.liveness?.timeout_seconds).toBe(5);
      expect(probes.liveness?.success_threshold).toBe(1);
      expect(probes.liveness?.failure_threshold).toBe(3);
    });

    it('should configure HTTP readiness probe', () => {
      const probes = config.getProbes(localCtx);

      expect(probes.readiness).not.toBeNull();
      expect(probes.readiness?.type).toBe('http');
      
      const httpConfig = probes.readiness?.config as any;
      expect(httpConfig.path).toBe('/health');
      expect(httpConfig.port).toBe(3000);
      expect(httpConfig.scheme).toBe('HTTP');
      
      expect(probes.readiness?.initial_delay_seconds).toBe(10);
      expect(probes.readiness?.period_seconds).toBe(5);
      expect(probes.readiness?.timeout_seconds).toBe(3);
      expect(probes.readiness?.success_threshold).toBe(1);
      expect(probes.readiness?.failure_threshold).toBe(3);
    });

    it('should have different timing for liveness and readiness', () => {
      const probes = config.getProbes(localCtx);

      // Liveness 启动更晚，周期更长（给应用启动时间）
      expect(probes.liveness?.initial_delay_seconds).toBeGreaterThan(
        probes.readiness!.initial_delay_seconds
      );
      
      // Readiness 检查更频繁
      expect(probes.readiness?.period_seconds).toBeLessThan(
        probes.liveness!.period_seconds
      );
    });
  });

  describe('Application Config to Environment Variables Conversion', () => {
    it('should handle nested objects', () => {
      const containerSpec = config.getContainerSpec(localCtx);
      
      const envNames = containerSpec.env.map(e => e.name);
      
      expect(envNames).toContain('DATABASE_HOST');
      expect(envNames).toContain('DATABASE_PORT');
      expect(envNames).toContain('DATABASE_NAME');
    });

    it('should handle boolean values', () => {
      const containerSpec = config.getContainerSpec(localCtx);
      
      const enableCache = containerSpec.env.find(e => e.name === 'FEATURES_ENABLECACHE');
      expect(enableCache?.value).toBe('true');
    });

    it('should handle number values', () => {
      const containerSpec = config.getContainerSpec(localCtx);
      
      const maxConnections = containerSpec.env.find(e => e.name === 'FEATURES_MAXCONNECTIONS');
      expect(maxConnections?.value).toBe('100');
    });

    it('should not include null or undefined values', () => {
      const ctxWithNull: ComponentContext = {
        ...localCtx,
        config: {
          ...localCtx.config,
          applicationConfig: {
            value1: null,
            value2: undefined,
            value3: 'valid'
          }
        }
      };

      const containerSpec = config.getContainerSpec(ctxWithNull);
      
      const envNames = containerSpec.env.map(e => e.name);
      
      expect(envNames).not.toContain('VALUE1');
      expect(envNames).not.toContain('VALUE2');
      expect(envNames).toContain('VALUE3');
    });
  });
});

