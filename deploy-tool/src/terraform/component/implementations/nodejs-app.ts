/**
 * Node.js 应用 Component 配置
 *
 * 适用于基于 Node.js 的应用，提供：
 * - 标准的镜像配置
 * - HTTP 健康检查
 * - init container 配置注入
 * - 根据环境优化资源配置
 */
import { BaseComponentConfig, ComponentContext, ImageConfig, ContainerSpec, ServiceSpec, ResourceRequirements, ProbeConfig, EnvVar } from "../base.js";

/**
 * Init Container 配置
 */
export interface InitContainer {
  name: string;
  image: string;
  command: string[];
  args: string[];
  env: EnvVar[];
  volume_mounts: VolumeMount[];
}

/**
 * Volume Mount 配置
 */
export interface VolumeMount {
  name: string;
  mount_path: string;
  sub_path?: string;
  read_only?: boolean;
}

/**
 * Volume 配置
 */
export interface Volume {
  name: string;
  config_map: { name: string } | null;
  secret: { secret_name: string } | null;
  persistent_volume_claim: { claim_name: string } | null;
  empty_dir: {} | null;
}

export class NodeJSAppConfig extends BaseComponentConfig {
  /**
   * 获取镜像配置
   */
  getImageConfig(ctx: ComponentContext): ImageConfig {
    if (ctx.config.image) {
      return this.parseImageAddress(ctx.config.image);
    }

    const repository = process.env.IMAGE_REPOSITORY || ctx.imageRepository || "lit";

    return {
      repository,
      name: ctx.componentName.toLowerCase(),
      tag: process.env.IMAGE_TAG || "latest",
      command: [],
      args: [],
    };
  }

  /**
   * 解析完整镜像地址为 ImageConfig
   */
  private parseImageAddress(image: string): ImageConfig {
    const tagSeparatorIndex = image.lastIndexOf(":");
    let imageWithoutTag = image;
    let tag = "latest";

    if (tagSeparatorIndex > 0) {
      const afterColon = image.substring(tagSeparatorIndex + 1);
      if (!afterColon.includes("/")) {
        imageWithoutTag = image.substring(0, tagSeparatorIndex);
        tag = afterColon;
      }
    }

    const lastSlashIndex = imageWithoutTag.lastIndexOf("/");
    let repository = "";
    let name = imageWithoutTag;

    if (lastSlashIndex > 0) {
      repository = imageWithoutTag.substring(0, lastSlashIndex);
      name = imageWithoutTag.substring(lastSlashIndex + 1);
    }

    return {
      repository,
      name,
      tag,
      command: [],
      args: [],
    };
  }

  /**
   * 根据组件名获取默认的 npm 启动脚本
   * 组件名到 npm script 的映射：
   * - main → start:main
   * - asyncTask → start:async-task
   * - 其他组件 → start:{componentName}（转为 kebab-case）
   */
  private getDefaultStartScript(componentName: string): string {
    // 将 camelCase 转换为 kebab-case
    const kebabName = componentName
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .toLowerCase();
    return `npm run start:${kebabName}`;
  }

  /**
   * 获取容器规格配置
   * 注意：主容器不再注入 middleware 环境变量，配置由 init container 生成
   */
  getContainerSpec(ctx: ComponentContext): ContainerSpec {
    const imageConfig = this.getImageConfig(ctx);
    const image = this.buildImageAddress(imageConfig);

    // 支持自定义启动命令，如果没有配置则根据组件名自动选择
    let command: string[] = imageConfig.command || [];
    let args: string[] = imageConfig.args || [];

    // 优先使用显式配置的 startCommand，否则根据组件名自动选择
    const startCommand = ctx.config.startCommand || this.getDefaultStartScript(ctx.componentName);
    command = ["sh", "-c"];
    args = [startCommand];

    // 如果没有 port 配置，使用空 ports（适用于 worker 类型组件）
    const ports: { container_port: number; name: string; protocol: "TCP" | "UDP" }[] = ctx.config.port
      ? [
          {
            container_port: ctx.config.port,
            name: "http",
            protocol: "TCP" as const,
          },
        ]
      : [];

    return {
      image,
      command,
      args,
      ports,
      env: this.getEnvironmentVariables(ctx),
    };
  }

  /**
   * 获取 Service 规格配置
   */
  getServiceSpec(ctx: ComponentContext): ServiceSpec {
    // 如果没有 port 配置，返回空 ports（适用于 worker 类型组件）
    const ports: ServiceSpec["ports"] = ctx.config.port
      ? [
          {
            name: "http",
            port: ctx.config.port,
            target_port: ctx.config.port,
            protocol: "TCP" as const,
          },
        ]
      : [];

    return {
      ports,
      type: this.getServiceType(ctx),
    };
  }

  /**
   * 获取资源需求配置
   */
  getResources(ctx: ComponentContext): ResourceRequirements {
    if (this.isLocalEnvironment(ctx)) {
      return {
        limits: { cpu: "500m", memory: "512Mi" },
        requests: { cpu: "100m", memory: "128Mi" },
      };
    } else {
      return {
        limits: { cpu: "1000m", memory: "1Gi" },
        requests: { cpu: "200m", memory: "256Mi" },
      };
    }
  }

  /**
   * 获取健康检查配置
   * 支持通过 skipHealthCheck: true 禁用健康检查（适用于 worker 类型组件）
   */
  getProbes(ctx: ComponentContext): ProbeConfig | null {
    // 如果显式跳过健康检查，返回 null
    if (ctx.config.skipHealthCheck === true) {
      return null;
    }

    // 如果没有配置端口，无法进行 HTTP 健康检查
    if (!ctx.config.port) {
      return null;
    }

    return {
      liveness: {
        type: "http",
        config: {
          path: "/health",
          port: ctx.config.port,
          scheme: "HTTP",
        },
        initial_delay_seconds: 30,
        period_seconds: 10,
        timeout_seconds: 5,
        success_threshold: 1,
        failure_threshold: 3,
      },
      readiness: {
        type: "http",
        config: {
          path: "/health",
          port: ctx.config.port,
          scheme: "HTTP",
        },
        initial_delay_seconds: 10,
        period_seconds: 5,
        timeout_seconds: 3,
        success_threshold: 1,
        failure_threshold: 3,
      },
    };
  }

  /**
   * 获取环境变量
   * 只包含基础环境变量，不再包含 middleware 连接信息
   */
  private getEnvironmentVariables(ctx: ComponentContext): EnvVar[] {
    return [{ name: "NODE_ENV", value: ctx.environment }];
  }

  /**
   * 获取 Init Containers 配置
   *
   * init container 负责：
   * 1. 生成 app.config.json 配置文件（包含完整的 endpoints 和 publicUrl）
   * 2. 构建前端（仅 main 组件，此时 config 已包含 publicUrl）
   * 3. 执行 npm run setup 初始化数据库（仅 main 组件）
   *
   * 注意：
   * - 只有 main 组件运行 setup:main
   * - 前端在 init container 中构建，确保能获取到完整的 publicUrl 配置
   */
  getInitContainers(ctx: ComponentContext): InitContainer[] {
    // 本地环境不需要 init container，直接使用本地配置文件
    if (this.isLocalEnvironment(ctx)) {
      return [];
    }

    const imageConfig = this.getImageConfig(ctx);
    const image = this.buildImageAddress(imageConfig);

    // 只有 main 组件运行 setup:main 和构建前端
    // communication 和 asynctask 组件只需要配置文件，不需要初始化数据库和前端
    const isMainComponent = ctx.componentName.toLowerCase() === "main";

    // 生成配置文件的 shell 脚本
    const configJson = this.generateAppConfigJson(ctx);
    const setupScript = this.generateSetupScript(configJson, isMainComponent);

    const volumeMounts: VolumeMount[] = [
      {
        // 挂载 emptyDir 到 /config，用于备份配置文件（供主容器使用）
        name: "app-config",
        mount_path: "/config",
      },
    ];

    // main 组件需要挂载 frontend-dist 用于存放前端构建产物
    if (isMainComponent) {
      volumeMounts.push({
        name: "frontend-dist",
        mount_path: "/app/frontend/dist",
      });
    }

    return [
      {
        name: "setup",
        image: image,
        command: ["sh", "-c", setupScript],
        args: [],
        env: [],
        volume_mounts: volumeMounts,
      },
    ];
  }

  /**
   * 获取 Volume Mounts 配置（主容器使用）
   * - app.config.json：从 emptyDir 挂载到 /app/app.config.json
   * - frontend/dist：从 emptyDir 挂载到 /app/frontend/dist（前端构建产物）
   */
  getVolumeMounts(ctx: ComponentContext): VolumeMount[] {
    if (this.isLocalEnvironment(ctx)) {
      return [];
    }

    const mounts: VolumeMount[] = [
      {
        name: "app-config",
        mount_path: "/app/app.config.json",
        sub_path: "app.config.json",
        read_only: true,
      },
    ];

    // main 组件需要挂载前端构建产物目录
    const isMainComponent = ctx.componentName.toLowerCase() === "main";
    if (isMainComponent) {
      mounts.push({
        name: "frontend-dist",
        mount_path: "/app/frontend/dist",
        read_only: true,
      });
    }

    return mounts;
  }

  /**
   * 获取 Volumes 配置
   * - app-config: 用于存放 app.config.json
   * - frontend-dist: 用于存放前端构建产物（仅 main 组件）
   */
  getVolumes(ctx: ComponentContext): Volume[] {
    if (this.isLocalEnvironment(ctx)) {
      return [];
    }

    const volumes: Volume[] = [
      {
        name: "app-config",
        config_map: null,
        secret: null,
        persistent_volume_claim: null,
        empty_dir: { medium: "" },
      },
    ];

    // main 组件需要 frontend-dist volume
    const isMainComponent = ctx.componentName.toLowerCase() === "main";
    if (isMainComponent) {
      volumes.push({
        name: "frontend-dist",
        config_map: null,
        secret: null,
        persistent_volume_claim: null,
        empty_dir: { medium: "" },
      });
    }

    return volumes;
  }

  /**
   * 生成 app.config.json 的完整内容
   * 注意：需要转义 ${...} 为 $${...}，避免 Terraform 将其解析为插值表达式
   */
  private generateAppConfigJson(ctx: ComponentContext): string {
    const config: any = {
      components: {},
    };

    // 获取所有组件配置
    const allComponents = ctx.fullConfig?.components || { [ctx.componentName]: ctx.config };

    for (const [compName, compConfig] of Object.entries(allComponents)) {
      config.components[compName] = this.buildComponentConfig(compName, compConfig as any, ctx);
    }

    const jsonStr = JSON.stringify(config, null, 2);
    // 转义 ${...} 为 $${...}，避免 Terraform 将其解析为插值表达式
    // 注意：在 JS replace 中，$$ 表示一个 $，所以需要 $$$ 来产生 $$
    return jsonStr.replace(/\$\{/g, "$$${");
  }

  /**
   * 构建单个组件的配置
   */
  private buildComponentConfig(componentName: string, compConfig: any, ctx: ComponentContext): any {
    const result: any = {
      port: compConfig.port,
    };

    // 处理 middlewareDependencies
    if (compConfig.middlewareDependencies) {
      result.middlewareDependencies = {};
      for (const [name, middleware] of Object.entries(compConfig.middlewareDependencies as Record<string, any>)) {
        result.middlewareDependencies[name] = this.buildMiddlewareConfig(name, middleware, ctx);
      }
    }

    // 处理 externalServices
    if (compConfig.externalServices) {
      result.externalServices = compConfig.externalServices;
    }

    // 处理 applicationConfig
    if (compConfig.applicationConfig) {
      result.applicationConfig = compConfig.applicationConfig;
    }

    return result;
  }

  /**
   * 构建中间件配置
   * 保持与 app.config.json 相同的完整结构，便于应用代码统一读取
   * 同时保留 endpoint 字段（从 endpoints.main.value 提取）用于向后兼容
   */
  private buildMiddlewareConfig(name: string, middleware: any, ctx: ComponentContext): any {
    // 复制完整的 middleware 配置，保持结构一致
    const result: any = { ...middleware };

    // 向后兼容：如果有 endpoints.main.value，也提取为顶层 endpoint 字段
    const resolvedEndpoint = middleware.endpoints?.main?.value || middleware.endpoint;
    if (resolvedEndpoint) {
      result.endpoint = resolvedEndpoint;
    }

    return result;
  }

  /**
   * 从 endpoint 获取协议
   */
  private getProtocolFromEndpoint(endpoint: string): string {
    const match = endpoint.match(/^([a-z]+):\/\//);
    return match ? match[1] : "";
  }

  /**
   * 生成 setup 脚本
   * @param configJson - 配置文件 JSON 内容
   * @param isMainComponent - 是否是 main 组件（只有 main 组件需要运行 setup 和构建前端）
   *
   * 执行流程：
   * 1. 写入 app.config.json（包含完整的 endpoints 和 publicUrl）
   * 2. 构建前端（仅 main 组件，此时可以读取正确的 publicUrl）
   * 3. 运行 npm run setup:main 初始化数据库（仅 main 组件）
   */
  private generateSetupScript(configJson: string, isMainComponent: boolean): string {
    // 前端构建命令（仅 main 组件）
    const frontendBuildCommand = isMainComponent
      ? `
echo ""
echo "=== Building frontend with current config ==="
echo "Frontend will read publicUrl from app.config.json"

cd /app/frontend

# 显示关键配置（用于调试）
echo "Centrifugo publicUrl from config:"
node -e "const c = require('../app.config.json'); console.log(c.components?.communication?.middlewareDependencies?.centrifugo?.endpoints?.main?.publicUrl || 'not set')"

echo "ObjectStorage publicUrl from config:"
node -e "const c = require('../app.config.json'); console.log(c.components?.main?.middlewareDependencies?.objectStorage?.endpoints?.main?.publicUrl || 'not set')"

# 完全重新安装依赖以确保原生模块为当前平台编译（解决跨平台问题）
# tailwindcss v4 使用多个原生模块（lightningcss, oxide 等）需要在 Linux 容器中重新安装
echo ""
echo "Reinstalling all frontend dependencies for current platform..."

# 创建临时目录并复制 package.json 进行独立安装（避免 workspaces 干扰）
TEMP_DIR=$(mktemp -d)
cp package.json package-lock.json "$TEMP_DIR/" 2>/dev/null || cp package.json "$TEMP_DIR/"
cd "$TEMP_DIR"

# 在临时目录独立安装，不受 workspaces 影响
echo "Installing in isolated environment..."
npm install --include=dev

# 复制安装好的 node_modules 回 frontend 目录
echo "Copying installed modules back..."
rm -rf /app/frontend/node_modules 2>/dev/null || true
cp -r node_modules /app/frontend/
cd /app/frontend
rm -rf "$TEMP_DIR"

# 验证关键原生模块是否正确安装
echo "Checking native modules..."
ls -la node_modules/lightningcss/*.node 2>/dev/null || echo "lightningcss native module not found"
ls -la node_modules/@tailwindcss/oxide/*.node 2>/dev/null || echo "@tailwindcss/oxide native module not found"

# 执行前端构建
echo ""
echo "Running: npm run build"
npm run build

# 验证构建产物
echo ""
echo "Frontend build completed. Checking output:"
ls -la /app/frontend/dist/
du -sh /app/frontend/dist/

cd /app
`
      : `
echo ""
echo "=== Skipping frontend build (not main component) ==="
`;

    // 数据库 setup 或等待命令
    const setupCommand = isMainComponent
      ? `
echo ""
echo "=== Running database setup ==="
# 使用 npm run setup:main 读取 app.config.json
npm run setup:main
`
      : `
echo ""
echo "=== Waiting for database setup to complete ==="
echo "Non-main component: waiting for main to finish database setup..."

# 等待数据库表创建完成（最多等待 180 秒）
# 使用 Node.js 检查数据库，因为容器中没有 psql
node -e '
const { Client } = require("pg");

async function checkDatabase() {
  const maxRetries = 36;
  const retryInterval = 5000;

  for (let i = 0; i < maxRetries; i++) {
    const client = new Client({
      host: "maindb-svc",
      port: 5432,
      user: "pgadmin",
      password: "pgadmin",
      database: "litdb"
    });

    try {
      await client.connect();
      await client.query("SELECT 1 FROM \\"User\\" LIMIT 1");
      console.log("Database setup complete! User table exists.");
      await client.end();
      process.exit(0);
    } catch (err) {
      try { await client.end(); } catch (e) {}
      console.log("Waiting for database setup... (" + (i + 1) + "/" + maxRetries + ")");
      await new Promise(r => setTimeout(r, retryInterval));
    }
  }
  console.log("Warning: Timeout waiting for database setup. Proceeding anyway...");
  process.exit(0);
}
checkDatabase();
'

echo "=== Done waiting ==="
`;

    return `
echo "========================================"
echo "  Init Container - Setup Script"
echo "========================================"

echo ""
echo "=== Step 1: Writing app.config.json ==="
ls -la /app/app.config.json 2>/dev/null || echo "File does not exist yet"

cat > /app/app.config.json << 'CONFIGEOF'
${configJson}
CONFIGEOF
echo "Write exit code: $?"

echo ""
echo "Config written. Verifying endpoints:"
cat /app/app.config.json | grep -o '"endpoint": "[^"]*"' | head -5
cat /app/app.config.json | grep -o '"publicUrl": "[^"]*"' | head -5

echo ""
echo "Backing up config to /config/app.config.json..."
cp /app/app.config.json /config/app.config.json
sync
${frontendBuildCommand}${setupCommand}
echo ""
echo "========================================"
echo "  Init Container - Complete"
echo "========================================"
`.trim();
  }

  /**
   * 解析 endpoint URL，提取 host 和 port
   */
  private parseEndpoint(endpoint: string): { host?: string; port?: string } {
    try {
      const normalized = endpoint.replace(/^(postgresql|redis|kafka|amqp):\/\//, "http://");
      const url = new URL(normalized);
      return {
        host: url.hostname,
        port: url.port || this.getDefaultPort(endpoint),
      };
    } catch {
      const match = endpoint.match(/:\/\/([^:/]+)(?::(\d+))?/);
      if (match) {
        return { host: match[1], port: match[2] };
      }
      return {};
    }
  }

  /**
   * 根据协议获取默认端口
   */
  private getDefaultPort(endpoint: string): string | undefined {
    if (endpoint.startsWith("postgresql://")) return "5432";
    if (endpoint.startsWith("redis://")) return "6379";
    if (endpoint.startsWith("kafka://")) return "9092";
    if (endpoint.startsWith("http://")) return "80";
    if (endpoint.startsWith("https://")) return "443";
    return undefined;
  }
}
