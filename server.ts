import { IncomingHttpHeaders } from 'http';
import {MonoSystem,Controller, startServer, SQLiteDB} from "@interaqt/runtime";
import * as appData from './app/index.js'
import {apis, createInitialData} from "./data.js";
import {DATABASE_ADDR, PORT} from "./config.js";

const db = new SQLiteDB(DATABASE_ADDR)
const system = new MonoSystem(db)
const data = appData as any
const controller = new Controller(
    system, data.entities,
    data.relations|| [],
    data.activities||[],
    data.interactions||[],
    data.states||[]
)
await controller.setup()
await createInitialData(controller)

startServer(controller, {
    port: PORT,
    parseUserId: async (headers: IncomingHttpHeaders) => {
        return headers['x-user-id'] as string
    }
}, apis)
