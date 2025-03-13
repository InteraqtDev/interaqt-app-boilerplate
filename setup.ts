import {Controller, MonoSystem, SQLiteDB} from "@interaqt/runtime";
import {entities, interactions, relations, states, activities} from './app/index.js'
import {DATABASE_ADDR} from "./config.js";
import { existsSync, unlinkSync } from "fs";
import chalk from "chalk";
import {program} from "commander";

async function createInitialData(controller: Controller) {
    // const system = controller.system
    // const userARef = await system.storage.create('User', {name: 'A'})
    // const userBRef = await system.storage.create('User', {name: 'B', supervisor: userARef})
    // const userCRef = await system.storage.create('User', {name: 'C', supervisor: userBRef})
}

program.option('-f, --force', 'force setup')
    .action(async (options) => {
        console.log(options)
        try {
            if (existsSync(DATABASE_ADDR)) {
                if (!options.force) {
                    console.log(chalk.red(`${DATABASE_ADDR} already exist, remove it before setup`))
                    return
                } else {
                    console.log(chalk.red(`force setup, will delete ${DATABASE_ADDR}.`))
                    unlinkSync(DATABASE_ADDR)
                }
            }
            const db = new SQLiteDB(DATABASE_ADDR)
            const system = new MonoSystem(db)
            const controller = new Controller(system, entities, relations, activities, interactions, states)
            await controller.setup(true)
            await createInitialData(controller)

            console.log("setup successfully")
        } catch (e) {
            console.error(e)
            process.exit(1)
        }
    })


program.parse(process.argv)