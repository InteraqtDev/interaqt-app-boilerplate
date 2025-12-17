#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { ApplicationConfig, DeploymentConfig, FinalConfig } from './types';

// ES Module 中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 生成 app.config.json 配置文件
 * 根据 application.json 和 deploy.{env}.json 合并生成最终配置
 */

interface ValidationError {
  component: string;
  type: 'missing_field' | 'deployment_type_conflict' | 'missing_use_field';
  message: string;
}

class ConfigGenerator {
  private errors: ValidationError[] = [];
  
  constructor(
    private applicationConfig: ApplicationConfig,
    private deploymentConfig: DeploymentConfig,
    private environment: string,
    private existingConfig?: FinalConfig  // 现有配置，用于复用 endpoints
  ) {}

  /**
   * 生成最终配置
   */
  generate(): FinalConfig | null {
    // 先进行所有验证
    this.validateRequiredFields();
    this.validateDeploymentTypes();
    
    // 如果有错误，返回 null
    if (this.errors.length > 0) {
      this.printErrors();
      return null;
    }
    
    // 生成最终配置
    return this.mergeConfigs();
  }
  
  /**
   * 验证必填字段
   */
  private validateRequiredFields(): void {
    for (const [componentName, appComponent] of Object.entries(this.applicationConfig.components)) {
      const deployComponent = this.deploymentConfig.components[componentName];
      
      if (!deployComponent) {
        this.errors.push({
          component: componentName,
          type: 'missing_field',
          message: `Component '${componentName}' 在 deploy.${this.environment}.json 中不存在`
        });
        continue;
      }
      
      // 验证 middlewareDependencies 的必填字段
      for (const [depName, appDep] of Object.entries(appComponent.middlewareDependencies)) {
        const deployDep = deployComponent.middlewareDependencies[depName];
        
        if (!deployDep) {
          this.errors.push({
            component: componentName,
            type: 'missing_field',
            message: `Middleware dependency '${depName}' 在 ${componentName} 的 deploy 配置中不存在`
          });
          continue;
        }
        
        // 检查必填字段
        for (const field of appDep.requiredFields) {
          if (!(field in deployDep.config)) {
            this.errors.push({
              component: componentName,
              type: 'missing_field',
              message: `Middleware '${depName}' 缺少必填字段: ${field}`
            });
          }
        }
      }
      
      // 验证 externalServices 的必填字段
      for (const [serviceName, appService] of Object.entries(appComponent.externalServices)) {
        const deployService = deployComponent.externalServices[serviceName];
        
        if (!deployService) {
          this.errors.push({
            component: componentName,
            type: 'missing_field',
            message: `External service '${serviceName}' 在 ${componentName} 的 deploy 配置中不存在`
          });
          continue;
        }
        
        // 如果 config 是空对象，跳过验证（表示该服务不启用）
        if (Object.keys(deployService.config).length === 0) {
          continue;
        }
        
        // 检查必填字段
        for (const field of appService.requiredFields) {
          if (!(field in deployService.config)) {
            this.errors.push({
              component: componentName,
              type: 'missing_field',
              message: `External service '${serviceName}' 缺少必填字段: ${field}`
            });
          }
        }
      }
      
      // 验证 applicationConfig 的必填字段
      for (const [configName, appConfigReq] of Object.entries(appComponent.applicationConfig)) {
        const deployAppConfig = deployComponent.applicationConfig[configName];
        
        if (!deployAppConfig) {
          this.errors.push({
            component: componentName,
            type: 'missing_field',
            message: `Application config '${configName}' 在 ${componentName} 的 deploy 配置中不存在`
          });
          continue;
        }
        
        // 检查必填字段
        for (const field of appConfigReq.requiredFields) {
          if (!(field in deployAppConfig)) {
            this.errors.push({
              component: componentName,
              type: 'missing_field',
              message: `Application config '${configName}' 缺少必填字段: ${field}`
            });
          }
        }
      }
    }
  }
  
  /**
   * 验证 deploymentType 规则
   */
  private validateDeploymentTypes(): void {
    const provider = this.deploymentConfig.provider;
    
    for (const [componentName, deployComponent] of Object.entries(this.deploymentConfig.components)) {
      // 验证 component 的 deploymentType
      if (provider === 'local') {
        if (deployComponent.deploymentType !== 'local' && deployComponent.deploymentType !== 'container') {
          this.errors.push({
            component: componentName,
            type: 'deployment_type_conflict',
            message: `当 provider 为 'local' 时，component '${componentName}' 的 deploymentType 只能是 'local' 或 'container'，当前为 '${deployComponent.deploymentType}'`
          });
        }
      } else {
        if (deployComponent.deploymentType !== 'container') {
          this.errors.push({
            component: componentName,
            type: 'deployment_type_conflict',
            message: `当 provider 不是 'local' 时，component '${componentName}' 的 deploymentType 只能是 'container'，当前为 '${deployComponent.deploymentType}'`
          });
        }
      }
      
      // 验证 middleware 的 deploymentType 和 use 字段
      for (const [depName, deployDep] of Object.entries(deployComponent.middlewareDependencies)) {
        if (deployDep.deploymentType === 'container' && !deployDep.use) {
          this.errors.push({
            component: componentName,
            type: 'missing_use_field',
            message: `Middleware '${depName}' 的 deploymentType 为 'container'，必须指定 'use' 字段`
          });
        }
      }
    }
  }
  
  /**
   * 合并配置
   */
  private mergeConfigs(): FinalConfig {
    const finalConfig: FinalConfig = {
      version: this.applicationConfig.version,
      environment: this.environment,
      provider: this.deploymentConfig.provider,
      generatedAt: new Date().toISOString(),
      components: {},
      componentUrls: {}
    };
    
    // 合并各个组件的配置
    for (const [componentName, appComponent] of Object.entries(this.applicationConfig.components)) {
      const deployComponent = this.deploymentConfig.components[componentName];
      
      if (!deployComponent) {
        continue; // 这种情况在 validation 阶段应该已经报错了
      }
      
      // 生成 publicUrl
      const publicUrl = `http://${deployComponent.host}:${deployComponent.port}`;
      
      // 复用现有配置中的组件级 endpoint（如果存在）
      const existingComponent = this.existingConfig?.components?.[componentName];
      
      // 构建基础配置
      const componentConfig: any = {
        name: appComponent.name,
        enabled: true,
        host: deployComponent.host,
        port: deployComponent.port,
        publicUrl: publicUrl,
        endpoint: existingComponent?.endpoint || '', // 复用现有 endpoint，否则为空
        middlewareDependencies: {},
        externalServices: {},
        applicationConfig: {}
      };
      
      // 复用现有配置中的 deploymentType 和 replicas（如果存在）
      if (existingComponent?.deploymentType) {
        componentConfig.deploymentType = existingComponent.deploymentType;
      } else if (deployComponent.deploymentType) {
        componentConfig.deploymentType = deployComponent.deploymentType;
      }
      if (existingComponent?.replicas) {
        componentConfig.replicas = existingComponent.replicas;
      } else if (deployComponent.replicas) {
        componentConfig.replicas = deployComponent.replicas;
      }
      
      finalConfig.components[componentName] = componentConfig;
      
      // 合并 middlewareDependencies
      for (const [depName, appDep] of Object.entries(appComponent.middlewareDependencies)) {
        const deployDep = deployComponent.middlewareDependencies[depName];
        
        if (deployDep) {
          // 合并 application.json 和 deploy.{env}.json 的 config
          const mergedConfig = {
            ...(appDep.config || {}),
            ...deployDep.config
          };

          // 获取现有配置中的 endpoints（如果存在）
          const existingEndpoints = this.existingConfig?.components?.[componentName]
            ?.middlewareDependencies?.[depName]?.endpoints;

          // 合并 endpoints 配置，复用现有的 endpoints 信息
          const mergedEndpoints = this.mergeEndpoints(appDep.endpoints, mergedConfig.publicAccess, existingEndpoints);

          finalConfig.components[componentName].middlewareDependencies[depName] = {
            type: appDep.type,
            version: deployDep.version || appDep.version,
            deploymentType: deployDep.deploymentType,
            use: deployDep.use,
            endpoints: mergedEndpoints,
            replicas: deployDep.replicas,
            dependencies: deployDep.dependencies,
            config: mergedConfig
          };
        }
      }
      
      // 添加 deploy.{env}.json 中额外的 middleware（在 application.json 中未定义的）
      // 这些通常是为了支持其他 middleware 而添加的依赖，例如 centrifugo 依赖的 redis
      for (const [depName, deployDep] of Object.entries(deployComponent.middlewareDependencies)) {
        // 如果这个 middleware 在 application.json 中没有定义，但在 deploy.{env}.json 中存在
        if (!appComponent.middlewareDependencies[depName]) {
          // 获取现有配置中的 endpoints（如果存在）
          const existingEndpoints = this.existingConfig?.components?.[componentName]
            ?.middlewareDependencies?.[depName]?.endpoints;

          finalConfig.components[componentName].middlewareDependencies[depName] = {
            type: deployDep.use || (deployDep as any).type || depName,
            deploymentType: deployDep.deploymentType,
            use: deployDep.use,
            endpoints: existingEndpoints || {},  // 复用现有 endpoints，否则为空
            replicas: deployDep.replicas,
            dependencies: deployDep.dependencies,
            config: deployDep.config
          };
        }
      }
      
      // 合并 externalServices
      for (const [serviceName, appService] of Object.entries(appComponent.externalServices)) {
        const deployService = deployComponent.externalServices[serviceName];
        
        if (deployService) {
          // 如果 config 是空对象，表示该服务未启用
          const enabled = Object.keys(deployService.config).length > 0;
          
          finalConfig.components[componentName].externalServices[serviceName] = {
            provider: appService.provider,
            service: appService.service,
            enabled: enabled,
            config: deployService.config
          };
        }
      }
      
      // 合并 applicationConfig
      finalConfig.components[componentName].applicationConfig = deployComponent.applicationConfig;
      
      // 添加到 componentUrls
      finalConfig.componentUrls[componentName] = publicUrl;
    }
    
    return finalConfig;
  }
  
  /**
   * 合并 endpoints 配置
   * 优先级：
   * 1. 复用现有 app.config.json 中的 endpoints（保留 port/protocol/value 等由 deploy-tool 填充的字段）
   * 2. application.json 定义的 publicAccess
   * 3. deploy.{env}.json 的 config.publicAccess 可以覆盖 publicAccess 属性
   */
  private mergeEndpoints(
    appEndpoints?: Record<string, any>,
    publicAccessConfig?: boolean | Record<string, boolean>,
    existingEndpoints?: Record<string, any>  // 现有的 endpoints 配置
  ): Record<string, any> {
    const result: Record<string, any> = {};

    // 1. 先复用现有配置中的 endpoints（保留 port/protocol/value/description 等字段）
    if (existingEndpoints) {
      for (const [name, existingDef] of Object.entries(existingEndpoints)) {
        result[name] = { ...existingDef };
      }
    }

    // 2. 如果 application.json 定义了 endpoints，合并其 publicAccess 配置
    if (appEndpoints) {
      for (const [name, appDef] of Object.entries(appEndpoints)) {
        if (!result[name]) {
          result[name] = {};
        }
        // 只覆盖 publicAccess，保留其他字段
        result[name].publicAccess = appDef.publicAccess ?? result[name].publicAccess ?? false;
      }
    }

    // 3. deploy.{env}.json 的 config.publicAccess 可以覆盖
    if (publicAccessConfig !== undefined) {
      if (typeof publicAccessConfig === 'boolean') {
        // 如果是布尔值，应用于 main endpoint
        if (!result['main']) {
          result['main'] = {};
        }
        result['main'].publicAccess = publicAccessConfig;
      } else {
        // 如果是对象，分别覆盖各 endpoint
        for (const [name, access] of Object.entries(publicAccessConfig)) {
          if (!result[name]) {
            result[name] = {};
          }
          result[name].publicAccess = access;
        }
      }
    }

    return result;
  }

  /**
   * 打印错误信息
   */
  private printErrors(): void {
    console.error('\n❌ 配置验证失败，发现以下错误：\n');
    
    const errorsByComponent = new Map<string, ValidationError[]>();
    
    for (const error of this.errors) {
      if (!errorsByComponent.has(error.component)) {
        errorsByComponent.set(error.component, []);
      }
      errorsByComponent.get(error.component)!.push(error);
    }
    
    for (const [component, errors] of errorsByComponent.entries()) {
      console.error(`📦 Component: ${component}`);
      for (const error of errors) {
        console.error(`   - ${error.message}`);
      }
      console.error('');
    }
    
    console.error(`共 ${this.errors.length} 个错误\n`);
  }
}

/**
 * 主函数
 */
async function main() {
  // 解析命令行参数
  const args = process.argv.slice(2);
  let env = 'dev';
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--env' && i + 1 < args.length) {
      env = args[i + 1];
      break;
    }
  }
  
  console.log(`\n🔧 生成 ${env} 环境配置...\n`);
  
  const configDir = __dirname;
  const applicationConfigPath = path.join(configDir, 'application.json');
  const deploymentConfigPath = path.join(configDir, `deploy.${env}.json`);
  const outputPath = path.join(configDir, '..', 'app.config.json');
  
  // 检查文件是否存在
  if (!fs.existsSync(applicationConfigPath)) {
    console.error(`❌ 找不到应用配置文件: ${applicationConfigPath}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(deploymentConfigPath)) {
    console.error(`❌ 找不到部署配置文件: ${deploymentConfigPath}`);
    process.exit(1);
  }
  
  // 读取配置文件
  let applicationConfig: ApplicationConfig;
  let deploymentConfig: DeploymentConfig;
  
  try {
    applicationConfig = JSON.parse(fs.readFileSync(applicationConfigPath, 'utf-8'));
  } catch (error) {
    console.error(`❌ 读取或解析 application.json 失败: ${error}`);
    process.exit(1);
  }
  
  try {
    deploymentConfig = JSON.parse(fs.readFileSync(deploymentConfigPath, 'utf-8'));
  } catch (error) {
    console.error(`❌ 读取或解析 deploy.${env}.json 失败: ${error}`);
    process.exit(1);
  }
  
  // 读取现有的 app.config.json（如果存在），用于复用 endpoints 信息
  let existingConfig: FinalConfig | undefined;
  if (fs.existsSync(outputPath)) {
    try {
      existingConfig = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
      console.log(`📋 发现现有配置，将复用 endpoints 信息`);
    } catch (error) {
      console.warn(`⚠️ 读取现有配置失败，将生成全新配置: ${error}`);
    }
  }
  
  // 生成配置
  const generator = new ConfigGenerator(applicationConfig, deploymentConfig, env, existingConfig);
  const finalConfig = generator.generate();
  
  if (!finalConfig) {
    console.error('❌ 配置生成失败');
    process.exit(1);
  }
  
  // 写入配置文件
  try {
    fs.writeFileSync(outputPath, JSON.stringify(finalConfig, null, 2), 'utf-8');
    console.log(`✅ 配置生成成功: ${outputPath}\n`);
  } catch (error) {
    console.error(`❌ 写入配置文件失败: ${error}`);
    process.exit(1);
  }
}

// 运行主函数
main().catch(error => {
  console.error('❌ 发生错误:', error);
  process.exit(1);
});

