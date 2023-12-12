import {Controller, MonoSystem, SQLiteDB} from "@interaqt/runtime";
import {entities, interactions, relations, states, activities} from './app/index.js'
import {DATABASE_ADDR} from "./config.js";
import { unlinkSync } from "fs";


try {
    await unlinkSync(DATABASE_ADDR)
    const db = new SQLiteDB(DATABASE_ADDR)
    const system = new MonoSystem(db)
    const controller = new Controller(system, entities, relations, activities, interactions, states)
    await controller.setup(true)

    console.log("install successfully")
} catch (e) {
    console.error(e)
    process.exit(1)
}
