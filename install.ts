import {Controller, MonoSystem, SQLiteDB} from "@interaqt/runtime";
import {entities, interactions, relations, states, activities} from './app/index.js'
import {DATABASE_ADDR} from "./config.js";
import { existsSync } from "fs";
import chalk from "chalk";

try {
    if (existsSync(DATABASE_ADDR)) {
        console.log(chalk.red(`${DATABASE_ADDR} already exist, remove it before install`))
    }
    const db = new SQLiteDB(DATABASE_ADDR)
    const system = new MonoSystem(db)
    const controller = new Controller(system, entities, relations, activities, interactions, states)
    await controller.setup(true)

    console.log("install successfully")
} catch (e) {
    console.error(e)
    process.exit(1)
}
