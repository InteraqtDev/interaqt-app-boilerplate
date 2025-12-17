import { Database } from 'interaqt';
import { config as appConfig } from '../config.js';

// Database configurations from app.config.json
const mainConfig = appConfig.components.main;
const dbParams = mainConfig?.middlewareDependencies.mainDb!;

if (!dbParams) {
  throw new Error('Database configuration (mainDb) not found in app.config.json');
}

const DB_TYPE = dbParams.config.type;

// 获取主数据库 endpoint
function getDbEndpoint(): string {
  const endpoint = dbParams.endpoints.main.value;
  if (!endpoint) {
    throw new Error('Database endpoint (endpoints.main.value) not found in configuration');
  }
  return endpoint;
}

// 创建数据库实例的工厂函数
export async function createDatabase(env?: any): Promise<Database> {
  // 使用 if-else 而不是 switch，并且使用常量比较
  // 这样 esbuild 可以在构建时完全移除未使用的分支

  if (DB_TYPE === 'sqlite') {
    const { SQLiteDB } = await import('./dbclients/SQLite.js');
    const sqliteFile = getDbEndpoint();
    return new SQLiteDB(sqliteFile);
  } else if (DB_TYPE === 'pglite') {
    const { PGLiteDB } = await import('./dbclients/PGLite.js');
    const pgliteDatabase = getDbEndpoint();
    return new PGLiteDB(pgliteDatabase);
  } else if (DB_TYPE === 'd1' || DB_TYPE === 'cloudflared1') {
    const { CloudflareD1DB } = await import('./dbclients/CloudflareD1.js');
    return new CloudflareD1DB((globalThis as any).env.DB);
  } else if (DB_TYPE === 'postgresql') {
    const { PostgreSQLDB } = await import('./dbclients/PostgreSQL.js');
    
    const endpoint = getDbEndpoint();
    
    // 从 endpoint 解析 host 和 port
    // endpoint 格式: postgresql://localhost:5432 或 postgresql://host:port
    const url = new URL(endpoint);
    
    return new PostgreSQLDB(dbParams.config.database, {
      host: url.hostname,  // 使用 hostname 而不是 host（不包含端口）
      port: parseInt(url.port || '5432'),
      user: dbParams.config.username,
      password: dbParams.config.password
    });
  } else {
    throw new Error(`Unknown database type: ${DB_TYPE}. Supported types: sqlite, pglite, d1, postgresql`);
  }
}
