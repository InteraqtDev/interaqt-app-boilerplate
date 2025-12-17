import { Controller, MonoSystem, Property, USER_ENTITY } from 'interaqt';
import { serve } from '@hono/node-server';
import { entities, relations, interactions, activities, dicts } from '../backend/index.js';
import { setupHttpServer } from './app.js';
import { createDatabase } from './database.js';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { Hono } from 'hono';
import AggregatedIntegrationClass from '../integrations/entries/index.js';
import { config as appConfig } from '../config.js';

// Load configuration from app.config.json
const mainConfig = appConfig.components.main;



const system = new MonoSystem(await createDatabase());

const integration = new AggregatedIntegrationClass({
  entities: entities,
  relations: relations,
  activities: activities,
  interactions: interactions,
  dict: dicts,
});
await integration.configure?.();

// 初始化所有 RecordMutationSideEffects。
const controller = new Controller({
  system: system,
  entities: entities,
  relations: relations,
  activities: activities,
  interactions: interactions,
  dict: dicts,
  recordMutationSideEffects: integration.createSideEffects()
});

await controller.setup();
await integration.setup(controller);

const users = await controller.system.storage.find(USER_ENTITY, undefined, undefined, ['id', 'username', 'email'])
console.log('Users in system:', users)
try {
  const storageMapJson = JSON.stringify(controller.system.storage.map, null, 2);
  const outputPath = join(process.cwd(), 'storage.map.json');
  writeFileSync(outputPath, storageMapJson, 'utf8');
  console.log(`Storage map exported to: ${outputPath}`);
} catch (error) {
  console.error('Failed to export storage map:', error);
}

// Note: Root user creation is handled in setupMain.ts
// Run `npm run setup` to initialize the database with root user
const port = mainConfig.port || 3000;
// 前端开发端口范围：Vite 默认使用 5173，如果被占用会自动递增到 5174, 5175...
const frontendDevPorts = [5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180];
const app = new Hono();
const extensionAPIs = integration.createAPIs?.() || [];
const middlewares = integration.createMiddlewares?.();
setupHttpServer(app, controller, {
  middlewares: middlewares,
  cors: {
    origin: [
      ...frontendDevPorts.map(p => `http://localhost:${p}`),
      `http://localhost:${port}`
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
  }
}, extensionAPIs);

console.log(`Starting server on port ${port}`);
const server = serve({
  fetch: app.fetch,
  port: port
});
