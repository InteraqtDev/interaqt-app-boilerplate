import { Controller, MonoSystem, Property } from 'interaqt';
import { entities, relations, interactions, activities, dicts } from '../backend/basic.js';
import { setupHttpServer } from './app.js';
import type { API } from '../integrations/index.js';
import { createDatabase } from './database.js';
import { Hono } from 'hono';
import AggregatedIntegrationClass from '../integrations/entries/index.js';

export default {
  fetch: async function(request: Request, env: any, ctx: any) {
    (globalThis as any).env = env;

    // Add password property to User entity
    const User = entities.find(e => e.name === 'User');
    if (User) {
      User.properties.push(Property.create({ name: 'password', type: 'string' }));
    }

    const system = new MonoSystem(await createDatabase());
    
    const integration = new AggregatedIntegrationClass({
      entities: entities,
      relations: relations,
      activities: activities,
      interactions: interactions,
      dict: dicts,
    });
    await integration.configure?.();

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

    // Note: Root user creation is handled in setupMain.ts
    // Run `npm run setup` to initialize the database with root user
    const app = new Hono();
    const extensionAPIs = integration.createAPIs?.() || [];
    const middlewares = integration.createMiddlewares?.();
    setupHttpServer(app, controller, {
      middlewares: middlewares,
      cors: {
        origin: [`*`],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
      }
    }, extensionAPIs);

    return app.fetch(request, env, ctx);
  },
  hostname: 'localhost'
}
