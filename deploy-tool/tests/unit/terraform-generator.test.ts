import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { TerraformGenerator } from '../../src/terraform/generator.js';
import { LocalProvider } from '../../src/providers/local.js';
import { FinalConfig } from '../../src/types.js';
import { existsSync } from 'fs';
import { rm, readFile } from 'fs/promises';
import { join } from 'path';

describe('TerraformGenerator', () => {
  let config: FinalConfig;
  let provider: LocalProvider;
  let generator: TerraformGenerator;
  const outputDir = './test-terraform-output';

  beforeEach(() => {
    // 创建测试配置
    config = {
      version: '1.0.0',
      environment: 'test',
      provider: 'local',
      generatedAt: new Date().toISOString(),
      components: {
        main: {
          name: '业务逻辑组件',
          enabled: true,
          deploymentType: 'container',
          host: 'localhost',
          port: 3000,
          publicUrl: 'http://localhost:3000',
          endpoint: '',
          replicas: 1,
          middlewareDependencies: {
            mainDb: {
              type: 'postgresql',
              deploymentType: 'container',
              use: 'postgresql',
              endpoint: '',
              replicas: 1,
              config: {
                username: 'testuser',
                password: 'testpass',
                database: 'testdb'
              }
            }
          },
          externalServices: {},
          applicationConfig: {}
        }
      },
      componentUrls: {}
    };

    provider = new LocalProvider();
    generator = new TerraformGenerator(config, provider, outputDir);
  });

  afterEach(async () => {
    // 清理测试生成的文件
    if (existsSync(outputDir)) {
      await rm(outputDir, { recursive: true, force: true });
    }
  });

  test('应该生成正确的 Namespace 配置', async () => {
    const namespaceConfig = await generator.generateNamespace();
    
    expect(namespaceConfig).toContain('module "namespace"');
    expect(namespaceConfig).toContain('namespace_name = "lit-test"');
    expect(namespaceConfig).toContain('environment    = "test"');
  });

  test('应该为 PostgreSQL 生成正确的 Deployment 和 Service', async () => {
    await generator.generate();

    // 验证文件是否生成
    const middlewareFile = join(outputDir, 'middleware-maindb.tf');
    expect(existsSync(middlewareFile)).toBe(true);

    // 读取并验证内容
    const content = await readFile(middlewareFile, 'utf-8');
    expect(content).toContain('module "middleware_maindb"');
    expect(content).toContain('module "service_maindb"');
    expect(content).toContain('image   = "postgres:14"');
    expect(content).toContain('"container_port": 5432');
    expect(content).toContain('command = []');
    expect(content).toContain('args    = []');
  });

  test('应该为应用组件生成正确的 Deployment 和 Service', async () => {
    await generator.generate();

    // 验证文件是否生成
    const componentFile = join(outputDir, 'component-main.tf');
    expect(existsSync(componentFile)).toBe(true);

    // 读取并验证内容
    const content = await readFile(componentFile, 'utf-8');
    expect(content).toContain('module "component_main"');
    expect(content).toContain('module "service_main"');
    expect(content).toContain('image   = "lit/main:latest"');
    expect(content).toContain('"container_port": 3000');
    expect(content).toContain('command = []');
    expect(content).toContain('args    = []');
  });

  test('应该跳过 local 类型的组件', async () => {
    // 修改配置为 local 类型
    config.components.main.deploymentType = 'local';
    generator = new TerraformGenerator(config, provider, outputDir);

    await generator.generate();

    // 验证组件文件不应该生成
    const componentFile = join(outputDir, 'component-main.tf');
    expect(existsSync(componentFile)).toBe(false);
  });

  test('应该生成 provider 配置文件', async () => {
    await generator.generate();

    const providerFile = join(outputDir, 'providers.tf');
    expect(existsSync(providerFile)).toBe(true);

    const content = await readFile(providerFile, 'utf-8');
    expect(content).toContain('terraform {');
    expect(content).toContain('required_version = ">= 1.5.0"');
    expect(content).toContain('provider "kubernetes"');
    expect(content).toContain('config_path');
  });

  test('应该只部署 container 类型的中间件', async () => {
    // 添加 cloud 类型的中间件
    config.components.main.middlewareDependencies.objectStorage = {
      type: 'minio',
      deploymentType: 'cloud',
      endpoint: 'https://tos-cn-beijing.volces.com',
      config: {}
    };

    generator = new TerraformGenerator(config, provider, outputDir);
    await generator.generate();

    // 验证 cloud 类型的中间件没有生成文件
    const objectStorageFile = join(outputDir, 'middleware-objectstorage.tf');
    expect(existsSync(objectStorageFile)).toBe(false);

    // 验证 container 类型的中间件有生成文件
    const mainDbFile = join(outputDir, 'middleware-maindb.tf');
    expect(existsSync(mainDbFile)).toBe(true);
  });

  test('应该创建输出目录如果不存在', async () => {
    expect(existsSync(outputDir)).toBe(false);
    
    await generator.generate();
    
    expect(existsSync(outputDir)).toBe(true);
  });

  test('应该生成所有必需的文件', async () => {
    await generator.generate();

    // 验证所有文件都存在
    expect(existsSync(join(outputDir, 'providers.tf'))).toBe(true);
    expect(existsSync(join(outputDir, 'namespace.tf'))).toBe(true);
    expect(existsSync(join(outputDir, 'middleware-maindb.tf'))).toBe(true);
    expect(existsSync(join(outputDir, 'component-main.tf'))).toBe(true);
  });
});

