import appConfig from './app.config.json';
import appHostConfig from './app.config.host.json';
import type { FinalConfig } from './config/types.js';

console.log(`[Config] Using configuration mode: ${process.env.CONFIG_MODE || 'normal'}`);

// 使用 unknown 中转类型断言，因为 JSON 文件中 endpoints.value 在 deploy tool 运行后才被填充
export const config = (process.env.CONFIG_MODE === 'local' ? appHostConfig : appConfig) as unknown as FinalConfig;
