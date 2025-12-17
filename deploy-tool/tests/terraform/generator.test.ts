import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { TerraformGenerator } from '../../src/terraform/generator.js';
import { LocalProvider } from '../../src/providers/local.js';
import { FinalConfig } from '../../src/types.js';
import { readFile, rm } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * TerraformGenerator 测试
 * 
 * 测试目标：
 * 1. 验证云服务资源生成正确
 * 2. 验证引用映射正确
 * 3. 验证 depends_on 生成正确
 */
describe('TerraformGenerator', () => {
  const testOutputDir = join(__dirname, '../../terraform/test-generated');
  let provider: LocalProvider;

  beforeEach(() => {
    provider = new LocalProvider();
  });

  afterEach(async () => {
    // 清理测试生成的文件
    if (existsSync(testOutputDir)) {
      await rm(testOutputDir, { recursive: true, force: true });
    }
  });

  describe('云服务资源生成', () => {
    test('local provider 不应该生成云服务资源', async () => {
      const config: FinalConfig = {
        version: '1.0.0',
        environment: 'test',
        provider: 'local',
        generatedAt: new Date().toISOString(),
        components: {
          main: {
            name: '测试组件',
            enabled: true,
            deploymentType: 'local',
            host: 'localhost',
            port: 3000,
            publicUrl: 'http://localhost:3000',
            endpoint: 'localhost:3000',
            middlewareDependencies: {
              redis: {
                type: 'redis',
                deploymentType: 'container',
                use: 'redis',
                endpoint: 'redis-svc:6379',
                config: { password: 'test123' }
              }
            },
            externalServices: {},
            applicationConfig: {}
          }
        },
        componentUrls: {}
      };

      const generator = new TerraformGenerator(config, provider, testOutputDir);
      await generator.generate();

      // 不应该有 cloud-*.tf 文件
      const files = await import('fs/promises').then(m => m.readdir(testOutputDir));
      const cloudFiles = files.filter(f => f.startsWith('cloud-'));
      
      expect(cloudFiles.length).toBe(0);
    });

    test('应该为云服务生成正确的 Terraform 配置', async () => {
      const config: FinalConfig = {
        version: '1.0.0',
        environment: 'prod',
        provider: 'volcengine',
        generatedAt: new Date().toISOString(),
        components: {
          communication: {
            name: '通信组件',
            enabled: true,
            deploymentType: 'container',
            host: 'communication',
            port: 3001,
            publicUrl: 'http://communication:3001',
            endpoint: 'communication:3001',
            middlewareDependencies: {
              redis: {
                type: 'redis',
                deploymentType: 'cloud',
                endpoint: 'redis-prod.redis.volces.com:6379',
                config: { 
                  password: 'redispass123',
                  cloudSpec: { region: 'cn-beijing' }
                }
              }
            },
            externalServices: {},
            applicationConfig: {}
          }
        },
        componentUrls: {}
      };

      const generator = new TerraformGenerator(config, provider, testOutputDir);
      await generator.generate();

      // 应该生成 cloud-redis.tf
      const cloudRedisPath = join(testOutputDir, 'cloud-redis.tf');
      expect(existsSync(cloudRedisPath)).toBe(true);

      const content = await readFile(cloudRedisPath, 'utf-8');
      
      // 验证 module 定义
      expect(content).toContain('module "cloud_redis"');
      expect(content).toContain('source = "../modules/cloud/volcengine/redis"');
      
      // 验证配置参数
      expect(content).toContain('resource_name =');
      expect(content).toMatch(/environment\s*=\s*"prod"/);
      expect(content).toContain('password = "redispass123"');
      
      // 验证 output
      expect(content).toContain('output "cloud_redis_endpoint"');
      expect(content).toContain('value = module.cloud_redis.endpoint');
    });

    test('应该为 PostgreSQL 生成正确的配置', async () => {
      const config: FinalConfig = {
        version: '1.0.0',
        environment: 'prod',
        provider: 'volcengine',
        generatedAt: new Date().toISOString(),
        components: {
          main: {
            name: '主组件',
            enabled: true,
            deploymentType: 'container',
            host: 'main',
            port: 3000,
            publicUrl: 'http://main:3000',
            endpoint: 'main:3000',
            middlewareDependencies: {
              mainDb: {
                type: 'postgresql',
                deploymentType: 'cloud',
                endpoint: 'pg-prod.rds.volces.com:5432',
                config: { 
                  username: 'pgadmin',
                  password: 'pgpass123',
                  database: 'litdb',
                  cloudSpec: { storage: 200 }
                }
              }
            },
            externalServices: {},
            applicationConfig: {}
          }
        },
        componentUrls: {}
      };

      const generator = new TerraformGenerator(config, provider, testOutputDir);
      await generator.generate();

      const cloudPgPath = join(testOutputDir, 'cloud-maindb.tf');
      expect(existsSync(cloudPgPath)).toBe(true);

      const content = await readFile(cloudPgPath, 'utf-8');
      
      expect(content).toContain('module "cloud_maindb"');
      expect(content).toContain('source = "../modules/cloud/volcengine/rds-postgresql"');
      expect(content).toContain('database_name = "litdb"');
      expect(content).toContain('username = "pgadmin"');
      expect(content).toContain('password = "pgpass123"');
      expect(content).toContain('storage_size = 200');
    });
  });

  describe('引用映射', () => {
    test('应该将云服务引用转换为 Terraform 引用', async () => {
      const config: FinalConfig = {
        version: '1.0.0',
        environment: 'prod',
        provider: 'volcengine',
        generatedAt: new Date().toISOString(),
        components: {
          communication: {
            name: '通信组件',
            enabled: true,
            deploymentType: 'container',
            host: 'communication',
            port: 3001,
            publicUrl: 'http://communication:3001',
            endpoint: 'communication:3001',
            middlewareDependencies: {
              redis: {
                type: 'redis',
                deploymentType: 'cloud',
                endpoint: 'redis-prod.redis.volces.com:6379',
                config: { password: 'redispass123' }
              },
              centrifugo: {
                type: 'centrifugo',
                deploymentType: 'container',
                use: 'centrifugo',
                endpoint: 'centrifugo-svc:8000',
                replicas: 1,
                dependencies: ['components.communication.middlewareDependencies.redis'],
                config: {
                  engine: 'redis',
                  tokenHmacSecretKey: 'secret',
                  // 注意：这里的引用在实际运行时会被 endpointManager 解析
                  // 但在这个测试中，我们直接使用具体值
                  redisAddress: 'redis-prod.redis.volces.com:6379',
                  redisPassword: 'redispass123'
                }
              }
            },
            externalServices: {},
            applicationConfig: {}
          }
        },
        componentUrls: {}
      };

      const generator = new TerraformGenerator(config, provider, testOutputDir);
      await generator.generate();

      const centrifugoPath = join(testOutputDir, 'middleware-centrifugo.tf');
      expect(existsSync(centrifugoPath)).toBe(true);

      const content = await readFile(centrifugoPath, 'utf-8');
      
      // 验证 depends_on
      expect(content).toContain('depends_on');
      expect(content).toContain('module.cloud_redis');
      
      // 验证环境变量包含 Redis 配置 (Centrifugo v6+ 使用新的命名)
      expect(content).toContain('CENTRIFUGO_ENGINE_REDIS_ADDRESS');
      expect(content).toContain('CENTRIFUGO_ENGINE_REDIS_PASSWORD');
    });
  });

  describe('容器中间件生成', () => {
    test('应该生成容器中间件的配置', async () => {
      const config: FinalConfig = {
        version: '1.0.0',
        environment: 'dev',
        provider: 'local',
        generatedAt: new Date().toISOString(),
        components: {
          main: {
            name: '主组件',
            enabled: true,
            deploymentType: 'local',
            host: 'localhost',
            port: 3000,
            publicUrl: 'http://localhost:3000',
            endpoint: 'localhost:3000',
            middlewareDependencies: {
              redis: {
                type: 'redis',
                version: '7.0',
                deploymentType: 'container',
                use: 'redis',
                endpoint: 'redis-svc:6379',
                replicas: 1,
                config: { password: 'redis123' }
              }
            },
            externalServices: {},
            applicationConfig: {}
          }
        },
        componentUrls: {}
      };

      const generator = new TerraformGenerator(config, provider, testOutputDir);
      await generator.generate();

      const redisPath = join(testOutputDir, 'middleware-redis.tf');
      expect(existsSync(redisPath)).toBe(true);

      const content = await readFile(redisPath, 'utf-8');
      
      expect(content).toContain('module "middleware_redis"');
      expect(content).toContain('module "service_redis"');
      expect(content).toContain('deployment_name = "redis"');
      expect(content).toMatch(/replicas\s*=\s*1/);
    });
  });

  describe('完整流程测试', () => {
    test('应该生成所有必需的文件', async () => {
      const config: FinalConfig = {
        version: '1.0.0',
        environment: 'dev',
        provider: 'local',
        generatedAt: new Date().toISOString(),
        components: {
          main: {
            name: '主组件',
            enabled: true,
            deploymentType: 'local',
            host: 'localhost',
            port: 3000,
            publicUrl: 'http://localhost:3000',
            endpoint: 'localhost:3000',
            middlewareDependencies: {
              mainDb: {
                type: 'postgresql',
                version: '14',
                deploymentType: 'container',
                use: 'postgresql',
                endpoint: 'maindb-svc:5432',
                replicas: 1,
                config: {
                  username: 'pgadmin',
                  password: 'pgadmin',
                  database: 'litdb'
                }
              }
            },
            externalServices: {},
            applicationConfig: {}
          }
        },
        componentUrls: {}
      };

      const generator = new TerraformGenerator(config, provider, testOutputDir);
      await generator.generate();

      // 验证基础文件
      expect(existsSync(join(testOutputDir, 'providers.tf'))).toBe(true);
      expect(existsSync(join(testOutputDir, 'namespace.tf'))).toBe(true);
      expect(existsSync(join(testOutputDir, 'middleware-maindb.tf'))).toBe(true);

      // 验证 providers.tf 内容
      const providersContent = await readFile(join(testOutputDir, 'providers.tf'), 'utf-8');
      expect(providersContent).toContain('provider "kubernetes"');
      expect(providersContent).toContain('required_version = ">= 1.5.0"');
    });
  });
});

