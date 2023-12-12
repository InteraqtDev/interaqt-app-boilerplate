import { IncomingHttpHeaders } from 'http';
import {MonoSystem,Controller, startServer, SQLiteDB} from "@interaqt/runtime";
import { entities, relations, interactions, states, activities } from './app/index.js'
import {apis, createInitialData} from "./data.js";
import {DATABASE_ADDR, PORT} from "./config.js";

const db = new SQLiteDB(DATABASE_ADDR)
const system = new MonoSystem(db)
const controller = new Controller(system, entities, relations, activities, interactions, states)
await controller.setup()
await createInitialData(controller)

startServer(controller, {
    port: PORT,
    parseUserId: async (headers: IncomingHttpHeaders) => {
        return headers['x-user-id'] as string
    }
}, apis)
