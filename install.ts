import {Controller, MonoSystem, SQLiteDB} from "@interaqt/runtime";
import {entities, interactions, relations, states, activities} from './app/index.js'
import {DATABASE_ADDR} from "./config.js";
import { existsSync, unlinkSync } from "fs";
import chalk from "chalk";
import {program} from "commander";

program.option('-f, --force', 'force install')
    .action(async (options) => {
        console.log(options)
        try {
            if (existsSync(DATABASE_ADDR)) {
                if (!options.force) {
                    console.log(chalk.red(`${DATABASE_ADDR} already exist, remove it before install`))
                    return
                } else {
                    console.log(chalk.red(`force install, will delete ${DATABASE_ADDR}.`))
                    unlinkSync(DATABASE_ADDR)
                }
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
    })


program.parse(process.argv)